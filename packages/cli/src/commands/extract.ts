/**
 * extract 命令：从日志文件提取候选规则
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { RuleForgeEngine } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { createProgressBar } from '../utils/progress.js';
import { renderValidationTable } from '../utils/table.js';

/**
 * extract 命令处理函数
 */
export async function extractCommand(options: {
  log?: string;
  output?: string;
  minConf?: string;
  dryRun?: boolean;
  json?: boolean;
}): Promise<void> {
  const {
    log = '.ruleforge/logs/',
    output = '.ruleforge/candidates/',
    minConf = '0.7',
    dryRun = false,
    json = false
  } = options;
  
  const minConfidence = parseFloat(minConf);
  
  if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    throw new Error('最小置信度必须是 0 到 1 之间的数字');
  }
  
  logger.title('RuleForge 规则提取');
  
  try {
    // 验证日志目录
    const logPath = path.resolve(process.cwd(), log);
    const logExists = await fileExists(logPath);
    
    if (!logExists) {
      throw new Error(`日志目录不存在: ${logPath}`);
    }
    
    logger.keyValue('日志目录', logPath);
    logger.keyValue('输出目录', path.resolve(process.cwd(), output));
    logger.keyValue('最小置信度', minConfidence);
    logger.keyValue('干运行模式', dryRun ? '是' : '否');
    logger.keyValue('JSON 输出', json ? '是' : '否');
    logger.newline();
    
    // 初始化 RuleForge 引擎
    logger.progress('初始化 RuleForge 引擎...');
    const engine = new RuleForgeEngine({
      minConfidence,
      autoSave: !dryRun
    });
    
    await engine.initialize();
    
    // 扫描日志文件
    logger.progress('扫描日志文件...');
    const logFiles = await scanLogFiles(logPath);
    
    if (logFiles.length === 0) {
      logger.warn('未找到日志文件，请检查日志目录');
      return;
    }
    
    logger.keyValue('找到日志文件', logFiles.length);
    
    // 创建进度条
    const progressBar = createProgressBar({
      title: '提取规则',
      total: logFiles.length
    });
    
    progressBar.start();
    
    let totalRules = 0;
    const extractionResults = [];
    
    // 处理每个日志文件
    for (let i = 0; i < logFiles.length; i++) {
      const logFile = logFiles[i];
      progressBar.update(i + 1, path.basename(logFile));
      
      try {
        const sessionOptions = {
          logFiles: [logFile],
          minConfidence
        };
        
        const result = await engine.extractOnly(sessionOptions);
        
        if (result.rules.length > 0) {
          extractionResults.push({
            file: logFile,
            rules: result.rules,
            statistics: result.statistics
          });
          
          totalRules += result.rules.length;
          
          logger.verbose(`从 ${path.basename(logFile)} 提取了 ${result.rules.length} 个规则`);
        }
        
      } catch (error) {
        logger.warn(`处理文件失败: ${path.basename(logFile)}`, error instanceof Error ? error.message : '未知错误');
      }
    }
    
    progressBar.complete();
    
    if (totalRules === 0) {
      logger.warn('未提取到任何规则');
      return;
    }
    
    logger.newline();
    logger.success(`提取完成！共找到 ${totalRules} 个候选规则`);
    
    // 验证规则
    logger.progress('验证提取的规则...');
    const allRules = extractionResults.flatMap(result => result.rules);
    const validationResults = engine.validateOnly(allRules);
    
    const validRules = validationResults.filter(result => result.valid).length;
    const invalidRules = validationResults.filter(result => !result.valid).length;
    
    logger.keyValue('有效规则', validRules);
    logger.keyValue('无效规则', invalidRules);
    logger.keyValue('成功率', `${((validRules / totalRules) * 100).toFixed(1)}%`);
    
    // 显示验证结果表格
    if (!json) {
      const validationTable = renderValidationTable(validationResults.map((result, index) => ({
        ruleId: allRules[index].meta.id,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        description: allRules[index].meta.description
      })));
      
      console.log(validationTable);
    }
    
    // 格式化规则
    logger.progress('格式化规则...');
    const formattedResults = engine.formatOnly(allRules);
    
    // 保存规则文件（如果不是干运行模式）
    if (!dryRun) {
      logger.progress('保存规则文件...');
      const outputDir = path.resolve(process.cwd(), output);
      await fs.mkdir(outputDir, { recursive: true });
      
      const saveProgress = createProgressBar({
        title: '保存文件',
        total: formattedResults.length
      });
      
      saveProgress.start();
      
      for (let i = 0; i < formattedResults.length; i++) {
        const { yaml, fileName } = formattedResults[i];
        const filePath = path.join(outputDir, fileName);
        
        await fs.writeFile(filePath, yaml);
        saveProgress.update(i + 1, fileName);
      }
      
      saveProgress.complete();
      
      logger.success(`规则已保存到: ${outputDir}`);
    }
    
    // JSON 输出模式
    if (json) {
      const jsonOutput = {
        summary: {
          totalFiles: logFiles.length,
          totalRules: totalRules,
          validRules: validRules,
          invalidRules: invalidRules,
          successRate: (validRules / totalRules) * 100
        },
        files: extractionResults.map(result => ({
          file: path.basename(result.file),
          rules: result.rules.length,
          statistics: result.statistics
        })),
        rules: allRules.map((rule, index) => ({
          id: rule.meta.id,
          name: rule.meta.name,
          valid: validationResults[index].valid,
          confidence: rule.confidence,
          errors: validationResults[index].errors,
          warnings: validationResults[index].warnings
        }))
      };
      
      console.log(JSON.stringify(jsonOutput, null, 2));
    }
    
    // 输出统计信息
    if (!json) {
      logger.newline();
      logger.subtitle('提取统计:');
      
      for (const result of extractionResults) {
        const stats = result.statistics;
        logger.item(`${path.basename(result.file)}: ${result.rules.length} 个规则`);
        logger.keyValue('  提取时间', `${stats.extractionTime}ms`, 4);
        logger.keyValue('  处理文件', stats.totalFiles, 4);
        logger.keyValue('  处理命令', stats.totalCommands, 4);
        logger.keyValue('  发现模式', stats.patternsFound, 4);
      }
      
      logger.newline();
      
      if (dryRun) {
        logger.warn('干运行模式：规则未保存到文件系统');
        logger.item('使用 --dry-run=false 保存规则');
      }
    }
    
  } catch (error) {
    logger.error('提取失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

/**
 * 扫描日志目录中的文件
 */
async function scanLogFiles(logPath: string): Promise<string[]> {
  try {
    const stats = await fs.stat(logPath);
    
    if (stats.isFile()) {
      return [logPath];
    }
    
    if (stats.isDirectory()) {
      const files = await fs.readdir(logPath);
      const logFiles: string[] = [];
      
      for (const file of files) {
        const filePath = path.join(logPath, file);
        const fileStats = await fs.stat(filePath);
        
        if (fileStats.isFile() && (file.endsWith('.log') || file.endsWith('.json') || file.endsWith('.txt'))) {
          logFiles.push(filePath);
        }
      }
      
      return logFiles;
    }
    
    return [];
    
  } catch (error) {
    logger.warn('扫描日志文件失败:', error instanceof Error ? error.message : '未知错误');
    return [];
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 导出命令配置（用于测试）
export const extractCommandConfig = {
  name: 'extract',
  description: '从日志文件提取候选规则',
  options: [
    { flags: '--log <path>', description: '日志文件路径' },
    { flags: '--output <dir>', description: '输出目录' },
    { flags: '--min-conf <number>', description: '最小置信度' },
    { flags: '--dry-run', description: '仅显示，不保存文件' },
    { flags: '--json', description: '输出 JSON 格式' }
  ]
};