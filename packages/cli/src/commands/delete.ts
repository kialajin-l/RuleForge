/**
 * delete 命令：删除指定规则
 */

import inquirer from 'inquirer';
import { RuleForgeEngine } from '@ruleforge/core';
import { logger } from '../utils/logger.js';

/**
 * delete 命令处理函数
 */
export async function deleteCommand(ruleId: string, options: {
  force?: boolean;
}): Promise<void> {
  const { force = false } = options;
  
  logger.title(`删除规则: ${ruleId}`);
  
  try {
    // 初始化引擎
    const engine = new RuleForgeEngine();
    await engine.initialize();
    
    // 检查规则是否存在
    const rule = await engine.getRule(ruleId);
    
    if (!rule) {
      throw new Error(`规则不存在: ${ruleId}`);
    }
    
    // 显示规则信息
    logger.newline();
    logger.subtitle('规则信息');
    logger.keyValue('规则ID', rule.meta.id);
    logger.keyValue('规则名称', rule.meta.name);
    logger.keyValue('版本', rule.meta.version);
    logger.keyValue('置信度', rule.confidence);
    logger.keyValue('创建时间', new Date(rule.meta.created).toLocaleString('zh-CN'));
    
    // 确认删除
    if (!force) {
      logger.newline();
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '确定要删除这个规则吗？',
          default: false
        }
      ]);
      
      if (!confirm) {
        logger.info('删除操作已取消');
        return;
      }
    }
    
    // 执行删除
    logger.newline();
    logger.progress('删除规则...');
    
    await engine.deleteRule(ruleId);
    
    logger.success(`规则 ${ruleId} 已删除`);
    
    // 显示删除后的统计
    const allRules = await engine.getRules();
    logger.keyValue('剩余规则数', allRules.length);
    
  } catch (error) {
    logger.error('删除规则失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

// 导出命令配置（用于测试）
export const deleteCommandConfig = {
  name: 'delete',
  description: '删除指定规则',
  options: [
    { flags: '--force', description: '不询问确认' }
  ]
};