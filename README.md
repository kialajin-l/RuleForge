# RuleForge

> Turn your dev sessions into shareable rules.

[![npm version](https://img.shields.io/npm/v/@ruleforge/cli.svg)](https://www.npmjs.com/package/@ruleforge/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test Status](https://img.shields.io/github/actions/workflow/status/kialajin/ruleforge/test.yml)](https://github.com/kialajin/ruleforge/actions)
[![Code Coverage](https://img.shields.io/codecov/c/github/kialajin/ruleforge)](https://codecov.io/gh/kialajin/ruleforge)

RuleForge 是一个智能规则提取引擎，能够自动从开发会话中识别最佳实践，并将其转化为可共享的编码规则。

## 🚀 快速开始（3分钟）

### 安装

```bash
npm install -g @ruleforge/cli
# 或
yarn global add @ruleforge/cli
```

### 初始化

```bash
ruleforge init --template vue
```

### 提取规则

```bash
ruleforge extract --log ./my-session.jsonl
```

## ✨ 功能特性

- 🔍 **自动模式识别**：从开发会话中提取最佳实践
- 📝 **REP v0.1 标准**：符合行业规范的 YAML 格式
- 🛡️ **智能验证**：Zod Schema 验证确保规则质量
- 🔐 **自动脱敏**：保护敏感信息和项目路径
- 📊 **置信度评分**：智能评估规则的可复用性
- 🔄 **批量处理**：支持多会话并行分析
- 💾 **本地存储**：规则版本管理和备份

## 📖 使用场景

### 场景1：发现重复代码模式
当你多次创建类似组件时，RuleForge 会自动识别并提取通用模式。

**示例**：多次创建 Vue 表单组件 → 提取表单验证规则

### 场景2：解决同类错误
多次修复同一类错误后，RuleForge 会生成预防性规则。

**示例**：多次修复 props 类型错误 → 提取类型检查规则

### 场景3：团队规范沉淀
将个人最佳实践转化为团队共享规则。

**示例**：团队代码审查模式 → 提取代码质量规则

## 📚 配置指南

### .ruleforge.yaml 示例

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

## 🛠️ 核心架构

RuleForge 采用模块化设计，包含以下核心组件：

### 核心引擎 (@ruleforge/core)
- **RuleExtractor**：规则提取引擎
- **RuleValidator**：规则验证器
- **PatternYamlFormatter**：YAML 格式化器
- **ConfigManager**：配置管理器
- **RuleStore**：规则存储库

### 命令行工具 (@ruleforge/cli)
- **init**：项目初始化
- **extract**：规则提取
- **validate**：规则验证
- **list**：规则列表
- **show**：规则详情
- **delete**：规则删除

### 适配器 (@ruleforge/adapter-*)
- **VSCode 插件**：编辑器集成
- **Trae 插件**：AI 助手集成
- **GitHub Action**：CI/CD 集成

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

- **自动化检查**：YAML Schema 验证
- **社区评审**：GitHub PR Review
- **合并发布**：每周发布新版本

### 开发贡献

1. **环境设置**
   ```bash
   git clone https://github.com/kialajin/ruleforge
   cd ruleforge
   npm install
   ```

2. **运行测试**
   ```bash
   npm test                # 单元测试
   npm run test:e2e        # 端到端测试
   npm run benchmark       # 性能测试
   ```

3. **代码规范**
   - 使用 TypeScript
   - 遵循 Airbnb 代码规范
   - 添加单元测试
   - 更新文档

## ❓ 常见问题

### Q: 支持哪些编辑器？
**A**: 支持所有能生成 JSON 日志的编辑器，包括 VSCode、Trae、Cursor 等。我们提供适配器插件来简化集成。

### Q: 如何保护隐私？
**A**: 启用 `autoRedact` 后，自动移除 API Key、项目路径、密码等敏感信息。规则中只保留模式化的代码片段。

### Q: 规则格式是什么？
**A**: 遵循 REP v0.1 标准，包含 `meta`、`rule`、`compatibility` 三个主要部分。详见 [REP 规范](docs/REP.md)。

### Q: 置信度评分如何计算？
**A**: 基于模式出现频率、修复成功率、适用场景数量等因素综合计算，范围 0-1，越高表示规则越可靠。

### Q: 支持哪些编程语言？
**A**: 目前主要支持 TypeScript、JavaScript、Vue，未来计划支持 Python、React、Angular 等。

## 📦 安装

### 全局安装（推荐）

```bash
npm install -g @ruleforge/cli
```

### 项目依赖

```bash
npm install @ruleforge/core --save-dev
```

### 开发版本

```bash
git clone https://github.com/kialajin/ruleforge
cd ruleforge
npm install
npm run build
```

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
npm test

# 运行端到端测试
npm run test:e2e

# 运行性能测试
npm run benchmark

# 运行演示
npm run demo
```

## 🧪 测试

RuleForge 提供完整的测试覆盖：

### 单元测试
```bash
npm test
```

### 端到端测试
```bash
npm run test:e2e
```

### 性能测试
```bash
npm run benchmark
```

### 代码覆盖率
```bash
npm run coverage
```

## 📄 许可证

MIT License

## 🙏 致谢

感谢以下开源项目对 RuleForge 的启发和支持：

- [ESLint](https://eslint.org/) - JavaScript 代码检查工具
- [Prettier](https://prettier.io/) - 代码格式化工具
- [Zod](https://zod.dev/) - TypeScript 模式验证
- [Commander.js](https://github.com/tj/commander.js) - 命令行工具框架

## 📞 联系我们

- **GitHub Issues**: [问题反馈](https://github.com/kialajin/ruleforge/issues)
- **Discord**: [社区讨论](https://discord.gg/ruleforge)
- **Email**: team@ruleforge.dev

## 🌟 Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=kialajin/ruleforge&type=Date)](https://star-history.com/#kialajin/ruleforge&Date)

---

<div align="center">

**如果 RuleForge 对你有帮助，请给个 ⭐️ 支持一下！**

</div>