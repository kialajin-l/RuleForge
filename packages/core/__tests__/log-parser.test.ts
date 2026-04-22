/**
 * RuleForge 会话日志解析器单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  SessionLogParser, 
  parseSessionLog, 
  SessionEvent,
  ParseSessionLogOptions,
  ParseResult 
} from '../src/extractor/log-parser';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('SessionLogParser', () => {
  let parser: SessionLogParser;
  let testDir: string;

  beforeEach(() => {
    parser = new SessionLogParser();
    testDir = join(__dirname, 'test-logs');
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('JSON Lines 格式解析', () => {
    it('应该正确解析有效的 JSON Lines 文件', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened", "payload": {"filePath": "src/main.ts", "language": "typescript"}}
{"timestamp": "2024-01-01T10:01:00Z", "type": "file_saved", "payload": {"filePath": "src/main.ts", "changes": ["添加了类型定义"], "content": "const x: number = 42;"}}
{"timestamp": "2024-01-01T10:02:00Z", "type": "command_executed", "payload": {"command": "npm run build", "success": true}}
      `;

      const logPath = await createTestFile('test.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath);

      expect(result.events).toHaveLength(3);
      expect(result.metadata.id).toBeDefined();
      expect(result.statistics.totalEvents).toBe(3);
      expect(result.statistics.fileOpenedEvents).toBe(1);
      expect(result.statistics.fileSavedEvents).toBe(1);
      expect(result.statistics.commandExecutedEvents).toBe(1);
    });

    it('应该处理包含无效 JSON 的行', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened", "payload": {"filePath": "src/main.ts"}}
INVALID JSON LINE
{"timestamp": "2024-01-01T10:01:00Z", "type": "file_saved", "payload": {"filePath": "src/main.ts"}}
      `;

      const logPath = await createTestFile('test-invalid.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath, { strictMode: false });

      expect(result.events).toHaveLength(2); // 应该跳过无效行
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该在严格模式下拒绝无效 JSON', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened"}
INVALID JSON LINE
      `;

      const logPath = await createTestFile('test-strict.jsonl', jsonlContent);
      
      await expect(parser.parseSessionLog(logPath, { strictMode: true }))
        .rejects.toThrow();
    });

    it('应该支持大文件流式读取', async () => {
      // 创建包含大量事件的测试文件
      const events = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: `2024-01-01T10:00:${i.toString().padStart(2, '0')}Z`,
        type: i % 2 === 0 ? 'file_opened' : 'file_saved',
        payload: { filePath: `src/file${i}.ts` }
      }));

      const jsonlContent = events.map(event => JSON.stringify(event)).join('\n');
      const logPath = await createTestFile('test-large.jsonl', jsonlContent);

      const onProgress = vi.fn();
      const result = await parser.parseSessionLog(logPath, { onProgress });

      expect(result.events).toHaveLength(1000);
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('事件类型标准化', () => {
    it('应该标准化各种事件类型', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file.open", "payload": {"filePath": "src/main.ts"}}
{"timestamp": "2024-01-01T10:01:00Z", "type": "command.run", "payload": {"command": "npm test"}}
{"timestamp": "2024-01-01T10:02:00Z", "type": "error", "payload": {"message": "编译错误"}}
      `;

      const logPath = await createTestFile('test-standardize.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath);

      expect(result.events[0].type).toBe('file_opened');
      expect(result.events[1].type).toBe('command_executed');
      expect(result.events[2].type).toBe('error_occurred');
    });

    it('应该处理缺失的时间戳', async () => {
      const jsonlContent = `
{"type": "file_opened", "payload": {"filePath": "src/main.ts"}}
{"time": "2024-01-01T10:00:00Z", "type": "file_saved", "payload": {"filePath": "src/main.ts"}}
      `;

      const logPath = await createTestFile('test-timestamp.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath);

      expect(result.events[0].timestamp).toBeInstanceOf(Date);
      expect(result.events[1].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('错误处理', () => {
    it('应该拒绝不存在的文件', async () => {
      await expect(parser.parseSessionLog('/nonexistent/file.jsonl'))
        .rejects.toThrow('文件不存在');
    });

    it('应该拒绝过大的文件', async () => {
      // 创建超过限制的文件
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const logPath = await createTestFile('test-large.txt', largeContent);

      await expect(parser.parseSessionLog(logPath, { maxFileSize: 10 * 1024 * 1024 }))
        .rejects.toThrow('文件大小超过限制');
    });

    it('应该处理目录路径', async () => {
      await expect(parser.parseSessionLog(__dirname))
        .rejects.toThrow('路径不是文件');
    });
  });

  describe('会话元数据提取', () => {
    it('应该正确提取会话元数据', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened", "payload": {"filePath": "src/main.ts"}}
{"timestamp": "2024-01-01T10:30:00Z", "type": "file_saved", "payload": {"filePath": "src/main.ts"}}
      `;

      const logPath = await createTestFile('test-metadata.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath, { sessionId: 'test-session' });

      expect(result.metadata.id).toBe('test-session');
      expect(result.metadata.startTime).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.metadata.endTime).toEqual(new Date('2024-01-01T10:30:00Z'));
      expect(result.metadata.duration).toBe(30 * 60 * 1000); // 30分钟
      expect(result.metadata.ideType).toBe('unknown');
    });

    it('应该检测 IDE 类型', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "vscode.file_opened", "payload": {"filePath": "src/main.ts"}}
{"timestamp": "2024-01-01T10:01:00Z", "type": "file_saved", "payload": {"source": "trae", "filePath": "src/main.ts"}}
      `;

      const logPath = await createTestFile('test-ide.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath);

      expect(result.metadata.ideType).toBe('trae'); // trae 优先级更高
    });
  });

  describe('便捷函数', () => {
    it('parseSessionLog 应该正常工作', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened", "payload": {"filePath": "src/main.ts"}}
      `;

      const logPath = await createTestFile('test-convenience.jsonl', jsonlContent);
      const result = await parseSessionLog(logPath);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('file_opened');
    });

    it('parseMultipleSessions 应该批量处理文件', async () => {
      const content1 = `{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened", "payload": {"filePath": "src/file1.ts"}}`;
      const content2 = `{"timestamp": "2024-01-01T11:00:00Z", "type": "file_saved", "payload": {"filePath": "src/file2.ts"}}`;

      const logPath1 = await createTestFile('session1.jsonl', content1);
      const logPath2 = await createTestFile('session2.jsonl', content2);

      const results = await parser.parseMultipleSessions([logPath1, logPath2]);

      expect(results).toHaveLength(2);
      expect(results[0].events[0].type).toBe('file_opened');
      expect(results[1].events[0].type).toBe('file_saved');
    });
  });

  describe('事件验证', () => {
    it('应该验证事件的完整性', () => {
      const validEvent: SessionEvent = {
        timestamp: new Date(),
        type: 'file_opened',
        payload: { filePath: 'src/main.ts' },
        sessionId: 'test-session'
      };

      const invalidEvent: Partial<SessionEvent> = {
        timestamp: new Date('invalid'),
        type: '',
        payload: undefined,
        sessionId: ''
      };

      const validResult = parser.validateEvent(validEvent as SessionEvent);
      const invalidResult = parser.validateEvent(invalidEvent as SessionEvent);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('格式检测', () => {
    it('应该检测 JSON Lines 格式', async () => {
      const jsonlContent = `
{"timestamp": "2024-01-01T10:00:00Z", "type": "file_opened"}
{"timestamp": "2024-01-01T10:01:00Z", "type": "file_saved"}
      `;

      const logPath = await createTestFile('test-format.jsonl', jsonlContent);
      const result = await parser.parseSessionLog(logPath);

      // 格式检测应该在内部完成，我们主要验证解析结果
      expect(result.events).toHaveLength(2);
    });

    it('应该处理未知格式', async () => {
      const unknownContent = `This is not a recognized log format\nJust some random text`;
      
      const logPath = await createTestFile('test-unknown.txt', unknownContent);
      
      await expect(parser.parseSessionLog(logPath))
        .rejects.toThrow('不支持的日志格式');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量事件', async () => {
      const eventCount = 5000;
      const events = Array.from({ length: eventCount }, (_, i) => ({
        timestamp: `2024-01-01T10:00:${(i % 60).toString().padStart(2, '0')}Z`,
        type: ['file_opened', 'file_saved', 'command_executed'][i % 3],
        payload: { 
          filePath: `src/file${i}.ts`,
          index: i 
        }
      }));

      const jsonlContent = events.map(event => JSON.stringify(event)).join('\n');
      const logPath = await createTestFile('test-performance.jsonl', jsonlContent);

      const startTime = Date.now();
      const result = await parser.parseSessionLog(logPath);
      const parseTime = Date.now() - startTime;

      expect(result.events).toHaveLength(eventCount);
      expect(parseTime).toBeLessThan(5000); // 5秒内完成
      expect(result.statistics.parseTime).toBeLessThan(5000);
    });
  });
});

// 辅助函数：创建测试文件
async function createTestFile(filename: string, content: string): Promise<string> {
  const testDir = join(__dirname, 'test-logs');
  
  try {
    await fs.mkdir(testDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在
  }
  
  const filePath = join(testDir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  
  return filePath;
}

// 演示如何使用解析器
describe('使用示例', () => {
  it('完整的使用示例', async () => {
    // 1. 创建示例日志数据
    const sampleLog = `
{"timestamp": "2024-01-01T09:00:00Z", "type": "file_opened", "payload": {"filePath": "src/components/Button.tsx", "language": "typescript"}}
{"timestamp": "2024-01-01T09:05:00Z", "type": "file_saved", "payload": {"filePath": "src/components/Button.tsx", "changes": ["添加了props类型"], "content": "interface ButtonProps { label: string; }"}}
{"timestamp": "2024-01-01T09:10:00Z", "type": "command_executed", "payload": {"command": "npm run lint", "success": true, "duration": 5000}}
{"timestamp": "2024-01-01T09:15:00Z", "type": "test_run", "payload": {"file": "src/components/Button.test.tsx", "passed": true, "duration": 2000}}
    `;

    const logPath = await createTestFile('example-session.jsonl', sampleLog);
    
    // 2. 解析会话日志
    const parser = new SessionLogParser();
    const result = await parser.parseSessionLog(logPath, {
      sessionId: 'dev-session-001',
      onProgress: (progress) => {
        console.log(`解析进度: ${progress.eventsParsed} 事件`);
      }
    });

    // 3. 验证结果
    expect(result.events).toHaveLength(4);
    expect(result.metadata.id).toBe('dev-session-001');
    expect(result.statistics.totalEvents).toBe(4);
    
    // 4. 分析事件类型分布
    const eventTypes = result.events.map(event => event.type);
    expect(eventTypes).toEqual([
      'file_opened',
      'file_saved', 
      'command_executed',
      'test_run'
    ]);
    
    // 5. 检查特定事件的载荷
    const fileOpenedEvent = result.events.find(event => event.type === 'file_opened');
    expect(fileOpenedEvent?.payload.filePath).toBe('src/components/Button.tsx');
    expect(fileOpenedEvent?.payload.language).toBe('typescript');
    
    console.log('示例测试完成！');
  });
});