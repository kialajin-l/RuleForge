/**
 * delete 命令：删除指定规则
 */
/**
 * delete 命令处理函数
 */
export declare function deleteCommand(ruleId: string, options: {
    force?: boolean;
}): Promise<void>;
export declare const deleteCommandConfig: {
    name: string;
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
};
//# sourceMappingURL=delete.d.ts.map