# REP v0.2 规范

> Rule Execution Protocol (REP) - 规则执行协议规范

## 概述

REP (Rule Execution Protocol) 是 RuleForge 定义的规则描述标准格式，用于统一编码规则的表示和交换。

**v0.2 新增内容**：schemaVersion 版本化、meta 共享字段（source/forked_from/tags/scene）、priority 优先级、compatibility.scenes 场景过滤。

## 基本结构

每个规则文件必须包含以下三个主要部分：

```yaml
schemaVersion: "0.2.0"    # v0.2 新增：协议版本声明

meta:
  # 元数据信息（必需）
  
rule:
  # 规则定义（必需）
  
compatibility:
  # 兼容性信息（必需）

priority: project           # v0.2 新增：优先级（可选）
```

## schemaVersion 字段（v0.2 新增）

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `schemaVersion` | string | 推荐 | 协议版本号，格式 `"0.2.x"` 或 `"1.x.x"` |

- 缺省或 `"0.1.x"` → 按 v0.1 解析（向后兼容）
- `"0.2.x"` 或更高 → 按 v0.2 解析，启用所有新字段

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

### 可选字段（v0.1 已有）

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `created` | string | 创建时间 | `2024-01-15T10:00:00Z` |
| `updated` | string | 更新时间 | `2024-01-20T15:30:00Z` |
| `references` | string[] | 参考链接 | `["https://..."]` |

### v0.2 新增字段

| 字段 | 类型 | 必需 | 描述 | 示例 |
|------|------|------|------|------|
| `source` | string | 推荐 | 规则来源 | `"local"`、`"github:owner/repo"`、`"npm:@scope/pkg"` |
| `forked_from` | string | 条件 | 原始规则 ID（fork 时必填） | `"vue-props-validation"` |
| `tags` | string[] | 推荐 | 标签分类（≤50字符/个，不可重复） | `["vue", "typescript", "validation"]` |
| `scene` | string | 推荐 | 适用场景 | `"coding"`、`"drama"`、`"multimodal"` |

#### scene 场景值

| 值 | 含义 |
|------|------|
| `coding` | 编程/代码相关 |
| `drama` | 剧本/叙事相关 |
| `multimodal` | 多模态（文本+图像+音频） |
| `writing` | 写作/文档相关 |
| `data` | 数据处理/分析 |

#### source 格式

```
"local"                          # 本地创建
"github:owner/repo"              # GitHub 来源
"gitlab:owner/repo"              # GitLab 来源
"npm:@scope/package-name"        # npm 包来源
"custom:description"             # 自定义来源
```

## priority 字段（v0.2 新增）

| 值 | 含义 | 冲突解决 |
|------|------|------|
| `global` | 全局规则，跨项目生效 | 最高优先级 |
| `project` | 项目级规则（默认） | 中等优先级 |
| `session` | 会话级临时规则 | 最低优先级 |

同 ID 规则冲突时，按 priority 排序：global > project > session。同优先级取 version 最高者。

## rule 字段

### trigger 触发条件

定义规则何时被触发：

```yaml
trigger:
  type: "file_pattern"              # 触发类型
  keywords: ["defineProps", "props"] # 关键词数组
  pattern: "**/*.vue"               # 文件匹配模式
  file_types: ["vue", "ts"]         # 文件类型数组
  language: "typescript"            # 编程语言
  context: "Vue component props definition"  # 上下文描述
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
  - type: "code_example"
    description: "Use TypeScript interface for props"
    code: |
      interface Props {
        title: string
        count?: number
      }
      
      const props = defineProps<Props>()
    priority: "high"
    
  - type: "command"
    description: "Run type check"
    command: "vue-tsc --noEmit"
    
  - type: "file_reference"
    description: "Reference documentation"
    files:
      - "docs/props-guide.md"
```

## compatibility 字段

### 必需字段

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `languages` | string[] | 支持的语言 | `["typescript", "vue"]` |

### 可选字段

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `frameworks` | string[] | 支持的框架 | `["vue"]` |
| `tools` | string[] | 支持的工具 | `["vscode", "trae"]` |
| `min_version` | string | 最低版本要求 | `"3.4.0"` |
| `max_version` | string | 最高版本限制 | `"4.0.0"` |
| `dependencies` | object | 依赖要求 | `{"vue": ">=3.4"}` |
| `environments` | string[] | 运行环境 | `["browser", "node"]` |
| `scenes` | string[] | v0.2 新增：适用场景 | `["coding", "writing"]` |

