# RuleForge CLI 命令参考

> 命令行工具完整使用指南

## 概述

RuleForge CLI 提供完整的命令行界面，用于管理规则提取、验证和存储。

## 安装

### 全局安装（推荐）

```bash
npm install -g @ruleforge/cli
```

### 项目依赖

```bash
npm install @ruleforge/cli --save-dev
```

### 验证安装

```bash
ruleforge --version
# 输出: @ruleforge/cli v1.0.0
```

## 命令概览

| 命令 | 描述 | 常用选项 |
|------|------|----------|
| `init` | 初始化项目 | `--template`, `--force` |
| `extract` | 提取规则 | `--log`, `--min-conf`, `--output` |
| `validate` | 验证规则 | `--file`, `--strict` |
| `list` | 列出规则 | `--framework`, `--language` |
| `show` | 显示规则详情 | `--id`, `--format` |
| `delete` | 删除规则 | `--id`, `--force` |
| `config` | 配置管理 | `--get`, `--set`, `--reset` |

## 命令详解

### ruleforge init

初始化 RuleForge 项目配置。

#### 语法

```bash
ruleforge init [options]
```

#### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--template <template>` | `-t` | 项目模板 | `default` |
| `--force` | `-f` | 强制覆盖现有配置 | `false` |
| `--config-path <path>` | `-c` | 配置文件路径 | `./.ruleforge.yaml` |

#### 可用模板

- `default` - 默认配置
- `vue` - Vue.js 项目配置
- `typescript` - TypeScript 项目配置
- `react` - React 项目配置

#### 示例

```bash
# 使用 Vue 模板初始化
ruleforge init --template vue

# 强制覆盖现有配置
ruleforge init --template typescript --force

# 指定配置文件路径
ruleforge init --config-path ./config/ruleforge.yaml
```

#### 输出示例

```
🚀 初始化 RuleForge 项目...
✅ 创建配置文件: ./.ruleforge.yaml
✅ 创建规则目录: ./.ruleforge/rules
✅ 应用模板: vue
📄 配置内容:
  - 最小置信度: 0.7
  - 适用场景: 2
  - 自动脱敏: 启用
🎉 初始化完成!
```

### ruleforge extract

从开发会话日志中提取规则。

#### 语法

```bash
ruleforge extract [options]
```

#### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--log <path>` | `-l` | 日志文件路径 | `required` |
| `--session-id <id>` | `-s` | 会话标识符 | 自动生成 |
| `--min-conf <number>` | `-m` | 最小置信度 | `0.7` |
| `--scenes <number>` | `-n` | 适用场景数量 | `2` |
| `--output <path>` | `-o` | 输出文件路径 | 控制台输出 |
| `--format <format>` | `-f` | 输出格式 | `yaml` |
| `--no-redact` | | 禁用自动脱敏 | `false` |

#### 示例

```bash
# 基本提取
ruleforge extract --log ./session.jsonl

# 指定最小置信度
ruleforge extract --log ./session.jsonl --min-conf 0.8

# 输出到文件
ruleforge extract --log ./session.jsonl --output ./rules/

# 禁用脱敏
ruleforge extract --log ./session.jsonl --no-redact
```

#### 输出示例

```
📊 开始规则提取...
📝 读取日志文件: ./session.jsonl
✅ 解析 1,250 个事件
🔍 识别 45 个模式
📈 生成 12 个规则

📊 提取统计:
  - 总事件数: 1,250
  - 识别模式: 45
  - 生成规则: 12
  - 平均置信度: 0.82
  - 处理时间: 2.3s

✅ 规则已保存到: ./rules/
```

### ruleforge validate

验证规则文件是否符合 REP v0.1 规范。

#### 语法

```bash
ruleforge validate [options] [file]
```

#### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--file <path>` | `-f` | 规则文件路径 | `required` |
| `--strict` | `-s` | 严格模式验证 | `false` |
| `--format <format>` | | 输出格式 | `table` |
| `--fix` | | 自动修复可修复的问题 | `false` |

#### 示例

```bash
# 验证单个文件
ruleforge validate --file ./rule.yaml

# 严格模式验证
ruleforge validate --file ./rule.yaml --strict

# 验证目录下所有文件
ruleforge validate --file ./rules/

# 自动修复
ruleforge validate --file ./rule.yaml --fix
```

