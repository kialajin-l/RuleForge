/**
 * S3-5: RuleEngine 集成测试
 *
 * 测试覆盖：
 * 1. 引擎初始化
 * 2. 文件变更 → 规则匹配 → Diagnostic 生成
 * 3. 依赖链解析
 * 4. 优先级排序
 * 5. 统计数据记录
 * 6. 事件系统
 * 7. 文件过滤
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RuleEngine } from '../packages/core/src/engine/rule-engine';
import { RuleStats } from '../packages/core/src/engine/rule-stats';
import {
  FileChangeEvent,
  DiagnosticSeverity,
  DiagnosticTag,
} from '../packages/core/src/engine/types';
import { RuleYAML } from '../packages/core/src/types/rule-schema';

// ─── 测试用规则 ───

const TS_NO_ANY_RULE: RuleYAML = {
  schemaVersion: '0.2',
  meta: {
    id: 'typescript-no-any',
    name: '禁止使用 any 类型',
    version: '1.0.0',
    description: 'TypeScript 代码中不应使用 any 类型，应使用具体类型或 unknown',
    authors: ['test'],
    license: 'MIT',
    created: '2026-04-29T00:00:00Z',
    updated: '2026-04-29T00:00:00Z',
    tags: ['typescript', 'type-safety'],
  },
  rule: {
    trigger: {
      type: 'code_pattern',
      pattern: ':\\s*any\\b',
    },
    conditions: [
      {
        type: 'code_contains',
        condition: ':\\s*any\\b',
      },
    ],
    suggestions: [
      {
        type: 'code_fix',
        description: '避免使用 any 类型，建议使用 unknown 或具体类型替代',
        code: ': unknown',
      },
    ],
  },
  compatibility: {
    languages: ['typescript'],
  },
  confidence: 0.9,
  priority: 'project',
};

const CONSOLE_LOG_RULE: RuleYAML = {
  schemaVersion: '0.2',
  meta: {
    id: 'general-console-log-cleanup',
    name: '清理 console.log',
    version: '1.0.0',
    description: '生产代码中不应保留 console.log 调试语句',
    authors: ['test'],
    license: 'MIT',
    created: '2026-04-29T00:00:00Z',
    updated: '2026-04-29T00:00:00Z',
    tags: ['javascript', 'cleanup'],
  },
  rule: {
    trigger: {
      type: 'code_pattern',
      pattern: 'console\\.log\\(',
    },
    conditions: [
      {
        type: 'code_contains',
        condition: 'console\\.log\\(',
      },
    ],
    suggestions: [
      {
        type: 'code_fix',
        description: '移除 console.log 调试语句或使用日志框架替代',
      },
    ],
  },
  compatibility: {
    languages: ['typescript', 'javascript'],
  },
  confidence: 0.85,
  priority: 'global',
};

const DEP_RULE: RuleYAML = {
  schemaVersion: '0.2',
  meta: {
    id: 'ts-strict-mode',
    name: '启用严格模式',
    version: '1.0.0',
    description: 'TypeScript 项目应启用 strict 模式以获得更好的类型安全',
    authors: ['test'],
    license: 'MIT',
    created: '2026-04-29T00:00:00Z',
    updated: '2026-04-29T00:00:00Z',
  },
  rule: {
    trigger: {
      type: 'file_pattern',
      pattern: 'tsconfig.json',
    },
    conditions: [
      {
        type: 'config_check',
        condition: 'strict',
      },
    ],
    suggestions: [
      {
        type: 'config_change',
        description: '在 tsconfig.json 中启用 strict: true',
      },
    ],
  },
  compatibility: {
    languages: ['json', 'typescript'],
  },
  confidence: 0.95,
  priority: 'project',
  depends_on: ['typescript-no-any'],
};

// ─── 辅助函数 ───

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ruleforge-engine-test-'));
}

function createChangeEvent(
  filePath: string,
  content: string,
  language: string = 'typescript'
): FileChangeEvent {
  return {
    path: filePath,
    content,
    language,
    timestamp: new Date().toISOString(),
    changeType: 'modify',
  };
}

async function writeRuleToFile(rulesDir: string, rule: RuleYAML): Promise<void> {
  const yaml = await import('js-yaml');
  const content = yaml.default.dump(rule);
  fs.writeFileSync(path.join(rulesDir, `${rule.meta.id}.yaml`), content, 'utf-8');
}

// ─── 测试 ───

describe('RuleEngine', () => {
  let tmpDir: string;
  let rulesDir: string;
  let statsPath: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    rulesDir = path.join(tmpDir, '.ruleforge', 'rules');
    statsPath = path.join(tmpDir, '.ruleforge', 'stats.json');
    fs.mkdirSync(rulesDir, { recursive: true });
  });

  describe('初始化', () => {
    it('应该成功初始化并加载规则', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);
      await writeRuleToFile(rulesDir, CONSOLE_LOG_RULE);

      const engine = new RuleEngine({ rulesDir, statsPath, enableStats: false, createIndex: false });
      await engine.initialize();

      const rules = engine.getRules();
      expect(rules.length).toBe(2);
    });

    it('空规则库也应该正常初始化', async () => {
      const engine = new RuleEngine({ rulesDir, statsPath, enableStats: false, createIndex: false });
      await engine.initialize();

      const rules = engine.getRules();
      expect(rules.length).toBe(0);
    });
  });

  describe('文件变更匹配', () => {
    it('应该匹配包含 any 类型的 TypeScript 文件', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'src/utils.ts',
        'const data: any = getData();'
      );

      const diagnostics = await engine.onFileChange(event);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].source).toBe('typescript-no-any');
      expect(diagnostics[0].message).toContain('any');
    });

    it('应该匹配 console.log', async () => {
      await writeRuleToFile(rulesDir, CONSOLE_LOG_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'src/app.ts',
        'console.log("debug:", value);'
      );

      const diagnostics = await engine.onFileChange(event);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].source).toBe('general-console-log-cleanup');
    });

    it('不匹配的文件应该返回空诊断', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'src/utils.ts',
        'const data: string = "hello";'
      );

      const diagnostics = await engine.onFileChange(event);
      // 没有 any 类型，不匹配
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('依赖链解析', () => {
    it('应该自动解析 depends_on 依赖', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);
      await writeRuleToFile(rulesDir, DEP_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        resolveDependencies: true,
        minConfidence: 0.3,
      });

      // tsconfig.json 匹配 DEP_RULE，DEP_RULE depends_on typescript-no-any
      const event = createChangeEvent(
        'tsconfig.json',
        '{ "compilerOptions": { "strict": false } }',
        'json'
      );

      const diagnostics = await engine.onFileChange(event);
      // 应该包含 DEP_RULE 的诊断
      const sources = diagnostics.map(d => d.source);
      expect(sources).toContain('ts-strict-mode');
    });

    it('禁用依赖解析时不应自动添加依赖规则', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);
      await writeRuleToFile(rulesDir, DEP_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        resolveDependencies: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'tsconfig.json',
        '{ "compilerOptions": { "strict": false } }',
        'json'
      );

      const diagnostics = await engine.onFileChange(event);
      const sources = diagnostics.map(d => d.source);
      expect(sources).toContain('ts-strict-mode');
      // typescript-no-any 不应该被自动添加（因为文件内容不匹配）
      expect(sources).not.toContain('typescript-no-any');
    });
  });

  describe('优先级排序', () => {
    it('global 优先级应该排在 project 前面', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE); // project
      await writeRuleToFile(rulesDir, CONSOLE_LOG_RULE); // global

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        minConfidence: 0.3,
      });

      // 同时匹配两条规则的文件
      const event = createChangeEvent(
        'src/app.ts',
        'const x: any = 1;\nconsole.log(x);'
      );

      const diagnostics = await engine.onFileChange(event);
      expect(diagnostics.length).toBeGreaterThanOrEqual(2);

      // global 规则应该排在前面
      const globalIndex = diagnostics.findIndex(d => d.source === 'general-console-log-cleanup');
      const projectIndex = diagnostics.findIndex(d => d.source === 'typescript-no-any');
      expect(globalIndex).toBeLessThan(projectIndex);
    });
  });

  describe('统计数据', () => {
    it('应该记录匹配次数', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: true, createIndex: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'src/utils.ts',
        'const data: any = getData();'
      );

      await engine.onFileChange(event);
      await engine.onFileChange(event);

      const stats = engine.getStats();
      expect(stats.totalMatches).toBeGreaterThan(0);
    });

    it('应该记录采纳次数', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: true, createIndex: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'src/utils.ts',
        'const data: any = getData();'
      );

      await engine.onFileChange(event);
      await engine.recordAdoption('typescript-no-any');

      const stats = engine.getStats();
      expect(stats.totalAdopts).toBe(1);
    });
  });

  describe('事件系统', () => {
    it('应该触发 initialized 事件', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({ rulesDir, statsPath, enableStats: false, createIndex: false });
      const events: any[] = [];
      engine.on(e => events.push(e));

      await engine.initialize();

      expect(events.some(e => e.type === 'engine:initialized')).toBe(true);
      expect(events.find(e => e.type === 'engine:initialized').ruleCount).toBe(1);
    });

    it('应该触发 matched 事件', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        minConfidence: 0.3,
      });
      const events: any[] = [];
      engine.on(e => events.push(e));

      const event = createChangeEvent(
        'src/utils.ts',
        'const data: any = getData();'
      );

      await engine.onFileChange(event);

      expect(events.some(e => e.type === 'engine:matched')).toBe(true);
    });
  });

  describe('文件过滤', () => {
    it('filePatterns 应该过滤不匹配的文件', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        filePatterns: ['**/*.ts'],
        minConfidence: 0.3,
      });

      // .py 文件应该被过滤
      const pyEvent = createChangeEvent(
        'src/utils.py',
        'x: any = 1',
        'python'
      );

      const pyDiag = await engine.onFileChange(pyEvent);
      expect(pyDiag.length).toBe(0);

      // .ts 文件应该被处理
      const tsEvent = createChangeEvent(
        'src/utils.ts',
        'const x: any = 1;'
      );

      const tsDiag = await engine.onFileChange(tsEvent);
      expect(tsDiag.length).toBeGreaterThan(0);
    });
  });

  describe('Diagnostic 格式', () => {
    it('应该生成 LSP 兼容的 Diagnostic', async () => {
      await writeRuleToFile(rulesDir, TS_NO_ANY_RULE);

      const engine = new RuleEngine({
        rulesDir,
        statsPath,
        enableStats: false, createIndex: false,
        minConfidence: 0.3,
      });

      const event = createChangeEvent(
        'src/utils.ts',
        'const data: any = getData();'
      );

      const diagnostics = await engine.onFileChange(event);
      expect(diagnostics.length).toBeGreaterThan(0);

      const diag = diagnostics[0];
      expect(diag).toHaveProperty('filePath');
      expect(diag).toHaveProperty('line');
      expect(diag).toHaveProperty('column');
      expect(diag).toHaveProperty('severity');
      expect(diag).toHaveProperty('message');
      expect(diag).toHaveProperty('source');
      expect(diag).toHaveProperty('confidence');
      expect(diag).toHaveProperty('priority');

      expect(typeof diag.line).toBe('number');
      expect(typeof diag.column).toBe('number');
      expect(Object.values(DiagnosticSeverity)).toContain(diag.severity);
    });
  });
});

