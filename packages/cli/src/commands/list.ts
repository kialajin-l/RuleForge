/**
 * list 命令：列出本地规则库中的所有规则
 */

import { RuleForgeEngine } from '@ruleforge/core';
import { logger } from '../utils/logger.js';
import { renderRulesTable, renderStatsTable } from '../utils/table.js';

/**
 * list 命令处理函数
 */
export async function listCommand(options: {
  format?: string;
  tag?: string[];
  framework?: string;
  language?: string;
  minConfidence?: string;
  scene?: string;
  priority?: string;
  source?: string;
}): Promise<void> {
  const {
    format = 'table',
    tag = [],
    framework,
    language,
    minConfidence,
    scene,
    priority,
    source
  } = options;
  
  logger.title('RuleForge 规则列表');
  
  try {
    // 初始化引擎
    const engine = new RuleForgeEngine();
    await engine.initialize();
    
    // 构建过滤器
    const filters: Record<string, unknown> = {};
    
    if (framework) {
      filters.framework = framework;
      logger.keyValue('框架过滤', framework);
    }
    
    if (language) {
      filters.language = language;
      logger.keyValue('语言过滤', language);
    }
    
    if (minConfidence) {
      filters.minConfidence = parseFloat(minConfidence);
      logger.keyValue('最小置信度', filters.minConfidence);
    }
    
    if (tag.length > 0) {
      filters.tags = tag;
      logger.keyValue('标签过滤', tag.join(', '));
    }

    if (scene) {
      filters.scene = scene;
      logger.keyValue('场景过滤', scene);
    }

    if (priority) {
      if (!['global', 'project', 'session'].includes(priority)) {
        throw new Error(`无效的优先级: ${priority}（可选: global, project, session）`);
      }
      filters.priority = priority;
      logger.keyValue('优先级过滤', priority);
    }

    if (source) {
      filters.source = source;
      logger.keyValue('来源过滤', source);
    }
    
    logger.newline();
    
    // 获取规则
    logger.progress('加载规则...');
    const rules = await engine.getRules();
    
    if (rules.length === 0) {
      logger.warn('规则库为空');
      return;
    }
    
    // 应用过滤器
    let filteredRules = [...rules];
    
    if (filters.framework) {
      filteredRules = filteredRules.filter(rule => 
        rule.compatibility.frameworks?.includes(filters.framework as string)
      );
    }
    
    if (filters.language) {
      filteredRules = filteredRules.filter(rule => 
        rule.compatibility.languages.includes(filters.language as string)
      );
    }
    
    if (filters.minConfidence) {
      filteredRules = filteredRules.filter(rule => 
        (rule.confidence ?? 0) >= (filters.minConfidence as number)
      );
    }
    
    if (filters.tags && Array.isArray(filters.tags)) {
      const tags = filters.tags as string[];
      filteredRules = filteredRules.filter(rule => {
        return rule.meta.tags?.some(t => tags.includes(t));
      });
    }

    if (filters.scene) {
      filteredRules = filteredRules.filter(rule =>
        rule.meta.scene === filters.scene ||
        rule.compatibility.scenes?.includes(filters.scene as string)
      );
    }

    if (filters.priority) {
      filteredRules = filteredRules.filter(rule =>
        rule.priority === filters.priority
      );
    }

    if (filters.source) {
      filteredRules = filteredRules.filter(rule =>
        rule.meta.source === filters.source
      );
    }
    
    if (filteredRules.length === 0) {
      logger.warn('没有匹配的规则');
      return;
    }
    
    // 准备表格数据
    const tableData = filteredRules.map(rule => ({
      id: rule.meta.id,
      name: rule.meta.name,
      version: rule.meta.version,
      confidence: rule.confidence ?? 0,
      language: rule.compatibility.languages[0] ?? '',
      framework: rule.compatibility.frameworks?.[0] ?? '',
      scene: rule.meta.scene ?? '',
      priority: rule.priority ?? '',
      updatedAt: rule.meta.updated ?? ''
    }));
    
    // 根据格式输出
    switch (format) {
      case 'table':
        const table = renderRulesTable(tableData);
        console.log(table);
        break;
        
      case 'json':
        console.log(JSON.stringify(filteredRules, null, 2));
        break;
        
      case 'yaml': {
        const yaml = (await import('js-yaml')).default;
        console.log(yaml.dump(filteredRules, { indent: 2 }));
        break;
      }
        
      default:
        throw new Error(`不支持的格式: ${format}`);
    }
    
    // 显示统计信息
    if (format === 'table') {
      logger.newline();
      
      const statsTable = renderStatsTable({
        totalRules: filteredRules.length,
        averageConfidence: filteredRules.reduce((sum, r) => sum + (r.confidence ?? 0), 0) / filteredRules.length,
        languages: [...new Set(filteredRules.map(r => r.compatibility.languages).flat())],
        frameworks: [...new Set(filteredRules.map(r => r.compatibility.frameworks || []).flat())],
        lastUpdated: new Date().toISOString()
      });
      
      console.log(statsTable);
    }
    
  } catch (error) {
    logger.error('列出规则失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

// 导出命令配置（用于测试）
export const listCommandConfig = {
  name: 'list',
  description: '列出本地规则库中的所有规则',
  options: [
    { flags: '--format <type>', description: '输出格式 (table/json/yaml)' },
    { flags: '--tag <tags...>', description: '按标签过滤' },
    { flags: '--framework <fw>', description: '按框架过滤' },
    { flags: '--language <lang>', description: '按语言过滤' },
    { flags: '--min-confidence <number>', description: '最小置信度' },
    { flags: '--scene <scene>', description: '按场景过滤' },
    { flags: '--priority <priority>', description: '按优先级过滤 (global/project/session)' },
    { flags: '--source <source>', description: '按来源过滤' }
  ]
};
