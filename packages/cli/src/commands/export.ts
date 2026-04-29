/**
 * export 命令：将规则库导出为 .zip 文件
 */

import fs from 'fs/promises';
import path from 'path';
import { RuleForgeEngine } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { renderKeyValueTable } from '../utils/table.js';

/**
 * export 命令处理函数
 */
export async function exportCommand(options: {
  output?: string;
  scene?: string;
  tag?: string[];
  priority?: string;
  language?: string;
  framework?: string;
  format?: string;
}): Promise<void> {
  const {
    output,
    scene,
    tag = [],
    priority,
    language,
    framework,
    format = 'yaml'
  } = options;

  logger.title('RuleForge 规则导出');

  try {
    // 初始化引擎
    const engine = new RuleForgeEngine();
    await engine.initialize();

    // 构建过滤器
    const filters: Record<string, unknown> = {};

    if (scene) {
      filters.scene = scene;
      logger.keyValue('场景过滤', scene);
    }

    if (tag.length > 0) {
      filters.tags = tag;
      logger.keyValue('标签过滤', tag.join(', '));
    }

    if (priority) {
      if (!['global', 'project', 'session'].includes(priority)) {
        throw new Error(`无效的优先级: ${priority}（可选: global, project, session）`);
      }
      filters.priority = priority;
      logger.keyValue('优先级过滤', priority);
    }

    if (language) {
      filters.language = language;
      logger.keyValue('语言过滤', language);
    }

    if (framework) {
      filters.framework = framework;
      logger.keyValue('框架过滤', framework);
    }

    logger.keyValue('导出格式', format);
    logger.newline();

    // 获取所有规则
    logger.progress('加载规则...');
    const allRules = await engine.getRules();

    if (allRules.length === 0) {
      logger.warn('规则库为空，没有可导出的规则');
      return;
    }

    // 应用过滤器
    let filteredRules = [...allRules];

    if (filters.scene) {
      filteredRules = filteredRules.filter(rule =>
        rule.meta.scene === filters.scene ||
        rule.compatibility.scenes?.includes(filters.scene as string)
      );
    }

    if (filters.tags && Array.isArray(filters.tags)) {
      const tags = filters.tags as string[];
      filteredRules = filteredRules.filter(rule =>
        rule.meta.tags?.some(t => tags.includes(t))
      );
    }

    if (filters.priority) {
      filteredRules = filteredRules.filter(rule =>
        rule.priority === filters.priority
      );
    }

    if (filters.language) {
      filteredRules = filteredRules.filter(rule =>
        rule.compatibility.languages.includes(filters.language as string)
      );
    }

    if (filters.framework) {
      filteredRules = filteredRules.filter(rule =>
        rule.compatibility.frameworks?.includes(filters.framework as string)
      );
    }

    if (filteredRules.length === 0) {
      logger.warn('没有匹配的规则可导出');
      return;
    }

    logger.keyValue('匹配规则数', filteredRules.length);
    logger.newline();

    // 生成输出路径
    const timestamp = Date.now();
    const outputPath = path.resolve(
      process.cwd(),
      output || `ruleforge-export-${timestamp}.zip`
    );

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // 动态导入 archiver
    logger.progress('正在打包规则...');
    const archiver = (await import('archiver')).default;

    const archive = archiver('zip', { zlib: { level: 9 } });

    // 创建输出流
    const outputHandle = await fs.open(outputPath, 'w');
    const outputStream = outputHandle.createWriteStream();
    archive.pipe(outputStream);

    // 生成 manifest
    const manifest = {
      formatVersion: '0.2',
      name: 'ruleforge-export',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      ruleCount: filteredRules.length,
      filters: {
        scene: scene || null,
        tags: tag.length > 0 ? tag : null,
        priority: priority || null,
        language: language || null,
        framework: framework || null
      },
      rules: filteredRules.map(rule => ({
        id: rule.meta.id,
        name: rule.meta.name,
        version: rule.meta.version,
        schemaVersion: rule.schemaVersion || '0.1'
      }))
    };

    // 添加 manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // 添加规则文件
    if (format === 'yaml') {
      const yaml = (await import('js-yaml')).default;

      for (const rule of filteredRules) {
        const yamlContent = yaml.dump(rule, { indent: 2, lineWidth: -1 });
        archive.append(yamlContent, { name: `rules/${rule.meta.id}.yaml` });
      }
    } else {
      // JSON 格式
      for (const rule of filteredRules) {
        const jsonContent = JSON.stringify(rule, null, 2);
        archive.append(jsonContent, { name: `rules/${rule.meta.id}.json` });
      }
    }

    // 完成归档
    await archive.finalize();

    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      outputStream.on('close', resolve);
      outputStream.on('error', reject);
    });

    await outputHandle.close();

    // 获取文件大小
    const stats = await fs.stat(outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(1);

    logger.newline();
    logger.success('规则导出完成！');
    logger.newline();

    // 显示导出统计
    const statsTable = renderKeyValueTable({
      '输出文件': outputPath,
      '文件大小': `${fileSizeKB} KB`,
      '导出规则数': filteredRules.length,
      '总规则数': allRules.length,
      '导出格式': format,
      '包含 Manifest': '是'
    }, '导出统计');

    console.log(statsTable);

    logger.newline();
    logger.item(`使用 ruleforge import ${path.basename(outputPath)} 导入此规则包`);

  } catch (error) {
    logger.error('导出失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}
