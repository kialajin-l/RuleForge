/**
 * GitHub Release 创建脚本
 * 用于创建和发布 RuleForge 的 GitHub Release
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * 配置选项
 */
interface ReleaseConfig {
  version: string;
  title: string;
  tag: string;
  branch: string;
  remote: string;
  notesFile: string;
  prerelease: boolean;
  draft: boolean;
}

const DEFAULT_CONFIG: ReleaseConfig = {
  version: '0.1.0',
  title: 'RuleForge MVP v0.1.0',
  tag: 'v0.1.0',
  branch: 'main',
  remote: 'origin',
  notesFile: 'RELEASE_NOTES.md',
  prerelease: false,
  draft: false,
};

/**
 * 执行命令并返回输出
 */
function runCommand(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`命令执行失败: ${command}\n错误: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 检查命令是否存在
 */
function commandExists(command: string): boolean {
  try {
    execSync(`where ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查 Git 仓库状态
 */
async function checkGitStatus(): Promise<void> {
  console.log('🔍 检查 Git 仓库状态...');

  try {
    const status = runCommand('git status --porcelain');
    if (status) {
      console.log('⚠️  检测到未提交的更改:');
      console.log(status);
      console.log('\n请先提交更改或运行 --commit 参数自动提交');
      throw new Error('存在未提交的更改');
    }
    console.log('✅ Git 仓库状态干净');
  } catch (error) {
    if (error instanceof Error && error.message.includes('未提交的更改')) {
      throw error;
    }
    console.log('⚠️  无法检查 Git 状态，继续执行...');
  }
}

/**
 * 初始化 Git 仓库（如果需要）
 */
async function initGitRepo(): Promise<void> {
  console.log('📦 初始化 Git 仓库...');

  try {
    runCommand('git rev-parse --git-dir');
    console.log('✅ Git 仓库已存在');
  } catch {
    console.log('📝 创建新的 Git 仓库...');
    runCommand('git init');
    runCommand('git add .');
    runCommand('git commit -m "feat: RuleForge MVP v0.1.0"');
    console.log('✅ Git 仓库初始化完成');
  }
}

/**
 * 配置远程仓库
 */
async function setupRemote(config: ReleaseConfig): Promise<void> {
  console.log('🔗 配置远程仓库...');

  try {
    const remotes = runCommand('git remote -v');
    if (!remotes.includes(config.remote)) {
      console.log('📝 添加远程仓库...');
      runCommand(`git remote add ${config.remote} https://github.com/kialajin-l/RuleForge.git`);
    }
    console.log('✅ 远程仓库配置完成');
  } catch (error) {
    console.log('⚠️  远程仓库配置可能已存在');
  }
}

/**
 * 提交所有更改
 */
async function commitChanges(config: ReleaseConfig): Promise<void> {
  console.log('📝 提交更改...');

  runCommand('git add .');
  runCommand(`git commit -m "feat: RuleForge ${config.title}"`);
  console.log('✅ 更改已提交');
}

/**
 * 创建并推送标签
 */
async function createTag(config: ReleaseConfig): Promise<void> {
  console.log(`🏷️  创建标签 ${config.tag}...`);

  try {
    // 检查标签是否已存在
    runCommand(`git rev-parse ${config.tag}`);
    console.log('⚠️  标签已存在，跳过创建');
  } catch {
    runCommand(`git tag -a ${config.tag} -m "${config.title}"`);
    console.log('✅ 标签创建完成');
  }

  console.log('📤 推送到远程仓库...');
  runCommand(`git push ${config.remote} ${config.branch}`);
  runCommand(`git push ${config.remote} ${config.tag}`);
  console.log('✅ 推送完成');
}

/**
 * 生成 Release Notes
 */
async function generateReleaseNotes(config: ReleaseConfig): Promise<string> {
  const notesContent = `## 🎉 首次发布

RuleForge 能从你的开发会话中自动提取可复用的编码规则。

### ✨ 功能特性
- 🔍 自动规则提取：从开发会话中提取最佳实践
- 📝 REP v0.1 标准：符合行业规范的 YAML 格式
- 🛡️ 智能验证：Zod Schema 验证确保规则质量
- 🔐 自动脱敏：保护敏感信息和项目路径
- 📊 置信度评分：智能评估规则的可复用性

### 📦 安装

#### CLI 工具
\`\`\`bash
npm install -g @ruleforge/cli
\`\`\`

#### 核心库
\`\`\`bash
npm install @ruleforge/core
\`\`\`

#### Trae/VSCode 插件
下载 .vsix 文件并从扩展安装

### 🚀 快速开始
\`\`\`bash
# 初始化
ruleforge init

# 提取规则
ruleforge extract --log ./session.jsonl

# 验证规则
ruleforge validate ./rule.yaml
\`\`\`

### 📚 文档
- [README](./README.md)
- [REP 协议](./docs/REP.md)
- [API 文档](./docs/API.md)
- [CLI 参考](./docs/CLI.md)

### 🧪 测试
\`\`\`bash
npm test
npm run demo
\`\`\`

### 🙏 致谢
基于 CodePilot 和 Multica 的架构思想，独立实现。

遵循 MIT License。
`;

  const notesPath = path.join(rootDir, config.notesFile);
  await fs.writeFile(notesPath, notesContent, 'utf-8');
  console.log(`✅ Release Notes 已生成: ${config.notesFile}`);
  
  return notesPath;
}

/**
 * 使用 GitHub CLI 创建 Release
 */
async function createReleaseWithCLI(config: ReleaseConfig, notesPath: string): Promise<void> {
  console.log('🚀 使用 GitHub CLI 创建 Release...');

  if (!commandExists('gh')) {
    console.log('❌ 未找到 GitHub CLI (gh)');
    console.log('📝 请安装 GitHub CLI: https://cli.github.com/');
    console.log('🔑 然后运行: gh auth login');
    throw new Error('GitHub CLI 未安装');
  }

  // 检查是否已登录
  try {
    runCommand('gh auth status');
  } catch {
    console.log('❌ 未登录 GitHub');
    console.log('🔑 请运行: gh auth login');
    throw new Error('未登录 GitHub');
  }

  const flags = [
    config.prerelease ? '--prerelease' : '',
    config.draft ? '--draft' : '',
    `--title "${config.title}"`,
    `--notes-file "${notesPath}"`,
  ].filter(Boolean).join(' ');

  const command = `gh release create ${config.tag} ${flags}`;
  runCommand(command);
  console.log('✅ Release 创建成功');
}

/**
 * 使用 GitHub API 创建 Release（备用方案）
 */
async function createReleaseWithAPI(config: ReleaseConfig, notesPath: string): Promise<void> {
  console.log('🚀 使用 GitHub API 创建 Release...');

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('❌ 未设置 GITHUB_TOKEN 环境变量');
    console.log('🔑 请设置: export GITHUB_TOKEN=your_token');
    throw new Error('缺少 GITHUB_TOKEN');
  }

  const notesContent = await fs.readFile(notesPath, 'utf-8');

  const releaseData = {
    tag_name: config.tag,
    name: config.title,
    body: notesContent,
    draft: config.draft,
    prerelease: config.prerelease,
  };

  console.log('📤 发送 API 请求...');
  
  // 使用 curl 发送请求
  const curlCommand = `curl -X POST \\
    -H "Authorization: token ${token}" \\
    -H "Accept: application/vnd.github.v3+json" \\
    https://api.github.com/repos/kialajin-l/RuleForge/releases \\
    -d '${JSON.stringify(releaseData)}'`;

  try {
    const response = runCommand(curlCommand);
    console.log('✅ Release 创建成功');
    console.log(response);
  } catch (error) {
    console.log('❌ API 请求失败');
    throw error;
  }
}

