/**
 * extract 命令：从日志文件提取候选规则
 */
/**
 * extract 命令处理函数
 */
export declare function extractCommand(options: {
    log?: string;
    output?: string;
    minConf?: string;
    dryRun?: boolean;
    json?: boolean;
}): Promise<void>;
export declare const extractCommandConfig: {
    name: string;
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
};
//# sourceMappingURL=extract.d.ts.map