/**
 * RuleStore 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RuleStore } from '../src/storage/rule-store';
import { RuleYAML } from '../src/types/rule-schema';
import { promises as fs } from 'fs';
import path from 'path';

const testRulesDir = path.join(__dirname, 'test-rules');

const sampleRule: RuleYAML = {
  meta: {
    id: 'test-rule-001',
    name: '测试规则',
    version: '1.0.0',
    description: '这是一个测试规则',
    authors: ['test-author'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  rule: {
    trigger: {
      type: 'file_pattern',
      pattern: '*.ts',
      file_types: ['typescript'],
      context: '文件模式匹配'
    },
    condition: '文件包含特定模式',
    suggestions: [
      {
        description: '建议优化代码结构',
        code: '// 优化代码示例'
      }
    ]
  },
  compatibility: {
    languages: ['typescript'],
    frameworks: ['react'],
    min_version: '1.0.0',
    max_version: '2.0.0'
  },
  confidence: 0.85
};

describe('RuleStore', () => {
  let ruleStore: RuleStore;
  
  beforeEach(async () => {
    ruleStore = new RuleStore({
      rulesDir: testRulesDir,
      maxVersions: 3,
      backupEnabled: true,
      autoValidate: false
    });
    
    await ruleStore.initialize();
  });
  
  afterEach(async () => {
    try {
      await fs.rm(testRulesDir, { recursive: true, force: true });
    } catch {
      // 忽略删除错误
    }
  });
  
  it('应该初始化规则库', async () => {
    const rulesDirExists = await fs.access(testRulesDir).then(() => true).catch(() => false);
    const versionsDirExists = await fs.access(path.join(testRulesDir, 'versions')).then(() => true).catch(() => false);
    
    expect(rulesDirExists).toBe(true);
    expect(versionsDirExists).toBe(true);
  });
  
  it('应该保存和加载规则', async () => {
    await ruleStore.save(sampleRule);
    
    const loadedRule = await ruleStore.load('test-rule-001');
    
    expect(loadedRule).not.toBeNull();
    expect(loadedRule?.meta.id).toBe('test-rule-001');
    expect(loadedRule?.meta.name).toBe('测试规则');
    expect(loadedRule?.confidence).toBe(0.85);
  });
  
  it('应该检查规则是否存在', async () => {
    expect(await ruleStore.exists('test-rule-001')).toBe(false);
    
    await ruleStore.save(sampleRule);
    
    expect(await ruleStore.exists('test-rule-001')).toBe(true);
  });
  
  it('应该删除规则', async () => {
    await ruleStore.save(sampleRule);
    expect(await ruleStore.exists('test-rule-001')).toBe(true);
    
    await ruleStore.delete('test-rule-001');
    expect(await ruleStore.exists('test-rule-001')).toBe(false);
  });
  
  it('应该列出所有规则', async () => {
    const rule1 = { ...sampleRule, meta: { ...sampleRule.meta, id: 'rule-1' } };
    const rule2 = { ...sampleRule, meta: { ...sampleRule.meta, id: 'rule-2' } };
    const rule3 = { ...sampleRule, meta: { ...sampleRule.meta, id: 'rule-3' } };
    
    await ruleStore.save(rule1);
    await ruleStore.save(rule2);
    await ruleStore.save(rule3);
    
    const rules = await ruleStore.list();
    
    expect(rules).toHaveLength(3);
    expect(rules.map(r => r.meta.id)).toContain('rule-1');
    expect(rules.map(r => r.meta.id)).toContain('rule-2');
    expect(rules.map(r => r.meta.id)).toContain('rule-3');
  });
  
  it('应该支持规则过滤', async () => {
    const tsRule = { 
      ...sampleRule, 
      meta: { ...sampleRule.meta, id: 'ts-rule' },
      compatibility: { ...sampleRule.compatibility, languages: ['typescript'] }
    };
    
    const jsRule = { 
      ...sampleRule, 
      meta: { ...sampleRule.meta, id: 'js-rule' },
      compatibility: { ...sampleRule.compatibility, languages: ['javascript'] }
    };
    
    await ruleStore.save(tsRule);
    await ruleStore.save(jsRule);
    
    const tsRules = await ruleStore.list({ language: 'typescript' });
    const jsRules = await ruleStore.list({ language: 'javascript' });
    
    expect(tsRules).toHaveLength(1);
    expect(tsRules[0].meta.id).toBe('ts-rule');
    
    expect(jsRules).toHaveLength(1);
    expect(jsRules[0].meta.id).toBe('js-rule');
  });
  
  it('应该创建版本备份', async () => {
    await ruleStore.save(sampleRule);
    
    const versions = await ruleStore.getVersions('test-rule-001');
    
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0].version).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
  });
  
  it('应该支持版本回滚', async () => {
    // 保存初始版本
    const initialRule = { ...sampleRule, confidence: 0.8 };
    await ruleStore.save(initialRule);
    
    // 更新规则
    const updatedRule = { ...sampleRule, confidence: 0.9 };
    await ruleStore.save(updatedRule);
    
    // 获取版本列表
    const versions = await ruleStore.getVersions('test-rule-001');
    expect(versions.length).toBe(2);
    
    // 回滚到第一个版本
    await ruleStore.rollback('test-rule-001', versions[1].version);
    
    const rolledBackRule = await ruleStore.load('test-rule-001');
    expect(rolledBackRule?.confidence).toBe(0.8);
  });
  
  it('应该批量导入规则', async () => {
    const rules: RuleYAML[] = [
      { ...sampleRule, meta: { ...sampleRule.meta, id: 'rule-1' } },
      { ...sampleRule, meta: { ...sampleRule.meta, id: 'rule-2' } },
      { ...sampleRule, meta: { ...sampleRule.meta, id: 'rule-3' } }
    ];
    
    const result = await ruleStore.importRules(rules);
    
    expect(result.total).toBe(3);
    expect(result.success).toBe(3);
    expect(result.failed).toBe(0);
    
    const storedRules = await ruleStore.list();
    expect(storedRules).toHaveLength(3);
  });
  
  it('应该检测规则冲突', async () => {
    await ruleStore.save(sampleRule);
    
    // 尝试保存相同 ID 的规则
    const conflictRule = { ...sampleRule, confidence: 0.9 };
    
    const conflictResult = await ruleStore['detectConflicts'](conflictRule);
    
    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflicts.length).toBeGreaterThan(0);
    expect(conflictResult.conflicts[0].type).toBe('id');
  });
  
  it('应该验证所有规则', async () => {
    const validRule = { ...sampleRule, meta: { ...sampleRule.meta, id: 'valid-rule' } };
    
    await ruleStore.save(validRule);
    
    const report = await ruleStore.validateAll();
    
    expect(report.total).toBe(1);
    expect(report.valid).toBe(1);
    expect(report.invalid).toBe(0);
  });
  
  it('应该获取规则统计信息', async () => {
    const rule1 = { 
      ...sampleRule, 
      meta: { ...sampleRule.meta, id: 'rule-1' },
      compatibility: { ...sampleRule.compatibility, languages: ['typescript'] }
    };
    
    const rule2 = { 
      ...sampleRule, 
      meta: { ...sampleRule.meta, id: 'rule-2' },
      compatibility: { ...sampleRule.compatibility, languages: ['javascript'] }
    };
    
    await ruleStore.save(rule1);
    await ruleStore.save(rule2);
    
    const stats = await ruleStore.getStatistics();
    
    expect(stats.totalRules).toBe(2);
    expect(stats.languages).toContain('typescript');
    expect(stats.languages).toContain('javascript');
    expect(stats.averageConfidence).toBeCloseTo(0.85, 2);
  });
  
  it('应该搜索规则', async () => {
    const searchableRule = { 
      ...sampleRule, 
      meta: { 
        ...sampleRule.meta, 
        id: 'search-rule',
        name: '搜索测试规则',
        description: '这是一个包含搜索关键词的规则'
      },
      rule: {
        ...sampleRule.rule,
        condition: '条件包含搜索关键词'
      }
    };
    
    await ruleStore.save(searchableRule);
    
    const results = await ruleStore.search('搜索');
    
    expect(results).toHaveLength(1);
    expect(results[0].meta.id).toBe('search-rule');
  });
  
  it('应该清理旧版本', async () => {
    // 保存多个版本
    for (let i = 0; i < 5; i++) {
      const versionRule = { 
        ...sampleRule, 
        confidence: 0.7 + i * 0.05 
      };
      
      // 模拟不同时间保存
      await new Promise(resolve => setTimeout(resolve, 100));
      await ruleStore.save(versionRule);
    }
    
    const versions = await ruleStore.getVersions('test-rule-001');
    
    // 应该只保留最近的 3 个版本（maxVersions=3）
    expect(versions.length).toBeLessThanOrEqual(3);
  });
});