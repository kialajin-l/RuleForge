/**
 * RuleForge 配置管理器
 * 支持多层级配置加载和环境变量支持
 */

import { z } from 'zod';
import { ValidationResult } from '../types/rule';

/**
 * RuleForge 配置结构定义
 */
export const RuleForgeConfigSchema = z.object({
  extraction: z.object({
    minConfidence: z.number().min(0).max(1).default(0.7),
    applicableScenes: z.number().int().min(1).default(2),
    logPath: z.string().default('.ruleforge/logs'),
    languageFocus: z.array(z.string()).default(['typescript', 'javascript', 'vue', 'python']),
    maxFileSize: z.number().int().min(1024).default(10 * 1024 * 1024) // 10MB
  }),
  
  privacy: z.object({
    autoRedact: z.boolean().default(true),
    allowedPatterns: z.array(z.string()).default([]),
    projectName: z.string().default('{project_name}'),
    redactApiKeys: z.boolean().default(true),
    redactPaths: z.boolean().default(true)
  }),
  
  storage: z.object({
    localRulesDir: z.string().default('.ruleforge/rules'),
    cacheEnabled: z.boolean().default(true),
    cacheTTL: z.number().int().min(60).default(2 * 60 * 60), // 2小时
    maxVersions: z.number().int().min(1).default(10),
    backupEnabled: z.boolean().default(true)
  }),
  
  output: z.object({
    format: z.enum(['yaml', 'json']).default('yaml'),
    prettyPrint: z.boolean().default(true),
    includeComments: z.boolean().default(true),
    validateOutput: z.boolean().default(true),
    generateReport: z.boolean().default(true)
  }),
  
  github: z.object({
    enabled: z.boolean().default(false),
    autoCreatePR: z.boolean().default(false),
    baseBranch: z.string().default('main'),
    labels: z.array(z.string()).default(['ruleforge', 'auto-generated'])
  }).optional()
});

export type RuleForgeConfig = z.infer<typeof RuleForgeConfigSchema>;

/**
 * 配置加载选项
 */
export interface ConfigOptions {
  configPath?: string;
  userConfigPath?: string;
  envPrefix?: string;
  validate?: boolean;
  createDefault?: boolean;
}

/**
 * 配置源类型
 */
export interface ConfigSource {
  name: string;
  path?: string;
  config: Partial<RuleForgeConfig>;
  priority: number;
}

export class ConfigManager {
  private config: RuleForgeConfig;
  private sources: ConfigSource[] = [];
  private options: Required<ConfigOptions>;

  constructor(options: ConfigOptions = {}) {
    this.options = {
      configPath: options.configPath || '.ruleforge.yaml',
      userConfigPath: options.userConfigPath || '~/.ruleforge/config.yaml',
      envPrefix: options.envPrefix || 'RULEFORGE_',
      validate: options.validate ?? true,
      createDefault: options.createDefault ?? false
    };

    // 初始化默认配置
    this.config = RuleForgeConfigSchema.parse({});
  }

