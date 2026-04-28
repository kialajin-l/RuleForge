/**
 * RuleForge Engine Protocol (REP) v0.2 类型定义
 * 定义规则提取、验证和生成的类型接口
 *
 * v0.2 变更：
 * - RuleMeta 新增 source / forked_from / tags / scene
 * - Rule 新增 schemaVersion / priority
 * - 新增 RuleDomain / RulePriority 枚举
 * - 新增 ConflictResolver 接口
 */

// ─── v0.2 新增枚举 ───

export type RuleDomain = 'code' | 'creative' | 'multimodal';
export type RulePriority = 'global' | 'project' | 'session';

// ─── Meta ───

export interface RuleMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  authors: string[];
  license: 'MIT' | 'Apache-2.0' | 'BSD-3-Clause';
  created: string;
  updated: string;
  // ── v0.2 新增 ──
  source?: string;
  forked_from?: string;
  tags?: string[];
  scene?: string;
}

// ─── Trigger ───

export interface RuleTrigger {
  type: 'file_pattern' | 'code_pattern' | 'command' | 'git_operation';
  pattern: string;
  file_types?: string[];
  context?: string;
}

// ─── Condition ───

export interface RuleCondition {
  type: 'file_exists' | 'code_contains' | 'dependency_check' | 'config_check';
  condition: string;
  negated?: boolean;
}

// ─── Suggestion ───

export interface RuleSuggestion {
  type: 'code_fix' | 'config_change' | 'dependency_add' | 'command_run';
  description: string;
  code?: string;
  command?: string;
  files?: string[];
}

// ─── Compatibility ───

export interface RuleCompatibility {
  languages: string[];
  frameworks?: string[];
  tools?: string[];
  min_version?: string;
  max_version?: string;
  // ── v0.2 新增 ──
  scenes?: string[];
}

// ─── Rule（根类型）──

export interface Rule {
  schemaVersion?: string;
  meta: RuleMeta;
  rule: {
    trigger: RuleTrigger;
    conditions: RuleCondition[];
    suggestions: RuleSuggestion[];
  };
  compatibility: RuleCompatibility;
  confidence: number;
  // ── v0.2 新增 ──
  priority?: RulePriority;
}

// ─── DevSession ───

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

// ─── ExtractionResult ───

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

// ─── ValidationResult ───

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── ConflictResolver（v0.2 新增）──

/**
 * 规则冲突解决器接口
 * 用于记忆联邦阶段的"项目级 vs 全局级"冲突仲裁
 */
export interface ConflictResolver {
  /** 解决两条规则的冲突，返回最终保留的规则 */
  resolve(existing: Rule, incoming: Rule): Rule;
  /** 获取规则的优先级 */
  getPriority(rule: Rule): RulePriority;
}

// ─── GitHubPRConfig ───

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
