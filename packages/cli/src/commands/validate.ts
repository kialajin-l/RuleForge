/**
 * validate 命令：验证 YAML 文件是否符合 REP v0.2
 */

import fs from 'fs/promises';
import path from 'path';
import { RuleValidator } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { renderValidationTable } from '../utils/table.js';
import yaml from 'js-yaml';

/**
 * 获取规则的 schema 版本
 */
function getSchemaVersion(rule: Record<string, unknown>): string {
  return (rule['schemaVersion'] as string) ?? '0.1';
}

/**
 * 判断是否为 v0.2+ 格式
 */
function isV02(rule: Record<string, unknown>): boolean {
  const v = getSchemaVersion(rule);
  return v.startsWith('0.2') || v.startsWith('1.');
}

/**
 * validate 命令处理函数
 */
export async function validateCommand(file: string, options: {
  strict?: boolean;
  fix?: boolean;
}): Promise<void> {
  const { strict = false, fix = false } = options;
  
  logger.title('RuleForge 规则验证 (REP v0.2)');
  
  try {
    // 解析文件路径
    const filePath = path.resolve(process.cwd(), file);
    const fileExists = await checkFileExists(filePath);
    
    if (!fileExists) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    logger.keyValue('验证文件', filePath);
    logger.keyValue('严格模式', strict ? '是' : '否');
    logger.keyValue('自动修复', fix ? '是' : '否');
    logger.newline();
    
    // 读取文件内容
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 解析 YAML
    let rule: Record<string, unknown>;
    
    try {
      rule = yaml.load(content) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`YAML 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    if (!rule) {
      throw new Error('文件内容为空或无效');
    }
    
    // 检测 schema 版本
    const schemaVersion = getSchemaVersion(rule);
    const v02 = isV02(rule);
    
    logger.keyValue('Schema 版本', schemaVersion);
    logger.keyValue('格式类型', v02 ? 'REP v0.2' : 'REP v0.1 (兼容模式)');
    logger.newline();
    
    // 验证规则
    const validator = RuleValidator.createStandardValidator();
    const validationOptions = { strict };
    const result = validator.validate(rule, validationOptions);
    
    // 显示验证结果
    const meta = rule['meta'] as Record<string, unknown> | undefined;
    const validationTable = renderValidationTable([{
      ruleId: (meta?.['id'] as string) || '未知',
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      description: (meta?.['description'] as string) || '无描述'
    }]);
    
    console.log(validationTable);
    
    // 显示 schema 版本信息
    logger.newline();
    logger.subtitle('Schema 信息:');
    logger.keyValue('  版本', schemaVersion);
    logger.keyValue('  格式', v02 ? 'REP v0.2' : 'REP v0.1');
    
    if (v02) {
      // 显示 v0.2 特有字段
      const ruleObj = rule as Record<string, unknown>;
      const metaObj = ruleObj['meta'] as Record<string, unknown> | undefined;
      
      if (metaObj?.['scene']) {
        logger.keyValue('  场景', metaObj['scene']);
      }
      if (metaObj?.['tags']) {
        logger.keyValue('  标签', (metaObj['tags'] as string[]).join(', '));
      }
      if (metaObj?.['source']) {
        logger.keyValue('  来源', metaObj['source']);
      }
      if (ruleObj['priority']) {
        logger.keyValue('  优先级', ruleObj['priority'] as string);
      }
    }
    
    // 显示详细错误和警告
    if (result.errors.length > 0) {
      logger.newline();
      logger.subtitle('错误详情:');
      
      for (const error of result.errors) {
        logger.item(`❌ ${error}`);
      }
    }
    
    if (result.warnings.length > 0) {
      logger.newline();
      logger.subtitle('警告详情:');
      
      for (const warning of result.warnings) {
        logger.item(`⚠️ ${warning}`);
      }
    }
    
    // 自动修复
    if (fix && (!result.valid || result.warnings.length > 0)) {
      logger.newline();
      logger.progress('尝试自动修复...');
      
      const fixedRule = await attemptFix(rule, result);
      
      if (fixedRule) {
        const fixedContent = yaml.dump(fixedRule, { indent: 2 });
        await fs.writeFile(filePath, fixedContent);
        logger.success('规则已修复并保存');
        
        // 重新验证修复后的规则
        const revalidation = validator.validate(fixedRule, validationOptions);
        
        if (revalidation.valid && revalidation.warnings.length === 0) {
          logger.success('修复后验证通过！');
        } else {
          logger.warn('修复后仍有问题，请手动检查');
        }
      } else {
        logger.warn('无法自动修复，请手动修改');
      }
    }
    
    // 设置退出码
    if (!result.valid || (strict && result.warnings.length > 0)) {
      process.exit(3); // 验证失败
    }
    
    if (result.valid) {
      logger.success('规则验证通过！');
    }
    
  } catch (error) {
    logger.error('验证失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

/**
 * 尝试自动修复规则
 */
async function attemptFix(rule: Record<string, unknown>, _validationResult: unknown): Promise<Record<string, unknown> | null> {
  const fixedRule = { ...rule };
  
  // 修复常见问题
  if (!fixedRule['meta']) {
    fixedRule['meta'] = {};
  }
  
  const meta = fixedRule['meta'] as Record<string, unknown>;
  
  if (!meta['id']) {
    meta['id'] = `rule-${Date.now()}`;
  }
  
  if (!meta['version']) {
    meta['version'] = '1.0.0';
  }
  
  if (!meta['created']) {
    meta['created'] = new Date().toISOString();
  }
  
  if (!meta['updated']) {
    meta['updated'] = new Date().toISOString();
  }
  
  if (!fixedRule['confidence']) {
    fixedRule['confidence'] = 0.7;
  }
  
  // 确保 schemaVersion 存在
  if (!fixedRule['schemaVersion']) {
    fixedRule['schemaVersion'] = '0.2';
  }
  
  return fixedRule;
}

/**
 * 检查文件是否存在
 */
async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 导出命令配置（用于测试）
export const validateCommandConfig = {
  name: 'validate',
  description: '验证 YAML 文件是否符合 REP v0.2',
  options: [
    { flags: '--strict', description: '严格模式（警告也视为错误）' },
    { flags: '--fix', description: '自动修复可修复的问题' }
  ]
};
