#!/usr/bin/env node
/**
 * RuleForge CLI 工具 - 简化版
 * 命令行界面，用于管理开发规则
 */
import { Command } from 'commander';
/**
 * 创建 CLI 程序
 */
declare function createProgram(): Command;
/**
 * 注册所有命令
 */
declare function registerCommands(program: Command): void;
export { createProgram, registerCommands };
//# sourceMappingURL=index-simple.d.ts.map