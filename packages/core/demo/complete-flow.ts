#!/usr/bin/env tsx

/**
 * RuleForge 完整流程演示脚本
 * 展示从初始化到规则提取、验证、保存的完整流程
 */

import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import cliProgress from 'cli-progress';

// 导入核心模块
import { RuleExtractor } from '../src/extractor/rule-extractor.js';
import { RuleValidator } from '../src/validator/rule-validator.js';
import { PatternYamlFormatter } from '../src/formatter/yaml-formatter.js';
import { RuleStore } from '../src/storage/rule-store.js';
import { ConfigManager } from '../src/config/config-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 模拟数据生成器
 */
class DemoDataGenerator {
  private events: any[] = [];
  private baseTime = new Date('2024-01-15T10:00:00Z').getTime();

  /**
   * 生成开发会话事件
   */
  generateSessionEvents(count: number = 100): any[] {
    console.log(chalk.blue(`📝 生成 ${count} 个模拟开发事件...`));
    
    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('生成进度') + ' |{bar}| {percentage}% | {value}/{total} 事件',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });
    
    progressBar.start(count, 0);

    const eventTypes = [
      { type: 'file_saved', count: 30, weight: 0.3 },
      { type: 'error_occurred', count: 10, weight: 0.1 },
      { type: 'error_fixed', count: 8, weight: 0.08 },
      { type: 'test_run', count: 15, weight: 0.15 },
      { type: 'command_executed', count: 20, weight: 0.2 },
      { type: 'component_created', count: 17, weight: 0.17 }
    ];

    let eventIndex = 0;
    
    for (const eventType of eventTypes) {
      for (let i = 0; i < eventType.count; i++) {
        const timestamp = new Date(this.baseTime + eventIndex * 3 * 60 * 1000).toISOString();
        const event = this.generateEvent(eventType.type, eventIndex, timestamp);
        
        this.events.push(event);
        eventIndex++;
        progressBar.update(eventIndex);
      }
    }

    progressBar.stop();
    console.log(chalk.green(`✅ 成功生成 ${this.events.length} 个开发事件\n`));
    
    return this.events;
  }

  /**
   * 生成单个事件
   */
  private generateEvent(type: string, index: number, timestamp: string): any {
    const languages = ['typescript', 'vue', 'javascript'];
    const frameworks = ['vue', 'react', 'angular'];
    const fileTypes = ['component', 'util', 'hook', 'service', 'test'];
    
    const language = languages[index % languages.length];
    const framework = frameworks[index % frameworks.length];
    const fileType = fileTypes[index % fileTypes.length];

    const baseEvent = {
      timestamp,
      type,
      file: `/demo-project/src/${fileType}s/example-${index}.${language === 'vue' ? 'vue' : 'ts'}`,
      language,
      framework
    };

    switch (type) {
      case 'file_saved':
        return {
          ...baseEvent,
          content: this.generateFileContent(language, fileType, index),
          linesChanged: Math.floor(Math.random() * 10) + 1
        };

      case 'error_occurred':
        return {
          ...baseEvent,
          error: this.generateErrorMessage(index),
          severity: ['low', 'medium', 'high'][index % 3],
          stackTrace: this.generateStackTrace(index)
        };

      case 'error_fixed':
        return {
          ...baseEvent,
          error: this.generateErrorMessage(index - 1),
          fix: this.generateFixDescription(index),
          fixTime: Math.floor(Math.random() * 5) + 1
        };

      case 'test_run':
        return {
          ...baseEvent,
          result: index % 3 === 0 ? 'passed' : index % 3 === 1 ? 'failed' : 'skipped',
          tests: Math.floor(Math.random() * 20) + 5,
          duration: Math.floor(Math.random() * 30) + 5
        };

      case 'command_executed':
        return {
          ...baseEvent,
          command: this.generateCommand(index),
          args: this.generateCommandArgs(index),
          success: index % 5 !== 0
        };

      case 'component_created':
        return {
          ...baseEvent,
          componentName: `ExampleComponent${index}`,
          props: this.generateComponentProps(index),
          methods: this.generateComponentMethods(index)
        };

      default:
        return baseEvent;
    }
  }

  /**
   * 生成文件内容
   */
  private generateFileContent(language: string, fileType: string, index: number): string {
    const templates = {
      typescript: {
        component: `// Component ${index}\nexport default class ExampleComponent${index} {\n  private name: string = 'test';\n  \n  public greet(): string {\n    return \"Hello, world!\";\n  }\n}`,
        util: `// Utility function ${index}\nexport function util${index}(input: string): string {\n  return input.toUpperCase();\n}`,
        hook: `// Custom hook ${index}\nexport function useExample${index}() {\n  const [state, setState] = useState(null);\n  return { state, setState };\n}`,
        service: `// Service ${index}\nexport class ExampleService${index} {\n  async fetchData(): Promise<any> {\n    return await api.get('/data');\n  }\n}`,
        test: `// Test ${index}\ndescribe('Example ${index}', () => {\n  it('should work correctly', () => {\n    expect(true).toBe(true);\n  });\n});`
      },
      vue: {
        component: `<template>\n  <div class=\"example-${index}\">\n    <h1>{{ title }}</h1>\n    <p>{{ description }}</p>\n  </div>\n</template>\n\n<script setup>\nconst props = defineProps({\n  title: String,\n  description: String\n});\n</script>`,
        util: `// Vue utility ${index}\nexport function vueUtil${index}(value) {\n  return computed(() => value.toUpperCase());\n}`,
        hook: `// Vue composable ${index}\nexport function useVue${index}() {\n  const count = ref(0);\n  return { count };\n}`,
        service: `// Vue service ${index}\nexport const vueService${index} = {\n  async fetchData() {\n    return await $fetch('/api/data');\n  }\n};`,
        test: `// Vue test ${index}\ndescribe('VueComponent${index}', () => {\n  it('renders correctly', () => {\n    const wrapper = mount(Component);\n    expect(wrapper.text()).toContain('test');\n  });\n});`
      },
      javascript: {
        component: `// JS Component ${index}\nclass ExampleComponent${index} {\n  constructor() {\n    this.name = 'test';\n  }\n  \n  greet() {\n    return \"Hello, world!\";\n  }\n}`,
        util: `// JS Utility ${index}\nfunction util${index}(input) {\n  return input.toUpperCase();\n}`,
        hook: `// JS Hook ${index}\nfunction useExample${index}() {\n  const [state, setState] = useState(null);\n  return { state, setState };\n}`,
        service: `// JS Service ${index}\nclass ExampleService${index} {\n  async fetchData() {\n    return await fetch('/data');\n  }\n}`,
        test: `// JS Test ${index}\ndescribe('Example ${index}', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});`
      }
    };

    return templates[language]?.[fileType] || `// ${language} ${fileType} file ${index}`;
  }

  /**
   * 生成错误信息
   */
  private generateErrorMessage(index: number): string {
    const errors = [
      'TypeError: Cannot read property of undefined',
      'SyntaxError: Unexpected token',
      'ReferenceError: variable is not defined',
      'RangeError: Maximum call stack size exceeded',
      'TypeError: undefined is not a function',
      'Error: Network request failed',
      'Error: Permission denied',
      'Error: File not found',
      'Error: Invalid argument',
      'Error: Timeout exceeded'
    ];
    return errors[index % errors.length];
  }

  /**
   * 生成堆栈跟踪
   */
  private generateStackTrace(index: number): string {
    return `Error: Test error ${index}\n    at Function.generateError (demo.js:${index}:10)\n    at Object.<anonymous> (demo.js:${index + 5}:15)`;
  }

  /**
   * 生成修复描述
   */
  private generateFixDescription(index: number): string {
    const fixes = [
      'Added null check',
      'Fixed variable name',
      'Added missing import',
      'Fixed function signature',
      'Updated API call',
      'Fixed type annotation',
      'Added error handling',
      'Fixed component props',
      'Updated dependency',
      'Fixed configuration'
    ];
    return fixes[index % fixes.length];
  }

  /**
   * 生成命令
   */
  private generateCommand(index: number): string {
    const commands = ['npm', 'git', 'vue', 'tsc', 'jest', 'eslint', 'prettier', 'webpack'];
    return commands[index % commands.length];
  }

  /**
   * 生成命令参数
   */
  private generateCommandArgs(index: number): string[] {
    const argsSets = [
      ['install', '--save-dev'],
      ['commit', '-m', 'Update'],
      ['create', 'component'],
      ['--noEmit'],
      ['--watch'],
      ['--fix'],
      ['--write'],
      ['--mode', 'development']
    ];
    return argsSets[index % argsSets.length];
  }

  /**
   * 生成组件属性
   */
  private generateComponentProps(index: number): string[] {
    const props = ['title', 'description', 'count', 'items', 'loading', 'disabled', 'size', 'variant'];
    return props.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  /**
   * 生成组件方法
   */
  private generateComponentMethods(index: number): string[] {
    const methods = ['onClick', 'onSubmit', 'onChange', 'fetchData', 'validate', 'reset', 'update', 'delete'];
    return methods.slice(0, Math.floor(Math.random() * 2) + 1);
  }

  /**
   * 保存事件到文件
   */
  async saveToFile(filePath: string): Promise<void> {
    const content = this.events.map(event => JSON.stringify(event)).join('\n');
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`✅ 事件数据已保存到 ${filePath}`));
  }
}

