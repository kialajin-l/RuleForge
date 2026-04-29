/**
 * Rule Templates System
 *
 * Provides pre-built rule templates that can be instantiated with parameters.
 * Each template generates a valid RuleYAML object conforming to REP v0.2.
 */

import { RuleYAML } from '../types/rule-schema';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'coding' | 'review' | 'testing' | 'security' | 'performance' | 'architecture';
  scene: string;
  generate: (params: TemplateParams) => RuleYAML;
}

export interface TemplateParams {
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  scene?: string;
}

// ─── Helpers ───

function langP(lang?: string): string[] {
  const m: Record<string, string[]> = {
    typescript: ['**/*.ts', '**/*.tsx'],
    javascript: ['**/*.js', '**/*.jsx'],
    python: ['**/*.py'],
    java: ['**/*.java'],
    go: ['**/*.go'],
    rust: ['**/*.rs'],
  };
  return m[lang || ''] || ['**/*.ts', '**/*.js'];
}

function now(): string { return new Date().toISOString(); }
function tid(prefix: string, lang?: string): string {
  return prefix + '-' + (lang || 'general') + '-' + Date.now();
}

// ─── Template Definitions ───

const templates: RuleTemplate[] = [
  // ── Coding ──
  {
    id: 'naming-convention', name: 'Naming Convention',
    description: 'Force unified naming conventions (camelCase/snake_case/PascalCase)',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('naming', p.language), version: '0.1.0',
        name: p.name || (p.language || 'General') + ' Naming Convention',
        description: p.description || 'Enforce consistent naming conventions across the codebase',
        authors: ['ruleforge-template'], tags: ['naming'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'file_pattern', pattern: langP(p.language).join(','), file_types: langP(p.language) },
        conditions: [{ type: 'code_contains', condition: 'identifier naming' }],
        suggestions: [{ type: 'code_fix', description: 'Rename identifiers to follow the project naming convention' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.85,
    })
  },
  {
    id: 'error-handling', name: 'Error Handling',
    description: 'Enforce proper error handling patterns',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('error', p.language), version: '0.1.0',
        name: p.name || 'Error Handling',
        description: p.description || 'All async operations must have error handling',
        authors: ['ruleforge-template'], tags: ['error', 'exception'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'await|async' },
        conditions: [{ type: 'code_contains', condition: 'try-catch or .catch()' }],
        suggestions: [{ type: 'code_fix', description: 'Wrap async operations in try-catch or add .catch() handler' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.9,
    })
  },
  {
    id: 'no-any', name: 'No Any Type',
    description: 'Disallow the any type in TypeScript',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('no-any', p.language), version: '0.1.0',
        name: p.name || 'No Any Type',
        description: p.description || 'Avoid using the any type in TypeScript code',
        authors: ['ruleforge-template'], tags: ['typescript', 'type-safety'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'file_pattern', pattern: '**/*.ts,**/*.tsx', file_types: ['**/*.ts', '**/*.tsx'] },
        conditions: [{ type: 'code_contains', condition: ': any' }],
        suggestions: [{ type: 'code_fix', description: 'Replace "any" with a specific type or "unknown"' }],
      },
      compatibility: { languages: ['typescript'], frameworks: [] },
      confidence: 0.95,
    })
  },
  {
    id: 'no-console-log', name: 'No Console Log',
    description: 'Disallow console.log in production code',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('no-console', p.language), version: '0.1.0',
        name: p.name || 'No Console Log',
        description: p.description || 'Remove console.log from production code',
        authors: ['ruleforge-template'], tags: ['logging', 'production'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'console\.log' },
        conditions: [{ type: 'code_contains', condition: 'console.log' }],
        suggestions: [{ type: 'code_fix', description: 'Replace console.log with a proper logging library' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.8,
    })
  },

  // ── Review ──
  {
    id: 'code-review-checklist', name: 'Code Review Checklist',
    description: 'Standard code review checklist',
    category: 'review', scene: 'review',
    generate: (p) => ({
      meta: {
        id: tid('review', p.language), version: '0.1.0',
        name: p.name || 'Code Review Checklist',
        description: p.description || 'Standard code review checklist for pull requests',
        authors: ['ruleforge-template'], tags: ['review', 'checklist'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'review',
      },
      rule: {
        trigger: { type: 'git_operation', pattern: 'pre-commit|pre-push' },
        conditions: [{ type: 'code_contains', condition: 'TODO|FIXME|HACK' }],
        suggestions: [{ type: 'code_fix', description: 'Resolve all TODO/FIXME/HACK markers before merging' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.7,
    })
  },

  // ── Testing ──
  {
    id: 'test-coverage', name: 'Test Coverage',
    description: 'Ensure adequate test coverage',
    category: 'testing', scene: 'testing',
    generate: (p) => ({
      meta: {
        id: tid('test', p.language), version: '0.1.0',
        name: p.name || 'Test Coverage',
        description: p.description || 'Ensure every function has at least one test',
        authors: ['ruleforge-template'], tags: ['testing', 'coverage'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'testing',
      },
      rule: {
        trigger: { type: 'file_pattern', pattern: '**/*.test.*,**/*.spec.*', file_types: ['**/*.test.*', '**/*.spec.*'] },
        conditions: [{ type: 'file_exists', condition: 'test file exists' }],
        suggestions: [{ type: 'code_fix', description: 'Add test cases for untested functions' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.8,
    })
  },

  // ── Security ──
  {
    id: 'no-eval', name: 'No Eval',
    description: 'Disallow eval() usage',
    category: 'security', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('no-eval', p.language), version: '0.1.0',
        name: p.name || 'No Eval',
        description: p.description || 'eval() is a security risk and should not be used',
        authors: ['ruleforge-template'], tags: ['security', 'eval'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'eval\(' },
        conditions: [{ type: 'code_contains', condition: 'eval()' }],
        suggestions: [{ type: 'code_fix', description: 'Replace eval() with JSON.parse() or a safe alternative' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.95,
    })
  },

  // ── Performance ──
  {
    id: 'performance-no-sync', name: 'No Synchronous I/O',
    description: 'Avoid synchronous I/O in async contexts',
    category: 'performance', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('perf-sync', p.language), version: '0.1.0',
        name: p.name || 'No Synchronous I/O',
        description: p.description || 'Avoid blocking synchronous I/O operations',
        authors: ['ruleforge-template'], tags: ['performance', 'async'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'readFileSync|writeFileSync|existsSync' },
        conditions: [{ type: 'code_contains', condition: 'synchronous file operation' }],
        suggestions: [{ type: 'code_fix', description: 'Use async alternatives (readFile, writeFile, access)' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript'], frameworks: [] },
      confidence: 0.85,
    })
  },

  // ── React ──
  {
    id: 'react-no-direct-dom', name: 'No Direct DOM Manipulation',
    description: 'Prohibit direct DOM manipulation in React; use ref or state instead',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('react-dom', p.language), version: '0.1.0',
        name: p.name || 'React: No Direct DOM Manipulation',
        description: p.description || 'In React, avoid direct DOM manipulation. Use useRef or state to manage DOM interactions.',
        authors: ['ruleforge-template'], tags: ['react', 'dom', 'best-practice'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'document\.getElementById|document\.querySelector|\.innerHTML|\.style\.' },
        conditions: [{ type: 'code_contains', condition: 'direct DOM API call in React component' }],
        suggestions: [{ type: 'code_fix', description: 'Replace direct DOM manipulation with useRef or component state' }],
      },
      compatibility: { languages: ['typescript', 'javascript'], frameworks: ['react'] },
      confidence: 0.9,
    })
  },
  {
    id: 'react-key-prop', name: 'Key Prop Required',
    description: 'List rendering in React must provide a unique key prop',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('react-key', p.language), version: '0.1.0',
        name: p.name || 'React: Key Prop Required',
        description: p.description || 'Every element in a list rendered with .map() must have a unique and stable key prop.',
        authors: ['ruleforge-template'], tags: ['react', 'key', 'list-rendering'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: '\.map\(' },
        conditions: [{ type: 'code_contains', condition: 'key prop in JSX element' }],
        suggestions: [{ type: 'code_fix', description: 'Add a unique and stable key prop to each element in the list' }],
      },
      compatibility: { languages: ['typescript', 'javascript'], frameworks: ['react'] },
      confidence: 0.9,
    })
  },

  // ── Vue ──
  {
    id: 'vue-no-v-html', name: 'No v-html Directive',
    description: 'Prohibit v-html directive due to XSS risk',
    category: 'security', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('vue-vhtml', p.language), version: '0.1.0',
        name: p.name || 'Vue: No v-html',
        description: p.description || 'The v-html directive can lead to XSS attacks. Use text interpolation or a sanitization library instead.',
        authors: ['ruleforge-template'], tags: ['vue', 'xss', 'security'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'v-html' },
        conditions: [{ type: 'code_contains', condition: 'v-html directive usage' }],
        suggestions: [{ type: 'code_fix', description: 'Replace v-html with {{ }} interpolation or use DOMPurify to sanitize HTML content' }],
      },
      compatibility: { languages: ['typescript', 'javascript'], frameworks: ['vue'] },
      confidence: 0.95,
    })
  },
  {
    id: 'vue-computed-side-effects', name: 'No Computed Side Effects',
    description: 'Vue computed properties must not have side effects',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('vue-computed', p.language), version: '0.1.0',
        name: p.name || 'Vue: No Computed Side Effects',
        description: p.description || 'Computed properties should be pure derivations. Avoid mutations, async calls, or DOM manipulation inside them.',
        authors: ['ruleforge-template'], tags: ['vue', 'computed', 'purity'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'computed\(' },
        conditions: [{ type: 'code_contains', condition: 'no side effects in computed' }],
        suggestions: [{ type: 'code_fix', description: 'Remove mutations, async calls, or DOM manipulation from computed properties. Use watchers for side effects.' }],
      },
      compatibility: { languages: ['typescript', 'javascript'], frameworks: ['vue'] },
      confidence: 0.85,
    })
  },

  // ── Python ──
  {
    id: 'python-type-hints', name: 'Type Hints Required',
    description: 'Python functions must have type annotations',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('py-hints', p.language), version: '0.1.0',
        name: p.name || 'Python: Type Hints Required',
        description: p.description || 'All function definitions must include type annotations for parameters and return values.',
        authors: ['ruleforge-template'], tags: ['python', 'type-hints', 'typing'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'def \w+\(' },
        conditions: [{ type: 'code_contains', condition: 'type annotations on all parameters and return type' }],
        suggestions: [{ type: 'code_fix', description: 'Add type annotations to function parameters and return type (e.g., def foo(x: int) -> str:)' }],
      },
      compatibility: { languages: ['python'], frameworks: [] },
      confidence: 0.85,
    })
  },
  {
    id: 'python-bare-except', name: 'No Bare Except',
    description: 'Prohibit bare except clauses; always specify an exception type',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('py-except', p.language), version: '0.1.0',
        name: p.name || 'Python: No Bare Except',
        description: p.description || 'Bare "except:" catches all exceptions including SystemExit and KeyboardInterrupt. Always specify an exception type.',
        authors: ['ruleforge-template'], tags: ['python', 'exception', 'best-practice'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'except\s*:' },
        conditions: [{ type: 'code_contains', condition: 'bare except clause' }],
        suggestions: [{ type: 'code_fix', description: 'Replace bare "except:" with a specific exception type, e.g., "except ValueError:" or "except Exception:"' }],
      },
      compatibility: { languages: ['python'], frameworks: [] },
      confidence: 0.9,
    })
  },

  // ── API Design ──
  {
    id: 'rest-naming', name: 'REST API Naming Convention',
    description: 'REST API paths must use plural nouns and kebab-case',
    category: 'architecture', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('rest-naming', p.language), version: '0.1.0',
        name: p.name || 'REST API Naming Convention',
        description: p.description || 'REST API paths must use plural nouns and kebab-case (e.g., /user-profiles, not /userProfile or /user_profiles).',
        authors: ['ruleforge-template'], tags: ['api', 'rest', 'naming'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: '(app|router)\.(get|post|put|delete|patch)\(' },
        conditions: [{ type: 'code_contains', condition: 'plural nouns and kebab-case in route paths' }],
        suggestions: [{ type: 'code_fix', description: 'Use plural nouns and kebab-case for API paths (e.g., /user-profiles instead of /userProfile)' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript', 'javascript'], frameworks: [] },
      confidence: 0.8,
    })
  },
  {
    id: 'api-error-response', name: 'API Error Response Format',
    description: 'API error responses must include error code and message',
    category: 'architecture', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('api-err', p.language), version: '0.1.0',
        name: p.name || 'API Error Response Format',
        description: p.description || 'All API error responses must include a structured error object with code and message fields.',
        authors: ['ruleforge-template'], tags: ['api', 'error', 'response-format'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'status\(\d{3}\)|res\.status|response\.status' },
        conditions: [{ type: 'code_contains', condition: 'error response includes code and message fields' }],
        suggestions: [{ type: 'code_fix', description: 'Return error responses as { error: { code: "ERROR_CODE", message: "Description" } }' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript', 'javascript'], frameworks: [] },
      confidence: 0.8,
    })
  },

  // ── Logging ──
  {
    id: 'log-structured', name: 'Structured Logging',
    description: 'Logs must be structured (JSON format) with timestamp, level, and message',
    category: 'coding', scene: 'coding',
    generate: (p) => ({
      meta: {
        id: tid('log-struct', p.language), version: '0.1.0',
        name: p.name || 'Structured Logging',
        description: p.description || 'All logs must be structured in JSON format containing at minimum: timestamp, level, and message fields.',
        authors: ['ruleforge-template'], tags: ['logging', 'structured', 'json'],
        created: now(), updated: now(), license: 'MIT', scene: p.scene || 'coding',
      },
      rule: {
        trigger: { type: 'code_pattern', pattern: 'logger\.(info|warn|error|debug)|console\.(log|warn|error)' },
        conditions: [{ type: 'code_contains', condition: 'structured log with timestamp, level, and message' }],
        suggestions: [{ type: 'code_fix', description: 'Use structured logging with JSON format: { timestamp, level, message, ...context }' }],
      },
      compatibility: { languages: p.language ? [p.language] : ['typescript', 'javascript'], frameworks: [] },
      confidence: 0.8,
    })
  },];

