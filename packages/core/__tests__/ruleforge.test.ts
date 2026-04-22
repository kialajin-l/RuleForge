/**
 * RuleForge 核心引擎测试文件
 * 验证各个模块的功能正确性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  RuleForgeEngine, 
  RuleExtractor, 
  RuleValidator, 
  YamlFormatter,
  RuleYAML 
} from '../src/index';

describe('RuleForge Core Engine', () => {
  let engine: RuleForgeEngine;

  beforeEach(() => {
    engine = new RuleForgeEngine({
      minConfidence: 0.5,
      strictValidation: true,
      includeComments: true,
      projectName: 'test-project'
    });
  });

  describe('RuleExtractor', () => {
    it('应该正确提取规则', async () => {
      const extractor = new RuleExtractor();
      
      const result = await extractor.extract({
        sessionId: 'test-session',
        logPath: 'test-log.json'
      });

      expect(result).toBeDefined();
      expect(result.rules).toBeInstanceOf(Array);
      expect(result.statistics).toHaveProperty('totalFiles');
      expect(result.statistics).toHaveProperty('patternsFound');
    });

    it('应该根据置信度过滤规则', async () => {
      const extractor = new RuleExtractor();
      
      const result = await extractor.extract({
        sessionId: 'test-session',
        logPath: 'test-log.json',
        minConfidence: 0.8
      });

      // 所有返回的规则置信度都应该 >= 0.8
      result.rules.forEach(rule => {
        expect(rule.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('RuleValidator', () => {
    it('应该验证有效的规则', () => {
      const validator = RuleValidator.createStandardValidator();
      
      const validRule: RuleYAML = {
        meta: {
          id: 'test-rule',
          name: '测试规则',
          version: '1.0.0',
          description: '这是一个测试规则描述',
          authors: ['test-author'],
          license: 'MIT',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        },
        rule: {
          trigger: {
            type: 'file_pattern',
            pattern: '**/*.ts',
            file_types: ['.ts']
          },
          conditions: [{
            type: 'code_contains',
            condition: '包含TypeScript类型定义'
          }],
          suggestions: [{
            type: 'code_fix',
            description: '添加类型注解',
            code: 'const name: string = \"test\";'
          }]
        },
        compatibility: {
          languages: ['typescript'],
          frameworks: []
        },
        confidence: 0.9
      };

      const result = validator.validate(validRule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的规则', () => {
      const validator = RuleValidator.createStandardValidator();
      
      const invalidRule = {
        meta: {
          id: 'invalid rule', // 包含空格，无效
          name: 'ab', // 太短
          version: '1.0', // 不符合语义版本
          description: '太短',
          authors: [], // 空数组
          license: 'INVALID', // 无效许可证
          created: 'invalid-date',
          updated: 'invalid-date'
        },
        rule: {
          trigger: {
            type: 'invalid_type', // 无效类型
            pattern: '' // 空模式
          },
          conditions: [], // 空数组
          suggestions: [] // 空数组
        },
        compatibility: {
          languages: [] // 空数组
        },
        confidence: 1.5 // 超出范围
      };

      const result = validator.validate(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('YamlFormatter', () => {
    it('应该正确格式化规则为YAML', () => {
      const formatter = new YamlFormatter();
      
      const rule: RuleYAML = {
        meta: {
          id: 'yaml-test',
          name: 'YAML测试规则',
          version: '1.0.0',
          description: '测试YAML格式化功能',
          authors: ['test-author'],
          license: 'MIT',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        },
        rule: {
          trigger: {
            type: 'file_pattern',
            pattern: '**/*.yaml'
          },
          conditions: [{
            type: 'file_exists',
            condition: 'YAML文件存在'
          }],
          suggestions: [{
            type: 'config_change',
            description: '更新YAML配置'
          }]
        },
        compatibility: {
          languages: ['yaml']
        },
        confidence: 0.8
      };

      const result = formatter.format(rule);
      
      expect(result.yaml).toBeDefined();
      expect(result.yaml).toContain('meta:');
      expect(result.yaml).toContain('rule:');
      expect(result.yaml).toContain('compatibility:');
      expect(result.fileName).toContain('yaml-test');
      expect(result.fileName).toContain('.yaml');
    });

    it('应该处理路径脱敏', () => {
      const formatter = new YamlFormatter();
      
      const rule: RuleYAML = {
        meta: {
          id: 'path-sanitization',
          name: '路径脱敏测试',
          version: '1.0.0',
          description: '测试路径脱敏功能',
          authors: ['test-author'],
          license: 'MIT',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        },
        rule: {
          trigger: {
            type: 'file_pattern',
            pattern: 'src/components/Button.vue'
          },
          conditions: [{
            type: 'file_exists',
            condition: '文件存在'
          }],
          suggestions: [{
            type: 'code_fix',
            description: '修复代码',
            files: ['src/utils/helper.ts']
          }]
        },
        compatibility: {
          languages: ['typescript']
        },
        confidence: 0.7
      };

      const result = formatter.format(rule, {
        sanitizePaths: true,
        projectName: 'test-project'
      });

      expect(result.yaml).toContain('test-project/');
      expect(result.yaml).not.toContain('src/components/');
      expect(result.warnings).toContain('文件路径已脱敏处理');
    });
  });

  describe('RuleForgeEngine 集成测试', () => {
    it('应该完成完整的处理流程', async () => {
      const result = await engine.processSession({
        sessionId: 'integration-test',
        logPath: 'test-session.json'
      });

      expect(result).toBeDefined();
      expect(result.extraction).toBeDefined();
      expect(result.validation).toBeInstanceOf(Array);
      expect(result.formatted).toBeInstanceOf(Array);
      expect(result.summary).toHaveProperty('totalRules');
      expect(result.summary).toHaveProperty('validRules');
    });

    it('应该生成有效的处理报告', async () => {
      const result = await engine.processSession({
        sessionId: 'report-test',
        logPath: 'test-session.json'
      });

      const report = engine.generateReport(result);
      
      expect(report).toBeDefined();
      expect(report).toContain('# RuleForge 处理报告');
      expect(report).toContain('总规则数');
      expect(report).toContain('有效规则');
    });

    it('应该处理空规则的情况', async () => {
      // 模拟没有规则被提取的情况
      const extractSpy = vi.spyOn(RuleExtractor.prototype, 'extract');
      extractSpy.mockResolvedValueOnce({
        rules: [],
        statistics: {
          totalFiles: 0,
          totalCommands: 0,
          patternsFound: 0,
          extractionTime: 0
        },
        warnings: ['未发现可提取的模式']
      });

      const result = await engine.processSession({
        sessionId: 'empty-test',
        logPath: 'empty-session.json'
      });

      expect(result.summary.totalRules).toBe(0);
      expect(result.summary.validRules).toBe(0);
      expect(result.formatted).toHaveLength(0);

      extractSpy.mockRestore();
    });
  });

  describe('错误处理', () => {
    it('应该处理提取过程中的错误', async () => {
      const extractSpy = vi.spyOn(RuleExtractor.prototype, 'extract');
      extractSpy.mockRejectedValueOnce(new Error('提取失败'));

      await expect(engine.processSession({
        sessionId: 'error-test',
        logPath: 'error-session.json'
      })).rejects.toThrow('RuleForge 处理失败');

      extractSpy.mockRestore();
    });

    it('应该处理验证过程中的错误', () => {
      const validator = RuleValidator.createStandardValidator();
      
      // 测试无效的输入
      const result = validator.validate(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('配置管理', () => {
    it('应该正确更新配置', () => {
      const newOptions = {
        minConfidence: 0.9,
        strictValidation: false,
        includeComments: false,
        projectName: 'updated-project'
      };

      engine.updateOptions(newOptions);
      const currentOptions = engine.getOptions();

      expect(currentOptions.minConfidence).toBe(0.9);
      expect(currentOptions.strictValidation).toBe(false);
      expect(currentOptions.includeComments).toBe(false);
      expect(currentOptions.projectName).toBe('updated-project');
    });
  });
});

describe('快捷函数', () => {
  it('应该提供独立的提取功能', async () => {
    const { extractRules } = await import('../src/index');
    
    const result = await extractRules({
      sessionId: 'quick-extract',
      logPath: 'test-session.json'
    });

    expect(result).toBeDefined();
    expect(result.rules).toBeInstanceOf(Array);
  });

  it('应该提供独立的验证功能', () => {
    const { validateRules } = require('../src/index');
    
    const rules: RuleYAML[] = [];
    const results = validateRules(rules);

    expect(results).toBeInstanceOf(Array);
  });

  it('应该提供独立的格式化功能', () => {
    const { formatRules } = require('../src/index');
    
    const rules: RuleYAML[] = [];
    const results = formatRules(rules);

    expect(results).toBeInstanceOf(Array);
  });
});