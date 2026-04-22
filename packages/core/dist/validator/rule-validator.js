"use strict";
/**
 * RuleForge 规则验证器
 * 使用 Zod 验证规则是否符合 REP v0.1 协议标准
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleValidator = void 0;
const rule_schema_1 = require("../types/rule-schema");
class RuleValidator {
    defaultOptions = {
        strict: true,
        allowPartial: false,
        customRules: []
    };
    /**
     * 验证规则是否符合 REP v0.1 协议
     */
    validate(rule, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const errors = [];
        const warnings = [];
        try {
            console.log('🔍 开始验证规则...');
            // 1. 基础 Schema 验证
            const validationResult = rule_schema_1.RuleSchema.safeParse(rule);
            if (!validationResult.success) {
                const schemaErrors = this.formatZodErrors(validationResult.error);
                errors.push(...schemaErrors);
                if (mergedOptions.allowPartial && schemaErrors.length > 0) {
                    warnings.push('规则包含部分错误，但允许部分验证');
                }
                else {
                    return {
                        valid: false,
                        errors,
                        warnings
                    };
                }
            }
            const validatedRule = validationResult.success ? validationResult.data : rule;
            // 2. 语义验证
            const semanticResults = this.validateSemantics(validatedRule);
            errors.push(...semanticResults.errors);
            warnings.push(...semanticResults.warnings);
            // 3. 自定义规则验证
            if (mergedOptions.customRules && mergedOptions.customRules.length > 0) {
                const customResults = this.validateCustomRules(validatedRule, mergedOptions.customRules);
                errors.push(...customResults.errors);
                warnings.push(...customResults.warnings);
            }
            // 4. 置信度验证
            if (validatedRule.confidence < 0.5) {
                warnings.push('规则置信度较低，建议进一步验证');
            }
            // 5. 兼容性验证
            const compatibilityResults = this.validateCompatibility(validatedRule);
            warnings.push(...compatibilityResults);
            const isValid = errors.length === 0 || (mergedOptions.allowPartial && errors.length < 3);
            console.log(`✅ 规则验证完成: ${isValid ? '通过' : '失败'}`);
            return {
                valid: isValid,
                errors,
                warnings
            };
        }
        catch (error) {
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
    validateBatch(rules, options = {}) {
        return rules.map((rule, index) => {
            console.log(`🔍 验证规则 ${index + 1}/${rules.length}...`);
            return this.validate(rule, options);
        });
    }
    /**
     * 格式化 Zod 错误信息
     */
    formatZodErrors(error) {
        return error.errors.map(err => {
            const path = err.path.length > 0 ? `路径: ${err.path.join('.')}` : '';
            return `${err.message} ${path}`.trim();
        });
    }
    /**
     * 语义验证
     */
    validateSemantics(rule) {
        const errors = [];
        const warnings = [];
        // 1. 检查规则ID唯一性
        if (!this.isValidRuleId(rule.meta.id)) {
            errors.push('规则ID格式不正确，只能包含小写字母、数字和连字符');
        }
        // 2. 检查版本号格式
        if (!this.isValidVersion(rule.meta.version)) {
            errors.push('版本号格式不正确，必须符合语义版本规范');
        }
        // 3. 检查触发器和条件的逻辑一致性
        if (rule.rule.trigger.type === 'file_pattern' && !rule.rule.trigger.file_types) {
            warnings.push('文件模式触发器建议指定文件类型');
        }
        // 4. 检查建议的完整性
        rule.rule.suggestions.forEach((suggestion, index) => {
            if (!suggestion.code && !suggestion.command && !suggestion.files) {
                warnings.push(`建议 ${index + 1} 缺少具体的实现内容`);
            }
        });
        // 5. 检查兼容性信息
        if (rule.compatibility.languages.length === 0) {
            warnings.push('规则未指定适用的编程语言');
        }
        // 6. 检查条件逻辑
        const hasNegatedConditions = rule.rule.conditions.some(cond => cond.negated);
        const hasNormalConditions = rule.rule.conditions.some(cond => !cond.negated);
        if (hasNegatedConditions && !hasNormalConditions) {
            warnings.push('规则条件全部为否定形式，可能难以触发');
        }
        // 7. 检查置信度合理性
        if (rule.confidence > 0.9 && rule.meta.version === '0.1.0') {
            warnings.push('新规则版本置信度过高，建议谨慎验证');
        }
        return { errors, warnings };
    }
    /**
     * 验证自定义规则
     */
    validateCustomRules(rule, customRules) {
        const errors = [];
        const warnings = [];
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
    validateCompatibility(rule) {
        const warnings = [];
        // 检查框架版本约束
        if (rule.compatibility.frameworks && rule.compatibility.frameworks.length > 0) {
            const hasVersionConstraints = rule.compatibility.frameworks.some(fw => rule.compatibility.min_version || rule.compatibility.max_version);
            if (!hasVersionConstraints) {
                warnings.push('框架兼容性信息缺少版本约束');
            }
        }
        // 检查工具兼容性
        if (rule.compatibility.tools && rule.compatibility.tools.length > 0) {
            const supportedTools = ['vscode', 'trae', 'webstorm', 'vim'];
            const unsupportedTools = rule.compatibility.tools.filter(tool => !supportedTools.includes(tool.toLowerCase()));
            if (unsupportedTools.length > 0) {
                warnings.push(`检测到不常见的工具兼容性声明: ${unsupportedTools.join(', ')}`);
            }
        }
        return warnings;
    }
    /**
     * 检查规则ID格式
     */
    isValidRuleId(id) {
        return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
    }
    /**
     * 检查版本号格式
     */
    isValidVersion(version) {
        return /^\d+\.\d+\.\d+$/.test(version);
    }
    /**
     * 创建预定义的验证规则集合
     */
    static createStandardValidator(options = {}) {
        const validator = new RuleValidator();
        // 添加标准自定义规则
        const standardRules = [
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
                    const hasCompleteSuggestions = rule.rule.suggestions.every(suggestion => suggestion.code || suggestion.command || suggestion.files);
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
        return new RuleValidator();
    }
    /**
     * 生成验证报告
     */
    generateReport(validationResults) {
        const totalRules = validationResults.length;
        const validRules = validationResults.filter(result => result.valid).length;
        const totalErrors = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
        const totalWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
        let report = `# RuleForge 验证报告\n\n`;
        report += `## 统计信息\n`;
        report += `- 总规则数: ${totalRules}\n`;
        report += `- 有效规则: ${validRules}\n`;
        report += `- 无效规则: ${totalRules - validRules}\n`;
        report += `- 总错误数: ${totalErrors}\n`;
        report += `- 总警告数: ${totalWarnings}\n\n`;
        validationResults.forEach((result, index) => {
            report += `## 规则 ${index + 1} - ${result.valid ? '✅ 通过' : '❌ 失败'}\n`;
            if (result.errors.length > 0) {
                report += `### 错误信息\n`;
                result.errors.forEach(error => {
                    report += `- ${error}\n`;
                });
                report += `\n`;
            }
            if (result.warnings.length > 0) {
                report += `### 警告信息\n`;
                result.warnings.forEach(warning => {
                    report += `- ⚠️ ${warning}\n`;
                });
                report += `\n`;
            }
        });
        return report;
    }
}
exports.RuleValidator = RuleValidator;
//# sourceMappingURL=rule-validator.js.map