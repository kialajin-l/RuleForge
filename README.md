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
| 🌌 **4D 坐标规则** | 基于宇宙坐标模型的规则约束，自动纠正锚点坐标偏移 |
| ⚖️ **权重自适应** | 规则权重根据使用效果自动调整，学习率 η=0.2 |

---

## 🏗️ 架构概览

RuleForge 采用 monorepo 模块化设计，包含四个核心包：

```
ruleforge/
├── packages/
│   ├── core/            # @ruleforge/core — 核心引擎
│   │   ├── storage/     #   规则存储、索引、验证
│   │   ├── matcher/     #   代码模式匹配器
│   │   ├── extractor/   #   规则提取引擎
│   │   ├── engine/      #   规则执行引擎
│   │   ├── coordinate/  #   4D 坐标规则引擎（新增）
│   │   ├── validator/   #   规则验证器
│   │   ├── formatter/   #   YAML 格式化器
│   │   ├── config/      #   配置管理
│   │   └── types/       #   类型定义
│   ├── cli/             # @ruleforge/cli — 命令行工具
│   ├── mcp/             # @ruleforge/mcp — MCP Server（AI Agent 集成）
│   └── adapter-trae/    # ruleforge-adapter-trae — Trae/VSCode 插件
├── docs/                # 规范文档（REP v0.2 等）
└── examples/            # 示例规则
```

### 各包职责

| 包名 | 作用 | 谁在用 |
|------|------|--------|
| `@ruleforge/core` | 规则存储、验证、匹配、提取、4D 坐标约束 | 所有上层包的基础依赖 |
| `@ruleforge/cli` | 命令行操作：init / validate / search / match / stats | 开发者在终端使用 |
| `@ruleforge/mcp` | MCP Server，暴露 5 个标准 tool | AI Agent（Claude、MiMo 等） |
| `ruleforge-adapter-trae` | 编辑器插件，自动监听会话并提取规则 | Trae / VSCode 用户 |

### 4D 坐标规则模块（新增）

`packages/core/src/coordinate/` 是与 Nexus 宇宙坐标模型对齐的规则约束引擎：

```typescript
import { CoordinateEngine } from '@ruleforge/core/coordinate';

const engine = new CoordinateEngine();

// 评估锚点坐标是否符合规则
const results = engine.evaluate(
  { d1: 0.25, d2: 0.05, d3: 0.5, d4: 0.3 },  // 坐标值
  { discipline: 'CS', abstraction: 'instance', temporality: 'stable', scale: 'local' },  // 标签
  false,  // 是否跨学科
);

// 应用修正
const corrected = engine.applyCorrections(coords, results);

// 根据效果自适应调整权重
engine.adaptWeights(results, true);  // true = 规则被采纳
```

内置四条规则（经 EXP-008 实验验证）：

| 规则 | 条件 | 动作 | 说明 |
|------|------|------|------|
| R1 | 抽象层次 = instance | d2 ∈ [0.00, 0.10] | 具体实例的抽象层次应 ≤ 0.10 |
| R2 | 抽象层次 = method | d2 ∈ [0.20, 0.30] | 方法/技术的抽象层次应在 0.20-0.30 |
| R3 | 抽象层次 = theory | d2 ∈ [0.45, 0.55] | 理论/原理的抽象层次应在 0.45-0.55 |
| R4 | 学科 = CS（排除跨学科） | d1 ∈ [0.20, 0.30] | 纯 CS 的学科坐标应在 0.20-0.30 |

---

## 📦 安装

### 方式一：npm 全局安装 CLI（推荐）

```bash
npm install -g @ruleforge/cli
ruleforge --help
```

### 方式二：项目内安装核心库

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

```bash
npm install -g @ruleforge/mcp
```

