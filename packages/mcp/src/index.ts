#!/usr/bin/env node
/**
 * RuleForge MCP Server
 *
 * 将 RuleForge 引擎暴露为 MCP (Model Context Protocol) 工具，
 * 支持 Cursor、Windsurf、VS Code Copilot 等 AI 编程助手调用。
 */

// @ts-nocheck — MCP SDK v1.29 + Zod v3.25 类型兼容问题，运行时无影响
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { RuleStore } from "@ruleforge/core";
import { RuleMatcher } from "@ruleforge/core";
import type { RuleYAML } from "@ruleforge/core";

// ── 配置 ──────────────────────────────────────────────

const RF_HOME =
  process.env.RF_HOME ||
  path.join(process.env.HOME || process.env.USERPROFILE || "", ".ruleforge");
const RULES_DIR = path.join(RF_HOME, "rules");

// ── 共享实例 ──────────────────────────────────────────

let store: RuleStore | null = null;
let matcher: RuleMatcher | null = null;

async function getStore(): Promise<RuleStore> {
  if (!store) {
    store = new RuleStore({ rulesDir: RULES_DIR, createIndex: true });
    await store.initialize();
  }
  return store;
}

async function getMatcher(): Promise<RuleMatcher> {
  if (!matcher) {
    const s = await getStore();
    matcher = new RuleMatcher(s);
  }
  return matcher;
}

// ── 辅助函数 ──────────────────────────────────────────

function getWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) return process.env.WORKSPACE_ROOT;
  try {
    const { execSync } = require("node:child_process");
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
  } catch {
    // fallback
  }
  return process.cwd();
}

function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".css": "css",
    ".scss": "scss",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".html": "html",
    ".vue": "vue",
    ".svelte": "svelte",
  };
  return map[ext] || ext.slice(1) || "unknown";
}

function formatRuleBrief(r: RuleYAML): string {
  const conf = Math.round(r.confidence * 100);
  const tags = r.meta.tags?.length ? ` [${r.meta.tags.join(", ")}]` : "";
  const langs = r.compatibility.languages.join(", ");
  const priority = r.priority || "project";
  return `• **${r.meta.name}** (${conf}%)\n  ${r.meta.description}${tags}\n  语言: ${langs} | 优先级: ${priority}`;
}

function formatRuleDetail(r: RuleYAML): string {
  const sections: string[] = [
    `📖 **${r.meta.name}** (v${r.meta.version})`,
    "",
    `描述: ${r.meta.description}`,
    `来源: ${r.meta.source || "手动创建"}`,
    `作用域: ${r.priority || "project"}`,
    `置信度: ${Math.round(r.confidence * 100)}%`,
  ];

  if (r.meta.tags?.length) {
    sections.push(`标签: ${r.meta.tags.join(", ")}`);
  }
  if (r.meta.scene) {
    sections.push(`场景: ${r.meta.scene}`);
  }

  sections.push("", "**触发条件:**");
  sections.push(`  类型: ${r.rule.trigger.type}`);
  sections.push(`  模式: \`${r.rule.trigger.pattern}\``);
  if (r.rule.trigger.file_types?.length) {
    sections.push(`  文件类型: ${r.rule.trigger.file_types.join(", ")}`);
  }

  if (r.rule.conditions.length > 0) {
    sections.push("", "**前置条件:**");
    for (const cond of r.rule.conditions) {
      const neg = cond.negated ? " (取反)" : "";
      sections.push(`  • ${cond.type}: \`${cond.condition}\`${neg}`);
    }
  }

  sections.push("", "**建议:**");
  for (const sug of r.rule.suggestions) {
    sections.push(`  • [${sug.type}] ${sug.description}`);
    if (sug.code) sections.push(`    代码: \`${sug.code}\``);
    if (sug.command) sections.push(`    命令: \`${sug.command}\``);
  }

  if (r.compatibility.languages.length > 0) {
    sections.push("", `**兼容性:** ${r.compatibility.languages.join(", ")}`);
  }
  if (r.compatibility.frameworks?.length) {
    sections.push(`**框架:** ${r.compatibility.frameworks.join(", ")}`);
  }
  if (r.depends_on?.length) {
    sections.push(`**依赖:** ${r.depends_on.join(", ")}`);
  }
  if (r.conflicts_with?.length) {
    sections.push(`**冲突:** ${r.conflicts_with.join(", ")}`);
  }

  return sections.join("\n");
}

