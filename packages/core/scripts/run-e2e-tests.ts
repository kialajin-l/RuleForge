#!/usr/bin/env tsx

/**
 * RuleForge 端到端测试运行脚本
 * 运行端到端测试并生成覆盖率报告
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

/**
 * 运行测试并处理结果
 */
async function runE2ETests(): Promise<void> {
  console.log('🚀 开始运行 RuleForge 端到端测试...\n');
  
  try {
    // 1. 运行端到端测试
    console.log('📋 运行端到端测试...');
    const testResult = await execAsync('npx vitest run --config vitest.config.e2e.ts', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8'
    });
    
    console.log('✅ 端到端测试执行完成');
    console.log(testResult.stdout);
    
    if (testResult.stderr) {
      console.warn('⚠️ 测试警告:', testResult.stderr);
    }
    
    // 2. 生成覆盖率报告
    console.log('\n📊 生成覆盖率报告...');
    const coverageResult = await execAsync('npx vitest run --config vitest.config.e2e.ts --coverage', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8'
    });
    
    console.log('✅ 覆盖率报告生成完成');
    
    // 3. 解析覆盖率结果
    await analyzeCoverage();
    
    // 4. 显示测试总结
    await showTestSummary();
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

/**
 * 分析覆盖率结果
 */
async function analyzeCoverage(): Promise<void> {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'e2e', 'coverage-summary.json');
  
  try {
    const coverageData = await fs.readFile(coveragePath, 'utf-8');
    const coverage = JSON.parse(coverageData);
    
    console.log('\n📈 覆盖率分析结果:');
    console.log('─'.repeat(50));
    
    const total = coverage.total;
    console.log(`总覆盖率:`);
    console.log(`  语句: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
    console.log(`  分支: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
    console.log(`  函数: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
    console.log(`  行:   ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
    
    // 检查是否达到目标覆盖率
    const targets = {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    };
    
    let allTargetsMet = true;
    
    for (const [metric, target] of Object.entries(targets)) {
      const actual = total[metric].pct;
      if (actual < target) {
        console.log(`❌ ${metric} 覆盖率未达标: ${actual}% < ${target}%`);
        allTargetsMet = false;
      } else {
        console.log(`✅ ${metric} 覆盖率达标: ${actual}% >= ${target}%`);
      }
    }
    
    if (!allTargetsMet) {
      console.log('\n⚠️  警告: 部分覆盖率指标未达标');
    } else {
      console.log('\n🎉 所有覆盖率指标均已达标！');
    }
    
    // 显示模块级别的覆盖率
    console.log('\n📁 模块覆盖率详情:');
    console.log('─'.repeat(50));
    
    const modules = Object.keys(coverage).filter(key => key !== 'total');
    for (const module of modules) {
      const moduleCoverage = coverage[module];
      console.log(`\n${module}:`);
      console.log(`  语句: ${moduleCoverage.statements.pct}%`);
      console.log(`  分支: ${moduleCoverage.branches.pct}%`);
      console.log(`  函数: ${moduleCoverage.functions.pct}%`);
      console.log(`  行:   ${moduleCoverage.lines.pct}%`);
    }
    
  } catch (error) {
    console.warn('⚠️ 无法解析覆盖率报告:', error);
  }
}

/**
 * 显示测试总结
 */
async function showTestSummary(): Promise<void> {
  console.log('\n📋 测试总结:');
  console.log('─'.repeat(50));
  
  // 这里可以添加更多的测试统计信息
  // 例如：测试通过率、执行时间、发现的错误等
  
  console.log('✅ 端到端测试覆盖了以下核心流程:');
  console.log('  • 完整提取流程 (提取 → 聚类 → 格式化)');
  console.log('  • 规则验证 (有效/无效规则验证)');
  console.log('  • YAML 格式化 (脱敏、格式优化)');
  console.log('  • 性能测试 (大数据量处理)');
  console.log('  • 错误处理 (边界情况和异常)');
  
  console.log('\n🔧 测试工具:');
  console.log('  • Vitest - 测试框架');
  console.log('  • V8 - 覆盖率工具');
  console.log('  • 自定义测试数据生成器');
  console.log('  • 性能测量工具');
  
  console.log('\n📁 测试数据:');
  console.log('  • 50+ 个真实开发会话事件');
  console.log('  • 多种错误模式和修复场景');
  console.log('  • 组件创建和重构模式');
  console.log('  • 有效和无效的规则示例');
  
  console.log('\n🎯 下一步:');
  console.log('  • 查看详细覆盖率报告: open coverage/e2e/index.html');
  console.log('  • 运行单元测试: npm run test:unit');
  console.log('  • 运行集成测试: npm run test:integration');
  console.log('  • 查看测试日志: 查看控制台输出');
}

/**
 * 检查测试环境
 */
async function checkTestEnvironment(): Promise<void> {
  console.log('🔍 检查测试环境...');
  
  const requiredFiles = [
    'vitest.config.e2e.ts',
    '__tests__/e2e/extraction-flow.test.ts',
    '__tests__/e2e/test-data/sample-session.jsonl',
    '__tests__/e2e/test-data/valid-rule.yaml',
    '__tests__/e2e/test-data/invalid-rule.yaml'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    try {
      await fs.access(filePath);
      console.log(`✅ ${file}`);
    } catch {
      throw new Error(`❌ 测试文件缺失: ${file}`);
    }
  }
  
  console.log('✅ 测试环境检查完成\n');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 检查测试环境
    await checkTestEnvironment();
    
    // 运行测试
    await runE2ETests();
    
    console.log('\n🎉 RuleForge 端到端测试执行完成！');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 如果是直接运行，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

export { runE2ETests, analyzeCoverage, checkTestEnvironment };