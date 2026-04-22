# REP v0.1 规范

> Rule Execution Protocol (REP) - 规则执行协议规范

## 概述

REP (Rule Execution Protocol) 是 RuleForge 定义的规则描述标准格式，用于统一编码规则的表示和交换。

## 基本结构

每个规则文件必须包含以下三个主要部分：

```yaml
meta:
  # 元数据信息（必需）
  
rule:
  # 规则定义（必需）
  
compatibility:
  # 兼容性信息（必需）
```

## meta 字段

### 必需字段

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `id` | string | 唯一标识符 | `vue-props-validation` |
| `name` | string | 人类可读名称 | `Vue Props Validation` |
| `version` | string | 语义版本 | `1.0.0` |
| `description` | string | 详细说明 | `Validate props use TypeScript interface` |
| `authors` | string[] | 贡献者列表 | `["alice", "bob"]` |
| `license` | string | 许可证 | `MIT` |

### 可选字段

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `created` | string | 创建时间 | `2024-01-15T10:00:00Z` |
| `updated` | string | 更新时间 | `2024-01-20T15:30:00Z` |
| `tags` | string[] | 标签分类 | `["vue", "typescript", "validation"]` |
| `references` | string[] | 参考链接 | `["https://vuejs.org/guide/typescript/composition-api.html"]` |

## rule 字段

### trigger 触发条件

定义规则何时被触发：

```yaml
trigger:
  keywords: ["defineProps", "props"]           # 关键词数组
  file_pattern: "**/*.vue"                      # 文件匹配模式
  language: "typescript"                        # 编程语言
  context: "Vue component props definition"     # 上下文描述
```

#### 支持的触发类型

- `keywords`: 代码中包含的关键词
- `file_pattern`: Glob 文件匹配模式
- `language`: 编程语言标识
- `file_types`: 文件类型数组
- `context`: 应用上下文描述

### conditions 条件列表

定义规则的应用条件：

```yaml
conditions:
  - type: "code_contains"
    condition: "defineProps without interface"
    negated: false
    
  - type: "code_pattern"
    pattern: "defineProps\\(\\{[^}]*\\}\\)"
    negated: true
```

#### 条件类型

- `code_contains`: 代码包含特定内容
- `code_pattern`: 正则表达式匹配
- `file_structure`: 文件结构检查
- `import_dependency`: 导入依赖检查

### suggestions 建议列表

提供修复建议和代码示例：

```yaml
suggestions:
  - description: "Use TypeScript interface for props"
    code: |
      interface Props {
        title: string
        count?: number
      }
      
      const props = defineProps<Props>()
    priority: "high"
    
  - description: "Add JSDoc comments for better type inference"
    code: |
      /**
       * @typedef {Object} Props
       * @property {string} title
       * @property {number} [count]
       */
      const props = defineProps({
        title: String,
        count: Number
      })
    priority: "medium"
```

## compatibility 字段

### 必需字段

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `languages` | string[] | 支持的语言 | `["typescript", "vue"]` |
| `frameworks` | string[] | 支持的框架 | `["vue"]` |
| `rep_version` | string | REP 协议版本 | `"^1.0"` |

### 可选字段

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `min_version` | string | 最低版本要求 | `"3.4.0"` |
| `max_version` | string | 最高版本限制 | `"4.0.0"` |
| `dependencies` | object | 依赖要求 | `{"vue": ">=3.4"}` |
| `environments` | string[] | 运行环境 | `["browser", "node"]` |

## 完整示例

### Vue Props 验证规则

```yaml
meta:
  id: vue-props-validation
  name: Vue Props Validation
  version: 1.0.0
  description: Validate props use TypeScript interface instead of object literal
  authors: ["alice", "bob"]
  license: MIT
  created: "2024-01-15T10:00:00Z"
  updated: "2024-01-20T15:30:00Z"
  tags: ["vue", "typescript", "validation", "props"]

rule:
  trigger:
    keywords: ["defineProps", "props"]
    file_pattern: "**/*.vue"
    language: "typescript"
    context: "Vue component props definition"
    
  conditions:
    - type: "code_contains"
      condition: "defineProps with object literal"
      negated: false
      
    - type: "code_pattern"
      pattern: "defineProps\\(\\{[^}]*\\}\\)"
      negated: false
      
  suggestions:
    - description: "Use TypeScript interface for better type safety"
      code: |
        interface Props {
          title: string
          count?: number
          disabled?: boolean
        }
        
        const props = defineProps<Props>()
      priority: "high"
      
    - description: "Add JSDoc comments for better documentation"
      code: |
        /**
         * Component props interface
         * @property {string} title - The title of the component
         * @property {number} [count] - Optional count value
         * @property {boolean} [disabled] - Whether the component is disabled
         */
        interface Props {
          title: string
          count?: number
          disabled?: boolean
        }
        
        const props = defineProps<Props>()
      priority: "medium"

compatibility:
  languages: ["typescript", "vue"]
  frameworks: ["vue"]
  min_version: "3.4.0"
  max_version: "4.0.0"
  rep_version: "^1.0"
  dependencies:
    vue: ">=3.4"
```

