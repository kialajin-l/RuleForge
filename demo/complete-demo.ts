#!/usr/bin/env tsx

/**
 * RuleForge 完整演示脚本
 * 展示从初始化到规则提取的完整流程
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { RuleExtractor, RuleValidator, PatternYamlFormatter, ConfigManager, RuleStore } from '@ruleforge/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 演示脚本主类
 */
class RuleForgeDemo {
  private extractor: RuleExtractor;
  private validator: RuleValidator;
  private formatter: PatternYamlFormatter;
  private configManager: ConfigManager;
  private ruleStore: RuleStore;
  
  private sessionLogPath: string;
  private reportPath: string;
  private demoDataPath: string;

  constructor() {
    this.extractor = new RuleExtractor();
    this.validator = RuleValidator.createStandardValidator();
    this.formatter = new PatternYamlFormatter();
    this.configManager = new ConfigManager();
    this.ruleStore = new RuleStore('./.ruleforge/rules');
    
    this.sessionLogPath = path.join(__dirname, 'demo-session.jsonl');
    this.reportPath = path.join(__dirname, 'demo-report.json');
    this.demoDataPath = path.join(__dirname, 'demo-data.json');
  }

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
   * 初始化项目配置
   */
  private async initializeProject(): Promise<void> {
    console.log(chalk.blue('📁 1. 初始化 RuleForge 项目...'));
    
    try {
      await this.configManager.initializeProject({
        template: 'vue',
        force: true
      });
      
      console.log(chalk.green('   ✅ 项目配置已创建'));
      
      // 加载配置验证
      const config = await this.configManager.load();
      console.log(chalk.gray(`     最小置信度: ${config.extraction.minConfidence}`));
      console.log(chalk.gray(`     自动脱敏: ${config.privacy.autoRedact ? '启用' : '禁用'}`));
      
    } catch (error) {
      console.log(chalk.yellow('   ⚠️ 使用默认配置继续演示'));
    }
    
    console.log();
  }

  /**
   * 模拟开发会话
   */
  private async simulateDevelopmentSession(): Promise<void> {
    console.log(chalk.blue('💻 2. 模拟开发会话...'));
    
    // 生成模拟数据
    const demoData = await this.generateDemoData();
    
    // 保存会话日志
    const logContent = demoData.events.map(event => 
      JSON.stringify(event)
    ).join('\n');
    
    await fs.writeFile(this.sessionLogPath, logContent);
    
    console.log(chalk.green(`   ✅ 生成 ${demoData.events.length} 个开发事件`));
    console.log(chalk.gray(`      文件保存: ${demoData.stats.fileSaved} 次`));
    console.log(chalk.gray(`      错误修复: ${demoData.stats.errorFixed} 次`));
    console.log(chalk.gray(`      测试运行: ${demoData.stats.testRun} 次`));
    console.log();
  }

