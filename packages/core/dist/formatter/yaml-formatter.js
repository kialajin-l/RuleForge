"use strict";
/**
 * RuleForge YAML 格式化器
 * 将规则对象格式化为符合 REP v0.1 标准的 YAML 文件
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YamlFormatter = void 0;
const yaml_1 = __importDefault(require("yaml"));
class YamlFormatter {
    defaultOptions = {
        indent: 2,
        lineWidth: 80,
        includeComments: true,
        sanitizePaths: true,
        projectName: '{project_name}'
    };
    /**
     * 将规则格式化为 YAML 字符串
     */
    format(rule, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const warnings = [];
        try {
            console.log('📝 开始格式化规则...');
            // 1. 预处理规则数据
            const processedRule = this.preprocessRule(rule, mergedOptions, warnings);
            // 2. 生成 YAML 内容
            const yamlContent = this.generateYaml(processedRule, mergedOptions);
            // 3. 生成文件名
            const fileName = this.generateFileName(rule);
            console.log('✅ 规则格式化完成');
            return {
                yaml: yamlContent,
                fileName,
                warnings
            };
        }
        catch (error) {
            console.error('❌ 规则格式化失败:', error);
            throw new Error(`规则格式化失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 批量格式化多个规则
     */
    formatBatch(rules, options = {}) {
        return rules.map((rule, index) => {
            console.log(`📝 格式化规则 ${index + 1}/${rules.length}...`);
            return this.format(rule, options);
        });
    }
    /**
     * 预处理规则数据
     */
    preprocessRule(rule, options, warnings) {
        const processedRule = { ...rule };
        // 1. 路径脱敏处理
        if (options.sanitizePaths) {
            this.sanitizePaths(processedRule, options.projectName, warnings);
        }
        // 2. 代码示例长度限制
        this.limitCodeExamples(processedRule, warnings);
        // 3. 时间戳格式化
        this.formatTimestamps(processedRule);
        return processedRule;
    }
    /**
     * 路径脱敏处理
     */
    sanitizePaths(rule, projectName, warnings) {
        // 处理文件路径中的项目名称
        if (rule.rule.trigger.type === 'file_pattern') {
            const originalPattern = rule.rule.trigger.pattern;
            const sanitizedPattern = originalPattern.replace(/[\w-]+\//g, `${projectName}/`);
            if (originalPattern !== sanitizedPattern) {
                rule.rule.trigger.pattern = sanitizedPattern;
                warnings.push('文件路径已脱敏处理');
            }
        }
        // 处理建议中的文件路径
        rule.rule.suggestions.forEach((suggestion, index) => {
            if (suggestion.files) {
                suggestion.files = suggestion.files.map(file => file.replace(/[\w-]+\//g, `${projectName}/`));
            }
        });
    }
    /**
     * 限制代码示例长度
     */
    limitCodeExamples(rule, warnings) {
        const maxLines = 15;
        rule.rule.suggestions.forEach((suggestion, index) => {
            if (suggestion.code) {
                const lines = suggestion.code.split('\n');
                if (lines.length > maxLines) {
                    // 保留关键部分，截断中间内容
                    const importantLines = lines.filter(line => line.includes('export') || line.includes('function') ||
                        line.includes('class') || line.includes('return') ||
                        line.trim().startsWith('//') || line.includes('TODO'));
                    if (importantLines.length <= maxLines) {
                        suggestion.code = importantLines.join('\n');
                    }
                    else {
                        // 如果关键行还是太多，只保留前几行和后几行
                        suggestion.code = [
                            ...lines.slice(0, 5),
                            '// ... (代码已截断，保留关键逻辑) ...',
                            ...lines.slice(-5)
                        ].join('\n');
                    }
                    warnings.push(`建议 ${index + 1} 的代码示例已截断，保留关键逻辑`);
                }
            }
        });
    }
    /**
     * 格式化时间戳
     */
    formatTimestamps(rule) {
        const now = new Date().toISOString();
        if (!rule.meta.created) {
            rule.meta.created = now;
        }
        rule.meta.updated = now;
    }
    /**
     * 生成 YAML 内容
     */
    generateYaml(rule, options) {
        const yamlObject = this.createYamlObject(rule, options.includeComments);
        const yamlString = yaml_1.default.stringify(yamlObject, {
            indent: options.indent,
            lineWidth: options.lineWidth
        });
        // 添加文件头注释
        let result = '';
        if (options.includeComments) {
            result += this.generateHeaderComment(rule);
        }
        result += yamlString;
        return result;
    }
    /**
     * 创建 YAML 对象结构
     */
    createYamlObject(rule, includeComments = true) {
        const yamlObj = {};
        // Meta 部分
        yamlObj.meta = {
            id: rule.meta.id,
            name: rule.meta.name,
            version: rule.meta.version,
            description: rule.meta.description,
            authors: rule.meta.authors,
            license: rule.meta.license,
            created: rule.meta.created,
            updated: rule.meta.updated
        };
        // Rule 部分
        yamlObj.rule = {
            trigger: {
                type: rule.rule.trigger.type,
                pattern: rule.rule.trigger.pattern
            }
        };
        if (rule.rule.trigger.file_types) {
            yamlObj.rule.trigger.file_types = rule.rule.trigger.file_types;
        }
        if (rule.rule.trigger.context) {
            yamlObj.rule.trigger.context = rule.rule.trigger.context;
        }
        yamlObj.rule.conditions = rule.rule.conditions.map(condition => ({
            type: condition.type,
            condition: condition.condition,
            ...(condition.negated !== undefined && { negated: condition.negated })
        }));
        yamlObj.rule.suggestions = rule.rule.suggestions.map(suggestion => {
            const suggestionObj = {
                type: suggestion.type,
                description: suggestion.description
            };
            if (suggestion.code) {
                suggestionObj.code = suggestion.code;
            }
            if (suggestion.command) {
                suggestionObj.command = suggestion.command;
            }
            if (suggestion.files) {
                suggestionObj.files = suggestion.files;
            }
            return suggestionObj;
        });
        // Compatibility 部分
        yamlObj.compatibility = {
            languages: rule.compatibility.languages
        };
        if (rule.compatibility.frameworks && rule.compatibility.frameworks.length > 0) {
            yamlObj.compatibility.frameworks = rule.compatibility.frameworks;
        }
        if (rule.compatibility.tools && rule.compatibility.tools.length > 0) {
            yamlObj.compatibility.tools = rule.compatibility.tools;
        }
        if (rule.compatibility.min_version) {
            yamlObj.compatibility.min_version = rule.compatibility.min_version;
        }
        if (rule.compatibility.max_version) {
            yamlObj.compatibility.max_version = rule.compatibility.max_version;
        }
        // Confidence 部分
        yamlObj.confidence = Math.round(rule.confidence * 100) / 100; // 保留两位小数
        return yamlObj;
    }
    /**
     * 生成文件头注释
     */
    generateHeaderComment(rule) {
        return `# RuleForge Rule - ${rule.meta.name}
# ID: ${rule.meta.id}
# Version: ${rule.meta.version}
# Description: ${rule.meta.description}
# Authors: ${rule.meta.authors.join(', ')}
# Created: ${rule.meta.created}
# Updated: ${rule.meta.updated}
# Confidence: ${Math.round(rule.confidence * 100)}%
#
# This rule was automatically generated by RuleForge engine.
# REP Protocol Version: v0.1

`;
    }
    /**
     * 生成文件名
     */
    generateFileName(rule) {
        const sanitizedId = rule.meta.id.replace(/[^a-z0-9-]/g, '-');
        return `${sanitizedId}-v${rule.meta.version}.yaml`;
    }
    /**
     * 验证 YAML 格式
     */
    validateYaml(yamlContent) {
        try {
            // 简单的 YAML 语法验证
            if (!yamlContent.trim()) {
                return { valid: false, error: 'YAML 内容为空' };
            }
            if (!yamlContent.includes('meta:') || !yamlContent.includes('rule:')) {
                return { valid: false, error: 'YAML 缺少必要的根级字段 (meta, rule)' };
            }
            // 检查基本的 YAML 结构
            const lines = yamlContent.split('\n');
            let indentLevel = 0;
            const indentStack = [];
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#'))
                    continue;
                const currentIndent = line.search(/\S/);
                if (currentIndent > -1) {
                    if (indentStack.length === 0) {
                        indentStack.push(currentIndent);
                    }
                    else if (currentIndent > indentStack[indentStack.length - 1]) {
                        indentStack.push(currentIndent);
                    }
                    else if (currentIndent < indentStack[indentStack.length - 1]) {
                        while (indentStack.length > 0 && currentIndent < indentStack[indentStack.length - 1]) {
                            indentStack.pop();
                        }
                        if (indentStack.length === 0 || currentIndent !== indentStack[indentStack.length - 1]) {
                            return { valid: false, error: 'YAML 缩进不一致' };
                        }
                    }
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
                    if (!inCommentBlock && trimmedLine.startsWith('# ---')) {
                        inCommentBlock = true;
                        prettifiedLines.push('');
                    }
                    prettifiedLines.push(line);
                }
                else if (trimmedLine === '') {
                    // 空行处理
                    if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== '') {
                        prettifiedLines.push('');
                    }
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
}
exports.YamlFormatter = YamlFormatter;
//# sourceMappingURL=yaml-formatter.js.map