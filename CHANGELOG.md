# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-22

### Added

#### Core Engine (@ruleforge/core)
- 核心规则提取引擎
  - 日志解析器：支持 JSONL 格式的开发会话日志
  - 模式聚类算法：自动识别高频代码模式
  - 规则生成器：将模式转化为 REP v0.1 标准格式
  - YAML 格式化器：智能脱敏和代码示例优化
- REP v0.1 协议支持
  - 完整的 Zod Schema 验证
  - meta/rule/compatibility 三层结构
  - 置信度评分算法
- 配置管理系统
  - 多级配置加载（默认/文件/环境变量）
  - 项目模板支持
- 本地规则存储
  - 规则版本管理
  - 元数据索引
  - 备份和恢复

#### CLI Tool (@ruleforge/cli)
- 完整的命令行工具
  - `ruleforge init` - 初始化项目
  - `ruleforge extract` - 提取规则
  - `ruleforge validate` - 验证规则
  - `ruleforge list` - 列出规则
  - `ruleforge show` - 显示规则详情
  - `ruleforge config` - 配置管理
- 交互式用户界面
- 彩色输出和进度条
- JSON/YAML 导出支持

#### Plugin Adapter (@ruleforge/adapter-trae)
- Trae IDE 插件适配器
- VSCode 扩展支持
- 事件监听系统
- UI 组件库

### Documentation
- 完整的项目 README
- API 参考文档
- REP v0.1 协议规范
- CLI 命令参考
- 插件开发指南
- 示例规则库
  - Vue3 最佳实践（10 个规则）
  - FastAPI 安全规则（10 个规则）
  - 测试模式（10 个规则）

### Testing
- 单元测试覆盖核心功能
- 端到端测试验证完整流程
- 性能测试确保处理效率
- 配置和 CLI 集成测试

### Technical
- TypeScript 全栈开发
- Zod Schema 验证
- 多阶段提取 pipeline
- 智能置信度评分
- 自动脱敏算法
- 模块化架构设计

### Performance
- 10MB 日志文件处理 < 30秒
- 批量处理支持
- 缓存优化

---

## Version Strategy

### Semantic Versioning

- **Major (X.0.0)**: Breaking changes to API or REP protocol
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, performance improvements

### Release Schedule

- **v0.1.0**: MVP release (current)
- **v0.2.0**: VSCode plugin + rule marketplace
- **v0.3.0**: AI-enhanced rule suggestions
- **v1.0.0**: Stable release with full feature set

### Branch Strategy

- `main`: Stable releases
- `develop`: Development branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `release/*`: Release preparation