  /**
   * 生成演示数据
   */
  private async generateDemoData(): Promise<any> {
    // 尝试加载预生成的演示数据
    try {
      const data = await fs.readFile(this.demoDataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // 如果文件不存在，生成默认演示数据
      return this.generateDefaultDemoData();
    }
  }

  /**
   * 生成默认演示数据
   */
  private generateDefaultDemoData(): any {
    const events = [];
    const baseTime = Date.now() - 24 * 60 * 60 * 1000; // 24小时前
    
    // 生成各种类型的事件
    const eventTypes = [
      { type: 'file_saved', count: 50, weight: 0.4 },
      { type: 'error_occurred', count: 20, weight: 0.2 },
      { type: 'error_fixed', count: 15, weight: 0.15 },
      { type: 'test_run', count: 10, weight: 0.1 },
      { type: 'command_executed', count: 5, weight: 0.05 },
      { type: 'git_commit', count: 5, weight: 0.05 },
      { type: 'package_installed', count: 5, weight: 0.05 }
    ];
    
    let eventIndex = 0;
    
    for (const eventType of eventTypes) {
      for (let i = 0; i < eventType.count; i++) {
        const timestamp = new Date(baseTime + eventIndex * 10 * 60 * 1000).toISOString();
        
        events.push(this.generateEvent(eventType.type, eventIndex, timestamp));
        eventIndex++;
      }
    }
    
    return {
      events,
      stats: {
        fileSaved: 50,
        errorFixed: 15,
        testRun: 10,
        totalEvents: events.length
      }
    };
  }

  /**
   * 生成单个事件
   */
  private generateEvent(type: string, index: number, timestamp: string): any {
    const baseEvent = {
      timestamp,
      sessionId: 'demo-session',
      index
    };
    
    switch (type) {
      case 'file_saved':
        return {
          ...baseEvent,
          type: 'file_saved',
          file: `/src/components/Component${Math.floor(index / 10)}.vue`,
          language: 'vue',
          content: this.generateVueComponent(index)
        };
        
      case 'error_occurred':
        return {
          ...baseEvent,
          type: 'error_occurred',
          error: `TypeError: Cannot read property 'name' of undefined`,
          file: `/src/components/Component${index % 5}.vue`,
          line: Math.floor(Math.random() * 50) + 1
        };
        
      case 'error_fixed':
        return {
          ...baseEvent,
          type: 'error_fixed',
          error: `TypeError: Cannot read property 'name' of undefined`,
          fix: 'Added null check for user object',
          file: `/src/components/Component${index % 5}.vue`
        };
        
      case 'test_run':
        return {
          ...baseEvent,
          type: 'test_run',
          testFile: `/tests/Component${index % 3}.test.ts`,
          passed: Math.random() > 0.3,
          failed: Math.random() < 0.3
        };
        
      default:
        return {
          ...baseEvent,
          type,
          description: `Demo ${type} event`
        };
    }
  }

  /**
   * 生成 Vue 组件内容
   */
  private generateVueComponent(index: number): string {
    const components = [
      `<template>\n  <div class="user-profile">\n    <h2>{{ user.name }}</h2>\n    <p>{{ user.email }}</p>\n  </div>\n</template>`,
      
      `<template>\n  <form @submit.prevent="handleSubmit">\n    <input v-model="form.email" type="email" />\n    <button type="submit">Submit</button>\n  </form>\n</template>`,
      
      `<template>\n  <div v-if="loading">Loading...</div>\n  <div v-else>\n    {{ data }}\n  </div>\n</template>`
    ];
    
    return components[index % components.length];
  }

  /**
   * 提取规则
   */
  private async extractRules(): Promise<any> {
    console.log(chalk.blue('🔍 3. 提取规则...'));
    
    const startTime = Date.now();
    
    const result = await this.extractor.extract({
      sessionId: 'demo-session',
      logPath: this.sessionLogPath,
      minConfidence: 0.7,
      applicableScenes: 2
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(chalk.green(`   ✅ 提取完成 (${processingTime}ms)`));
    console.log(chalk.gray(`      识别模式: ${result.statistics.totalPatterns} 个`));
    console.log(chalk.gray(`      生成规则: ${result.rules.length} 个`));
    console.log(chalk.gray(`      平均置信度: ${(result.statistics.averageConfidence * 100).toFixed(1)}%`));
    console.log();
    
    return { ...result, processingTime };
  }

  /**
   * 验证规则
   */
  private async validateRules(rules: any[]): Promise<void> {
    console.log(chalk.blue('✅ 4. 验证规则...'));
    
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    
    for (const rule of rules) {
      const validation = this.validator.validate(rule);
      
      if (validation.valid) {
        validCount++;
        process.stdout.write(chalk.green('.'));
      } else {
        errorCount++;
        process.stdout.write(chalk.red('!'));
      }
      
      warningCount += validation.warnings.length;
    }
    
    console.log('\n');
    console.log(chalk.green(`   ✅ 验证完成`));
    console.log(chalk.gray(`      有效规则: ${validCount} 个`));
    console.log(chalk.gray(`      错误规则: ${errorCount} 个`));
    console.log(chalk.gray(`      警告数量: ${warningCount} 个`));
    console.log();
  }

  /**
   * 保存规则
   */
  private async saveRules(rules: any[]): Promise<void> {
    console.log(chalk.blue('💾 5. 保存规则...'));
    
    let savedCount = 0;
    
    for (const rule of rules) {
      try {
        await this.ruleStore.save(rule);
        savedCount++;
        process.stdout.write(chalk.green('.'));
      } catch (error) {
        process.stdout.write(chalk.yellow('!'));
      }
    }
    
    console.log('\n');
    console.log(chalk.green(`   ✅ 保存完成`));
    console.log(chalk.gray(`      成功保存: ${savedCount} 个规则`));
    console.log();
  }

  /**
   * 显示统计信息
   */
  private showStatistics(result: any): void {
    console.log(chalk.blue('📊 6. 统计信息...'));
    
    const stats = result.statistics;
    
    console.log(chalk.gray('   📈 性能指标:'));
    console.log(chalk.gray(`      处理时间: ${result.processingTime}ms`));
    console.log(chalk.gray(`      总事件数: ${stats.totalEvents}`));
    console.log(chalk.gray(`      事件处理速度: ${Math.round(stats.totalEvents / (result.processingTime / 1000))} 事件/秒`));
    
    console.log(chalk.gray('   🔍 提取结果:'));
    console.log(chalk.gray(`      识别模式: ${stats.totalPatterns}`));
    console.log(chalk.gray(`      生成规则: ${result.rules.length}`));
    console.log(chalk.gray(`      高置信度模式: ${stats.highConfidencePatterns}`));
    console.log(chalk.gray(`      平均置信度: ${(stats.averageConfidence * 100).toFixed(1)}%`));
    
    // 显示规则分类
    const categories = this.categorizeRules(result.rules);
    console.log(chalk.gray('   🏷️  规则分类:'));
    for (const [category, count] of Object.entries(categories)) {
      console.log(chalk.gray(`      ${category}: ${count} 个`));
    }
    
    console.log();
  }

  /**
   * 对规则进行分类
   */
  private categorizeRules(rules: any[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const rule of rules) {
      const tags = rule.meta.tags || [];
      
      if (tags.length > 0) {
        const primaryTag = tags[0];
        categories[primaryTag] = (categories[primaryTag] || 0) + 1;
      } else {
        categories['uncategorized'] = (categories['uncategorized'] || 0) + 1;
      }
    }
    
    return categories;
  }

  /**
   * 导出报告
   */
  private async exportReport(result: any): Promise<void> {
    console.log(chalk.blue('📄 7. 导出报告...'));
    
    const report = {
      demo: {
        timestamp: new Date().toISOString(),
        sessionId: 'demo-session',
        totalEvents: result.statistics.totalEvents,
        processingTime: result.processingTime
      },
      extraction: result.statistics,
      rules: result.rules.map((rule: any) => ({
        id: rule.meta.id,
        name: rule.meta.name,
        confidence: rule.confidence,
        tags: rule.meta.tags || []
      })),
      summary: {
        totalRules: result.rules.length,
        averageConfidence: result.statistics.averageConfidence,
        categories: this.categorizeRules(result.rules)
      }
    };
    
    await fs.writeFile(this.reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.green('   ✅ 报告已导出'));
    console.log(chalk.gray(`      文件路径: ${this.reportPath}`));
    console.log();
  }
}

/**
 * 演示数据生成器
 */
class DemoDataGenerator {
  /**
   * 生成详细的演示数据
   */
  async generateDetailedDemoData(): Promise<void> {
    console.log(chalk.blue('📊 生成详细演示数据...'));
    
    const demoData = {
      events: this.generateRealisticEvents(),
      stats: {
        fileSaved: 50,
        errorFixed: 20,
        testRun: 15,
        commandExecuted: 15,
        totalEvents: 100
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        description: 'RuleForge 演示数据 - 模拟真实开发会话'
      }
    };
    
    const demoDataPath = path.join(__dirname, 'demo-data.json');
    await fs.writeFile(demoDataPath, JSON.stringify(demoData, null, 2));
    
    console.log(chalk.green('✅ 演示数据已生成'));
    console.log(chalk.gray(`文件路径: ${demoDataPath}`));
  }

  /**
   * 生成真实的开发事件
   */
  private generateRealisticEvents(): any[] {
    const events = [];
    const baseTime = Date.now() - 48 * 60 * 60 * 1000; // 48小时前
    
    // Vue 开发相关事件
    const vueEvents = this.generateVueDevelopmentEvents(baseTime);
    events.push(...vueEvents);
    
    // TypeScript 开发相关事件
    const tsEvents = this.generateTypeScriptEvents(baseTime);
    events.push(...tsEvents);
    
    // 错误和修复事件
    const errorEvents = this.generateErrorEvents(baseTime);
    events.push(...errorEvents);
    
    // 测试相关事件
    const testEvents = this.generateTestEvents(baseTime);
    events.push(...testEvents);
    
    return events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * 生成 Vue 开发事件
   */
  private generateVueDevelopmentEvents(baseTime: number): any[] {
    const events = [];
    
    // Vue 组件创建和修改
    const vueComponents = [
      'UserProfile.vue', 'LoginForm.vue', 'Dashboard.vue', 
      'SettingsPanel.vue', 'DataTable.vue', 'Modal.vue'
    ];
    
    vueComponents.forEach((component, index) => {
      const timestamp = new Date(baseTime + index * 2 * 60 * 60 * 1000).toISOString();
      
      events.push({
        type: 'file_saved',
        timestamp,
        file: `/src/components/${component}`,
        language: 'vue',
        content: this.generateVueComponentContent(component),
        sessionId: 'demo-session'
      });
    });
    
    return events;
  }

  /**
   * 生成 TypeScript 事件
   */
  private generateTypeScriptEvents(baseTime: number): any[] {
    const events = [];
    
    const tsFiles = [
      'user-service.ts', 'api-client.ts', 'utils.ts',
      'types.ts', 'validation.ts', 'constants.ts'
    ];
    
    tsFiles.forEach((file, index) => {
      const timestamp = new Date(baseTime + (index + 6) * 2 * 60 * 60 * 1000).toISOString();
      
      events.push({
        type: 'file_saved',
        timestamp,
        file: `/src/services/${file}`,
        language: 'typescript',
        content: this.generateTypeScriptContent(file),
        sessionId: 'demo-session'
      });
    });
    
    return events;
  }

  /**
   * 生成错误事件
   */
  private generateErrorEvents(baseTime: number): any[] {
    const events = [];
    
    const errorPatterns = [
      {
        error: "TypeError: Cannot read property 'name' of undefined",
        fix: 'Added null check for user object',
        file: 'UserProfile.vue'
      },
      {
        error: "Error: Maximum call stack size exceeded",
        fix: 'Fixed recursive function call',
        file: 'utils.ts'
      },
      {
        error: "TypeError: props.user is not iterable",
        fix: 'Added Array.isArray check before iteration',
        file: 'DataTable.vue'
      }
    ];
    
    errorPatterns.forEach((pattern, index) => {
      const errorTime = new Date(baseTime + (index + 12) * 2 * 60 * 60 * 1000).toISOString();
      const fixTime = new Date(baseTime + (index + 12) * 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
      
      // 错误发生
      events.push({
        type: 'error_occurred',
        timestamp: errorTime,
        error: pattern.error,
        file: `/src/components/${pattern.file}`,
        line: Math.floor(Math.random() * 50) + 1,
        sessionId: 'demo-session'
      });
      
      // 错误修复
      events.push({
        type: 'error_fixed',
        timestamp: fixTime,
        error: pattern.error,
        fix: pattern.fix,
        file: `/src/components/${pattern.file}`,
        sessionId: 'demo-session'
      });
    });
    
    return events;
  }

  /**
   * 生成测试事件
   */
  private generateTestEvents(baseTime: number): any[] {
    const events = [];
    
    const testFiles = [
      'user-service.test.ts', 'utils.test.ts', 'components.test.ts'
    ];
    
    testFiles.forEach((file, index) => {
      const timestamp = new Date(baseTime + (index + 15) * 2 * 60 * 60 * 1000).toISOString();
      
      events.push({
        type: 'test_run',
        timestamp,
        testFile: `/tests/${file}`,
        passed: Math.random() > 0.2,
        failed: Math.random() < 0.3,
        duration: Math.floor(Math.random() * 5000) + 1000,
        sessionId: 'demo-session'
      });
    });
    
    return events;
  }

  /**
   * 生成 Vue 组件内容
   */
  private generateVueComponentContent(component: string): string {
    const templates: Record<string, string> = {
      'UserProfile.vue': `<template>\n  <div class="user-profile">\n    <img :src="user.avatar" alt="Avatar" />\n    <h2>{{ user.name }}</h2>\n    <p>{{ user.email }}</p>\n    <button @click="editProfile">Edit</button>\n  </div>\n</template>`,
      
      'LoginForm.vue': `<template>\n  <form @submit.prevent="handleSubmit">\n    <input v-model="form.email" type="email" placeholder="Email" />\n    <input v-model="form.password" type="password" placeholder="Password" />\n    <button type="submit" :disabled="loading">\n      {{ loading ? 'Logging in...' : 'Login' }}\n    </button>\n  </form>\n</template>`,
      
      'Dashboard.vue': `<template>\n  <div class="dashboard">\n    <header>\n      <h1>Dashboard</h1>\n      <nav>\n        <router-link to="/profile">Profile</router-link>\n        <router-link to="/settings">Settings</router-link>\n      </nav>\n    </header>\n    <main>\n      <slot />\n    </main>\n  </div>\n</template>`
    };
    
    return templates[component] || `<template>\n  <div>\n    <!-- ${component} content -->\n  </div>\n</template>`;
  }

  /**
   * 生成 TypeScript 内容
   */
  private generateTypeScriptContent(file: string): string {
    const templates: Record<string, string> = {
      'user-service.ts': `export class UserService {\n  async getUser(id: number): Promise<User> {\n    const response = await fetch(\`/api/users/\${id}\`)\n    return response.json()\n  }\n}`,
      
      'utils.ts': `export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}`
    };
    
    return templates[file] || `// ${file} content`;
  }
}

// 主执行逻辑
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--generate-data')) {
    // 生成演示数据
    const generator = new DemoDataGenerator();
    await generator.generateDetailedDemoData();
  } else {
    // 运行完整演示
    const demo = new RuleForgeDemo();
    await demo.run();
  }
}

// 启动演示
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RuleForgeDemo, DemoDataGenerator };