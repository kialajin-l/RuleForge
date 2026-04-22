# GitHub Release 验证清单

## 📋 发布前检查

### Git 仓库状态
- [ ] Git 仓库已初始化
- [ ] 所有更改已提交
- [ ] 工作目录干净（无未提交更改）
- [ ] 远程仓库配置正确

### 版本信息
- [ ] 版本号正确（遵循语义版本控制）
- [ ] Git 标签格式正确（v{version}）
- [ ] Release 标题清晰明确
- [ ] Release Notes 内容完整

### 包文件
- [ ] @ruleforge/core 已构建
- [ ] @ruleforge/cli 已构建
- [ ] 插件 .vsix 文件已生成
- [ ] 示例文件已准备

### 文档
- [ ] RELEASE_NOTES.md 已创建
- [ ] CHANGELOG.md 已更新
- [ ] README.md 包含安装说明
- [ ] 文档链接有效

## 🚀 发布中检查

### Git 操作
- [ ] 标签创建成功
- [ ] 标签推送到远程仓库
- [ ] 主分支推送到远程仓库

### Release 创建
- [ ] GitHub Release 创建成功
- [ ] Release Notes 显示正确
- [ ] 附件上传成功（如有）
- [ ] 预发布/草稿状态正确

## ✅ 发布后验证

### Release 页面
- [ ] Release 页面可访问
- [ ] 版本号显示正确
- [ ] 标题和描述正确
- [ ] 发布时间正确

### 下载链接
- [ ] 源代码下载链接有效
- [ ] 附件下载链接有效（如有）
- [ ] 文件大小正确

### Git 状态
- [ ] 标签在远程仓库可见
- [ ] 标签指向正确的提交
- [ ] 分支状态正常

### 包可用性
- [ ] npm 包可安装
- [ ] CLI 命令可执行
- [ ] 核心库可导入

## 🔧 故障排除

### 常见问题

**1. 标签已存在**
```bash
# 删除本地标签
git tag -d v0.1.0
# 删除远程标签
git push origin :refs/tags/v0.1.0
# 重新创建
```

**2. 未登录 GitHub**
```bash
# 使用 GitHub CLI
gh auth login
# 或使用 Token
export GITHUB_TOKEN=your_token
```

**3. 权限不足**
- 检查仓库访问权限
- 确认 Token 有 repo 权限
- 验证用户身份

**4. 网络问题**
- 检查网络连接
- 使用代理（如需要）
- 重试操作

## 📝 验证命令

```bash
# 检查标签
git tag -l
git ls-remote --tags origin

# 检查 Release
gh release list
gh release view v0.1.0

# 检查包
npm view @ruleforge/core
npm view @ruleforge/cli

# 测试安装
npm install -g @ruleforge/cli
ruleforge --version
```

---

*最后更新：2026-01-22*
*维护者：RuleForge Team*
