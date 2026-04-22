/**
 * CLI 日志工具
 * 提供彩色输出和格式化日志
 */

import chalk from 'chalk';

/**
 * 日志级别
 */
export type LogLevel = 'verbose' | 'info' | 'warn' | 'error' | 'silent';

/**
 * 日志工具类
 */
export class Logger {
  private level: LogLevel = 'info';

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 是否应该记录指定级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      verbose: 0,
      info: 1,
      warn: 2,
      error: 3,
      silent: 4
    };
    
    return levels[level] >= levels[this.level] && this.level !== 'silent';
  }

  /**
   * 详细日志
   */
  verbose(message: string, ...args: any[]): void {
    if (this.shouldLog('verbose')) {
      console.log(chalk.gray(`[VERBOSE] ${message}`), ...args);
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue('ℹ️'), chalk.blue(message), ...args);
    }
  }

  /**
   * 成功日志
   */
  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✅'), chalk.green(message), ...args);
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow('⚠️'), chalk.yellow(message), ...args);
    }
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('❌'), chalk.red(message), ...args);
    }
  }

  /**
   * 进度日志
   */
  progress(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan('⏳'), chalk.cyan(message), ...args);
    }
  }

  /**
   * 分隔线
   */
  separator(length: number = 50): void {
    if (this.shouldLog('info')) {
      console.log(chalk.gray('─'.repeat(length)));
    }
  }

  /**
   * 标题
   */
  title(message: string): void {
    if (this.shouldLog('info')) {
      console.log();
      console.log(chalk.bold.blue(`📋 ${message}`));
      this.separator(message.length + 4);
    }
  }

  /**
   * 子标题
   */
  subtitle(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.bold.cyan(`  ${message}`));
    }
  }

  /**
   * 列表项
   */
  item(message: string, indent: number = 2): void {
    if (this.shouldLog('info')) {
      console.log(' '.repeat(indent) + chalk.gray('•') + ' ' + message);
    }
  }

  /**
   * 键值对
   */
  keyValue(key: string, value: any, indent: number = 2): void {
    if (this.shouldLog('info')) {
      const formattedValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      console.log(' '.repeat(indent) + chalk.bold(key) + ': ' + formattedValue);
    }
  }

  /**
   * 清空当前行
   */
  clearLine(): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }

  /**
   * 换行
   */
  newline(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      console.log();
    }
  }
}

// 全局日志实例
export const logger = new Logger();

// 导出便捷函数
export const log = {
  verbose: (message: string, ...args: any[]) => logger.verbose(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  success: (message: string, ...args: any[]) => logger.success(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  progress: (message: string, ...args: any[]) => logger.progress(message, ...args),
  separator: (length?: number) => logger.separator(length),
  title: (message: string) => logger.title(message),
  subtitle: (message: string) => logger.subtitle(message),
  item: (message: string, indent?: number) => logger.item(message, indent),
  keyValue: (key: string, value: any, indent?: number) => logger.keyValue(key, value, indent),
  clearLine: () => logger.clearLine(),
  newline: (count?: number) => logger.newline(count)
};