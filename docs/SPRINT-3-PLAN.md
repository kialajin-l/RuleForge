# Sprint 3: 规则执行引擎 + 编辑器集成基础

> 目标：让 RuleForge 的规则从静态 YAML 变成可在编辑器中实际触发、匹配、给出建议的活规则。

## 当前状态

- Sprint 0-2 已完成：REP v0.2 协议、提取引擎、验证器、格式化器、规则匹配器、模板系统、依赖冲突检测
- 22 个测试全部通过
- CLI 命令：extract, validate, list, show, delete, export, import, match, template, init

## Sprint 3 任务

### S3-1: RuleEngine 核心引擎
**目标**：创建 `RuleEngine` 类，作为规则执行的统一入口
- 加载规则库（从 .ruleforge/ 目录或配置路径）
- 接收文件变更事件，匹配适用规则
- 生成结构化建议（Diagnostic 列表）
- 支持规则优先级排序（global > project > session）
- 支持 depends_on 依赖链解析

**产出**：`packages/core/src/engine/rule-engine.ts`

### S3-2: 文件变更事件模型
**目标**：定义标准化的文件变更事件接口
- `FileChangeEvent`：path, content, language, timestamp
- `MatchResult`：rule, suggestions, confidence, severity
- `Diagnostic`：标准化输出格式（兼容 LSP Diagnostic）
- 事件过滤器：按文件类型、路径模式、语言过滤

**产出**：`packages/core/src/engine/types.ts`

### S3-3: 规则使用统计与评分
**目标**：跟踪规则的实际使用效果
- 记录规则匹配次数、建议采纳次数
- 计算采纳率 = 采纳次数 / 匹配次数
- 基于采纳率动态调整 confidence
- 统计数据持久化到 .ruleforge/stats.json

**产出**：`packages/core/src/engine/rule-stats.ts`

### S3-4: VS Code 扩展脚手架
**目标**：创建 VS Code 扩展的基本结构
- package.json with vscode engine
- 扩展入口：activate/deactivate
- 集成 RuleEngine：文件保存时触发规则匹配
- 通过 vscode.languages.createDiagnosticCollection 输出建议
- 基本配置：启用/禁用规则、规则路径

**产出**：`packages/vscode/` 目录

### S3-5: 集成测试
**目标**：端到端测试 RuleEngine 完整流程
- 加载规则 → 匹配文件变更 → 生成诊断
- 多规则优先级排序测试
- 依赖链解析测试
- 统计数据更新测试

**产出**：`test/engine.test.ts`

## 验收标准

1. RuleEngine 能加载规则库并匹配文件变更
2. 生成的 Diagnostic 符合 LSP 标准格式
3. 规则统计能正确记录和持久化
4. VS Code 扩展能基本运行（至少 activate + 输出日志）
5. 所有测试通过
