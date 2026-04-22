/**
 * RuleForge 规则验证器
 * 使用 Zod 验证规则是否符合 REP v0.1 协议标准
 */
import { RuleYAML } from '../types/rule-schema';
import { ValidationResult } from '../types/rule';
export interface ValidationOptions {
    strict?: boolean;
    allowPartial?: boolean;
    customRules?: CustomRule[];
}
export interface CustomRule {
    name: string;
    validate: (rule: RuleYAML) => {
        valid: boolean;
        message: string;
    };
}
export declare class RuleValidator {
    private readonly defaultOptions;
    /**
     * 验证规则是否符合 REP v0.1 协议
     */
    validate(rule: unknown, options?: ValidationOptions): ValidationResult;
    /**
     * 批量验证多个规则
     */
    validateBatch(rules: unknown[], options?: ValidationOptions): ValidationResult[];
    /**
     * 格式化 Zod 错误信息
     */
    private formatZodErrors;
    /**
     * 语义验证
     */
    private validateSemantics;
    /**
     * 验证自定义规则
     */
    private validateCustomRules;
    /**
     * 验证兼容性信息
     */
    private validateCompatibility;
    /**
     * 检查规则ID格式
     */
    private isValidRuleId;
    /**
     * 检查版本号格式
     */
    private isValidVersion;
    /**
     * 创建预定义的验证规则集合
     */
    static createStandardValidator(options?: ValidationOptions): RuleValidator;
    /**
     * 生成验证报告
     */
    generateReport(validationResults: ValidationResult[]): string;
}
//# sourceMappingURL=rule-validator.d.ts.map