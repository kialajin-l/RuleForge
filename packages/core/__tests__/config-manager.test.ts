/**
 * ConfigManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager, RuleForgeConfig } from '../src/config/config-manager';
import { promises as fs } from 'fs';
import path from 'path';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigPath = path.join(__dirname, 'test-config.yaml');
  
  beforeEach(() => {
    configManager = new ConfigManager({
      configPath: testConfigPath,
      createDefault: false
    });
  });
  
  afterEach(async () => {
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // 忽略文件不存在的错误
    }
  });
  
  it('应该加载默认配置', async () => {
    const config = await configManager.load();
    
    expect(config.extraction.minConfidence).toBe(0.7);
    expect(config.privacy.autoRedact).toBe(true);
    expect(config.storage.localRulesDir).toBe('.ruleforge/rules');
    expect(config.output.format).toBe('yaml');
  });
  
  it('应该从项目配置文件加载配置', async () => {
    const projectConfig = {
      extraction: {
        minConfidence: 0.8,
        logPath: 'custom-logs'
      },
      output: {
        format: 'json'
      }
    };
    
    await fs.writeFile(testConfigPath, JSON.stringify(projectConfig));
    
    const config = await configManager.load();
    
    expect(config.extraction.minConfidence).toBe(0.8);
    expect(config.extraction.logPath).toBe('custom-logs');
    expect(config.output.format).toBe('json');
  });
  
  it('应该支持环境变量配置', async () => {
    process.env.RULEFORGE_MIN_CONFIDENCE = '0.9';
    process.env.RULEFORGE_LOG_PATH = 'env-logs';
    process.env.RULEFORGE_AUTO_REDACT = 'false';
    
    const config = await configManager.load();
    
    expect(config.extraction.minConfidence).toBe(0.9);
    expect(config.extraction.logPath).toBe('env-logs');
    expect(config.privacy.autoRedact).toBe(false);
    
    // 清理环境变量
    delete process.env.RULEFORGE_MIN_CONFIDENCE;
    delete process.env.RULEFORGE_LOG_PATH;
    delete process.env.RULEFORGE_AUTO_REDACT;
  });
  
  it('应该验证配置结构', () => {
    const config = configManager.export();
    const validation = configManager.validate();
    
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
  
  it('应该检测无效配置', () => {
    // 设置无效配置
    configManager.set('extraction.minConfidence', 1.5); // 超出范围
    
    const validation = configManager.validate();
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
  
  it('应该保存配置到文件', async () => {
    await configManager.load();
    
    // 修改配置
    configManager.set('extraction.minConfidence', 0.85);
    
    await configManager.save();
    
    // 验证文件存在
    const fileExists = await fs.access(testConfigPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
    
    // 验证文件内容
    const fileContent = await fs.readFile(testConfigPath, 'utf-8');
    expect(fileContent).toContain('minConfidence: 0.85');
  });
  
  it('应该获取配置值', async () => {
    await configManager.load();
    
    const minConfidence = configManager.get<number>('extraction.minConfidence');
    const autoRedact = configManager.get<boolean>('privacy.autoRedact');
    
    expect(minConfidence).toBe(0.7);
    expect(autoRedact).toBe(true);
  });
  
  it('应该设置配置值', async () => {
    await configManager.load();
    
    configManager.set('extraction.minConfidence', 0.9);
    configManager.set('privacy.autoRedact', false);
    
    const minConfidence = configManager.get<number>('extraction.minConfidence');
    const autoRedact = configManager.get<boolean>('privacy.autoRedact');
    
    expect(minConfidence).toBe(0.9);
    expect(autoRedact).toBe(false);
  });
  
  it('应该处理配置源优先级', async () => {
    // 设置环境变量（最高优先级）
    process.env.RULEFORGE_MIN_CONFIDENCE = '0.9';
    
    // 创建项目配置文件（中等优先级）
    const projectConfig = {
      extraction: {
        minConfidence: 0.8
      }
    };
    await fs.writeFile(testConfigPath, JSON.stringify(projectConfig));
    
    const config = await configManager.load();
    
    // 环境变量应该覆盖项目配置
    expect(config.extraction.minConfidence).toBe(0.9);
    
    delete process.env.RULEFORGE_MIN_CONFIDENCE;
  });
  
  it('应该重新加载配置', async () => {
    await configManager.load();
    
    // 修改配置文件
    const newConfig = {
      extraction: {
        minConfidence: 0.95
      }
    };
    await fs.writeFile(testConfigPath, JSON.stringify(newConfig));
    
    await configManager.reload();
    
    const minConfidence = configManager.get<number>('extraction.minConfidence');
    expect(minConfidence).toBe(0.95);
  });
});