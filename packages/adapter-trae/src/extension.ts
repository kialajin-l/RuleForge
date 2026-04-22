/**
 * RuleForge for Trae/VSCode 插件入口
 * 
 * 功能：
 * - 监听文件保存事件，自动记录开发会话日志
 * - 提供规则提取命令
 * - 显示候选规则确认面板
 * - 支持一键贡献至开源社区
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RuleForgeEngine, RuleWithConfidence } from '@ruleforge/core';
import { showConfirmationPanel } from './ui/confirmation-panel';

/**
 * 输出通道
 */
let outputChannel: vscode.OutputChannel;

/**
 * RuleForge 引擎实例
 */
let engine: RuleForgeEngine;

/**
 * 会话日志存储路径
 */
let sessionLogPath: string;

/**
 * 插件激活函数
 * 
 * @param context - VSCode 扩展上下文
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 初始化输出通道
  outputChannel = vscode.window.createOutputChannel('RuleForge');
  context.subscriptions.push(outputChannel);
  
  log('RuleForge 插件激活中...');
  
  try {
    // 初始化引擎
    engine = new RuleForgeEngine();
    
    // 设置会话日志路径
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      sessionLogPath = path.join(workspaceFolder.uri.fsPath, '.ruleforge', 'logs');
      await fs.mkdir(sessionLogPath, { recursive: true });
      log(`会话日志路径: ${sessionLogPath}`);
    } else {
      sessionLogPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.ruleforge', 'logs');
      await fs.mkdir(sessionLogPath, { recursive: true });
      log(`使用全局日志路径: ${sessionLogPath}`);
    }
    
    // 注册命令
    const extractCommand = vscode.commands.registerCommand('ruleforge.extract', handleExtractCommand);
    context.subscriptions.push(extractCommand);
    
    const showRulesCommand = vscode.commands.registerCommand('ruleforge.showRules', handleShowRulesCommand);
    context.subscriptions.push(showRulesCommand);
    
    const contributeRuleCommand = vscode.commands.registerCommand('ruleforge.contributeRule', handleContributeRuleCommand);
    context.subscriptions.push(contributeRuleCommand);
    
    // 监听文件保存事件
    const onDidSaveDisposable = vscode.workspace.onDidSaveTextDocument(handleDocumentSave);
    context.subscriptions.push(onDidSaveDisposable);
    
    // 监听工作区变化
    const onDidChangeWorkspaceDisposable = vscode.workspace.onDidChangeWorkspaceFolders(handleWorkspaceChange);
    context.subscriptions.push(onDidChangeWorkspaceDisposable);
    
    log('RuleForge 插件激活完成');
    vscode.window.showInformationMessage('RuleForge 已激活，自动记录开发会话');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    log(`激活失败: ${errorMessage}`, 'error');
    vscode.window.showErrorMessage(`RuleForge 激活失败: ${errorMessage}`);
  }
}

/**
 * 插件停用函数
 * 
 * @param context - VSCode 扩展上下文
 */
export function deactivate(context: vscode.ExtensionContext): void {
  log('RuleForge 插件停用');
  outputChannel.dispose();
}

/**
 * 处理规则提取命令
 */