  /**
   * 加载配置（多层级合并）
   */
  async load(): Promise<RuleForgeConfig> {
    console.log('🔧 加载 RuleForge 配置...');
    
    try {
      // 1. 默认配置（最低优先级）
      const defaultConfig = this.loadDefaultConfig();
      this.addSource('default', defaultConfig, 0);

      // 2. 用户级配置
      const userConfig = await this.loadUserConfig();
      if (userConfig) {
        this.addSource('user', userConfig, 1);
      }

      // 3. 项目级配置
      const projectConfig = await this.loadProjectConfig();
      if (projectConfig) {
        this.addSource('project', projectConfig, 2);
      }

      // 4. 环境变量配置（最高优先级）
      const envConfig = this.loadEnvConfig();
      this.addSource('environment', envConfig, 3);

      // 5. 合并所有配置源
      this.config = this.mergeConfigs();

      // 6. 验证配置
      if (this.options.validate) {
        const validation = this.validate();
        if (!validation.valid) {
          console.warn('⚠️ 配置验证警告:', validation.warnings.join(', '));
        }
      }

      console.log('✅ 配置加载完成');
      this.logConfigSummary();

      return this.config;

    } catch (error) {
      console.error('❌ 配置加载失败:', error);
      throw new Error(`配置加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取配置值
   */
  get<T = any>(key: string): T {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        throw new Error(`配置键不存在: ${key}`);
      }
    }

    return value as T;
  }

  /**
   * 设置配置值（仅内存中）
   */
  set(key: string, value: any): void {
    const keys = key.split('.');
    let config: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in config)) {
        config[k] = {};
      }
      config = config[k];
    }

    config[keys[keys.length - 1]] = value;
  }

  /**
   * 验证配置
   */
  validate(): ValidationResult {
    try {
      const validated = RuleForgeConfigSchema.parse(this.config);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          warnings: []
        };
      }
      return {
        valid: false,
        errors: ['配置验证失败'],
        warnings: []
      };
    }
  }

  /**
   * 保存配置到项目级文件
   */
  async save(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // 确保目录存在
      const dir = path.dirname(this.options.configPath);
      await fs.mkdir(dir, { recursive: true });

      // 序列化配置
      const yaml = await import('yaml');
      const yamlContent = yaml.stringify(this.config, {
        indent: 2,
        defaultKeyType: 'PLAIN',
        defaultStringType: 'PLAIN'
      });

      // 添加文件头注释
      const header = `# RuleForge 配置文件
# 生成时间: ${new Date().toISOString()}
# 文档: https://ruleforge.dev/docs/configuration

`;

      await fs.writeFile(this.options.configPath, header + yamlContent);
      console.log(`✅ 配置已保存: ${this.options.configPath}`);

    } catch (error) {
      console.error('❌ 配置保存失败:', error);
      throw new Error(`配置保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取配置源信息
   */
  getSources(): ConfigSource[] {
    return [...this.sources];
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<RuleForgeConfig> {
    this.sources = [];
    return this.load();
  }

  /**
   * 加载默认配置
   */
  private loadDefaultConfig(): Partial<RuleForgeConfig> {
    return RuleForgeConfigSchema.parse({});
  }

  /**
   * 加载用户级配置
   */
  private async loadUserConfig(): Promise<Partial<RuleForgeConfig> | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');
      
      // 解析用户主目录路径
      const userConfigPath = this.options.userConfigPath.replace('~', os.homedir());
      
      if (await this.fileExists(userConfigPath)) {
        const content = await fs.readFile(userConfigPath, 'utf-8');
        const yaml = await import('yaml');
        return yaml.parse(content) as Partial<RuleForgeConfig>;
      }
    } catch (error) {
      console.warn('⚠️ 用户级配置加载失败:', error);
    }
    
    return null;
  }

  /**
   * 加载项目级配置
   */
  private async loadProjectConfig(): Promise<Partial<RuleForgeConfig> | null> {
    try {
      const fs = await import('fs/promises');
      
      if (await this.fileExists(this.options.configPath)) {
        const content = await fs.readFile(this.options.configPath, 'utf-8');
        const yaml = await import('yaml');
        return yaml.parse(content) as Partial<RuleForgeConfig>;
      } else if (this.options.createDefault) {
        // 创建默认配置文件
        await this.createDefaultConfigFile();
      }
    } catch (error) {
      console.warn('⚠️ 项目级配置加载失败:', error);
    }
    
    return null;
  }

  /**
   * 加载环境变量配置
   */
  private loadEnvConfig(): Partial<RuleForgeConfig> {
    const envConfig: Partial<RuleForgeConfig> = {};
    const prefix = this.options.envPrefix;

    // 使用类型断言来避免 TypeScript 的严格检查
    const extractionConfig: any = {};
    const privacyConfig: any = {};
    const storageConfig: any = {};
    const outputConfig: any = {};

    // 提取规则配置
    if (process.env[`${prefix}MIN_CONFIDENCE`]) {
      extractionConfig.minConfidence = parseFloat(process.env[`${prefix}MIN_CONFIDENCE`]!);
    }

    if (process.env[`${prefix}LOG_PATH`]) {
      extractionConfig.logPath = process.env[`${prefix}LOG_PATH`]!;
    }

    if (process.env[`${prefix}AUTO_REDACT`]) {
      privacyConfig.autoRedact = process.env[`${prefix}AUTO_REDACT`]!.toLowerCase() === 'true';
    }

    if (process.env[`${prefix}LOCAL_RULES_DIR`]) {
      storageConfig.localRulesDir = process.env[`${prefix}LOCAL_RULES_DIR`]!;
    }

    if (process.env[`${prefix}OUTPUT_FORMAT`]) {
      outputConfig.format = process.env[`${prefix}OUTPUT_FORMAT`]! as 'yaml' | 'json';
    }

    // 只设置非空的配置部分
    if (Object.keys(extractionConfig).length > 0) {
      envConfig.extraction = extractionConfig as RuleForgeConfig['extraction'];
    }
    if (Object.keys(privacyConfig).length > 0) {
      envConfig.privacy = privacyConfig as RuleForgeConfig['privacy'];
    }
    if (Object.keys(storageConfig).length > 0) {
      envConfig.storage = storageConfig as RuleForgeConfig['storage'];
    }
    if (Object.keys(outputConfig).length > 0) {
      envConfig.output = outputConfig as RuleForgeConfig['output'];
    }

    return envConfig;
  }

  /**
   * 合并配置源
   */
  private mergeConfigs(): RuleForgeConfig {
    // 按优先级排序
    const sortedSources = [...this.sources].sort((a, b) => b.priority - a.priority);
    
    let merged: any = {};
    
    for (const source of sortedSources) {
      merged = this.deepMerge(merged, source.config);
    }
    
    // 使用 Zod 验证和填充默认值
    return RuleForgeConfigSchema.parse(merged);
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 添加配置源
   */
  private addSource(name: string, config: Partial<RuleForgeConfig>, priority: number): void {
    this.sources.push({
      name,
      config,
      priority
    });
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建默认配置文件
   */
  private async createDefaultConfigFile(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // 确保目录存在
      const dir = path.dirname(this.options.configPath);
      await fs.mkdir(dir, { recursive: true });

      // 创建默认配置内容
      const defaultConfig = RuleForgeConfigSchema.parse({});
      const yaml = await import('yaml');
      const yamlContent = yaml.stringify(defaultConfig, {
        indent: 2,
        defaultKeyType: 'PLAIN',
        defaultStringType: 'PLAIN'
      });

      const header = `# RuleForge 默认配置文件
# 生成时间: ${new Date().toISOString()}
# 文档: https://ruleforge.dev/docs/configuration

`;

      await fs.writeFile(this.options.configPath, header + yamlContent);
      console.log(`📝 创建默认配置文件: ${this.options.configPath}`);

    } catch (error) {
      console.warn('⚠️ 创建默认配置文件失败:', error);
    }
  }

  /**
   * 输出配置摘要
   */
  private logConfigSummary(): void {
    console.log('📊 配置摘要:');
    console.log(`   提取配置: 最小置信度=${this.config.extraction.minConfidence}, 日志路径=${this.config.extraction.logPath}`);
    console.log(`   隐私配置: 自动脱敏=${this.config.privacy.autoRedact}, 项目名称=${this.config.privacy.projectName}`);
    console.log(`   存储配置: 规则目录=${this.config.storage.localRulesDir}, 缓存=${this.config.storage.cacheEnabled}`);
    console.log(`   输出配置: 格式=${this.config.output.format}, 美化=${this.config.output.prettyPrint}`);
    console.log(`   配置源数: ${this.sources.length}`);
  }

  /**
   * 导出当前配置（用于调试）
   */
  export(): RuleForgeConfig {
    return { ...this.config };
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this.config = RuleForgeConfigSchema.parse({});
    this.sources = [];
  }
}

// 导出便捷函数
export const loadConfig = async (options?: ConfigOptions): Promise<RuleForgeConfig> => {
  const manager = new ConfigManager(options);
  return manager.load();
};

export const createDefaultConfig = async (configPath: string = '.ruleforge.yaml'): Promise<void> => {
  const manager = new ConfigManager({ configPath, createDefault: true });
  await manager.load();
};

// 默认导出
export default ConfigManager;