/**
 * 演示主类
 */
class RuleForgeDemo {
  private dataGenerator = new DemoDataGenerator();
  private sessionLogPath = path.join(__dirname, 'demo-session.jsonl');
  private reportPath = path.join(__dirname, 'demo-report.json');

  /**
   * 运行完整演示流程
   */
  async run(): Promise<void> {
    console.log(chalk.bold.cyan('🚀 RuleForge 完整流程演示'));
    console.log(chalk.gray('='.repeat(60) + '\n'));

    try {
      // 1. 初始化项目
      await this.initializeProject();

      // 2. 模拟开发会话
      await this.simulateDevelopmentSession();

      // 3. 提取规则
      const result = await this.extractRules();

      // 4. 验证规则
      await this.validateRules(result.rules);

      // 5. 保存规则
      await this.saveRules(result.rules);

      // 6. 显示统计信息
      this.showStatistics(result);

      // 7. 导出报告
      await this.exportReport(result);

      console.log(chalk.bold.green('\n🎉 演示完成！'));
      console.log(chalk.gray('检查生成的文件：'));
      console.log(chalk.gray(`  • 会话日志: ${this.sessionLogPath}`));
      console.log(chalk.gray(`  • 演示报告: ${this.reportPath}`));
      console.log(chalk.gray(`  • 规则文件: .ruleforge/rules/`));

    } catch (error) {
      console.error(chalk.red('❌ 演示失败:'), error);
      process.exit(1);
    }
  }

