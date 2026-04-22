# RuleForge API 文档

> RuleForge 核心 API 参考手册

## 概述

RuleForge 提供完整的 TypeScript/JavaScript API，用于程序化地使用规则提取、验证和格式化功能。

## 安装

```bash
npm install @ruleforge/core
```

## 核心 API

### RuleExtractor 类

规则提取引擎，用于从开发会话日志中提取编码规则。

#### 构造函数

```typescript
import { RuleExtractor } from '@ruleforge/core';

const extractor = new RuleExtractor();
```

#### extract(options: ExtractionOptions): Promise<ExtractionResult>

从会话日志中提取规则。

**参数**:

```typescript
interface ExtractionOptions {
  sessionId: string;           // 会话标识符
  logPath: string;            // 日志文件路径
  minConfidence?: number;     // 最小置信度 (默认: 0.7)
  applicableScenes?: number;  // 适用场景数量 (默认: 2)
  maxPatterns?: number;       // 最大模式数量 (默认: 50)
}
```

**返回值**:

```typescript
interface ExtractionResult {
  rules: Rule[];              // 提取的规则列表
  statistics: {
    totalEvents: number;      // 总事件数
    totalPatterns: number;    // 识别模式数
    totalRules: number;       // 生成规则数
    highConfidencePatterns: number; // 高置信度模式数
    averageConfidence: number;      // 平均置信度
    extractionTime: number;         // 提取时间(毫秒)
    successRate: number;            // 成功率
  };
  warnings: string[];         // 警告信息
  errors: string[];          // 错误信息
}
```

**示例**:

```typescript
const result = await extractor.extract({
  sessionId: 'my-session-001',
  logPath: './session.jsonl',
  minConfidence: 0.8,
  applicableScenes: 3
});

console.log(`提取了 ${result.rules.length} 个规则`);
console.log(`平均置信度: ${result.statistics.averageConfidence}`);
```

#### extractFromEvents(events: LogEvent[]): Promise<ExtractionResult>

直接从事件数组中提取规则。

**参数**:

```typescript
interface LogEvent {
  timestamp: string;          // 时间戳
  type: string;              // 事件类型
  file?: string;             // 文件路径
  language?: string;         // 编程语言
  content?: string;          // 内容
  error?: string;            // 错误信息
  fix?: string;              // 修复信息
}
```

**示例**:

```typescript
const events = [
  {
    timestamp: '2024-01-15T10:00:00Z',
    type: 'file_saved',
    file: '/src/Component.vue',
    language: 'vue',
    content: '<template>...</template>'
  }
];

const result = await extractor.extractFromEvents(events);
```

### RuleValidator 类

规则验证器，用于验证规则格式和内容。

#### 静态方法

##### createStandardValidator(): RuleValidator

创建标准验证器实例。

```typescript
import { RuleValidator } from '@ruleforge/core';

const validator = RuleValidator.createStandardValidator();
```

#### validate(rule: any): ValidationResult

验证规则对象是否符合 REP v0.1 规范。

**参数**:

- `rule`: 要验证的规则对象

**返回值**:

```typescript
interface ValidationResult {
  valid: boolean;            // 是否验证通过
  errors: ValidationError[]; // 错误列表
  warnings: ValidationWarning[]; // 警告列表
}

interface ValidationError {
  path: string;              // 错误路径
  message: string;           // 错误信息
  code: string;              // 错误代码
}

interface ValidationWarning {
  path: string;              // 警告路径
  message: string;           // 警告信息
  severity: 'low' | 'medium' | 'high'; // 严重程度
}
```

**示例**:

```typescript
const rule = {
  meta: {
    id: 'test-rule',
    name: 'Test Rule',
    version: '1.0.0',
    description: 'A test rule',
    authors: ['test'],
    license: 'MIT'
  },
  rule: {
    trigger: { /* ... */ },
    conditions: [/* ... */],
    suggestions: [/* ... */]
  },
  compatibility: {
    languages: ['typescript'],
    frameworks: ['vue'],
    rep_version: '^1.0'
  }
};

const validation = validator.validate(rule);

if (validation.valid) {
  console.log('✅ 规则验证通过');
} else {
  console.log('❌ 规则验证失败:', validation.errors);
}
```

#### validateYaml(yamlContent: string): Promise<ValidationResult>

验证 YAML 格式的规则内容。

**示例**:

```typescript
const yamlContent = `
meta:
  id: test-rule
  name: Test Rule
  version: 1.0.0
rule:
  trigger:
    keywords: ["test"]
`;

const validation = await validator.validateYaml(yamlContent);
```

