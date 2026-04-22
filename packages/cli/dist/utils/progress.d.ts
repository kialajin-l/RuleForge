/**
 * CLI 进度条工具
 * 使用 cli-progress 显示进度条
 */
/**
 * 进度条选项
 */
export interface ProgressOptions {
    title?: string;
    total: number;
    format?: string;
    barCompleteChar?: string;
    barIncompleteChar?: string;
    hideCursor?: boolean;
    clearOnComplete?: boolean;
}
/**
 * 进度条类
 */
export declare class ProgressBar {
    private bar;
    private options;
    constructor(options: ProgressOptions);
    /**
     * 开始进度条
     */
    start(): void;
    /**
     * 更新进度
     */
    update(current: number, currentItem?: string): void;
    /**
     * 增加进度
     */
    increment(step?: number, currentItem?: string): void;
    /**
     * 停止进度条
     */
    stop(): void;
    /**
     * 完成进度条
     */
    complete(): void;
}
/**
 * 创建多进度条管理器
 */
export declare class MultiProgressBar {
    private bars;
    private multiBar;
    constructor();
    /**
     * 添加进度条
     */
    addBar(id: string, title: string, total: number): ProgressBar;
    /**
     * 获取进度条
     */
    getBar(id: string): ProgressBar | undefined;
    /**
     * 停止所有进度条
     */
    stopAll(): void;
}
/**
 * 创建简单的文本进度指示器
 */
export declare function createTextProgress(total: number, title?: string): {
    update: (current: number, currentItem?: string) => void;
    complete: () => void;
};
/**
 * 创建步骤进度指示器
 */
export declare function createStepProgress(steps: string[]): {
    next(stepName?: string): void;
    complete(): void;
};
/**
 * 便捷函数：创建进度条
 */
export declare function createProgressBar(options: ProgressOptions): ProgressBar;
/**
 * 便捷函数：创建多进度条管理器
 */
export declare function createMultiProgressBar(): MultiProgressBar;
//# sourceMappingURL=progress.d.ts.map