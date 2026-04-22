/**
 * RuleForge 模式聚类和 YAML 格式化演示脚本
 * 展示完整的模式识别和规则生成流程
 */

import { SessionLogParser } from './src/extractor/log-parser';
import { PatternClusterer } from './src/extractor/pattern-cluster';
import { PatternYamlFormatter } from './src/formatter/pattern-yaml-formatter';

async function createDemoSessionLog(): Promise<string> {
  const demoContent = `
{"timestamp": "2024-01-15T09:00:00Z", "type": "file_opened", "payload": {"filePath": "src/components/Button.vue", "language": "vue", "content": "<template>\\n  <button class=\\"btn\\">{{ label }}</button>\\n</template>\\n<script>\\nexport default {\\n  props: ['label']\\n}\\n</script>"}}
{"timestamp": "2024-01-15T09:05:00Z", "type": "error_occurred", "payload": {"message": "TypeError: Cannot read property 'length' of undefined", "file": "src/components/Button.vue", "stack": "at Button.validate (Button.vue:15)"}}
{"timestamp": "2024-01-15T09:10:00Z", "type": "file_saved", "payload": {"filePath": "src/components/Button.vue", "changes": ["添加 props 验证"], "content": "<template>\\n  <button class=\\"btn\\">{{ label }}</button>\\n</template>\\n<script>\\nexport default {\\n  props: {\\n    label: {\\n      type: String,\\n      required: true,\\n      validator: (value) => value && value.length > 0\\n    }\\n  }\\n}\\n</script>"}}
{"timestamp": "2024-01-15T09:15:00Z", "type": "test_run", "payload": {"file": "src/components/Button.test.ts", "passed": true, "failures": [], "duration": 1200}}
{"timestamp": "2024-01-15T09:20:00Z", "type": "file_opened", "payload": {"filePath": "src/components/Input.vue", "language": "vue", "content": "<template>\\n  <input :value=\\"modelValue\\" @input=\\"$emit('update:modelValue', $event.target.value)\\" />\\n</template>\\n<script>\\nexport default {\\n  props: ['modelValue']\\n}\\n</script>"}}
{"timestamp": "2024-01-15T09:25:00Z", "type": "error_occurred", "payload": {"message": "Vue warn: Missing required prop: \\"modelValue\\"", "file": "src/components/Input.vue"}}
{"timestamp": "2024-01-15T09:30:00Z", "type": "file_saved", "payload": {"filePath": "src/components/Input.vue", "changes": ["添加 props 验证和默认值"], "content": "<template>\\n  <input :value=\\"modelValue\\" @input=\\"$emit('update:modelValue', $event.target.value)\\" />\\n</template>\\n<script>\\nexport default {\\n  props: {\\n    modelValue: {\\n      type: [String, Number],\\n      required: true,\\n      default: ''\\n    }\\n  }\\n}\\n</script>"}}
{"timestamp": "2024-01-15T09:35:00Z", "type": "test_run", "payload": {"file": "src/components/Input.test.ts", "passed": true, "failures": [], "duration": 800}}
{"timestamp": "2024-01-15T09:40:00Z", "type": "file_opened", "payload": {"filePath": "src/utils/validation.ts", "language": "typescript", "content": "export function validateEmail(email: string): boolean {\\n  return email.includes('@');\\n}"}}
{"timestamp": "2024-01-15T09:45:00Z", "type": "file_saved", "payload": {"filePath": "src/utils/validation.ts", "changes": ["改进邮箱验证逻辑"], "content": "export function validateEmail(email: string): boolean {\\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\\n  return emailRegex.test(email);\\n}"}}
{"timestamp": "2024-01-15T09:50:00Z", "type": "command_executed", "payload": {"command": "npm run build", "success": true, "duration": 45000}}
`;

  const fs = await import('fs/promises');
  const path = await import('path');
  
  const logPath = path.join(process.cwd(), 'demo-session.jsonl');
  await fs.writeFile(logPath, demoContent.trim());
  
  return logPath;
}

