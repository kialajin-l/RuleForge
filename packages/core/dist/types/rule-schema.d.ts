/**
 * RuleForge Engine Protocol (REP) v0.1 Schema
 * 使用 Zod 定义规则验证模式
 */
import { z } from 'zod';
export declare const RuleMetaSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    authors: z.ZodArray<z.ZodString, "many">;
    license: z.ZodEnum<["MIT", "Apache-2.0", "BSD-3-Clause"]>;
    created: z.ZodString;
    updated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    id: string;
    version: string;
    authors: string[];
    license: "MIT" | "Apache-2.0" | "BSD-3-Clause";
    created: string;
    updated: string;
}, {
    name: string;
    description: string;
    id: string;
    version: string;
    authors: string[];
    license: "MIT" | "Apache-2.0" | "BSD-3-Clause";
    created: string;
    updated: string;
}>;
export declare const RuleTriggerSchema: z.ZodObject<{
    type: z.ZodEnum<["file_pattern", "code_pattern", "command", "git_operation"]>;
    pattern: z.ZodString;
    file_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    context: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "file_pattern" | "code_pattern" | "command" | "git_operation";
    pattern: string;
    file_types?: string[] | undefined;
    context?: string | undefined;
}, {
    type: "file_pattern" | "code_pattern" | "command" | "git_operation";
    pattern: string;
    file_types?: string[] | undefined;
    context?: string | undefined;
}>;
export declare const RuleConditionSchema: z.ZodObject<{
    type: z.ZodEnum<["file_exists", "code_contains", "dependency_check", "config_check"]>;
    condition: z.ZodString;
    negated: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
    condition: string;
    negated?: boolean | undefined;
}, {
    type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
    condition: string;
    negated?: boolean | undefined;
}>;
export declare const RuleSuggestionSchema: z.ZodObject<{
    type: z.ZodEnum<["code_fix", "config_change", "dependency_add", "command_run"]>;
    description: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    command: z.ZodOptional<z.ZodString>;
    files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "code_fix" | "config_change" | "dependency_add" | "command_run";
    description: string;
    code?: string | undefined;
    command?: string | undefined;
    files?: string[] | undefined;
}, {
    type: "code_fix" | "config_change" | "dependency_add" | "command_run";
    description: string;
    code?: string | undefined;
    command?: string | undefined;
    files?: string[] | undefined;
}>;
export declare const RuleCompatibilitySchema: z.ZodObject<{
    languages: z.ZodArray<z.ZodString, "many">;
    frameworks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    min_version: z.ZodOptional<z.ZodString>;
    max_version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    languages: string[];
    frameworks?: string[] | undefined;
    tools?: string[] | undefined;
    min_version?: string | undefined;
    max_version?: string | undefined;
}, {
    languages: string[];
    frameworks?: string[] | undefined;
    tools?: string[] | undefined;
    min_version?: string | undefined;
    max_version?: string | undefined;
}>;
export declare const RuleContentSchema: z.ZodObject<{
    trigger: z.ZodObject<{
        type: z.ZodEnum<["file_pattern", "code_pattern", "command", "git_operation"]>;
        pattern: z.ZodString;
        file_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        context: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "file_pattern" | "code_pattern" | "command" | "git_operation";
        pattern: string;
        file_types?: string[] | undefined;
        context?: string | undefined;
    }, {
        type: "file_pattern" | "code_pattern" | "command" | "git_operation";
        pattern: string;
        file_types?: string[] | undefined;
        context?: string | undefined;
    }>;
    conditions: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["file_exists", "code_contains", "dependency_check", "config_check"]>;
        condition: z.ZodString;
        negated: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
        condition: string;
        negated?: boolean | undefined;
    }, {
        type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
        condition: string;
        negated?: boolean | undefined;
    }>, "many">;
    suggestions: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["code_fix", "config_change", "dependency_add", "command_run"]>;
        description: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
        command: z.ZodOptional<z.ZodString>;
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "code_fix" | "config_change" | "dependency_add" | "command_run";
        description: string;
        code?: string | undefined;
        command?: string | undefined;
        files?: string[] | undefined;
    }, {
        type: "code_fix" | "config_change" | "dependency_add" | "command_run";
        description: string;
        code?: string | undefined;
        command?: string | undefined;
        files?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    trigger: {
        type: "file_pattern" | "code_pattern" | "command" | "git_operation";
        pattern: string;
        file_types?: string[] | undefined;
        context?: string | undefined;
    };
    conditions: {
        type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
        condition: string;
        negated?: boolean | undefined;
    }[];
    suggestions: {
        type: "code_fix" | "config_change" | "dependency_add" | "command_run";
        description: string;
        code?: string | undefined;
        command?: string | undefined;
        files?: string[] | undefined;
    }[];
}, {
    trigger: {
        type: "file_pattern" | "code_pattern" | "command" | "git_operation";
        pattern: string;
        file_types?: string[] | undefined;
        context?: string | undefined;
    };
    conditions: {
        type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
        condition: string;
        negated?: boolean | undefined;
    }[];
    suggestions: {
        type: "code_fix" | "config_change" | "dependency_add" | "command_run";
        description: string;
        code?: string | undefined;
        command?: string | undefined;
        files?: string[] | undefined;
    }[];
}>;
export declare const RuleSchema: z.ZodObject<{
    meta: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        version: z.ZodString;
        description: z.ZodString;
        authors: z.ZodArray<z.ZodString, "many">;
        license: z.ZodEnum<["MIT", "Apache-2.0", "BSD-3-Clause"]>;
        created: z.ZodString;
        updated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        id: string;
        version: string;
        authors: string[];
        license: "MIT" | "Apache-2.0" | "BSD-3-Clause";
        created: string;
        updated: string;
    }, {
        name: string;
        description: string;
        id: string;
        version: string;
        authors: string[];
        license: "MIT" | "Apache-2.0" | "BSD-3-Clause";
        created: string;
        updated: string;
    }>;
    rule: z.ZodObject<{
        trigger: z.ZodObject<{
            type: z.ZodEnum<["file_pattern", "code_pattern", "command", "git_operation"]>;
            pattern: z.ZodString;
            file_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            context: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "file_pattern" | "code_pattern" | "command" | "git_operation";
            pattern: string;
            file_types?: string[] | undefined;
            context?: string | undefined;
        }, {
            type: "file_pattern" | "code_pattern" | "command" | "git_operation";
            pattern: string;
            file_types?: string[] | undefined;
            context?: string | undefined;
        }>;
        conditions: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["file_exists", "code_contains", "dependency_check", "config_check"]>;
            condition: z.ZodString;
            negated: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
            condition: string;
            negated?: boolean | undefined;
        }, {
            type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
            condition: string;
            negated?: boolean | undefined;
        }>, "many">;
        suggestions: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["code_fix", "config_change", "dependency_add", "command_run"]>;
            description: z.ZodString;
            code: z.ZodOptional<z.ZodString>;
            command: z.ZodOptional<z.ZodString>;
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "code_fix" | "config_change" | "dependency_add" | "command_run";
            description: string;
            code?: string | undefined;
            command?: string | undefined;
            files?: string[] | undefined;
        }, {
            type: "code_fix" | "config_change" | "dependency_add" | "command_run";
            description: string;
            code?: string | undefined;
            command?: string | undefined;
            files?: string[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        trigger: {
            type: "file_pattern" | "code_pattern" | "command" | "git_operation";
            pattern: string;
            file_types?: string[] | undefined;
            context?: string | undefined;
        };
        conditions: {
            type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
            condition: string;
            negated?: boolean | undefined;
        }[];
        suggestions: {
            type: "code_fix" | "config_change" | "dependency_add" | "command_run";
            description: string;
            code?: string | undefined;
            command?: string | undefined;
            files?: string[] | undefined;
        }[];
    }, {
        trigger: {
            type: "file_pattern" | "code_pattern" | "command" | "git_operation";
            pattern: string;
            file_types?: string[] | undefined;
            context?: string | undefined;
        };
        conditions: {
            type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
            condition: string;
            negated?: boolean | undefined;
        }[];
        suggestions: {
            type: "code_fix" | "config_change" | "dependency_add" | "command_run";
            description: string;
            code?: string | undefined;
            command?: string | undefined;
            files?: string[] | undefined;
        }[];
    }>;
    compatibility: z.ZodObject<{
        languages: z.ZodArray<z.ZodString, "many">;
        frameworks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        min_version: z.ZodOptional<z.ZodString>;
        max_version: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        languages: string[];
        frameworks?: string[] | undefined;
        tools?: string[] | undefined;
        min_version?: string | undefined;
        max_version?: string | undefined;
    }, {
        languages: string[];
        frameworks?: string[] | undefined;
        tools?: string[] | undefined;
        min_version?: string | undefined;
        max_version?: string | undefined;
    }>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    meta: {
        name: string;
        description: string;
        id: string;
        version: string;
        authors: string[];
        license: "MIT" | "Apache-2.0" | "BSD-3-Clause";
        created: string;
        updated: string;
    };
    rule: {
        trigger: {
            type: "file_pattern" | "code_pattern" | "command" | "git_operation";
            pattern: string;
            file_types?: string[] | undefined;
            context?: string | undefined;
        };
        conditions: {
            type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
            condition: string;
            negated?: boolean | undefined;
        }[];
        suggestions: {
            type: "code_fix" | "config_change" | "dependency_add" | "command_run";
            description: string;
            code?: string | undefined;
            command?: string | undefined;
            files?: string[] | undefined;
        }[];
    };
    compatibility: {
        languages: string[];
        frameworks?: string[] | undefined;
        tools?: string[] | undefined;
        min_version?: string | undefined;
        max_version?: string | undefined;
    };
}, {
    confidence: number;
    meta: {
        name: string;
        description: string;
        id: string;
        version: string;
        authors: string[];
        license: "MIT" | "Apache-2.0" | "BSD-3-Clause";
        created: string;
        updated: string;
    };
    rule: {
        trigger: {
            type: "file_pattern" | "code_pattern" | "command" | "git_operation";
            pattern: string;
            file_types?: string[] | undefined;
            context?: string | undefined;
        };
        conditions: {
            type: "file_exists" | "code_contains" | "dependency_check" | "config_check";
            condition: string;
            negated?: boolean | undefined;
        }[];
        suggestions: {
            type: "code_fix" | "config_change" | "dependency_add" | "command_run";
            description: string;
            code?: string | undefined;
            command?: string | undefined;
            files?: string[] | undefined;
        }[];
    };
    compatibility: {
        languages: string[];
        frameworks?: string[] | undefined;
        tools?: string[] | undefined;
        min_version?: string | undefined;
        max_version?: string | undefined;
    };
}>;
export type RuleYAML = z.infer<typeof RuleSchema>;
export type RuleMeta = z.infer<typeof RuleMetaSchema>;
export type RuleTrigger = z.infer<typeof RuleTriggerSchema>;
export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type RuleSuggestion = z.infer<typeof RuleSuggestionSchema>;
export type RuleCompatibility = z.infer<typeof RuleCompatibilitySchema>;
//# sourceMappingURL=rule-schema.d.ts.map