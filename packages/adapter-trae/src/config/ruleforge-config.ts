/**
 * RuleForge 插件配置读取模块
 * 从 .ruleforge.yaml 读取项目配置，提供类型安全的配置访问
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 提取配置
 */
export interface ExtractionConfig {
  minConfidence: number;
  applicableScenes: number;
  logPath: string;
  languageFocus: string[];
  maxFileSize: number;
}

/**
 * 隐私配置
 */
export interface PrivacyConfig {
  autoRedact: boolean;
  allowedPatterns: string[];
  projectName: string;
  redactApiKeys: boolean;
  redactPaths: boolean;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  localRulesDir: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  maxVersions: number;
  backupEnabled: boolean;
}

/**
 * 输出配置
 */
export interface OutputConfig {
  format: string;
  prettyPrint: boolean;
  includeComments: boolean;
  validateOutput: boolean;
  generateReport: boolean;
}

/**
 * 自动触发配置
 */
export interface AutoTriggerConfig {
  enabled: boolean;
  saveThreshold: number;
  idleMinutes: number;
  notifyOnExtract: boolean;
}

/**
 * 注入配置
 */
export interface InjectionConfig {
  enabled: boolean;
  targetFile: string;
  format: 'markdown' | 'json';
  updateOnSave: boolean;
}

/**
 * 完整的 RuleForge 配置
 */
export interface RuleForgeProjectConfig {
  extraction: ExtractionConfig;
  privacy: PrivacyConfig;
  storage: StorageConfig;
  output: OutputConfig;
  autoTrigger: AutoTriggerConfig;
  injection: InjectionConfig;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: RuleForgeProjectConfig = {
  extraction: {
    minConfidence: 0.7,
    applicableScenes: 2,
    logPath: '.ruleforge/logs',
    languageFocus: ['typescript', 'javascript', 'vue', 'python'],
    maxFileSize: 10 * 1024 * 1024
  },
  privacy: {
    autoRedact: true,
    allowedPatterns: [],
    projectName: '{project_name}',
    redactApiKeys: true,
    redactPaths: true
  },
  storage: {
    localRulesDir: '.ruleforge/rules',
    cacheEnabled: true,
    cacheTTL: 7200,
    maxVersions: 10,
    backupEnabled: true
  },
  output: {
    format: 'yaml',
    prettyPrint: true,
    includeComments: true,
    validateOutput: true,
    generateReport: true
  },
  autoTrigger: {
    enabled: true,
    saveThreshold: 15,
    idleMinutes: 30,
    notifyOnExtract: true
  },
  injection: {
    enabled: true,
    targetFile: '.ruleforge/rules.md',
    format: 'markdown',
    updateOnSave: true
  }
};

/**
 * RuleForge 配置管理器
 */
export class RuleForgeConfig {
  private config: RuleForgeProjectConfig;
  private workspaceRoot: string;
  private configPath: string;
  private _onDidChange = new vscode.EventEmitter<RuleForgeProjectConfig>();
  readonly onDidChange = this._onDidChange.event;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.configPath = path.join(workspaceRoot, '.ruleforge.yaml');
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * 加载配置文件
   * 如果文件不存在，使用默认配置
   */
  async load(): Promise<RuleForgeProjectConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const yaml = await import('js-yaml');
      const fileConfig = yaml.default.load(content) as Partial<RuleForgeProjectConfig>;

      // 深度合并：文件配置覆盖默认配置
      this.config = this.deepMerge(DEFAULT_CONFIG, fileConfig);
      console.log(`[RuleForge] 配置已加载: ${this.configPath}`);
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        console.log('[RuleForge] 配置文件不存在，使用默认配置');
        await this.saveDefaultConfig();
      } else {
        console.warn(`[RuleForge] 配置加载失败，使用默认配置: ${error}`);
      }
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  /**
   * 获取当前配置
   */
  get(): RuleForgeProjectConfig {
    return this.config;
  }

  /**
   * 获取指定配置节
   */
  getSection<K extends keyof RuleForgeProjectConfig>(
    section: K
  ): RuleForgeProjectConfig[K] {
    return this.config[section];
  }

  /**
   * 获取规则存储的绝对路径
   */
  getRulesDir(): string {
    return path.join(this.workspaceRoot, this.config.storage.localRulesDir);
  }

  /**
   * 获取日志目录的绝对路径
   */
  getLogDir(): string {
    return path.join(this.workspaceRoot, this.config.extraction.logPath);
  }

  /**
   * 获取注入目标文件的绝对路径
   */
  getInjectionFilePath(): string {
    return path.join(this.workspaceRoot, this.config.injection.targetFile);
  }

  /**
   * 更新配置并保存到文件
   */
  async update(updates: Partial<RuleForgeProjectConfig>): Promise<void> {
    this.config = this.deepMerge(this.config, updates);
    await this.save();
    this._onDidChange.fire(this.config);
  }

  /**
   * 保存当前配置到文件
   */
  private async save(): Promise<void> {
    try {
      const yaml = await import('js-yaml');
      const content = yaml.default.dump(this.config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      const header = `# RuleForge 项目配置
# 文档: https://ruleforge.dev/docs/configuration

`;

      await fs.writeFile(this.configPath, header + content, 'utf-8');
      console.log(`[RuleForge] 配置已保存: ${this.configPath}`);
    } catch (error) {
      console.error(`[RuleForge] 配置保存失败: ${error}`);
    }
  }

  /**
   * 写入默认配置文件
   */
  private async saveDefaultConfig(): Promise<void> {
    try {
      const yaml = await import('js-yaml');
      const content = yaml.default.dump(DEFAULT_CONFIG, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      const header = `# RuleForge 项目配置（自动生成）
# 修改此文件来自定义 RuleForge 行为
# 文档: https://ruleforge.dev/docs/configuration

`;

      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, header + content, 'utf-8');
      console.log(`[RuleForge] 默认配置文件已创建: ${this.configPath}`);
    } catch (error) {
      console.warn(`[RuleForge] 默认配置文件创建失败: ${error}`);
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };
    for (const key of Object.keys(source) as Array<keyof T>) {
      const sourceVal = source[key];
      const targetVal = target[key];
      if (
        sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
        targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)
      ) {
        (result as Record<string, unknown>)[key as string] = this.deepMerge(
          targetVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>
        );
      } else if (sourceVal !== undefined) {
        result[key] = sourceVal as T[keyof T];
      }
    }
    return result;
  }
}

/**
 * 判断是否为 Node.js 系统错误
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

/**
 * 便捷函数：获取工作区的 RuleForge 配置
 */
export async function getRuleForgeConfig(
  workspaceRoot: string
): Promise<RuleForgeConfig> {
  const config = new RuleForgeConfig(workspaceRoot);
  await config.load();
  return config;
}

export default RuleForgeConfig;
