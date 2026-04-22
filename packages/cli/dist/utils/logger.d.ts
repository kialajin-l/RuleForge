/**
 * CLI 日志工具
 * 提供彩色输出和格式化日志
 */
/**
 * 日志级别
 */
export type LogLevel = 'verbose' | 'info' | 'warn' | 'error' | 'silent';
/**
 * 日志工具类
 */
export declare class Logger {
    private level;
    /**
     * 设置日志级别
     */
    setLevel(level: LogLevel): void;
    /**
     * 是否应该记录指定级别的日志
     */
    private shouldLog;
    /**
     * 详细日志
     */
    verbose(message: string, ...args: any[]): void;
    /**
     * 信息日志
     */
    info(message: string, ...args: any[]): void;
    /**
     * 成功日志
     */
    success(message: string, ...args: any[]): void;
    /**
     * 警告日志
     */
    warn(message: string, ...args: any[]): void;
    /**
     * 错误日志
     */
    error(message: string, ...args: any[]): void;
    /**
     * 进度日志
     */
    progress(message: string, ...args: any[]): void;
    /**
     * 分隔线
     */
    separator(length?: number): void;
    /**
     * 标题
     */
    title(message: string): void;
    /**
     * 子标题
     */
    subtitle(message: string): void;
    /**
     * 列表项
     */
    item(message: string, indent?: number): void;
    /**
     * 键值对
     */
    keyValue(key: string, value: any, indent?: number): void;
    /**
     * 清空当前行
     */
    clearLine(): void;
    /**
     * 换行
     */
    newline(count?: number): void;
}
export declare const logger: Logger;
export declare const log: {
    verbose: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    success: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    progress: (message: string, ...args: any[]) => void;
    separator: (length?: number) => void;
    title: (message: string) => void;
    subtitle: (message: string) => void;
    item: (message: string, indent?: number) => void;
    keyValue: (key: string, value: any, indent?: number) => void;
    clearLine: () => void;
    newline: (count?: number) => void;
};
//# sourceMappingURL=logger.d.ts.map