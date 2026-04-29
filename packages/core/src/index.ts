/**
 * RuleForge Core Engine 主入口文件
 * 提供统一的 API 接口供外部调用
 */

import { RuleExtractor, ExtractOptions } from './extractor/rule-extractor';
import { RuleValidator, ValidationOptions } from './validator/rule-validator';
import { YamlFormatter, FormatOptions } from './formatter/yaml-formatter';
import { ConfigManager, RuleForgeConfig, ConfigOptions } from './config/config-manager';
import { RuleStore, ImportResult, ValidationReport, StoreStatistics, StoreOptions } from './storage/rule-store';
import { ExtractionResult, ValidationResult } from './types/rule';
import { RuleYAML } from './types/rule-schema';

export interface RuleForgeOptions {
  minConfidence?: number;
  strictValidation?: boolean;
  includeComments?: boolean;
  projectName?: string;
  configPath?: string;
  rulesDir?: string;
  autoSave?: boolean;
}

export interface ProcessResult {
  extraction: ExtractionResult;
  validation: ValidationResult[];
  formatted: Array<{
    rule: RuleYAML;
    yaml: string;
    fileName: string;
  }>;
  summary: {
    totalRules: number;
    validRules: number;
    extractionTime: number;
    validationTime: number;
    formattingTime: number;
  };
}

/**
 * RuleForge 核心引擎类
 * 整合提取、验证、格式化、配置管理和规则存储功能
 */
export class RuleForgeEngine {
  private extractor: RuleExtractor;
  private validator: RuleValidator;
  private formatter: YamlFormatter;
  private config: ConfigManager;
  private store: RuleStore;
  private options: Required<RuleForgeOptions>;

  constructor(options: RuleForgeOptions = {}) {
    this.extractor = new RuleExtractor();
    this.validator = RuleValidator.createStandardValidator();
    this.formatter = new YamlFormatter();
    
    // 初始化配置管理器
    this.config = new ConfigManager({
      configPath: options.configPath
    });
    
    // 初始化规则库
    this.store = new RuleStore({
      rulesDir: options.rulesDir
    });
    
    this.options = {
      minConfidence: options.minConfidence ?? 0.7,
      strictValidation: options.strictValidation ?? true,
      includeComments: options.includeComments ?? true,
      projectName: options.projectName ?? '{project_name}',
      configPath: options.configPath ?? '.ruleforge.yaml',
      rulesDir: options.rulesDir ?? '.ruleforge/rules',
      autoSave: options.autoSave ?? true
    };
  }

  /**
   * 初始化引擎（加载配置和规则库）
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 初始化 RuleForge 引擎...');
      
      // 1. 加载配置
      await this.config.load();
      
      // 2. 初始化规则库
      await this.store.initialize();
      
      // 3. 更新引擎选项（从配置中获取）
      this.updateOptionsFromConfig();
      
      console.log('✅ RuleForge 引擎初始化完成');

    } catch (error) {
      console.error('❌ RuleForge 引擎初始化失败:', error);
      throw new Error(`引擎初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 完整的规则处理流程
   */
  async processSession(sessionOptions: ExtractOptions): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 开始 RuleForge 规则处理流程...');
      
      // 确保引擎已初始化
      if (!this.isInitialized()) {
        await this.initialize();
      }
      
      // 1. 规则提取
      const extractStart = Date.now();
      const extractionResult = await this.extractor.extract({
        ...sessionOptions,
        minConfidence: this.options.minConfidence
      });
      const extractionTime = Date.now() - extractStart;

      if (extractionResult.rules.length === 0) {
        console.log('⚠️ 未发现可提取的规则');
        return this.createEmptyResult(extractionResult);
      }

      console.log(`✅ 提取完成，发现 ${extractionResult.rules.length} 个候选规则`);

      // 2. 规则验证
      const validationStart = Date.now();
      const validationOptions: ValidationOptions = {
        strict: this.options.strictValidation
      };
      const validationResults = this.validator.validateBatch(
        extractionResult.rules, 
        validationOptions
      );
      const validationTime = Date.now() - validationStart;

      // 3. 规则格式化
      const formattingStart = Date.now();
      const formatOptions: FormatOptions = {
        includeComments: this.options.includeComments,
        projectName: this.options.projectName
      };
      
      const formattedResults = this.formatter.formatBatch(extractionResult.rules, formatOptions);
      const formattingTime = Date.now() - formattingStart;

      // 4. 自动保存规则到本地库
      if (this.options.autoSave) {
        await this.saveRulesToStore(extractionResult.rules);
      }

      // 5. 生成处理结果
      const validRules = validationResults.filter(result => result.valid).length;
      const totalTime = Date.now() - startTime;

