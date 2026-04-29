/**
 * RuleForge 规则验证器
 * 使用 Zod 验证规则是否符合 REP v0.2 协议标准（向后兼容 v0.1）
 */

import { z } from 'zod';
import { RuleSchema, RuleYAML, getSchemaVersion, isV02 } from '../types/rule-schema';
import { ValidationResult } from '../types/rule';

export interface ValidationOptions {
  strict?: boolean;
  allowPartial?: boolean;
  customRules?: CustomRule[];
}

export interface CustomRule {
  name: string;
  validate: (rule: RuleYAML) => { valid: boolean; message: string };
}


export interface DependencyCheckResult {
  valid: boolean;
  missingDependencies: Array<{ ruleId: string; missingDep: string }>;
  circularDependencies: string[][];
}

export interface ConflictCheckResult {
  valid: boolean;
  conflicts: Array<{ ruleA: string; ruleB: string; reason: string }>;
}

export interface DependencyResolution {
  valid: boolean;
  issues: {
    missingDependencies: Array<{ ruleId: string; missingDep: string }>;
    circularDependencies: string[][];
  };
  suggestions: string[];
}

/** v0.2 已知场景值（非穷举，仅用于警告） */
const KNOWN_SCENES = ['coding', 'drama', 'multimodal', 'writing', 'data'];

/** v0.2 source 前缀模式 */
const SOURCE_PATTERN = /^(local|github:[\w.-]+\/[\w.-]+|gitlab:[\w.-]+\/[\w.-]+|npm:[\w.-]+|custom:.+)$/;

export class RuleValidator {
  private readonly defaultOptions: ValidationOptions;

  constructor(options: Partial<ValidationOptions> = {}) {
    this.defaultOptions = {
      strict: true,
      allowPartial: false,
      customRules: [],
      ...options
    };
  }

