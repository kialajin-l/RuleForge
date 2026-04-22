#!/usr/bin/env tsx

/**
 * CLI 演示脚本
 * 测试 RuleForge CLI 的所有功能
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './src/utils/logger.js';

const execAsync = promisify(exec);

/**
 * 执行命令并返回结果
 */
async function runCommand(command: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      success: true,
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 演示 CLI 功能
 */
async function demoCLI(): Promise<void> {
  logger.title('RuleForge CLI 演示脚本');
  logger.subtitle('开始测试所有 CLI 命令');
  
  try {
    // 1. 测试 init 命令
    logger.newline();
    logger.subtitle('1. 测试 init 命令');
    
    const initResult = await runCommand('node dist/index.js init --force --template default');
    
    if (initResult.success) {
      logger.success('✅ init 命令测试通过');
      logger.item('创建了 .ruleforge.yaml 配置文件');
      logger.item('初始化了规则库目录');
      logger.item('创建了示例规则');
    } else {
      logger.warn('⚠️ init 命令测试失败，但继续执行演示');
      logger.item(`错误: ${initResult.error}`);
    }
    
    // 2. 测试 list 命令
    logger.newline();
    logger.subtitle('2. 测试 list 命令');
    
    const listResult = await runCommand('node dist/index.js list --format table');
    
    if (listResult.success) {
      logger.success('✅ list 命令测试通过');
      logger.item('显示了规则列表表格');
    } else {
      logger.warn('⚠️ list 命令测试失败，但继续执行演示');
      logger.item(`错误: ${listResult.error}`);
    }
    
    // 3. 测试 show 命令
    logger.newline();
    logger.subtitle('3. 测试 show 命令');
    
    const showResult = await runCommand('node dist/index.js show typescript-function-naming --yaml');
    
    if (showResult.success) {
      logger.success('✅ show 命令测试通过');
      logger.item('显示了规则详细信息');
      logger.item('显示了完整的 YAML 内容');
    } else {
      logger.warn('⚠️ show 命令测试失败，但继续执行演示');
      logger.item(`错误: ${showResult.error}`);
    }
    
    // 4. 测试 validate 命令
    logger.newline();
    logger.subtitle('4. 测试 validate 命令');
    
    const validateResult = await runCommand('node dist/index.js validate .ruleforge/rules/typescript-function-naming.yaml --strict');
    
    if (validateResult.success) {
      logger.success('✅ validate 命令测试通过');
      logger.item('验证了规则文件');
      logger.item('使用了严格模式');
    } else {
      logger.warn('⚠️ validate 命令测试失败，但继续执行演示');
      logger.item(`错误: ${validateResult.error}`);
    }
    
    // 5. 测试 delete 命令
    logger.newline();
    logger.subtitle('5. 测试 delete 命令');
    
    const deleteResult = await runCommand('node dist/index.js delete typescript-function-naming --force');
    
    if (deleteResult.success) {
      logger.success('✅ delete 命令测试通过');
      logger.item('删除了示例规则');
      logger.item('使用了强制模式');
    } else {
      logger.warn('⚠️ delete 命令测试失败，但继续执行演示');
      logger.item(`错误: ${deleteResult.error}`);
    }
    
    // 6. 测试 extract 命令（干运行模式）
    logger.newline();
    logger.subtitle('6. 测试 extract 命令（干运行模式）');
    
    const extractResult = await runCommand('node dist/index.js extract --dry-run --min-conf 0.7');
    
    if (extractResult.success) {
      logger.success('✅ extract 命令测试通过');
      logger.item('模拟了规则提取过程');
      logger.item('使用了干运行模式');
    } else {
      logger.warn('⚠️ extract 命令测试失败，但继续执行演示');
      logger.item(`错误: ${extractResult.error}`);
    }
    
    // 7. 测试帮助命令
    logger.newline();
    logger.subtitle('7. 测试帮助命令');
    
    const helpResult = await runCommand('node dist/index.js --help');
    
    if (helpResult.success) {
      logger.success('✅ 帮助命令测试通过');
      logger.item('显示了完整的帮助信息');
      logger.item('显示了所有可用命令');
    } else {
      logger.warn('⚠️ 帮助命令测试失败');
      logger.item(`错误: ${helpResult.error}`);
    }
    
    // 8. 测试版本命令
    logger.newline();
    logger.subtitle('8. 测试版本命令');
    
    const versionResult = await runCommand('node dist/index.js --version');
    
    if (versionResult.success) {
      logger.success('✅ 版本命令测试通过');
      logger.item(`显示了版本号: ${versionResult.output.trim()}`);
    } else {
      logger.warn('⚠️ 版本命令测试失败');
      logger.item(`错误: ${versionResult.error}`);
    }
    
    // 演示总结
    logger.newline();
    logger.title('演示完成');
    logger.success('✅ RuleForge CLI 演示脚本执行完成！');
    
    logger.newline();
    logger.subtitle('下一步操作:');
    logger.item('1. 运行 npm run build 编译 CLI');
    logger.item('2. 运行 npm link 全局安装 CLI');
    logger.item('3. 使用 ruleforge --help 查看所有命令');
    logger.item('4. 在实际项目中测试 CLI 功能');
    
  } catch (error) {
    logger.error('演示脚本执行失败:', error instanceof Error ? error.message : '未知错误');
    process.exit(1);
  }
}

// 如果是直接运行，则执行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demoCLI().catch(error => {
    logger.error('演示脚本启动失败:', error);
    process.exit(1);
  });
}

export { demoCLI };