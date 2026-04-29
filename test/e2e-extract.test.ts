/**
 * S2-2 端到端测试：日志解析 → 模式聚类 → YAML 生成 → 入库验证
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { SessionLogParser } from '../packages/core/src/extractor/log-parser';
import { PatternClusterer } from '../packages/core/src/extractor/pattern-cluster';
import { PatternYamlFormatter } from '../packages/core/src/formatter/pattern-yaml-formatter';
import YAML from 'yaml';

const FIXTURE_LOG = resolve(__dirname, 'fixtures/test-session.jsonl');

describe('S2-2: extract 端到端流程', () => {
  const parser = new SessionLogParser();
  const clusterer = new PatternClusterer();
  const formatter = new PatternYamlFormatter();

  it('步骤1: 解析 JSONL 日志文件', async () => {
    const result = await parser.parseSessionLog(FIXTURE_LOG);

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.statistics.totalEvents).toBeGreaterThan(0);
    expect(result.metadata.id).toBeTruthy();
    console.log(`  解析到 ${result.events.length} 个事件`);
  });

  it('步骤2: 模式聚类识别', async () => {
    const parseResult = await parser.parseSessionLog(FIXTURE_LOG);
    const clusterResult = await clusterer.cluster(parseResult.events, {
      minOccurrences: 1,
      minConfidence: 0.3,
      enableDebugLog: true,
    });

    expect(clusterResult.patterns.length).toBeGreaterThan(0);
    console.log(`  发现 ${clusterResult.patterns.length} 个模式`);

    for (const p of clusterResult.patterns) {
      console.log(`     - ${p.name} (置信度: ${p.confidence.toFixed(2)})`);
    }
  });

  it('步骤3: YAML 格式化', async () => {
    const parseResult = await parser.parseSessionLog(FIXTURE_LOG);
    const clusterResult = await clusterer.cluster(parseResult.events, {
      minOccurrences: 1,
      minConfidence: 0.3,
    });

    expect(clusterResult.patterns.length).toBeGreaterThan(0);

    const formatResults = await formatter.toYAMLBatch(clusterResult.patterns, {
      validateOutput: true,
    });

    expect(formatResults.length).toBeGreaterThan(0);

    for (const fr of formatResults) {
      expect(fr.yaml).toBeTruthy();
      expect(fr.fileName).toBeTruthy();
      console.log(`  生成: ${fr.fileName}`);
    }
  });

  it('步骤4: 完整流程 - parse -> cluster -> format -> YAML 可解析', async () => {
    // 1. Parse
    const parseResult = await parser.parseSessionLog(FIXTURE_LOG);
    expect(parseResult.events.length).toBeGreaterThan(0);

    // 2. Cluster
    const clusterResult = await clusterer.cluster(parseResult.events, {
      minOccurrences: 1,
      minConfidence: 0.3,
    });
    expect(clusterResult.patterns.length).toBeGreaterThan(0);

    // 3. Format
    const formatResults = await formatter.toYAMLBatch(clusterResult.patterns);
    expect(formatResults.length).toBeGreaterThan(0);

    // 4. Validate each YAML output
    for (const fr of formatResults) {
      const parsed = YAML.parse(fr.yaml);
      expect(parsed).toBeDefined();
      expect(parsed.meta).toBeDefined();
      expect(parsed.meta.id).toBeTruthy();
      expect(parsed.meta.name).toBeTruthy();
      expect(parsed.rule).toBeDefined();
      console.log(`  YAML 验证通过: ${fr.fileName} (规则: ${parsed.meta.name})`);
    }

    console.log(`\n  端到端流程完成! 共生成 ${formatResults.length} 个规则文件`);
  });
});
