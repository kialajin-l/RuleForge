/**
 * validate 命令：验证 YAML 文件是否符合 REP v0.1
 */
/**
 * validate 命令处理函数
 */
export declare function validateCommand(file: string, options: {
    strict?: boolean;
    fix?: boolean;
}): Promise<void>;
export declare const validateCommandConfig: {
    name: string;
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
};
//# sourceMappingURL=validate.d.ts.map