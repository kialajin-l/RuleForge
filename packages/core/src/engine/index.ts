/**
 * RuleEngine 模块入口
 */

export { RuleEngine } from './rule-engine';
export { RuleStats } from './rule-stats';
export type {
  FileChangeEvent,
  EngineMatchResult,
  RuleDiagnostic,
  RuleEngineConfig,
  RuleEngineEvent,
  RuleEngineEventListener,
} from './types';
export {
  DiagnosticSeverity,
  DiagnosticTag,
  DEFAULT_ENGINE_CONFIG,
} from './types';
