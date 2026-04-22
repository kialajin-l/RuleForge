/**
 * show 命令：显示指定规则的详细信息
 */

import { Command } from 'commander';
import { RuleForgeEngine } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { renderKeyValueTable } from '../utils/table.js';

/**
 * show 命令处理函数
 */
export async function showCommand(ruleId: string, options: {
  yaml?: boolean;
  stats?: boolean;
}): Promise<void> {
  const { yaml = false, stats = false } = options;
  
  logger.title(`规则详情: ${ruleId}`);
  
  try {
    // 初始化引擎
    const engine = new RuleForgeEngine();
    await engine.initialize();
    
    // 获取规则
    logger.progress('加载规则...');
    const rule = await engine.getRule(ruleId);
    
    if (!rule) {
      throw new Error(`规则不存在: ${ruleId}`);
    }
    
    // 显示基本信息
    logger.newline();
    logger.subtitle('基本信息');
    
    const basicInfo = {
      '规则ID': rule.meta.id,
      '规则名称': rule.meta.name,
      '版本': rule.meta.version,
      '描述': rule.meta.description || '无描述',
      '作者': rule.meta.authors?.join(', ') || '未知',
      '创建时间': new Date(rule.meta.created_at).toLocaleString('zh-CN'),
      '更新时间': new Date(rule.meta.updated_at).toLocaleString('zh-CN'),
      '置信度': rule.confidence
    };
    
    console.log(renderKeyValueTable(basicInfo));
    
    // 显示兼容性信息
    logger.newline();
    logger.subtitle('兼容性信息');
    
    const compatibilityInfo = {
      '支持语言': rule.compatibility.languages.join(', '),
      '支持框架': rule.compatibility.frameworks?.join(', ') || '无',
      '最低版本': rule.compatibility.min_version || '无限制',
      '最高版本': rule.compatibility.max_version || '无限制'
    };
    
    console.log(renderKeyValueTable(compatibilityInfo));
    
    // 显示规则内容
    logger.newline();
    logger.subtitle('规则内容');
    
    const ruleContent = {
      '触发类型': rule.rule.trigger.type,
      '触发模式': rule.rule.trigger.pattern,
      '文件类型': rule.rule.trigger.file_types?.join(', ') || '无限制',
      '触发上下文': rule.rule.trigger.context || '无',
      '条件数量': rule.rule.conditions.length,
      '建议数量': rule.rule.suggestions.length
    };
    
    console.log(renderKeyValueTable(ruleContent));
    
    // 显示条件详情
    if (rule.rule.conditions.length > 0) {
      logger.newline();
      logger.subtitle('条件详情');
      
      for (let i = 0; i < rule.rule.conditions.length; i++) {
        const condition = rule.rule.conditions[i];
        logger.item(`条件 ${i + 1}:`);
        logger.keyValue('  类型', condition?.type || '未知', 4);
        logger.keyValue('  条件', condition?.condition || '未知', 4);
        logger.keyValue('  是否取反', condition?.negated ? '是' : '否', 4);
      }
    }
    
    // 显示建议详情
    if (rule.rule.suggestions.length > 0) {
      logger.newline();
      logger.subtitle('建议详情');
      
      for (let i = 0; i < rule.rule.suggestions.length; i++) {
        const suggestion = rule.rule.suggestions[i];
        logger.item(`建议 ${i + 1}:`);
        logger.keyValue('  描述', suggestion?.description || '无描述', 4);
        
        if (suggestion?.code) {
          logger.keyValue('  代码示例', '\n' + suggestion.code.split('\n').map(line => '      ' + line).join('\n'), 4);
        }
      }
    }
    
    // 显示完整的 YAML 内容
    if (yaml) {
      logger.newline();
      logger.subtitle('完整 YAML 内容');
      
      const yamlContent = require('js-yaml').dump(rule, { indent: 2 });
      console.log(yamlContent);
    }
    
    // 显示统计信息
    if (stats) {
      logger.newline();
      logger.subtitle('统计信息');
      
      const allRules = await engine.getRules();
      const similarRules = allRules.filter(r => 
        r.meta.id !== ruleId && 
        r.rule.trigger.pattern === rule.rule.trigger.pattern
      );
      
      const statsInfo = {
        '规则库总数': allRules.length,
        '相似规则数': similarRules.length,
        '置信度排名': `${allRules.filter(r => r.confidence > rule.confidence).length + 1}/${allRules.length}`,
        '创建天数': Math.floor((Date.now() - new Date(rule.meta.created).getTime()) / (1000 * 60 * 60 * 24))
      };
      
      console.log(renderKeyValueTable(statsInfo));
    }
    
    logger.newline();
    logger.success('规则详情显示完成');
    
  } catch (error) {
    logger.error('显示规则失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

// 导出命令配置（用于测试）
export const showCommandConfig = {
  name: 'show',
  description: '显示指定规则的详细信息',
  options: [
    { flags: '--yaml', description: '显示完整的 YAML 内容' },
    { flags: '--stats', description: '显示统计信息' }
  ]
};