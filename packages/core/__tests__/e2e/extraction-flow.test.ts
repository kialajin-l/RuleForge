/**
 * RuleForge 端到端测试
 * 测试核心流程：提取 → 验证 → 格式化
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入核心模块
import { RuleExtractor } from '../../src/extractor/rule-extractor.js';
import { RuleValidator } from '../../src/validator/rule-validator.js';
import { PatternYamlFormatter } from '../../src/formatter/yaml-formatter.js';
import { RuleSchema } from '../../src/types/rule-schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试数据路径
const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const SAMPLE_SESSION_PATH = path.join(TEST_DATA_DIR, 'sample-session.jsonl');
const VALID_RULE_PATH = path.join(TEST_DATA_DIR, 'valid-rule.yaml');
const INVALID_RULE_PATH = path.join(TEST_DATA_DIR, 'invalid-rule.yaml');

describe('RuleForge 端到端测试', () => {
  let extractor: RuleExtractor;
  let validator: RuleValidator;
  let formatter: PatternYamlFormatter;

  beforeEach(() => {
    // 初始化组件
    extractor = new RuleExtractor();
    validator = RuleValidator.createStandardValidator();
    formatter = new PatternYamlFormatter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('测试场景 1：完整提取流程', () => {
    it('应该从会话日志中提取有效规则', async () => {
      // 准备测试数据
      const sessionData = await fs.readFile(SAMPLE_SESSION_PATH, 'utf-8');
      expect(sessionData).toBeTruthy();

      // 执行提取
      const result = await extractor.extract({
        sessionId: 'test-session-001',
        logPath: SAMPLE_SESSION_PATH,
        minConfidence: 0.7,
        applicableScenes: 2
      });

      // 验证结果
      expect(result).toBeDefined();
      expect(result.rules).toBeInstanceOf(Array);
      expect(result.rules.length).toBeGreaterThanOrEqual(3);

      // 验证统计信息
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalFiles).toBeGreaterThan(0);
      expect(result.statistics.totalCommands).toBeGreaterThan(0);
      expect(result.statistics.patternsFound).toBeGreaterThan(0);
      expect(result.statistics.extractionTime).toBeGreaterThan(0);

      // 验证每个规则
      for (const rule of result.rules) {
        // 验证规则结构
        expect(rule.meta).toBeDefined();
        expect(rule.meta.id).toBeDefined();
        expect(typeof rule.meta.id).toBe('string');
        expect(rule.meta.id.length).toBeGreaterThan(0);

        expect(rule.rule).toBeDefined();
        expect(rule.rule.trigger).toBeDefined();
        expect(rule.rule.conditions).toBeInstanceOf(Array);
        expect(rule.rule.suggestions).toBeInstanceOf(Array);

        expect(rule.compatibility).toBeDefined();
        expect(rule.compatibility.languages).toBeInstanceOf(Array);
        expect(rule.compatibility.languages.length).toBeGreaterThan(0);

        // 验证置信度
        expect(rule.confidence).toBeDefined();
        expect(typeof rule.confidence).toBe('number');
        expect(rule.confidence).toBeGreaterThanOrEqual(0.7);
        expect(rule.confidence).toBeLessThanOrEqual(1.0);

        // 验证通过 Zod Schema
        const validationResult = RuleSchema.safeParse(rule);
        expect(validationResult.success).toBe(true);
        if (!validationResult.success) {
          console.error('规则验证失败:', validationResult.error);
        }

        // 验证 YAML 序列化
        const yamlContent = formatter.toYAML(rule);
        expect(yamlContent).toBeDefined();
        expect(typeof yamlContent).toBe('string');
        expect(yamlContent.length).toBeGreaterThan(0);

        // 验证 YAML 包含必需字段
        expect(yamlContent).toContain('meta:');
        expect(yamlContent).toContain('rule:');
        expect(yamlContent).toContain('compatibility:');
        expect(yamlContent).toContain('confidence:');

        // 验证 YAML 可反序列化
        try {
          const yaml = await import('js-yaml');
          const parsedRule = yaml.load(yamlContent);
          expect(parsedRule).toBeDefined();
          expect(parsedRule.meta).toBeDefined();
          expect(parsedRule.meta.id).toBe(rule.meta.id);
        } catch (error) {
          throw new Error(`YAML 反序列化失败: ${error}`);
        }
      }

      // 验证提取的规则模式
      const vuePropsRules = result.rules.filter(rule => 
        rule.meta.name.toLowerCase().includes('props') ||
        rule.rule.trigger.context?.toLowerCase().includes('props')
      );
      expect(vuePropsRules.length).toBeGreaterThan(0);

      const arrayTypeRules = result.rules.filter(rule => 
        rule.meta.description?.toLowerCase().includes('array') ||
        rule.rule.conditions.some(cond => 
          cond.condition.toLowerCase().includes('array')
        )
      );
      expect(arrayTypeRules.length).toBeGreaterThan(0);
    });

    it('应该处理不同类型的错误模式', async () => {
      const result = await extractor.extract({
        sessionId: 'test-session-002',
        logPath: SAMPLE_SESSION_PATH,
        minConfidence: 0.8,
        applicableScenes: 3
      });

      // 验证高置信度规则
      const highConfidenceRules = result.rules.filter(rule => rule.confidence >= 0.9);
      expect(highConfidenceRules.length).toBeGreaterThan(0);

      // 验证错误修复模式
      const errorFixRules = result.rules.filter(rule => 
        rule.meta.description?.toLowerCase().includes('error') ||
        rule.meta.description?.toLowerCase().includes('fix')
      );
      expect(errorFixRules.length).toBeGreaterThan(0);

      // 验证组件创建模式
      const componentRules = result.rules.filter(rule => 
        rule.meta.name.toLowerCase().includes('component') ||
        rule.rule.trigger.context?.toLowerCase().includes('component')
      );
      expect(componentRules.length).toBeGreaterThan(0);
    });
  });

  describe('测试场景 2：规则验证', () => {
    it('应该验证有效的 YAML 规则', async () => {
      // 读取有效规则文件
      const validYamlContent = await fs.readFile(VALID_RULE_PATH, 'utf-8');
      expect(validYamlContent).toBeTruthy();

      // 解析 YAML
      const yaml = await import('js-yaml');
      const rule = yaml.load(validYamlContent);
      expect(rule).toBeDefined();

      // 执行验证
      const validation = validator.validate(rule);

      // 验证结果
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeInstanceOf(Array);
      expect(validation.errors.length).toBe(0);
      expect(validation.warnings).toBeInstanceOf(Array);

      // 验证规则结构
      expect(rule.meta.id).toBe('vue-props-validation');
      expect(rule.meta.name).toBe('Vue Props Validation');
      expect(rule.meta.version).toBe('1.0.0');
      expect(rule.rule.trigger.type).toBe('file_pattern');
      expect(rule.compatibility.languages).toContain('typescript');
      expect(rule.compatibility.languages).toContain('vue');
      expect(rule.confidence).toBe(0.92);
    });

    it('应该拒绝无效的 YAML 规则', async () => {
      // 读取无效规则文件
      const invalidYamlContent = await fs.readFile(INVALID_RULE_PATH, 'utf-8');
      expect(invalidYamlContent).toBeTruthy();

      // 解析 YAML
      const yaml = await import('js-yaml');
      const rule = yaml.load(invalidYamlContent);
      expect(rule).toBeDefined();

      // 执行验证
      const validation = validator.validate(rule);

      // 验证结果
      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeInstanceOf(Array);
      expect(validation.errors.length).toBeGreaterThan(0);

      // 验证错误信息
      const errorMessages = validation.errors.join(' ');
      expect(errorMessages).toContain('meta.id');
      expect(errorMessages).toContain('required');
      expect(errorMessages).toContain('compatibility');

      // 验证错误信息包含详细描述
      validation.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        expect(error).toMatch(/^[A-Z]/); // 错误信息应该以大写字母开头
      });
    });

    it('应该处理严格模式验证', async () => {
      const validYamlContent = await fs.readFile(VALID_RULE_PATH, 'utf-8');
      const yaml = await import('js-yaml');
      const rule = yaml.load(validYamlContent);

      // 正常模式验证
      const normalValidation = validator.validate(rule);
      expect(normalValidation.valid).toBe(true);

      // 严格模式验证
      const strictValidation = validator.validate(rule, { strict: true });
      expect(strictValidation.valid).toBe(true);

      // 修改规则使其在严格模式下失败
      const problematicRule = { ...rule };
      problematicRule.meta.description = ''; // 空描述在严格模式下可能被视为警告

      const strictValidationWithWarning = validator.validate(problematicRule, { strict: true });
      if (strictValidationWithWarning.warnings.length > 0) {
        expect(strictValidationWithWarning.valid).toBe(false);
      }
    });
  });

  describe('测试场景 3：YAML 格式化', () => {
    it('应该正确格式化规则为 YAML', async () => {
      // 创建测试规则
      const testRule = {
        meta: {
          id: 'test-rule-001',
          name: 'Test Rule',
          version: '1.0.0',
          description: 'Test rule with sensitive information',
          authors: ['test-author'],
          license: 'MIT' as const,
          created: '2024-01-15T10:00:00Z',
          updated: '2024-01-15T10:00:00Z'
        },
        rule: {
          trigger: {
            type: 'file_pattern' as const,
            pattern: '**/*.ts',
            file_types: ['typescript'],
            context: 'TypeScript file processing'
          },
          conditions: [
            {
              type: 'code_contains' as const,
              condition: 'Uses path /Users/dev/my-project/src',
              negated: false
            }
          ],
          suggestions: [
            {
              description: 'Example suggestion',
              code: 'const apiKey = "sk-1234567890abcdef";\nconst projectPath = "/Users/dev/my-project/src";\nconsole.log(apiKey, projectPath);'
            }
          ]
        },
        compatibility: {
          languages: ['typescript'],
          frameworks: ['react', 'vue'],
          min_version: '1.0.0',
          max_version: '2.0.0'
        },
        confidence: 0.85
      };

      // 格式化规则
      const yamlContent = formatter.toYAML(testRule);
      expect(yamlContent).toBeDefined();
      expect(typeof yamlContent).toBe('string');

      // 验证 YAML 内容
      expect(yamlContent).toContain('meta:');
      expect(yamlContent).toContain('rule:');
      expect(yamlContent).toContain('compatibility:');
      expect(yamlContent).toContain('confidence: 0.85');

      // 验证脱敏处理
      expect(yamlContent).not.toContain('/Users/dev/my-project/src');
      expect(yamlContent).toContain('{project_name}');
      expect(yamlContent).not.toContain('sk-1234567890abcdef');

      // 验证代码示例长度限制
      const lines = yamlContent.split('\n');
      const codeBlockLines = lines.filter(line => line.trim().startsWith('const') || line.trim().startsWith('console'));
      expect(codeBlockLines.length).toBeLessThanOrEqual(15);

      // 验证 YAML 可解析
      const yaml = await import('js-yaml');
      const parsedRule = yaml.load(yamlContent);
      expect(parsedRule).toBeDefined();
      expect(parsedRule.meta.id).toBe('test-rule-001');

      // 验证格式化选项
      const formattedWithOptions = formatter.toYAML(testRule, {
        prettyPrint: true,
        includeComments: true,
        validateOutput: true
      });
      expect(formattedWithOptions).toBeDefined();
      expect(formattedWithOptions).toContain('#'); // 应该包含注释
    });

    it('应该处理不同的格式化选项', async () => {
      const testRule = {
        meta: {
          id: 'format-test',
          name: 'Format Test Rule',
          version: '1.0.0',
          description: 'Test formatting options',
          authors: ['test'],
          license: 'MIT' as const,
          created: '2024-01-15T10:00:00Z',
          updated: '2024-01-15T10:00:00Z'
        },
        rule: {
          trigger: {
            type: 'file_pattern' as const,
            pattern: '**/*.ts',
            file_types: ['typescript'],
            context: 'test'
          },
          conditions: [
            {
              type: 'code_contains' as const,
              condition: 'test condition',
              negated: false
            }
          ],
          suggestions: [
            {
              description: 'test suggestion',
              code: 'console.log("test");'
            }
          ]
        },
        compatibility: {
          languages: ['typescript'],
          frameworks: ['react'],
          min_version: '1.0.0',
          max_version: '2.0.0'
        },
        confidence: 0.9
      };

      // 测试不同选项
      const minimalYaml = formatter.toYAML(testRule, {
        prettyPrint: false,
        includeComments: false
      });
      expect(minimalYaml).toBeDefined();

      const detailedYaml = formatter.toYAML(testRule, {
        prettyPrint: true,
        includeComments: true
      });
      expect(detailedYaml).toBeDefined();
      expect(detailedYaml).toContain('#');

      // 验证输出验证
      const validatedYaml = formatter.toYAML(testRule, {
        validateOutput: true
      });
      expect(validatedYaml).toBeDefined();

      // 验证错误处理
      const invalidRule = { ...testRule, meta: { ...testRule.meta, id: '' } };
      expect(() => formatter.toYAML(invalidRule, { validateOutput: true }))
        .toThrow();
    });
  });

  describe('集成测试：完整流程', () => {
    it('应该完成提取 → 验证 → 格式化的完整流程', async () => {
      // 步骤 1: 提取规则
      const extractionResult = await extractor.extract({
        sessionId: 'integration-test',
        logPath: SAMPLE_SESSION_PATH,
        minConfidence: 0.75,
        applicableScenes: 2
      });

      expect(extractionResult.rules.length).toBeGreaterThan(0);

      // 步骤 2: 验证每个规则
      for (const rule of extractionResult.rules) {
        const validation = validator.validate(rule);
        expect(validation.valid).toBe(true);

        // 步骤 3: 格式化规则
        const yamlContent = formatter.toYAML(rule);
        expect(yamlContent).toBeDefined();

        // 验证格式化后的 YAML 可解析
        const yaml = await import('js-yaml');
        const parsedRule = yaml.load(yamlContent);
        expect(parsedRule).toBeDefined();
        expect(parsedRule.meta.id).toBe(rule.meta.id);

        // 验证格式化后的规则仍然有效
        const revalidation = validator.validate(parsedRule);
        expect(revalidation.valid).toBe(true);
      }

      // 验证整体流程统计
      const validRules = extractionResult.rules.filter(rule => {
        const validation = validator.validate(rule);
        return validation.valid;
      });

      expect(validRules.length).toBe(extractionResult.rules.length);
      expect(extractionResult.statistics.successRate).toBeGreaterThan(0.8);
    });

    it('应该处理边界情况和错误', async () => {
      // 测试空会话数据
      const emptySessionPath = path.join(TEST_DATA_DIR, 'empty-session.jsonl');
      await fs.writeFile(emptySessionPath, '');

      const emptyResult = await extractor.extract({
        sessionId: 'empty-test',
        logPath: emptySessionPath,
        minConfidence: 0.7,
        applicableScenes: 2
      });

      expect(emptyResult.rules.length).toBe(0);
      expect(emptyResult.statistics.totalFiles).toBe(0);

      // 清理测试文件
      await fs.unlink(emptySessionPath);

      // 测试无效的置信度阈值
      await expect(extractor.extract({
        sessionId: 'invalid-confidence',
        logPath: SAMPLE_SESSION_PATH,
        minConfidence: 1.5, // 无效的置信度
        applicableScenes: 2
      })).rejects.toThrow();

      // 测试不存在的文件
      await expect(extractor.extract({
        sessionId: 'non-existent',
        logPath: './non-existent-file.jsonl',
        minConfidence: 0.7,
        applicableScenes: 2
      })).rejects.toThrow();
    });
  });
});

