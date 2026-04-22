/**
 * list 命令：列出本地规则库中的所有规则
 */
/**
 * list 命令处理函数
 */
export declare function listCommand(options: {
    format?: string;
    tag?: string[];
    framework?: string;
    language?: string;
    minConfidence?: string;
}): Promise<void>;
export declare const listCommandConfig: {
    name: string;
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
};
//# sourceMappingURL=list.d.ts.map