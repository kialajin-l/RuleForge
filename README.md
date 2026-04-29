# RuleForge

> 🌊 This is a **Vibe Coding** project: Built with AI, for AI-augmented development.

![npm](https://img.shields.io/npm/v/@ruleforge/cli.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Tests](https://img.shields.io/github/actions/workflow/status/kialajin-l/RuleForge/test.yml)

**RuleForge** 是一个智能规则引擎，能够自动从开发会话中识别最佳实践，并将其转化为可共享、可执行的编码规则。

本项目灵感来源于 **andrej-karpathy-skills** 项目的 CLAUDE.md 行为规则设计理念，将其扩展为完整的规则提取、存储、匹配和分发引擎。它的核心价值是：**将你隐性的开发习惯转化为显性的 AI 提示规范**。

生成的规则文件作用完全等同于 `CLAUDE.md` 或 `.cursorrules`——它们会被自动注入到 AI 编辑器的系统上下文中，让 AI 在后续对话中天然遵循你的代码规范、架构偏好与团队标准，彻底告别重复写 Prompt 的烦恼。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🔍 **自动模式识别** | 从开发会话中提取高频代码模式和最佳实践 |
| 📝 **REP v0.2 标准** | 符合行业规范的 YAML 规则格式，支持触发器、条件、建议三段式 |
| 🛡️ **智能验证** | Zod Schema 验证确保每条规则的结构完整性和字段合规 |
| 🔐 **自动脱敏** | 保护敏感信息——API Key、项目路径、密码等自动替换 |
| 📊 **置信度评分** | 智能评估规则的可复用性（0-100%），基于模式频率和修复成功率 |
| 🔎 **代码模式匹配** | 基于正则的代码内容匹配 + 基于 glob 的文件路径匹配 |
| 🤖 **MCP Server** | 标准 MCP 协议暴露，任何支持 MCP 的 AI Agent 即插即用 |
| 🔄 **批量处理** | 支持多文件、多会话并行分析 |
| 💾 **本地规则库** | `~/.ruleforge/rules/` 全局规则存储，跨项目共享 |

---

## 🏗️ 架构概览

RuleForge 采用 monorepo 模块化设计，包含四个核心包：

```
ruleforge/
├── packages/
│   ├── core/            # @ruleforge/core — 核心引擎
│   │   ├── storage/     #   规则存储、索引、验证
│   │   ├── matcher/     #   代码模式匹配器
│   │   └── extractor/   #   规则提取引擎
│   ├── cli/             # @ruleforge/cli — 命令行工具
│   ├── mcp/             # @ruleforge/mcp — MCP Server（AI Agent 集成）
│   └── adapter-trae/    # ruleforge-adapter-trae — Trae/VSCode 插件
├── docs/                # 规范文档（REP v0.2 等）
└── examples/            # 示例规则
```

### 各包职责

| 包名 | 作用 | 谁在用 |
|------|------|--------|
| `@ruleforge/core` | 规则存储、验证、匹配、提取 | 所有上层包的基础依赖 |
| `@ruleforge/cli` | 命令行操作：init / validate / search / match / stats | 开发者在终端使用 |
| `@ruleforge/mcp` | MCP Server，暴露 5 个标准 tool | AI Agent（Claude、MiMo 等） |
| `ruleforge-adapter-trae` | 编辑器插件，自动监听会话并提取规则 | Trae / VSCode 用户 |

---

## 📦 安装

### 方式一：npm 全局安装 CLI（推荐）

适合希望在终端直接使用 RuleForge 命令的开发者。

```bash
npm install -g @ruleforge/cli
```

安装后可直接使用 `ruleforge` 命令：

```bash
ruleforge --help
```

### 方式二：项目内安装核心库

适合需要在自己项目中集成 RuleForge 能力的场景。

```bash
npm install @ruleforge/core
```

```typescript
import { RuleStore, RuleMatcher } from '@ruleforge/core';

const store = new RuleStore({ rulesDir: '.ruleforge/rules' });
await store.initialize();

const matcher = new RuleMatcher(store);
const matches = await matcher.match({
  filePath: 'src/app.ts',
  fileContent: sourceCode,
  language: 'typescript',
});
```

### 方式三：MCP Server（AI Agent 集成）

适合让 AI Agent（Claude Desktop、MiMo、Cursor 等）直接调用规则引擎能力。

```bash
npm install -g @ruleforge/mcp
```

然后在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "ruleforge": {
      "command": "node",
      "args": ["E:/code/ruleforge/packages/mcp/dist/index.js"],
      "env": {
        "RF_HOME": "C:\\Users\\<你的用户名>\\.ruleforge"
      }
    }
  }
}
```

> 💡 `RF_HOME` 指向规则库目录，默认为 `~/.ruleforge`。可通过环境变量 `RULEFORGE_HOME` 覆盖。

### 方式四：Trae / VSCode 插件

适合在编辑器中无感使用 RuleForge 的场景。

1. 在 Trae 或 VSCode 扩展商店搜索 **"RuleForge"**
2. 安装 `ruleforge-adapter-trae`
3. 插件会自动监听编码会话，检测到高频模式时弹出提示
4. 确认后规则自动保存并注入 AI 上下文

### 方式五：从源码安装

适合贡献代码或需要最新开发版本的场景。

```bash
git clone https://github.com/kialajin-l/RuleForge.git
cd RuleForge
npm install
npm run build
```

构建完成后，各包的产物在 `packages/<包名>/dist/` 目录。

---

## 🚀 使用指南

### CLI 命令

#### 初始化项目

```bash
ruleforge init
```

在项目根目录生成 `.ruleforge/` 配置目录，包含 `rules/`（正式规则）和 `candidates/`（候选规则）。

#### 验证规则

```bash
ruleforge validate .ruleforge/rules/my-rule.yaml
```

检查规则文件是否符合 REP v0.2 标准，输出验证结果。

#### 搜索规则

```bash
# 按语言搜索
ruleforge search --language typescript

