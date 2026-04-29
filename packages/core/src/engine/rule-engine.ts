/**
 * RuleForge RuleEngine — 规则执行引擎
 *
 * 核心职责：
 * 1. 加载规则库（从 .ruleforge/ 目录）
 * 2. 接收文件变更事件，匹配适用规则
 * 3. 生成 LSP 兼容的 Diagnostic 列表
 * 4. 支持规则优先级排序（global > project > session）
 * 5. 支持 depends_on 依赖链解析
 * 6. 集成规则使用统计
 */

import { RuleYAML } from '../types/rule-schema';
import { RuleMatcher, MatchContext } from '../matcher/rule-matcher';
import { RuleStore } from '../storage/rule-store';
import {
  FileChangeEvent,
  EngineMatchResult,
  RuleDiagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  RuleEngineConfig,
  RuleEngineEvent,
  RuleEngineEventListener,
  DEFAULT_ENGINE_CONFIG,
} from './types';
import { RuleStats } from './rule-stats';

// ─── 优先级权重 ───

const PRIORITY_WEIGHT: Record<string, number> = {
  global: 3,
  project: 2,
  session: 1,
};

// ─── suggestion type → 严重级别映射 ───

const SEVERITY_MAP: Record<string, DiagnosticSeverity> = {
  code_fix: DiagnosticSeverity.Warning,
  config_change: DiagnosticSeverity.Information,
  dependency_add: DiagnosticSeverity.Information,
  command_run: DiagnosticSeverity.Hint,
};

// ─── suggestion type → tag 映射 ───

const TAG_MAP: Record<string, DiagnosticTag> = {
  code_fix: DiagnosticTag.QuickFix,
  config_change: DiagnosticTag.ConfigChange,
  dependency_add: DiagnosticTag.Dependency,
  command_run: DiagnosticTag.QuickFix,
};

// ─── RuleEngine ───

export class RuleEngine {
  private config: RuleEngineConfig;
  private store: RuleStore;
  private matcher: RuleMatcher;
  private stats: RuleStats;
  private rules: RuleYAML[] = [];
  private initialized = false;
  private listeners: RuleEngineEventListener[] = [];

  constructor(config: Partial<RuleEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.store = new RuleStore({ rulesDir: this.config.rulesDir, createIndex: this.config.createIndex });
    this.matcher = new RuleMatcher(this.store);
    this.stats = new RuleStats(this.config.statsPath);
  }

  // ─── 生命周期 ───

  /**
   * 初始化引擎：加载规则库 + 统计数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.store.initialize();
    this.rules = await this.store.list();

    if (this.config.enableStats) {
      await this.stats.load();
    }

    this.initialized = true;
    this.emit({ type: 'engine:initialized', ruleCount: this.rules.length });
  }

  /**
   * 重新加载规则库
   */
  async reload(): Promise<void> {
    this.initialized = false;
    this.rules = [];
    await this.initialize();
  }

  // ─── 核心 API ───

  /**
   * 处理文件变更事件，返回诊断列表
   *
   * 流程：
   * 1. 过滤文件（按 filePatterns）
   * 2. 匹配规则（通过 RuleMatcher）
   * 3. 解析依赖链（depends_on）
   * 4. 按优先级 + 置信度排序
   * 5. 生成 LSP Diagnostic
   * 6. 更新统计数据
   */
  async onFileChange(event: FileChangeEvent): Promise<RuleDiagnostic[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // 1. 文件过滤
    if (!this.shouldProcessFile(event.path)) {
      return [];
    }

    // 2. 构建匹配上下文
    const context: MatchContext = {
      filePath: event.path,
      fileContent: event.content,
      language: event.language,
      framework: event.framework,
      scene: event.scene,
    };

    // 3. 匹配规则
    const matchResults = await this.matcher.match(context, {
      minConfidence: this.config.minConfidence,
      maxResults: this.config.maxDiagnostics,
    });

    // 4. 转换为 EngineMatchResult（补充优先级）
    const engineResults: EngineMatchResult[] = matchResults.map(m => ({
      ...m,
      priority: (m.rule.priority ?? 'project') as 'global' | 'project' | 'session',
    }));

    // 5. 解析依赖链
    const resolved = this.config.resolveDependencies
      ? this.resolveDependencyChain(engineResults)
      : engineResults;

    // 6. 按优先级 + 置信度排序
    resolved.sort((a, b) => {
      const pw = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
      if (pw !== 0) return pw;
      return b.confidence - a.confidence;
    });

    // 7. 截断
    const topResults = resolved.slice(0, this.config.maxDiagnostics);

    // 8. 生成 Diagnostic
    const diagnostics = topResults.flatMap(r => this.toDiagnostics(r, event));

    // 9. 更新统计
    if (this.config.enableStats) {
      for (const r of topResults) {
        this.stats.recordMatch(r.rule.meta.id);
      }
      await this.stats.save();
    }

    // 10. 发送事件
    this.emit({
      type: 'engine:matched',
      filePath: event.path,
      matchCount: topResults.length,
      diagnosticCount: diagnostics.length,
    });

    return diagnostics;
  }

  /**
   * 批量处理多个文件变更
   */
  async onFileChanges(events: FileChangeEvent[]): Promise<Map<string, RuleDiagnostic[]>> {
    const results = new Map<string, RuleDiagnostic[]>();
    for (const event of events) {
      const diagnostics = await this.onFileChange(event);
      results.set(event.path, diagnostics);
    }
    return results;
  }

