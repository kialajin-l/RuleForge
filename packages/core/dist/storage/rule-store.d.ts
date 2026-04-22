/**
 * RuleForge 本地规则库
 * 管理本地规则文件的增删改查和版本控制
 */
import { RuleYAML } from '../types/rule-schema';
/**
 * 规则索引项
 */
export interface RuleIndexItem {
    id: string;
    name: string;
    version: string;
    filePath: string;
    updatedAt: string;
    confidence: number;
    language?: string;
    framework?: string;
    tags?: string[];
}
/**
 * 规则索引
 */
export interface RuleIndex {
    version: string;
    updatedAt: string;
    rules: RuleIndexItem[];
}
/**
 * 过滤器选项
 */
export interface FilterOptions {
    language?: string;
    framework?: string;
    minConfidence?: number;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
}
/**
 * 版本信息
 */
export interface RuleVersion {
    version: string;
    timestamp: string;
    filePath: string;
    description?: string;
}
/**
 * 冲突检测结果
 */
export interface ConflictResult {
    hasConflict: boolean;
    conflicts: Array<{
        type: 'id' | 'content';
        ruleId: string;
        existingRule: RuleYAML;
        newRule: RuleYAML;
        description: string;
    }>;
    suggestions: string[];
}
/**
 * 存储选项
 */
export interface StoreOptions {
    rulesDir?: string;
    maxVersions?: number;
    backupEnabled?: boolean;
    autoValidate?: boolean;
    createIndex?: boolean;
}
export declare class RuleStore {
    private rulesDir;
    private maxVersions;
    private backupEnabled;
    private autoValidate;
    private createIndex;
    private validator;
    private index;
    constructor(options?: StoreOptions);
    /**
     * 初始化规则库
     */
    initialize(): Promise<void>;
    /**
     * 加载规则
     */
    load(ruleId: string): Promise<RuleYAML | null>;
    /**
     * 保存规则
     */
    save(rule: RuleYAML): Promise<void>;
    /**
     * 删除规则
     */
    delete(ruleId: string): Promise<void>;
    /**
     * 列出规则
     */
    list(filters?: FilterOptions): Promise<RuleYAML[]>;
    /**
     * 检查规则是否存在
     */
    exists(ruleId: string): Promise<boolean>;
    /**
     * 获取规则版本历史
     */
    getVersions(ruleId: string): Promise<RuleVersion[]>;
    /**
     * 回滚到指定版本
     */
    rollback(ruleId: string, version: string): Promise<void>;
    /**
     * 批量导入规则
     */
    importRules(rules: RuleYAML[]): Promise<ImportResult>;
    /**
     * 批量导出规则
     */
    exportRules(filters?: FilterOptions): Promise<RuleYAML[]>;
    /**
     * 验证所有规则
     */
    validateAll(): Promise<ValidationReport>;
    /**
     * 搜索规则
     */
    search(query: string, filters?: FilterOptions): Promise<RuleYAML[]>;
    /**
     * 获取统计信息
     */
    getStatistics(): Promise<StoreStatistics>;
    /**
     * 检测冲突
     */
    private detectConflicts;
    /**
     * 查找相似规则
     */
    private findSimilarRules;
    /**
     * 创建备份
     */
    private createBackup;
    /**
     * 清理旧版本
     */
    private cleanupOldVersions;
    /**
     * 加载或创建索引
     */
    private loadOrCreateIndex;
    /**
     * 更新索引
     */
    private updateIndex;
    /**
     * 保存索引
     */
    private saveIndex;
    /**
     * 过滤索引
     */
    private filterIndex;
    /**
     * 扫描规则目录
     */
    private scanRulesDir;
    /**
     * 检查规则是否匹配过滤器
     */
    private matchesFilters;
    /**
     * 提取标签
     */
    private extractTags;
    /**
     * 检查文件是否存在
     */
    private fileExists;
}
export interface ImportResult {
    total: number;
    success: number;
    failed: number;
    errors: Array<{
        ruleId: string;
        error: string;
    }>;
}
export interface ValidationReport {
    total: number;
    valid: number;
    invalid: number;
    details: Array<{
        ruleId: string;
        errors: string[];
        warnings: string[];
    }>;
}
export interface StoreStatistics {
    totalRules: number;
    languages: string[];
    frameworks: string[];
    averageConfidence: number;
    lastUpdated: string;
}
export declare const createRuleStore: (options?: StoreOptions) => Promise<RuleStore>;
export default RuleStore;
//# sourceMappingURL=rule-store.d.ts.map