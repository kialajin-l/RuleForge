import { describe, it, expect } from 'vitest';
import { YamlFormatter } from '../packages/core/src/formatter/yaml-formatter';
import { RuleYAML } from '../packages/core/src/types/rule-schema';

describe('YamlFormatter - Markdown Report & Group Export', () => {
  const rules: RuleYAML[] = [
    {
      meta: {
        id: 'rule-a',
        name: '日志规范',
        version: '1.0.0',
        description: '日志输出规范，确保所有模块统一日志格式',
        tags: ['logging'],
        authors: ['test'],
        license: 'MIT',
        created: '2026-04-29T00:00:00Z',
        updated: '2026-04-29T00:00:00Z',
      },
      rule: {
        trigger: { type: 'file_pattern', pattern: 'src/**/*.ts' },
        conditions: [{ type: 'file_exists', condition: 'tsconfig.json' }],
        suggestions: [{ type: 'code_fix', description: '统一日志输出格式' }],
      },
      confidence: 0.9,
      compatibility: { languages: ['typescript'], frameworks: ['express'] },
    },
    {
      meta: {
        id: 'rule-b',
        name: '错误处理',
        version: '1.0.0',
        description: '异常捕获规范，统一错误处理流程',
        tags: ['error-handling'],
        authors: ['test'],
        license: 'MIT',
        created: '2026-04-29T00:00:00Z',
        updated: '2026-04-29T00:00:00Z',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'try {' },
        conditions: [{ type: 'code_contains', condition: 'catch' }],
        suggestions: [{ type: 'code_fix', description: '添加统一错误处理' }],
      },
      confidence: 0.7,
      compatibility: { languages: ['python'], frameworks: ['django'] },
    },
    {
      meta: {
        id: 'rule-c',
        name: '日志级别',
        version: '1.0.0',
        description: '日志级别定义，区分 debug/info/warn/error',
        tags: ['logging'],
        authors: ['test'],
        license: 'MIT',
        created: '2026-04-29T00:00:00Z',
        updated: '2026-04-29T00:00:00Z',
      },
      rule: {
        trigger: { type: 'file_pattern', pattern: 'src/**/*.ts' },
        conditions: [{ type: 'code_contains', condition: 'console.log' }],
        suggestions: [{ type: 'code_fix', description: '替换 console.log 为分级日志' }],
      },
      confidence: 0.85,
      compatibility: { languages: ['typescript'], frameworks: ['koa'] },
    },
  ];

  const formatter = new YamlFormatter();

  describe('generateMarkdownReport', () => {
    it('should generate report with overview stats', () => {
      const report = formatter.generateMarkdownReport(rules);
      expect(report).toContain('总规则数: 3');
      expect(report).toContain('Domain 数: 2');
    });

    it('should sort rules by confidence descending', () => {
      const report = formatter.generateMarkdownReport(rules);
      // rule-a (90%) should appear before rule-c (85%) which is before rule-b (70%)
      const posA = report.indexOf('rule-a');
      const posC = report.indexOf('rule-c');
      const posB = report.indexOf('rule-b');
      expect(posA).toBeLessThan(posC);
      expect(posC).toBeLessThan(posB);
    });

    it('should group rules by domain', () => {
      const report = formatter.generateMarkdownReport(rules);
      expect(report).toContain('### logging (2 条)');
      expect(report).toContain('### error-handling (1 条)');
    });
  });

  describe('exportByGroup', () => {
    it('should group by domain (default)', () => {
      const groups = formatter.exportByGroup(rules);
      expect(groups.has('logging')).toBe(true);
      expect(groups.has('error-handling')).toBe(true);
      expect(groups.get('logging')!.length).toBe(2);
      expect(groups.get('error-handling')!.length).toBe(1);
    });

    it('should group by language', () => {
      const groups = formatter.exportByGroup(rules, 'language');
      expect(groups.has('typescript')).toBe(true);
      expect(groups.has('python')).toBe(true);
      expect(groups.get('typescript')!.length).toBe(2);
    });

    it('should group by framework', () => {
      const groups = formatter.exportByGroup(rules, 'framework');
      expect(groups.has('express')).toBe(true);
      expect(groups.has('django')).toBe(true);
      expect(groups.has('koa')).toBe(true);
    });

    it('each group should contain FormatResult[]', () => {
      const groups = formatter.exportByGroup(rules);
      for (const [, results] of groups) {
        expect(Array.isArray(results)).toBe(true);
        for (const r of results) {
          expect(r).toHaveProperty('yaml');
          expect(r).toHaveProperty('fileName');
          expect(r).toHaveProperty('warnings');
        }
      }
    });
  });
});
