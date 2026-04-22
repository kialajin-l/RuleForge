/**
 * show 命令：显示指定规则的详细信息
 */
/**
 * show 命令处理函数
 */
export declare function showCommand(ruleId: string, options: {
    yaml?: boolean;
    stats?: boolean;
}): Promise<void>;
export declare const showCommandConfig: {
    name: string;
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
};
//# sourceMappingURL=show.d.ts.map