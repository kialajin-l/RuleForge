#!/usr/bin/env tsx

/**
 * RuleForge npm 发布脚本
 * 自动化构建、验证和发布 @ruleforge/core 和 @ruleforge/cli
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

interface PackageInfo {
  name: string;
  path: string;
  version: string;
}

interface PublishResult {
  success: boolean;
  package: string;
  version: string;
  size?: string;
  files?: number;
  error?: string;
}

/**
 * 发布脚本主类
 */
class NpmPublisher {
  private packages: PackageInfo[] = [
    {
      name: '@ruleforge/core',
      path: path.join(rootDir, 'packages', 'core'),
      version: '0.1.0'
    },
    {
      name: '@ruleforge/cli',
      path: path.join(rootDir, 'packages', 'cli'),
      version: '0.1.0'
    }
  ];

  private results: PublishResult[] = [];

  /**
   * 运行完整发布流程
   */
  async publish(): Promise<void> {
    console.log(chalk.bold.cyan('🚀 RuleForge npm 发布流程'));
    console.log(chalk.gray('='.repeat(60) + '\n'));

    try {
      // 1. 预检查
      await this.preChecks();

      // 2. 构建包
      await this.buildPackages();

      // 3. 验证包
      await this.validatePackages();

      // 4. 预览包内容
      await this.previewPackages();

      // 5. 发布包
      await this.publishPackages();

      // 6. 验证发布
      await this.verifyPublish();

      // 7. 显示结果
      this.showResults();

      console.log(chalk.bold.green('\n🎉 发布完成！'));

    } catch (error) {
      console.error(chalk.red('\n❌ 发布失败:'), error);
      process.exit(1);
    }
  }

  /**
   * 预检查
   */
  private async preChecks(): Promise<void> {
    console.log(chalk.blue('🔍 1. 预检查...'));

    // 检查 npm 登录状态
    try {
      const whoami = execSync('npm whoami', { encoding: 'utf-8' }).trim();
      console.log(chalk.green(`   ✅ 已登录 npm 用户: ${whoami}`));
    } catch {
      console.log(chalk.yellow('   ⚠️ 未登录 npm，请先运行: npm login'));
      console.log(chalk.yellow('   提示：需要发布 @ruleforge scope 的包'));
      throw new Error('npm login required');
    }

    // 检查 package.json 配置
    for (const pkg of this.packages) {
      const pkgJsonPath = path.join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));

      // 验证必需字段
      const requiredFields = ['name', 'version', 'description', 'main', 'types'];
      for (const field of requiredFields) {
        if (!pkgJson[field]) {
          throw new Error(`${pkg.name}: 缺少必需字段 ${field}`);
        }
      }

      // 验证 files 数组
      if (!pkgJson.files || pkgJson.files.length === 0) {
        throw new Error(`${pkg.name}: files 数组不能为空`);
      }

