/**
 * RuleForge Engine Protocol (REP) v0.2 Schema
 * 使用 Zod 定义规则验证模式
 *
 * v0.2 变更（向后兼容 v0.1）：
 * - 新增 schemaVersion 字段（可选，默认 "0.1"）
 * - meta 新增 source / forked_from / tags / scene 字段
 * - compatibility 新增 scenes 字段
 * - 新增 RuleDomain 枚举：code / creative / multimodal
 * - 新增 RulePriority 枚举：global / project / session
 */

import { z } from 'zod';

// ─── v0.2 新增：领域与优先级枚举 ───

export const RuleDomainSchema = z.enum(['code', 'creative', 'multimodal']);
export type RuleDomain = z.infer<typeof RuleDomainSchema>;

export const RulePrioritySchema = z.enum(['global', 'project', 'session']);
export type RulePriority = z.infer<typeof RulePrioritySchema>;

// ─── Meta ───

export const RuleMetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'ID只能包含小写字母、数字和连字符'),
  name: z.string().min(3, '名称至少3个字符'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号必须符合语义版本规范'),
  description: z.string().min(10, '描述至少10个字符'),
  authors: z.array(z.string()).min(1, '至少需要一个作者'),
  license: z.enum(['MIT', 'Apache-2.0', 'BSD-3-Clause'], {
    errorMap: () => ({ message: '许可证必须是 MIT、Apache-2.0 或 BSD-3-Clause' })
  }),
  created: z.string().datetime(),
  updated: z.string().datetime(),

  // ── v0.2 新增字段（全部 optional，向后兼容 v0.1）──
  /** 规则来源标识，如 "github:kialajin-l/RuleForge" 或 "local" */
  source: z.string().optional(),
  /** fork 来源的规则 ID，用于社区共享追踪 */
  forked_from: z.string().optional(),
  /** 自由标签，用于分类和搜索 */
  tags: z.array(z.string()).optional(),
  /** 应用场景标记，如 "coding" / "drama" / "multimodal" */
  scene: z.string().optional(),
});

// ─── Trigger ───

export const RuleTriggerSchema = z.object({
  type: z.enum(['file_pattern', 'code_pattern', 'command', 'git_operation']),
  pattern: z.string().min(1, '模式不能为空'),
  file_types: z.array(z.string()).optional(),
  context: z.string().optional()
});

// ─── Condition ───

export const RuleConditionSchema = z.object({
  type: z.enum(['file_exists', 'code_contains', 'dependency_check', 'config_check']),
  condition: z.string().min(1, '条件不能为空'),
  negated: z.boolean().optional()
});

// ─── Suggestion ───

export const RuleSuggestionSchema = z.object({
  type: z.enum(['code_fix', 'config_change', 'dependency_add', 'command_run']),
  description: z.string().min(10, '建议描述至少10个字符'),
  code: z.string().optional(),
  command: z.string().optional(),
  files: z.array(z.string()).optional()
});

// ─── Compatibility ───

export const RuleCompatibilitySchema = z.object({
  languages: z.array(z.string()).min(1, '至少支持一种语言'),
  frameworks: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  min_version: z.string().optional(),
  max_version: z.string().optional(),
  // ── v0.2 新增 ──
  /** 适用场景列表，如 ["coding", "drama"] */
  scenes: z.array(z.string()).optional(),
});

// ─── Rule Content ───

export const RuleContentSchema = z.object({
  trigger: RuleTriggerSchema,
  conditions: z.array(RuleConditionSchema).min(1, '至少需要一个条件'),
  suggestions: z.array(RuleSuggestionSchema).min(1, '至少需要一个建议')
});

// ─── Root Schema ───

export const RuleSchema = z.object({
  // ── v0.2 新增：schema 版本（可选，默认 "0.1" 以兼容旧文件）──
  schemaVersion: z.string().optional(),
  meta: RuleMetaSchema,
  rule: RuleContentSchema,
  compatibility: RuleCompatibilitySchema,
  confidence: z.number().min(0).max(1, '置信度必须在0-1之间'),
  // ── v0.2 新增：优先级（可选，默认 "project"）──
  priority: RulePrioritySchema.optional(),
});

// ─── 导出类型 ───

export type RuleYAML = z.infer<typeof RuleSchema>;
export type RuleMeta = z.infer<typeof RuleMetaSchema>;
export type RuleTrigger = z.infer<typeof RuleTriggerSchema>;
export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type RuleSuggestion = z.infer<typeof RuleSuggestionSchema>;
export type RuleCompatibility = z.infer<typeof RuleCompatibilitySchema>;

/**
 * 获取规则的 schema 版本，兼容未标注版本的 v0.1 文件
 */
export function getSchemaVersion(rule: RuleYAML): string {
  return rule.schemaVersion ?? '0.1';
}

/**
 * 判断规则是否为 v0.2+ 格式
 */
export function isV02(rule: RuleYAML): boolean {
  const v = getSchemaVersion(rule);
  return v.startsWith('0.2') || v.startsWith('1.');
}