### TypeScript 类型检查规则

```yaml
meta:
  id: typescript-null-check
  name: TypeScript Null Check
  version: 1.0.0
  description: "Add null checks for potentially undefined values"
  authors: ["charlie"]
  license: MIT

rule:
  trigger:
    keywords: ["undefined", "null", "optional"]
    file_pattern: "**/*.ts"
    language: "typescript"
    
  conditions:
    - type: "code_pattern"
      pattern: "\\w+\\?\\.\\w+"
      negated: false
      
  suggestions:
    - description: "Add explicit null check before property access"
      code: |
        // Before
        const value = obj?.prop
        
        // After
        if (obj && obj.prop !== undefined) {
          const value = obj.prop
        }
      priority: "high"

compatibility:
  languages: ["typescript"]
  frameworks: ["node", "react", "vue"]
  rep_version: "^1.0"
```

## 验证规则

### 必需字段验证

每个规则文件必须包含以下字段：

```typescript
const requiredFields = {
  meta: ['id', 'name', 'version', 'description', 'authors', 'license'],
  rule: ['trigger', 'conditions', 'suggestions'],
  compatibility: ['languages', 'frameworks', 'rep_version']
};
```

### 数据类型验证

使用 Zod Schema 进行严格类型验证：

```typescript
const RuleSchema = z.object({
  meta: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(10),
    authors: z.array(z.string()).min(1),
    license: z.string().min(1)
  }),
  
  rule: z.object({
    trigger: z.object({
      keywords: z.array(z.string()).optional(),
      file_pattern: z.string().optional(),
      language: z.string().optional(),
      context: z.string().optional()
    }),
    
    conditions: z.array(z.object({
      type: z.enum(['code_contains', 'code_pattern', 'file_structure']),
      condition: z.string(),
      negated: z.boolean().default(false)
    })).min(1),
    
    suggestions: z.array(z.object({
      description: z.string(),
      code: z.string(),
      priority: z.enum(['low', 'medium', 'high']).default('medium')
    })).min(1)
  }),
  
  compatibility: z.object({
    languages: z.array(z.string()).min(1),
    frameworks: z.array(z.string()).min(1),
    rep_version: z.string()
  })
});
```

## 版本管理

### 语义版本

REP 遵循语义版本规范：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 版本约束

使用 npm 风格的版本约束：

```yaml
compatibility:
  rep_version: "^1.0"    # 兼容 1.x.x，不兼容 2.0.0
  # 或者
  rep_version: "~1.2.3"  # 兼容 1.2.x，不兼容 1.3.0
```

## 最佳实践

### 规则设计原则

1. **单一职责**：每个规则只解决一个问题
2. **明确触发**：触发条件要具体明确
3. **实用建议**：提供可执行的修复方案
4. **版本兼容**：明确兼容性要求

### 命名规范

- **ID**: 使用 kebab-case，如 `vue-props-validation`
- **名称**: 使用 Title Case，如 `Vue Props Validation`
- **标签**: 使用小写字母，如 `["vue", "typescript"]`

### 代码示例规范

- 代码示例不超过 15 行
- 突出关键差异（before/after）
- 使用真实可运行的代码片段
- 避免硬编码项目路径

## 扩展机制

### 自定义条件类型

可以通过扩展 `conditions` 类型来支持新的检查逻辑：

```yaml
conditions:
  - type: "custom_check"
    check: "my_custom_validator"
    parameters:
      threshold: 0.8
      pattern: "specific_pattern"
```

### 插件系统

REP 支持插件扩展，可以添加：

- 新的触发条件类型
- 自定义验证逻辑
- 特定框架的规则模板

## 迁移指南

### 从 v0.1 升级到 v1.0

1. 添加必需的 `rep_version` 字段
2. 更新版本号为语义版本格式
3. 验证所有字段符合新的 Schema
4. 运行 `ruleforge validate` 检查兼容性

## 相关资源

- [RuleForge 官方文档](https://ruleforge.dev/docs)
- [示例规则库](https://github.com/kialajin/ruleforge/tree/main/examples)
- [验证工具](https://github.com/kialajin/ruleforge/tree/main/packages/core/src/validator)

---

**版本**: v0.1  
**最后更新**: 2024-01-22  
**状态**: 草案  
**维护者**: RuleForge Team