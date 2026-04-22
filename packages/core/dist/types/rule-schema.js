"use strict";
/**
 * RuleForge Engine Protocol (REP) v0.1 Schema
 * 使用 Zod 定义规则验证模式
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleSchema = exports.RuleContentSchema = exports.RuleCompatibilitySchema = exports.RuleSuggestionSchema = exports.RuleConditionSchema = exports.RuleTriggerSchema = exports.RuleMetaSchema = void 0;
const zod_1 = require("zod");
exports.RuleMetaSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[a-z0-9-]+$/, 'ID只能包含小写字母、数字和连字符'),
    name: zod_1.z.string().min(3, '名称至少3个字符'),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/, '版本号必须符合语义版本规范'),
    description: zod_1.z.string().min(10, '描述至少10个字符'),
    authors: zod_1.z.array(zod_1.z.string()).min(1, '至少需要一个作者'),
    license: zod_1.z.enum(['MIT', 'Apache-2.0', 'BSD-3-Clause'], {
        errorMap: () => ({ message: '许可证必须是 MIT、Apache-2.0 或 BSD-3-Clause' })
    }),
    created: zod_1.z.string().datetime(),
    updated: zod_1.z.string().datetime()
});
exports.RuleTriggerSchema = zod_1.z.object({
    type: zod_1.z.enum(['file_pattern', 'code_pattern', 'command', 'git_operation']),
    pattern: zod_1.z.string().min(1, '模式不能为空'),
    file_types: zod_1.z.array(zod_1.z.string()).optional(),
    context: zod_1.z.string().optional()
});
exports.RuleConditionSchema = zod_1.z.object({
    type: zod_1.z.enum(['file_exists', 'code_contains', 'dependency_check', 'config_check']),
    condition: zod_1.z.string().min(1, '条件不能为空'),
    negated: zod_1.z.boolean().optional()
});
exports.RuleSuggestionSchema = zod_1.z.object({
    type: zod_1.z.enum(['code_fix', 'config_change', 'dependency_add', 'command_run']),
    description: zod_1.z.string().min(10, '建议描述至少10个字符'),
    code: zod_1.z.string().optional(),
    command: zod_1.z.string().optional(),
    files: zod_1.z.array(zod_1.z.string()).optional()
});
exports.RuleCompatibilitySchema = zod_1.z.object({
    languages: zod_1.z.array(zod_1.z.string()).min(1, '至少支持一种语言'),
    frameworks: zod_1.z.array(zod_1.z.string()).optional(),
    tools: zod_1.z.array(zod_1.z.string()).optional(),
    min_version: zod_1.z.string().optional(),
    max_version: zod_1.z.string().optional()
});
exports.RuleContentSchema = zod_1.z.object({
    trigger: exports.RuleTriggerSchema,
    conditions: zod_1.z.array(exports.RuleConditionSchema).min(1, '至少需要一个条件'),
    suggestions: zod_1.z.array(exports.RuleSuggestionSchema).min(1, '至少需要一个建议')
});
exports.RuleSchema = zod_1.z.object({
    meta: exports.RuleMetaSchema,
    rule: exports.RuleContentSchema,
    compatibility: exports.RuleCompatibilitySchema,
    confidence: zod_1.z.number().min(0).max(1, '置信度必须在0-1之间')
});
//# sourceMappingURL=rule-schema.js.map