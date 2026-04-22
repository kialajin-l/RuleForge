/**
 * PatternClusterer 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternClusterer, Pattern } from '../src/extractor/pattern-cluster';
import { SessionEvent } from '../src/extractor/log-parser';

describe('PatternClusterer', () => {
  let clusterer: PatternClusterer;

  beforeEach(() => {
    clusterer = new PatternClusterer();
  });

  describe('基础功能', () => {
    it('应该处理空事件列表', async () => {
      const result = await clusterer.cluster([]);
      
      expect(result.patterns).toHaveLength(0);
      expect(result.statistics.totalEvents).toBe(0);
      expect(result.warnings).toContain('事件列表为空，无法进行模式识别');
    });

    it('应该处理无效事件', async () => {
      const events: SessionEvent[] = [
        {
          timestamp: new Date(),
          type: 'unknown_event',
          payload: {},
          sessionId: 'test-session'
        }
      ];

      const result = await clusterer.cluster(events);
      
      expect(result.patterns).toHaveLength(0);
      expect(result.statistics.totalEvents).toBe(1);
    });
  });

  describe('错误修复模式识别', () => {
    it('应该识别高频错误修复模式', async () => {
      const events: SessionEvent[] = [
        // 错误事件
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'error_occurred',
          payload: {
            message: 'TypeError: Cannot read property \'name\' of undefined',
            file: 'src/components/UserProfile.tsx'
          },
          sessionId: 'test-session'
        },
        // 修复事件
        {
          timestamp: new Date('2024-01-01T10:01:00Z'),
          type: 'file_saved',
          payload: {
            filePath: 'src/components/UserProfile.tsx',
            changes: ['添加了空值检查'],
            content: 'const userName = user?.name || \'Unknown\';'
          },
          sessionId: 'test-session'
        },
        // 测试通过事件
        {
          timestamp: new Date('2024-01-01T10:02:00Z'),
          type: 'test_run',
          payload: {
            file: 'src/components/UserProfile.test.tsx',
            passed: true,
            failures: []
          },
          sessionId: 'test-session'
        }
      ];

      const result = await clusterer.cluster(events, {
        minOccurrences: 1,
        minConfidence: 0.1,
        enableDebugLog: false
      });

      expect(result.patterns.length).toBeGreaterThan(0);
      
      const errorFixPattern = result.patterns.find(p => 
        p.name.includes('错误修复')
      );
      
      expect(errorFixPattern).toBeDefined();
      expect(errorFixPattern?.confidence).toBeGreaterThan(0);
      expect(errorFixPattern?.trigger.keywords).toContain('typeerror');
    });

    it('应该过滤低置信度模式', async () => {
      const events: SessionEvent[] = [
        {
          timestamp: new Date(),
          type: 'error_occurred',
          payload: {
            message: 'Single occurrence error',
            file: 'src/test.ts'
          },
          sessionId: 'test-session'
        }
      ];

      const result = await clusterer.cluster(events, {
        minOccurrences: 2,
        minConfidence: 0.7
      });

      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('代码结构模式识别', () => {
    it('应该识别重复的组件结构', async () => {
      const events: SessionEvent[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'file_opened',
          payload: {
            filePath: 'src/components/Button.vue',
            language: 'vue',
            content: '<template>\n  <button class="btn">{{ label }}</button>\n</template>'
          },
          sessionId: 'test-session'
        },
        {
          timestamp: new Date('2024-01-01T10:01:00Z'),
          type: 'file_opened',
          payload: {
            filePath: 'src/components/Input.vue',
            language: 'vue',
            content: '<template>\n  <input class="input" v-model="value" />\n</template>'
          },
          sessionId: 'test-session'
        }
      ];

      const result = await clusterer.cluster(events, {
        minOccurrences: 2,
        minConfidence: 0.1
      });

      const structurePattern = result.patterns.find(p => 
        p.name.includes('vue') && p.name.includes('模式')
      );
      
      expect(structurePattern).toBeDefined();
      expect(structurePattern?.trigger.keywords).toContain('vue-component');
    });

    it('应该按文件类型分组', async () => {
      const events: SessionEvent[] = [
        {
          timestamp: new Date(),
          type: 'file_opened',
          payload: {
            filePath: 'src/utils.ts',
            language: 'typescript',
            content: 'export function formatDate(date: Date): string { return date.toISOString(); }'
          },
          sessionId: 'test-session'
        },
        {
          timestamp: new Date(),
          type: 'file_opened',
          payload: {
            filePath: 'src/helpers.py',
            language: 'python',
            content: 'def format_date(date):\n    return date.isoformat()'
          },
          sessionId: 'test-session'
        }
      ];

      const result = await clusterer.cluster(events, {
        languageFocus: ['typescript']
      });

      // 应该只处理 TypeScript 文件
      const tsPatterns = result.patterns.filter(p => 
        p.trigger.language === 'typescript'
      );
      
      expect(tsPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('置信度计算', () => {
    it('应该正确计算置信度', () => {
      const clusterer = new PatternClusterer() as any;
      
      // 测试置信度计算逻辑
      const confidence = clusterer.calculateConfidence(3, 0.8, 2);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('应该根据出现次数调整置信度', () => {
      const clusterer = new PatternClusterer() as any;
      
      const lowOccurrence = clusterer.calculateConfidence(1, 1.0, 3);
      const highOccurrence = clusterer.calculateConfidence(5, 1.0, 3);
      
      expect(highOccurrence).toBeGreaterThan(lowOccurrence);
    });
  });

  describe('模式过滤', () => {
    it('应该过滤低置信度模式', async () => {
      const mockPatterns: Pattern[] = [
        {
          id: 'high-confidence',
          name: '高置信度模式',
          description: '测试模式',
          trigger: { keywords: ['test'], file_pattern: '**/*.ts' },
          condition: '条件',
          suggestion: '建议',
          confidence: 0.9,
          applicableScenes: 3,
          examples: [],
          metadata: {
            occurrenceCount: 3,
            successRate: 1.0,
            applicabilityScore: 3,
            fileTypes: ['ts'],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        },
        {
          id: 'low-confidence',
          name: '低置信度模式',
          description: '测试模式',
          trigger: { keywords: ['test'], file_pattern: '**/*.ts' },
          condition: '条件',
          suggestion: '建议',
          confidence: 0.3,
          applicableScenes: 1,
          examples: [],
          metadata: {
            occurrenceCount: 1,
            successRate: 0.5,
            applicabilityScore: 1,
            fileTypes: ['ts'],
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        }
      ];

      const clusterer = new PatternClusterer() as any;
      const filtered = clusterer.filterPatterns(mockPatterns, {
        minOccurrences: 2,
        minConfidence: 0.7,
        minApplicableScenes: 2,
        languageFocus: [],
        excludePatterns: [],
        enableDebugLog: false
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('high-confidence');
    });
  });

  describe('错误处理', () => {
    it('应该处理解析错误', async () => {
      // 创建无效的事件数据
      const invalidEvents: any[] = [
        {
          timestamp: 'invalid-date',
          type: 'error_occurred',
          payload: {},
          sessionId: 'test-session'
        }
      ];

      await expect(clusterer.cluster(invalidEvents as any)).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该处理大量事件', async () => {
      const largeEvents: SessionEvent[] = [];
      
      // 生成 100 个测试事件
      for (let i = 0; i < 100; i++) {
        largeEvents.push({
          timestamp: new Date(2024, 0, 1, 10, i),
          type: i % 3 === 0 ? 'error_occurred' : 'file_saved',
          payload: {
            message: `Error ${i}`,
            file: `src/file${i}.ts`,
            content: `// Content ${i}`
          },
          sessionId: 'test-session'
        });
      }

      const startTime = Date.now();
      const result = await clusterer.cluster(largeEvents);
      const processingTime = Date.now() - startTime;

      expect(result.statistics.processingTime).toBeLessThan(5000); // 5秒内完成
      expect(result.statistics.totalEvents).toBe(100);
    });
  });
});

describe('Pattern 接口验证', () => {
  it('应该创建有效的模式对象', () => {
    const pattern: Pattern = {
      id: 'test-pattern',
      name: '测试模式',
      description: '这是一个测试模式',
      trigger: {
        keywords: ['test', 'example'],
        file_pattern: '**/*.ts'
      },
      condition: '当检测到测试代码时',
      suggestion: '建议改进测试代码结构',
      confidence: 0.8,
      applicableScenes: 3,
      examples: [
        {
          before: '// 改进前',
          after: '// 改进后',
          context: '测试文件'
        }
      ],
      metadata: {
        occurrenceCount: 3,
        successRate: 1.0,
        applicabilityScore: 2,
        fileTypes: ['ts'],
        firstSeen: new Date(),
        lastSeen: new Date()
      }
    };

    expect(pattern.id).toBe('test-pattern');
    expect(pattern.confidence).toBe(0.8);
    expect(pattern.examples).toHaveLength(1);
    expect(pattern.metadata.occurrenceCount).toBe(3);
  });
});