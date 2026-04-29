/**
 * template 命令 - 规则模板管理
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getTemplates, getTemplate, generateFromTemplate, listTemplates } from '@ruleforge/core';

export async function templateCommand(options: {
  list?: boolean;
  show?: string;
  generate?: string;
  language?: string;
  framework?: string;
  scene?: string;
  output?: string;
  json?: boolean;
}): Promise<void> {
  try {
    // 列出所有模板
    if (options.list) {
      const templates = listTemplates();
      
      if (options.json) {
        console.log(JSON.stringify(templates, null, 2));
        return;
      }

      console.log(chalk.blue('📋 可用规则模板:\n'));
      
      const categories = [...new Set(templates.map(t => t.category))];
      for (const cat of categories) {
        console.log(chalk.yellow(`  ${cat.toUpperCase()}`));
        templates.filter(t => t.category === cat).forEach(t => {
          console.log(`    ${chalk.green(t.id)} - ${t.description}`);
        });
        console.log();
      }
      return;
    }

    // 显示模板详情
    if (options.show) {
      const template = getTemplate(options.show);
      if (!template) {
        console.error(chalk.red(`❌ 模板不存在: ${options.show}`));
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(template, null, 2));
        return;
      }

      console.log(chalk.blue(`📋 模板详情: ${template.name}\n`));
      console.log(`  ID: ${chalk.green(template.id)}`);
      console.log(`  分类: ${chalk.yellow(template.category)}`);
      console.log(`  场景: ${chalk.yellow(template.scene)}`);
      console.log(`  描述: ${template.description}`);
      return;
    }

    // 从模板生成规则
    if (options.generate) {
      const params: Record<string, unknown> = {};
      if (options.language) params.language = options.language;
      if (options.framework) params.framework = options.framework;
      if (options.scene) params.scene = options.scene;

      const rule = generateFromTemplate(options.generate, params);
      
      if (options.json) {
        console.log(JSON.stringify(rule, null, 2));
        return;
      }

      // 输出 YAML 格式
      const yaml = `apiVersion: ${rule.apiVersion}
kind: ${rule.kind}
meta:
  id: ${rule.meta.id}
  version: ${rule.meta.version}
  name: ${rule.meta.name}
  description: ${rule.meta.description}
  authors: ${JSON.stringify(rule.meta.authors)}
  tags: ${JSON.stringify(rule.meta.tags)}
  created: ${rule.meta.created}
  updated: ${rule.meta.updated}
  scene: ${rule.meta.scene}
  priority: ${rule.meta.priority}
  domain: ${rule.meta.domain}
trigger:
  type: ${rule.trigger.type}
  patterns: ${JSON.stringify(rule.trigger.patterns)}
conditions:
${rule.conditions.map(c => `  - type: ${c.type}\n    pattern: ${c.pattern}\n    description: ${c.description}`).join('\n')}
body:
  rule: "${rule.body.rule}"
  rationale: "${rule.body.rationale}"
  examples:
    good:
${rule.body.examples.good.map(e => `      - "${e}"`).join('\n')}
    bad:
${rule.body.examples.bad.map(e => `      - "${e}"`).join('\n')}
compatibility:
  languages: ${JSON.stringify(rule.compatibility.languages)}
  frameworks: ${JSON.stringify(rule.compatibility.frameworks)}
  minVersion: ${rule.compatibility.minVersion}
quality:
  confidence: ${rule.quality.confidence}
  evidenceCount: ${rule.quality.evidenceCount}
  source: ${rule.quality.source}
`;

      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, yaml, 'utf-8');
        console.log(chalk.green(`✅ 规则已生成: ${options.output}`));
      } else {
        console.log(yaml);
      }
      return;
    }

    // 默认显示帮助
    console.log(chalk.blue('📋 规则模板命令:\n'));
    console.log('  --list              列出所有可用模板');
    console.log('  --show <id>         显示模板详情');
    console.log('  --generate <id>     从模板生成规则');
    console.log('  --language <lang>   指定编程语言');
    console.log('  --framework <fw>    指定框架');
    console.log('  --output <path>     输出文件路径');
    console.log('  --json              JSON 格式输出');

  } catch (error) {
    console.error(chalk.red('❌ 模板操作失败:'), error);
    process.exit(1);
  }
}
