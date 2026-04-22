# RuleForge npm 发布指南

## 📋 发布前准备

### 1. npm 登录

```bash
# 登录 npm（首次需要）
npm adduser

# 或使用已有账号登录
npm login

# 验证登录状态
npm whoami
```

### 2. 检查包配置

```bash
# 验证 package.json
cat packages/core/package.json
cat packages/cli/package.json

# 确保以下字段正确：
# - name: @ruleforge/core 或 @ruleforge/cli
# - version: 0.1.0
# - main: dist/index.js
# - types: dist/index.d.ts
# - files: ["dist"]
# - publishConfig.access: public
```

### 3. 构建包

```bash
# 构建核心包
cd packages/core
npm run build

# 构建 CLI 包
cd ../cli
npm run build
```

### 4. 预览包内容

```bash
# 预览核心包
cd packages/core
npm pack --dry-run

# 预览 CLI 包
cd ../cli
npm pack --dry-run
```

## 🚀 发布步骤

### 方式一：使用发布脚本（推荐）

```bash
# 运行自动发布脚本
tsx scripts/publish-npm.ts
```

脚本会自动：
1. 检查 npm 登录状态
2. 验证 package.json 配置
3. 构建所有包
4. 验证构建产物
5. 发布到 npm
6. 验证发布结果

### 方式二：手动发布

```bash
# 1. 发布核心包
cd packages/core
npm publish --access public

# 2. 发布 CLI 包
cd ../cli
npm publish --access public
```

## ✅ 验证发布

```bash
# 检查包信息
npm view @ruleforge/core
npm view @ruleforge/cli

# 测试全局安装
npm install -g @ruleforge/cli
ruleforge --version

# 测试核心库安装
npm install @ruleforge/core
```

## 📦 版本管理

### 语义版本控制

```bash
# 补丁版本（bug 修复）
npm version patch  # 0.1.0 -> 0.1.1

# 次版本（新功能）
npm version minor  # 0.1.0 -> 0.2.0

# 主版本（破坏性变更）
npm version major  # 0.1.0 -> 1.0.0
```

### 发布流程

1. 更新版本号
2. 更新 CHANGELOG.md
3. 提交更改
4. 打标签
5. 发布到 npm
6. 推送到 GitHub

```bash
# 完整流程示例
npm version patch
git add .
git commit -m "chore: release v0.1.1"
git tag v0.1.1
cd packages/core && npm publish --access public
cd ../cli && npm publish --access public
git push origin main --tags
```

## 🔧 故障排除

### 常见问题

**1. 未登录 npm**
```bash
npm login
```

**2. 包名已被占用**
- 检查 npm 上是否已有同名包
- 使用 scope 前缀：@ruleforge/core

**3. 版本冲突**
```bash
# 强制发布（谨慎使用）
npm publish --force
```

**4. 网络问题**
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
```

### 验证清单

- [ ] npm 已登录
- [ ] package.json 配置正确
- [ ] 构建成功
- [ ] 无敏感信息泄露
- [ ] 版本号正确
- [ ] CHANGELOG.md 已更新
- [ ] Git 提交并打标签
- [ ] 发布成功
- [ ] 安装测试通过

## 📝 发布后

1. 更新 GitHub Releases
2. 更新项目文档
3. 通知团队成员
4. 监控 npm 下载统计

---

*最后更新：2026-01-22*
*维护者：RuleForge Team*
