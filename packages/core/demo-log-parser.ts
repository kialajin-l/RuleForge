/**
 * RuleForge 会话日志解析器演示脚本
 * 展示如何解析各种格式的会话日志
 */

import { SessionLogParser, parseSessionLog, ParseResult } from './src/extractor/log-parser';
import { promises as fs } from 'fs';
import { join } from 'path';

async function demo() {
  console.log('🚀 RuleForge 会话日志解析器演示开始...\n');

  const parser = new SessionLogParser();

  // 1. 演示 JSON Lines 格式解析
  console.log('1. JSON Lines 格式解析演示...');
  await demoJsonlFormat(parser);

  // 2. 演示错误处理
  console.log('\n2. 错误处理演示...');
  await demoErrorHandling(parser);

  // 3. 演示批量处理
  console.log('\n3. 批量会话处理演示...');
  await demoBatchProcessing(parser);

  // 4. 演示性能优化
  console.log('\n4. 大文件流式读取演示...');
  await demoStreaming(parser);

  console.log('\n🎉 会话日志解析器演示完成!');
  console.log('\n📋 功能总结:');
  console.log('   ✅ JSON Lines 格式解析');
  console.log('   ✅ 自动格式检测 (JSONL/VSCode/Trae)');
  console.log('   ✅ 事件类型标准化');
  console.log('   ✅ 大文件流式读取 (>10MB)');
  console.log('   ✅ 完善的错误处理机制');
  console.log('   ✅ 会话元数据提取');
  console.log('   ✅ 批量处理支持');
}

async function demoJsonlFormat(parser: SessionLogParser) {
  // 创建示例 JSON Lines 日志
  const jsonlContent = `
{"timestamp": "2024-01-15T09:00:00Z", "type": "file_opened", "payload": {"filePath": "src/components/Header.tsx", "language": "typescript", "content": "// Header component"}}
{"timestamp": "2024-01-15T09:05:00Z", "type": "file_saved", "payload": {"filePath": "src/components/Header.tsx", "changes": ["添加了导航菜单"], "content": "const Header = () => { return <nav>Menu</nav>; }"}}
{"timestamp": "2024-01-15T09:10:00Z", "type": "command_executed", "payload": {"command": "npm run dev", "args": ["--port", "3000"], "success": true, "duration": 2000}}
{"timestamp": "2024-01-15T09:15:00Z", "type": "error_occurred", "payload": {"message": "类型错误: 无法找到模块", "stack": "Error: Cannot find module...", "file": "src/components/Header.tsx", "line": 5}}
{"timestamp": "2024-01-15T09:20:00Z", "type": "test_run", "payload": {"file": "src/components/Header.test.tsx", "passed": true, "failures": [], "duration": 1500, "totalTests": 3, "passedTests": 3}}
  `;

  const logPath = await createDemoFile('demo-session.jsonl', jsonlContent);
  
  const result = await parser.parseSessionLog(logPath, {
    sessionId: 'demo-session-001',
    onProgress: (progress) => {
      console.log(`   📊 解析进度: ${progress.eventsParsed} 事件`);
    }
  });

  console.log(`   ✅ 解析完成: ${result.events.length} 个事件`);
  console.log(`   📋 会话元数据:`);
  console.log(`      - ID: ${result.metadata.id}`);
  console.log(`      - 开始时间: ${result.metadata.startTime.toISOString()}`);
  console.log(`      - 持续时间: ${result.metadata.duration}ms`);
  console.log(`      - IDE 类型: ${result.metadata.ideType}`);
  
  console.log(`   📈 统计信息:`);
  console.log(`      - 总事件数: ${result.statistics.totalEvents}`);
  console.log(`      - 文件打开: ${result.statistics.fileOpenedEvents}`);
  console.log(`      - 文件保存: ${result.statistics.fileSavedEvents}`);
  console.log(`      - 命令执行: ${result.statistics.commandExecutedEvents}`);
  console.log(`      - 错误事件: ${result.statistics.errorOccurredEvents}`);
  console.log(`      - 测试运行: ${result.statistics.testRunEvents}`);
  console.log(`      - 解析时间: ${result.statistics.parseTime}ms`);
  
  // 显示前3个事件的详细信息
  console.log(`   🔍 事件示例:`);
  result.events.slice(0, 3).forEach((event, index) => {
    console.log(`      ${index + 1}. [${event.timestamp.toISOString()}] ${event.type}`);
    console.log(`         载荷: ${JSON.stringify(event.payload).substring(0, 50)}...`);
  });
}