  /**
   * 1. 初始化项目
   */
  private async initializeProject(): Promise<void> {
    console.log(chalk.blue('🚀 初始化 RuleForge 项目...'));
    
    try {
      // 检查是否已初始化
      const configPath = path.join(process.cwd(), '.ruleforge.yaml');
      try {
        await fs.access(configPath);
        console.log(chalk.yellow('⚠️  项目已初始化，跳过初始化步骤'));
        return;
      } catch {
        // 配置文件不存在，继续初始化
      }

      // 使用 CLI 初始化项目
      const { stdout, stderr } = await execa('node', [
        path.join(__dirname, '..', '..', 'cli', 'dist', 'index.js'),
        'init',
        '--force',
        '--template',
        'vue'
      ], {
        cwd: process.cwd()
      });

      console.log(chalk.green('✅ 项目初始化完成\n'));
      
    } catch (error) {
      console.warn(chalk.yellow('⚠️  CLI 初始化失败，使用程序化初始化...'));
      
      // 程序化初始化
      const configManager = new ConfigManager();
      await configManager.initializeProject({
        template: 'vue',
        force: true
      });
      
      console.log(chalk.green('✅ 项目初始化完成\n'));
    }
  }

  /**
   * 2. 模拟开发会话
   */
  private async simulateDevelopmentSession(): Promise<void> {
    console.log(chalk.blue('📝 模拟开发会话...'));
    
    // 生成 100 个开发事件
    const events = this.dataGenerator.generateSessionEvents(100);
    
    // 保存到文件
    await this.dataGenerator.saveToFile(this.sessionLogPath);
    
    console.log(chalk.green('✅ 开发会话模拟完成\n'));
  }

