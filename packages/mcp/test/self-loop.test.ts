#!/usr/bin/env node
/**
 * RuleForge MCP 自循环测试
 *
 * 启动 MCP Server（stdio），然后用 MCP Client 连接，
 * 逐一调用所有 5 个 tool 验证端到端功能。
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

const RF_HOME =
  process.env.RF_HOME ||
  path.join(process.env.HOME || process.env.USERPROFILE || "", ".ruleforge");

async function main() {
  console.log("🚀 RuleForge MCP 自循环测试\n");

  // 1. 启动 Client，连接到 Server（stdio 自动启动子进程）
  const transport = new StdioClientTransport({
    command: "node",
    args: ["E:/code/ruleforge/packages/mcp/dist/index.js"],
    env: {
      ...process.env,
      RF_HOME,
    },
  });

  const client = new Client({ name: "ruleforge-test", version: "0.1.0" });
  await client.connect(transport);
  console.log("✅ 连接成功\n");

  // 2. 列出可用 tools
  const { tools } = await client.listTools();
  console.log(`📋 可用工具 (${tools.length} 个):`);
  for (const t of tools) {
    console.log(`   • ${t.name} — ${t.description}`);
  }
  console.log();

  // 3. 测试 rf_stats
  console.log("━━━ 测试 rf_stats ━━━");
  const statsResult = await client.callTool({ name: "rf_stats", arguments: {} });
  console.log(statsResult.content[0].type === "text" ? statsResult.content[0].text : JSON.stringify(statsResult));
  console.log();

  // 4. 测试 rf_rules（无过滤）
  console.log("━━━ 测试 rf_rules (全部) ━━━");
  const rulesResult = await client.callTool({ name: "rf_rules", arguments: {} });
  console.log(rulesResult.content[0].type === "text" ? rulesResult.content[0].text : JSON.stringify(rulesResult));
  console.log();

  // 5. 测试 rf_rules（按语言过滤）
  console.log("━━━ 测试 rf_rules (language=typescript) ━━━");
  const tsRulesResult = await client.callTool({
    name: "rf_rules",
    arguments: { language: "typescript", limit: 3 },
  });
  console.log(tsRulesResult.content[0].type === "text" ? tsRulesResult.content[0].text : JSON.stringify(tsRulesResult));
  console.log();

  // 6. 测试 rf_explain（用第一条规则的 ID）
  console.log("━━━ 测试 rf_explain ━━━");
  // 先获取规则列表拿到 ID
  const allRulesResult = await client.callTool({
    name: "rf_rules",
    arguments: { limit: 1 },
  });
  const firstRuleText = allRulesResult.content[0].type === "text" ? allRulesResult.content[0].text : "";
  // 从输出中提取规则名（格式：• **name**）
  const nameMatch = firstRuleText.match(/\*\*(.+?)\*\*/);
  if (nameMatch) {
    const ruleName = nameMatch[1];
    // 用规则名作为 ruleId（RuleStore 支持 name 或 id）
    const explainResult = await client.callTool({
      name: "rf_explain",
      arguments: { ruleId: ruleName },
    });
    console.log(explainResult.content[0].type === "text" ? explainResult.content[0].text : JSON.stringify(explainResult));
  } else {
    console.log("⚠️ 无法提取规则名，跳过 explain 测试");
  }
  console.log();

  // 7. 测试 rf_suggest（模拟修改一个 TypeScript 文件）
  console.log("━━━ 测试 rf_suggest ━━━");
  const suggestResult = await client.callTool({
    name: "rf_suggest",
    arguments: {
      filePath: "packages/core/src/store.ts",
      changeType: "modify",
    },
  });
  console.log(suggestResult.content[0].type === "text" ? suggestResult.content[0].text : JSON.stringify(suggestResult));
  console.log();

  // 8. 测试 rf_suggest_all（批量）
  console.log("━━━ 测试 rf_suggest_all ━━━");
  const batchResult = await client.callTool({
    name: "rf_suggest_all",
    arguments: {
      files: [
        { filePath: "packages/core/src/store.ts", changeType: "modify" },
        { filePath: "packages/core/src/matcher.ts", changeType: "create" },
      ],
    },
  });
  console.log(batchResult.content[0].type === "text" ? batchResult.content[0].text : JSON.stringify(batchResult));
  console.log();

  // 9. 断开连接
  await client.close();
  console.log("✅ 测试完成，连接已关闭");
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exit(1);
});
