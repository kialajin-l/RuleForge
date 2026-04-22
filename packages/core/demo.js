/**
 * RuleForge 核心引擎演示脚本 (JavaScript版本)
 * 验证各个模块的功能
 */

const { RuleForgeEngine, RuleExtractor, RuleValidator, YamlFormatter } = require('./dist/index');

async function demo() {
  console.log('🚀 RuleForge 核心引擎演示开始...\n');

  // 1. 演示规则提取器
  console.log('1. 测试规则提取器...');
  const extractor = new RuleExtractor();
  
  try {
    const extractionResult = await extractor.extract({
      sessionId: 'demo-session',
      logPath: 'demo-log.json'
    });
    
    console.log(`✅ 提取完成: 发现 ${extractionResult.rules.length} 个规则`);
    console.log(`   文件数: ${extractionResult.statistics.totalFiles}`);
    console.log(`   命令数: ${extractionResult.statistics.totalCommands}`);
    console.log(`   模式数: ${extractionResult.statistics.patternsFound}`);
    console.log(`   耗时: ${extractionResult.statistics.extractionTime}ms\n`);
    
    if (extractionResult.rules.length > 0) {
      extractionResult.rules.forEach((rule, index) => {
        console.log(`   规则 ${index + 1}: ${rule.meta.name} (置信度: ${Math.round(rule.confidence * 100)}%)`);
      });
    }
    
  } catch (error) {
    console.log('❌ 规则提取失败:', error.message);
  }

  // 2. 演示规则验证器
  console.log('\n2. 测试规则验证器...');
  const validator = RuleValidator.createStandardValidator();
  
  // 创建一个有效的规则用于测试
  const validRule = {
    meta: {
      id: 'demo-rule',
      name: '演示规则',
      version: '1.0.0',
      description: '这是一个用于演示的有效规则',
      authors: ['demo-author'],
      license: 'MIT',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
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
        code: 'const name: string = "test";'
      }]
    },
    compatibility: {
      languages: ['typescript'],
      frameworks: ['vue']
    },
    confidence: 0.85
  };

  const validationResult = validator.validate(validRule);
  console.log(`✅ 验证完成: ${validationResult.valid ? '通过' : '失败'}`);
  
  if (validationResult.errors.length > 0) {
    console.log('   错误信息:');
    validationResult.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  if (validationResult.warnings.length > 0) {
    console.log('   警告信息:');
    validationResult.warnings.forEach(warning => {
      console.log(`   - ⚠️ ${warning}`);
    });
  }

  // 3. 演示YAML格式化器
  console.log('\n3. 测试YAML格式化器...');
  const formatter = new YamlFormatter();
  
  const formatResult = formatter.format(validRule, {
    includeComments: true,
    projectName: 'demo-project'
  });
  
  console.log(`✅ 格式化完成: ${formatResult.fileName}`);
  console.log('   YAML内容预览:');
  console.log('   ---');
  
  // 只显示前几行作为预览
  const previewLines = formatResult.yaml.split('\n').slice(0, 10);
  previewLines.forEach(line => {
    console.log(`   ${line}`);
  });
  
  if (previewLines.length < formatResult.yaml.split('\n').length) {
    console.log('   ... (内容已截断)');
  }
  
  console.log('   ---');

  // 4. 演示完整引擎流程
  console.log('\n4. 测试完整引擎流程...');
  const engine = new RuleForgeEngine({
    minConfidence: 0.6,
    strictValidation: true,
    includeComments: true,
    projectName: 'demo-project'
  });

  try {
    const processResult = await engine.processSession({
      sessionId: 'full-demo',
      logPath: 'demo-session.json'
    });
    
    console.log(`✅ 完整流程完成!`);
    console.log(`   总规则数: ${processResult.summary.totalRules}`);
    console.log(`   有效规则: ${processResult.summary.validRules}`);
    console.log(`   提取时间: ${processResult.summary.extractionTime}ms`);
    console.log(`   验证时间: ${processResult.summary.validationTime}ms`);
    console.log(`   格式化时间: ${processResult.summary.formattingTime}ms`);
    
    // 生成报告
    const report = engine.generateReport(processResult);
    console.log('\n📊 处理报告已生成 (长度:', report.length, '字符)');
    
  } catch (error) {
    console.log('❌ 完整流程失败:', error.message);
  }

  // 5. 演示错误处理
  console.log('\n5. 测试错误处理...');
  
  // 测试无效规则验证
  const invalidRule = {
    meta: {
      id: 'invalid rule',
      name: 'ab',
      version: '1.0',
      description: '太短',
      authors: [],
      license: 'INVALID',
      created: 'invalid',
      updated: 'invalid'
    },
    rule: {
      trigger: {
        type: 'invalid_type',
        pattern: ''
      },
      conditions: [],
      suggestions: []
    },
    compatibility: {
      languages: []
    },
    confidence: 1.5
  };

  const invalidResult = validator.validate(invalidRule);
  console.log(`✅ 无效规则验证: ${invalidResult.valid ? '意外通过' : '正确失败'}`);
  
  if (!invalidResult.valid) {
    console.log(`   发现错误数: ${invalidResult.errors.length}`);
  }

  console.log('\n🎉 RuleForge 核心引擎演示完成!');
  console.log('\n📋 功能总结:');
  console.log('   ✅ 规则提取 - 从开发会话中识别模式');
  console.log('   ✅ 规则验证 - 使用Zod验证REP协议合规性');
  console.log('   ✅ YAML格式化 - 生成符合标准的规则文件');
  console.log('   ✅ 完整流程 - 集成提取、验证、格式化');
  console.log('   ✅ 错误处理 - 完善的错误检测和报告');
  console.log('   ✅ 类型安全 - 完整的TypeScript类型定义');
}

// 运行演示
demo().catch(console.error);