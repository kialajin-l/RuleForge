/**
 * RuleForge YAML 格式化器
 * 将规则对象格式化为符合 REP v0.1 标准的 YAML 文件
 */
import { RuleYAML } from '../types/rule-schema';
export interface FormatOptions {
    indent?: number;
    lineWidth?: number;
    includeComments?: boolean;
    sanitizePaths?: boolean;
    projectName?: string;
}
export interface FormatResult {
    yaml: string;
    fileName: string;
    warnings: string[];
}
export declare class YamlFormatter {
    private readonly defaultOptions;
    /**
     * 将规则格式化为 YAML 字符串
     */
    format(rule: RuleYAML, options?: FormatOptions): FormatResult;
    /**
     * 批量格式化多个规则
     */
    formatBatch(rules: RuleYAML[], options?: FormatOptions): FormatResult[];
    /**
     * 预处理规则数据
     */
    private preprocessRule;
    /**
     * 路径脱敏处理
     */
    private sanitizePaths;
    /**
     * 限制代码示例长度
     */
    private limitCodeExamples;
    /**
     * 格式化时间戳
     */
    private formatTimestamps;
    /**
     * 生成 YAML 内容
     */
    private generateYaml;
    /**
     * 创建 YAML 对象结构
     */
    private createYamlObject;
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
    validateYaml(yamlContent: string): {
        valid: boolean;
        error?: string;
    };
    /**
     * 美化 YAML 输出
     */
    prettify(yamlContent: string, options?: FormatOptions): string;
}
//# sourceMappingURL=yaml-formatter.d.ts.map