/**
 * RuleForge 模式聚类引擎
 * 从会话事件中识别可复用的编码模式
 */
import { SessionEvent } from './log-parser';
export interface Pattern {
    id: string;
    name: string;
    description: string;
    trigger: {
        keywords: string[];
        file_pattern: string;
        language?: string;
    };
    condition: string;
    suggestion: string;
    confidence: number;
    applicableScenes: number;
    examples: {
        before: string;
        after: string;
        context?: string;
    }[];
    metadata: {
        occurrenceCount: number;
        successRate: number;
        applicabilityScore: number;
        fileTypes: string[];
        firstSeen: Date;
        lastSeen: Date;
    };
}
export interface PatternClusterOptions {
    minOccurrences?: number;
    minConfidence?: number;
    minApplicableScenes?: number;
    languageFocus?: string[];
    excludePatterns?: string[];
    enableDebugLog?: boolean;
}
export interface PatternClusterResult {
    patterns: Pattern[];
    statistics: {
        totalEvents: number;
        totalPatterns: number;
        highConfidencePatterns: number;
        averageConfidence: number;
        processingTime: number;
    };
    warnings: string[];
}
export interface CodeChange {
    filePath: string;
    before: string;
    after: string;
    changeType: 'add' | 'modify' | 'delete';
    language: string;
}
export declare class PatternClusterer {
    private readonly defaultOptions;
    private readonly keywordPatterns;
    /**
     * 从会话事件中聚类识别模式
     */
    cluster(events: SessionEvent[], options?: PatternClusterOptions): Promise<PatternClusterResult>;
    /**
     * 预处理事件数据
     */
    private preprocessEvents;
    /**
     * 识别高频错误修复模式
     */
    private identifyErrorFixPatterns;
    /**
     * 识别重复代码结构模式
     */
    private identifyCodeStructurePatterns;
    /**
     * 识别最佳实践应用模式
     */
    private identifyBestPracticePatterns;
    /**
     * 查找错误修复序列
     */
    private findErrorFixSequences;
    /**
     * 分组错误修复序列
     */
    private groupErrorFixSequences;
    /**
     * 创建错误修复模式
     */
    private createErrorFixPattern;
    /**
     * 按代码结构分组文件
     */
    private groupFilesByStructure;
    /**
     * 分析代码结构
     */
    private analyzeCodeStructure;
    /**
     * 创建代码结构模式
     */
    private createCodeStructurePattern;
    /**
     * 识别测试最佳实践
     */
    private identifyTestBestPractices;
    /**
     * 创建测试模式
     */
    private createTestPattern;
    /**
     * 识别错误处理实践
     */
    private identifyErrorHandlingPractices;
    /**
     * 识别代码组织实践
     */
    private identifyCodeOrganizationPractices;
    /**
     * 过滤模式
     */
    private filterPatterns;
    /**
     * 计算置信度
     */
    private calculateConfidence;
    /**
     * 计算适用性分数
     */
    private calculateApplicabilityScore;
    /**
     * 生成模式ID
     */
    private generatePatternId;
    /**
     * 获取文件类型
     */
    private getFileType;
    /**
     * 分类错误类型
     */
    private classifyError;
    /**
     * 提取关键词
     */
    private extractKeywordsFromSequences;
    /**
     * 判断是否为常见词
     */
    private isCommonWord;
    /**
     * 生成错误修复描述
     */
    private generateErrorFixDescription;
    /**
     * 生成错误修复建议
     */
    private generateErrorFixSuggestion;
    /**
     * 生成错误修复示例
     */
    private generateErrorFixExamples;
    /**
     * 提取结构关键词
     */
    private extractStructureKeywords;
    /**
     * 生成结构建议
     */
    private generateStructureSuggestion;
    /**
     * 生成结构示例
     */
    private generateStructureExamples;
    /**
     * 首字母大写
     */
    private capitalize;
    /**
     * 生成统计信息
     */
    private generateStatistics;
    /**
     * 输出模式摘要
     */
    private logPatternSummary;
    /**
     * 创建空结果
     */
    private createEmptyResult;
}
export declare const clusterPatterns: (events: SessionEvent[], options?: PatternClusterOptions) => Promise<PatternClusterResult>;
export default PatternClusterer;
//# sourceMappingURL=pattern-cluster.d.ts.map