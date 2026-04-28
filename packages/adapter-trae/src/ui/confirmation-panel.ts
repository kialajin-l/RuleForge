/**
 * RuleForge Confirmation Panel
 * Displays candidate rules and handles save/skip actions.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RuleForgeEngine, RuleYAML } from '@ruleforge/core';

/**
 * User action options
 */
export enum RuleAction {
  Save = 'save',
  Skip = 'skip'
}

/**
 * Rule action result
 */
export interface RuleActionResult {
  rule: RuleYAML;
  action: RuleAction;
}

/**
 * Show confirmation panel for candidate rules
 */
export async function showConfirmationPanel(
  rules: RuleYAML[],
  engine: RuleForgeEngine,
  rulesDir: string,
  onSaved?: () => Promise<void>
): Promise<RuleActionResult[]> {
  if (rules.length === 0) {
    vscode.window.showInformationMessage('No candidate rules to review');
    return [];
  }

  const panel = vscode.window.createWebviewPanel(
    'ruleforge.confirmation',
    'RuleForge - Candidate Rules',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getWebviewContent(rules);

  const results: RuleActionResult[] = [];
  const messagePromise = new Promise<RuleActionResult[]>((resolve) => {
    const disposable = panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'action':
          results.push({ rule: rules[message.index], action: message.action });
          break;
        case 'done':
          disposable.dispose();
          panel.dispose();
          resolve(results);
          break;
        case 'cancel':
          disposable.dispose();
          panel.dispose();
          resolve([]);
          break;
      }
    });
  });

  const actionResults = await messagePromise;
  const saveResults = actionResults.filter(r => r.action === RuleAction.Save);
  if (saveResults.length > 0) {
    await handleSaveRules(saveResults, engine, rulesDir, onSaved);
  }
  return actionResults;
}

/**
 * Handle rule saving via core engine
 */
async function handleSaveRules(
  results: RuleActionResult[],
  engine: RuleForgeEngine,
  rulesDir: string,
  onSaved?: () => Promise<void>
): Promise<void> {
  await fs.mkdir(rulesDir, { recursive: true });
  let savedCount = 0;
  for (const result of results) {
    try {
      await engine.saveRule(result.rule);
      savedCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage('Failed to save rule: ' + errorMessage);
    }
  }
  if (savedCount > 0) {
    vscode.window.showInformationMessage(
      'RuleForge: Saved ' + savedCount + ' rule' + (savedCount > 1 ? 's' : '') + ' to local library'
    );
    if (onSaved) { await onSaved(); }
  }
}

/**
 * Generate Webview HTML content
 */
function getWebviewContent(rules: RuleYAML[]): string {
  const rulesHtml = rules.map((rule, index) => {
    const confidence = Math.round(rule.confidence * 100);
    const confidenceColor = getConfidenceColor(rule.confidence);
    const conditions = (rule.rule.conditions || [])
      .map(c => '<li>' + (c.negated ? '\u274c' : '\u2705') + ' <code>' + escapeHtml(c.condition) + '</code></li>')
      .join('');
    const suggestions = (rule.rule.suggestions || [])
      .map(s => '<li>' + escapeHtml(s.description) + (s.code ? '<pre><code>' + escapeHtml(s.code) + '</code></pre>' : '') + '</li>')
      .join('');
    return '<div class="rule-card">' +
      '<div class="rule-header"><h3>' + escapeHtml(rule.meta.name) + '</h3>' +
      '<span class="confidence" style="background-color:' + confidenceColor + '">' + confidence + '%</span></div>' +
      '<p class="description">' + escapeHtml(rule.meta.description) + '</p>' +
      '<div class="meta"><span>ID: ' + escapeHtml(rule.meta.id) + '</span>' +
      '<span>Version: ' + escapeHtml(rule.meta.version) + '</span>' +
      '<span>Languages: ' + (rule.compatibility.languages || []).join(', ') + '</span></div>' +
      (conditions ? '<div class="conditions"><strong>Conditions:</strong><ul>' + conditions + '</ul></div>' : '') +
      (suggestions ? '<div class="suggestions"><strong>Suggestions:</strong><ul>' + suggestions + '</ul></div>' : '') +
      '<div class="actions">' +
      '<button class="btn-save" onclick="handleAction(' + index + ', 'save')">Save</button>' +
      '<button class="btn-skip" onclick="handleAction(' + index + ', 'skip')">Skip</button>' +
      '</div></div>';
  }).join('');

  const css = [
    'body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground)}',
    'h2{margin-bottom:20px}',
    '.rule-card{border:1px solid var(--vscode-widget-border);border-radius:8px;padding:16px;margin-bottom:16px;background:var(--vscode-editor-background)}',
    '.rule-header{display:flex;justify-content:space-between;align-items:center}',
    '.rule-header h3{margin:0}',
    '.confidence{padding:4px 8px;border-radius:4px;color:white;font-weight:bold;font-size:12px}',
    '.description{color:var(--vscode-descriptionForeground);margin:8px 0}',
    '.meta{font-size:12px;color:var(--vscode-descriptionForeground);margin-bottom:8px}',
    '.meta span{margin-right:16px}',
    '.conditions,.suggestions{margin:8px 0}',
    '.conditions ul,.suggestions ul{margin:4px 0;padding-left:20px}',
    '.actions{margin-top:12px;display:flex;gap:8px}',
    '.btn-save,.btn-skip{padding:6px 16px;border:none;border-radius:4px;cursor:pointer;font-size:13px}',
    '.btn-save{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}',
    '.btn-save:hover{background:var(--vscode-button-hoverBackground)}',
    '.btn-skip{background:var(--vscode-secondaryButton-background);color:var(--vscode-secondaryButton-foreground)}',
    '.btn-skip:hover{background:var(--vscode-secondaryButton-hoverBackground)}',
    'pre{background:var(--vscode-textCodeBlock-background);padding:8px;border-radius:4px;overflow-x:auto}',
    'code{font-family:var(--vscode-editor-font-family)}'
  ].join('');

  const js = [
    'const vscode = acquireVsCodeApi();',
    'const totalRules = ' + rules.length + ';',
    'let processedCount = 0;',
    'function handleAction(index, action) {',
    '  vscode.postMessage({ command: "action", index, action });',
    '  processedCount++;',
    '  if (processedCount >= totalRules) { vscode.postMessage({ command: "done" }); }',
    '}',
    'function saveAll() {',
    '  for (let i = 0; i < totalRules; i++) { vscode.postMessage({ command: "action", index: i, action: "save" }); }',
    '  vscode.postMessage({ command: "done" });',
    '}',
    'function skipAll() { vscode.postMessage({ command: "cancel" }); }'
  ].join('');

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>RuleForge - Candidate Rules</title>' +
    '<style>' + css + '</style></head><body>' +
    '<h2>RuleForge - Candidate Rules (' + rules.length + ' found)</h2>' +
    '<p>Review the extracted rules below. Save rules you want to keep in your local rule library.</p>' +
    '<div id="rules">' + rulesHtml + '</div>' +
    '<div style="margin-top:20px;display:flex;gap:8px">' +
    '<button class="btn-save" onclick="saveAll()">Save All</button>' +
    '<button class="btn-skip" onclick="skipAll()">Skip All</button></div>' +
    '<script>' + js + '</script></body></html>';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#28a745';
  if (confidence >= 0.6) return '#ffc107';
  return '#dc3545';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