#### 输出示例

```
🔍 验证规则文件: ./rule.yaml

✅ 验证结果:
  - 基本结构: ✅ 通过
  - 必需字段: ✅ 通过
  - 数据类型: ✅ 通过
  - 格式规范: ✅ 通过

⚠️ 警告:
  - meta.description: 描述过短 (建议 > 20 字符)
  - rule.suggestions[0].code: 代码示例过长

📄 验证完成: 1 个文件, 0 个错误, 2 个警告
```

### ruleforge list

列出本地存储的规则。

#### 语法

```bash
ruleforge list [options]
```

#### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--framework <name>` | `-f` | 按框架过滤 | 所有框架 |
| `--language <lang>` | `-l` | 按语言过滤 | 所有语言 |
| `--min-conf <number>` | `-m` | 最小置信度过滤 | `0` |
| `--format <format>` | | 输出格式 | `table` |
| `--json` | `-j` | JSON 格式输出 | `false` |

#### 示例

```bash
# 列出所有规则
ruleforge list

# 按框架过滤
ruleforge list --framework vue

# 按语言和置信度过滤
ruleforge list --language typescript --min-conf 0.8

# JSON 格式输出
ruleforge list --json
```

#### 输出示例

```
📚 本地规则库 (共 25 个规则)

┌────────────────────────────┬────────────┬────────┬────────────┬────────────┐
│ 名称                       │ 框架       │ 语言   │ 置信度     │ 更新日期   │
├────────────────────────────┼────────────┼────────┼────────────┼────────────┤
│ Vue Props Validation       │ vue        │ ts     │ 0.92       │ 2024-01-15 │
│ TypeScript Null Check      │ node       │ ts     │ 0.85       │ 2024-01-14 │
│ React Hook Dependencies    │ react      │ js     │ 0.78       │ 2024-01-13 │
└────────────────────────────┴────────────┴────────┴────────────┴────────────┘
```

### ruleforge show

显示规则的详细信息。

#### 语法

```bash
ruleforge show [options]
```

#### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--id <rule-id>` | `-i` | 规则 ID | `required` |
| `--format <format>` | `-f` | 输出格式 | `yaml` |
| `--file <path>` | | 从文件读取规则 | 本地存储 |

#### 示例

```bash
# 显示规则详情
ruleforge show --id vue-props-validation

# 从文件显示
ruleforge show --file ./rule.yaml

# JSON 格式输出
ruleforge show --id vue-props-validation --format json
```

#### 输出示例

```yaml
# ruleforge show --id vue-props-validation

meta:
  id: vue-props-validation
  name: Vue Props Validation
  version: 1.0.0
  description: Validate props use TypeScript interface instead of object literal
  authors: ["alice", "bob"]
  license: MIT

rule:
  trigger:
    keywords: ["defineProps", "props"]
    file_pattern: "**/*.vue"
    language: typescript
  
  conditions:
    - type: code_contains
      condition: defineProps with object literal
      negated: false
  
  suggestions:
    - description: Use TypeScript interface for better type safety
      code: |
        interface Props {
          title: string
          count?: number
        }
        const props = defineProps<Props>()
      priority: high

compatibility:
  languages: [typescript, vue]
  frameworks: [vue]
  rep_version: ^1.0
```

### ruleforge delete

删除本地存储的规则。

#### 语法

```bash
ruleforge delete [options]
```

#### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--id <rule-id>` | `-i` | 规则 ID | `required` |
| `--force` | `-f` | 强制删除（无需确认） | `false` |
| `--all` | `-a` | 删除所有规则 | `false` |

#### 示例

```bash
# 删除单个规则（需要确认）
ruleforge delete --id obsolete-rule

# 强制删除
ruleforge delete --id obsolete-rule --force

# 删除所有规则
ruleforge delete --all --force
```

#### 输出示例

```
🗑️  删除规则: obsolete-rule
⚠️  确认删除? (y/N) y
✅ 规则已删除
```

### ruleforge config

管理 RuleForge 配置。

#### 语法

```bash
ruleforge config [command] [options]
```

#### 子命令