## confidence 字段

| 范围 | 含义 |
|------|------|
| 0.9 - 1.0 | 高置信度（需谨慎验证新规则） |
| 0.7 - 0.9 | 中置信度（推荐范围） |
| 0.5 - 0.7 | 低置信度（建议验证） |
| < 0.5 | 极低置信度（验证警告） |

## 完整示例

### v0.2 规则示例

```yaml
schemaVersion: "0.2.0"

meta:
  id: vue-props-validation
  name: Vue Props Validation
  version: 1.0.0
  description: Validate props use TypeScript interface instead of object literal
  authors: ["alice", "bob"]
  license: MIT
  created: "2024-01-15T10:00:00Z"
  updated: "2024-01-20T15:30:00Z"
  source: "github:vuejs/core"
  forked_from: "vue-props-basic"
  tags: ["vue", "typescript", "validation", "props"]
  scene: "coding"

rule:
  trigger:
    type: "file_pattern"
    keywords: ["defineProps", "props"]
    pattern: "**/*.vue"
    file_types: ["vue"]
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
    - type: "code_example"
      description: "Use TypeScript interface for better type safety"
      code: |
        interface Props {
          title: string
          count?: number
          disabled?: boolean
        }
        
        const props = defineProps<Props>()
      priority: "high"
      
    - type: "command"
      description: "Run type check to verify"
      command: "vue-tsc --noEmit"

compatibility:
  languages: ["typescript", "vue"]
  frameworks: ["vue"]
  tools: ["vscode", "trae"]
  min_version: "3.4.0"
  max_version: "4.0.0"
  scenes: ["coding"]
  dependencies:
    vue: ">=3.4"

confidence: 0.85
priority: project
```

### v0.1 规则示例（向后兼容）

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

confidence: 0.8
```

## 验证规则

### 必需字段验证

```typescript
// v0.1 必需字段
const requiredV01 = {
  meta: ['id', 'name', 'version', 'description', 'authors', 'license'],
  rule: ['trigger', 'conditions', 'suggestions'],
  compatibility: ['languages']
};

// v0.2 推荐字段（不阻塞验证，但会警告）
const recommendedV02 = {
  meta: ['source', 'tags', 'scene'],
  compatibility: ['scenes']
};
```

### v0.2 验证规则

| 检查项 | 级别 | 描述 |
|------|------|------|
| schemaVersion 格式 | 警告 | 应为 `"0.2.x"` 或 `"1.x.x"` |
| source 格式 | 警告 | 应使用标准前缀 |
| forked_from + source=local | 警告 | 建议标注真实来源 |
| tags 空字符串 | 错误 | 不能包含空字符串 |
| tags 重复 | 警告 | 不区分大小写去重 |
| scene 未知值 | 警告 | 不在已知列表中 |
| priority 非法值 | 错误 | 必须是 global/project/session |
| global + 低置信度 | 警告 | global 规则建议置信度 >= 0.7 |

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
5. **标注来源**：v0.2 建议标注 source 和 tags

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

### 从 v0.1 升级到 v0.2

1. 添加 `schemaVersion: "0.2.0"` 字段
2. 为 meta 添加 `source`、`tags`、`scene` 字段（推荐）
3. 为 compatibility 添加 `scenes` 字段（推荐）
4. 添加 `priority` 字段（可选，默认 project）
5. 运行 `ruleforge validate` 检查兼容性

**向后兼容**：v0.2 解析器完全兼容 v0.1 规则文件。缺少 v0.2 字段时自动降级为 v0.1 行为。

## 相关资源

- [RuleForge 官方文档](https://ruleforge.dev/docs)
- [示例规则库](https://github.com/kialajin/ruleforge/tree/main/examples)
- [验证工具](https://github.com/kialajin/ruleforge/tree/main/packages/core/src/validator)

---

**版本**: v0.2  
**最后更新**: 2026-04-27  
**状态**: 草案  
**维护者**: RuleForge Team
