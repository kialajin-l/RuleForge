/**
 * match 命令 - 规则匹配
 */

import chalk from 'chalk';
import { RuleForgeEngine, RuleMatcher } from '@ruleforge/core';
import * as fs from 'fs';
import * as path from 'path';

export async function matchCommand(options: {
  file?: string;
  language?: string;
  framework?: string;
  scene?: string;
  minConf?: string;
  max?: string;
  json?: boolean;
}): Promise<void> {
  try {
    const engine = new RuleForgeEngine({
      sources: [{ type: 'local', path: './rules' }],
      storage: { localRulesDir: './rules' }
    });
    await engine.initialize();

    const store = engine.getStore();
    const allRules = await store.list();

    if (allRules.length === 0) {
      console.log(chalk.yellow('⚠️  没有可用规则。先运行 ruleforge extract 提取规则。'));
      return;
    }

    const matcher = new RuleMatcher(allRules);
    const minConf = parseFloat(options.minConf || '0.3');
    const maxResults = parseInt(options.max || '10', 10);

    // 构建匹配上下文
    const context: Record<string, unknown> = {};
    if (options.file) {
      context.filePath = options.file;
      // 尝试读取文件内容
      if (fs.existsSync(options.file)) {
        context.content = fs.readFileSync(options.file, 'utf-8');
        // 自动推断语言
        const ext = path.extname(options.file).toLowerCase();
        const langMap: Record<string, string> = {
          '.ts': 'typescript', '.tsx': 'typescript',
          '.js': 'javascript', '.jsx': 'javascript',
          '.py': 'python', '.java': 'java',
          '.go': 'go', '.rs': 'rust',
          '.rb': 'ruby', '.php': 'php',
          '.cs': 'csharp', '.cpp': 'cpp', '.hpp': 'cpp',
          '.swift': 'swift', '.kt': 'kotlin', '.dart': 'dart'
        };
        context.language = langMap[ext] || 'unknown';
      }
    }
    if (options.language) context.language = options.language;
    if (options.framework) context.framework = options.framework;
    if (options.scene) context.scene = options.scene;

    // 执行匹配
    const matches = matcher.match(context);

    // 过滤和排序
    const filtered = matches
      .filter(m => m.score >= minConf)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    if (filtered.length === 0) {
      console.log(chalk.yellow('⚠️  没有匹配的规则'));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    console.log(chalk.blue(`🎯 匹配到 ${filtered.length} 条规则:\n`));
    filtered.forEach((match, i) => {
      const rule = match.rule;
      const score = (match.score * 100).toFixed(0);
      const confidence = rule.quality?.confidence ? ` (confidence: ${(rule.quality.confidence * 100).toFixed(0)}%)` : '';
      console.log(`${chalk.yellow(`${i + 1}.`)} ${chalk.green(rule.meta.name)} [匹配度: ${score}%]${confidence}`);
      console.log(`   ${chalk.gray(rule.body.rule)}`);
      if (match.reasons && match.reasons.length > 0) {
        console.log(`   ${chalk.gray('原因: ' + match.reasons.join(', '))}`);
      }
      console.log();
    });

  } catch (error) {
    console.error(chalk.red('❌ 规则匹配失败:'), error);
    process.exit(1);
  }
}
