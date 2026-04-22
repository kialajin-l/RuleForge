# RuleForge
> 🌊 This is a **Vibe Coding** project: Built with AI, for AI-augmented development.

![npm](https://img.shields.io/npm/v/@ruleforge/cli.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Tests](https://img.shields.io/github/actions/workflow/status/kialajin-l/RuleForge/test.yml)

RuleForge 是一个智能规则提取引擎，能够自动从开发会话中识别最佳实践，并将其转化为可共享的编码规则。

本项目灵感来源于 **andrej-karpathy-skills** 项目的 CLAUDE.md 行为规则设计理念，将其扩展为可执行的编码规则提取引擎。它的核心功能是：**将你隐性的开发习惯转化为显性的 AI 提示规范**。生成的规则文件作用完全等同于 `CLAUDE.md` 或 `.cursorrules`——它们会被自动注入到 AI 编辑器的系统上下文中，让 AI 在后续对话中天然遵循你的代码规范、架构偏好与团队标准，彻底告别重复写 Prompt 的烦恼。

---

## 📦 安装

### CLI 工具（推荐）
```bash
npm install -g @ruleforge/cli
# 或
yarn global add @ruleforge/cli
```

### 核心库
```bash
npm install @ruleforge/core
```

### 从源码安装
```bash
git clone https://github.com/kialajin-l/RuleForge.git
cd RuleForge
npm install
npm run build
```

---

## 🚀 快速开始

### 1. 初始化项目
```bash
ruleforge init
```
运行后会在项目根目录生成 `.ruleforge/` 配置目录。

### 2. 提取规则
你可以通过 CLI 扫描历史日志，或安装插件后让编辑器自动记录：
```bash
ruleforge extract --log ./my-session.jsonl
```

### 3. 规则文件生成在哪里？
- **候选规则**：默认保存在 `.ruleforge/candidates/` 目录，供你预览和筛选。
- **正式规则**：确认无误后，规则会移至 `.ruleforge/rules/` 目录。
- **文件命名**：采用 `<rule-id>.yaml` 格式（例如 `vue-props-validation.yaml`、`fastapi-auth-pattern.yaml`），内容严格遵循 REP v0.1 标准。

### 4. 插件如何生效？
安装 Trae/VSCode 插件后，RuleForge 会默默监听你的编码会话。当检测到高频模式或重复修复时，会弹出轻量提示。确认后：
- ✅ 规则自动保存至本地库。
- ✅ **自动注入 AI 上下文**：插件会将规则实时注入到 AI 对话的系统 Prompt 中（效果同 `CLAUDE.md`）。你无需任何额外操作，AI 在后续写代码、查 Bug 时都会自动遵循这些规范。
- 可在设置中开启 `ruleforge.autoTrigger` 实现完全无感体验。

---

## ✨ 功能特性
- 🔍 **自动模式识别**：从开发会话中提取最佳实践
- 📝 **REP v0.1 标准**：符合行业规范的 YAML 格式
- 🛡️ **智能验证**：Zod Schema 验证确保规则质量
- 🔐 **自动脱敏**：保护敏感信息和项目路径
- 📊 **置信度评分**：智能评估规则的可复用性
- 🔄 **批量处理**：支持多会话并行分析
- 💾 **本地存储**：规则版本管理和备份

---

## 📖 使用场景
**场景1：发现重复代码模式**
当你多次创建类似组件时，RuleForge 会自动识别并提取通用模式。
> 示例：多次创建 Vue 表单组件 → 提取表单验证规则

**场景2：解决同类错误**
多次修复同一类错误后，RuleForge 会生成预防性规则。
> 示例：多次修复 props 类型错误 → 提取类型检查规则

**场景3：团队规范沉淀**
将个人最佳实践转化为团队共享规则。
> 示例：团队代码审查模式 → 提取代码质量规则

---

## 📚 配置指南

### `.ruleforge.yaml` 示例
```yaml
# RuleForge 配置文件
extraction:
  minConfidence: 0.7
  applicableScenes: 2
  maxPatterns: 50
  
privacy:
  autoRedact: true
  projectName: '{project_name}'
  redactPatterns:
    - pattern: '/Users/dev/my-project'
      replacement: '{project_name}'
    - pattern: 'sk-[a-zA-Z0-9]{20,}'
      replacement: '{api_key}'
      
storage:
  localRulesDir: .ruleforge/rules
  maxVersions: 10
  autoBackup: true
  
output:
  format: yaml
  prettyPrint: true
  maxLineLength: 100
```

### 环境变量
```bash
export RULEFORGE_MIN_CONFIDENCE=0.8
export RULEFORGE_LOG_PATH=./logs
export RULEFORGE_AUTO_REDACT=true
```

---

## 🛠️ 核心架构
RuleForge 采用模块化设计，包含以下核心组件：

**核心引擎 (@ruleforge/core)**
- `RuleExtractor`：规则提取引擎
- `RuleValidator`：规则验证器
- `PatternYamlFormatter`：YAML 格式化器
- `ConfigManager`：配置管理器
- `RuleStore`：规则存储库

**命令行工具 (@ruleforge/cli)**
- `init`：项目初始化
- `extract`：规则提取
- `validate`：规则验证
- `list`：规则列表
- `show`：规则详情
- `delete`：规则删除

**适配器 (@ruleforge/adapter-*)**
- VSCode 插件：编辑器集成
- Trae 插件：AI 助手集成
- GitHub Action：CI/CD 集成

---

## 🤝 贡献指南

### 提交规则
1. **提取候选规则**
   ```bash
   ruleforge extract --log ./session.jsonl --min-conf 0.7
   ```
2. **验证规则格式**
   ```bash
   ruleforge validate ./candidate-rule.yaml
   ```
3. **提交至 GitHub**
   - Fork 仓库
   - 添加规则到 `examples/` 目录
   - 创建 Pull Request

### 规则审核流程
- 自动化检查：YAML Schema 验证
- 社区评审：GitHub PR Review
- 合并发布：每周发布新版本

### 开发贡献
```bash
git clone https://github.com/kialajin-l/RuleForge.git
cd ruleforge
npm install
npm test
```
**代码规范**：使用 TypeScript，遵循 Airbnb 规范，添加单元测试，更新文档。

---

## ❓ 常见问题
**Q: 支持哪些编辑器？**
A: 支持所有能生成 JSON 日志的编辑器，包括 VSCode、Trae、Cursor 等。我们提供适配器插件来简化集成。

**Q: 如何保护隐私？**
A: 启用 `autoRedact` 后，自动移除 API Key、项目路径、密码等敏感信息。规则中只保留模式化的代码片段。

**Q: 规则格式是什么？**
A: 遵循 REP v0.1 标准，包含 `meta`、`rule`、`compatibility` 三个主要部分。详见 [REP 规范](docs/REP.md)。

**Q: 置信度评分如何计算？**
A: 基于模式出现频率、修复成功率、适用场景数量等因素综合计算，范围 0-1，越高表示规则越可靠。

**Q: 支持哪些编程语言？**
A: 目前主要支持 TypeScript、JavaScript、Vue，未来计划支持 Python、React、Angular 等。

---

## 🔧 开发

### 项目结构
```
ruleforge/
├── packages/
│   ├── core/          # 核心引擎
│   ├── cli/           # 命令行工具
│   └── adapter-trae/  # Trae 插件适配器
├── docs/              # 文档
├── examples/          # 示例规则
├── demo/              # 演示脚本
└── tests/             # 测试套件
```

### 开发命令
```bash
# 安装依赖
npm install

# 构建所有包
npm run build

# 运行开发模式
npm run dev

# 运行测试
npm test                # 单元测试
npm run test:e2e        # 端到端测试
npm run benchmark       # 性能测试
npm run coverage        # 代码覆盖率
npm run demo            # 运行演示
```

---

## 📄 许可证
MIT License

## 🙏 致谢
感谢以下开源项目与工具对 RuleForge 的启发和支持：
- [Trae](https://www.trae.ai/) - 灵感激荡的 AI 原生编辑器，Vibe Coding 理念的完美载体
- [Qwen (通义千问)](https://qwenlm.github.io/) - 提供卓越的代码生成与逻辑推理支持
- [ESLint](https://eslint.org/) - JavaScript 代码检查工具
- [Prettier](https://prettier.io/) - 代码格式化工具
- [Zod](https://zod.dev/) - TypeScript 模式验证
- [Commander.js](https://github.com/tj/commander.js) - 命令行工具框架

---

## 📞 联系我们
- **GitHub Issues**: [问题反馈](https://github.com/kialajin-l/RuleForge/issues)
- **Discord**: [社区讨论](https://discord.gg/ruleforge)
- **Email**: team@ruleforge.dev

## 🌟 Star 历史
[![Star History Chart](https://api.star-history.com/svg?repos=kialajin-l/RuleForge&type=Date)](https://star-history.com/#kialajin-l/RuleForge&Date)

如果 RuleForge 对你的开发工作流有帮助，请给个 ⭐️ 支持一下！
```
