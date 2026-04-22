/**
 * CLI 测试工具
 * 提供 CLI 命令测试的辅助函数
 */

import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import stripAnsi from 'strip-ansi';

// CLI 可执行文件路径
const CLI_PATH = path.join(__dirname, '..', '..', '..', 'cli', 'dist', 'index.js');

/**
 * CLI 测试工具类
 */
export class CliTestUtils {
  /**
   * 检查 CLI 是否可用
   */
  static async isCliAvailable(): Promise<boolean> {
    try {
      await fs.access(CLI_PATH);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行 CLI 命令
   */
  static async runCommand(
    command: string,
    args: string[] = [],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; reject?: boolean } = {}
  ) {
    const defaultOptions = {
      cwd: process.cwd(),
      env: process.env,
      reject: true
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return await execa('node', [CLI_PATH, command, ...args], mergedOptions);
  }

  /**
   * 执行 CLI 命令并返回清理后的输出
   */
  static async runCommandClean(
    command: string,
    args: string[] = [],
    options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
  ) {
    const result = await this.runCommand(command, args, { ...options, reject: false });
    
    return {
      ...result,
      stdout: stripAnsi(result.stdout),
      stderr: stripAnsi(result.stderr)
    };
  }

  /**
   * 验证命令输出包含特定内容
   */
  static validateOutputContains(
    output: string,
    expected: string[],
    shouldNotContain: string[] = []
  ) {
    for (const expectedText of expected) {
      if (!output.includes(expectedText)) {
        throw new Error(`输出未包含预期内容: "${expectedText}"`);
      }
    }

    for (const unexpectedText of shouldNotContain) {
      if (output.includes(unexpectedText)) {
        throw new Error(`输出包含不应出现的内容: "${unexpectedText}"`);
      }
    }
  }

  /**
   * 验证命令成功执行
   */
  static validateSuccess(result: any) {
    if (result.exitCode !== 0) {
      throw new Error(`命令执行失败，退出码: ${result.exitCode}\n错误输出: ${result.stderr}`);
    }
  }

  /**
   * 验证命令执行失败
   */
  static validateFailure(result: any, expectedError?: string) {
    if (result.exitCode === 0) {
      throw new Error('命令预期失败但实际成功执行');
    }

    if (expectedError && !result.stderr.includes(expectedError)) {
      throw new Error(`错误输出未包含预期错误信息: "${expectedError}"`);
    }
  }

  /**
   * 创建临时项目目录
   */
  static async createTempProject(): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruleforge-test-'));
    
    // 创建基本目录结构
    await fs.mkdir(path.join(tempDir, '.ruleforge'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.ruleforge', 'rules'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.ruleforge', 'logs'), { recursive: true });
    
    return tempDir;
  }

  /**
   * 创建测试配置文件
   */
  static async createTestConfig(
    config: any,
    configPath: string = '.ruleforge.yaml'
  ): Promise<string> {
    const fullPath = path.join(process.cwd(), configPath);
    await fs.writeFile(fullPath, JSON.stringify(config, null, 2));
    return fullPath;
  }

  /**
   * 创建测试日志文件
   */
  static async createTestLogFile(
    events: any[],
    logPath: string = 'test-session.jsonl'
  ): Promise<string> {
    const fullPath = path.join(process.cwd(), logPath);
    const logContent = events.map(event => JSON.stringify(event)).join('\n');
    await fs.writeFile(fullPath, logContent);
    return fullPath;
  }

  /**
   * 创建测试规则文件
   */
  static async createTestRuleFile(
    rule: any,
    rulePath: string = 'test-rule.yaml'
  ): Promise<string> {
    const fullPath = path.join(process.cwd(), rulePath);
    
    // 如果是对象，转换为 YAML
    if (typeof rule === 'object') {
      const yaml = await import('js-yaml');
      const yamlContent = yaml.dump(rule);
      await fs.writeFile(fullPath, yamlContent);
    } else {
      await fs.writeFile(fullPath, rule);
    }
    
    return fullPath;
  }

  /**
   * 生成测试事件数据
   */
  static generateTestEvents(count: number = 10): any[] {
    const events = [];
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(baseTime + i * 5 * 60 * 1000).toISOString();
      
      const eventTypes = ['file_saved', 'error_occurred', 'test_run'];
      const languages = ['typescript', 'vue', 'javascript'];
      const fileTypes = ['component', 'util', 'hook', 'test'];
      
      const type = eventTypes[i % eventTypes.length];
      const language = languages[i % languages.length];
      const fileType = fileTypes[i % fileTypes.length];
      
      const event: any = {
        timestamp,
        type,
        file: `/test/project/src/${fileType}s/example-${i}.${language === 'vue' ? 'vue' : 'ts'}`,
        language
      };
      
      if (type === 'file_saved') {
        event.content = `// Example ${fileType} file\nconsole.log('test ${i}');`;
      } else if (type === 'error_occurred') {
        event.error = `Test error ${i}`;
        event.fix = `Fixed error ${i}`;
      } else if (type === 'test_run') {
        event.result = i % 2 === 0 ? 'passed' : 'failed';
        event.tests = Math.floor(Math.random() * 10) + 1;
      }
      
      events.push(event);
    }
    
    return events;
  }

