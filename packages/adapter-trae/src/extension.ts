/**
 * RuleForge for Trae/VSCode - Plugin Entry (v1.0)
 *
 * Core loop: Record -> Analyze -> Extract -> Confirm -> Save -> Inject
 *
 * Features:
 * - Session log recording (file save events)
 * - Auto-trigger extraction (save threshold + idle detection)
 * - Manual extraction command
 * - Candidate rule confirmation panel
 * - Rule injection into AI context (.ruleforge/rules.md)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RuleForgeEngine, RuleYAML } from '@ruleforge/core';
import { showConfirmationPanel } from './ui/confirmation-panel';
import { RuleForgeConfig } from './config/ruleforge-config';
import { RuleInjector } from './bridge/rule-injector';

/**
 * Output channel
 */
let outputChannel: vscode.OutputChannel;

/**
 * Core engine instance
 */
let engine: RuleForgeEngine;

/**
 * Plugin configuration
 */
let config: RuleForgeConfig;

/**
 * Rule injector
 */
let ruleInjector: RuleInjector;

/**
 * Session log storage path
 */
let sessionLogPath: string;

/**
 * Auto-trigger state
 */
let saveCount = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let isExtracting = false;

/**
 * Activate plugin
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('RuleForge');
  context.subscriptions.push(outputChannel);

  log('RuleForge v1.0 activating...');

  try {
    // Initialize engine
    engine = new RuleForgeEngine();

    // Load project config
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const workspaceRoot = workspaceFolder.uri.fsPath;
      config = new RuleForgeConfig(workspaceRoot);
      await config.load();

      // Set session log path from config
      sessionLogPath = config.getLogDir();
      await fs.mkdir(sessionLogPath, { recursive: true });
      log('Session log path: ' + sessionLogPath);

      // Initialize rule injector
      ruleInjector = new RuleInjector(engine, config, workspaceRoot, outputChannel);

      // Sync rules to conventions file on startup
      await ruleInjector.syncToConventionsFile();
    } else {
      // Fallback without workspace
      sessionLogPath = path.join(
        context.globalStorageUri.fsPath,
        'logs'
      );
      await fs.mkdir(sessionLogPath, { recursive: true });
      log('No workspace open, using global storage: ' + sessionLogPath);
    }

    // Initialize engine (with error tolerance)
    await engine.initialize().catch((error) => {
      log('Config load failed, using defaults: ' + (error instanceof Error ? error.message : 'unknown'), 'warn');
    });

    // Register commands
    registerCommands(context);

    // Register file save listener
    registerFileSaveListener(context);

    log('RuleForge v1.0 activated successfully');

  } catch (error) {
    log('Activation failed: ' + (error instanceof Error ? error.message : 'unknown'), 'error');
  }
}

/**
 * Register all commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Manual extract command
  const extractCmd = vscode.commands.registerCommand('ruleforge.extract', async () => {
    await runExtraction(true);
  });
  context.subscriptions.push(extractCmd);

  // View rules command
  const viewRulesCmd = vscode.commands.registerCommand('ruleforge.viewRules', async () => {
    await showRulesQuickPick();
  });
  context.subscriptions.push(viewRulesCmd);

  // Sync rules command
  const syncCmd = vscode.commands.registerCommand('ruleforge.syncRules', async () => {
    if (ruleInjector) {
      const synced = await ruleInjector.syncToConventionsFile();
      if (synced) {
        vscode.window.showInformationMessage('RuleForge: Rules synced to conventions file');
      } else {
        vscode.window.showInformationMessage('RuleForge: No rules to sync');
      }
    }
  });
  context.subscriptions.push(syncCmd);
}

/**
 * Register file save listener with auto-trigger
 */
function registerFileSaveListener(context: vscode.ExtensionContext): void {
  const listener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    // Skip non-code files
    if (!isCodeFile(document.fileName)) {
      return;
    }

    // Record to session log
    await appendToSessionLog({
      type: 'file_save',
      timestamp: new Date().toISOString(),
      fileName: document.fileName,
      language: document.languageId,
      lineCount: document.lineCount
    });

    // Auto-trigger logic
    if (config) {
      const autoConfig = config.getSection('autoTrigger');
      if (autoConfig.enabled) {
        saveCount++;

        // Reset idle timer
        resetIdleTimer(autoConfig.idleMinutes);

        // Check save threshold
        if (saveCount >= autoConfig.saveThreshold) {
          log('Save threshold reached (' + saveCount + '/' + autoConfig.saveThreshold + '), triggering extraction...');
          saveCount = 0;
          await runExtraction(false);
        }
      }
    }
  });

  context.subscriptions.push({ dispose: () => listener.dispose() });
}

/**
 * Reset the idle detection timer
 */
function resetIdleTimer(idleMinutes: number): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(async () => {
    log('Idle timeout reached (' + idleMinutes + ' min), triggering extraction...');
    saveCount = 0;
    await runExtraction(false);
  }, idleMinutes * 60 * 1000);
}

/**
 * Run rule extraction from session logs
 */
