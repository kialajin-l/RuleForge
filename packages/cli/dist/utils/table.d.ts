/**
 * CLI 表格渲染工具
 * 使用 cli-table3 渲染美观的表格
 */
/**
 * 表格列定义
 */
export interface TableColumn {
    key: string;
    title: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
}
/**
 * 表格选项
 */
export interface TableOptions {
    title?: string;
    columns: TableColumn[];
    data: any[];
    style?: {
        head?: string[];
        border?: string[];
    };
}
/**
 * 渲染表格
 */
export declare function renderTable(options: TableOptions): string;
/**
 * 渲染规则列表表格
 */
export declare function renderRulesTable(rules: any[]): string;
/**
 * 渲染验证结果表格
 */
export declare function renderValidationTable(results: any[]): string;
/**
 * 渲染统计信息表格
 */
export declare function renderStatsTable(stats: any): string;
/**
 * 渲染简单的键值对表格
 */
export declare function renderKeyValueTable(data: Record<string, any>, title?: string): string;
/**
 * 渲染进度表格（用于批量操作）
 */
export declare function renderProgressTable(completed: number, total: number, currentItem?: string): string;
//# sourceMappingURL=table.d.ts.map