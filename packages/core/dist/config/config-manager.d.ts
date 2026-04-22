/**
 * RuleForge 配置管理器
 * 支持多层级配置加载和环境变量支持
 */
import { z } from 'zod';
import { ValidationResult } from '../types/rule';
/**
 * RuleForge 配置结构定义
 */
export declare const RuleForgeConfigSchema: z.ZodObject<{
    extraction: z.ZodDefault<z.ZodObject<{
        minConfidence: z.ZodDefault<z.ZodNumber>;
        applicableScenes: z.ZodDefault<z.ZodNumber>;
        logPath: z.ZodDefault<z.ZodString>;
        languageFocus: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        maxFileSize: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        minConfidence: number;
        languageFocus: string[];
        applicableScenes: number;
        logPath: string;
        maxFileSize: number;
    }, {
        minConfidence?: number | undefined;
        languageFocus?: string[] | undefined;
        applicableScenes?: number | undefined;
        logPath?: string | undefined;
        maxFileSize?: number | undefined;
    }>>;
    privacy: z.ZodDefault<z.ZodObject<{
        autoRedact: z.ZodDefault<z.ZodBoolean>;
        allowedPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        projectName: z.ZodDefault<z.ZodString>;
        redactApiKeys: z.ZodDefault<z.ZodBoolean>;
        redactPaths: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        projectName: string;
        autoRedact: boolean;
        allowedPatterns: string[];
        redactApiKeys: boolean;
        redactPaths: boolean;
    }, {
        projectName?: string | undefined;
        autoRedact?: boolean | undefined;
        allowedPatterns?: string[] | undefined;
        redactApiKeys?: boolean | undefined;
        redactPaths?: boolean | undefined;
    }>>;
    storage: z.ZodDefault<z.ZodObject<{
        localRulesDir: z.ZodDefault<z.ZodString>;
        cacheEnabled: z.ZodDefault<z.ZodBoolean>;
        cacheTTL: z.ZodDefault<z.ZodNumber>;
        maxVersions: z.ZodDefault<z.ZodNumber>;
        backupEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        localRulesDir: string;
        cacheEnabled: boolean;
        cacheTTL: number;
        maxVersions: number;
        backupEnabled: boolean;
    }, {
        localRulesDir?: string | undefined;
        cacheEnabled?: boolean | undefined;
        cacheTTL?: number | undefined;
        maxVersions?: number | undefined;
        backupEnabled?: boolean | undefined;
    }>>;
    output: z.ZodDefault<z.ZodObject<{
        format: z.ZodDefault<z.ZodEnum<["yaml", "json"]>>;
        prettyPrint: z.ZodDefault<z.ZodBoolean>;
        includeComments: z.ZodDefault<z.ZodBoolean>;
        validateOutput: z.ZodDefault<z.ZodBoolean>;
        generateReport: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        format: "yaml" | "json";
        includeComments: boolean;
        validateOutput: boolean;
        prettyPrint: boolean;
        generateReport: boolean;
    }, {
        format?: "yaml" | "json" | undefined;
        includeComments?: boolean | undefined;
        validateOutput?: boolean | undefined;
        prettyPrint?: boolean | undefined;
        generateReport?: boolean | undefined;
    }>>;
    github: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        autoCreatePR: z.ZodDefault<z.ZodBoolean>;
        baseBranch: z.ZodDefault<z.ZodString>;
        labels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        autoCreatePR: boolean;
        baseBranch: string;
        labels: string[];
    }, {
        enabled?: boolean | undefined;
        autoCreatePR?: boolean | undefined;
        baseBranch?: string | undefined;
        labels?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
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
}, {
    extraction?: {
        minConfidence?: number | undefined;
        languageFocus?: string[] | undefined;
        applicableScenes?: number | undefined;
        logPath?: string | undefined;
        maxFileSize?: number | undefined;
    } | undefined;
    privacy?: {
        projectName?: string | undefined;
        autoRedact?: boolean | undefined;
        allowedPatterns?: string[] | undefined;
        redactApiKeys?: boolean | undefined;
        redactPaths?: boolean | undefined;
    } | undefined;
    storage?: {
        localRulesDir?: string | undefined;
        cacheEnabled?: boolean | undefined;
        cacheTTL?: number | undefined;
        maxVersions?: number | undefined;
        backupEnabled?: boolean | undefined;
    } | undefined;
    output?: {
        format?: "yaml" | "json" | undefined;
        includeComments?: boolean | undefined;
        validateOutput?: boolean | undefined;
        prettyPrint?: boolean | undefined;
        generateReport?: boolean | undefined;
    } | undefined;
    github?: {
        enabled?: boolean | undefined;
        autoCreatePR?: boolean | undefined;
        baseBranch?: string | undefined;
        labels?: string[] | undefined;
    } | undefined;
}>;
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
export declare class ConfigManager {
    private config;
    private sources;
    private options;
    constructor(options?: ConfigOptions);
    /**
     * 加载配置（多层级合并）
     */
    load(): Promise<RuleForgeConfig>;
    /**
     * 获取配置值
     */
    get<T = any>(key: string): T;
    /**
     * 设置配置值（仅内存中）
     */
    set(key: string, value: any): void;
    /**
     * 验证配置
     */
    validate(): ValidationResult;
    /**
     * 保存配置到项目级文件
     */
    save(): Promise<void>;
    /**
     * 获取配置源信息
     */
    getSources(): ConfigSource[];
    /**
     * 重新加载配置
     */
    reload(): Promise<RuleForgeConfig>;
    /**
     * 加载默认配置
     */
    private loadDefaultConfig;
    /**
     * 加载用户级配置
     */
    private loadUserConfig;
    /**
     * 加载项目级配置
     */
    private loadProjectConfig;
    /**
     * 加载环境变量配置
     */
    private loadEnvConfig;
    /**
     * 合并配置源
     */
    private mergeConfigs;
    /**
     * 深度合并对象
     */
    private deepMerge;
    /**
     * 添加配置源
     */
    private addSource;
    /**
     * 检查文件是否存在
     */
    private fileExists;
    /**
     * 创建默认配置文件
     */
    private createDefaultConfigFile;
    /**
     * 输出配置摘要
     */
    private logConfigSummary;
    /**
     * 导出当前配置（用于调试）
     */
    export(): RuleForgeConfig;
    /**
     * 重置为默认配置
     */
    reset(): void;
}
export declare const loadConfig: (options?: ConfigOptions) => Promise<RuleForgeConfig>;
export declare const createDefaultConfig: (configPath?: string) => Promise<void>;
export default ConfigManager;
//# sourceMappingURL=config-manager.d.ts.map