async function runExtraction(manual: boolean): Promise<void> {
  if (isExtracting) {
    if (manual) {
      vscode.window.showInformationMessage('RuleForge: Extraction already in progress');
    }
    return;
  }

  isExtracting = true;

  try {
    if (manual) {
      vscode.window.showInformationMessage('RuleForge: Starting rule extraction...');
    }

    // Get recent log files (last 7 days)
    const logFiles = await getRecentLogFiles();
    if (logFiles.length === 0) {
      if (manual) {
        vscode.window.showInformationMessage('RuleForge: No session logs found');
      }
      return;
    }

    // Extract rules from each log file
    const allRules: RuleYAML[] = [];
    const minConfidence = config
      ? config.getSection('extraction').minConfidence
      : 0.7;

    for (const logFile of logFiles) {
      try {
        const result = await engine.extractOnly({
          sessionId: path.basename(logFile, path.extname(logFile)),
          logPath: logFile,
          minConfidence
        });

        if (result && result.rules) {
          allRules.push(...result.rules);
        }
      } catch (error) {
        log('Extraction failed for ' + logFile + ': ' + (error instanceof Error ? error.message : 'unknown'), 'warn');
      }
    }

    if (allRules.length === 0) {
      if (manual) {
        vscode.window.showInformationMessage('RuleForge: No rules found in session logs');
      }
      return;
    }

    // Deduplicate rules by ID
    const uniqueRules = deduplicateRules(allRules);

    log('Found ' + uniqueRules.length + ' candidate rule(s)');

    // Show confirmation panel
    const rulesDir = config ? config.getRulesDir() : path.join(
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
      '.ruleforge', 'rules'
    );

    const results = await showConfirmationPanel(
      uniqueRules,
      engine,
      rulesDir,
      // onSaved callback: sync rules to conventions file
      async () => {
        if (ruleInjector) {
          await ruleInjector.syncToConventionsFile();
        }
      }
    );

    const savedCount = results.filter(r => r.action === 'save').length;
    if (savedCount > 0) {
      log('User saved ' + savedCount + ' rule(s)');
    }

  } catch (error) {
    log('Extraction failed: ' + (error instanceof Error ? error.message : 'unknown'), 'error');
    if (manual) {
      vscode.window.showErrorMessage('RuleForge: Extraction failed');
    }
  } finally {
    isExtracting = false;
  }
}

/**
 * Show rules in quick pick
 */
async function showRulesQuickPick(): Promise<void> {
  if (!config) {
    vscode.window.showWarningMessage('RuleForge: No project config found');
    return;
  }

  const rulesDir = config.getRulesDir();
  try {
    const files = await fs.readdir(rulesDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    if (yamlFiles.length === 0) {
      vscode.window.showInformationMessage('RuleForge: No rules saved yet');
      return;
    }

    const items = yamlFiles.map(f => ({
      label: f.replace(/.(yaml|yml)$/, ''),
      description: f
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a rule to view'
    });

    if (selected) {
      const filePath = path.join(rulesDir, selected.description);
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    }
  } catch (error) {
    vscode.window.showErrorMessage('RuleForge: Failed to list rules');
  }
}

/**
 * Check if file is a code file
 */
function isCodeFile(fileName: string): boolean {
  const codeExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.java',
    '.go', '.rs', '.cpp', '.c', '.h', '.cs', '.rb', '.php',
    '.swift', '.kt', '.scala', '.html', '.css', '.scss', '.json'
  ];
  const ext = path.extname(fileName).toLowerCase();
  return codeExtensions.includes(ext);
}

/**
 * Deduplicate rules by ID
 */
function deduplicateRules(rules: RuleYAML[]): RuleYAML[] {
  const seen = new Map<string, RuleYAML>();
  for (const rule of rules) {
    const existing = seen.get(rule.meta.id);
    if (!existing || rule.confidence > existing.confidence) {
      seen.set(rule.meta.id, rule);
    }
  }
  return Array.from(seen.values());
}

/**
 * Get recent log files (last 7 days)
 */
async function getRecentLogFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(sessionLogPath);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentFiles: string[] = [];

    for (const file of jsonlFiles) {
      const filePath = path.join(sessionLogPath, file);
      const stats = await fs.stat(filePath);
      if (stats.mtimeMs > sevenDaysAgo) {
        recentFiles.push(filePath);
      }
    }

    return recentFiles.sort((a, b) => {
      const statA = fs.stat(a);
      const statB = fs.stat(b);
      return Promise.all([statA, statB]).then(([a, b]) => b.mtimeMs - a.mtimeMs);
    });

  } catch (error) {
    log('Failed to get log files: ' + (error instanceof Error ? error.message : 'unknown'), 'warn');
    return [];
  }
}

/**
 * Append entry to session log
 */
async function appendToSessionLog(entry: Record<string, unknown>): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(sessionLogPath, 'session-' + today + '.jsonl');

    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, logLine, 'utf-8');

  } catch (error) {
    log('Failed to write session log: ' + (error instanceof Error ? error.message : 'unknown'), 'warn');
  }
}

/**
 * Output log message
 */
function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
  const logMessage = timestamp + ' ' + prefix + ' [RuleForge] ' + message;

  outputChannel.appendLine(logMessage);

  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

/**
 * Deactivate plugin
 */
export function deactivate(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  log('RuleForge deactivated');
}