function formatSuggestionResult(
  filePath: string,
  matches: Array<{ rule: RuleYAML; confidence: number; suggestions: any[] }>
): string {
  if (matches.length === 0) {
    return `📁 ${filePath} — 未匹配到适用规则`;
  }

  const lines = [`📁 ${filePath} — 匹配到 ${matches.length} 条规则:`];
  for (const m of matches) {
    const conf = Math.round(m.confidence * 100);
    lines.push(`\n  📌 **${m.rule.meta.name}** (${conf}%)`);
    for (const s of m.suggestions) {
      lines.push(`     • ${s.description}`);
      if (s.code) lines.push(`       代码: \`${s.code}\``);
      if (s.command) lines.push(`       命令: \`${s.command}\``);
    }
  }
  return lines.join("\n");
}

// ── MCP Server ────────────────────────────────────────

const server = new McpServer({
  name: "ruleforge",
  version: "0.1.0",
});

// ── Tool: rf_suggest ──────────────────────────────────

server.tool(
  "rf_suggest",
  "分析文件变更，返回适用的规则建议",
  {
    filePath: z.string().describe("变更文件的相对路径"),
    changeType: z
      .enum(["create", "modify", "delete", "rename"])
      .describe("变更类型"),
  },
  async ({ filePath, changeType }) => {
    try {
      const workspaceRoot = getWorkspaceRoot();
      const absolutePath = path.resolve(workspaceRoot, filePath);
      const content = readFileContent(absolutePath);
      const language = detectLanguage(filePath);

      const m = await getMatcher();
      const matches = await m.match(
        {
          filePath,
          fileContent: content,
          language,
        },
        { exactMatch: false }
      );

      const filtered = matches.filter((match) => {
        if (changeType === "delete") {
          return match.rule.rule.suggestions.some(
            (s) => s.type === "code_fix" || s.type === "command_run"
          );
        }
        return true;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: formatSuggestionResult(filePath, filtered),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 分析失败: ${error instanceof Error ? error.message : "未知错误"}`,
          },
        ],
      };
    }
  }
);

// ── Tool: rf_rules ────────────────────────────────────

server.tool(
  "rf_rules",
  "查询/搜索规则库中的规则",
  {
    query: z.string().optional().describe("搜索关键词（匹配名称、描述、标签）"),
    language: z.string().optional().describe("按语言过滤"),
    tag: z.string().optional().describe("按标签过滤"),
    limit: z.number().optional().describe("返回数量上限"),
  },
  async ({ query, language, tag, limit }) => {
    try {
      const s = await getStore();
      const rules = await s.list();

      let filtered = rules;

      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.meta.name.toLowerCase().includes(q) ||
            r.meta.description.toLowerCase().includes(q) ||
            r.meta.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }

      if (language) {
        filtered = filtered.filter((r) =>
          r.compatibility.languages.includes(language)
        );
      }

      if (tag) {
        filtered = filtered.filter((r) =>
          r.meta.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
      }

      if (limit && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      if (filtered.length === 0) {
        return {
          content: [{ type: "text" as const, text: "未找到匹配的规则。" }],
        };
      }

      const lines = [`找到 ${filtered.length} 条规则:\n`];
      for (const r of filtered) {
        lines.push(formatRuleBrief(r));
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 查询失败: ${error instanceof Error ? error.message : "未知错误"}`,
          },
        ],
      };
    }
  }
);

// ── Tool: rf_stats ────────────────────────────────────