#### getValidationSchema(): ZodSchema

获取验证用的 Zod Schema。

```typescript
const schema = validator.getValidationSchema();
const result = schema.safeParse(rule);
```

### PatternYamlFormatter 类

YAML 格式化器，用于将规则对象转换为 YAML 格式。

#### 构造函数

```typescript
import { PatternYamlFormatter } from '@ruleforge/core';

const formatter = new PatternYamlFormatter();
```

#### toYAML(rule: Rule, options?: FormatOptions): string

将规则对象转换为 YAML 字符串。

**参数**:

```typescript
interface FormatOptions {
  prettyPrint?: boolean;     // 是否美化输出 (默认: true)
  maxLineLength?: number;    // 最大行长度 (默认: 100)
  indentSize?: number;       // 缩进大小 (默认: 2)
  autoRedact?: boolean;      // 自动脱敏 (默认: true)
}
```

**返回值**:

- `string`: 格式化后的 YAML 内容

**示例**:

```typescript
const rule = {
  meta: { /* ... */ },
  rule: { /* ... */ },
  compatibility: { /* ... */ }
};

const yaml = formatter.toYAML(rule, {
  prettyPrint: true,
  autoRedact: true
});

console.log(yaml);
```

#### fromYAML(yamlContent: string): Rule

从 YAML 字符串解析规则对象。

**示例**:

```typescript
const yamlContent = `
meta:
  id: test-rule
  name: Test Rule
rule:
  trigger:
    keywords: ["test"]
`;

const rule = formatter.fromYAML(yamlContent);
```

### ConfigManager 类

配置管理器，用于加载和管理 RuleForge 配置。

#### 构造函数

```typescript
import { ConfigManager } from '@ruleforge/core';

const configManager = new ConfigManager();
```

#### load(options?: LoadOptions): Promise<RuleForgeConfig>

加载配置，支持多级配置优先级。

**参数**:

```typescript
interface LoadOptions {
  configPath?: string;       // 配置文件路径
  overrides?: Partial<RuleForgeConfig>; // 配置覆盖
  strict?: boolean;          // 严格模式 (默认: false)
}
```

**返回值**:

```typescript
interface RuleForgeConfig {
  extraction: {
    minConfidence: number;
    logPath: string;
    applicableScenes: number;
    maxPatterns: number;
  };
  privacy: {
    autoRedact: boolean;
    projectName: string;
    redactPatterns: Array<{
      pattern: string;
      replacement: string;
    }>;
  };
  storage: {
    localRulesDir: string;
    maxVersions: number;
    autoBackup: boolean;
  };
  output: {
    format: 'yaml' | 'json';
    prettyPrint: boolean;
    maxLineLength: number;
  };
}
```

**示例**:

```typescript
// 加载默认配置
const config = await configManager.load();

// 加载并覆盖配置
const config = await configManager.load({
  overrides: {
    extraction: {
      minConfidence: 0.8
    }
  }
});
```

#### initializeProject(options: InitOptions): Promise<void>

初始化 RuleForge 项目。

**参数**:

```typescript
interface InitOptions {
  template?: string;         // 模板名称
  force?: boolean;           // 强制覆盖 (默认: false)
  config?: Partial<RuleForgeConfig>; // 初始配置
}
```

**示例**:

```typescript
await configManager.initializeProject({
  template: 'vue',
  force: true
});
```

### RuleStore 类

规则存储库，用于管理本地规则文件。

#### 构造函数

```typescript
import { RuleStore } from '@ruleforge/core';

const ruleStore = new RuleStore('./.ruleforge/rules');
```

#### save(rule: Rule): Promise<void>

保存规则到本地存储。

**示例**:

```typescript
const rule = {
  meta: { id: 'my-rule', /* ... */ },
  // ... 其他字段
};

await ruleStore.save(rule);
```

#### load(ruleId: string): Promise<Rule>

从本地存储加载规则。

**示例**:

```typescript
const rule = await ruleStore.load('vue-props-validation');
```

#### list(options?: ListOptions): Promise<RuleSummary[]>

列出所有规则。

**参数**:

```typescript
interface ListOptions {
  framework?: string;        // 框架过滤
  language?: string;         // 语言过滤
  minConfidence?: number;    // 最小置信度过滤
}
```

**返回值**:

```typescript
interface RuleSummary {
  id: string;
  name: string;
  version: string;
  confidence: number;
  framework: string;
  language: string;
  created: string;
  updated: string;
}
```

**示例**:

```typescript
const rules = await ruleStore.list({
  framework: 'vue',
  minConfidence: 0.7
});
```

