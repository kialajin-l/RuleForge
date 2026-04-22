/**
 * RuleForge 配置和 CLI 端到端测试
 * 测试配置优先级和 CLI 命令功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import stripAnsi from 'strip-ansi';

// 导入核心模块
import { ConfigManager } from '../../src/config/config-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试数据目录
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

// CLI 可执行文件路径
const CLI_PATH = path.join(__dirname, '..', '..', '..', 'cli', 'dist', 'index.js');

describe('RuleForge 配置和 CLI 测试', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // 保存原始工作目录
    originalCwd = process.cwd();
    
    // 创建临时目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruleforge-test-'));
    
    // 切换到临时目录
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // 恢复原始工作目录
    process.chdir(originalCwd);
    
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理临时目录失败:', error);
    }
  });

  describe('测试场景 4：配置优先级', () => {
    it('应该正确加载多层级配置', async () => {
      // 1. 创建项目级配置
      const projectConfig = {
        extraction: {
          minConfidence: 0.8,
          logPath: './project-logs'
        },
        privacy: {
          autoRedact: true,
          projectName: 'test-project'
        },
        storage: {
          localRulesDir: '.ruleforge/rules'
        },
        output: {
          format: 'yaml'
        }
      };
      
      await fs.writeFile(
        path.join(tempDir, '.ruleforge.yaml'),
        JSON.stringify(projectConfig, null, 2)
      );

      // 2. 创建用户级配置（模拟）
      const userConfigDir = path.join(tempDir, 'user-home');
      await fs.mkdir(userConfigDir, { recursive: true });
      
      const userConfig = {
        extraction: {
          minConfidence: 0.6,
          logPath: './user-logs'
        }
      };
      
      await fs.writeFile(
        path.join(userConfigDir, '.ruleforge', 'config.yaml'),
        JSON.stringify(userConfig, null, 2)
      );

      // 3. 模拟用户主目录环境变量
      const originalHome = process.env.HOME;
      process.env.HOME = userConfigDir;

      try {
        // 4. 加载配置
        const configManager = new ConfigManager();
        const config = await configManager.load();

        // 5. 验证配置优先级（项目级优先）
        expect(config.extraction.minConfidence).toBe(0.8);
        expect(config.extraction.logPath).toBe('./project-logs');
        expect(config.privacy.projectName).toBe('test-project');
        
        // 6. 验证默认值被正确应用
        expect(config.extraction.applicableScenes).toBe(2); // 默认值
        expect(config.storage.maxVersions).toBe(10); // 默认值

      } finally {
        // 恢复原始环境变量
        if (originalHome) {
          process.env.HOME = originalHome;
        } else {
          delete process.env.HOME;
        }
      }
    });

    it('应该支持命令行参数覆盖', async () => {
      // 1. 创建项目级配置
      const projectConfig = {
        extraction: {
          minConfidence: 0.8,
          logPath: './project-logs'
        }
      };
      
      await fs.writeFile(
        path.join(tempDir, '.ruleforge.yaml'),
        JSON.stringify(projectConfig, null, 2)
      );

      // 2. 加载配置并应用命令行覆盖
      const configManager = new ConfigManager();
      const config = await configManager.load({
        overrides: {
          extraction: {
            minConfidence: 0.9
          }
        }
      });

      // 3. 验证命令行参数最优先
      expect(config.extraction.minConfidence).toBe(0.9); // 命令行覆盖
      expect(config.extraction.logPath).toBe('./project-logs'); // 项目级配置
      
      // 4. 验证其他配置项保持不变
      expect(config.extraction.applicableScenes).toBe(2); // 默认值
    });

    it('应该处理缺失配置文件的情况', async () => {
      // 不创建任何配置文件，测试默认配置加载
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // 验证默认配置
      expect(config.extraction.minConfidence).toBe(0.7); // 默认值
      expect(config.extraction.logPath).toBe('.ruleforge/logs'); // 默认值
      expect(config.extraction.applicableScenes).toBe(2); // 默认值
      
      // 验证隐私配置默认值
      expect(config.privacy.autoRedact).toBe(true);
      expect(config.privacy.projectName).toBe('{project_name}');
    });

    it('应该验证配置文件的格式和内容', async () => {
      // 1. 创建格式错误的配置文件
      await fs.writeFile(
        path.join(tempDir, '.ruleforge.yaml'),
        'invalid yaml content: [unclosed bracket'
      );

      const configManager = new ConfigManager();
      
      // 2. 验证配置加载失败
      await expect(configManager.load()).rejects.toThrow();

      // 3. 创建内容错误的配置文件
      await fs.writeFile(
        path.join(tempDir, '.ruleforge.yaml'),
        JSON.stringify({
          extraction: {
            minConfidence: 1.5, // 无效的置信度
            logPath: 123 // 无效的类型
          }
        }, null, 2)
      );

      // 4. 验证配置验证失败
      await expect(configManager.load()).rejects.toThrow();
    });
  });

  describe('测试场景 5：CLI 命令测试', () => {
    beforeEach(async () => {
      // 确保 CLI 可执行文件存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        // 如果 CLI 不存在，跳过 CLI 测试
        console.warn('CLI 可执行文件不存在，跳过 CLI 测试');
      }
    });

    it('应该测试 ruleforge init 命令', async () => {
      // 跳过测试如果 CLI 不存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        return;
      }

      // 1. 执行 init 命令
      const { stdout, stderr, exitCode } = await execa('node', [
        CLI_PATH,
        'init',
        '--force',
        '--template',
        'vue'
      ], {
        cwd: tempDir
      });

      // 2. 验证命令执行成功
      expect(exitCode).toBe(0);
      expect(stderr).toBe('');
      
      const cleanOutput = stripAnsi(stdout);
      expect(cleanOutput).toContain('RuleForge 项目初始化');
      expect(cleanOutput).toContain('初始化完成');

      // 3. 验证创建的文件和目录
      const configExists = await fileExists(path.join(tempDir, '.ruleforge.yaml'));
      expect(configExists).toBe(true);

      const rulesDirExists = await fileExists(path.join(tempDir, '.ruleforge', 'rules'));
      expect(rulesDirExists).toBe(true);

      const versionsDirExists = await fileExists(path.join(tempDir, '.ruleforge', 'rules', 'versions'));
      expect(versionsDirExists).toBe(true);

      const logsDirExists = await fileExists(path.join(tempDir, '.ruleforge', 'logs'));
      expect(logsDirExists).toBe(true);

      // 4. 验证配置文件内容
      const configContent = await fs.readFile(path.join(tempDir, '.ruleforge.yaml'), 'utf-8');
      expect(configContent).toContain('extraction');
      expect(configContent).toContain('privacy');
      expect(configContent).toContain('storage');
      expect(configContent).toContain('output');

      // 5. 验证示例规则
      const exampleRules = await fs.readdir(path.join(tempDir, '.ruleforge', 'rules'));
      expect(exampleRules.length).toBeGreaterThan(0);
      expect(exampleRules.some(file => file.endsWith('.yaml'))).toBe(true);
    });

    it('应该测试 ruleforge extract 命令', async () => {
      // 跳过测试如果 CLI 不存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        return;
      }

      // 1. 初始化项目
      await execa('node', [CLI_PATH, 'init', '--force'], { cwd: tempDir });

      // 2. 创建测试日志文件
      const logsDir = path.join(tempDir, 'test-logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      const testLogContent = `
        {"timestamp": "2024-01-15T10:00:00Z", "type": "file_saved", "file": "/test/src/Component.vue", "language": "vue", "content": "<template>\\n  <div>{{ message }}</div>\\n</template>\\n\\n<script setup>\\nconst props = defineProps({ message: String })\\n</script>"}
        {"timestamp": "2024-01-15T10:05:00Z", "type": "error_occurred", "file": "/test/src/Component.vue", "language": "vue", "error": "Props validation error", "fix": "Added type annotation"}
      `;
      
      await fs.writeFile(path.join(logsDir, 'session.jsonl'), testLogContent);

      // 3. 执行 extract 命令（干运行模式）
      const { stdout, stderr, exitCode } = await execa('node', [
        CLI_PATH,
        'extract',
        '--log',
        logsDir,
        '--min-conf',
        '0.8',
        '--dry-run'
      ], {
        cwd: tempDir
      });

      // 4. 验证命令执行成功
      expect(exitCode).toBe(0);
      
      const cleanOutput = stripAnsi(stdout);
      expect(cleanOutput).toContain('RuleForge 规则提取');
      expect(cleanOutput).toContain('提取完成');

      // 5. 验证干运行模式不创建文件
      const candidatesDir = path.join(tempDir, '.ruleforge', 'candidates');
      const candidatesExist = await fileExists(candidatesDir);
      expect(candidatesExist).toBe(false); // dry-run 不应该创建目录

      // 6. 验证输出包含规则信息
      expect(cleanOutput).toMatch(/共找到 \d+ 个候选规则/);
      expect(cleanOutput).toContain('有效规则');
      expect(cleanOutput).toContain('无效规则');
    });

    it('应该测试 ruleforge validate 命令', async () => {
      // 跳过测试如果 CLI 不存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        return;
      }

      // 1. 创建测试规则文件
      const validRule = `
        meta:
          id: test-rule-validation
          name: Test Rule Validation
          version: 1.0.0
          description: Test rule for validation
          authors: ["test"]
          license: MIT
          created: "2024-01-15T10:00:00Z"
          updated: "2024-01-15T10:00:00Z"
        rule:
          trigger:
            type: file_pattern
            pattern: "**/*.vue"
            file_types: ["vue"]
            context: "Vue component"
          conditions:
            - type: code_contains
              condition: "test condition"
              negated: false
          suggestions:
            - description: "test suggestion"
              code: "console.log('test')"
        compatibility:
          languages: ["vue"]
          frameworks: ["vue"]
          min_version: "3.0.0"
          max_version: "4.0.0"
        confidence: 0.9
      `;

      const rulePath = path.join(tempDir, 'test-rule.yaml');
      await fs.writeFile(rulePath, validRule);

      // 2. 执行 validate 命令
      const { stdout, stderr, exitCode } = await execa('node', [
        CLI_PATH,
        'validate',
        rulePath
      ], {
        cwd: tempDir
      });

      // 3. 验证命令执行成功
      expect(exitCode).toBe(0);
      
      const cleanOutput = stripAnsi(stdout);
      expect(cleanOutput).toContain('RuleForge 规则验证');
      expect(cleanOutput).toContain('规则验证通过');

      // 4. 测试无效规则
      const invalidRule = `
        meta:
          name: Invalid Rule
          version: 1.0.0
        rule:
          trigger:
            type: file_pattern
            pattern: "**/*.ts"
      `;

      const invalidRulePath = path.join(tempDir, 'invalid-rule.yaml');
      await fs.writeFile(invalidRulePath, invalidRule);

      // 5. 执行 validate 命令（应该失败）
      const invalidResult = await execa('node', [
        CLI_PATH,
        'validate',
        invalidRulePath,
        '--strict'
      ], {
        cwd: tempDir,
        reject: false // 不抛出错误，让我们检查退出码
      });

      // 6. 验证验证失败
      expect(invalidResult.exitCode).not.toBe(0);
      expect(invalidResult.stdout).toContain('验证失败');
      expect(invalidResult.stdout).toContain('错误详情');
    });

    it('应该测试 ruleforge list 命令', async () => {
      // 跳过测试如果 CLI 不存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        return;
      }

      // 1. 初始化项目并添加示例规则
      await execa('node', [CLI_PATH, 'init', '--force'], { cwd: tempDir });

      // 2. 执行 list 命令
      const { stdout, stderr, exitCode } = await execa('node', [
        CLI_PATH,
        'list',
        '--format',
        'table',
        '--framework',
        'vue'
      ], {
        cwd: tempDir
      });

      // 3. 验证命令执行成功
      expect(exitCode).toBe(0);
      
      const cleanOutput = stripAnsi(stdout);
      expect(cleanOutput).toContain('RuleForge 规则列表');
      expect(cleanOutput).toContain('规则列表');

      // 4. 验证表格格式输出
      expect(cleanOutput).toContain('ID');
      expect(cleanOutput).toContain('名称');
      expect(cleanOutput).toContain('版本');
      expect(cleanOutput).toContain('置信度');

      // 5. 测试 JSON 格式输出
      const jsonResult = await execa('node', [
        CLI_PATH,
        'list',
        '--format',
        'json'
      ], {
        cwd: tempDir
      });

      expect(jsonResult.exitCode).toBe(0);
      
      // 验证 JSON 输出可解析
      try {
        const rules = JSON.parse(jsonResult.stdout);
        expect(Array.isArray(rules)).toBe(true);
      } catch {
        throw new Error('JSON 输出格式无效');
      }

      // 6. 测试 YAML 格式输出
      const yamlResult = await execa('node', [
        CLI_PATH,
        'list',
        '--format',
        'yaml'
      ], {
        cwd: tempDir
      });

      expect(yamlResult.exitCode).toBe(0);
      expect(yamlResult.stdout).toContain('meta:');
      expect(yamlResult.stdout).toContain('rule:');
    });

    it('应该测试 CLI 错误处理和帮助信息', async () => {
      // 跳过测试如果 CLI 不存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        return;
      }

      // 1. 测试帮助命令
      const helpResult = await execa('node', [CLI_PATH, '--help'], {
        cwd: tempDir
      });

      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.stdout).toContain('ruleforge');
      expect(helpResult.stdout).toContain('命令');
      expect(helpResult.stdout).toContain('选项');

      // 2. 测试版本命令
      const versionResult = await execa('node', [CLI_PATH, '--version'], {
        cwd: tempDir
      });

      expect(versionResult.exitCode).toBe(0);
      expect(versionResult.stdout).toMatch(/\d+\.\d+\.\d+/);

      // 3. 测试未知命令
      const unknownResult = await execa('node', [
        CLI_PATH,
        'unknown-command'
      ], {
        cwd: tempDir,
        reject: false
      });

      expect(unknownResult.exitCode).not.toBe(0);
      expect(unknownResult.stderr).toContain('未知命令');

      // 4. 测试无效选项
      const invalidOptionResult = await execa('node', [
        CLI_PATH,
        'init',
        '--invalid-option'
      ], {
        cwd: tempDir,
        reject: false
      });

      expect(invalidOptionResult.exitCode).not.toBe(0);
      expect(invalidOptionResult.stderr).toContain('未知选项');
    });
  });

  describe('集成测试：配置和 CLI 协同工作', () => {
    it('应该验证配置对 CLI 命令的影响', async () => {
      // 跳过测试如果 CLI 不存在
      try {
        await fs.access(CLI_PATH);
      } catch {
        return;
      }

      // 1. 创建自定义配置
      const customConfig = {
        extraction: {
          minConfidence: 0.85,
          logPath: './custom-logs',
          applicableScenes: 3
        },
        output: {
          format: 'json',
          prettyPrint: false
        }
      };

      await fs.writeFile(
        path.join(tempDir, '.ruleforge.yaml'),
        JSON.stringify(customConfig, null, 2)
      );

      // 2. 初始化项目
      await execa('node', [CLI_PATH, 'init', '--force'], { cwd: tempDir });

      // 3. 验证配置被正确应用
      const configContent = await fs.readFile(path.join(tempDir, '.ruleforge.yaml'), 'utf-8');
      const config = JSON.parse(configContent);
      
      expect(config.extraction.minConfidence).toBe(0.85);
      expect(config.extraction.logPath).toBe('./custom-logs');
      expect(config.output.format).toBe('json');

      // 4. 测试配置对 extract 命令的影响
      const logsDir = path.join(tempDir, 'custom-logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      // 创建简单日志文件
      await fs.writeFile(path.join(logsDir, 'test.log'), '{}');

      const extractResult = await execa('node', [
        CLI_PATH,
        'extract',
        '--dry-run'
      ], {
        cwd: tempDir,
        reject: false
      });

      // 验证命令使用了配置中的设置
      expect(extractResult.stdout).toContain('最小置信度');
    });

    it('应该测试环境变量配置', async () => {
      // 1. 设置环境变量
      process.env.RULEFORGE_MIN_CONFIDENCE = '0.95';
      process.env.RULEFORGE_LOG_PATH = './env-logs';

      try {
        const configManager = new ConfigManager();
        const config = await configManager.load();

        // 验证环境变量被正确应用
        expect(config.extraction.minConfidence).toBe(0.95);
        expect(config.extraction.logPath).toBe('./env-logs');

      } finally {
        // 清理环境变量
        delete process.env.RULEFORGE_MIN_CONFIDENCE;
        delete process.env.RULEFORGE_LOG_PATH;
      }
    });
  });
});

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建临时配置文件
 */
async function createTempConfig(config: any, filename: string = '.ruleforge.yaml'): Promise<string> {
  const configPath = path.join(process.cwd(), filename);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles(...files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch {
      // 忽略文件不存在的错误
    }
  }
}