async function demoErrorHandling(parser: SessionLogParser) {
  // 1. 测试不存在的文件
  console.log('   🔍 测试文件不存在处理...');
  try {
    await parser.parseSessionLog('/nonexistent/file.jsonl');
  } catch (error) {
    console.log(`      ✅ 正确拒绝: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  // 2. 测试无效 JSON 处理
  console.log('   🔍 测试无效 JSON 处理...');
  const invalidContent = `
{"valid": "json"}
INVALID JSON LINE
{"another": "valid"}
  `;
  
  const invalidPath = await createDemoFile('invalid.jsonl', invalidContent);
  
  // 非严格模式 - 应该跳过无效行
  const lenientResult = await parser.parseSessionLog(invalidPath, { strictMode: false });
  console.log(`      ✅ 非严格模式: 解析 ${lenientResult.events.length} 个有效事件`);
  
  // 严格模式 - 应该抛出错误
  try {
    await parser.parseSessionLog(invalidPath, { strictMode: true });
  } catch (error) {
    console.log(`      ✅ 严格模式: 正确拒绝无效 JSON`);
  }

  // 3. 测试事件验证
  console.log('   🔍 测试事件验证...');
  const invalidEvent = {
    timestamp: new Date('invalid'),
    type: '',
    payload: undefined,
    sessionId: ''
  };
  
  const validation = parser.validateEvent(invalidEvent as any);
  console.log(`      ✅ 事件验证: ${validation.valid ? '通过' : '失败'} (${validation.errors.length} 个错误)`);
}

async function demoBatchProcessing(parser: SessionLogParser) {
  console.log('   🔍 创建多个会话日志...');
  
  // 创建多个会话日志
  const sessions = [
    {
      name: 'session-frontend.jsonl',
      content: `
{"timestamp": "2024-01-15T10:00:00Z", "type": "file_opened", "payload": {"filePath": "src/App.tsx"}}
{"timestamp": "2024-01-15T10:30:00Z", "type": "file_saved", "payload": {"filePath": "src/App.tsx"}}
      `
    },
    {
      name: 'session-backend.jsonl', 
      content: `
{"timestamp": "2024-01-15T11:00:00Z", "type": "file_opened", "payload": {"filePath": "server/api.ts"}}
{"timestamp": "2024-01-15T11:30:00Z", "type": "command_executed", "payload": {"command": "npm start"}}
      `
    },
    {
      name: 'session-testing.jsonl',
      content: `
{"timestamp": "2024-01-15T12:00:00Z", "type": "test_run", "payload": {"file": "src/App.test.tsx"}}
{"timestamp": "2024-01-15T12:30:00Z", "type": "test_run", "payload": {"file": "server/api.test.ts"}}
      `
    }
  ];

  const logPaths: string[] = [];
  for (const session of sessions) {
    const path = await createDemoFile(session.name, session.content);
    logPaths.push(path);
  }

  console.log(`   📁 批量处理 ${logPaths.length} 个会话文件...`);
  
  const results = await parser.parseMultipleSessions(logPaths, {
    onProgress: (progress) => {
      console.log(`      📊 批量进度: ${progress.bytesRead} 字节`);
    }
  });

  console.log(`   ✅ 批量处理完成: ${results.length} 个会话`);
  
  results.forEach((result, index) => {
    console.log(`     会话 ${index + 1}: ${result.events.length} 事件, ${result.metadata.duration}ms 时长`);
  });
}

async function demoStreaming(parser: SessionLogParser) {
  console.log('   🔍 创建大文件测试...');
  
  // 创建包含大量事件的大文件
  const eventCount = 500;
  const events = Array.from({ length: eventCount }, (_, i) => ({
    timestamp: `2024-01-15T13:00:${(i % 60).toString().padStart(2, '0')}Z`,
    type: ['file_opened', 'file_saved', 'command_executed'][i % 3],
    payload: { 
      filePath: `src/file${i}.ts`,
      index: i,
      data: 'x'.repeat(100) // 增加载荷大小
    }
  }));

  const largeContent = events.map(event => JSON.stringify(event)).join('\n');
  const largePath = await createDemoFile('large-session.jsonl', largeContent);

  console.log(`   📊 文件大小: ${largeContent.length} 字节 (~${Math.round(largeContent.length / 1024)}KB)`);
  
  const startTime = Date.now();
  
  const result = await parser.parseSessionLog(largePath, {
    maxFileSize: 10 * 1024 * 1024, // 10MB 限制
    onProgress: (progress) => {
      const percent = progress.bytesRead && progress.totalBytes 
        ? Math.round((progress.bytesRead / progress.totalBytes) * 100)
        : 0;
      console.log(`      📈 流式读取: ${progress.eventsParsed}/${eventCount} 事件 (${percent}%)`);
    }
  });
  
  const parseTime = Date.now() - startTime;
  
  console.log(`   ✅ 大文件解析完成: ${result.events.length} 事件, ${parseTime}ms`);
  console.log(`     性能: ${Math.round(result.events.length / (parseTime / 1000))} 事件/秒`);
}

async function createDemoFile(filename: string, content: string): Promise<string> {
  const demoDir = join(__dirname, 'demo-logs');
  
  try {
    await fs.mkdir(demoDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在
  }
  
  const filePath = join(demoDir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  
  return filePath;
}

// 运行演示
demo().catch(console.error);