server.tool(
  "rf_stats",
  "查看规则库概览（规则数量、语言分布等）",
  async () => {
    try {
      const s = await getStore();
      const rules = await s.list();

      if (rules.length === 0) {
        return {
          content: [
            { type: "text" as const, text: "规则库为空。" },
          ],
        };
      }

      const langMap = new Map<string, number>();
      for (const r of rules) {
        for (const lang of r.compatibility.languages) {
          langMap.set(lang, (langMap.get(lang) || 0) + 1);
        }
      }

      const prioMap = new Map<string, number>();
      for (const r of rules) {
        const p = r.priority || "project";
        prioMap.set(p, (prioMap.get(p) || 0) + 1);
      }

      const tagMap = new Map<string, number>();
      for (const r of rules) {
        for (const t of r.meta.tags || []) {
          tagMap.set(t, (tagMap.get(t) || 0) + 1);
        }
      }

      const lines = [
        `📊 **RuleForge 规则库概览**`,
        "",
        `规则总数: ${rules.length}`,
        "",
        "**语言分布:**",
      ];
      for (const [lang, count] of [...langMap.entries()].sort(
        (a, b) => b[1] - a[1]
      )) {
        lines.push(`  ${lang}: ${count}`);
      }

      lines.push("", "**优先级分布:**");
      for (const [prio, count] of prioMap) {
        lines.push(`  ${prio}: ${count}`);
      }

      if (tagMap.size > 0) {
        lines.push("", "**热门标签:**");
        for (const [tag, count] of [...tagMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)) {
          lines.push(`  ${tag}: ${count}`);
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 获取统计失败: ${error instanceof Error ? error.message : "未知错误"}`,
          },
        ],
      };
    }
  }
);

// ── Tool: rf_explain ──────────────────────────────────

server.tool(
  "rf_explain",
  "解释某条规则的来源、触发条件和上下文",
  {
    ruleId: z.string().describe("规则 ID"),
  },
  async ({ ruleId }) => {
    try {
      const s = await getStore();
      const rule = await s.load(ruleId);

      if (!rule) {
        return {
          content: [
            {
              type: "text" as const,
              text: `未找到规则 "${ruleId}"。使用 rf_rules 查看所有可用规则。`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text" as const, text: formatRuleDetail(rule) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 解释失败: ${error instanceof Error ? error.message : "未知错误"}`,
          },
        ],
      };
    }
  }
);

// ── Tool: rf_suggest_all ──────────────────────────────

server.tool(
  "rf_suggest_all",
  "批量分析多个文件，返回所有匹配规则",
  {
    files: z
      .array(
        z.object({
          filePath: z.string(),
          changeType: z.enum(["create", "modify", "delete", "rename"]),
        })
      )
      .describe("文件变更列表"),
  },
  async ({ files }) => {
    try {
      const workspaceRoot = getWorkspaceRoot();
      const m = await getMatcher();
      const results: string[] = [];

      for (const file of files) {
        const absolutePath = path.resolve(workspaceRoot, file.filePath);
        const content = readFileContent(absolutePath);
        const language = detectLanguage(file.filePath);

        const matches = await m.match(
          {
            filePath: file.filePath,
            fileContent: content,
            language,
          },
          { exactMatch: false }
        );

        results.push(formatSuggestionResult(file.filePath, matches));
      }

      const allEmpty = results.every((r) => r.includes("未匹配到"));
      const text = allEmpty
        ? "所有文件均未匹配到适用规则。"
        : results.join("\n\n");

      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 批量分析失败: ${error instanceof Error ? error.message : "未知错误"}`,
          },
        ],
      };
    }
  }
);

// ── 启动 ──────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`🔧 RuleForge MCP Server v0.1.0 started`);
  console.error(`   Rules dir: ${RULES_DIR}`);
}

main().catch((error) => {
  console.error("❌ Server startup failed:", error);
  process.exit(1);
});