  /**
   * 验证文件是否存在
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证目录结构
   */
  static async validateDirectoryStructure(
    baseDir: string,
    expectedStructure: string[]
  ): Promise<void> {
    for (const expectedPath of expectedStructure) {
      const fullPath = path.join(baseDir, expectedPath);
      const exists = await this.fileExists(fullPath);
      
      if (!exists) {
        throw new Error(`预期路径不存在: ${expectedPath}`);
      }
    }
  }

  /**
   * 清理临时文件
   */
  static async cleanupTempFiles(...files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch {
        // 忽略文件不存在的错误
      }
    }
  }

  /**
   * 清理临时目录
   */
  static async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
      // 忽略清理失败的错误
    }
  }

  /**
   * 等待文件创建
   */
  static async waitForFile(filePath: string, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.fileExists(filePath)) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`文件未在 ${timeout}ms 内创建: ${filePath}`);
  }

  /**
   * 解析 JSON 输出
   */
  static parseJsonOutput(output: string): any {
    try {
      return JSON.parse(output);
    } catch (error) {
      throw new Error(`无法解析 JSON 输出: ${error.message}`);
    }
  }

  /**
   * 解析 YAML 输出
   */
  static async parseYamlOutput(output: string): Promise<any> {
    try {
      const yaml = await import('js-yaml');
      return yaml.load(output);
    } catch (error) {
      throw new Error(`无法解析 YAML 输出: ${error.message}`);
    }
  }
}

/**
 * 配置测试工具类
 */
export class ConfigTestUtils {
  /**
   * 创建多层级配置环境
   */
  static async createMultiLevelConfig(
    baseDir: string,
    configs: {
      project?: any;
      user?: any;
      default?: any;
    }
  ): Promise<{
    projectPath?: string;
    userPath?: string;
    defaultPath?: string;
  }> {
    const result: any = {};

    // 创建项目级配置
    if (configs.project) {
      result.projectPath = path.join(baseDir, '.ruleforge.yaml');
      await fs.writeFile(result.projectPath, JSON.stringify(configs.project, null, 2));
    }

    // 创建用户级配置
    if (configs.user) {
      const userConfigDir = path.join(baseDir, '.ruleforge');
      await fs.mkdir(userConfigDir, { recursive: true });
      
      result.userPath = path.join(userConfigDir, 'config.yaml');
      await fs.writeFile(result.userPath, JSON.stringify(configs.user, null, 2));
    }

    // 创建默认配置（通常不需要创建文件，使用默认值）
    if (configs.default) {
      result.defaultPath = path.join(baseDir, 'default-config.yaml');
      await fs.writeFile(result.defaultPath, JSON.stringify(configs.default, null, 2));
    }

    return result;
  }

  /**
   * 模拟环境变量配置
   */
  static setEnvConfig(envVars: Record<string, string>): () => void {
    const originalValues: Record<string, string | undefined> = {};
    
    // 保存原始值并设置新值
    for (const [key, value] of Object.entries(envVars)) {
      originalValues[key] = process.env[key];
      process.env[key] = value;
    }
    
    // 返回清理函数
    return () => {
      for (const [key, originalValue] of Object.entries(originalValues)) {
        if (originalValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      }
    };
  }

  /**
   * 验证配置优先级
   */
  static validateConfigPriority(
    actualConfig: any,
    expectedValues: Record<string, any>
  ): void {
    for (const [key, expectedValue] of Object.entries(expectedValues)) {
      const actualValue = this.getNestedValue(actualConfig, key);
      
      if (actualValue !== expectedValue) {
        throw new Error(`配置项 ${key} 的值不正确: 期望 ${expectedValue}, 实际 ${actualValue}`);
      }
    }
  }

  /**
   * 获取嵌套对象的值
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current ? current[key] : undefined;
    }, obj);
  }

  /**
   * 创建配置覆盖测试
   */
  static createOverrideTest(
    baseConfig: any,
    overrides: any,
    expectedChanges: Record<string, any>
  ) {
    const mergedConfig = this.mergeConfigs(baseConfig, overrides);
    
    // 验证基础配置保持不变
    for (const [key, expectedValue] of Object.entries(baseConfig)) {
      const actualValue = mergedConfig[key];
      
      if (actualValue !== expectedValue) {
        throw new Error(`基础配置项 ${key} 被意外修改`);
      }
    }
    
    // 验证覆盖配置生效
    this.validateConfigPriority(mergedConfig, expectedChanges);
    
    return mergedConfig;
  }

  /**
   * 合并配置
   */
  private static mergeConfigs(base: any, overrides: any): any {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.mergeConfigs(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

// 导出工具函数
export const TestHelpers = {
  CliTestUtils,
  ConfigTestUtils
};