      const result: ProcessResult = {
        extraction: extractionResult,
        validation: validationResults,
        formatted: extractionResult.rules.map((rule, index) => ({
          rule,
          yaml: formattedResults[index].yaml,
          fileName: formattedResults[index].fileName
        })),
        summary: {
          totalRules: extractionResult.rules.length,
          validRules,
          extractionTime,
          validationTime,
          formattingTime
        }
      };

      console.log(`🎉 RuleForge 处理完成！`);
      console.log(`📊 统计信息:`);
      console.log(`   - 总规则数: ${result.summary.totalRules}`);
      console.log(`   - 有效规则: ${result.summary.validRules}`);
      console.log(`   - 提取时间: ${result.summary.extractionTime}ms`);
      console.log(`   - 验证时间: ${result.summary.validationTime}ms`);
      console.log(`   - 格式化时间: ${result.summary.formattingTime}ms`);
      console.log(`   - 总耗时: ${totalTime}ms`);

      return result;

    } catch (error) {
      console.error('❌ RuleForge 处理失败:', error);
      throw new Error(`RuleForge 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 仅提取规则（不验证和格式化）
   */
  async extractOnly(sessionOptions: ExtractOptions): Promise<ExtractionResult> {
    return await this.extractor.extract({
      ...sessionOptions,
      minConfidence: this.options.minConfidence
    });
  }

  /**
   * 仅验证规则
   */
  validateOnly(rules: RuleYAML[], options: ValidationOptions = {}): ValidationResult[] {
    return this.validator.validateBatch(rules, {
      ...options,
      strict: this.options.strictValidation
    });
  }

  /**
   * 仅格式化规则
   */
  formatOnly(rules: RuleYAML[], options: FormatOptions = {}): Array<{ yaml: string; fileName: string }> {
    const formatOptions: FormatOptions = {
      ...options,
      includeComments: this.options.includeComments,
      projectName: this.options.projectName
    };
    
    return this.formatter.formatBatch(rules, formatOptions);
  }

  /**
   * 获取所有规则
   */
  async getRules(): Promise<RuleYAML[]> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    return await this.store.list();
  }

  /**
   * 获取单个规则
   */
  async getRule(id: string): Promise<RuleYAML | null> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    return await this.store.load(id);
  }

  /**
   * 删除规则
   */
  async deleteRule(id: string): Promise<void> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    await this.store.delete(id);
  }

  /**
   * 保存规则到本地库
   */
  async saveRule(rule: RuleYAML): Promise<void> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    await this.store.save(rule);
  }

  /**
   * 批量导入规则
   */
  async importRules(rules: RuleYAML[]): Promise<ImportResult> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    return await this.store.importRules(rules);
  }

  /**
   * 验证所有本地规则
   */
  async validateAllRules(): Promise<ValidationReport> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    return await this.store.validateAll();
  }

  /**
   * 获取规则统计信息
   */
  async getRuleStatistics(): Promise<StoreStatistics> {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    return await this.store.getStatistics();
  }

  /**
   * 获取配置信息
   */
  getConfig(): RuleForgeConfig {
    return this.config.export();
  }

  /**
   * 保存当前配置
   */
  async saveConfig(): Promise<void> {
    await this.config.save();
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.config.reload();
    this.updateOptionsFromConfig();
  }

  /**
   * 生成处理报告
   */
  generateReport(processResult: ProcessResult): string {
    let report = `# RuleForge 处理报告\n\n`;
    
    report += `## 处理概览\n`;
    report += `- 会话ID: ${processResult.extraction.rules[0]?.meta.authors[0]?.replace('extracted-from-', '') || '未知'}\n`;
    report += `- 处理时间: ${new Date().toISOString()}\n`;
    report += `- 总规则数: ${processResult.summary.totalRules}\n`;
    report += `- 有效规则: ${processResult.summary.validRules}\n`;
    report += `- 成功率: ${((processResult.summary.validRules / processResult.summary.totalRules) * 100).toFixed(1)}%\n\n`;

    report += `## 时间统计\n`;
    report += `- 规则提取: ${processResult.summary.extractionTime}ms\n`;
    report += `- 规则验证: ${processResult.summary.validationTime}ms\n`;
    report += `- 规则格式化: ${processResult.summary.formattingTime}ms\n`;
    report += `- 总耗时: ${processResult.summary.extractionTime + processResult.summary.validationTime + processResult.summary.formattingTime}ms\n\n`;

    // 添加验证报告
    const validationReport = this.validator.generateReport(processResult.validation);
    report += validationReport;

    // 添加警告信息
    const allWarnings = [
      ...processResult.extraction.warnings,
      ...processResult.validation.flatMap(result => result.warnings),
      ...processResult.formatted.flatMap(item => item.yaml.includes('警告') ? ['格式化警告'] : [])
    ];

    if (allWarnings.length > 0) {
      report += `## 警告信息\n`;
      allWarnings.forEach(warning => {
        report += `- ⚠️ ${warning}\n`;
      });
      report += `\n`;
    }

    return report;
  }

  /**
   * 导出规则文件
   */
  async exportRules(processResult: ProcessResult, outputDir: string): Promise<string[]> {
    const exportedFiles: string[] = [];
    
    try {
      // 这里应该是文件系统操作，但为了简化，返回文件路径列表
      processResult.formatted.forEach(item => {
        const filePath = `${outputDir}/${item.fileName}`;
        exportedFiles.push(filePath);
        console.log(`📄 导出规则文件: ${filePath}`);
      });

      // 导出报告文件
      const reportContent = this.generateReport(processResult);
      const reportPath = `${outputDir}/ruleforge-report.md`;
      exportedFiles.push(reportPath);
      console.log(`📊 导出报告文件: ${reportPath}`);

      return exportedFiles;

    } catch (error) {
      console.error('❌ 规则导出失败:', error);
      throw new Error(`规则导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新引擎配置
   */
  updateOptions(newOptions: Partial<RuleForgeOptions>): void {
    this.options = { ...this.options, ...newOptions };
    console.log('⚙️ 引擎配置已更新');
  }

  /**
   * 获取当前配置
   */
  getOptions(): Required<RuleForgeOptions> {
    return { ...this.options };
  }

  /**
   * 检查引擎是否已初始化
   */
  private isInitialized(): boolean {
    return this.config.getSources().length > 0;
  }

  /**
   * 从配置更新引擎选项
   */
  private updateOptionsFromConfig(): void {
    const config = this.config.export();
    
    this.options = {
      ...this.options,
      minConfidence: config.extraction.minConfidence,
      projectName: config.privacy.projectName,
      rulesDir: config.storage.localRulesDir
    };
  }

  /**
   * 保存规则到本地库
   */
  private async saveRulesToStore(rules: RuleYAML[]): Promise<void> {
    try {
      console.log(`💾 自动保存 ${rules.length} 个规则到本地库...`);
      
      for (const rule of rules) {
        await this.store.save(rule);
      }
      
      console.log('✅ 规则保存完成');
    } catch (error) {
      console.warn('⚠️ 自动保存规则失败:', error);
    }
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(extractionResult: ExtractionResult): ProcessResult {
    return {
      extraction: extractionResult,
      validation: [],
      formatted: [],
      summary: {
        totalRules: 0,
        validRules: 0,
        extractionTime: extractionResult.statistics.extractionTime,
        validationTime: 0,
        formattingTime: 0
      }
    };
  }

  /**
   * 获取规则存储实例（用于匹配器等高级功能）
   */
  getStore(): RuleStore {
    return this.store;
  }
}

// 导出各个核心类
export { RuleExtractor } from './extractor/rule-extractor';
export { RuleValidator } from './validator/rule-validator';
export { YamlFormatter } from './formatter/yaml-formatter';
export { ConfigManager } from './config/config-manager';
export { RuleStore } from './storage/rule-store';
export { RuleMatcher } from './matcher/rule-matcher';
export type { MatchContext, MatchResult } from './matcher/rule-matcher';
export { getTemplates, getTemplate, getTemplatesByCategory, generateFromTemplate, listTemplates } from './templates/index';
export type { RuleTemplate, TemplateParams } from './templates/index';
export type { RuleYAML, RuleTrigger, RuleCondition } from './types/rule-schema';
export type { ValidationOptions } from './validator/rule-validator';
export type { FormatOptions, FormatResult } from './formatter/yaml-formatter';

// 导出类型定义
export type {
  ExtractionResult
} from './types/rule';

export type {
  ExtractOptions
} from './extractor/rule-extractor';

export type {
  RuleForgeConfig
} from './config/config-manager';

export type {
  ImportResult,
  ValidationReport,
  StoreStatistics
} from './storage/rule-store';

// 默认导出引擎实例
export const createRuleForgeEngine = (options?: RuleForgeOptions) => new RuleForgeEngine(options);

// 快捷函数
export const extractRules = async (sessionOptions: ExtractOptions) => {
  const engine = new RuleForgeEngine();
  return await engine.extractOnly(sessionOptions);
};

export const validateRules = (rules: RuleYAML[], options?: ValidationOptions) => {
  const validator = RuleValidator.createStandardValidator();
  return validator.validateBatch(rules, options);
};

export const formatRules = (rules: RuleYAML[], options?: FormatOptions) => {
  const formatter = new YamlFormatter();
  return formatter.formatBatch(rules, options);
};

// 新的快捷函数
export const loadConfig = async (options?: ConfigOptions) => {
  const configManager = new ConfigManager(options);
  return await configManager.load();
};

export const createRuleStore = async (options?: StoreOptions) => {
  const store = new RuleStore(options);
  await store.initialize();
  return store;
};