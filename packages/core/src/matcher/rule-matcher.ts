/**
 * RuleForge 规则匹配引擎
 * 根据代码上下文自动匹配适用规则
 *
 * 匹配流程：
 * 1. Trigger 匹配 — 文件路径/模式是否命中
 * 2. Condition 匹配 — 代码内容是否满足条件
 * 3. Compatibility 匹配 — 语言/框架/场景是否兼容
 * 4. 优先级排序 — 按优先级和置信度排序
 */

import { RuleYAML, RuleTrigger, RuleCondition } from '../types/rule-schema';
import { RuleStore, FilterOptions } from '../storage/rule-store';

// ─── 匹配上下文 ───

export interface MatchContext {
  filePath?: string;
  fileContent?: string;
  language?: string;
  framework?: string;
  scene?: string;
  projectConfig?: Record<string, any>;
}

// ─── 匹配结果 ───

export interface MatchResult {
  rule: RuleYAML;
  confidence: number;
  details: {
    triggerMatch: boolean;
    conditionMatches: boolean[];
    compatibilityMatch: boolean;
  };
  suggestions: RuleYAML['rule']['suggestions'];
}

// ─── 匹配选项 ───

export interface MatchOptions {
  minConfidence?: number;
  maxResults?: number;
  exactMatch?: boolean;
  includeSuggestions?: boolean;
}

// ─── 规则匹配器 ───

export class RuleMatcher {
  private store: RuleStore;

  constructor(store: RuleStore) {
    this.store = store;
  }

  /**
   * 根据上下文匹配规则
   */
  async match(
    context: MatchContext,
    options: MatchOptions = {}
  ): Promise<MatchResult[]> {
    const {
      minConfidence = 0.5,
      maxResults = 10,
      exactMatch = false,
      includeSuggestions = true
    } = options;

    // 1. 获取候选规则
    const filters: FilterOptions = {};
    if (context.language) filters.language = context.language;
    if (context.framework) filters.framework = context.framework;
    if (context.scene) filters.tags = [context.scene];

    const candidates = await this.store.list(filters);

    // 2. 逐个匹配
    const results: MatchResult[] = [];

    for (const rule of candidates) {
      const result = this.matchRule(rule, context, exactMatch);
      if (result && result.confidence >= minConfidence) {
        if (!includeSuggestions) {
          result.suggestions = [];
        }
        results.push(result);
      }
    }

    // 3. 按置信度排序
    results.sort((a, b) => b.confidence - a.confidence);

    // 4. 截断
    return results.slice(0, maxResults);
  }

  /**
   * 匹配单个规则
   */
  private matchRule(
    rule: RuleYAML,
    context: MatchContext,
    exactMatch: boolean
  ): MatchResult | null {
    // 1. Trigger 匹配
    const triggerMatch = this.matchTrigger(rule.rule.trigger, context);
    if (!triggerMatch) return null;

    // 2. Condition 匹配
    const conditionMatches = rule.rule.conditions.map(cond =>
      this.matchCondition(cond, context)
    );

    // 精确匹配模式：所有条件都必须满足
    if (exactMatch && conditionMatches.some(m => !m)) {
      return null;
    }

    // 3. Compatibility 匹配
    const compatibilityMatch = this.matchCompatibility(rule.compatibility, context);

    // 4. 计算置信度
    const confidence = this.calculateConfidence(
      rule, triggerMatch, conditionMatches, compatibilityMatch
    );

    return {
      rule,
      confidence,
      details: { triggerMatch, conditionMatches, compatibilityMatch },
      suggestions: rule.rule.suggestions
    };
  }

  /**
   * 匹配 Trigger
   */
  private matchTrigger(trigger: RuleTrigger, context: MatchContext): boolean {
    if (!context.filePath) return false;

    switch (trigger.type) {
      case 'file_pattern':
        return this.matchFilePattern(trigger.pattern, context.filePath);
      case 'code_pattern':
        return context.fileContent
          ? this.matchCodePattern(trigger.pattern, context.fileContent)
          : false;
      case 'command':
      case 'git_operation':
      default:
        return false;
    }
  }

  /**
   * 匹配文件模式（glob → regex）
   */
  private matchFilePattern(pattern: string, filePath: string): boolean {
    const regex = this.globToRegex(pattern);
    return regex.test(filePath);
  }

  /**
   * 匹配代码模式
   */
  private matchCodePattern(pattern: string, content: string): boolean {
    try {
      const regex = new RegExp(pattern, 'm');
      return regex.test(content);
    } catch {
      return false;
    }
  }

  /**
   * 匹配 Condition
   */
  private matchCondition(condition: RuleCondition, context: MatchContext): boolean {
    let result = false;

    switch (condition.type) {
      case 'code_contains':
        result = context.fileContent
          ? this.matchCodePattern(condition.condition, context.fileContent)
          : false;
        break;
      case 'file_exists':
      case 'dependency_check':
      case 'config_check':
      default:
        result = false;
    }

    return condition.negated ? !result : result;
  }

  /**
   * 匹配 Compatibility
   */
  private matchCompatibility(
    compatibility: RuleYAML['compatibility'],
    context: MatchContext
  ): boolean {
    if (context.language && !compatibility.languages.includes(context.language)) {
      return false;
    }
    if (context.framework && compatibility.frameworks?.length) {
      if (!compatibility.frameworks.includes(context.framework)) {
        return false;
      }
    }
    if (context.scene && compatibility.scenes?.length) {
      if (!compatibility.scenes.includes(context.scene)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 计算匹配置信度
   */
  private calculateConfidence(
    rule: RuleYAML,
    triggerMatch: boolean,
    conditionMatches: boolean[],
    compatibilityMatch: boolean
  ): number {
    if (!triggerMatch) return 0;

    let confidence = rule.confidence;

    // Trigger 命中 → 保留基础分的 40%
    confidence *= 0.4;

    // Condition 命中率 → 贡献 40%
    if (conditionMatches.length > 0) {
      const matchRate = conditionMatches.filter(m => m).length / conditionMatches.length;
      confidence += matchRate * 0.4;
    }

    // Compatibility 命中 → 贡献 20%
    if (compatibilityMatch) {
      confidence += 0.2;
    } else {
      confidence *= 0.5;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Glob 转正则
   */
  private globToRegex(glob: string): RegExp {
    // 1. 先转义文件名中的点（在通配符替换之前）
    let regexStr = glob.replace(/\./g, '\\.');
    // 2. 处理 **/ → 匹配零或多个目录层级
    regexStr = regexStr
      .replace(/\*\*\//g, '(.+/)?')
      .replace(/\*\*/g, '.*')
      // 3. 单个 * → 不跨目录
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');

    if (!regexStr.startsWith('^')) regexStr = '(.+/)?' + regexStr;
    if (!regexStr.endsWith('$')) regexStr = regexStr + '.*';

    return new RegExp(regexStr, 'i');
  }
}
