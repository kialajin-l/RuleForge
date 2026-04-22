/**
 * RuleForge Engine Protocol (REP) v0.1 类型定义
 * 定义规则提取、验证和生成的类型接口
 */
export interface RuleMeta {
    id: string;
    name: string;
    version: string;
    description: string;
    authors: string[];
    license: 'MIT' | 'Apache-2.0' | 'BSD-3-Clause';
    created: string;
    updated: string;
}
export interface RuleTrigger {
    type: 'file_pattern' | 'code_pattern' | 'command' | 'git_operation';
    pattern: string;
    file_types?: string[];
    context?: string;
}
export interface RuleCondition {
    type: 'file_exists' | 'code_contains' | 'dependency_check' | 'config_check';
    condition: string;
    negated?: boolean;
}
export interface RuleSuggestion {
    type: 'code_fix' | 'config_change' | 'dependency_add' | 'command_run';
    description: string;
    code?: string;
    command?: string;
    files?: string[];
}
export interface RuleCompatibility {
    languages: string[];
    frameworks?: string[];
    tools?: string[];
    min_version?: string;
    max_version?: string;
}
export interface Rule {
    meta: RuleMeta;
    rule: {
        trigger: RuleTrigger;
        conditions: RuleCondition[];
        suggestions: RuleSuggestion[];
    };
    compatibility: RuleCompatibility;
    confidence: number;
}
export interface DevSession {
    id: string;
    timestamp: string;
    files: Array<{
        path: string;
        content: string;
        changes: string[];
    }>;
    commands: Array<{
        command: string;
        output: string;
        success: boolean;
    }>;
    git_operations: Array<{
        type: 'commit' | 'push' | 'pull' | 'branch';
        details: string;
    }>;
    errors: string[];
    duration: number;
}
export interface ExtractionResult {
    rules: Rule[];
    statistics: {
        totalFiles: number;
        totalCommands: number;
        patternsFound: number;
        extractionTime: number;
    };
    warnings: string[];
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export interface GitHubPRConfig {
    owner: string;
    repo: string;
    baseBranch: string;
    headBranch: string;
    title: string;
    body: string;
    labels?: string[];
    reviewers?: string[];
}
//# sourceMappingURL=rule.d.ts.map