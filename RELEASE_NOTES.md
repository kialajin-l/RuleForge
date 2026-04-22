## 🎉 首次发布

RuleForge 能从你的开发会话中自动提取可复用的编码规则。

### ✨ 功能特性
- 🔍 自动规则提取：从开发会话中提取最佳实践
- 📝 REP v0.1 标准：符合行业规范的 YAML 格式
- 🛡️ 智能验证：Zod Schema 验证确保规则质量
- 🔐 自动脱敏：保护敏感信息和项目路径
- 📊 置信度评分：智能评估规则的可复用性

### 📦 安装

#### CLI 工具
```bash
npm install -g @ruleforge/cli
```

#### 核心库
```bash
npm install @ruleforge/core
```

#### Trae/VSCode 插件
下载 .vsix 文件并从扩展安装

### 🚀 快速开始
```bash
# 初始化
ruleforge init

# 提取规则
ruleforge extract --log ./session.jsonl

# 验证规则
ruleforge validate ./rule.yaml
```

### 📚 文档
- [README](./README.md)
- [REP 协议](./docs/REP.md)
- [API 文档](./docs/API.md)
- [CLI 参考](./docs/CLI.md)

### 🧪 测试
```bash
npm test
npm run demo
```

### 🙏 致谢
基于 CodePilot 和 Multica 的架构思想，独立实现。

遵循 MIT License。
