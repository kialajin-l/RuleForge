# RuleForge 演示脚本

这是一个完整的 RuleForge 演示脚本，展示了从项目初始化到规则提取、验证、保存的完整流程。

## 🚀 快速开始

### 安装依赖
```bash
cd packages/core/demo
npm install
```

### 运行演示
```bash
# 使用 TypeScript 直接运行
npm run demo

# 或者编译后运行
npm run build
npm start

# 或者直接使用 tsx
npx tsx complete-flow.ts
```

## 📋 演示流程

演示脚本包含以下完整流程：

### 1. 项目初始化
- 创建 `.ruleforge.yaml` 配置文件
- 创建规则存储目录结构
- 应用 Vue 模板配置

### 2. 模拟开发会话
- 生成 100+ 个真实开发事件
- 包含文件保存、错误发生、错误修复等
- 保存为 JSONL 格式的会话日志

### 3. 规则提取
- 使用 RuleExtractor 分析会话日志
- 识别重复模式和最佳实践
- 生成高置信度的编码规则

### 4. 规则验证
- 使用 RuleValidator 验证规则格式
- 检查是否符合 REP v0.1 标准
- 显示验证结果和错误信息

### 5. 规则保存
- 将验证通过的规则保存到本地库
- 支持版本管理和备份
- 提供规则查询和检索功能

### 6. 统计报告
- 显示提取过程的详细统计
- 包括事件数量、规则数量、置信度等
- 生成 JSON 格式的演示报告

## 🎯 演示特性

### 彩色输出
使用 `chalk` 库提供美观的彩色控制台输出：
- 🔵 蓝色：流程步骤
- 🟢 绿色：成功状态
- 🟡 黄色：警告信息
- 🔴 红色：错误信息

### 进度条
使用 `cli-progress` 显示实时进度：
- 事件生成进度
- 规则提取进度
- 规则验证进度
- 规则保存进度

### 模拟数据
生成真实的开发场景数据：
- **30 个文件保存事件**：代码修改和保存
- **10 个错误发生事件**：各种类型的编程错误
- **8 个错误修复事件**：错误修复过程
- **15 个测试运行事件**：单元测试执行
- **20 个命令执行事件**：开发工具命令
- **17 个组件创建事件**：Vue/React 组件创建

## 📊 输出文件

演示脚本会生成以下文件：

### `demo-session.jsonl`
- 包含 100+ 个开发事件的 JSONL 文件
- 每个事件包含时间戳、类型、文件路径等信息
- 可用于后续分析和规则提取

### `demo-report.json`
- 演示过程的详细报告
- 包含统计信息和规则摘要
- JSON 格式，便于程序化处理

### `.ruleforge/` 目录
- 项目配置文件
- 规则存储目录
- 版本管理文件

## 🔧 自定义配置

### 修改事件数量
```typescript
// 在 complete-flow.ts 中修改
events = dataGenerator.generateSessionEvents(150); // 生成 150 个事件
```

### 调整置信度阈值
```typescript
const result = await extractor.extract({
  minConfidence: 0.8, // 提高置信度要求
  applicableScenes: 3  // 增加适用场景要求
});
```

### 更改输出格式
```typescript
// 修改报告格式
const report = {
  sessionId: 'custom-session',
  // 自定义字段...
};
```

## 🧪 测试演示

### 验证规则质量
```bash
# 运行验证命令
npx ruleforge validate .ruleforge/rules/*.yaml
```

### 查看规则列表
```bash
# 查看生成的规则
npx ruleforge list --format table
```

### 分析会话数据
```bash
# 查看会话日志
head -n 10 demo-session.jsonl
```

## 📈 性能指标

演示脚本的性能指标：
- **事件生成**：100 个事件约 2-3 秒
- **规则提取**：100 个事件约 5-10 秒
- **内存使用**：峰值约 100-200MB
- **磁盘空间**：生成文件约 1-2MB

## 🐛 故障排除

### 常见问题

1. **依赖安装失败**
   ```bash
   # 清除缓存重新安装
   npm cache clean --force
   npm install
   ```

2. **权限问题**
   ```bash
   # 确保有写入权限
   chmod +x complete-flow.ts
   ```

3. **内存不足**
   ```bash
   # 增加 Node.js 内存限制
   node --max-old-space-size=4096 complete-flow.js
   ```

### 调试模式

启用详细日志输出：
```typescript
// 设置环境变量
process.env.DEBUG = 'ruleforge:*';
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进演示脚本！

## 📄 许可证

MIT License