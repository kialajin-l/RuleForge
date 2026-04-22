/**
 * RuleForge 会话日志解析器
 * 支持 JSON Lines 和 VSCode/Trae 日志格式的解析
 */
export interface SessionEvent {
    timestamp: Date;
    type: string;
    payload: any;
    sessionId: string;
}
export interface FileOpenedEvent {
    filePath: string;
    language: string;
    content?: string;
}
export interface FileSavedEvent {
    filePath: string;
    changes: string[];
    content: string;
}
export interface CommandExecutedEvent {
    command: string;
    args?: any;
    output?: string;
    success?: boolean;
    duration?: number;
}
export interface ErrorOccurredEvent {
    message: string;
    stack?: string;
    file?: string;
    line?: number;
    column?: number;
}
export interface TestRunEvent {
    file: string;
    passed: boolean;
    failures?: string[];
    duration?: number;
    totalTests?: number;
    passedTests?: number;
}
export interface SessionMetadata {
    id: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    projectPath?: string;
    userId?: string;
    ideType: 'vscode' | 'trae' | 'unknown';
}
export interface ParseSessionLogOptions {
    sessionId?: string;
    maxFileSize?: number;
    encoding?: BufferEncoding;
    strictMode?: boolean;
    onProgress?: (progress: {
        bytesRead: number;
        totalBytes: number;
        eventsParsed: number;
    }) => void;
}
export interface ParseResult {
    events: SessionEvent[];
    metadata: SessionMetadata;
    statistics: {
        totalEvents: number;
        validEvents: number;
        invalidEvents: number;
        fileOpenedEvents: number;
        fileSavedEvents: number;
        commandExecutedEvents: number;
        errorOccurredEvents: number;
        testRunEvents: number;
        parseTime: number;
        fileSize: number;
    };
    warnings: string[];
    errors: string[];
}
export interface LogFormatDetector {
    format: 'jsonl' | 'vscode' | 'trae' | 'unknown';
    confidence: number;
}
export declare class SessionLogParser {
    private readonly defaultMaxFileSize;
    private readonly supportedFormats;
    /**
     * 解析会话日志文件
     */
    parseSessionLog(logPath: string, options?: ParseSessionLogOptions): Promise<ParseResult>;
    /**
     * 验证文件存在性和大小
     */
    private validateFile;
    /**
     * 检测日志格式
     */
    private detectLogFormat;
    /**
     * 读取文件样本
     */
    private readFileSample;
    /**
     * 检测 JSON Lines 格式
     */
    private isJsonlFormat;
    /**
     * 检测 VSCode 格式
     */
    private isVscodeFormat;
    /**
     * 检测 Trae 格式
     */
    private isTraeFormat;
    /**
     * 解析 JSON Lines 格式
     */
    private parseJsonlFormat;
    /**
     * 解析 VSCode 格式（待实现）
     */
    private parseVscodeFormat;
    /**
     * 解析 Trae 格式（待实现）
     */
    private parseTraeFormat;
    /**
     * 标准化事件数据
     */
    private standardizeEvent;
    /**
     * 标准化事件类型
     */
    private standardizeEventType;
    /**
     * 生成会话ID
     */
    private generateSessionId;
    /**
     * 提取会话元数据
     */
    private extractSessionMetadata;
    /**
     * 提取项目路径
     */
    private extractProjectPath;
    /**
     * 生成统计信息
     */
    private generateStatistics;
    /**
     * 批量解析多个会话日志
     */
    parseMultipleSessions(logPaths: string[], options?: ParseSessionLogOptions): Promise<ParseResult[]>;
    /**
     * 验证事件数据完整性
     */
    validateEvent(event: SessionEvent): {
        valid: boolean;
        errors: string[];
    };
}
export declare const parseSessionLog: (logPath: string, options?: ParseSessionLogOptions) => Promise<ParseResult>;
export declare const parseMultipleSessions: (logPaths: string[], options?: ParseSessionLogOptions) => Promise<ParseResult[]>;
export default SessionLogParser;
//# sourceMappingURL=log-parser.d.ts.map