  /**
   * 3. 提取规则
   */
  private async extractRules(): Promise<any> {
    console.log(chalk.blue('🔨 提取规则...'));
    
    const extractor = new RuleExtractor();
    
    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('提取进度') + ' |{bar}| {percentage}% | 处理事件 {value}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });
    
    progressBar.start(100, 0);
    
    // 模拟提取进度
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
      }
      progressBar.update(progress);
    }, 100);

    // 执行规则提取
    const result = await extractor.extract({
      sessionId: 'demo-session',
      logPath: this.sessionLogPath,
      minConfidence: 0.7,
      applicableScenes: 2
    });

    clearInterval(progressInterval);
    progressBar.update(100);
    progressBar.stop();

    console.log(chalk.green(`✅ 生成 ${result.rules.length} 个规则\n`));

    // 显示规则摘要
    result.rules.forEach((rule: any, index: number) => {
      console.log(chalk.white(`  ${index + 1}. ${rule.meta.name}`));
      console.log(chalk.gray(`     置信度: ${chalk.yellow((rule.confidence * 100).toFixed(0) + '%')}`));
      console.log(chalk.gray(`     适用场景: ${chalk.cyan(rule.applicableScenes + ' 个')}\n`));
    });

    return result;
  }

  /**
   * 4. 验证规则
   */
  private async validateRules(rules: any[]): Promise<void> {
    console.log(chalk.blue('✅ 验证规则...'));
    
    const validator = RuleValidator.createStandardValidator();
    const formatter = new PatternYamlFormatter();
    
    let passedCount = 0;
    let failedCount = 0;

    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('验证进度') + ' |{bar}| {percentage}% | {value}/{total} 规则',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });
    
    progressBar.start(rules.length, 0);

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      
      try {
        const yaml = formatter.toYAML(rule);
        const validation = validator.validate(rule); // 直接验证规则对象
        
        if (validation.valid) {
          console.log(chalk.green(`  ✅ ${rule.meta.name} 验证通过`));
          passedCount++;
        } else {
          console.log(chalk.red(`  ❌ ${rule.meta.name} 验证失败`));
          console.log(chalk.gray(`     错误: ${validation.errors.join(', ')}`));
          failedCount++;
        }
      } catch (error) {
        console.log(chalk.red(`  ❌ ${rule.meta.name} 验证失败`));
        console.log(chalk.gray(`     错误: ${error.message}`));
        failedCount++;
      }
      
      progressBar.update(i + 1);
    }

    progressBar.stop();
    console.log(chalk.green(`\n验证结果: ${passedCount} 通过, ${failedCount} 失败\n`));
  }

  /**
   * 5. 保存规则
   */
  private async saveRules(rules: any[]): Promise<void> {
    if (rules.length === 0) {
      console.log(chalk.yellow('⚠️  没有规则可保存'));
      return;
    }

    console.log(chalk.blue('💾 保存规则到本地库...'));
    
    const ruleStore = new RuleStore('./.ruleforge/rules');
    
    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('保存进度') + ' |{bar}| {percentage}% | {value}/{total} 规则',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });
    
    progressBar.start(rules.length, 0);

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      
      try {
        await ruleStore.save(rule);
        progressBar.update(i + 1);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  保存规则失败: ${rule.meta.name}`));
      }
    }

    progressBar.stop();
    console.log(chalk.green('✅ 规则保存完成\n'));
  }

  /**
   * 6. 显示统计信息
   */
  private showStatistics(result: any): void {
    console.log(chalk.blue('📊 提取统计:'));
    
    const stats = result.statistics || {
      totalEvents: 100,
      totalPatterns: result.rules.length,
      totalRules: result.rules.length,
      highConfidencePatterns: result.rules.filter((r: any) => r.confidence > 0.8).length,
      averageConfidence: result.rules.reduce((sum: number, r: any) => sum + r.confidence, 0) / result.rules.length,
      extractionTime: 5000
    };

    console.log(chalk.white(`  总事件数: ${chalk.cyan(stats.totalEvents)}`));
    console.log(chalk.white(`  识别模式: ${chalk.cyan(stats.totalPatterns)}`));
    console.log(chalk.white(`  生成规则: ${chalk.cyan(stats.totalRules)}`));
    console.log(chalk.white(`  高置信度: ${chalk.green(stats.highConfidencePatterns)}`));
    console.log(chalk.white(`  平均置信度: ${chalk.yellow((stats.averageConfidence * 100).toFixed(1) + '%')}`));
    console.log(chalk.white(`  处理时间: ${chalk.cyan((stats.extractionTime / 1000).toFixed(2) + 's')}`));
    console.log('');
  }

  /**
   * 7. 导出报告
   */
  private async exportReport(result: any): Promise<void> {
    console.log(chalk.blue('💼 生成报告...'));
    
    const report = {
      sessionId: 'demo-session',
      timestamp: new Date().toISOString(),
      statistics: result.statistics || {},
      rules: result.rules.map((r: any) => ({
        id: r.meta.id,
        name: r.meta.name,
        confidence: r.confidence,
        applicableScenes: r.applicableScenes
      }))
    };

    await fs.writeFile(this.reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green('✅ 报告已保存到 demo-report.json'));
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const demo = new RuleForgeDemo();
  
  try {
    await demo.run();
  } catch (error) {
    console.error(chalk.red('演示执行失败:'), error);
    process.exit(1);
  }
}

// 如果是直接运行，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { RuleForgeDemo, DemoDataGenerator };