| 子命令 | 描述 |
|--------|------|
| `get` | 获取配置值 |
| `set` | 设置配置值 |
| `reset` | 重置配置 |
| `show` | 显示完整配置 |

#### 示例

```bash
# 显示完整配置
ruleforge config show

# 获取特定配置
ruleforge config get extraction.minConfidence

# 设置配置值
ruleforge config set extraction.minConfidence 0.8

# 重置为默认值
ruleforge config reset
```

#### 输出示例

```bash
# ruleforge config show

extraction:
  minConfidence: 0.7
  logPath: ./logs
  applicableScenes: 2

privacy:
  autoRedact: true
  projectName: {project_name}

storage:
  localRulesDir: .ruleforge/rules
  maxVersions: 10
```

## 全局选项

所有命令都支持以下全局选项：

| 选项 | 别名 | 描述 |
|------|------|------|
| `--verbose` | `-v` | 详细输出 |
| `--silent` | `-s` | 静默模式 |
| `--help` | `-h` | 显示帮助 |
| `--version` | `-V` | 显示版本 |

## 配置文件

### 配置文件位置

RuleForge 按以下优先级加载配置：

1. **项目级**: `./.ruleforge.yaml`
2. **用户级**: `~/.ruleforge/config.yaml`
3. **默认配置**: 内置默认值

### 配置示例

```yaml
# .ruleforge.yaml
extraction:
  minConfidence: 0.7
  logPath: ./logs
  applicableScenes: 2
  maxPatterns: 50

privacy:
  autoRedact: true
  projectName: '{project_name}'
  redactPatterns:
    - pattern: '/Users/dev/my-project'
      replacement: '{project_name}'

storage:
  localRulesDir: .ruleforge/rules
  maxVersions: 10
  autoBackup: true

output:
  format: yaml
  prettyPrint: true
  maxLineLength: 100
```

## 环境变量

可以通过环境变量覆盖配置：

```bash
export RULEFORGE_MIN_CONFIDENCE=0.8
export RULEFORGE_LOG_PATH=./my-logs
export RULEFORGE_AUTO_REDACT=false
```

## 退出代码

| 代码 | 描述 |
|------|------|
| `0` | 成功 |
| `1` | 一般错误 |
| `2` | 配置错误 |
| `3` | 验证错误 |
| `4` | 提取错误 |
| `5` | 文件错误 |

## 使用示例

### 完整工作流

```bash
# 1. 初始化项目
ruleforge init --template vue

# 2. 提取规则
ruleforge extract --log ./session.jsonl --min-conf 0.8

# 3. 验证规则
ruleforge validate --file ./.ruleforge/rules/

# 4. 列出规则
ruleforge list --framework vue --min-conf 0.7

# 5. 查看规则详情
ruleforge show --id vue-props-validation
```

### 批量处理

```bash
# 处理多个会话
for session in session1 session2 session3; do
  ruleforge extract --log ./logs/$session.jsonl --output ./rules/$session/
  ruleforge validate --file ./rules/$session/
done
```

### 集成到 CI/CD

```yaml
# GitHub Actions 示例
name: Rule Validation
on: [push, pull_request]

jobs:
  validate-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install RuleForge
        run: npm install -g @ruleforge/cli
        
      - name: Validate Rules
        run: ruleforge validate --file ./rules/ --strict
```

## 故障排除

### 常见问题

**Q: 命令找不到**
```bash
# 检查安装
npm list -g @ruleforge/cli

# 重新安装
npm install -g @ruleforge/cli
```

**Q: 配置文件错误**
```bash
# 检查配置文件语法
ruleforge validate --file ./.ruleforge.yaml

# 重置配置
ruleforge config reset
```

**Q: 权限问题**
```bash
# 检查文件权限
ls -la ./.ruleforge/

# 修复权限
chmod 755 ./.ruleforge/
```

### 调试模式

启用详细输出以调试问题：

```bash
ruleforge --verbose extract --log ./session.jsonl
```

## 相关资源

- [API 文档](API.md)
- [REP v0.1 规范](REP.md)
- [示例规则库](../examples/)
- [GitHub 仓库](https://github.com/kialajin/ruleforge)

---

**版本**: v1.0.0  
**最后更新**: 2024-01-22  
**维护者**: RuleForge Team