# 按标签搜索
ruleforge search --tags best-practice,logging

# 按关键词搜索
ruleforge search --keyword "console.log"
```

#### 代码模式匹配

```bash
ruleforge match src/app.ts
```

分析指定文件，返回所有匹配的规则和建议。

#### 查看统计

```bash
ruleforge stats
```

输出规则库概览：规则总数、语言分布、优先级分布、热门标签等。

### MCP Tool（AI Agent 调用）

当 RuleForge MCP Server 运行后，AI Agent 可通过以下 5 个标准 tool 调用规则引擎：

| Tool | 用途 | 参数 |
|------|------|------|
| `rf_suggest` | 分析单个文件变更，返回适用规则建议 | `filePath`, `changeType` |
| `rf_suggest_all` | 批量分析多个文件 | `files: [{filePath, changeType}]` |
| `rf_rules` | 查询/搜索规则库 | `language?`, `tags?`, `keyword?`, `limit?` |
| `rf_explain` | 查看某条规则的完整详情 | `ruleId` |
| `rf_stats` | 查看规则库统计概览 | 无 |

**典型交互流程：**

```
用户: "帮我检查 src/app.ts 有没有违反团队规范的地方"
  ↓
AI Agent 调用 rf_suggest({ filePath: "src/app.ts", changeType: "modify" })
  ↓
返回: "匹配到 2 条规则：禁止 console.log (56%)、使用严格相等 (45%)"
  ↓
AI Agent 在生成代码时自动遵循这些规则
```

### 规则文件格式（REP v0.2）

```yaml
schemaVersion: "0.2"
meta:
  id: my-rule-name
  name: "规则显示名"
  description: "规则描述"
  version: "1.0.0"
  tags: [typescript, best-practice]
  source: "session-extract"
  authors: ["your-name"]
  license: "MIT"
  created: "2026-04-29T00:00:00Z"
  updated: "2026-04-29T00:00:00Z"

priority: project        # project | global | session
confidence: 0.85         # 0-1，置信度评分

rule:
  trigger:
    type: code_pattern   # code_pattern | file_pattern | command | git_operation
    pattern: ': any\\b'
    file_types: [typescript]
  conditions:
    - type: file_exists
      condition: "!**/test/**"
      negated: false
  suggestions:
    - type: code_fix
      description: "使用 unknown 替代 any"
      code: "unknown"

compatibility:
  languages: [typescript]
  frameworks: []         # 可选：vue, react, express 等
```

---

## 📖 使用场景

**场景 1：发现重复代码模式**

当你多次创建类似组件时，RuleForge 会自动识别并提取通用模式。

> 多次创建 Vue 表单组件 → 提取表单验证规则 → AI 下次创建表单时自动遵循

**场景 2：解决同类错误**

多次修复同一类错误后，RuleForge 会生成预防性规则。

> 多次修复 `any` 类型错误 → 提取类型检查规则 → AI 写代码时自动避免 `any`

**场景 3：团队规范沉淀**

将个人最佳实践转化为团队共享规则，通过 MCP Server 分发给所有成员的 AI Agent。

> 代码审查模式 → 提取代码质量规则 → 团队 AI 统一遵循

**场景 4：AI Agent 自主学习**

AI Agent 通过 MCP 协议调用 RuleForge，在每次代码变更时自动获取相关规则建议，无需人工干预。

---

## ⚙️ 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RF_HOME` | `~/.ruleforge` | 规则库根目录 |
| `RULEFORGE_HOME` | `~/.ruleforge` | 同上（别名） |
| `RULEFORGE_MIN_CONFIDENCE` | `0.7` | 最低置信度阈值 |
| `RULEFORGE_AUTO_REDACT` | `true` | 自动脱敏开关 |

