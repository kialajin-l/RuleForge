"use strict";
/**
 * RuleForge 本地规则库
 * 管理本地规则文件的增删改查和版本控制
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuleStore = exports.RuleStore = void 0;
const rule_validator_1 = require("../validator/rule-validator");
class RuleStore {
    rulesDir;
    maxVersions;
    backupEnabled;
    autoValidate;
    createIndex;
    validator;
    index = null;
    constructor(options = {}) {
        this.rulesDir = options.rulesDir || '.ruleforge/rules';
        this.maxVersions = options.maxVersions || 10;
        this.backupEnabled = options.backupEnabled ?? true;
        this.autoValidate = options.autoValidate ?? true;
        this.createIndex = options.createIndex ?? true;
        this.validator = new rule_validator_1.RuleValidator();
    }
    /**
     * 初始化规则库
     */
    async initialize() {
        console.log(`📚 初始化规则库: ${this.rulesDir}`);
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            // 创建规则目录
            await fs.mkdir(this.rulesDir, { recursive: true });
            // 创建版本目录
            const versionsDir = path.join(this.rulesDir, 'versions');
            await fs.mkdir(versionsDir, { recursive: true });
            // 加载或创建索引
            if (this.createIndex) {
                await this.loadOrCreateIndex();
            }
            console.log('✅ 规则库初始化完成');
        }
        catch (error) {
            console.error('❌ 规则库初始化失败:', error);
            throw new Error(`规则库初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 加载规则
     */
    async load(ruleId) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const rulePath = path.join(this.rulesDir, `${ruleId}.yaml`);
            if (!await this.fileExists(rulePath)) {
                return null;
            }
            const content = await fs.readFile(rulePath, 'utf-8');
            const yaml = await import('yaml');
            const rule = yaml.parse(content);
            // 自动验证
            if (this.autoValidate) {
                const validation = this.validator.validate(rule);
                if (!validation.valid) {
                    console.warn(`⚠️ 规则 ${ruleId} 验证失败:`, validation.errors.join(', '));
                }
            }
            return rule;
        }
        catch (error) {
            console.error(`❌ 加载规则 ${ruleId} 失败:`, error);
            return null;
        }
    }
    /**
     * 保存规则
     */
    async save(rule) {
        try {
            console.log(`💾 保存规则: ${rule.meta.id}`);
            // 冲突检测
            const conflictResult = await this.detectConflicts(rule);
            if (conflictResult.hasConflict) {
                console.warn('⚠️ 检测到规则冲突:', conflictResult.conflicts.map(c => c.description).join(', '));
            }
            // 自动验证
            if (this.autoValidate) {
                const validation = this.validator.validate(rule);
                if (!validation.valid) {
                    throw new Error(`规则验证失败: ${validation.errors.join(', ')}`);
                }
            }
            const fs = await import('fs/promises');
            const path = await import('path');
            // 创建备份（版本控制）
            if (this.backupEnabled) {
                await this.createBackup(rule);
            }
            // 保存规则文件
            const rulePath = path.join(this.rulesDir, `${rule.meta.id}.yaml`);
            const yaml = await import('yaml');
            const yamlContent = yaml.stringify(rule, {
                indent: 2,
                defaultKeyType: 'PLAIN',
                defaultStringType: 'PLAIN'
            });
            const header = `# RuleForge Rule - ${rule.meta.name}
# ID: ${rule.meta.id}
# Version: ${rule.meta.version}
# Updated: ${new Date().toISOString()}

`;
            await fs.writeFile(rulePath, header + yamlContent);
            // 更新索引
            if (this.createIndex) {
                await this.updateIndex(rule, rulePath);
            }
            console.log(`✅ 规则已保存: ${rulePath}`);
        }
        catch (error) {
            console.error('❌ 规则保存失败:', error);
            throw new Error(`规则保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 删除规则
     */
    async delete(ruleId) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const rulePath = path.join(this.rulesDir, `${ruleId}.yaml`);
            if (!await this.fileExists(rulePath)) {
                throw new Error(`规则不存在: ${ruleId}`);
            }
            // 移动到回收站（保留备份）
            const trashDir = path.join(this.rulesDir, 'trash');
            await fs.mkdir(trashDir, { recursive: true });
            const trashPath = path.join(trashDir, `${ruleId}-${Date.now()}.yaml`);
            await fs.rename(rulePath, trashPath);
            // 更新索引
            if (this.createIndex && this.index) {
                this.index.rules = this.index.rules.filter(r => r.id !== ruleId);
                await this.saveIndex();
            }
            console.log(`🗑️ 规则已删除: ${ruleId}`);
        }
        catch (error) {
            console.error(`❌ 删除规则 ${ruleId} 失败:`, error);
            throw new Error(`删除规则失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 列出规则
     */
    async list(filters) {
        try {
            if (this.createIndex && this.index) {
                // 使用索引快速过滤
                const filteredItems = this.filterIndex(this.index.rules, filters);
                const rules = [];
                for (const item of filteredItems) {
                    const rule = await this.load(item.id);
                    if (rule) {
                        rules.push(rule);
                    }
                }
                return rules;
            }
            else {
                // 扫描目录加载所有规则
                return await this.scanRulesDir(filters);
            }
        }
        catch (error) {
            console.error('❌ 列出规则失败:', error);
            return [];
        }
    }
    /**
     * 检查规则是否存在
     */
    async exists(ruleId) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const rulePath = path.join(this.rulesDir, `${ruleId}.yaml`);
        return this.fileExists(rulePath);
    }
    /**
     * 获取规则版本历史
     */
    async getVersions(ruleId) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const versionsDir = path.join(this.rulesDir, 'versions', ruleId);
            if (!await this.fileExists(versionsDir)) {
                return [];
            }
            const files = await fs.readdir(versionsDir);
            const versions = [];
            for (const file of files) {
                if (file.endsWith('.yaml')) {
                    const filePath = path.join(versionsDir, file);
                    const stats = await fs.stat(filePath);
                    versions.push({
                        version: file.replace('.yaml', ''),
                        timestamp: stats.mtime.toISOString(),
                        filePath
                    });
                }
            }
            // 按时间排序（最新的在前）
            return versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        catch (error) {
            console.error(`❌ 获取规则 ${ruleId} 版本历史失败:`, error);
            return [];
        }
    }
    /**
     * 回滚到指定版本
     */
    async rollback(ruleId, version) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const versionPath = path.join(this.rulesDir, 'versions', ruleId, `${version}.yaml`);
            if (!await this.fileExists(versionPath)) {
                throw new Error(`版本不存在: ${version}`);
            }
            // 读取版本内容
            const content = await fs.readFile(versionPath, 'utf-8');
            const yaml = await import('yaml');
            const rule = yaml.parse(content);
            // 保存为当前版本
            await this.save(rule);
            console.log(`↩️ 规则 ${ruleId} 已回滚到版本 ${version}`);
        }
        catch (error) {
            console.error(`❌ 回滚规则 ${ruleId} 失败:`, error);
            throw new Error(`回滚失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 批量导入规则
     */
    async importRules(rules) {
        const result = {
            total: rules.length,
            success: 0,
            failed: 0,
            errors: []
        };
        for (const rule of rules) {
            try {
                await this.save(rule);
                result.success++;
            }
            catch (error) {
                result.failed++;
                result.errors.push({
                    ruleId: rule.meta.id,
                    error: error instanceof Error ? error.message : '未知错误'
                });
            }
        }
        console.log(`📦 批量导入完成: ${result.success} 成功, ${result.failed} 失败`);
        return result;
    }
    /**
     * 批量导出规则
     */
    async exportRules(filters) {
        return this.list(filters);
    }
    /**
     * 验证所有规则
     */
    async validateAll() {
        const rules = await this.list();
        const report = {
            total: rules.length,
            valid: 0,
            invalid: 0,
            details: []
        };
        for (const rule of rules) {
            const validation = this.validator.validate(rule);
            if (validation.valid) {
                report.valid++;
            }
            else {
                report.invalid++;
                report.details.push({
                    ruleId: rule.meta.id,
                    errors: validation.errors,
                    warnings: validation.warnings
                });
            }
        }
        return report;
    }
    /**
     * 搜索规则
     */
    async search(query, filters) {
        const allRules = await this.list(filters);
        return allRules.filter(rule => {
            const searchText = [
                rule.meta.name,
                rule.meta.description,
                rule.rule.conditions[0]?.condition || '',
                ...(rule.rule.suggestions.map(s => s.description))
            ].join(' ').toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
    }
    /**
     * 获取统计信息
     */
    async getStatistics() {
        const rules = await this.list();
        return {
            totalRules: rules.length,
            languages: [...new Set(rules.map(r => r.compatibility.languages).flat())],
            frameworks: [...new Set(rules.map(r => r.compatibility.frameworks || []).flat())],
            averageConfidence: rules.reduce((sum, r) => sum + r.confidence, 0) / rules.length,
            lastUpdated: this.index?.updatedAt || new Date().toISOString()
        };
    }
    /**
     * 检测冲突
     */
    async detectConflicts(newRule) {
        const conflicts = [];
        // 检查 ID 冲突
        const existingRule = await this.load(newRule.meta.id);
        if (existingRule) {
            conflicts.push({
                type: 'id',
                ruleId: newRule.meta.id,
                existingRule,
                newRule,
                description: `规则 ID 冲突: ${newRule.meta.id}`
            });
        }
        // 检查内容冲突（相同的 trigger + 不同的 condition）
        const similarRules = await this.findSimilarRules(newRule);
        for (const rule of similarRules) {
            if (rule.rule.conditions[0]?.condition !== newRule.rule.conditions[0]?.condition) {
                conflicts.push({
                    type: 'content',
                    ruleId: rule.meta.id,
                    existingRule: rule,
                    newRule,
                    description: `规则内容冲突: ${newRule.meta.id} 与 ${rule.meta.id}`
                });
            }
        }
        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            suggestions: conflicts.length > 0 ? [
                '考虑修改规则 ID',
                '合并相似的规则',
                '添加更具体的触发条件'
            ] : []
        };
    }
    /**
     * 查找相似规则
     */
    async findSimilarRules(rule) {
        const allRules = await this.list();
        return allRules.filter(existingRule => {
            // 简单的相似性检查（基于 trigger 模式）
            return existingRule.rule.trigger.pattern === rule.rule.trigger.pattern &&
                existingRule.meta.id !== rule.meta.id;
        });
    }
    /**
     * 创建备份
     */
    async createBackup(rule) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const versionsDir = path.join(this.rulesDir, 'versions', rule.meta.id);
            await fs.mkdir(versionsDir, { recursive: true });
            // 创建时间戳版本
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const versionPath = path.join(versionsDir, `${timestamp}.yaml`);
            const yaml = await import('yaml');
            const yamlContent = yaml.stringify(rule, {
                indent: 2,
                defaultKeyType: 'PLAIN',
                defaultStringType: 'PLAIN'
            });
            await fs.writeFile(versionPath, yamlContent);
            // 清理旧版本
            await this.cleanupOldVersions(rule.meta.id);
        }
        catch (error) {
            console.warn('⚠️ 创建备份失败:', error);
        }
    }
    /**
     * 清理旧版本
     */
    async cleanupOldVersions(ruleId) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const versionsDir = path.join(this.rulesDir, 'versions', ruleId);
            if (!await this.fileExists(versionsDir)) {
                return;
            }
            const files = await fs.readdir(versionsDir);
            const versionFiles = files.filter(f => f.endsWith('.yaml'));
            if (versionFiles.length > this.maxVersions) {
                // 按文件名排序（时间戳）
                versionFiles.sort().reverse();
                const filesToDelete = versionFiles.slice(this.maxVersions);
                for (const file of filesToDelete) {
                    await fs.unlink(path.join(versionsDir, file));
                }
                console.log(`🧹 清理了 ${filesToDelete.length} 个旧版本: ${ruleId}`);
            }
        }
        catch (error) {
            console.warn('⚠️ 清理旧版本失败:', error);
        }
    }
    /**
     * 加载或创建索引
     */
    async loadOrCreateIndex() {
        const fs = await import('fs/promises');
        const path = await import('path');
        const indexPath = path.join(this.rulesDir, 'rules-index.json');
        try {
            if (await this.fileExists(indexPath)) {
                const content = await fs.readFile(indexPath, 'utf-8');
                this.index = JSON.parse(content);
                console.log('📋 规则索引已加载');
            }
            else {
                this.index = {
                    version: '1.0.0',
                    updatedAt: new Date().toISOString(),
                    rules: []
                };
                await this.saveIndex();
                console.log('📋 创建新规则索引');
            }
        }
        catch (error) {
            console.warn('⚠️ 加载索引失败，创建新索引:', error);
            this.index = {
                version: '1.0.0',
                updatedAt: new Date().toISOString(),
                rules: []
            };
        }
    }
    /**
     * 更新索引
     */
    async updateIndex(rule, filePath) {
        if (!this.index)
            return;
        const existingIndex = this.index.rules.findIndex(r => r.id === rule.meta.id);
        const indexItem = {
            id: rule.meta.id,
            name: rule.meta.name,
            version: rule.meta.version,
            filePath,
            updatedAt: new Date().toISOString(),
            confidence: rule.confidence,
            language: rule.compatibility.languages[0],
            framework: rule.compatibility.frameworks?.[0],
            tags: this.extractTags(rule)
        };
        if (existingIndex >= 0) {
            this.index.rules[existingIndex] = indexItem;
        }
        else {
            this.index.rules.push(indexItem);
        }
        this.index.updatedAt = new Date().toISOString();
        await this.saveIndex();
    }
    /**
     * 保存索引
     */
    async saveIndex() {
        if (!this.index)
            return;
        const fs = await import('fs/promises');
        const path = await import('path');
        const indexPath = path.join(this.rulesDir, 'rules-index.json');
        await fs.writeFile(indexPath, JSON.stringify(this.index, null, 2));
    }
    /**
     * 过滤索引
     */
    filterIndex(items, filters) {
        let filtered = [...items];
        if (filters?.language) {
            filtered = filtered.filter(item => item.language === filters.language);
        }
        if (filters?.framework) {
            filtered = filtered.filter(item => item.framework === filters.framework);
        }
        if (filters?.minConfidence) {
            filtered = filtered.filter(item => item.confidence >= filters.minConfidence);
        }
        if (filters?.tags && filters.tags.length > 0) {
            filtered = filtered.filter(item => item.tags?.some(tag => filters.tags.includes(tag)));
        }
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(item => item.name.toLowerCase().includes(searchLower) ||
                item.id.toLowerCase().includes(searchLower));
        }
        // 分页
        if (filters?.limit) {
            const offset = filters.offset || 0;
            filtered = filtered.slice(offset, offset + filters.limit);
        }
        return filtered;
    }
    /**
     * 扫描规则目录
     */
    async scanRulesDir(filters) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const rules = [];
        try {
            const files = await fs.readdir(this.rulesDir);
            for (const file of files) {
                if (file.endsWith('.yaml') && !file.startsWith('.')) {
                    try {
                        const rulePath = path.join(this.rulesDir, file);
                        const content = await fs.readFile(rulePath, 'utf-8');
                        const yaml = await import('yaml');
                        const rule = yaml.parse(content);
                        // 应用过滤器
                        if (this.matchesFilters(rule, filters)) {
                            rules.push(rule);
                        }
                    }
                    catch (error) {
                        console.warn(`⚠️ 加载规则文件失败: ${file}`, error);
                    }
                }
            }
        }
        catch (error) {
            console.warn('⚠️ 扫描规则目录失败:', error);
        }
        return rules;
    }
    /**
     * 检查规则是否匹配过滤器
     */
    matchesFilters(rule, filters) {
        if (!filters)
            return true;
        if (filters.language && !rule.compatibility.languages.includes(filters.language)) {
            return false;
        }
        if (filters.framework && !rule.compatibility.frameworks?.includes(filters.framework)) {
            return false;
        }
        if (filters.minConfidence && rule.confidence < filters.minConfidence) {
            return false;
        }
        return true;
    }
    /**
     * 提取标签
     */
    extractTags(rule) {
        const tags = [];
        // 从名称和描述中提取标签
        const text = `${rule.meta.name} ${rule.meta.description}`.toLowerCase();
        const commonTags = ['validation', 'error', 'test', 'component', 'function', 'type', 'security'];
        for (const tag of commonTags) {
            if (text.includes(tag)) {
                tags.push(tag);
            }
        }
        // 添加语言标签
        tags.push(...rule.compatibility.languages);
        return [...new Set(tags)];
    }
    /**
     * 检查文件是否存在
     */
    async fileExists(path) {
        try {
            const fs = await import('fs/promises');
            await fs.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.RuleStore = RuleStore;
// 导出便捷函数
const createRuleStore = async (options) => {
    const store = new RuleStore(options);
    await store.initialize();
    return store;
};
exports.createRuleStore = createRuleStore;
// 默认导出
exports.default = RuleStore;
//# sourceMappingURL=rule-store.js.map