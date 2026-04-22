/**
 * CLI 进度条工具
 * 使用 cli-progress 显示进度条
 */
import cliProgress from 'cli-progress';
import chalk from 'chalk';
/**
 * 进度条类
 */
export class ProgressBar {
    bar = null;
    options;
    constructor(options) {
        this.options = {
            format: options.format || '{title} |{bar}| {percentage}% | {value}/{total} | {current}',
            barCompleteChar: options.barCompleteChar || '█',
            barIncompleteChar: options.barIncompleteChar || '░',
            hideCursor: options.hideCursor ?? true,
            clearOnComplete: options.clearOnComplete ?? true,
            ...options
        };
    }
    /**
     * 开始进度条
     */
    start() {
        if (this.bar) {
            this.stop();
        }
        this.bar = new cliProgress.SingleBar({
            format: this.options.format,
            barCompleteChar: this.options.barCompleteChar,
            barIncompleteChar: this.options.barIncompleteChar,
            hideCursor: this.options.hideCursor,
            clearOnComplete: this.options.clearOnComplete,
            barsize: 30,
            linewrap: false
        }, cliProgress.Presets.shades_classic);
        this.bar.start(this.options.total, 0, {
            title: this.options.title || '处理中',
            current: '准备开始'
        });
    }
    /**
     * 更新进度
     */
    update(current, currentItem) {
        if (this.bar) {
            this.bar.update(current, {
                current: currentItem || `处理第 ${current} 项`
            });
        }
    }
    /**
     * 增加进度
     */
    increment(step = 1, currentItem) {
        if (this.bar) {
            const current = this.bar.getProgress() * this.options.total + step;
            this.update(current, currentItem);
        }
    }
    /**
     * 停止进度条
     */
    stop() {
        if (this.bar) {
            this.bar.stop();
            this.bar = null;
        }
    }
    /**
     * 完成进度条
     */
    complete() {
        if (this.bar) {
            this.bar.update(this.options.total, {
                current: '完成'
            });
            this.stop();
        }
    }
}
/**
 * 创建多进度条管理器
 */
export class MultiProgressBar {
    bars = new Map();
    multiBar;
    constructor() {
        this.multiBar = new cliProgress.MultiBar({
            clearOnComplete: false,
            hideCursor: true,
            format: '{title} |{bar}| {percentage}% | {value}/{total} | {current}',
            barsize: 25
        }, cliProgress.Presets.shades_grey);
    }
    /**
     * 添加进度条
     */
    addBar(id, title, total) {
        const bar = this.multiBar.create(total, 0, { title, current: '准备开始' });
        const progressBar = new ProgressBar({
            title,
            total
        });
        // 重写进度条方法以使用多进度条
        progressBar['start'] = () => { };
        progressBar['update'] = (current, currentItem) => {
            bar.update(current, { current: currentItem || `处理第 ${current} 项` });
        };
        progressBar['stop'] = () => {
            bar.stop();
        };
        progressBar['complete'] = () => {
            bar.update(total, { current: '完成' });
            bar.stop();
        };
        this.bars.set(id, progressBar);
        return progressBar;
    }
    /**
     * 获取进度条
     */
    getBar(id) {
        return this.bars.get(id);
    }
    /**
     * 停止所有进度条
     */
    stopAll() {
        this.multiBar.stop();
        this.bars.clear();
    }
}
/**
 * 创建简单的文本进度指示器
 */
export function createTextProgress(total, title = '处理中') {
    let lastPercentage = -1;
    return {
        update(current, currentItem) {
            const percentage = Math.floor((current / total) * 100);
            // 只在百分比变化时输出
            if (percentage !== lastPercentage) {
                lastPercentage = percentage;
                const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
                process.stdout.write(`\r${chalk.blue(title)} ${progressBar} ${chalk.green(percentage + '%')} ${currentItem ? chalk.gray(currentItem) : ''}`);
            }
        },
        complete() {
            process.stdout.write(`\r${chalk.green('✅')} ${chalk.green(title)} 完成！\n`);
        }
    };
}
/**
 * 创建步骤进度指示器
 */
export function createStepProgress(steps) {
    let currentStep = 0;
    return {
        next(stepName) {
            if (currentStep > 0) {
                console.log(chalk.green('  ✓'), chalk.gray(steps[currentStep - 1]));
            }
            if (currentStep < steps.length) {
                const step = stepName || steps[currentStep];
                console.log(chalk.blue('  →'), chalk.bold(step));
                currentStep++;
            }
        },
        complete() {
            if (currentStep > 0) {
                console.log(chalk.green('  ✓'), chalk.gray(steps[currentStep - 1]));
            }
            console.log(chalk.green('✅'), chalk.green('所有步骤完成！'));
        }
    };
}
/**
 * 便捷函数：创建进度条
 */
export function createProgressBar(options) {
    return new ProgressBar(options);
}
/**
 * 便捷函数：创建多进度条管理器
 */
export function createMultiProgressBar() {
    return new MultiProgressBar();
}
//# sourceMappingURL=progress.js.map