  /**
   * 记录建议被采纳
   */
  async recordAdoption(ruleId: string): Promise<void> {
    if (this.config.enableStats) {
      this.stats.recordAdoption(ruleId);
      await this.stats.save();
      this.emit({ type: 'stats:updated', ruleId, matchCount: 0, adoptCount: 0 });
    }
  }

  /**
   * 获取规则统计摘要
   */
  getStats() {
    return this.stats.getSummary();
  }

  /**
   * 获取所有已加载的规则
   */
  getRules(): RuleYAML[] {
    return [...this.rules];
  }

  /**
   * 获取引擎配置
   */
  getConfig(): RuleEngineConfig {
    return { ...this.config };
  }

  // ─── 事件系统 ───

  /**
   * 注册事件监听器，返回取消注册函数
   */
  on(listener: RuleEngineEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: RuleEngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 监听器错误不应影响引擎运行
      }
    }
  }

  // ─── 内部方法 ───

  /**
   * 判断文件是否应该被处理
   */
  private shouldProcessFile(filePath: string): boolean {
    if (this.config.filePatterns.length > 0) {
      const matches = this.config.filePatterns.some(pattern =>
        this.globMatch(pattern, filePath)
      );
      if (!matches) return false;
    }
    return true;
  }

  /**
   * 解析依赖链：如果规则 A depends_on 规则 B，
   * 而 B 没有出现在匹配结果中，则把 B 也加入结果
   */
  private resolveDependencyChain(results: EngineMatchResult[]): EngineMatchResult[] {
    const matched = new Set(results.map(r => r.rule.meta.id));
    const additional: EngineMatchResult[] = [];

    for (const result of results) {
      const deps = result.rule.depends_on ?? [];
      for (const depId of deps) {
        if (matched.has(depId)) continue;

        const depRule = this.rules.find(r => r.meta.id === depId);
        if (!depRule) continue;

        matched.add(depId);
        additional.push({
          rule: depRule,
          confidence: depRule.confidence * 0.8,
          details: {
            triggerMatch: true,
            conditionMatches: [],
            compatibilityMatch: true,
          },
          suggestions: depRule.rule.suggestions,
          priority: (depRule.priority ?? 'project') as 'global' | 'project' | 'session',
        });
      }
    }

    return [...results, ...additional];
  }

  /**
   * 将 EngineMatchResult 转换为 LSP Diagnostic
   */
  private toDiagnostics(
    result: EngineMatchResult,
    event: FileChangeEvent
  ): RuleDiagnostic[] {
    const diagnostics: RuleDiagnostic[] = [];

    for (const suggestion of result.suggestions) {
      const { line, column, endLine, endColumn } = this.locateIssue(
        event.content,
        result.rule
      );

      diagnostics.push({
        filePath: event.path,
        line,
        column,
        endLine,
        endColumn,
        severity: SEVERITY_MAP[suggestion.type] ?? DiagnosticSeverity.Information,
        message: suggestion.description,
        source: result.rule.meta.id,
        confidence: result.confidence,
        tags: [TAG_MAP[suggestion.type] ?? DiagnosticTag.QuickFix],
        suggestedCode: suggestion.code,
        command: suggestion.command,
        priority: result.priority,
      });
    }

    return diagnostics;
  }

  /**
   * 尝试在文件内容中定位问题行
   */
  private locateIssue(
    content: string,
    rule: RuleYAML
  ): { line: number; column: number; endLine: number; endColumn: number } {
    const lines = content.split('\n');

    // 尝试用 trigger pattern 搜索
    const pattern = rule.rule.trigger.pattern;
    if (rule.rule.trigger.type === 'code_pattern' || rule.rule.trigger.type === 'file_pattern') {
      try {
        const regex = new RegExp(pattern, 'm');
        const match = regex.exec(content);
        if (match) {
          const beforeMatch = content.substring(0, match.index);
          const line = beforeMatch.split('\n').length - 1;
          const lastNewline = beforeMatch.lastIndexOf('\n');
          const column = match.index - lastNewline - 1;
          const matchLines = match[0].split('\n');
          return {
            line,
            column,
            endLine: line + matchLines.length - 1,
            endColumn: matchLines.length > 1
              ? matchLines[matchLines.length - 1].length
              : column + match[0].length,
          };
        }
      } catch {
        // 正则解析失败
      }
    }

    // 尝试用 conditions 搜索
    for (const cond of rule.rule.conditions) {
      if (cond.type === 'code_contains') {
        try {
          const regex = new RegExp(cond.condition, 'm');
          const match = regex.exec(content);
          if (match) {
            const beforeMatch = content.substring(0, match.index);
            const line = beforeMatch.split('\n').length - 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = match.index - lastNewline - 1;
            return {
              line,
              column,
              endLine: line,
              endColumn: column + match[0].length,
            };
          }
        } catch {
          // 继续
        }
      }
    }

    // 兜底：返回文件第一行
    return { line: 0, column: 0, endLine: 0, endColumn: lines[0]?.length ?? 0 };
  }

  /**
   * 简单 glob 匹配
   */
  private globMatch(pattern: string, filePath: string): boolean {
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*\//g, '(.+/)?')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');

    const full = regexStr.startsWith('^') ? regexStr : `(.+/)?${regexStr}`;
    const end = full.endsWith('$') ? full : `${full}.*`;

    return new RegExp(end, 'i').test(filePath);
  }
}
