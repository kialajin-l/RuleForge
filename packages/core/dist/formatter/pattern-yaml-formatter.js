"use strict";
/**
 * RuleForge Pattern YAML 格式化器
 * 将模式对象格式化为符合 REP v0.1 标准的 YAML 规则文件
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternsToYAMLBatch = exports.patternToYAML = exports.PatternYamlFormatter = void 0;
const yaml_1 = __importDefault(require("yaml"));
const rule_validator_1 = require("../validator/rule-validator");
class PatternYamlFormatter {
    defaultOptions = {
        indent: 2,
        lineWidth: 80,
        includeComments: true,
        sanitizePaths: true,
        projectName: '{project_name}',
        validateOutput: true
    };
    validator;
    constructor() {
        this.validator = new rule_validator_1.RuleValidator();
    }
    /**
     * 将模式格式化为 YAML 字符串
     */
    async toYAML(pattern, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const warnings = [];
        try {
            console.log(`📝 开始格式化模式: ${pattern.name}`);
            // 1. 预处理模式数据
            const processedPattern = this.preprocessPattern(pattern, mergedOptions, warnings);
            // 2. 转换为规则对象
            const ruleObject = this.patternToRule(processedPattern);
            // 3. 生成 YAML 内容
            const yamlContent = this.generateYaml(ruleObject, mergedOptions);
            // 4. 验证 YAML 输出
            let validationResult;
            if (mergedOptions.validateOutput) {
                validationResult = this.validator.validate(ruleObject);
                if (!validationResult.valid) {
                    warnings.push('YAML 验证失败，请检查规则格式');
                    warnings.push(...validationResult.errors);
                }
            }
            // 5. 生成文件名
            const fileName = this.generateFileName(pattern);
            console.log(`✅ 模式格式化完成: ${fileName}`);
            return {
                yaml: yamlContent,
                fileName,
                warnings,
                validationResult
            };
        }
        catch (error) {
            console.error('❌ 模式格式化失败:', error);
            throw new Error(`模式格式化失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 批量格式化多个模式
     */
    async toYAMLBatch(patterns, options = {}) {
        const results = [];
        for (let i = 0; i < patterns.length; i++) {
            console.log(`📝 格式化模式 ${i + 1}/${patterns.length}...`);
            try {
                const result = await this.toYAML(patterns[i], options);
                results.push(result);
            }
            catch (error) {
                console.error(`格式化模式 ${i + 1} 失败:`, error);
                // 继续处理其他模式
            }
        }
        return results;
    }
    /**
     * 预处理模式数据
     */
    preprocessPattern(pattern, options, warnings) {
        const processedPattern = { ...pattern };
        // 1. 路径脱敏处理
        if (options.sanitizePaths) {
            this.sanitizePatternPaths(processedPattern, options.projectName, warnings);
        }
        // 2. 代码示例优化
        this.optimizeCodeExamples(processedPattern, warnings);
        // 3. 敏感信息过滤
        this.filterSensitiveInfo(processedPattern, warnings);
        return processedPattern;
    }
    /**
     * 路径脱敏处理
     */
    sanitizePatternPaths(pattern, projectName, warnings) {
        // 处理触发器中的文件路径
        if (pattern.trigger.file_pattern) {
            const originalPattern = pattern.trigger.file_pattern;
            const sanitizedPattern = originalPattern.replace(/[\w-]+\//g, `${projectName}/`);
            if (originalPattern !== sanitizedPattern) {
                pattern.trigger.file_pattern = sanitizedPattern;
                warnings.push('文件路径已脱敏处理');
            }
        }
        // 处理示例中的文件路径
        pattern.examples.forEach((example, index) => {
            if (example.context && example.context.includes('/')) {
                example.context = example.context.replace(/[\w-]+\//g, `${projectName}/`);
            }
        });
    }
    /**
     * 优化代码示例
     */
    optimizeCodeExamples(pattern, warnings) {
        const maxLines = 15;
        pattern.examples.forEach((example, index) => {
            // 限制 before 示例长度
            if (example.before) {
                const beforeLines = example.before.split('\n');
                if (beforeLines.length > maxLines) {
                    example.before = this.truncateCodeExample(beforeLines, maxLines);
                    warnings.push(`示例 ${index + 1} 的 before 代码已截断`);
                }
            }
            // 限制 after 示例长度
            if (example.after) {
                const afterLines = example.after.split('\n');
                if (afterLines.length > maxLines) {
                    example.after = this.truncateCodeExample(afterLines, maxLines);
                    warnings.push(`示例 ${index + 1} 的 after 代码已截断`);
                }
            }
        });
    }
    /**
     * 截断代码示例
     */
    truncateCodeExample(lines, maxLines) {
        if (lines.length <= maxLines)
            return lines.join('\n');
        // 保留关键部分：前几行和后几行
        const importantLines = [
            ...lines.slice(0, 3),
            '// ... (代码已截断，保留关键逻辑) ...',
            ...lines.slice(-3)
        ];
        return importantLines.join('\n');
    }
    /**
     * 过滤敏感信息
     */
    filterSensitiveInfo(pattern, warnings) {
        // 过滤 API Keys 和密码
        const sensitivePatterns = [
            /api[_-]?key/i,
            /password/i,
            /secret/i,
            /token/i,
            /[a-f0-9]{32}/i, // MD5 hash
            /[a-f0-9]{64}/i // SHA256 hash
        ];
        let foundSensitiveInfo = false;
        // 检查条件描述
        if (pattern.condition) {
            sensitivePatterns.forEach(patternRegex => {
                if (patternRegex.test(pattern.condition)) {
                    pattern.condition = pattern.condition.replace(patternRegex, '***');
                    foundSensitiveInfo = true;
                }
            });
        }
        // 检查建议描述
        if (pattern.suggestion) {
            sensitivePatterns.forEach(patternRegex => {
                if (patternRegex.test(pattern.suggestion)) {
                    pattern.suggestion = pattern.suggestion.replace(patternRegex, '***');
                    foundSensitiveInfo = true;
                }
            });
        }
        // 检查代码示例
        pattern.examples.forEach(example => {
            ['before', 'after'].forEach(key => {
                const code = example[key];
                if (typeof code === 'string') {
                    sensitivePatterns.forEach(patternRegex => {
                        if (patternRegex.test(code)) {
                            example[key] = code.replace(patternRegex, '***');
                            foundSensitiveInfo = true;
                        }
                    });
                }
            });
        });
        if (foundSensitiveInfo) {
            warnings.push('检测到敏感信息，已进行脱敏处理');
        }
    }
    /**
     * 将模式转换为规则对象
     */
    patternToRule(pattern) {
        const now = new Date().toISOString();
        return {
            meta: {
                id: pattern.id,
                name: pattern.name,
                version: '0.1.0',
                description: pattern.description,
                authors: ['auto-generated by RuleForge'],
                license: 'MIT',
                created: String(now),
                updated: String(now)
            },
            rule: {
                trigger: {
                    keywords: pattern.trigger.keywords,
                    file_pattern: pattern.trigger.file_pattern,
                    language: pattern.trigger.language || 'typescript'
                },
                condition: pattern.condition,
                suggestion: this.generateSuggestionWithExamples(pattern)
            },
            compatibility: this.generateCompatibility(pattern),
            confidence: pattern.confidence
        };
    }
    /**
     * 生成包含示例的建议内容
     */
    generateSuggestionWithExamples(pattern) {
        let suggestion = pattern.suggestion;
        if (pattern.examples.length > 0) {
            suggestion += '\n\n推荐做法：\n';
            pattern.examples.forEach((example, index) => {
                suggestion += `\n示例 ${index + 1}:\n`;
                if (example.before && example.after) {
                    suggestion += '\n```' + (pattern.trigger.language || 'typescript') + '\n';
                    suggestion += '// 改进前：\n';
                    suggestion += example.before + '\n\n';
                    suggestion += '// 改进后：\n';
                    suggestion += example.after + '\n';
                    suggestion += '```\n';
                }
                if (example.context) {
                    suggestion += `上下文: ${example.context}\n`;
                }
            });
        }
        return suggestion;
    }
    /**
     * 生成兼容性信息
     */
    generateCompatibility(pattern) {
        const compatibility = {
            languages: [pattern.trigger.language || 'typescript'],
            rep_version: '^1.0'
        };
        // 根据语言添加框架信息
        const language = pattern.trigger.language || 'typescript';
        if (language === 'vue') {
            compatibility.frameworks = { vue: '>=3.4' };
        }
        else if (language === 'typescript') {
            compatibility.languages = { typescript: '>=5.0' };
        }
        return compatibility;
    }
    /**
     * 生成 YAML 内容
     */
    generateYaml(ruleObject, options) {
        // 创建深拷贝以避免修改原始对象
        const processedObject = JSON.parse(JSON.stringify(ruleObject));
        const yamlString = yaml_1.default.stringify(processedObject, {
            indent: options.indent,
            lineWidth: options.lineWidth
        });
        // 修复日期字段：给 ISO 日期字符串加引号，防止 YAML 解析器自动转换为 Date
        // 匹配格式: created: 2026-04-22T16:08:02.927Z 或 updated: 2026-04-22T16:08:02.927Z
        // 注意：行首可能有缩进
        const dateRegex = /^(\s*)(created|updated): (\d{4}-\d{2}-\d{2}T[\d:.]+Z)$/gm;
        const hasDateMatch = dateRegex.test(yamlString);
        // 重置正则表达式的 lastIndex
        dateRegex.lastIndex = 0;
        const fixedYaml = yamlString.replace(dateRegex, '$1$2: "$3"');
        // 添加文件头注释
        let result = '';
        if (options.includeComments) {
            result += this.generateHeaderComment(ruleObject);
        }
        result += fixedYaml;
        return result;
    }
    /**
     * 生成文件头注释
     */
    generateHeaderComment(ruleObject) {
        return `# RuleForge Rule - ${ruleObject.meta.name}
# ID: ${ruleObject.meta.id}
# Version: ${ruleObject.meta.version}
# Description: ${ruleObject.meta.description}
# Authors: ${ruleObject.meta.authors.join(', ')}
# Created: ${ruleObject.meta.created}
# Updated: ${ruleObject.meta.updated}
# Confidence: ${Math.round(ruleObject.confidence * 100)}%
#
# This rule was automatically generated by RuleForge engine.
# REP Protocol Version: v0.1

`;
    }
    /**
     * 生成文件名
     */
    generateFileName(pattern) {
        const sanitizedId = pattern.id.replace(/[^a-z0-9-]/g, '-');
        return `${sanitizedId}.yaml`;
    }
    /**
     * 验证 YAML 格式
     */
    validateYAML(yamlContent) {
        try {
            // 解析 YAML 并验证基本结构
            const parsed = yaml_1.default.parse(yamlContent);
            if (!parsed) {
                return { valid: false, error: 'YAML 内容为空或无效' };
            }
            // 检查必要的字段
            const requiredFields = ['meta', 'rule'];
            for (const field of requiredFields) {
                if (!parsed[field]) {
                    return { valid: false, error: `缺少必要字段: ${field}` };
                }
            }
            // 检查 meta 字段
            const metaFields = ['id', 'name', 'version'];
            for (const field of metaFields) {
                if (!parsed.meta[field]) {
                    return { valid: false, error: `meta 缺少字段: ${field}` };
                }
            }
            // 检查 rule 字段
            const ruleFields = ['trigger', 'condition', 'suggestion'];
            for (const field of ruleFields) {
                if (!parsed.rule[field]) {
                    return { valid: false, error: `rule 缺少字段: ${field}` };
                }
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: `YAML 验证失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }
    /**
     * 美化 YAML 输出
     */
    prettify(yamlContent, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        try {
            const lines = yamlContent.split('\n');
            const prettifiedLines = [];
            let inCommentBlock = false;
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('#')) {
                    // 注释行处理
                    if (!inCommentBlock) {
                        inCommentBlock = true;
                        if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== '') {
                            prettifiedLines.push('');
                        }
                    }
                    prettifiedLines.push(line);
                }
                else if (trimmedLine === '') {
                    // 空行处理
                    if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== '') {
                        prettifiedLines.push('');
                    }
                    inCommentBlock = false;
                }
                else {
                    // 内容行处理
                    inCommentBlock = false;
                    prettifiedLines.push(line);
                }
            }
            // 移除末尾多余的空行
            while (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] === '') {
                prettifiedLines.pop();
            }
            return prettifiedLines.join('\n');
        }
        catch (error) {
            console.warn('YAML 美化失败，返回原内容:', error);
            return yamlContent;
        }
    }
    /**
     * 生成模式摘要报告
     */
    generatePatternReport(patterns, formatResults) {
        let report = `# RuleForge 模式生成报告\n\n`;
        report += `## 统计信息\n`;
        report += `- 总模式数: ${patterns.length}\n`;
        report += `- 成功生成: ${formatResults.length}\n`;
        report += `- 失败数: ${patterns.length - formatResults.length}\n\n`;
        report += `## 模式详情\n`;
        patterns.forEach((pattern, index) => {
            const formatResult = formatResults[index];
            report += `### ${pattern.name}\n`;
            report += `- ID: ${pattern.id}\n`;
            report += `- 置信度: ${Math.round(pattern.confidence * 100)}%\n`;
            report += `- 适用场景: ${pattern.applicableScenes}\n`;
            if (formatResult) {
                report += `- 文件: ${formatResult.fileName}\n`;
                if (formatResult.validationResult) {
                    const status = formatResult.validationResult.valid ? '✅ 通过' : '❌ 失败';
                    report += `- 验证: ${status}\n`;
                }
            }
            else {
                report += `- 状态: ❌ 生成失败\n`;
            }
            report += `\n`;
        });
        return report;
    }
}
exports.PatternYamlFormatter = PatternYamlFormatter;
// 导出便捷函数
const patternToYAML = async (pattern, options) => {
    const formatter = new PatternYamlFormatter();
    return formatter.toYAML(pattern, options);
};
exports.patternToYAML = patternToYAML;
const patternsToYAMLBatch = async (patterns, options) => {
    const formatter = new PatternYamlFormatter();
    return formatter.toYAMLBatch(patterns, options);
};
exports.patternsToYAMLBatch = patternsToYAMLBatch;
// 默认导出
exports.default = PatternYamlFormatter;
//# sourceMappingURL=pattern-yaml-formatter.js.map