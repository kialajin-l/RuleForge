# GitHub CLI 使用指南

## 📦 安装 GitHub CLI

### Windows
```bash
# 使用 winget
winget install --id GitHub.cli

# 或使用 Chocolatey
choco install gh

# 或使用 Scoop
scoop install gh
```

### macOS
```bash
# 使用 Homebrew
brew install gh
```

### Linux
```bash
# Debian/Ubuntu
(type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
&& sudo mkdir -p -m 755 /etc/apt/keyrings \
&& wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt update \
&& sudo apt install gh -y
```

## 🔐 认证登录

### 交互式登录
```bash
gh auth login
```

按照提示选择：
1. GitHub.com 还是 GitHub Enterprise
2. HTTPS 还是 SSH
3. 登录方式（浏览器或 Token）

### 使用 Token 登录
```bash
# 生成 Token: https://github.com/settings/tokens
echo YOUR_TOKEN | gh auth login --with-token
```

### 验证登录状态
```bash
gh auth status
```

## 🏷️ 标签管理

### 创建标签
```bash
# 轻量标签
git tag v0.1.0

# 附注标签（推荐）
git tag -a v0.1.0 -m "Release v0.1.0"

# 推送标签
git push origin v0.1.0

# 推送所有标签
git push origin --tags
```

### 查看标签
```bash
# 列出本地标签
git tag -l

# 列出远程标签
git ls-remote --tags origin

# 查看标签详情
git show v0.1.0
```

### 删除标签
```bash
# 删除本地标签
git tag -d v0.1.0

# 删除远程标签
git push origin :refs/tags/v0.1.0
```

## 🚀 Release 管理

### 创建 Release
```bash
# 基本创建
gh release create v0.1.0

# 带标题和说明
gh release create v0.1.0 \
  --title "RuleForge v0.1.0" \
  --notes "首次发布"

# 从文件读取说明
gh release create v0.1.0 \
  --notes-file RELEASE_NOTES.md

# 预发布版本
gh release create v0.1.0 \
  --prerelease \
  --title "RuleForge v0.1.0-beta"

# 草稿版本
gh release create v0.1.0 \
  --draft

# 带附件
gh release create v0.1.0 \
  ./dist/ruleforge.vsix \
  ./examples/*.yaml
```

### 查看 Release
```bash
# 列出所有 Release
gh release list

# 查看特定 Release
gh release view v0.1.0

# 在浏览器中打开
gh release view v0.1.0 --web
```

### 编辑 Release
```bash
# 编辑说明
gh release edit v0.1.0 \
  --notes "更新说明"

# 添加附件
gh release edit v0.1.0 \
  --add ./new-file.zip

# 删除附件
gh release edit v0.1.0 \
  --remove ./old-file.zip
```

### 删除 Release
```bash
gh release delete v0.1.0

# 同时删除标签
gh release delete v0.1.0 --yes
git push origin :refs/tags/v0.1.0
```

### 下载 Release 资产
```bash
# 下载所有资产
gh release download v0.1.0

# 下载特定文件
gh release download v0.1.0 \
  --pattern "*.vsix"

# 指定目录
gh release download v0.1.0 \
  --dir ./downloads
```

## 📊 常用命令

### 仓库信息
```bash
# 查看仓库信息
gh repo view

# 在浏览器中打开
gh repo view --web

# 克隆仓库
gh repo clone kialajin-l/RuleForge
```

### Pull Request
```bash
# 创建 PR
gh pr create \
  --title "feat: 新功能" \
  --body "描述变更内容"

# 查看 PR
gh pr list
gh pr view 123

# 合并 PR
gh pr merge 123 --merge
```

### Issues
```bash
# 创建 Issue
gh issue create \
  --title "Bug 报告" \
  --body "问题描述"

# 查看 Issue
gh issue list
gh issue view 456
```

## 🔧 高级用法

### 使用 API
```bash
# 直接调用 GitHub API
gh api repos/kialajin-l/RuleForge/releases

# 创建 Release（API 方式）
gh api repos/kialajin-l/RuleForge/releases \
  --method POST \
  -f tag_name=v0.1.0 \
  -f name="RuleForge v0.1.0" \
  -f body="Release notes"
```

### 脚本集成
```bash
#!/bin/bash

# 获取最新版本
LATEST=$(gh release list --limit 1 --json tagName -q '.[0].tagName')
echo "最新版本: $LATEST"

# 检查是否存在
if gh release view v0.1.0 >/dev/null 2>&1; then
  echo "Release 已存在"
else
  echo "创建新 Release"
  gh release create v0.1.0 --notes "New release"
fi
```

### 环境变量
```bash
# 设置 Token（用于 CI/CD）
export GH_TOKEN=your_token_here

# 设置仓库
export GH_REPO=kialajin-l/RuleForge

# 设置 API 主机（企业版）
export GH_HOST=github.mycompany.com
```

## 📝 最佳实践

### 版本命名
- 使用语义版本：v{major}.{minor}.{patch}
- 预发布版本：v1.0.0-alpha.1, v1.0.0-beta.1
- 发布候选：v1.0.0-rc.1

### Release Notes
- 使用清晰的标题
- 分类列出变更（新增、修复、变更、废弃）
- 包含安装和升级说明
- 链接到相关文档

### 附件管理
- 只上传必要的文件
- 使用描述性的文件名
- 提供校验和（SHA256）
- 保持文件大小合理

### 安全注意事项
- 不要在 Release 中包含敏感信息
- 使用 Token 时注意保密
- 定期更新 Token
- 使用最小权限原则

## 🐛 故障排除

### 认证问题
```bash
# 重新登录
gh auth logout
gh auth login

# 刷新 Token
gh auth refresh
```

### 网络问题
```bash
# 设置代理
export HTTPS_PROXY=http://proxy:8080
export HTTP_PROXY=http://proxy:8080

# 测试连接
gh api user
```

### 权限问题
- 确认 Token 有正确的权限范围
- 检查仓库访问设置
- 验证用户身份

## 📚 参考资源

- [GitHub CLI 官方文档](https://cli.github.com/manual/)
- [GitHub API 文档](https://docs.github.com/en/rest)
- [语义版本控制](https://semver.org/)
- [Release 最佳实践](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

---

*最后更新：2026-01-22*
*维护者：RuleForge Team*
