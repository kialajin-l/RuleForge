import { describe, it, expect } from 'vitest';
import { RuleValidator } from '../packages/core/src/validator/rule-validator';
import { RuleYAML } from '../packages/core/src/types/rule-schema';

function makeRule(overrides: Partial<RuleYAML> & { id: string }): RuleYAML {
  return {
    schemaVersion: '0.2.0',
    meta: {
      id: overrides.id,
      name: overrides.id,
      version: '1.0.0',
      description: 'Test rule ' + overrides.id,
      authors: ['test'],
      license: 'MIT',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      ...overrides.meta,
    },
    rule: overrides.rule ?? {
      trigger: { type: 'file_pattern', pattern: '**/*.ts' },
      conditions: [{ type: 'file_exists', condition: 'tsconfig.json' }],
      suggestions: [{ type: 'code_fix', description: 'Apply TypeScript best practices for code quality' }],
    },
    compatibility: overrides.compatibility ?? { languages: ['typescript'] },
    confidence: overrides.confidence ?? 0.8,
    depends_on: overrides.depends_on,
    conflicts_with: overrides.conflicts_with,
  } as RuleYAML;
}

describe("RuleValidator - Dependency & Conflict Detection", () => {
  const validator = new RuleValidator();

  describe("checkDependencies", () => {
    it("should detect missing dependencies", () => {
      const rules = [
        makeRule({ id: "rule-a", depends_on: ["rule-b", "rule-c"] }),
        makeRule({ id: "rule-b" }),
      ];
      const result = validator.checkDependencies(rules);
      expect(result.valid).toBe(false);
      expect(result.missingDependencies).toHaveLength(1);
      expect(result.missingDependencies[0]).toEqual({ ruleId: "rule-a", missingDep: "rule-c" });
      expect(result.circularDependencies).toHaveLength(0);
    });

    it("should detect circular dependencies", () => {
      const rules = [
        makeRule({ id: "rule-a", depends_on: ["rule-b"] }),
        makeRule({ id: "rule-b", depends_on: ["rule-c"] }),
        makeRule({ id: "rule-c", depends_on: ["rule-a"] }),
      ];
      const result = validator.checkDependencies(rules);
      expect(result.valid).toBe(false);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.circularDependencies.length).toBeGreaterThan(0);
      const cycle = result.circularDependencies[0];
      expect(cycle).toContain("rule-a");
      expect(cycle).toContain("rule-b");
      expect(cycle).toContain("rule-c");
    });

    it("should pass when all dependencies are satisfied", () => {
      const rules = [
        makeRule({ id: "rule-a", depends_on: ["rule-b"] }),
        makeRule({ id: "rule-b", depends_on: ["rule-c"] }),
        makeRule({ id: "rule-c" }),
      ];
      const result = validator.checkDependencies(rules);
      expect(result.valid).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
    });

    it("should handle rules with no dependencies", () => {
      const rules = [makeRule({ id: "rule-a" }), makeRule({ id: "rule-b" })];
      const result = validator.checkDependencies(rules);
      expect(result.valid).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
    });
  });

  describe("checkConflicts", () => {
    it("should detect explicit conflict declarations", () => {
      const rules = [
        makeRule({ id: "rule-a", conflicts_with: ["rule-b"] }),
        makeRule({ id: "rule-b" }),
      ];
      const result = validator.checkConflicts(rules);
      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual({
        ruleA: "rule-a", ruleB: "rule-b", reason: "显式冲突声明",
      });
    });

    it("should detect semantic conflicts (same trigger, different suggestions)", () => {
      const rules = [
        makeRule({
          id: "rule-a",
          rule: {
            trigger: { type: "file_pattern", pattern: "**/*.ts" },
            conditions: [{ type: "file_exists", condition: "tsconfig.json" }],
            suggestions: [{ type: "code_fix", description: "Use strict mode in TypeScript configuration" }],
          },
        }),
        makeRule({
          id: "rule-b",
          rule: {
            trigger: { type: "file_pattern", pattern: "**/*.ts" },
            conditions: [{ type: "file_exists", condition: "tsconfig.json" }],
            suggestions: [{ type: "code_fix", description: "Enable noImplicitAny in TypeScript settings" }],
          },
        }),
      ];
      const result = validator.checkConflicts(rules);
      expect(result.valid).toBe(false);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
      const semanticConflict = result.conflicts.find(c => c.reason.includes("相同触发器"));
      expect(semanticConflict).toBeDefined();
    });

    it("should not flag same trigger with same suggestions", () => {
      const rules = [
        makeRule({
          id: "rule-a",
          rule: {
            trigger: { type: "file_pattern", pattern: "**/*.ts" },
            conditions: [{ type: "file_exists", condition: "tsconfig.json" }],
            suggestions: [{ type: "code_fix", description: "Use strict mode in TypeScript configuration" }],
          },
        }),
        makeRule({
          id: "rule-b",
          rule: {
            trigger: { type: "file_pattern", pattern: "**/*.ts" },
            conditions: [{ type: "file_exists", condition: "tsconfig.json" }],
            suggestions: [{ type: "code_fix", description: "Use strict mode in TypeScript configuration" }],
          },
        }),
      ];
      const result = validator.checkConflicts(rules);
      expect(result.valid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it("should not flag different triggers", () => {
      const rules = [
        makeRule({
          id: "rule-a",
          rule: {
            trigger: { type: "file_pattern", pattern: "**/*.ts" },
            conditions: [{ type: "file_exists", condition: "tsconfig.json" }],
            suggestions: [{ type: "code_fix", description: "Apply TypeScript best practices for code quality" }],
          },
        }),
        makeRule({
          id: "rule-b",
          rule: {
            trigger: { type: "code_pattern", pattern: "console.log" },
            conditions: [{ type: "code_contains", condition: "console.log" }],
            suggestions: [{ type: "code_fix", description: "Replace console.log with proper logging framework" }],
          },
        }),
      ];
      const result = validator.checkConflicts(rules);
      expect(result.valid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("resolveDependencyIssues", () => {
    it("should provide suggestions for missing dependencies", () => {
      const rules = [makeRule({ id: "rule-a", depends_on: ["rule-x"] })];
      const result = validator.resolveDependencyIssues(rules);
      expect(result.valid).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain("rule-a");
      expect(result.suggestions[0]).toContain("rule-x");
    });

    it("should provide suggestions for circular dependencies", () => {
      const rules = [
        makeRule({ id: "rule-a", depends_on: ["rule-b"] }),
        makeRule({ id: "rule-b", depends_on: ["rule-a"] }),
      ];
      const result = validator.resolveDependencyIssues(rules);
      expect(result.valid).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes("循环"))).toBe(true);
    });

    it("should be valid when no issues exist", () => {
      const rules = [
        makeRule({ id: "rule-a", depends_on: ["rule-b"] }),
        makeRule({ id: "rule-b" }),
      ];
      const result = validator.resolveDependencyIssues(rules);
      expect(result.valid).toBe(true);
      expect(result.suggestions).toHaveLength(0);
    });
  });
});
