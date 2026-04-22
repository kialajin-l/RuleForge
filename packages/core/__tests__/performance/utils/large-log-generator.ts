/**
 * 大日志生成器
 * 用于生成大容量的开发会话日志文件
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 大日志生成器类
 */
export class LargeLogGenerator {
  private eventTemplates: any[] = [];
  private baseTime = new Date('2024-01-15T10:00:00Z').getTime();

  constructor() {
    this.initializeEventTemplates();
  }

  /**
   * 初始化事件模板
   */
  private initializeEventTemplates(): void {
    // 文件保存事件模板
    this.eventTemplates.push({
      type: 'file_saved',
      weight: 0.3,
      generator: (index: number, timestamp: string) => ({
        timestamp,
        type: 'file_saved',
        file: `/project/src/components/Component${index}.vue`,
        language: 'vue',
        framework: 'vue',
        content: this.generateVueComponent(index),
        linesChanged: Math.floor(Math.random() * 10) + 1
      })
    });

    // TypeScript 文件保存事件模板
    this.eventTemplates.push({
      type: 'file_saved_ts',
      weight: 0.25,
      generator: (index: number, timestamp: string) => ({
        timestamp,
        type: 'file_saved',
        file: `/project/src/utils/util${index}.ts`,
        language: 'typescript',
        framework: 'react',
        content: this.generateTypeScriptUtil(index),
        linesChanged: Math.floor(Math.random() * 5) + 1
      })
    });

    // 错误发生事件模板
    this.eventTemplates.push({
      type: 'error_occurred',
      weight: 0.1,
      generator: (index: number, timestamp: string) => ({
        timestamp,
        type: 'error_occurred',
        file: `/project/src/components/Component${index}.vue`,
        language: 'vue',
        framework: 'vue',
        error: this.generateErrorMessage(index),
        severity: ['low', 'medium', 'high'][index % 3],
        stackTrace: this.generateStackTrace(index)
      })
    });

    // 错误修复事件模板
    this.eventTemplates.push({
      type: 'error_fixed',
      weight: 0.08,
      generator: (index: number, timestamp: string) => ({
        timestamp,
        type: 'error_fixed',
        file: `/project/src/components/Component${index}.vue`,
        language: 'vue',
        framework: 'vue',
        error: this.generateErrorMessage(index),
        fix: this.generateFixDescription(index),
        fixTime: Math.floor(Math.random() * 5) + 1
      })
    });

    // 测试运行事件模板
    this.eventTemplates.push({
      type: 'test_run',
      weight: 0.15,
      generator: (index: number, timestamp: string) => ({
        timestamp,
        type: 'test_run',
        file: `/project/src/tests/Component${index}.test.js`,
        language: 'javascript',
        framework: 'jest',
        result: index % 3 === 0 ? 'passed' : index % 3 === 1 ? 'failed' : 'skipped',
        tests: Math.floor(Math.random() * 20) + 5,
        duration: Math.floor(Math.random() * 30) + 5
      })
    });

    // 命令执行事件模板
    this.eventTemplates.push({
      type: 'command_executed',
      weight: 0.12,
      generator: (index: number, timestamp: string) => ({
        timestamp,
        type: 'command_executed',
        command: this.generateCommand(index),
        args: this.generateCommandArgs(index),
        success: index % 5 !== 0,
        duration: Math.floor(Math.random() * 10) + 1
      })
    });
  }

  /**
   * 生成指定大小的日志文件内容
   */
  async generateLargeLog(targetSizeBytes: number): Promise<string> {
    let currentSize = 0;
    const events: string[] = [];
    let eventIndex = 0;

    // 生成事件直到达到目标大小
    while (currentSize < targetSizeBytes) {
      const event = this.generateEvent(eventIndex);
      const eventJson = JSON.stringify(event);
      
      events.push(eventJson);
      currentSize += Buffer.byteLength(eventJson + '\n', 'utf8');
      eventIndex++;

      // 避免无限循环，设置最大事件数限制
      if (eventIndex > 1000000) { // 100 万事件上限
        break;
      }
    }

    return events.join('\n');
  }

  /**
   * 生成指定数量的事件
   */
  generateEvents(count: number): string {
    const events: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const event = this.generateEvent(i);
      events.push(JSON.stringify(event));
    }

