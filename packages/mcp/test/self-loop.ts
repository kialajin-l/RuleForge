#!/usr/bin/env node
/**
 * RuleForge MCP 自循环测试
 *
 * 启动 MCP Server 进程，通过 stdio 连接 Client，
 * 验证所有 5 个工具的端到端调用。
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// @ts-expect-error - StdioClientTransport 类型声明路径未在 exports 中显式声明
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

const SERVER_PATH = path.resolve(__dirname, "../dist/index.js");

interface TestResult {
  name: string;
  ok: boolean;
  detail: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  fn: () => Promise<string>
): Promise<void> {
  const start = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail, duration: Date.now() - start });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      name,
      ok: false,
      detail: err.message || String(err),
      duration: Date.now() - start,
    });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log("\n🔬 RuleForge MCP Self-Loop Test\n");

  const testRfHome = path.resolve(__dirname, "../../.test-rf-home");
  const testWorkspace = path.resolve(__dirname, "../..");

  // 连接 client
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    env: {
      ...process.env,
      RF_HOME: testRfHome,
      WORKSPACE_ROOT: testWorkspace,
    },
  });

  const client = new Client({
    name: "ruleforge-test-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server\n");
  } catch (err: any) {
    console.error("Failed to connect:", err.message);
    process.exit(1);
  }

  // ── Test 1: List tools ──
  await runTest("list tools", async () => {
    const resp = await client.request(
      { method: "tools/list" },
      {} as any
    );
    const tools = (resp as any).tools;
    if (!Array.isArray(tools)) throw new Error("tools is not an array");
    const names = tools.map((t: any) => t.name);
    const expected = ["rf_suggest", "rf_rules", "rf_stats", "rf_explain", "rf_suggest_all"];
    for (const n of expected) {
      if (!names.includes(n)) throw new Error(`Missing tool: ${n}`);
    }
    return `Found ${tools.length} tools: ${names.join(", ")}`;
  });

  // ── Test 2: rf_rules (empty library) ──
  await runTest("rf_rules (empty library)", async () => {
    const resp = await client.request(
      {
        method: "tools/call",
        params: { name: "rf_rules", arguments: {} },
      },
      {} as any
    );
    const content = (resp as any).content;
    if (!Array.isArray(content)) throw new Error("content is not an array");
    return content[0]?.text || "no text";
  });

  // ── Test 3: rf_stats (empty library) ──
  await runTest("rf_stats (empty library)", async () => {
    const resp = await client.request(
      {
        method: "tools/call",
        params: { name: "rf_stats", arguments: {} },
      },
      {} as any
    );
    const content = (resp as any).content;
    return content[0]?.text || "no text";
  });

  // ── Test 4: rf_suggest (no matching rules) ──
  await runTest("rf_suggest (no matching rules)", async () => {
    const resp = await client.request(
      {
        method: "tools/call",
        params: {
          name: "rf_suggest",
          arguments: { filePath: "test.ts", changeType: "modify" },
        },
      },
      {} as any
    );
    const content = (resp as any).content;
    return content[0]?.text || "no text";
  });

  // ── Test 5: rf_explain (non-existent rule) ──
  await runTest("rf_explain (non-existent rule)", async () => {
    const resp = await client.request(
      {
        method: "tools/call",
        params: {
          name: "rf_explain",
          arguments: { ruleId: "nonexistent" },
        },
      },
      {} as any
    );
    const content = (resp as any).content;
    return content[0]?.text || "no text";
  });

  // ── Test 6: rf_suggest_all (batch) ──
  await runTest("rf_suggest_all (batch)", async () => {
    const resp = await client.request(
      {
        method: "tools/call",
        params: {
          name: "rf_suggest_all",
          arguments: {
            files: [
              { filePath: "a.ts", changeType: "modify" },
              { filePath: "b.py", changeType: "create" },
            ],
          },
        },
      },
      {} as any
    );
    const content = (resp as any).content;
    return content[0]?.text || "no text";
  });

  // ── Summary ──
  console.log("\n" + "─".repeat(50));
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const totalTime = results.reduce((s, r) => s + r.duration, 0);
  console.log(
    `\n📊 Results: ${passed} passed, ${failed} failed (${totalTime}ms total)`
  );

  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
  }

  // Cleanup
  await client.close().catch(() => {});

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