async function handleExtractCommand(): Promise<void> {
  log('开始执行规则提取命令');
  
  try {
    // 显示进度
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'RuleForge 提取规则中...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: '读取会话日志...' });
      
      // 获取日志文件
      const logFiles = await getRecentLogFiles();
      if (logFiles.length === 0) {
        vscode.window.showWarningMessage('未找到会话日志文件');
        return;
      }
      
      progress.report({ increment: 30, message: `分析 ${logFiles.length} 个日志文件...` });
      
      // 提取规则
      const allRules: RuleWithConfidence[] = [];
      for (const logFile of logFiles) {
        try {
          const result = await engine.extractOnly({
            sessionId: path.basename(logFile),
            logPath: logFile,
            minConfidence: 0.7
          });
          allRules.push(...result.rules);
        } catch (error) {
          log(`提取规则失败: ${logFile}`, 'warn');
        }
      }
      
      progress.report({ increment: 40, message: `发现 ${allRules.length} 个候选规则` });
      
      if (allRules.length === 0) {
        vscode.window.showInformationMessage('未发现可复用的规则');
        return;
      }
      
      progress.report({ increment: 20, message: '验证规则...' });
      
      // 验证规则
      const validationResults = engine.validateOnly(allRules);
      const validRules = allRules.filter((_, index) => validationResults[index]?.valid);
      
      progress.report({ increment: 10, message: '显示确认面板...' });
      
      // 显示确认面板
      if (validRules.length > 0) {
        await showConfirmationPanel(validRules);
      } else {
        vscode.window.showInformationMessage('所有候选规则验证失败');
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    log(`规则提取失败: ${errorMessage}`, 'error');
    vscode.window.showErrorMessage(`规则提取失败: ${errorMessage}`);
  }
}

/**
 * 处理显示规则命令
 */
async function handleShowRulesCommand(): Promise<void> {
  log('显示本地规则库');
  
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('请先打开工作区');
      return;
    }
    
    const rulesDir = path.join(workspaceFolder.uri.fsPath, '.ruleforge', 'rules');
    const files = await fs.readdir(rulesDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    
    if (yamlFiles.length === 0) {
      vscode.window.showInformationMessage('本地规则库为空');
      return;
    }
    
    // 显示规则列表
    const selected = await vscode.window.showQuickPick(yamlFiles, {
      placeHolder: '选择要查看的规则',
      title: 'RuleForge 本地规则库'
    });
    
    if (selected) {
      const rulePath = path.join(rulesDir, selected);
      const document = await vscode.workspace.openTextDocument(rulePath);
      await vscode.window.showTextDocument(document);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    log(`显示规则失败: ${errorMessage}`, 'error');
    vscode.window.showErrorMessage(`显示规则失败: ${errorMessage}`);
  }
}

/**
 * 处理贡献规则命令
 */
async function handleContributeRuleCommand(): Promise<void> {
  log('贡献规则至开源社区');
  
  try {
    const config = vscode.workspace.getConfiguration('ruleforge');
    const defaultRepo = config.get<string>('defaultRepo', 'multiagent/rules');
    
    const repo = await vscode.window.showInputBox({
      prompt: '输入目标 GitHub 仓库',
      value: defaultRepo,
      placeHolder: 'owner/repo'
    });
    
    if (!repo) {
      return;
    }
    
    // TODO: 实现贡献逻辑
    vscode.window.showInformationMessage(`规则将贡献至: ${repo}`);
    log(`贡献规则至: ${repo}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    log(`贡献规则失败: ${errorMessage}`, 'error');
    vscode.window.showErrorMessage(`贡献规则失败: ${errorMessage}`);
  }
}

/**
 * 处理文档保存事件
 * 
 * @param document - 保存的文档
 */
async function handleDocumentSave(document: vscode.TextDocument): Promise<void> {
  try {
    // 检查是否启用自动触发
    const config = vscode.workspace.getConfiguration('ruleforge');
    const autoTrigger = config.get<boolean>('autoTrigger', true);
    
    if (!autoTrigger) {
      return;
    }
    
    // 记录文件保存事件到会话日志
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'file_save',
      file: document.uri.fsPath,
      language: document.languageId,
      lineCount: document.lineCount
    };
    
    await appendToSessionLog(logEntry);
    
  } catch (error) {
    // 静默失败，不影响用户操作
    log(`记录文件保存失败: ${error instanceof Error ? error.message : '未知错误'}`, 'warn');
  }
}

/**
 * 处理工作区变化
 * 
 * @param event - 工作区变化事件
 */
async function handleWorkspaceChange(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
  if (event.added.length > 0) {
    const newWorkspace = event.added[0];
    sessionLogPath = path.join(newWorkspace.uri.fsPath, '.ruleforge', 'logs');
    await fs.mkdir(sessionLogPath, { recursive: true });
    log(`工作区变化，更新日志路径: ${sessionLogPath}`);
  }
}

/**
 * 获取最近的日志文件
 * 
 * @returns 日志文件路径数组
 */
async function getRecentLogFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(sessionLogPath);
    const jsonlFiles = files
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(sessionLogPath, f));
    
    // 按修改时间排序，返回最近 7 天的文件
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentFiles: string[] = [];
    
    for (const file of jsonlFiles) {
      const stats = await fs.stat(file);
      if (stats.mtimeMs > sevenDaysAgo) {
        recentFiles.push(file);
      }
    }
    
    return recentFiles.sort((a, b) => {
      const statA = fs.stat(a);
      const statB = fs.stat(b);
      return Promise.all([statA, statB]).then(([a, b]) => b.mtimeMs - a.mtimeMs);
    });
    
  } catch (error) {
    log(`获取日志文件失败: ${error instanceof Error ? error.message : '未知错误'}`, 'warn');
    return [];
  }
}

/**
 * 追加到会话日志
 * 
 * @param entry - 日志条目
 */
async function appendToSessionLog(entry: Record<string, unknown>): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(sessionLogPath, `session-${today}.jsonl`);
    
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, logLine, 'utf-8');
    
  } catch (error) {
    log(`写入会话日志失败: ${error instanceof Error ? error.message : '未知错误'}`, 'warn');
  }
}

/**
 * 输出日志
 * 
 * @param message - 日志消息
 * @param level - 日志级别
 */
function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  const logMessage = `[${timestamp}] ${prefix} ${message}`;
  
  outputChannel.appendLine(logMessage);
  
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}
