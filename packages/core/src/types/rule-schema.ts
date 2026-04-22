/**
 * RuleForge Engine Protocol (REP) v0.1 Schema
 * 使用 Zod 定义规则验证模式
 */

import { z } from 'zod';

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
  updated: z.string().datetime()
});

export const RuleTriggerSchema = z.object({
  type: z.enum(['file_pattern', 'code_pattern', 'command', 'git_operation']),
  pattern: z.string().min(1, '模式不能为空'),
  file_types: z.array(z.string()).optional(),
  context: z.string().optional()
});

export const RuleConditionSchema = z.object({
  type: z.enum(['file_exists', 'code_contains', 'dependency_check', 'config_check']),
  condition: z.string().min(1, '条件不能为空'),
  negated: z.boolean().optional()
});

export const RuleSuggestionSchema = z.object({
  type: z.enum(['code_fix', 'config_change', 'dependency_add', 'command_run']),
  description: z.string().min(10, '建议描述至少10个字符'),
  code: z.string().optional(),
  command: z.string().optional(),
  files: z.array(z.string()).optional()
});

export const RuleCompatibilitySchema = z.object({
  languages: z.array(z.string()).min(1, '至少支持一种语言'),
  frameworks: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  min_version: z.string().optional(),
  max_version: z.string().optional()
});

export const RuleContentSchema = z.object({
  trigger: RuleTriggerSchema,
  conditions: z.array(RuleConditionSchema).min(1, '至少需要一个条件'),
  suggestions: z.array(RuleSuggestionSchema).min(1, '至少需要一个建议')
});

export const RuleSchema = z.object({
  meta: RuleMetaSchema,
  rule: RuleContentSchema,
  compatibility: RuleCompatibilitySchema,
  confidence: z.number().min(0).max(1, '置信度必须在0-1之间')
});

export type RuleYAML = z.infer<typeof RuleSchema>;
export type RuleMeta = z.infer<typeof RuleMetaSchema>;
export type RuleTrigger = z.infer<typeof RuleTriggerSchema>;
export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type RuleSuggestion = z.infer<typeof RuleSuggestionSchema>;
export type RuleCompatibility = z.infer<typeof RuleCompatibilitySchema>;