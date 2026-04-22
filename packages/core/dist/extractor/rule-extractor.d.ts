/**
 * RuleForge 核心规则提取引擎
 * 从开发会话日志中提取可复用编码规则
 * 整合模式聚类和 YAML 格式化功能
 */
import { Pattern } from './pattern-cluster';
import { RuleYAML } from '../types/rule-schema';
export interface ExtractOptions {
    sessionId: string;
    logPath: string;
    minConfidence?: number;
    applicableScenes?: number;
    language?: string;
    sanitizePaths?: boolean;
    projectName?: string;
    validateOutput?: boolean;
    enableDebugLog?: boolean;
}
export interface ExtractionResult {
    rules: RuleYAML[];
    yamlFiles: Array<{
        fileName: string;
        yamlContent: string;
        pattern: Pattern;
    }>;
    statistics: {
        totalFiles: number;
        totalCommands: number;
        patternsFound: number;
        extractionTime: number;
    };
    warnings: string[];
    errors: string[];
}
export declare class RuleExtractor {
    private readonly logParser;
    private readonly patternClusterer;
    private readonly yamlFormatter;
    constructor();
    /**
     * 从开发会话日志中提取规则
     */
    extract(options: ExtractOptions): Promise<ExtractionResult>;
    /**
     * 解析会话日志
     */
    private parseSessionLog;
    /**
     * 模式聚类分析
     */
    private clusterPatterns;
    /**
     * 生成 YAML 规则文件
     */
    private generateYamlRules;
    /**
     * 将模式转换为 RuleYAML 对象
     */
    private patternsToRuleYAML;
    /**
     * 生成统计信息
     */
    private generateStatistics;
    /**
     * 创建空结果
     */
    private createEmptyResult;
    /**
     * 批量提取多个会话的规则
     */
    extractBatch(sessions: Array<{
        sessionId: string;
        logPath: string;
    }>, options?: Omit<ExtractOptions, 'sessionId' | 'logPath'>): Promise<{
        sessionId: string;
        result: ExtractionResult;
    }[]>;
    /**
     * 生成提取报告
     */
    generateExtractionReport(results: Array<{
        sessionId: string;
        result: ExtractionResult;
    }>): string;
    /**
     * 验证规则质量
     */
    validateRuleQuality(rule: RuleYAML): {
        valid: boolean;
        score: number;
        issues: string[];
    };
}
export declare const extractRules: (options: ExtractOptions) => Promise<ExtractionResult>;
export declare const extractRulesBatch: (sessions: Array<{
    sessionId: string;
    logPath: string;
}>, options?: Omit<ExtractOptions, "sessionId" | "logPath">) => Promise<{
    sessionId: string;
    result: ExtractionResult;
}[]>;
export default RuleExtractor;
//# sourceMappingURL=rule-extractor.d.ts.map