#### delete(ruleId: string): Promise<void>

删除规则。

```typescript
await ruleStore.delete('obsolete-rule');
```

## 高级用法

### 自定义验证规则

```typescript
import { RuleValidator, RuleSchema } from '@ruleforge/core';
import { z } from 'zod';

// 扩展基础 Schema
const CustomRuleSchema = RuleSchema.extend({
  customField: z.string().optional()
});

// 创建自定义验证器
const customValidator = new RuleValidator(CustomRuleSchema);
```

### 批量处理

```typescript
import { RuleExtractor } from '@ruleforge/core';

const extractor = new RuleExtractor();

// 批量处理多个会话
const sessions = [
  { sessionId: 'session-1', logPath: './logs/session1.jsonl' },
  { sessionId: 'session-2', logPath: './logs/session2.jsonl' },
  { sessionId: 'session-3', logPath: './logs/session3.jsonl' }
];

const results = await Promise.all(
  sessions.map(session => 
    extractor.extract({
      sessionId: session.sessionId,
      logPath: session.logPath,
      minConfidence: 0.7
    })
  )
);
```

### 性能监控

```typescript
import { performance } from 'perf_hooks';

const startTime = performance.now();
const startMemory = process.memoryUsage();

const result = await extractor.extract(options);

const endTime = performance.now();
const endMemory = process.memoryUsage();

console.log(`处理时间: ${endTime - startTime}ms`);
console.log(`内存使用: ${endMemory.heapUsed - startMemory.heapUsed} bytes`);
```

## 错误处理

### 异常类型

RuleForge 定义了以下异常类型：

```typescript
class RuleForgeError extends Error {
  code: string;
  details?: any;
}

class ValidationError extends RuleForgeError {
  code = 'VALIDATION_ERROR';
}

class ExtractionError extends RuleForgeError {
  code = 'EXTRACTION_ERROR';
}

class ConfigError extends RuleForgeError {
  code = 'CONFIG_ERROR';
}
```

### 错误处理示例

```typescript
try {
  const result = await extractor.extract(options);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('验证错误:', error.message);
  } else if (error instanceof ExtractionError) {
    console.error('提取错误:', error.message);
  } else {
    console.error('未知错误:', error);
  }
}
```

## 类型定义

### 核心类型

```typescript
// 规则接口
interface Rule {
  meta: Meta;
  rule: RuleDefinition;
  compatibility: Compatibility;
  confidence?: number;
  applicableScenes?: number;
}

// 元数据
interface Meta {
  id: string;
  name: string;
  version: string;
  description: string;
  authors: string[];
  license: string;
  created?: string;
  updated?: string;
  tags?: string[];
  references?: string[];
}

// 规则定义
interface RuleDefinition {
  trigger: Trigger;
  conditions: Condition[];
  suggestions: Suggestion[];
}

// 兼容性
interface Compatibility {
  languages: string[];
  frameworks: string[];
  rep_version: string;
  min_version?: string;
  max_version?: string;
  dependencies?: Record<string, string>;
  environments?: string[];
}
```

## 示例代码

### 完整的规则提取流程

```typescript
import { 
  RuleExtractor, 
  RuleValidator, 
  PatternYamlFormatter,
  RuleStore 
} from '@ruleforge/core';

async function extractAndSaveRules() {
  // 初始化组件
  const extractor = new RuleExtractor();
  const validator = RuleValidator.createStandardValidator();
  const formatter = new PatternYamlFormatter();
  const ruleStore = new RuleStore('./.ruleforge/rules');

  try {
    // 提取规则
    const result = await extractor.extract({
      sessionId: 'my-session',
      logPath: './session.jsonl',
      minConfidence: 0.7
    });

    // 验证并保存规则
    for (const rule of result.rules) {
      const validation = validator.validate(rule);
      
      if (validation.valid) {
        const yaml = formatter.toYAML(rule);
        await ruleStore.save(rule);
        console.log(`✅ 保存规则: ${rule.meta.name}`);
      } else {
        console.log(`❌ 规则验证失败: ${rule.meta.name}`);
      }
    }

    console.log(`🎉 完成! 提取了 ${result.rules.length} 个规则`);
    
  } catch (error) {
    console.error('提取过程失败:', error);
  }
}

extractAndSaveRules();
```

## 相关资源

- [REP v0.1 规范](REP.md)
- [CLI 命令参考](CLI.md)
- [示例规则库](../examples/)
- [性能测试指南](../__tests__/performance/)

---

**版本**: v1.0.0  
**最后更新**: 2024-01-22  
**维护者**: RuleForge Team