/**
 * 端到端测试设置文件
 * 配置测试环境和全局设置
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试数据目录
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

/**
 * 全局测试设置
 */
beforeAll(async () => {
  console.log('🚀 启动 RuleForge 端到端测试环境...');
  
  // 确保测试数据目录存在
  try {
    await fs.access(TEST_DATA_DIR);
  } catch {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  }
  
  // 验证测试数据文件存在
  const requiredFiles = [
    'sample-session.jsonl',
    'valid-rule.yaml',
    'invalid-rule.yaml'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(TEST_DATA_DIR, file);
    try {
      await fs.access(filePath);
      console.log(`✅ 测试数据文件存在: ${file}`);
    } catch {
      throw new Error(`❌ 测试数据文件缺失: ${file}`);
    }
  }
  
  console.log('✅ 测试环境准备完成');
});

afterAll(async () => {
  console.log('🧹 清理测试环境...');
  
  // 清理临时文件
  const tempFiles = ['empty-session.jsonl'];
  for (const file of tempFiles) {
    const filePath = path.join(TEST_DATA_DIR, file);
    try {
      await fs.unlink(filePath);
    } catch {
      // 忽略文件不存在的错误
    }
  }
  
  console.log('✅ 测试环境清理完成');
});

/**
 * 每个测试前的设置
 */
beforeEach(async () => {
  // 重置模块状态（如果需要）
  // 这里可以添加任何需要在每个测试前重置的状态
});

/**
 * 每个测试后的清理
 */
afterEach(async () => {
  // 清理测试产生的临时文件
  // 这里可以添加任何需要在每个测试后清理的资源
});

/**
 * 测试辅助函数
 */

export function createTestSessionData(events: any[]): string {
  return events.map(event => JSON.stringify(event)).join('\n');
}

export async function createTempFile(content: string, filename: string): Promise<string> {
  const filePath = path.join(TEST_DATA_DIR, filename);
  await fs.writeFile(filePath, content);
  return filePath;
}

export async function cleanupTempFile(filename: string): Promise<void> {
  const filePath = path.join(TEST_DATA_DIR, filename);
  try {
    await fs.unlink(filePath);
  } catch {
    // 忽略文件不存在的错误
  }
}

export function validateRuleStructure(rule: any): void {
  // 验证规则基本结构
  expect(rule).toBeDefined();
  expect(rule.meta).toBeDefined();
  expect(rule.meta.id).toBeDefined();
  expect(rule.rule).toBeDefined();
  expect(rule.compatibility).toBeDefined();
  expect(rule.confidence).toBeDefined();
  
  // 验证元数据
  expect(typeof rule.meta.id).toBe('string');
  expect(rule.meta.id.length).toBeGreaterThan(0);
  expect(typeof rule.meta.name).toBe('string');
  expect(typeof rule.meta.version).toBe('string');
  
  // 验证规则内容
  expect(rule.rule.trigger).toBeDefined();
  expect(Array.isArray(rule.rule.conditions)).toBe(true);
  expect(Array.isArray(rule.rule.suggestions)).toBe(true);
  
  // 验证兼容性
  expect(Array.isArray(rule.compatibility.languages)).toBe(true);
  expect(rule.compatibility.languages.length).toBeGreaterThan(0);
  
  // 验证置信度
  expect(typeof rule.confidence).toBe('number');
  expect(rule.confidence).toBeGreaterThanOrEqual(0);
  expect(rule.confidence).toBeLessThanOrEqual(1);
}

export function validateYamlContent(yamlContent: string): void {
  // 验证 YAML 内容基本结构
  expect(yamlContent).toBeDefined();
  expect(typeof yamlContent).toBe('string');
  expect(yamlContent.length).toBeGreaterThan(0);
  
  // 验证必需字段
  expect(yamlContent).toContain('meta:');
  expect(yamlContent).toContain('rule:');
  expect(yamlContent).toContain('compatibility:');
  expect(yamlContent).toContain('confidence:');
  
  // 验证格式正确性（基本检查）
  expect(yamlContent).toMatch(/^---\\n/); // YAML 文档开始标记
  expect(yamlContent).toMatch(/\\n\.\.\.\\n?$/); // YAML 文档结束标记
}

/**
 * 性能测试辅助函数
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  maxTime: number = 5000
): Promise<{ result: T; time: number }> {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  expect(executionTime).toBeLessThan(maxTime);
  
  return { result, time: executionTime };
}

/**
 * 错误处理辅助函数
 */
export async function expectToThrowAsync(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    // 如果函数没有抛出错误，测试应该失败
    expect(true).toBe(false);
  } catch (error) {
    if (errorMessage) {
      expect(error instanceof Error ? error.message : String(error)).toContain(errorMessage);
    }
  }
}

/**
 * 测试数据生成器
 */
export function generateTestEvents(count: number = 10): any[] {
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
      file: `/Users/dev/project/src/${fileType}s/example-${i}.${language === 'vue' ? 'vue' : 'ts'}`,
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

// 导出全局测试工具
export const TestUtils = {
  createTestSessionData,
  createTempFile,
  cleanupTempFile,
  validateRuleStructure,
  validateYamlContent,
  measurePerformance,
  expectToThrowAsync,
  generateTestEvents
};