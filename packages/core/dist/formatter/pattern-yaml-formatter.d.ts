/**
 * RuleForge Pattern YAML 格式化器
 * 将模式对象格式化为符合 REP v0.1 标准的 YAML 规则文件
 */
import { Pattern } from '../extractor/pattern-cluster';
export interface PatternFormatOptions {
    indent?: number;
    lineWidth?: number;
    includeComments?: boolean;
    sanitizePaths?: boolean;
    projectName?: string;
    validateOutput?: boolean;
}
export interface PatternFormatResult {
    yaml: string;
    fileName: string;
    warnings: string[];
    validationResult?: {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
}
export declare class PatternYamlFormatter {
    private readonly defaultOptions;
    private readonly validator;
    constructor();
    /**
     * 将模式格式化为 YAML 字符串
     */
    toYAML(pattern: Pattern, options?: PatternFormatOptions): Promise<PatternFormatResult>;
    /**
     * 批量格式化多个模式
     */
    toYAMLBatch(patterns: Pattern[], options?: PatternFormatOptions): Promise<PatternFormatResult[]>;
    /**
     * 预处理模式数据
     */
    private preprocessPattern;
    /**
     * 路径脱敏处理
     */
    private sanitizePatternPaths;
    /**
     * 优化代码示例
     */
    private optimizeCodeExamples;
    /**
     * 截断代码示例
     */
    private truncateCodeExample;
    /**
     * 过滤敏感信息
     */
    private filterSensitiveInfo;
    /**
     * 将模式转换为规则对象
     */
    private patternToRule;
    /**
     * 生成包含示例的建议内容
     */
    private generateSuggestionWithExamples;
    /**
     * 生成兼容性信息
     */
    private generateCompatibility;
    /**
     * 生成 YAML 内容
     */
    private generateYaml;
    /**
     * 生成文件头注释
     */
    private generateHeaderComment;
    /**
     * 生成文件名
     */
    private generateFileName;
    /**
     * 验证 YAML 格式
     */
    validateYAML(yamlContent: string): {
        valid: boolean;
        error?: string;
    };
    /**
     * 美化 YAML 输出
     */
    prettify(yamlContent: string, options?: PatternFormatOptions): string;
    /**
     * 生成模式摘要报告
     */
    generatePatternReport(patterns: Pattern[], formatResults: PatternFormatResult[]): string;
}
export declare const patternToYAML: (pattern: Pattern, options?: PatternFormatOptions) => Promise<PatternFormatResult>;
export declare const patternsToYAMLBatch: (patterns: Pattern[], options?: PatternFormatOptions) => Promise<PatternFormatResult[]>;
export default PatternYamlFormatter;
//# sourceMappingURL=pattern-yaml-formatter.d.ts.map