// ─── Public API ───

export function getTemplates(): RuleTemplate[] { return templates; }
export function getTemplate(id: string): RuleTemplate | undefined { return templates.find(t => t.id === id); }
export function getTemplatesByCategory(cat: RuleTemplate['category']): RuleTemplate[] { return templates.filter(t => t.category === cat); }
export function generateFromTemplate(id: string, params: TemplateParams = {}): RuleYAML {
  const t = getTemplate(id);
  if (!t) throw new Error('Template not found: ' + id);
  return t.generate(params);
}
export function listTemplates(): Array<{ id: string; name: string; description: string; category: string }> {
  return templates.map(t => ({ id: t.id, name: t.name, description: t.description, category: t.category }));
}

// ──── Search & Recommend API ────

/**
 * 按关键词搜索模板
 */
export function searchTemplates(keyword: string): RuleTemplate[] {
  const lower = keyword.toLowerCase();
  return templates.filter(t =>
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.id.toLowerCase().includes(lower) ||
    t.category.toLowerCase().includes(lower)
  );
}

/**
 * 根据语言推荐模板
 */
export function recommendTemplates(language: string, framework?: string): RuleTemplate[] {
  return templates.filter(t => {
    // 语言匹配：模板的 compatibility 或 id 包含语言关键词
    const langMatch = t.id.includes(language.toLowerCase()) ||
      t.description.toLowerCase().includes(language.toLowerCase());
    // 框架匹配
    const fwMatch = framework ? (
      t.id.includes(framework.toLowerCase()) ||
      t.description.toLowerCase().includes(framework.toLowerCase())
    ) : true;
    return langMatch || fwMatch;
  });
}

/**
 * 获取模板统计信息
 */
export function getTemplateStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const t of templates) {
    stats[t.category] = (stats[t.category] || 0) + 1;
  }
  return stats;
}
