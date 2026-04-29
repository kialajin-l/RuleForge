/**
 * RuleForge RuleEngine 类型定义
 * 标准化的文件变更事件、匹配结果和诊断输出格式
 *
 * Diagnostic 兼容 LSP (Language Server Protocol) 格式，
 * 可直接对接 VS Code / Neovim 等编辑器
 */

import { RuleYAML } from '../types/rule-schema';

// ─── 文件变更事件 ───

/** 文件变更事件 — 引擎的输入 */
export interface FileChangeEvent {
  /** 文件绝对路径 */
  path: string;
  /** 文件完整内容（用于 code_pattern 匹配） */
  content: string;
  /** 编程语言标识（如 "typescript", "python"） */
  language: string;
  /** 变更时间戳（ISO 8601） */
  timestamp: string;
  /** 变更类型 */
  changeType: 'create' | 'modify' | 'delete';
  /** 项目根目录（可选，用于相对路径计算） */
  projectRoot?: string;
  /** 框架标识（如 "react", "vue"） */
  framework?: string;
  /** 应用场景（如 "coding"） */
  scene?: string;
}

// ─── 引擎匹配结果 ───

/** 单条规则的匹配结果 */
export interface EngineMatchResult {
  /** 匹配到的规则 */
  rule: RuleYAML;
  /** 最终计算的置信度（0-1） */
  confidence: number;
  /** 匹配详情 */
  details: {
    triggerMatch: boolean;
    conditionMatches: boolean[];
    compatibilityMatch: boolean;
  };
  /** 规则建议列表 */
  suggestions: RuleYAML['rule']['suggestions'];
  /** 规则优先级（global > project > session） */
  priority: 'global' | 'project' | 'session';
}

// ─── 诊断输出（兼容 LSP） ───

/** 诊断严重级别 — 对齐 LSP DiagnosticSeverity */
export enum DiagnosticSeverity {
  /** 提示信息 */
  Hint = 1,
  /** 信息 */
  Information = 2,
  /** 警告 */
  Warning = 3,
  /** 错误 */
  Error = 4,
}

/** 诊断标签 — 分类建议类型 */
export enum DiagnosticTag {
  /** 建议修复 */
  QuickFix = 1,
  /** 代码优化 */
  Refactor = 2,
  /** 配置变更 */
  ConfigChange = 3,
  /** 依赖操作 */
  Dependency = 4,
}

/** 单条诊断信息 — 引擎的输出，兼容 LSP Diagnostic */
export interface RuleDiagnostic {
  /** 文件路径 */
  filePath: string;
  /** 起始行号（0-based） */
  line: number;
  /** 起始列号（0-based） */
  column: number;
  /** 结束行号（0-based） */
  endLine: number;
  /** 结束列号（0-based） */
  endColumn: number;
  /** 严重级别 */
  severity: DiagnosticSeverity;
  /** 诊断消息 */
  message: string;
  /** 来源规则 ID */
  source: string;
  /** 规则置信度 */
  confidence: number;
  /** 诊断标签 */
  tags: DiagnosticTag[];
  /** 关联的代码建议（可选） */
  suggestedCode?: string;
  /** 关联的命令（可选） */
  command?: string;
  /** 规则优先级 */
  priority: 'global' | 'project' | 'session';
}

// ─── 引擎配置 ───

/** RuleEngine 配置选项 */
export interface RuleEngineConfig {
  /** 规则库路径 */
  rulesDir: string;
  /** 最低置信度阈值（默认 0.5） */
  minConfidence: number;
  /** 最大返回诊断数（默认 50） */
  maxDiagnostics: number;
  /** 是否启用依赖链解析（默认 true） */
  resolveDependencies: boolean;
  /** 是否启用统计（默认 true） */
  enableStats: boolean;
  /** 统计数据路径（默认 .ruleforge/stats.json） */
  statsPath: string;
  /** 启用的规则 ID 列表（空 = 全部启用） */
  enabledRules: string[];
  /** 禁用的规则 ID 列表 */
  disabledRules: string[];
  /** 文件过滤模式（glob 数组，空 = 不过滤） */
  filePatterns: string[];
  /** 是否创建索引（默认 true） */
  createIndex: boolean;
}

/** 默认配置 */
export const DEFAULT_ENGINE_CONFIG: RuleEngineConfig = {
  rulesDir: '.ruleforge/rules',
  minConfidence: 0.5,
  maxDiagnostics: 50,
  resolveDependencies: true,
  enableStats: true,
  statsPath: '.ruleforge/stats.json',
  enabledRules: [],
  disabledRules: [],
  filePatterns: [],
  createIndex: true,
};

// ─── 引擎事件 ───

/** 引擎生命周期事件 */
export type RuleEngineEvent =
  | { type: 'engine:initialized'; ruleCount: number }
  | { type: 'engine:matched'; filePath: string; matchCount: number; diagnosticCount: number }
  | { type: 'engine:error'; error: Error; context?: string }
  | { type: 'stats:updated'; ruleId: string; matchCount: number; adoptCount: number };

/** 事件监听器类型 */
export type RuleEngineEventListener = (event: RuleEngineEvent) => void;