### `.ruleforge.yaml` 配置文件

```yaml
extraction:
  minConfidence: 0.7
  applicableScenes: 2
  maxPatterns: 50

privacy:
  autoRedact: true
  redactPatterns:
    - pattern: 'sk-[a-zA-Z0-9]{20,}'
      replacement: '{api_key}'

storage:
  localRulesDir: .ruleforge/rules
  maxVersions: 10
  autoBackup: true

output:
  format: yaml
  prettyPrint: true
```

---

## 🔧 开发

### 开发命令

```bash
# 安装依赖
npm install

# 构建所有包
npm run build

# 运行测试
npm test

# 运行演示
npm run demo
```

### MCP 自循环测试

```bash
# 构建
npm run build

# 运行 MCP 自循环测试（Client 连接 Server 端到端验证）
node --input-type=module < mcp-test.mjs
```

---

## 🗺️ Roadmap

### v1.2（当前版本）

- [x] 核心引擎：规则存储、验证、匹配
- [x] CLI 工具：init / validate / search / match / stats
- [x] MCP Server：5 个标准 tool，stdio 传输
- [x] Trae/VSCode 插件适配器
- [x] REP v0.2 规则格式标准
- [x] 本地规则库：`~/.ruleforge/rules/` 全局存储 + 索引

### v1.5（计划中）

- [ ] **规则提取引擎**：从 JSONL 会话日志中自动提取候选规则
- [ ] **置信度衰减**：长期未使用的规则自动降低优先级
- [ ] **规则冲突检测**：自动发现互相矛盾的规则并提示
- [ ] **HTTP 传输**：MCP Server 支持 HTTP/SSE 模式，支持远程调用
- [ ] **更多语言支持**：Python、Go、Rust 规则模板

### v2.0（愿景）

- [ ] **规则市场**：社区规则共享平台，一键安装高质量规则包
- [ ] **自适应规则**：根据项目上下文自动调整规则优先级和置信度
- [ ] **规则链**：多条规则组合形成工作流（如 lint → fix → verify）
- [ ] **可视化仪表盘**：Web UI 展示规则库状态、匹配热力图、团队使用统计
- [ ] **CI/CD 集成**：GitHub Action 在 PR 中自动检查规则合规性
- [ ] **多 Agent 协作**：多 AI Agent 通过 RuleForge 共享规则上下文
- [ ] **知识图谱**：规则之间的依赖、冲突、推荐关系图谱

---

## 🤝 贡献

### 提交规则

1. 提取候选规则：`ruleforge extract --log ./session.jsonl`
2. 验证格式：`ruleforge validate ./candidate-rule.yaml`
3. Fork → 添加到 `examples/` → PR

### 开发贡献

```bash
git clone https://github.com/kialajin-l/RuleForge.git
cd RuleForge
npm install
npm test
```

**代码规范**：TypeScript，遵循 Airbnb 规范，添加单元测试，更新文档。

---

## 📄 许可证

MIT License

## 🙏 致谢

- [Xiaomi Claw](https://github.com/XiaomiMiClaw) — AI 助手平台，RuleForge MCP Server 的核心运行环境
- [Trae](https://www.trae.ai/) — 灵感激荡的 AI 原生编辑器，Vibe Coding 理念的完美载体
- [Qwen (通义千问)](https://qwenlm.github.io/) — 提供卓越的代码生成与逻辑推理支持
- [Model Context Protocol](https://modelcontextprotocol.io/) — AI Agent 标准化工具协议
- [ESLint](https://eslint.org/) — JavaScript 代码检查工具
- [Prettier](https://prettier.io/) — 代码格式化工具
- [Zod](https://zod.dev/) — TypeScript 模式验证
- [Commander.js](https://github.com/tj/commander.js) — 命令行工具框架

---

## 📞 联系我们

- **GitHub Issues**: [问题反馈](https://github.com/kialajin-l/RuleForge/issues)
- **Discord**: [社区讨论](https://discord.gg/ruleforge)
- **Email**: team@ruleforge.dev

## 🌟 Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=kialajin-l/RuleForge&type=Date)](https://star-history.com/#kialajin-l/RuleForge&Date)

如果 RuleForge 对你的开发工作流有帮助，请给个 ⭐️ 支持一下！
