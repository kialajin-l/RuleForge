/**
 * import 命令：从 .zip 或 .yaml 文件导入规则
 */

import fs from 'fs/promises';
import path from 'path';
import { RuleForgeEngine, RuleValidator } from '@ruleforge/core';
import type { RuleYAML } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { renderKeyValueTable, renderValidationTable } from '../utils/table.js';

/**
 * import 命令处理函数
 */
export async function importCommand(file: string, options: {
  strategy?: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<void> {
  const {
    strategy = 'merge',
    dryRun = false,
    force = false
  } = options;

  logger.title('RuleForge 规则导入');

  try {
    // 解析文件路径
    const filePath = path.resolve(process.cwd(), file);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`文件不存在: ${filePath}`);
    }

    logger.keyValue('导入文件', filePath);
    logger.keyValue('导入策略', strategy);
    logger.keyValue('强制模式', force ? '是' : '否');
    logger.keyValue('干运行模式', dryRun ? '是' : '否');
    logger.newline();

    // 初始化引擎
    const engine = new RuleForgeEngine();
    await engine.initialize();

    // 根据文件类型解析规则
    let rulesToImport: RuleYAML[] = [];
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.zip') {
      // ZIP 文件导入
      logger.progress('解压规则包...');
      rulesToImport = await importFromZip(filePath);
    } else if (ext === '.yaml' || ext === '.yml') {
      // 单个 YAML 文件导入
      logger.progress('读取 YAML 文件...');
      const rule = await importFromYaml(filePath);
      if (rule) {
        rulesToImport = [rule];
      }
    } else if (ext === '.json') {
      // 单个 JSON 文件导入
      logger.progress('读取 JSON 文件...');
      const rule = await importFromJson(filePath);
      if (rule) {
        rulesToImport = [rule];
      }
    } else {
      throw new Error(`不支持的文件格式: ${ext}（支持 .zip, .yaml, .yml, .json）`);
    }

    if (rulesToImport.length === 0) {
      logger.warn('没有可导入的规则');
      return;
    }

    logger.keyValue('待导入规则数', rulesToImport.length);
    logger.newline();

    // 验证规则（除非 --force 跳过验证）
    if (!force) {
      logger.progress('验证规则...');
      const validator = RuleValidator.createStandardValidator();
      const validationResults = validator.validateBatch(rulesToImport);

      const validRules: RuleYAML[] = [];
      const invalidRules: Array<{ rule: RuleYAML; errors: string[] }> = [];

      for (let i = 0; i < rulesToImport.length; i++) {
        const rule = rulesToImport[i]!;
        const result = validationResults[i];
        if (result && result.valid) {
          validRules.push(rule);
        } else if (result) {
          invalidRules.push({ rule, errors: result.errors });
        }
      }

      if (invalidRules.length > 0) {
        logger.newline();
        logger.warn(`${invalidRules.length} 个规则验证失败：`);

        for (const { rule, errors } of invalidRules) {
          logger.item(`${rule.meta.id}: ${errors.join(', ')}`);
        }

        logger.newline();
        logger.info(`将跳过 ${invalidRules.length} 个无效规则，导入 ${validRules.length} 个有效规则`);

        rulesToImport = validRules;
      }

      // 显示验证结果表格
      if (rulesToImport.length > 0) {
        const validationTable = renderValidationTable(
          validationResults.slice(0, rulesToImport.length).map((result, index) => {
            const rule = rulesToImport[index];
            return {
              ruleId: rule?.meta.id || 'unknown',
              valid: result.valid,
              errors: result.errors,
              warnings: result.warnings,
              description: rule?.meta.description || '无描述'
            };
          })
        );
        console.log(validationTable);
      }
    }

    if (rulesToImport.length === 0) {
      logger.warn('没有有效的规则可导入');
      return;
    }

    logger.newline();

    // 干运行模式：仅显示，不实际导入
    if (dryRun) {
      logger.subtitle('干运行模式 - 以下规则将被导入：');

      for (const rule of rulesToImport) {
        logger.item(`${rule.meta.id} (${rule.meta.name} v${rule.meta.version})`);
      }

      logger.newline();
      logger.warn('干运行模式：规则未实际导入');
      return;
    }

    // 执行导入
    logger.progress('导入规则...');

    let importResult: { total: number; success: number; failed: number; errors: Array<{ ruleId: string; error: string }> };

    if (strategy === 'overwrite') {
      // 覆盖策略：直接保存（会覆盖已有规则）
      importResult = { total: rulesToImport.length, success: 0, failed: 0, errors: [] };

      for (const rule of rulesToImport) {
        try {
          await engine.saveRule(rule);
          importResult.success++;
        } catch (error) {
          importResult.failed++;
          importResult.errors.push({
            ruleId: rule.meta.id,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }
    } else {
      // 合并策略（默认）：使用引擎的 importRules 方法
      importResult = await engine.importRules(rulesToImport);
    }

    logger.newline();
    logger.success('规则导入完成！');
    logger.newline();

    // 显示导入结果
    const resultTable = renderKeyValueTable({
      '导入策略': strategy,
      '总规则数': importResult.total,
      '成功导入': importResult.success,
      '导入失败': importResult.failed,
      '跳过规则': rulesToImport.length < importResult.total
        ? importResult.total - rulesToImport.length
        : 0
    }, '导入结果');

    console.log(resultTable);

    // 显示失败详情
    if (importResult.errors.length > 0) {
      logger.newline();
      logger.subtitle('失败详情：');

      for (const error of importResult.errors) {
        logger.item(`${error.ruleId}: ${error.error}`);
      }
    }

    logger.newline();
    logger.item('使用 ruleforge list 查看已导入的规则');

  } catch (error) {
    logger.error('导入失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

/**
 * 从 ZIP 文件导入规则
 */
async function importFromZip(zipPath: string): Promise<RuleYAML[]> {
  const rules: RuleYAML[] = [];

  // 动态导入 unzipper
  const unzipper = (await import('unzipper')).default;

  const zip = await unzipper.Open.file(zipPath);

  // 查找 rules 目录下的文件
  const ruleFiles = zip.files.filter(f =>
    f.type !== 'Directory' &&
    (f.path.endsWith('.yaml') || f.path.endsWith('.yml') || f.path.endsWith('.json'))
  );

  for (const file of ruleFiles) {
    try {
      const content = await file.buffer();
      const text = content.toString('utf-8');

      if (file.path.endsWith('.json')) {
        const rule = JSON.parse(text) as RuleYAML;
        if (rule.meta && rule.rule) {
          rules.push(rule);
        }
      } else {
        const yaml = (await import('js-yaml')).default;
        const rule = yaml.load(text) as RuleYAML;
        if (rule && rule.meta && rule.rule) {
          rules.push(rule);
        }
      }
    } catch (error) {
      logger.warn(`解析文件失败: ${file.path}`, error instanceof Error ? error.message : '未知错误');
    }
  }

  return rules;
}

/**
 * 从 YAML 文件导入单个规则
 */
async function importFromYaml(yamlPath: string): Promise<RuleYAML | null> {
  try {
    const content = await fs.readFile(yamlPath, 'utf-8');
    const yaml = (await import('js-yaml')).default;
    const rule = yaml.load(content) as RuleYAML;

    if (!rule || !rule.meta || !rule.rule) {
      logger.warn(`无效的规则文件: ${yamlPath}`);
      return null;
    }

    return rule;
  } catch (error) {
    logger.error(`读取 YAML 文件失败: ${yamlPath}`, error instanceof Error ? error.message : '未知错误');
    return null;
  }
}

/**
 * 从 JSON 文件导入单个规则
 */
async function importFromJson(jsonPath: string): Promise<RuleYAML | null> {
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const rule = JSON.parse(content) as RuleYAML;

    if (!rule || !rule.meta || !rule.rule) {
      logger.warn(`无效的规则文件: ${jsonPath}`);
      return null;
    }

    return rule;
  } catch (error) {
    logger.error(`读取 JSON 文件失败: ${jsonPath}`, error instanceof Error ? error.message : '未知错误');
    return null;
  }
}
