/**
 * CLI 表格渲染工具
 * 使用 cli-table3 渲染美观的表格
 */
import Table from 'cli-table3';
import chalk from 'chalk';
/**
 * 渲染表格
 */
export function renderTable(options) {
    const { title, columns, data, style } = options;
    // 创建表格实例
    const table = new Table({
        head: columns.map(col => chalk.bold(col.title)),
        colWidths: columns.map(col => col.width || 20),
        colAligns: columns.map(col => col.align || 'left'),
        style: {
            head: style?.head || ['cyan', 'bold'],
            border: style?.border || ['gray'],
            ...style
        }
    });
    // 添加数据行
    for (const row of data) {
        const tableRow = columns.map(col => {
            const value = row[col.key];
            // 应用格式化函数
            if (col.format) {
                return col.format(value);
            }
            // 默认格式化
            if (typeof value === 'boolean') {
                return value ? chalk.green('✓') : chalk.red('✗');
            }
            if (typeof value === 'number') {
                if (col.key.includes('confidence') || col.key.includes('score')) {
                    return chalk.blue(value.toFixed(2));
                }
                return chalk.yellow(value.toString());
            }
            return String(value || '');
        });
        table.push(tableRow);
    }
    let result = table.toString();
    // 添加标题
    if (title) {
        result = `\n${chalk.bold.blue(title)}\n${result}`;
    }
    return result;
}
/**
 * 渲染规则列表表格
 */
export function renderRulesTable(rules) {
    const columns = [
        {
            key: 'id',
            title: 'ID',
            width: 20,
            format: (value) => chalk.cyan(value)
        },
        {
            key: 'name',
            title: '名称',
            width: 30,
            format: (value) => chalk.bold(value)
        },
        {
            key: 'version',
            title: '版本',
            width: 10,
            align: 'center',
            format: (value) => chalk.green(value)
        },
        {
            key: 'confidence',
            title: '置信度',
            width: 12,
            align: 'right',
            format: (value) => {
                if (value >= 0.9)
                    return chalk.green(value.toFixed(2));
                if (value >= 0.7)
                    return chalk.yellow(value.toFixed(2));
                return chalk.red(value.toFixed(2));
            }
        },
        {
            key: 'language',
            title: '语言',
            width: 15,
            align: 'center',
            format: (value) => chalk.magenta(value || '-')
        },
        {
            key: 'framework',
            title: '框架',
            width: 15,
            align: 'center',
            format: (value) => chalk.blue(value || '-')
        },
        {
            key: 'updatedAt',
            title: '更新时间',
            width: 20,
            format: (value) => {
                const date = new Date(value);
                return chalk.gray(date.toLocaleDateString('zh-CN'));
            }
        }
    ];
    return renderTable({
        title: `规则列表 (${rules.length} 条规则)`,
        columns,
        data: rules
    });
}
/**
 * 渲染验证结果表格
 */
export function renderValidationTable(results) {
    const columns = [
        {
            key: 'ruleId',
            title: '规则 ID',
            width: 25,
            format: (value) => chalk.cyan(value)
        },
        {
            key: 'valid',
            title: '状态',
            width: 10,
            align: 'center',
            format: (value) => value ? chalk.green('有效') : chalk.red('无效')
        },
        {
            key: 'errors',
            title: '错误数',
            width: 10,
            align: 'center',
            format: (value) => value.length > 0 ? chalk.red(value.length.toString()) : chalk.green('0')
        },
        {
            key: 'warnings',
            title: '警告数',
            width: 10,
            align: 'center',
            format: (value) => value.length > 0 ? chalk.yellow(value.length.toString()) : chalk.gray('0')
        },
        {
            key: 'description',
            title: '描述',
            width: 40,
            format: (value) => value || chalk.gray('无描述')
        }
    ];
    return renderTable({
        title: '规则验证结果',
        columns,
        data: results
    });
}
/**
 * 渲染统计信息表格
 */
export function renderStatsTable(stats) {
    const columns = [
        {
            key: 'metric',
            title: '指标',
            width: 25,
            format: (value) => chalk.bold(value)
        },
        {
            key: 'value',
            title: '数值',
            width: 25,
            align: 'right',
            format: (value) => {
                if (typeof value === 'number') {
                    return chalk.blue(value.toString());
                }
                if (Array.isArray(value)) {
                    return chalk.green(value.join(', '));
                }
                return chalk.yellow(String(value));
            }
        }
    ];
    const data = [
        { metric: '总规则数', value: stats.totalRules || 0 },
        { metric: '平均置信度', value: (stats.averageConfidence || 0).toFixed(2) },
        { metric: '支持的语言', value: stats.languages?.join(', ') || '无' },
        { metric: '支持的框架', value: stats.frameworks?.join(', ') || '无' },
        { metric: '最后更新', value: stats.lastUpdated || '未知' }
    ];
    return renderTable({
        title: '规则库统计信息',
        columns,
        data
    });
}
/**
 * 渲染简单的键值对表格
 */
export function renderKeyValueTable(data, title) {
    const columns = [
        {
            key: 'key',
            title: '属性',
            width: 20,
            format: (value) => chalk.bold(value)
        },
        {
            key: 'value',
            title: '值',
            width: 40,
            format: (value) => {
                if (typeof value === 'boolean') {
                    return value ? chalk.green('是') : chalk.red('否');
                }
                if (typeof value === 'number') {
                    return chalk.blue(value.toString());
                }
                if (Array.isArray(value)) {
                    return chalk.green(value.join(', '));
                }
                return chalk.yellow(String(value));
            }
        }
    ];
    const tableData = Object.entries(data).map(([key, value]) => ({
        key,
        value
    }));
    return renderTable({
        title: title || '',
        columns,
        data: tableData
    });
}
/**
 * 渲染进度表格（用于批量操作）
 */
export function renderProgressTable(completed, total, currentItem) {
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    const columns = [
        {
            key: 'progress',
            title: '进度',
            width: 25,
            format: () => chalk.green(progressBar)
        },
        {
            key: 'percentage',
            title: '百分比',
            width: 10,
            align: 'right',
            format: () => chalk.blue(`${progress.toFixed(1)}%`)
        },
        {
            key: 'count',
            title: '完成/总数',
            width: 15,
            align: 'center',
            format: () => chalk.yellow(`${completed}/${total}`)
        },
        {
            key: 'current',
            title: '当前项目',
            width: 30,
            format: () => chalk.cyan(currentItem || '处理中...')
        }
    ];
    return renderTable({
        columns,
        data: [{
                progress: progressBar,
                percentage: progress,
                count: `${completed}/${total}`,
                current: currentItem
            }]
    });
}
//# sourceMappingURL=table.js.map