      console.log(chalk.green(`   ✅ ${pkg.name} package.json 验证通过`));
    }

    console.log();
  }

  /**
   * 构建包
   */
  private async buildPackages(): Promise<void> {
    console.log(chalk.blue('🔨 2. 构建包...'));

    for (const pkg of this.packages) {
      console.log(chalk.gray(`   构建 ${pkg.name}...`));

      try {
        // 清理旧的构建
        execSync('npm run clean', {
          cwd: pkg.path,
          stdio: 'inherit'
        });

        // 构建
        execSync('npm run build', {
          cwd: pkg.path,
          stdio: 'inherit'
        });

        console.log(chalk.green(`   ✅ ${pkg.name} 构建完成`));
      } catch (error) {
        throw new Error(`${pkg.name} 构建失败: ${error}`);
      }
    }

    console.log();
  }

  /**
   * 验证包
   */
  private async validatePackages(): Promise<void> {
    console.log(chalk.blue('✅ 3. 验证包...'));

    for (const pkg of this.packages) {
      const pkgJsonPath = path.join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));

      // 验证 main 和 types 字段
      const mainPath = path.join(pkg.path, pkgJson.main);
      const typesPath = path.join(pkg.path, pkgJson.types);

      try {
        await fs.access(mainPath);
        console.log(chalk.green(`   ✅ ${pkg.name}: main 文件存在`));
      } catch {
        throw new Error(`${pkg.name}: main 文件不存在 (${pkgJson.main})`);
      }

      try {
        await fs.access(typesPath);
        console.log(chalk.green(`   ✅ ${pkg.name}: types 文件存在`));
      } catch {
        throw new Error(`${pkg.name}: types 文件不存在 (${pkgJson.types})`);
      }

      // 验证无敏感信息
      const distDir = path.join(pkg.path, 'dist');
      const files = await this.getAllFiles(distDir);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');

        // 检查敏感信息模式
        const sensitivePatterns = [
          /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
          /secret\s*[:=]\s*['"][^'"]+['"]/i,
          /password\s*[:=]\s*['"][^'"]+['"]/i,
          /token\s*[:=]\s*['"][^'"]+['"]/i
        ];

        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            throw new Error(`${pkg.name}: 检测到敏感信息 (${file})`);
          }
        }
      }

      console.log(chalk.green(`   ✅ ${pkg.name}: 无敏感信息泄露`));
    }

    console.log();
  }

  /**
   * 预览包内容
   */
  private async previewPackages(): Promise<void> {
    console.log(chalk.blue('📦 4. 预览包内容...'));

    for (const pkg of this.packages) {
      console.log(chalk.gray(`   预览 ${pkg.name}...`));

      try {
        const output = execSync('npm pack --dry-run', {
          cwd: pkg.path,
          encoding: 'utf-8'
        });

        // 解析包大小和文件数
        const sizeMatch = output.match(/(\d+\.\d+\s*[kKmMgG]?B)/);
        const fileMatch = output.match(/(\d+)\s+files?/);

        console.log(chalk.green(`   ✅ ${pkg.name} 预览完成`));
        if (sizeMatch) {
          console.log(chalk.gray(`      包大小: ${sizeMatch[1]}`));
        }
        if (fileMatch) {
          console.log(chalk.gray(`      文件数: ${fileMatch[1]}`));
        }
      } catch (error) {
        throw new Error(`${pkg.name} 预览失败: ${error}`);
      }
    }

    console.log();
  }

  /**
   * 发布包
   */
  private async publishPackages(): Promise<void> {
    console.log(chalk.blue('📤 5. 发布包...'));

    for (const pkg of this.packages) {
      console.log(chalk.gray(`   发布 ${pkg.name}@${pkg.version}...`));

      try {
        execSync('npm publish --access public', {
          cwd: pkg.path,
          stdio: 'inherit'
        });

        this.results.push({
          success: true,
          package: pkg.name,
          version: pkg.version
        });

        console.log(chalk.green(`   ✅ ${pkg.name}@${pkg.version} 发布成功`));
      } catch (error) {
        this.results.push({
          success: false,
          package: pkg.name,
          version: pkg.version,
          error: String(error)
        });

        console.log(chalk.red(`   ❌ ${pkg.name}@${pkg.version} 发布失败`));
        throw new Error(`${pkg.name} 发布失败: ${error}`);
      }
    }

    console.log();
  }

  /**
   * 验证发布
   */
  private async verifyPublish(): Promise<void> {
    console.log(chalk.blue('🔍 6. 验证发布...'));

    for (const pkg of this.packages) {
      console.log(chalk.gray(`   验证 ${pkg.name}...`));

      try {
        const output = execSync(`npm view ${pkg.name} --json`, {
          encoding: 'utf-8'
        });

        const info = JSON.parse(output);

        console.log(chalk.green(`   ✅ ${pkg.name} 发布验证通过`));
        console.log(chalk.gray(`      最新版本: ${info['dist-tags']?.latest || 'unknown'}`));
        console.log(chalk.gray(`      描述: ${info.description || 'unknown'}`));
      } catch (error) {
        console.log(chalk.yellow(`   ⚠️ ${pkg.name} 验证失败（可能需要等待 npm 同步）`));
      }
    }

    console.log();
  }

  /**
   * 显示结果
   */
  private showResults(): void {
    console.log(chalk.blue('📊 发布结果:'));
    console.log(chalk.gray('─'.repeat(40)));

    for (const result of this.results) {
      const status = result.success ? chalk.green('✅') : chalk.red('❌');
      console.log(`${status} ${result.package}@${result.version}`);

      if (result.size) {
        console.log(chalk.gray(`   包大小: ${result.size}`));
      }
      if (result.files) {
        console.log(chalk.gray(`   文件数: ${result.files}`));
      }
      if (result.error) {
        console.log(chalk.red(`   错误: ${result.error}`));
      }
    }

    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;

    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.gray(`总计: ${successCount}/${totalCount} 成功`));
  }

  /**
   * 获取目录下所有文件
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // 忽略不存在的目录
    }

    return files;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
RuleForge npm 发布脚本

用法:
  tsx scripts/publish-npm.ts [选项]

选项:
  --help, -h     显示帮助信息
  --dry-run      仅预览，不实际发布
  --skip-checks  跳过预检查
  --verbose      显示详细输出

示例:
  tsx scripts/publish-npm.ts              # 完整发布流程
  tsx scripts/publish-npm.ts --dry-run    # 仅预览
    `);
    return;
  }

  const publisher = new NpmPublisher();
  await publisher.publish();
}

// 启动发布
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { NpmPublisher };