  /**
   * 验证规则是否符合 REP 协议
   */
  validate(rule: unknown, options: ValidationOptions = {}): ValidationResult {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('🔍 开始验证规则...');

      // 1. 基础 Schema 验证
      const validationResult = RuleSchema.safeParse(rule);

      if (!validationResult.success) {
        const schemaErrors = this.formatZodErrors(validationResult.error);
        errors.push(...schemaErrors);

        if (mergedOptions.allowPartial && schemaErrors.length > 0) {
          warnings.push('规则包含部分错误，但允许部分验证');
        } else {
          return { valid: false, errors, warnings };
        }
      }

      const validatedRule = validationResult.success ? validationResult.data : (rule as RuleYAML);

      // 2. 语义验证（v0.1 + v0.2）
      const semanticResults = this.validateSemantics(validatedRule);
      errors.push(...semanticResults.errors);
      warnings.push(...semanticResults.warnings);

      // 3. v0.2 专属验证
      if (isV02(validatedRule)) {
        const v02Results = this.validateV02Fields(validatedRule);
        errors.push(...v02Results.errors);
        warnings.push(...v02Results.warnings);
      }

      // 4. 自定义规则验证
      if (mergedOptions.customRules && mergedOptions.customRules.length > 0) {
        const customResults = this.validateCustomRules(validatedRule, mergedOptions.customRules);
        errors.push(...customResults.errors);
        warnings.push(...customResults.warnings);
      }

      // 5. 置信度验证
      if (validatedRule.confidence < 0.5) {
        warnings.push('规则置信度较低，建议进一步验证');
      }

      // 6. 兼容性验证
      const compatibilityResults = this.validateCompatibility(validatedRule);
      warnings.push(...compatibilityResults);

      const isValid = errors.length === 0 || (mergedOptions.allowPartial && errors.length < 3);

      console.log(`✅ 规则验证完成: ${isValid ? '通过' : '失败'}`);

      return { valid: isValid as boolean, errors, warnings };

    } catch (error) {
      console.error('❌ 规则验证过程中发生错误:', error);
      return {
        valid: false,
        errors: [`验证过程错误: ${error instanceof Error ? error.message : '未知错误'}`],
        warnings
      };
    }
  }

  /**
   * 批量验证多个规则
   */
  validateBatch(rules: unknown[], options: ValidationOptions = {}): ValidationResult[] {
    const results = rules.map((rule, index) => {
      console.log(`🔍 验证规则 ${index + 1}/${rules.length}...`);
      return this.validate(rule, options);
    });

    // 依赖与冲突检测（批量验证时自动执行）
    const typedRules = rules as RuleYAML[];
    const depResult = this.checkDependencies(typedRules);
    const conflictResult = this.checkConflicts(typedRules);

    if (!depResult.valid) {
      for (const issue of depResult.missingDependencies) {
        const idx = typedRules.findIndex(r => r.meta.id === issue.ruleId);
        if (idx >= 0) {
          results[idx].errors.push(`依赖缺失: 规则 "${issue.ruleId}" 依赖的 "${issue.missingDep}" 不存在`);
        }
      }
      for (const cycle of depResult.circularDependencies) {
        for (const ruleId of cycle) {
          const idx = typedRules.findIndex(r => r.meta.id === ruleId);
          if (idx >= 0) {
            results[idx].errors.push(`循环依赖: ${cycle.join(` → `)}`);
          }
        }
      }
    }

    if (!conflictResult.valid) {
      for (const conflict of conflictResult.conflicts) {
        const idxA = typedRules.findIndex(r => r.meta.id === conflict.ruleA);
        const idxB = typedRules.findIndex(r => r.meta.id === conflict.ruleB);
        if (idxA >= 0) results[idxA].warnings.push(`规则冲突: 与 "${conflict.ruleB}" 冲突 - ${conflict.reason}`);
        if (idxB >= 0) results[idxB].warnings.push(`规则冲突: 与 "${conflict.ruleA}" 冲突 - ${conflict.reason}`);
      }
    }

    return results;
  }

  /**
   * 格式化 Zod 错误信息
   */
  private formatZodErrors(error: z.ZodError): string[] {
    return error.errors.map(err => {
      const path = err.path.length > 0 ? `路径: ${err.path.join('.')}` : '';
      return `${err.message} ${path}`.trim();
    });
  }

  /**
   * 语义验证（适用于 v0.1 和 v0.2）
   */
  private validateSemantics(rule: RuleYAML): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isValidRuleId(rule.meta.id)) {
      errors.push('规则ID格式不正确，只能包含小写字母、数字和连字符（3-50字符）');
    }

    if (!this.isValidVersion(rule.meta.version)) {
      errors.push('版本号格式不正确，必须符合语义版本规范（如 1.0.0）');
    }

    if (rule.rule.trigger.type === 'file_pattern' && !rule.rule.trigger.file_types) {
      warnings.push('文件模式触发器建议指定 file_types');
    }

    rule.rule.suggestions.forEach((suggestion, index) => {
      if (!suggestion.code && !suggestion.command && !suggestion.files) {
        warnings.push(`建议 ${index + 1} 缺少具体的实现内容（code/command/files）`);
      }
    });

    if (rule.compatibility.languages.length === 0) {
      warnings.push('规则未指定适用的编程语言');
    }

    const hasNegatedConditions = rule.rule.conditions.some(cond => cond.negated);
    const hasNormalConditions = rule.rule.conditions.some(cond => !cond.negated);

    if (hasNegatedConditions && !hasNormalConditions) {
      warnings.push('规则条件全部为否定形式，可能难以触发');
    }

    if (rule.confidence > 0.9 && rule.meta.version === '0.1.0') {
      warnings.push('新规则版本置信度过高，建议谨慎验证');
    }

    return { errors, warnings };
  }

  /**
   * v0.2 专属字段验证
   * 仅当 isV02(rule) === true 时调用
   */
  private validateV02Fields(rule: RuleYAML): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rule.schemaVersion) {
      if (!/^0\.[12]\.\d+$|^1\.\d+\.\d+$/.test(rule.schemaVersion)) {
        warnings.push(`schemaVersion 格式不规范: "${rule.schemaVersion}"，建议使用 "0.2.x" 或 "1.x.x"`);
      }
    }

    if (rule.meta.source !== undefined) {
      if (!SOURCE_PATTERN.test(rule.meta.source)) {
        warnings.push(
          `meta.source 格式不标准: "${rule.meta.source}"，建议使用 "local"、"github:owner/repo" 等格式`
        );
      }
    }

    if (rule.meta.forked_from) {
      if (!rule.meta.id || rule.meta.id.length < 3) {
        errors.push('声明 forked_from 的规则必须有有效的 ID');
      }
      if (rule.meta.source === 'local') {
        warnings.push('声明了 forked_from 但 source 为 "local"，建议标注真实来源');
      }
    }

    if (rule.meta.tags && rule.meta.tags.length > 0) {
      const emptyTags = rule.meta.tags.filter(t => !t || t.trim().length === 0);
      if (emptyTags.length > 0) {
        errors.push('meta.tags 不能包含空字符串');
      }
      const longTags = rule.meta.tags.filter(t => t.length > 50);
      if (longTags.length > 0) {
        warnings.push(`meta.tags 中有标签超过50字符: ${longTags.map(t => `"${t}"`).join(', ')}`);
      }
      const uniqueTags = new Set(rule.meta.tags.map(t => t.toLowerCase()));
      if (uniqueTags.size < rule.meta.tags.length) {
        warnings.push('meta.tags 中存在重复标签（不区分大小写）');
      }
    }

    if (rule.meta.scene !== undefined) {
      if (rule.meta.scene.length === 0) {
        errors.push('meta.scene 不能为空字符串');
      }
      if (!KNOWN_SCENES.includes(rule.meta.scene)) {
        warnings.push(
          `meta.scene "${rule.meta.scene}" 不在已知场景列表中（已知: ${KNOWN_SCENES.join(', ')}）`
        );
      }
    }

    if (rule.priority !== undefined) {
      const validPriorities = ['global', 'project', 'session'];
      if (!validPriorities.includes(rule.priority)) {
        errors.push(`priority 必须是 ${validPriorities.join(' | ')} 之一，当前值: "${rule.priority}"`);
      }
      if (rule.priority === 'global' && rule.confidence < 0.7) {
        warnings.push('global 优先级的规则建议置信度 >= 0.7');
      }
    }

    if (rule.compatibility.scenes && rule.compatibility.scenes.length > 0) {
      const unknownScenes = rule.compatibility.scenes.filter(s => !KNOWN_SCENES.includes(s));
      if (unknownScenes.length > 0) {
        warnings.push(`compatibility.scenes 中有未知场景: ${unknownScenes.join(', ')}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证自定义规则
   */
  private validateCustomRules(rule: RuleYAML, customRules: CustomRule[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    customRules.forEach(customRule => {
      const result = customRule.validate(rule);
      if (!result.valid) {
        errors.push(`自定义规则验证失败 [${customRule.name}]: ${result.message}`);
      }
    });

    return { errors, warnings };
  }

  /**
   * 验证兼容性信息
   */
  private validateCompatibility(rule: RuleYAML): string[] {
    const warnings: string[] = [];

    if (rule.compatibility.frameworks && rule.compatibility.frameworks.length > 0) {
      const hasVersionConstraints = rule.compatibility.min_version || rule.compatibility.max_version;
      if (!hasVersionConstraints) {
        warnings.push('框架兼容性信息缺少版本约束（min_version/max_version）');
      }
    }

    if (rule.compatibility.tools && rule.compatibility.tools.length > 0) {
      const supportedTools = ['vscode', 'trae', 'webstorm', 'vim', 'cursor', 'windsurf'];
      const unsupportedTools = rule.compatibility.tools.filter(
        tool => !supportedTools.includes(tool.toLowerCase())
      );
      if (unsupportedTools.length > 0) {
        warnings.push(`检测到不常见的工具兼容性声明: ${unsupportedTools.join(', ')}`);
      }
    }

    return warnings;
  }

  /**
   * 检查规则ID格式
   */
  private isValidRuleId(id: string): boolean {
    return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
  }

  /**
   * 检查版本号格式
   */
  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * 创建预定义的验证规则集合
   */
  static createStandardValidator(options: ValidationOptions = {}): RuleValidator {
    const standardRules: CustomRule[] = [
      {
        name: 'description-length',
        validate: (rule) => ({
          valid: rule.meta.description.length >= 20,
          message: '规则描述应至少包含20个字符以提供足够的信息'
        })
      },
      {
        name: 'suggestion-completeness',
        validate: (rule) => {
          const hasCompleteSuggestions = rule.rule.suggestions.every(suggestion =>
            suggestion.code || suggestion.command || suggestion.files
          );
          return {
            valid: hasCompleteSuggestions,
            message: '所有建议都应包含具体的实现内容（代码、命令或文件）'
          };
        }
      },
      {
        name: 'trigger-specificity',
        validate: (rule) => {
          const isSpecific = rule.rule.trigger.pattern !== '**/*' &&
                           rule.rule.trigger.pattern !== '*';
          return {
            valid: isSpecific,
            message: '触发器模式应具体明确，避免使用过于宽泛的模式'
          };
        }
      }
    ];

    const allRules = [...standardRules, ...(options.customRules || [])];
    return new RuleValidator({ ...options, customRules: allRules });
  }

  /**
   * 检测规则间的依赖关系
   * @param rules 待检测的规则列表
   * @returns 依赖检测结果
   */
  checkDependencies(rules: RuleYAML[]): DependencyCheckResult {
    const ruleMap = new Map(rules.map(r => [r.meta.id, r]));
    const missingDeps: Array<{ ruleId: string; missingDep: string }> = [];
    const circularDeps: string[][] = [];

    // 检测缺失依赖
    for (const rule of rules) {
      if (rule.depends_on) {
        for (const dep of rule.depends_on) {
          if (!ruleMap.has(dep)) {
            missingDeps.push({ ruleId: rule.meta.id, missingDep: dep });
          }
        }
      }
    }

    // 检测循环依赖（DFS）
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (ruleId: string, path: string[]): boolean => {
      if (stack.has(ruleId)) {
        const cycleStart = path.indexOf(ruleId);
        circularDeps.push(path.slice(cycleStart).concat(ruleId));
        return true;
      }
      if (visited.has(ruleId)) return false;

      visited.add(ruleId);
      stack.add(ruleId);
      path.push(ruleId);

      const rule = ruleMap.get(ruleId);
      if (rule?.depends_on) {
        for (const dep of rule.depends_on) {
          if (dfs(dep, [...path])) return true;
        }
      }

      stack.delete(ruleId);
      return false;
    };

    for (const rule of rules) {
      if (!visited.has(rule.meta.id)) {
        dfs(rule.meta.id, []);
      }
    }

    return {
      valid: missingDeps.length === 0 && circularDeps.length === 0,
      missingDependencies: missingDeps,
      circularDependencies: circularDeps,
    };
  }

  /**
   * 检测规则间的冲突关系
   * @param rules 待检测的规则列表
   * @returns 冲突检测结果
   */
  checkConflicts(rules: RuleYAML[]): ConflictCheckResult {
    const conflicts: Array<{ ruleA: string; ruleB: string; reason: string }> = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i];
        const b = rules[j];

        // 1. 显式冲突声明
        if (a.conflicts_with?.includes(b.meta.id)) {
          conflicts.push({ ruleA: a.meta.id, ruleB: b.meta.id, reason: '显式冲突声明' });
        }
        if (b.conflicts_with?.includes(a.meta.id)) {
          if (!conflicts.some(c => c.ruleA === b.meta.id && c.ruleB === a.meta.id)) {
            conflicts.push({ ruleA: b.meta.id, ruleB: a.meta.id, reason: '显式冲突声明' });
          }
        }

        // 2. 语义冲突检测：相同 trigger pattern + 不同 suggestion
        if (a.rule.trigger.type === b.rule.trigger.type &&
            a.rule.trigger.pattern === b.rule.trigger.pattern) {
          const aSuggestions = a.rule.suggestions.map(s => s.description).sort().join('|');
          const bSuggestions = b.rule.suggestions.map(s => s.description).sort().join('|');
          if (aSuggestions !== bSuggestions) {
            conflicts.push({
              ruleA: a.meta.id,
              ruleB: b.meta.id,
              reason: `相同触发器(${a.rule.trigger.pattern})但建议不同`,
            });
          }
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * 自动解决依赖问题
   * 返回建议的修复操作
   */
  resolveDependencyIssues(rules: RuleYAML[]): DependencyResolution {
    const depCheck = this.checkDependencies(rules);
    const suggestions: string[] = [];

    for (const issue of depCheck.missingDependencies) {
      suggestions.push(`规则 "${issue.ruleId}" 缺少依赖 "${issue.missingDep}"，建议添加 depends_on: ["${issue.missingDep}"]`);
    }

    for (const cycle of depCheck.circularDependencies) {
      suggestions.push(`检测到循环依赖: ${cycle.join(' → ')}，建议打破循环链`);
    }

    return {
      valid: depCheck.valid && suggestions.length === 0,
      issues: {
        missingDependencies: depCheck.missingDependencies,
        circularDependencies: depCheck.circularDependencies,
      },
      suggestions,
    };
  }
  /**
   * 生成验证报告
   */
  generateReport(validationResults: ValidationResult[]): string {
    const totalRules = validationResults.length;
    const validRules = validationResults.filter(result => result.valid).length;
    const totalErrors = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);

    let report = '# RuleForge 验证报告\n\n';
    report += '## 统计信息\n';
    report += `- 总规则数: ${totalRules}\n`;
    report += `- 有效规则: ${validRules}\n`;
    report += `- 无效规则: ${totalRules - validRules}\n`;
    report += `- 总错误数: ${totalErrors}\n`;
    report += `- 总警告数: ${totalWarnings}\n\n`;

    validationResults.forEach((result, index) => {
      report += `## 规则 ${index + 1} - ${result.valid ? '✅ 通过' : '❌ 失败'}\n`;

      if (result.errors.length > 0) {
        report += '### 错误信息\n';
        result.errors.forEach(error => { report += `- ${error}\n`; });
        report += '\n';
      }

      if (result.warnings.length > 0) {
        report += '### 警告信息\n';
        result.warnings.forEach(warning => { report += `- ⚠️ ${warning}\n`; });
        report += '\n';
      }
    });

    // 依赖与冲突检测摘要
    report += '## 依赖与冲突检测\n';
    report += '> 批量验证时自动执行依赖与冲突检测\n';

    return report;
  }
}