/**
 * 验证 Release
 */
async function verifyRelease(config: ReleaseConfig): Promise<void> {
  console.log('🔍 验证 Release...');

  // 检查标签
  try {
    runCommand(`git ls-remote --tags ${config.remote} | grep ${config.tag}`);
    console.log('✅ 标签已推送到远程仓库');
  } catch {
    console.log('❌ 标签未推送到远程仓库');
  }

  // 检查 Release
  if (commandExists('gh')) {
    try {
      runCommand(`gh release view ${config.tag}`);
      console.log('✅ Release 已创建');
    } catch {
      console.log('❌ Release 未找到');
    }
  }

  console.log('📋 验证完成');
}

/**
 * 显示 Release 信息
 */
function showReleaseInfo(config: ReleaseConfig): void {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 RuleForge Release 创建完成！');
  console.log('='.repeat(60));
  console.log(`📦 版本: ${config.version}`);
  console.log(`🏷️  标签: ${config.tag}`);
  console.log(`📝 标题: ${config.title}`);
  console.log(`🌐 Release 页面: https://github.com/kialajin-l/RuleForge/releases/tag/${config.tag}`);
  console.log('='.repeat(60));
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--version':
        config.version = args[++i] || config.version;
        config.tag = `v${config.version}`;
        config.title = `RuleForge v${config.version}`;
        break;
      case '--title':
        config.title = args[++i] || config.title;
        break;
      case '--tag':
        config.tag = args[++i] || config.tag;
        break;
      case '--branch':
        config.branch = args[++i] || config.branch;
        break;
      case '--remote':
        config.remote = args[++i] || config.remote;
        break;
      case '--prerelease':
        config.prerelease = true;
        break;
      case '--draft':
        config.draft = true;
        break;
      case '--commit':
        await commitChanges(config);
        break;
      case '--api':
        // 使用 API 而不是 CLI
        config['useAPI'] = true;
        break;
      case '--help':
        console.log(`
用法: tsx scripts/create-release.ts [选项]

选项:
  --version <version>    版本号 (默认: 0.1.0)
  --title <title>        Release 标题
  --tag <tag>            Git 标签 (默认: v0.1.0)
  --branch <branch>      分支名称 (默认: main)
  --remote <remote>      远程仓库名称 (默认: origin)
  --prerelease           标记为预发布版本
  --draft                创建为草稿
  --commit               自动提交更改
  --api                  使用 GitHub API 而不是 CLI
  --help                 显示帮助信息

示例:
  tsx scripts/create-release.ts
  tsx scripts/create-release.ts --version 0.2.0 --prerelease
  tsx scripts/create-release.ts --draft --commit
        `);
        process.exit(0);
        break;
    }
  }

  console.log('🚀 RuleForge GitHub Release 创建流程');
  console.log('='.repeat(60));

  try {
    // 1. 初始化 Git 仓库
    await initGitRepo();

    // 2. 配置远程仓库
    await setupRemote(config);

    // 3. 检查 Git 状态
    await checkGitStatus();

    // 4. 生成 Release Notes
    const notesPath = await generateReleaseNotes(config);

    // 5. 创建并推送标签
    await createTag(config);

    // 6. 创建 Release
    const useAPI = config['useAPI'] as boolean;
    if (useAPI) {
      await createReleaseWithAPI(config, notesPath);
    } else {
      await createReleaseWithCLI(config, notesPath);
    }

    // 7. 验证 Release
    await verifyRelease(config);

    // 8. 显示信息
    showReleaseInfo(config);

  } catch (error) {
    console.error('\n❌ Release 创建失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