async function demoPatternClustering() {
  console.log('🚀 开始 RuleForge 模式聚类演示\n');

  try {
    // 1. 创建演示会话日志
    console.log('📝 创建演示会话日志...');
    const logPath = await createDemoSessionLog();
    console.log(`   日志文件: ${logPath}\n`);

    // 2. 解析会话日志
    console.log('🔍 解析会话日志...');
    const logParser = new SessionLogParser();
    const parseResult = await logParser.parseSessionLog(logPath, {
      sessionId: 'demo-session-001',
      onProgress: (progress) => {
        console.log(`   解析进度: ${progress.eventsParsed} 事件`);
      }
    });

    console.log(`✅ 解析完成: ${parseResult.events.length} 个事件`);
    console.log(`   会话元数据: ${parseResult.metadata.id}`);
    console.log(`   事件类型分布: ${JSON.stringify(parseResult.statistics.eventTypeDistribution)}\n`);

    // 3. 模式聚类分析
    console.log('🧩 开始模式聚类分析...');
    const clusterer = new PatternClusterer();
    const clusterResult = await clusterer.cluster(parseResult.events, {
      minOccurrences: 1,
      minConfidence: 0.6,
      enableDebugLog: true
    });

    console.log(`✅ 聚类完成: ${clusterResult.patterns.length} 个模式`);
    console.log(`   统计信息:`);
    console.log(`     - 总事件数: ${clusterResult.statistics.totalEvents}`);
    console.log(`     - 总模式数: ${clusterResult.statistics.totalPatterns}`);
    console.log(`     - 高置信度模式: ${clusterResult.statistics.highConfidencePatterns}`);
    console.log(`     - 平均置信度: ${clusterResult.statistics.averageConfidence}`);
    console.log(`     - 处理时间: ${clusterResult.statistics.processingTime}ms\n`);

    // 4. YAML 格式化
    console.log('📄 开始 YAML 格式化...');
    const formatter = new PatternYamlFormatter();
    const formatResults = await formatter.toYAMLBatch(clusterResult.patterns, {
      sanitizePaths: true,
      projectName: '{project_name}',
      validateOutput: true
    });

    console.log(`✅ 格式化完成: ${formatResults.length} 个规则文件`);

    // 5. 展示生成的规则
    console.log('\n📋 生成的规则文件:');
    formatResults.forEach((result, index) => {
      const pattern = clusterResult.patterns[index];
      const validationStatus = result.validationResult?.valid ? '✅ 通过' : '❌ 失败';
      
      console.log(`\n${index + 1}. ${pattern.name}`);
      console.log(`   文件: ${result.fileName}`);
      console.log(`   置信度: ${Math.round(pattern.confidence * 100)}%`);
      console.log(`   验证: ${validationStatus}`);
      
      if (result.warnings.length > 0) {
        console.log(`   警告: ${result.warnings.join(', ')}`);
      }

      // 显示规则预览
      const previewLines = result.yaml.split('\n').slice(0, 15).join('\n');
      console.log(`   预览:\n${previewLines}...`);
    });

    // 6. 生成报告
    console.log('\n📊 生成模式报告...');
    const report = formatter.generatePatternReport(clusterResult.patterns, formatResults);
    
    const fs = await import('fs/promises');
    const reportPath = 'pattern-report.md';
    await fs.writeFile(reportPath, report);
    
    console.log(`✅ 报告已保存: ${reportPath}`);

    // 7. 清理临时文件
    console.log('\n🧹 清理临时文件...');
    await fs.unlink(logPath).catch(() => {});
    
    console.log('\n🎉 演示完成！');

  } catch (error) {
    console.error('❌ 演示失败:', error);
    process.exit(1);
  }
}

async function demoAdvancedScenarios() {
  console.log('\n🔬 高级场景演示\n');

  try {
    // 演示批量处理
    console.log('1. 批量模式处理演示...');
    
    const mockPatterns = [
      {
        id: 'vue-props-validation',
        name: 'Vue Props 验证模式',
        description: 'Vue 组件 props 验证的最佳实践',
        trigger: {
          keywords: ['props', 'validation', 'vue'],
          file_pattern: '**/*.vue',
          language: 'vue'
        },
        condition: '当检测到 Vue 组件中的 props 定义时',
        suggestion: '为 props 添加类型验证和默认值',
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
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      },
      {
        id: 'typescript-type-safety',
        name: 'TypeScript 类型安全模式',
        description: 'TypeScript 类型安全的最佳实践',
        trigger: {
          keywords: ['type', 'interface', 'typescript'],
          file_pattern: '**/*.ts',
          language: 'typescript'
        },
        condition: '当检测到 TypeScript 类型定义时',
        suggestion: '使用严格的类型定义和接口',
        confidence: 0.92,
        applicableScenes: 8,
        examples: [
          {
            before: 'function getUser(id) { return { name: \"John\" }; }',
            after: 'interface User { name: string; }\nfunction getUser(id: number): User { return { name: \"John\" }; }',
            context: 'TypeScript 文件'
          }
        ],
        metadata: {
          occurrenceCount: 8,
          successRate: 0.95,
          applicabilityScore: 3,
          fileTypes: ['ts'],
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      }
    ];

    const formatter = new PatternYamlFormatter();
    const results = await formatter.toYAMLBatch(mockPatterns, {
      sanitizePaths: true,
      projectName: 'demo-project'
    });

    console.log(`✅ 批量处理完成: ${results.length} 个模式`);
    
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.fileName} (${result.validationResult?.valid ? '有效' : '无效'})`);
    });

    // 演示 YAML 验证
    console.log('\n2. YAML 验证演示...');
    
    const invalidYaml = `meta:
  id: test-rule
rule:
  # 缺少必要的字段
`;

    const validationResult = formatter.validateYAML(invalidYaml);
    console.log(`   验证结果: ${validationResult.valid ? '✅ 通过' : '❌ 失败'}`);
    if (!validationResult.valid) {
      console.log(`   错误信息: ${validationResult.error}`);
    }

    // 演示 YAML 美化
    console.log('\n3. YAML 美化演示...');
    
    const uglyYaml = `meta:{id:test,name:测试}rule:{trigger:{keywords:[test]},condition:条件}`;
    const prettyYaml = formatter.prettify(uglyYaml);
    
    console.log('   美化前:', uglyYaml);
    console.log('   美化后:', prettyYaml.split('\n')[0]);

    console.log('\n✅ 高级场景演示完成！');

  } catch (error) {
    console.error('❌ 高级场景演示失败:', error);
  }
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('      RuleForge 模式聚类演示');
  console.log('========================================\n');

  await demoPatternClustering();
  await demoAdvancedScenarios();

  console.log('\n========================================');
  console.log('          演示结束');
  console.log('========================================');
}

// 运行演示
if (require.main === module) {
  main().catch(console.error);
}

export { demoPatternClustering, demoAdvancedScenarios };