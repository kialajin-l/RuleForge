/**
 * PatternYamlFormatter 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternYamlFormatter } from '../src/formatter/pattern-yaml-formatter';
import { Pattern } from '../src/extractor/pattern-cluster';

describe('PatternYamlFormatter', () => {
  let formatter: PatternYamlFormatter;

  beforeEach(() => {
    formatter = new PatternYamlFormatter();
  });

  describe('基础功能', () => {
    it('应该将模式转换为有效的 YAML', async () => {
      const pattern: Pattern = {
        id: 'vue-props-validation',
        name: 'Vue Props 验证模式',
        description: '在 Vue 组件中验证 props 的最佳实践',
        trigger: {
          keywords: ['props', 'validation', 'vue'],
          file_pattern: '**/*.vue',
          language: 'vue'
        },
        condition: '当检测到 Vue 组件中的 props 定义时，检查是否包含适当的验证',
        suggestion: '为 props 添加类型验证和默认值，提高代码的健壮性',
        confidence: 0.85,
        applicableScenes: 5,
        examples: [
          {
            before: `export default {
  props: ['name']
}`,
            after: `export default {
  props: {
    name: {
      type: String,
      required: true,
      validator: (value) => value.length > 0
    }
  }
}`,
            context: 'Vue 组件文件'
          }
        ],
        metadata: {
          occurrenceCount: 5,
          successRate: 1.0,
          applicabilityScore: 3,
          fileTypes: ['vue'],
          firstSeen: new Date('2024-01-01T10:00:00Z'),
          lastSeen: new Date('2024-01-01T12:00:00Z')
        }
      };

      const result = await formatter.toYAML(pattern);

      expect(result.yaml).toBeDefined();
      expect(result.fileName).toBe('vue-props-validation.yaml');
      expect(result.yaml).toContain('meta:');
      expect(result.yaml).toContain('rule:');
      expect(result.yaml).toContain('compatibility:');
      expect(result.yaml).toContain('vue-props-validation');
    });

    it('应该生成正确的文件名', async () => {
      const pattern: Pattern = {
        id: 'test-pattern-with-special-chars',
        name: '测试模式',
        description: '测试描述',
        trigger: { keywords: ['test'], file_pattern: '**/*.ts' },
        condition: '条件',
        suggestion: '建议',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern);

      expect(result.fileName).toBe('test-pattern-with-special-chars.yaml');
    });
  });

  describe('路径脱敏', () => {
    it('应该脱敏文件路径', async () => {
      const pattern: Pattern = {
        id: 'test-pattern',
        name: '测试模式',
        description: '测试描述',
        trigger: {
          keywords: ['test'],
          file_pattern: 'my-project/src/components/**/*.vue'
        },
        condition: '条件',
        suggestion: '建议',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [
          {
            before: '// 代码',
            after: '// 代码',
            context: 'my-project/src/components/Button.vue'
          }
        ],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['vue'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern, {
        sanitizePaths: true,
        projectName: '{project_name}'
      });

      expect(result.yaml).toContain('{project_name}/src/components/**/*.vue');
      expect(result.warnings).toContain('文件路径已脱敏处理');
    });

    it('应该支持自定义项目名称', async () => {
      const pattern: Pattern = {
        id: 'test-pattern',
        name: '测试模式',
        description: '测试描述',
        trigger: {
          keywords: ['test'],
          file_pattern: 'old-project/src/utils.ts'
        },
        condition: '条件',
        suggestion: '建议',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern, {
        sanitizePaths: true,
        projectName: 'new-project'
      });

      expect(result.yaml).toContain('new-project/src/utils.ts');
    });
  });

  describe('代码示例优化', () => {
    it('应该截断过长的代码示例', async () => {
      const longCode = Array(30).fill(0).map((_, i) => `// 代码行 ${i + 1}`).join('\n');
      
      const pattern: Pattern = {
        id: 'test-pattern',
        name: '测试模式',
        description: '测试描述',
        trigger: { keywords: ['test'], file_pattern: '**/*.ts' },
        condition: '条件',
        suggestion: '建议',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [
          {
            before: longCode,
            after: longCode,
            context: '测试文件'
          }
        ],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern);

      expect(result.warnings).toContain('示例 1 的 before 代码已截断');
      expect(result.warnings).toContain('示例 1 的 after 代码已截断');
      expect(result.yaml).toContain('代码已截断');
    });

    it('应该保留关键代码行', async () => {
      const codeWithKeyParts = `// 文件头注释
import React from 'react';

export function ImportantComponent() {
  // 中间有很多代码
  ${Array(20).fill(0).map((_, i) => `const var${i} = ${i};`).join('\n  ')}
  
  return <div>重要内容</div>;
}`;
      
      const pattern: Pattern = {
        id: 'test-pattern',
        name: '测试模式',
        description: '测试描述',
        trigger: { keywords: ['test'], file_pattern: '**/*.tsx' },
        condition: '条件',
        suggestion: '建议',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [
          {
            before: codeWithKeyParts,
            after: codeWithKeyParts,
            context: '测试文件'
          }
        ],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['tsx'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern);

      expect(result.yaml).toContain('import React');
      expect(result.yaml).toContain('export function');
      expect(result.yaml).toContain('return <div>');
    });
  });

  describe('敏感信息过滤', () => {
    it('应该过滤 API Key 等敏感信息', async () => {
      const pattern: Pattern = {
        id: 'test-pattern',
        name: '测试模式',
        description: '包含 API Key 的模式',
        trigger: { keywords: ['api', 'key'], file_pattern: '**/*.ts' },
        condition: '当使用 API_KEY = "sk-1234567890abcdef" 时',
        suggestion: '不要硬编码 API Key',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [
          {
            before: 'const API_KEY = "sk-1234567890abcdef";',
            after: 'const API_KEY = process.env.API_KEY;',
            context: '配置文件'
          }
        ],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern);

      expect(result.yaml).not.toContain('sk-1234567890abcdef');
      expect(result.yaml).toContain('***');
      expect(result.warnings).toContain('检测到敏感信息，已进行脱敏处理');
    });

    it('应该过滤密码信息', async () => {
      const pattern: Pattern = {
        id: 'test-pattern',
        name: '测试模式',
        description: '包含密码的模式',
        trigger: { keywords: ['password'], file_pattern: '**/*.ts' },
        condition: '当设置 password = "secret123" 时',
        suggestion: '使用环境变量存储密码',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern);

      expect(result.yaml).not.toContain('secret123');
      expect(result.yaml).toContain('***');
    });
  });

  describe('YAML 验证', () => {
    it('应该验证生成的 YAML 格式', async () => {
      const pattern: Pattern = {
        id: 'valid-pattern',
        name: '有效模式',
        description: '有效模式描述',
        trigger: { keywords: ['valid'], file_pattern: '**/*.ts' },
        condition: '有效条件',
        suggestion: '有效建议',
        confidence: 0.8,
        applicableScenes: 1,
        examples: [],
        metadata: {
          occurrenceCount: 1,
          successRate: 1.0,
          applicabilityScore: 1,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      };

      const result = await formatter.toYAML(pattern, {
        validateOutput: true
      });

      expect(result.validationResult).toBeDefined();
      expect(result.validationResult?.valid).toBe(true);
    });

    it('应该处理验证失败的情况', async () => {
      // 创建一个不完整的模式来测试验证失败
      const invalidPattern: any = {
        id: 'invalid-pattern',
        name: '无效模式'
        // 缺少必要的字段
      };

      // 直接测试验证方法
      const validationResult = formatter.validateYAML('invalid: yaml\ncontent');
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toBeDefined();
    });
  });

  describe('批量处理', () => {
    it('应该批量处理多个模式', async () => {
      const patterns: Pattern[] = [
        {
          id: 'pattern-1',
          name: '模式1',
          description: '描述1',
          trigger: { keywords: ['test1'], file_pattern: '**/*.ts' },
          condition: '条件1',
          suggestion: '建议1',
          confidence: 0.8,
          applicableScenes: 1,
          examples: [],
          metadata: {
            occurrenceCount: 1,
            successRate: 1.0,
            applicabilityScore: 1,
            fileTypes: ['ts'],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        },
        {
          id: 'pattern-2',
          name: '模式2',
          description: '描述2',
          trigger: { keywords: ['test2'], file_pattern: '**/*.vue' },
          condition: '条件2',
          suggestion: '建议2',
          confidence: 0.9,
          applicableScenes: 2,
          examples: [],
          metadata: {
            occurrenceCount: 2,
            successRate: 1.0,
            applicabilityScore: 2,
            fileTypes: ['vue'],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        }
      ];

      const results = await formatter.toYAMLBatch(patterns);

      expect(results).toHaveLength(2);
      expect(results[0].fileName).toBe('pattern-1.yaml');
      expect(results[1].fileName).toBe('pattern-2.yaml');
    });

    it('应该处理批量处理中的错误', async () => {
      const patterns: Pattern[] = [
        {
          id: 'valid-pattern',
          name: '有效模式',
          description: '有效描述',
          trigger: { keywords: ['valid'], file_pattern: '**/*.ts' },
          condition: '有效条件',
          suggestion: '有效建议',
          confidence: 0.8,
          applicableScenes: 1,
          examples: [],
          metadata: {
            occurrenceCount: 1,
            successRate: 1.0,
            applicabilityScore: 1,
            fileTypes: ['ts'],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        },
        {
          id: 'invalid-pattern',
          name: '无效模式',
          description: '无效描述',
          trigger: { keywords: [], file_pattern: '' }, // 无效的触发器
          condition: '',
          suggestion: '',
          confidence: 0,
          applicableScenes: 0,
          examples: [],
          metadata: {
            occurrenceCount: 0,
            successRate: 0,
            applicabilityScore: 0,
            fileTypes: [],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        } as any
      ];

      const results = await formatter.toYAMLBatch(patterns);

      // 至少一个成功
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('YAML 美化', () => {
    it('应该美化 YAML 输出', () => {
      const uglyYaml = `meta:\n  id: test\n  name: 测试\nrule:\n  trigger:\n    keywords: [test]\n  condition: 条件\n`;

      const prettyYaml = formatter.prettify(uglyYaml);

      expect(prettyYaml).toBeDefined();
      expect(prettyYaml.split('\n').length).toBeGreaterThan(uglyYaml.split('\n').length);
    });

    it('应该处理美化失败的情况', () => {
      const invalidYaml = 'invalid: yaml: content';

      const result = formatter.prettify(invalidYaml);

      expect(result).toBe(invalidYaml);
    });
  });

  describe('报告生成', () => {
    it('应该生成模式报告', () => {
      const patterns: Pattern[] = [
        {
          id: 'pattern-1',
          name: '模式1',
          description: '描述1',
          trigger: { keywords: ['test1'], file_pattern: '**/*.ts' },
          condition: '条件1',
          suggestion: '建议1',
          confidence: 0.8,
          applicableScenes: 1,
          examples: [],
          metadata: {
            occurrenceCount: 1,
            successRate: 1.0,
            applicabilityScore: 1,
            fileTypes: ['ts'],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        }
      ];

      const formatResults = [
        {
          yaml: 'test yaml',
          fileName: 'pattern-1.yaml',
          warnings: [],
          validationResult: { valid: true, errors: [], warnings: [] }
        }
      ];

      const report = formatter.generatePatternReport(patterns, formatResults);

      expect(report).toContain('RuleForge 模式生成报告');
      expect(report).toContain('模式1');
      expect(report).toContain('通过');
    });
  });
});