    return events.join('\n');
  }

  /**
   * 生成单个事件
   */
  private generateEvent(index: number): any {
    const timestamp = new Date(this.baseTime + index * 3 * 60 * 1000).toISOString();
    
    // 根据权重随机选择事件类型
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const template of this.eventTemplates) {
      cumulativeWeight += template.weight;
      if (random <= cumulativeWeight) {
        return template.generator(index, timestamp);
      }
    }
    
    // 默认返回第一个模板
    return this.eventTemplates[0].generator(index, timestamp);
  }

  /**
   * 生成 Vue 组件内容
   */
  private generateVueComponent(index: number): string {
    return `<template>
  <div class="component-${index}">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: 'Default description'
  }
})

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

const handleClick = () => {
  count.value++
  console.log('Button clicked:', count.value)
}
</script>

<style scoped>
.component-${index} {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>`;
  }

  /**
   * 生成 TypeScript 工具函数
   */
  private generateTypeScriptUtil(index: number): string {
    return `/**
 * 工具函数 ${index}
 * 用于处理数据转换和验证
 */

export interface DataItem {
  id: number
  name: string
  value: any
}

export function processData${index}(data: DataItem[]): DataItem[] {
  return data
    .filter(item => item.id > 0)
    .map(item => ({
      ...item,
      name: item.name.trim().toUpperCase(),
      value: typeof item.value === 'string' ? item.value.trim() : item.value
    }))
    .sort((a, b) => a.id - b.id)
}

/**
 * 验证数据格式
 */
export function validateData${index}(data: any): boolean {
  return Array.isArray(data) && 
         data.every(item => 
           typeof item === 'object' && 
           'id' in item && 
           'name' in item
         )
}

/**
 * 工具函数示例
 */
export const exampleUtil${index} = {
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  },
  
  formatCurrency(amount: number): string {
    return '\$' + amount.toFixed(2)
  },
  
  generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}`;
  }

  /**
   * 生成错误信息
   */
  private generateErrorMessage(index: number): string {
    const errors = [
      'TypeError: Cannot read property \'name\' of undefined',
      'SyntaxError: Unexpected token \'{\'',
      'ReferenceError: variable is not defined',
      'RangeError: Maximum call stack size exceeded',
      'TypeError: undefined is not a function',
      'Error: Network request failed',
      'Error: Permission denied',
      'Error: File not found',
      'Error: Invalid argument provided',
      'Error: Timeout exceeded',
      'Error: Component rendering failed',
      'Error: API response validation failed',
      'Error: Database connection lost',
      'Error: Memory allocation failed',
      'Error: Invalid configuration'
    ];
    return errors[index % errors.length];
  }

  /**
   * 生成堆栈跟踪
   */
  private generateStackTrace(index: number): string {
    return `Error: Processing error at index ${index}
    at processData (utils.ts:${index + 10}:15)
    at validateInput (validator.ts:${index + 5}:22)
    at main (index.ts:${index + 20}:8)
    at Module._compile (internal/modules/cjs/loader.js:${index + 100}:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:${index + 105}:10)`;
  }

  /**
   * 生成修复描述
   */
  private generateFixDescription(index: number): string {
    const fixes = [
      'Added null check for undefined values',
      'Fixed variable name typo',
      'Added missing import statement',
      'Fixed function signature mismatch',
      'Updated API call with proper error handling',
      'Fixed type annotation for better type safety',
      'Added input validation to prevent errors',
      'Fixed component props validation',
      'Updated dependency version to fix compatibility issue',
      'Fixed configuration file path',
      'Added try-catch block for error handling',
      'Fixed memory leak by properly cleaning up resources',
      'Updated CSS selector specificity',
      'Fixed asynchronous operation sequencing',
      'Added proper error boundaries for React components'
    ];
    return fixes[index % fixes.length];
  }

  /**
   * 生成命令
   */
  private generateCommand(index: number): string {
    const commands = [
      'npm', 'yarn', 'pnpm', 'git', 'vue', 'react', 'angular',
      'tsc', 'jest', 'eslint', 'prettier', 'webpack', 'vite',
      'docker', 'kubectl', 'terraform', 'aws', 'gcloud'
    ];
    return commands[index % commands.length];
  }

  /**
   * 生成命令参数
   */
  private generateCommandArgs(index: number): string[] {
    const argsSets = [
      ['install', '--save-dev'],
      ['commit', '-m', 'Update component functionality'],
      ['create', 'component', '--template', 'vue'],
      ['--noEmit', '--strict'],
      ['--watch', '--verbose'],
      ['--fix', '--ext', '.ts,.vue'],
      ['--write', '--single-quote'],
      ['--mode', 'development', '--env', 'local'],
      ['build', '--target', 'production'],
      ['test', '--coverage', '--verbose'],
      ['deploy', '--stage', 'production'],
      ['apply', '--auto-approve'],
      ['logs', '--follow', '--tail', '100']
    ];
    return argsSets[index % argsSets.length];
  }

  /**
   * 估算事件数量
   */
  estimateEventCount(targetSizeBytes: number): number {
    // 基于平均事件大小估算
    const sampleEvent = this.generateEvent(0);
    const sampleSize = Buffer.byteLength(JSON.stringify(sampleEvent), 'utf8');
    const averageEventSize = sampleSize + 2; // 加上换行符
    
    return Math.ceil(targetSizeBytes / averageEventSize);
  }

  /**
   * 生成性能测试专用日志
   */
  async generatePerformanceLog(options: {
    targetSize?: number;
    eventCount?: number;
    complexity?: 'low' | 'medium' | 'high';
  }): Promise<string> {
    const { targetSize, eventCount, complexity = 'medium' } = options;
    
    if (targetSize) {
      return await this.generateLargeLog(targetSize);
    }
    
    if (eventCount) {
      return this.generateEvents(eventCount);
    }
    
    // 默认生成中等复杂度的日志
    return this.generateEvents(1000);
  }

  /**
   * 保存日志到文件
   */
  async saveLogToFile(content: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, content);
    
    const stats = await fs.stat(filePath);
    console.log(`✅ 日志文件已保存: ${filePath}`);
    console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📈 事件数量: ${content.split('\n').filter(line => line.trim()).length.toLocaleString()} 个`);
  }
}

/**
 * 创建预定义大小的日志文件
 */
export async function createStandardLogs(directory: string): Promise<void> {
  const generator = new LargeLogGenerator();
  const sizes = [
    { size: 1, label: '1mb' },
    { size: 5, label: '5mb' },
    { size: 10, label: '10mb' },
    { size: 50, label: '50mb' },
    { size: 100, label: '100mb' }
  ];

  for (const { size, label } of sizes) {
    const filePath = path.join(directory, `performance-${label}.jsonl`);
    const content = await generator.generateLargeLog(size * 1024 * 1024);
    await generator.saveLogToFile(content, filePath);
  }
}

export default LargeLogGenerator;