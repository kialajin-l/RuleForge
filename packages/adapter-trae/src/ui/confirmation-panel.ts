/**
 * RuleForge 确认面板 UI 组件
 * 
 * 功能：
 * - 显示候选规则列表
 * - 提供"分享"/"本地保存"/"稍后"按钮
 * - 处理用户选择并执行相应操作
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RuleWithConfidence } from '@ruleforge/core';

/**
 * 用户操作选项
 */
export enum RuleAction {
  Share = 'share',
  SaveLocal = 'save_local',
  Later = 'later'
}

/**
 * 规则操作结果
 */
export interface RuleActionResult {
  rule: RuleWithConfidence;
  action: RuleAction;
}

/**
 * 显示确认面板
 * 
 * @param rules - 候选规则列表
 * @returns 用户操作结果数组
 */
export async function showConfirmationPanel(rules: RuleWithConfidence[]): Promise<RuleActionResult[]> {
  if (rules.length === 0) {
    vscode.window.showInformationMessage('没有候选规则需要确认');
    return [];
  }

  // 创建 Webview 面板
  const panel = vscode.window.createWebviewPanel(
    'ruleforge.confirmation',
    'RuleForge - 候选规则确认',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  // 设置 Webview 内容
  panel.webview.html = getWebviewContent(rules);

  // 处理消息
  const results: RuleActionResult[] = [];
  const messagePromise = new Promise<RuleActionResult[]>((resolve) => {
    const disposable = panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'action':
          results.push({
            rule: rules[message.index],
            action: message.action
          });
          break;
        case 'done':
          disposable.dispose();
          resolve(results);
          break;
      }
    });

    // 面板关闭时 resolve
    panel.onDidDispose(() => {
      disposable.dispose();
      resolve(results);
    });
  });

  // 等待用户操作
  const actionResults = await messagePromise;
  panel.dispose();

  // 处理结果
  await processResults(actionResults);

  return actionResults;
}

/**
 * 获取 Webview HTML 内容
 * 
 * @param rules - 候选规则列表
 * @returns HTML 字符串
 */
function getWebviewContent(rules: RuleWithConfidence[]): string {
  const rulesHtml = rules.map((rule, index) => `
    <div class="rule-card" data-index="${index}">
      <div class="rule-header">
        <h3>${escapeHtml(rule.meta.name)}</h3>
        <span class="confidence-badge" style="background-color: ${getConfidenceColor(rule.confidence)}">
          ${(rule.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <p class="rule-description">${escapeHtml(rule.meta.description || '无描述')}</p>
      <div class="rule-meta">
        <span class="meta-item">📁 ${escapeHtml(rule.compatibility.languages.join(', '))}</span>
        <span class="meta-item">🔧 ${escapeHtml(rule.compatibility.frameworks?.join(', ') || '无')}</span>
      </div>
      <div class="rule-actions">
        <button class="btn btn-share" onclick="handleAction(${index}, 'share')">
          🌐 分享
        </button>
        <button class="btn btn-save" onclick="handleAction(${index}, 'save_local')">
          💾 本地保存
        </button>
        <button class="btn btn-later" onclick="handleAction(${index}, 'later')">
          ⏰ 稍后
        </button>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RuleForge 确认面板</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        .rule-card {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .rule-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .confidence-badge {
          padding: 4px 8px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .rule-description {
          margin: 8px 0;
          color: var(--vscode-descriptionForeground);
        }
        .rule-meta {
          display: flex;
          gap: 16px;
          margin: 12px 0;
          font-size: 14px;
        }
        .meta-item {
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .rule-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .btn:hover {
          opacity: 0.9;
        }
        .btn-share {
          background-color: #0066CC;
          color: white;
        }
        .btn-save {
          background-color: #28a745;
          color: white;
        }
        .btn-later {
          background-color: #6c757d;
          color: white;
        }
        .summary {
          margin-top: 20px;
          padding: 16px;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 8px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>🔍 发现 ${rules.length} 个可复用规则</h1>
      ${rulesHtml}
      <div class="summary">
        <button class="btn btn-share" onclick="done()" style="width: 200px;">
          ✅ 完成
        </button>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        
        function handleAction(index, action) {
          vscode.postMessage({
            command: 'action',
            index: index,
            action: action
          });
          
          // 视觉反馈
          const card = document.querySelector(\`.rule-card[data-index="\${index}"]\`);
          card.style.opacity = '0.5';
          card.querySelector('.rule-actions').innerHTML = '<span style="color: #28a745;">✓ 已处理</span>';
        }
        
        function done() {
          vscode.postMessage({
            command: 'done'
          });
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * 处理用户操作结果
 * 
 * @param results - 操作结果数组
 */
async function processResults(results: RuleActionResult[]): Promise<void> {
  const shareRules = results.filter(r => r.action === RuleAction.Share);
  const saveLocalRules = results.filter(r => r.action === RuleAction.SaveLocal);

  // 处理分享
  if (shareRules.length > 0) {
    await handleShareRules(shareRules);
  }

  // 处理本地保存
  if (saveLocalRules.length > 0) {
    await handleSaveLocalRules(saveLocalRules);
  }

  // 显示总结
  const summary = [];
  if (shareRules.length > 0) {
    summary.push(`${shareRules.length} 个规则将分享`);
  }
  if (saveLocalRules.length > 0) {
    summary.push(`${saveLocalRules.length} 个规则已本地保存`);
  }
  if (summary.length > 0) {
    vscode.window.showInformationMessage(`RuleForge: ${summary.join('，')}`);
  }
}

/**
 * 处理规则分享
 * 
 * @param results - 要分享的规则结果
 */
async function handleShareRules(results: RuleActionResult[]): Promise<void> {
  // TODO: 实现分享逻辑
  // 1. 生成 YAML 文件
  // 2. 创建 GitHub PR
  // 3. 通知用户
  
  console.log('分享规则:', results.map(r => r.rule.meta.id));
}

/**
 * 处理规则本地保存
 * 
 * @param results - 要本地保存的规则结果
 */
async function handleSaveLocalRules(results: RuleActionResult[]): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('请先打开工作区');
    return;
  }

  const rulesDir = path.join(workspaceFolder.uri.fsPath, '.ruleforge', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });

  for (const result of results) {
    try {
      const rule = result.rule;
      const fileName = `${rule.meta.id}.yaml`;
      const filePath = path.join(rulesDir, fileName);

      // TODO: 使用 RuleForgeEngine 格式化规则
      const yamlContent = `# RuleForge 规则
# ID: ${rule.meta.id}
# 名称: ${rule.meta.name}
# 置信度: ${(rule.confidence * 100).toFixed(0)}%

# 规则内容待实现
`;

      await fs.writeFile(filePath, yamlContent, 'utf-8');
      console.log(`保存规则: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`保存规则失败: ${errorMessage}`);
    }
  }
}

/**
 * 获取置信度颜色
 * 
 * @param confidence - 置信度值 (0-1)
 * @returns 颜色字符串
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) {
    return '#28a745'; // 绿色
  } else if (confidence >= 0.6) {
    return '#ffc107'; // 黄色
  } else {
    return '#dc3545'; // 红色
  }
}

/**
 * 转义 HTML 特殊字符
 * 
 * @param text - 原始文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
