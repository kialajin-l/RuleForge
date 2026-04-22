/**
 * validate 命令：验证 YAML 文件是否符合 REP v0.1
 */
// import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { RuleValidator } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { renderValidationTable } from '../utils/table.js';
/**
 * validate 命令处理函数
 */
export async function validateCommand(file, options) {
    const { strict = false, fix = false } = options;
    logger.title('RuleForge 规则验证');
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
        const yaml = require('js-yaml');
        let rule;
        try {
            rule = yaml.load(content);
        }
        catch (error) {
            throw new Error(`YAML 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        if (!rule) {
            throw new Error('文件内容为空或无效');
        }
        // 验证规则
        const validator = RuleValidator.createStandardValidator();
        const validationOptions = { strict };
        const result = validator.validate(rule, validationOptions);
        // 显示验证结果
        const validationTable = renderValidationTable([{
                ruleId: rule.meta?.id || '未知',
                valid: result.valid,
                errors: result.errors,
                warnings: result.warnings,
                description: rule.meta?.description || '无描述'
            }]);
        console.log(validationTable);
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
                }
                else {
                    logger.warn('修复后仍有问题，请手动检查');
                }
            }
            else {
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
    }
    catch (error) {
        logger.error('验证失败:', error instanceof Error ? error.message : '未知错误');
        throw error;
    }
}
/**
 * 尝试自动修复规则
 */
async function attemptFix(rule, _validationResult) {
    const fixedRule = { ...rule };
    // 修复常见问题
    if (!fixedRule.meta) {
        fixedRule.meta = {};
    }
    if (!fixedRule.meta.id) {
        fixedRule.meta.id = `rule-${Date.now()}`;
    }
    if (!fixedRule.meta.version) {
        fixedRule.meta.version = '1.0.0';
    }
    if (!fixedRule.meta.created_at) {
        fixedRule.meta.created_at = new Date().toISOString();
    }
    if (!fixedRule.meta.updated_at) {
        fixedRule.meta.updated_at = new Date().toISOString();
    }
    if (!fixedRule.confidence) {
        fixedRule.confidence = 0.7;
    }
    return fixedRule;
}
/**
 * 检查文件是否存在
 */
async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
// 导出命令配置（用于测试）
export const validateCommandConfig = {
    name: 'validate',
    description: '验证 YAML 文件是否符合 REP v0.1',
    options: [
        { flags: '--strict', description: '严格模式（警告也视为错误）' },
        { flags: '--fix', description: '自动修复可修复的问题' }
    ]
};
//# sourceMappingURL=validate.js.map