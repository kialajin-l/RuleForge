"use strict";
/**
 * RuleForge 核心规则提取引擎
 * 从开发会话日志中提取可复用编码规则
 * 整合模式聚类和 YAML 格式化功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRulesBatch = exports.extractRules = exports.RuleExtractor = void 0;
const log_parser_1 = require("./log-parser");
const pattern_cluster_1 = require("./pattern-cluster");
const pattern_yaml_formatter_1 = require("../formatter/pattern-yaml-formatter");
class RuleExtractor {
    logParser;
    patternClusterer;
    yamlFormatter;
    constructor() {
        this.logParser = new log_parser_1.SessionLogParser();
        this.patternClusterer = new pattern_cluster_1.PatternClusterer();
        this.yamlFormatter = new pattern_yaml_formatter_1.PatternYamlFormatter();
    }
    /**
     * 从开发会话日志中提取规则
     */
    async extract(options) {
        const startTime = Date.now();
        const warnings = [];
        const errors = [];
        try {
            console.log(`🚀 开始 RuleForge 规则提取流程...`);
            console.log(`   会话ID: ${options.sessionId}`);
            console.log(`   日志文件: ${options.logPath}\n`);
            // 1. 解析会话日志
            console.log('🔍 步骤 1: 解析会话日志...');
            const parseResult = await this.parseSessionLog(options.logPath, options);
            if (parseResult.events.length === 0) {
                warnings.push('会话日志为空，无法提取规则');
                return this.createEmptyResult(startTime, warnings);
            }
            console.log(`✅ 解析完成: ${parseResult.events.length} 个事件`);
            // 2. 模式聚类分析
            console.log('\n🧩 步骤 2: 模式聚类分析...');
            const clusterResult = await this.clusterPatterns(parseResult.events, options);
            if (clusterResult.patterns.length === 0) {
                warnings.push('未发现可提取的模式');
                return this.createEmptyResult(startTime, warnings);
            }
            console.log(`✅ 聚类完成: ${clusterResult.patterns.length} 个模式`);
            // 3. 生成 YAML 规则文件
            console.log('\n📄 步骤 3: 生成 YAML 规则文件...');
            const formatResults = await this.generateYamlRules(clusterResult.patterns, options);
            console.log(`✅ 格式化完成: ${formatResults.length} 个规则文件`);
            // 4. 转换为 RuleYAML 对象
            const rules = this.patternsToRuleYAML(clusterResult.patterns, options);
            // 5. 生成统计信息
            const statistics = this.generateStatistics(parseResult.events.length, clusterResult.patterns.length, rules.length, clusterResult.statistics, Date.now() - startTime);
            console.log(`\n🎉 规则提取完成!`);
            console.log(`   总文件数: ${statistics.totalFiles}`);
            console.log(`   总命令数: ${statistics.totalCommands}`);
            console.log(`   发现模式数: ${statistics.patternsFound}`);
            console.log(`   处理时间: ${statistics.extractionTime}ms`);
            return {
                rules,
                yamlFiles: formatResults,
                statistics,
                warnings: [...warnings, ...clusterResult.warnings],
                errors
            };
        }
        catch (error) {
            console.error('❌ 规则提取失败:', error);
            errors.push(`规则提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
            return {
                rules: [],
                yamlFiles: [],
                statistics: this.generateStatistics(0, 0, 0, { totalEvents: 0, totalPatterns: 0, highConfidencePatterns: 0, averageConfidence: 0, processingTime: Date.now() - startTime }, Date.now() - startTime),
                warnings,
                errors
            };
        }
    }
    /**
     * 解析会话日志
     */
    async parseSessionLog(logPath, options) {
        return this.logParser.parseSessionLog(logPath, {
            sessionId: options.sessionId,
            onProgress: (progress) => {
                if (options.enableDebugLog) {
                    console.log(`   解析进度: ${progress.eventsParsed} 事件`);
                }
            }
        });
    }
    /**
     * 模式聚类分析
     */
    async clusterPatterns(events, options) {
        return this.patternClusterer.cluster(events, {
            minOccurrences: options.applicableScenes ?? 2,
            minConfidence: options.minConfidence ?? 0.7,
            languageFocus: options.language ? [options.language] : undefined,
            enableDebugLog: options.enableDebugLog ?? false
        });
    }
    /**
     * 生成 YAML 规则文件
     */
    async generateYamlRules(patterns, options) {
        const formatResults = await this.yamlFormatter.toYAMLBatch(patterns, {
            sanitizePaths: options.sanitizePaths ?? true,
            projectName: options.projectName ?? '{project_name}',
            validateOutput: options.validateOutput ?? true
        });
        return formatResults.map((result, index) => ({
            fileName: result.fileName,
            yamlContent: result.yaml,
            pattern: patterns[index],
            warnings: result.warnings,
            validationResult: result.validationResult
        }));
    }
    /**
     * 将模式转换为 RuleYAML 对象
     */
    patternsToRuleYAML(patterns, options) {
        const timestamp = new Date().toISOString();
        return patterns.map(pattern => ({
            meta: {
                id: pattern.id,
                name: pattern.name,
                version: '0.1.0',
                description: pattern.description,
                authors: [`auto-generated-from-${options.sessionId}`],
                license: 'MIT',
                created: timestamp,
                updated: timestamp
            },
            rule: {
                trigger: {
                    type: 'file_pattern',
                    pattern: pattern.trigger.file_pattern,
                    file_types: [pattern.trigger.language || 'typescript'],
                    context: pattern.condition
                },
                conditions: [
                    {
                        type: 'code_contains',
                        condition: pattern.condition,
                        negated: false
                    }
                ],
                suggestions: [
                    {
                        type: 'code_fix',
                        description: pattern.suggestion,
                        code: pattern.examples.length > 0 ? pattern.examples[0].after : pattern.suggestion
                    }
                ]
            },
            compatibility: {
                languages: [pattern.trigger.language || 'typescript'],
                frameworks: pattern.trigger.language === 'vue' ? ['vue'] : [],
                tools: ['vscode', 'trae'],
                min_version: '1.0'
            },
            confidence: pattern.confidence
        }));
    }
    /**
     * 生成统计信息
     */
    generateStatistics(totalEvents, totalPatterns, totalRules, clusterStats, extractionTime) {
        // 估算文件数和命令数（基于事件分析）
        const totalFiles = Math.floor(totalEvents / 3); // 估算每个文件平均3个事件
        const totalCommands = Math.floor(totalEvents / 5); // 估算每个命令平均5个事件
        return {
            totalFiles,
            totalCommands,
            patternsFound: totalPatterns,
            extractionTime
        };
    }
    /**
     * 创建空结果
     */
    createEmptyResult(startTime, warnings) {
        return {
            rules: [],
            yamlFiles: [],
            statistics: {
                totalFiles: 0,
                totalCommands: 0,
                patternsFound: 0,
                extractionTime: Date.now() - startTime
            },
            warnings,
            errors: []
        };
    }
    /**
     * 批量提取多个会话的规则
     */
    async extractBatch(sessions, options = {}) {
        const results = [];
        console.log(`🚀 开始批量提取 ${sessions.length} 个会话的规则...\n`);
        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            console.log(`📝 处理会话 ${i + 1}/${sessions.length}: ${session.sessionId}`);
            try {
                const result = await this.extract({
                    ...options,
                    sessionId: session.sessionId,
                    logPath: session.logPath
                });
                results.push({ sessionId: session.sessionId, result });
                console.log(`   ✅ 完成: ${result.rules.length} 个规则`);
            }
            catch (error) {
                console.error(`   ❌ 失败: ${error instanceof Error ? error.message : '未知错误'}`);
                results.push({
                    sessionId: session.sessionId,
                    result: {
                        rules: [],
                        yamlFiles: [],
                        statistics: {
                            totalFiles: 0,
                            totalCommands: 0,
                            patternsFound: 0,
                            extractionTime: 0
                        },
                        warnings: [],
                        errors: [`提取失败: ${error instanceof Error ? error.message : '未知错误'}`]
                    }
                });
            }
        }
        console.log(`\n🎉 批量提取完成!`);
        console.log(`   成功会话: ${results.filter(r => r.result.rules.length > 0).length}`);
        console.log(`   失败会话: ${results.filter(r => r.result.errors.length > 0).length}`);
        return results;
    }
    /**
     * 生成提取报告
     */
    generateExtractionReport(results) {
        let report = `# RuleForge 规则提取报告\n\n`;
        report += `## 统计摘要\n`;
        const totalSessions = results.length;
        const successfulSessions = results.filter(r => r.result.rules.length > 0).length;
        const totalRules = results.reduce((sum, r) => sum + r.result.rules.length, 0);
        const totalPatterns = results.reduce((sum, r) => sum + r.result.statistics.patternsFound, 0);
        report += `- 总会话数: ${totalSessions}\n`;
        report += `- 成功会话: ${successfulSessions}\n`;
        report += `- 总规则数: ${totalRules}\n`;
        report += `- 总模式数: ${totalPatterns}\n\n`;
        report += `## 会话详情\n`;
        results.forEach(({ sessionId, result }) => {
            report += `### ${sessionId}\n`;
            report += `- 状态: ${result.rules.length > 0 ? '✅ 成功' : '❌ 失败'}\n`;
            report += `- 文件数: ${result.statistics.totalFiles}\n`;
            report += `- 命令数: ${result.statistics.totalCommands}\n`;
            report += `- 发现模式数: ${result.statistics.patternsFound}\n`;
            if (result.warnings.length > 0) {
                report += `- 警告: ${result.warnings.join(', ')}\n`;
            }
            if (result.errors.length > 0) {
                report += `- 错误: ${result.errors.join(', ')}\n`;
            }
            report += `\n`;
        });
        return report;
    }
    /**
     * 验证规则质量
     */
    validateRuleQuality(rule) {
        const issues = [];
        let score = 100;
        // 检查置信度
        if (rule.confidence < 0.7) {
            issues.push('置信度过低 (< 0.7)');
            score -= 20;
        }
        // 检查描述完整性
        if (!rule.meta.description || rule.meta.description.length < 20) {
            issues.push('描述过于简单');
            score -= 10;
        }
        // 检查条件明确性
        if (!rule.rule.conditions || rule.rule.conditions.length === 0) {
            issues.push('缺少明确的触发条件');
            score -= 15;
        }
        // 检查建议实用性
        if (!rule.rule.suggestions || rule.rule.suggestions.length === 0) {
            issues.push('缺少实用的改进建议');
            score -= 15;
        }
        return {
            valid: score >= 70,
            score: Math.max(0, score),
            issues
        };
    }
}
exports.RuleExtractor = RuleExtractor;
// 导出便捷函数
const extractRules = async (options) => {
    const extractor = new RuleExtractor();
    return extractor.extract(options);
};
exports.extractRules = extractRules;
const extractRulesBatch = async (sessions, options) => {
    const extractor = new RuleExtractor();
    return extractor.extractBatch(sessions, options);
};
exports.extractRulesBatch = extractRulesBatch;
// 默认导出
exports.default = RuleExtractor;
//# sourceMappingURL=rule-extractor.js.map