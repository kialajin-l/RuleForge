/**
 * init 命令：初始化 RuleForge 项目配置
 */
/**
 * init 命令处理函数
 */
export declare function initCommand(options: {
    force?: boolean;
    template?: string;
}): Promise<void>;
export declare const initCommandConfig: {
    name: string;
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
};
//# sourceMappingURL=init.d.ts.map