describe('RuleStats', () => {
  let tmpDir: string;
  let statsPath: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    statsPath = path.join(tmpDir, 'stats.json');
  });

  it('应该正确记录和查询统计', async () => {
    const stats = new RuleStats(statsPath);
    await stats.load();

    stats.recordMatch('rule-a');
    stats.recordMatch('rule-a');
    stats.recordAdoption('rule-a');

    const entry = stats.getEntry('rule-a');
    expect(entry).toBeDefined();
    expect(entry!.matchCount).toBe(2);
    expect(entry!.adoptCount).toBe(1);
    expect(entry!.adoptionRate).toBe(0.5);
  });

  it('应该生成正确的摘要', async () => {
    const stats = new RuleStats(statsPath);
    await stats.load();

    stats.recordMatch('rule-a');
    stats.recordMatch('rule-b');
    stats.recordAdoption('rule-a');

    const summary = stats.getSummary();
    expect(summary.totalMatches).toBe(2);
    expect(summary.totalAdopts).toBe(1);
    expect(summary.activeRuleCount).toBe(2);
  });

  it('应该持久化到文件', async () => {
    const stats = new RuleStats(statsPath);
    await stats.load();

    stats.recordMatch('rule-a');
    await stats.save();

    // 重新加载
    const stats2 = new RuleStats(statsPath);
    await stats2.load();

    const entry = stats2.getEntry('rule-a');
    expect(entry).toBeDefined();
    expect(entry!.matchCount).toBe(1);
  });

  it('应该基于采纳率调整 confidence', async () => {
    const stats = new RuleStats(statsPath);
    await stats.load();

    // 模拟高采纳率：10次匹配，9次采纳
    for (let i = 0; i < 10; i++) {
      stats.recordMatch('rule-a');
    }
    for (let i = 0; i < 9; i++) {
      stats.recordAdoption('rule-a');
    }

    const adjusted = stats.adjustConfidence('rule-a', 0.8);
    expect(adjusted).toBeGreaterThan(0.8);

    // 模拟低采纳率：10次匹配，1次采纳
    for (let i = 0; i < 10; i++) {
      stats.recordMatch('rule-b');
    }
    stats.recordAdoption('rule-b');

    const adjusted2 = stats.adjustConfidence('rule-b', 0.8);
    expect(adjusted2).toBeLessThan(0.8);
  });
});