// 性能测试
describe('性能测试', () => {
  it('应该在大数据量下保持合理性能', async () => {
    const extractor = new RuleExtractor();
    
    const startTime = Date.now();
    const result = await extractor.extract({
      sessionId: 'performance-test',
      logPath: SAMPLE_SESSION_PATH,
      minConfidence: 0.7,
      applicableScenes: 2
    });
    const endTime = Date.now();
    
    const extractionTime = endTime - startTime;
    
    // 验证性能在合理范围内（50个事件应该在5秒内完成）
    expect(extractionTime).toBeLessThan(5000);
    
    // 验证统计信息中的时间
    expect(result.statistics.extractionTime).toBeLessThan(5000);
    expect(result.statistics.extractionTime).toBeGreaterThan(0);
  });
});

// 覆盖率测试
describe('覆盖率测试', () => {
  it('应该覆盖核心模块的主要功能', async () => {
    // 测试 RuleExtractor 的所有公共方法
    const extractor = new RuleExtractor();
    
    // 测试 extract 方法
    const result = await extractor.extract({
      sessionId: 'coverage-test',
      logPath: SAMPLE_SESSION_PATH,
      minConfidence: 0.7,
      applicableScenes: 2
    });
    expect(result).toBeDefined();
    
    // 测试 RuleValidator 的所有验证方法
    const validator = RuleValidator.createStandardValidator();
    const validYamlContent = await fs.readFile(VALID_RULE_PATH, 'utf-8');
    const yaml = await import('js-yaml');
    const rule = yaml.load(validYamlContent);
    
    const validation = validator.validate(rule);
    expect(validation.valid).toBe(true);
    
    const strictValidation = validator.validate(rule, { strict: true });
    expect(strictValidation.valid).toBe(true);
    
    // 测试 PatternYamlFormatter 的所有格式化选项
    const formatter = new PatternYamlFormatter();
    const yamlContent = formatter.toYAML(rule);
    expect(yamlContent).toBeDefined();
    
    const formattedWithOptions = formatter.toYAML(rule, {
      prettyPrint: true,
      includeComments: true
    });
    expect(formattedWithOptions).toBeDefined();
    
    // 验证错误处理
    expect(() => formatter.toYAML({ invalid: 'rule' })).toThrow();
  });
});