在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "ruleforge": {
      "command": "ruleforge-mcp",
      "env": {
        "RF_HOME": "C:\Users\<你的用户名>\.ruleforge"
      }
    }
  }
}
```

`RF_HOME` 指向规则库目录，通常可设为 `C:\Users\<your-username>\.ruleforge`，也可以按你的系统环境调整。

源码开发场景也可以直接指向本地构建产物：

```json
{
  "mcpServers": {
    "ruleforge": {
      "command": "node",
      "args": ["/path/to/ruleforge/packages/mcp/dist/index.js"]
    }
  }
}
```

公开仓库中的使用说明和边界约定见 `docs/PUBLIC_DOCS_INDEX.md`。

### 方式四：Trae / VSCode 插件

在扩展商店搜索 **"RuleForge"** 安装 `ruleforge-adapter-trae`，插件会自动监听编码会话并提取规则。

### 方式五：从源码安装

```bash
git clone https://github.com/kialajin-l/RuleForge.git
cd RuleForge
npm install
npm run build
```

---

## 🚀 使用指南

### CLI 命令

```bash
ruleforge init                    # 初始化项目
ruleforge validate my-rule.yaml   # 验证规则
ruleforge search --language ts    # 搜索规则
ruleforge match src/app.ts        # 代码模式匹配
ruleforge stats                   # 查看统计
```

### MCP Tool（AI Agent 调用）

| Tool | 用途 | 参数 |
|------|------|------|
| `rf_suggest` | 分析单个文件变更，返回适用规则建议 | `filePath`, `changeType` |
| `rf_suggest_all` | 批量分析多个文件 | `files: [{filePath, changeType}]` |
| `rf_rules` | 查询/搜索规则库 | `language?`, `tags?`, `keyword?`, `limit?` |
| `rf_explain` | 查看某条规则的完整详情 | `ruleId` |
| `rf_stats` | 查看规则库统计概览 | 无 |

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
    pattern: ': any\b'
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
  frameworks: []
```

---

## 📖 使用场景

**场景 1：发现重复代码模式**
> 多次创建 Vue 表单组件 → 提取表单验证规则 → AI 下次创建表单时自动遵循

**场景 2：解决同类错误**
> 多次修复 `any` 类型错误 → 提取类型检查规则 → AI 写代码时自动避免 `any`

**场景 3：团队规范沉淀**
> 代码审查模式 → 提取代码质量规则 → 团队 AI 统一遵循

**场景 4：AI Agent 自主学习**
> AI Agent 通过 MCP 协议调用 RuleForge，每次代码变更时自动获取相关规则建议

**场景 5：Nexus 坐标约束**
> Nexus 提取锚点时，CoordinateEngine 自动检查 4D 坐标是否符合领域规则，纠正偏移

---

## ⚙️ 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RF_HOME` | `~/.ruleforge` | 规则库根目录 |
| `RULEFORGE_HOME` | `~/.ruleforge` | 同上（别名） |
| `RULEFORGE_MIN_CONFIDENCE` | `0.7` | 最低置信度阈值 |
| `RULEFORGE_AUTO_REDACT` | `true` | 自动脱敏开关 |

---

## 🗺️ Roadmap

### v1.2（当前版本）

- [x] 核心引擎：规则存储、验证、匹配
- [x] CLI 工具：init / validate / search / match / stats
- [x] MCP Server：5 个标准 tool，stdio 传输
- [x] Trae/VSCode 插件适配器
- [x] REP v0.2 规则格式标准
- [x] 本地规则库：`~/.ruleforge/rules/` 全局存储 + 索引
- [x] **4D 坐标规则引擎**：与 Nexus 宇宙坐标模型对齐，R1-R4 四条验证规则
- [x] **权重自适应**：规则权重根据使用效果自动调整（η=0.2）

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

- [Xiaomi Claw](https://github.com/XiaomiMiClaw) — AI 助手平台
- [Trae](https://www.trae.ai/) — Vibe Coding 理念的完美载体
- [Qwen (通义千问)](https://qwenlm.github.io/) — 代码生成与逻辑推理支持
- [Model Context Protocol](https://modelcontextprotocol.io/) — AI Agent 标准化工具协议
- [Zod](https://zod.dev/) — TypeScript 模式验证

---

> **RuleForge** — 将隐性习惯转化为显性规范。
