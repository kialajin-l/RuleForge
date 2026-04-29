/**
 * RuleForge YAML 格式化器
 * 将规则对象格式化为符合 REP v0.2 标准的 YAML 文件（向后兼容 v0.1）
 */

import YAML from 'yaml';
import { RuleYAML, isV02 } from '../types/rule-schema';

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

export class YamlFormatter {
  private readonly defaultOptions: FormatOptions = {
    indent: 2,
    lineWidth: 80,
    includeComments: true,
    sanitizePaths: true,
    projectName: '{project_name}'
  };

  format(rule: RuleYAML, options: FormatOptions = {}): FormatResult {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];

    try {
      console.log('开始格式化规则...');
      const processedRule = this.preprocessRule(rule, mergedOptions, warnings);
      const yamlContent = this.generateYaml(processedRule, mergedOptions);
      const fileName = this.generateFileName(rule);
      console.log('规则格式化完成');
      return { yaml: yamlContent, fileName, warnings };
    } catch (error) {
      console.error('规则格式化失败:', error);
      throw new Error('规则格式化失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  formatBatch(rules: RuleYAML[], options: FormatOptions = {}): FormatResult[] {
    return rules.map((rule, index) => {
      console.log('格式化规则 ' + (index + 1) + '/' + rules.length + '...');
      return this.format(rule, options);
    });
  }

  private preprocessRule(rule: RuleYAML, options: FormatOptions, warnings: string[]): RuleYAML {
    const processedRule = { ...rule };
    if (options.sanitizePaths) {
      this.sanitizePaths(processedRule, options.projectName!, warnings);
    }
    this.limitCodeExamples(processedRule, warnings);
    this.formatTimestamps(processedRule);
    return processedRule;
  }

  private sanitizePaths(rule: RuleYAML, projectName: string, warnings: string[]): void {
    if (rule.rule.trigger.type === 'file_pattern') {
      const originalPattern = rule.rule.trigger.pattern;
      const sanitizedPattern = originalPattern.replace(/[\w-]+\//g, projectName + '/');
      if (originalPattern !== sanitizedPattern) {
        rule.rule.trigger.pattern = sanitizedPattern;
        warnings.push('文件路径已脱敏处理');
      }
    }
    rule.rule.suggestions.forEach((suggestion) => {
      if (suggestion.files) {
        suggestion.files = suggestion.files.map(file =>
          file.replace(/[\w-]+\//g, projectName + '/')
        );
      }
    });
  }

  private limitCodeExamples(rule: RuleYAML, warnings: string[]): void {
    const maxLines = 15;
    rule.rule.suggestions.forEach((suggestion, index) => {
      if (suggestion.code) {
        const lines = suggestion.code.split('\n');
        if (lines.length > maxLines) {
          const importantLines = lines.filter(line =>
            line.includes('export') || line.includes('function') ||
            line.includes('class') || line.includes('return') ||
            line.trim().startsWith('//') || line.includes('TODO')
          );
          if (importantLines.length <= maxLines) {
            suggestion.code = importantLines.join('\n');
          } else {
            suggestion.code = [
              ...lines.slice(0, 5),
              '// ... (代码已截断，保留关键逻辑) ...',
              ...lines.slice(-5)
            ].join('\n');
          }
          warnings.push('建议 ' + (index + 1) + ' 的代码示例已截断，保留关键逻辑');
        }
      }
    });
  }

  private formatTimestamps(rule: RuleYAML): void {
    const now = new Date().toISOString();
    if (!rule.meta.created) {
      rule.meta.created = now;
    }
    rule.meta.updated = now;
  }

  private generateYaml(rule: RuleYAML, options: FormatOptions): string {
    const yamlObject = this.createYamlObject(rule, options.includeComments);
    const yamlString = YAML.stringify(yamlObject, {
      indent: options.indent,
      lineWidth: options.lineWidth
    });
    let result = '';
    if (options.includeComments) {
      result += this.generateHeaderComment(rule);
    }
    result += yamlString;
    return result;
  }

  /**
   * 创建 YAML 对象结构
   * v0.2: 条件输出 schemaVersion、meta 新字段、priority、compatibility.scenes
   */
  private createYamlObject(rule: RuleYAML, includeComments: boolean = true): any {
    const yamlObj: any = {};
    const v02 = isV02(rule);

    // schemaVersion（仅 v0.2+ 输出）
    if (v02 && rule.schemaVersion) {
      yamlObj.schemaVersion = rule.schemaVersion;
    }

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

    // v0.2 新增 meta 字段
    if (v02) {
      if (rule.meta.source !== undefined) {
        yamlObj.meta.source = rule.meta.source;
      }
      if (rule.meta.forked_from !== undefined) {
        yamlObj.meta.forked_from = rule.meta.forked_from;
      }
      if (rule.meta.tags && rule.meta.tags.length > 0) {
        yamlObj.meta.tags = rule.meta.tags;
      }
      if (rule.meta.scene !== undefined) {
        yamlObj.meta.scene = rule.meta.scene;
      }
    }

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
      const suggestionObj: any = {
        type: suggestion.type,
        description: suggestion.description
      };
      if (suggestion.code) { suggestionObj.code = suggestion.code; }
      if (suggestion.command) { suggestionObj.command = suggestion.command; }
      if (suggestion.files) { suggestionObj.files = suggestion.files; }
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

    // v0.2 新增 compatibility.scenes
    if (v02 && rule.compatibility.scenes && rule.compatibility.scenes.length > 0) {
      yamlObj.compatibility.scenes = rule.compatibility.scenes;
    }

    // Confidence
    yamlObj.confidence = Math.round(rule.confidence * 100) / 100;

    // Priority（v0.2 新增）
    if (v02 && rule.priority !== undefined) {
      yamlObj.priority = rule.priority;
    }

    return yamlObj;
  }

  private generateHeaderComment(rule: RuleYAML): string {
    const v02 = isV02(rule);
    const protocolVersion = v02 ? 'v0.2' : 'v0.1';

    let header = '# RuleForge Rule - ' + rule.meta.name;
    header += '\n# ID: ' + rule.meta.id;
    header += '\n# Version: ' + rule.meta.version;
    header += '\n# Description: ' + rule.meta.description;
    header += '\n# Authors: ' + rule.meta.authors.join(', ');
    header += '\n# Created: ' + rule.meta.created;
    header += '\n# Updated: ' + rule.meta.updated;
    header += '\n# Confidence: ' + Math.round(rule.confidence * 100) + '%';

    if (v02 && rule.meta.scene) {
      header += '\n# Scene: ' + rule.meta.scene;
    }

    if (v02 && rule.priority) {
      header += '\n# Priority: ' + rule.priority;
    }

    header += '\n#';
    header += '\n# This rule was automatically generated by RuleForge engine.';
    header += '\n# REP Protocol Version: ' + protocolVersion;
    header += '\n\n';

    return header;
  }

  private generateFileName(rule: RuleYAML): string {
    const sanitizedId = rule.meta.id.replace(/[^a-z0-9-]/g, '-');
    return sanitizedId + '-v' + rule.meta.version + '.yaml';
  }

  validateYaml(yamlContent: string): { valid: boolean; error?: string } {
    try {
      if (!yamlContent.trim()) {
        return { valid: false, error: 'YAML 内容为空' };
      }

      if (!yamlContent.includes('meta:') || !yamlContent.includes('rule:')) {
        return { valid: false, error: 'YAML 缺少必要的根级字段 (meta, rule)' };
      }

      const lines = yamlContent.split('\n');
      const indentStack: number[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const currentIndent = line.search(/\S/);

        if (currentIndent > -1) {
          if (indentStack.length === 0) {
            indentStack.push(currentIndent);
          } else if (currentIndent > indentStack[indentStack.length - 1]) {
            indentStack.push(currentIndent);
          } else if (currentIndent < indentStack[indentStack.length - 1]) {
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
    } catch (error) {
      return {
        valid: false,
        error: 'YAML 验证失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    }
  }

  prettify(yamlContent: string, options: FormatOptions = {}): string {
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      const lines = yamlContent.split('\n');
      const prettifiedLines: string[] = [];
      let inCommentBlock = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('#')) {
          if (!inCommentBlock && trimmedLine.startsWith('# ---')) {
            inCommentBlock = true;
            prettifiedLines.push('');
          }
          prettifiedLines.push(line);
        } else if (trimmedLine === '') {
          if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== '') {
            prettifiedLines.push('');
          }
        } else {
          inCommentBlock = false;
          prettifiedLines.push(line);
        }
      }

      while (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] === '') {
        prettifiedLines.pop();
      }

      return prettifiedLines.join('\n');
    } catch (error) {
      console.warn('YAML 美化失败，返回原内容:', error);
      return yamlContent;
    }
  }

  /**
   * 生成 Markdown 格式的规则报告
   */
  generateMarkdownReport(rules: RuleYAML[]): string {
    const total = rules.length;
    const v02Count = rules.filter(r => isV02(r)).length;
    const v01Count = total - v02Count;

    // 按 domain 分组
    const byDomain = new Map<string, RuleYAML[]>();
    for (const rule of rules) {
      const domain = rule.meta.tags?.[0] || '未分类';
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain)!.push(rule);
    }

    // 按 confidence 排序（高→低）
    const sorted = [...rules].sort((a, b) => b.confidence - a.confidence);

    let md = '# RuleForge 规则报告\n\n';
    md += '## 概览\n\n';
    md += `- 总规则数: ${total}\n`;
    md += `- REP v0.2: ${v02Count}\n`;
    md += `- REP v0.1: ${v01Count}\n`;
    md += `- Domain 数: ${byDomain.size}\n\n`;

    md += '## 按置信度排序\n\n';
    md += '| 规则 | ID | 版本 | 置信度 | Domain |\n';
    md += '|------|-----|------|--------|--------|\n';
    for (const rule of sorted) {
      const domain = rule.meta.tags?.[0] || '-';
      const conf = Math.round(rule.confidence * 100) + '%';
      md += `| ${rule.meta.name} | ${rule.meta.id} | ${rule.meta.version} | ${conf} | ${domain} |\n`;
    }

    md += '\n## 按 Domain 分组\n\n';
    for (const [domain, domainRules] of byDomain) {
      md += `### ${domain} (${domainRules.length} 条)\n\n`;
      for (const rule of domainRules) {
        const conf = Math.round(rule.confidence * 100) + '%';
        md += `- **${rule.meta.name}** (${rule.meta.id}) — 置信度 ${conf}\n`;
        md += `  ${rule.meta.description}\n`;
      }
      md += '\n';
    }

    return md;
  }

  /**
   * 按分组导出规则（按 domain/tags 分组，返回每组的 YAML 结果）
   */
  exportByGroup(rules: RuleYAML[], groupBy: 'domain' | 'language' | 'framework' = 'domain'): Map<string, FormatResult[]> {
    const groups = new Map<string, RuleYAML[]>();

    for (const rule of rules) {
      let key: string;
      switch (groupBy) {
        case 'domain':
          key = rule.meta.tags?.[0] || '未分类';
          break;
        case 'language':
          key = rule.compatibility.languages[0] || '通用';
          break;
        case 'framework':
          key = rule.compatibility.frameworks?.[0] || '无框架';
          break;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(rule);
    }

    const result = new Map<string, FormatResult[]>();
    for (const [key, groupRules] of groups) {
      result.set(key, this.formatBatch(groupRules));
    }
    return result;
  }
}
