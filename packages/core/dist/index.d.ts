/**
 * RuleForge Core Engine 主入口文件
 * 提供统一的 API 接口供外部调用
 */
import { ExtractOptions } from './extractor/rule-extractor';
import { ValidationOptions } from './validator/rule-validator';
import { FormatOptions } from './formatter/yaml-formatter';
import { RuleForgeConfig, ConfigOptions } from './config/config-manager';
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
export declare class RuleForgeEngine {
    private extractor;
    private validator;
    private formatter;
    private config;
    private store;
    private options;
    constructor(options?: RuleForgeOptions);
    /**
     * 初始化引擎（加载配置和规则库）
     */
    initialize(): Promise<void>;
    /**
     * 完整的规则处理流程
     */
    processSession(sessionOptions: ExtractOptions): Promise<ProcessResult>;
    /**
     * 仅提取规则（不验证和格式化）
     */
    extractOnly(sessionOptions: ExtractOptions): Promise<ExtractionResult>;
    /**
     * 仅验证规则
     */
    validateOnly(rules: RuleYAML[], options?: ValidationOptions): ValidationResult[];
    /**
     * 仅格式化规则
     */
    formatOnly(rules: RuleYAML[], options?: FormatOptions): Array<{
        yaml: string;
        fileName: string;
    }>;
    /**
     * 获取所有规则
     */
    getRules(): Promise<RuleYAML[]>;
    /**
     * 获取单个规则
     */
    getRule(id: string): Promise<RuleYAML | null>;
    /**
     * 删除规则
     */
    deleteRule(id: string): Promise<void>;
    /**
     * 保存规则到本地库
     */
    saveRule(rule: RuleYAML): Promise<void>;
    /**
     * 批量导入规则
     */
    importRules(rules: RuleYAML[]): Promise<ImportResult>;
    /**
     * 验证所有本地规则
     */
    validateAllRules(): Promise<ValidationReport>;
    /**
     * 获取规则统计信息
     */
    getRuleStatistics(): Promise<StoreStatistics>;
    /**
     * 获取配置信息
     */
    getConfig(): RuleForgeConfig;
    /**
     * 保存当前配置
     */
    saveConfig(): Promise<void>;
    /**
     * 重新加载配置
     */
    reloadConfig(): Promise<void>;
    /**
     * 生成处理报告
     */
    generateReport(processResult: ProcessResult): string;
    /**
     * 导出规则文件
     */
    exportRules(processResult: ProcessResult, outputDir: string): Promise<string[]>;
    /**
     * 更新引擎配置
     */
    updateOptions(newOptions: Partial<RuleForgeOptions>): void;
    /**
     * 获取当前配置
     */
    getOptions(): Required<RuleForgeOptions>;
    /**
     * 检查引擎是否已初始化
     */
    private isInitialized;
    /**
     * 从配置更新引擎选项
     */
    private updateOptionsFromConfig;
    /**
     * 保存规则到本地库
     */
    private saveRulesToStore;
    /**
     * 创建空结果
     */
    private createEmptyResult;
}
export { RuleExtractor } from './extractor/rule-extractor';
export { RuleValidator } from './validator/rule-validator';
export { YamlFormatter } from './formatter/yaml-formatter';
export { ConfigManager } from './config/config-manager';
export { RuleStore } from './storage/rule-store';
export type { ExtractionResult, ValidationResult } from './types/rule';
export type { RuleYAML } from './types/rule-schema';
export type { ExtractOptions } from './extractor/rule-extractor';
export type { ValidationOptions } from './validator/rule-validator';
export type { FormatOptions } from './formatter/yaml-formatter';
export type { RuleForgeConfig } from './config/config-manager';
export type { ImportResult, ValidationReport, StoreStatistics } from './storage/rule-store';
export declare const createRuleForgeEngine: (options?: RuleForgeOptions) => RuleForgeEngine;
export declare const extractRules: (sessionOptions: ExtractOptions) => Promise<ExtractionResult>;
export declare const validateRules: (rules: RuleYAML[], options?: ValidationOptions) => ValidationResult[];
export declare const formatRules: (rules: RuleYAML[], options?: FormatOptions) => import("./formatter/yaml-formatter").FormatResult[];
export declare const loadConfig: (options?: ConfigOptions) => Promise<{
    extraction: {
        minConfidence: number;
        languageFocus: string[];
        applicableScenes: number;
        logPath: string;
        maxFileSize: number;
    };
    privacy: {
        projectName: string;
        autoRedact: boolean;
        allowedPatterns: string[];
        redactApiKeys: boolean;
        redactPaths: boolean;
    };
    storage: {
        localRulesDir: string;
        cacheEnabled: boolean;
        cacheTTL: number;
        maxVersions: number;
        backupEnabled: boolean;
    };
    output: {
        format: "yaml" | "json";
        includeComments: boolean;
        validateOutput: boolean;
        prettyPrint: boolean;
        generateReport: boolean;
    };
    github?: {
        enabled: boolean;
        autoCreatePR: boolean;
        baseBranch: string;
        labels: string[];
    } | undefined;
}>;
export declare const createRuleStore: (options?: StoreOptions) => Promise<RuleStore>;
//# sourceMappingURL=index.d.ts.map