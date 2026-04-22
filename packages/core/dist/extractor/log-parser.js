"use strict";
/**
 * RuleForge 会话日志解析器
 * 支持 JSON Lines 和 VSCode/Trae 日志格式的解析
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMultipleSessions = exports.parseSessionLog = exports.SessionLogParser = void 0;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const readline_1 = require("readline");
class SessionLogParser {
    defaultMaxFileSize = 10 * 1024 * 1024; // 10MB
    supportedFormats = ['jsonl', 'vscode', 'trae'];
    /**
     * 解析会话日志文件
     */
    async parseSessionLog(logPath, options = {}) {
        const startTime = Date.now();
        const warnings = [];
        const errors = [];
        try {
            console.log(`🔍 开始解析会话日志: ${logPath}`);
            // 1. 验证文件存在性和大小
            await this.validateFile(logPath, options.maxFileSize);
            // 2. 检测日志格式
            const formatDetection = await this.detectLogFormat(logPath);
            console.log(`📋 检测到日志格式: ${formatDetection.format} (置信度: ${formatDetection.confidence})`);
            if (formatDetection.confidence < 0.7) {
                warnings.push(`日志格式检测置信度较低: ${formatDetection.confidence}`);
            }
            // 3. 根据格式解析日志
            let events = [];
            switch (formatDetection.format) {
                case 'jsonl':
                    events = await this.parseJsonlFormat(logPath, options);
                    break;
                case 'vscode':
                    events = await this.parseVscodeFormat(logPath, options);
                    break;
                case 'trae':
                    events = await this.parseTraeFormat(logPath, options);
                    break;
                default:
                    throw new Error(`不支持的日志格式: ${formatDetection.format}`);
            }
            // 4. 提取会话元数据
            const metadata = this.extractSessionMetadata(events, logPath, options.sessionId);
            // 5. 生成统计信息
            const statistics = this.generateStatistics(events, Date.now() - startTime, logPath);
            console.log(`✅ 会话日志解析完成: ${events.length} 个事件`);
            return {
                events,
                metadata,
                statistics,
                warnings,
                errors
            };
        }
        catch (error) {
            console.error('❌ 会话日志解析失败:', error);
            throw new Error(`会话日志解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 验证文件存在性和大小
     */
    async validateFile(logPath, maxFileSize) {
        try {
            const fileStats = await (0, promises_1.stat)(logPath);
            if (!fileStats.isFile()) {
                throw new Error(`路径不是文件: ${logPath}`);
            }
            const maxSize = maxFileSize ?? this.defaultMaxFileSize;
            if (fileStats.size > maxSize) {
                throw new Error(`文件大小超过限制: ${fileStats.size} > ${maxSize} 字节`);
            }
            console.log(`📄 文件验证通过: ${fileStats.size} 字节`);
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                throw new Error(`文件不存在: ${logPath}`);
            }
            throw error;
        }
    }
    /**
     * 检测日志格式
     */
    async detectLogFormat(logPath) {
        try {
            const sampleContent = await this.readFileSample(logPath, 1024); // 读取前1KB作为样本
            // JSON Lines 格式检测
            if (this.isJsonlFormat(sampleContent)) {
                return { format: 'jsonl', confidence: 0.95 };
            }
            // VSCode 格式检测
            if (this.isVscodeFormat(sampleContent)) {
                return { format: 'vscode', confidence: 0.85 };
            }
            // Trae 格式检测
            if (this.isTraeFormat(sampleContent)) {
                return { format: 'trae', confidence: 0.80 };
            }
            return { format: 'unknown', confidence: 0.1 };
        }
        catch (error) {
            console.warn('格式检测失败，使用默认格式:', error);
            return { format: 'jsonl', confidence: 0.5 };
        }
    }
    /**
     * 读取文件样本
     */
    async readFileSample(filePath, sampleSize) {
        const buffer = Buffer.alloc(sampleSize);
        const fd = await import('fs/promises');
        const fileHandle = await fd.open(filePath, 'r');
        try {
            const { bytesRead } = await fileHandle.read(buffer, 0, sampleSize, 0);
            return buffer.toString('utf8', 0, bytesRead);
        }
        finally {
            await fileHandle.close();
        }
    }
    /**
     * 检测 JSON Lines 格式
     */
    isJsonlFormat(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0)
            return false;
        let validJsonCount = 0;
        for (const line of lines.slice(0, 10)) { // 检查前10行
            try {
                const obj = JSON.parse(line.trim());
                if (obj && typeof obj === 'object') {
                    validJsonCount++;
                }
            }
            catch {
                // 忽略解析错误
            }
        }
        return validJsonCount >= 3; // 至少3行有效JSON
    }
    /**
     * 检测 VSCode 格式
     */
    isVscodeFormat(content) {
        // VSCode 日志通常包含时间戳和特定前缀
        const vscodePatterns = [
            /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/, // 时间戳格式
            /INFO\s+\-/, // INFO 前缀
            /ERROR\s+\-/, // ERROR 前缀
            /ExtensionHost/ // VSCode 特定标识
        ];
        return vscodePatterns.some(pattern => pattern.test(content));
    }
    /**
     * 检测 Trae 格式
     */
    isTraeFormat(content) {
        // Trae 日志可能包含特定标识
        const traePatterns = [
            /trae/i,
            /TraeAI/,
            /multiagent/i,
            /session_.{8}/ // session_id 格式
        ];
        return traePatterns.some(pattern => pattern.test(content));
    }
    /**
     * 解析 JSON Lines 格式
     */
    async parseJsonlFormat(logPath, options) {
        const events = [];
        let lineNumber = 0;
        const fileStream = (0, fs_1.createReadStream)(logPath, {
            encoding: options.encoding ?? 'utf8',
            highWaterMark: 64 * 1024 // 64KB 缓冲区
        });
        const rl = (0, readline_1.createInterface)({
            input: fileStream,
            crlfDelay: Infinity
        });
        return new Promise((resolve, reject) => {
            rl.on('line', (line) => {
                lineNumber++;
                if (!line.trim())
                    return; // 跳过空行
                try {
                    const eventData = JSON.parse(line);
                    const standardizedEvent = this.standardizeEvent(eventData, options.sessionId);
                    if (standardizedEvent) {
                        events.push(standardizedEvent);
                    }
                    // 进度回调
                    if (options.onProgress && lineNumber % 100 === 0) {
                        // 这里可以添加更精确的字节读取统计
                        options.onProgress({
                            bytesRead: lineNumber * 100, // 估算值
                            totalBytes: 0, // 需要文件统计
                            eventsParsed: events.length
                        });
                    }
                }
                catch (error) {
                    if (options.strictMode) {
                        reject(new Error(`第 ${lineNumber} 行 JSON 解析失败: ${error}`));
                    }
                    // 在非严格模式下，跳过无效行
                }
            });
            rl.on('close', () => {
                resolve(events);
            });
            rl.on('error', reject);
            fileStream.on('error', reject);
        });
    }
    /**
     * 解析 VSCode 格式（待实现）
     */
    async parseVscodeFormat(logPath, options) {
        // TODO: 实现 VSCode 日志格式解析
        console.warn('VSCode 格式解析尚未实现，尝试使用 JSON Lines 格式');
        return this.parseJsonlFormat(logPath, options);
    }
    /**
     * 解析 Trae 格式（待实现）
     */
    async parseTraeFormat(logPath, options) {
        // TODO: 实现 Trae 日志格式解析
        console.warn('Trae 格式解析尚未实现，尝试使用 JSON Lines 格式');
        return this.parseJsonlFormat(logPath, options);
    }
    /**
     * 标准化事件数据
     */
    standardizeEvent(eventData, sessionId) {
        if (!eventData || typeof eventData !== 'object') {
            return null;
        }
        // 提取时间戳
        let timestamp;
        if (eventData.timestamp) {
            timestamp = new Date(eventData.timestamp);
        }
        else if (eventData.time) {
            timestamp = new Date(eventData.time);
        }
        else {
            timestamp = new Date(); // 使用当前时间作为默认值
        }
        // 验证时间戳有效性
        if (isNaN(timestamp.getTime())) {
            timestamp = new Date();
        }
        // 提取事件类型
        let type = eventData.type || eventData.event || 'unknown';
        // 标准化事件类型
        type = this.standardizeEventType(type);
        // 提取载荷数据
        const payload = eventData.payload || eventData.data || eventData;
        // 生成会话ID
        const finalSessionId = sessionId || this.generateSessionId(timestamp);
        return {
            timestamp,
            type,
            payload,
            sessionId: finalSessionId
        };
    }
    /**
     * 标准化事件类型
     */
    standardizeEventType(rawType) {
        const typeMapping = {
            // 文件操作
            'file.open': 'file_opened',
            'file.opened': 'file_opened',
            'file.save': 'file_saved',
            'file.saved': 'file_saved',
            'file.change': 'file_changed',
            'file.changed': 'file_changed',
            // 命令执行
            'command.run': 'command_executed',
            'command.executed': 'command_executed',
            'cmd.run': 'command_executed',
            'terminal.command': 'command_executed',
            // 错误事件
            'error': 'error_occurred',
            'error.occurred': 'error_occurred',
            'exception': 'error_occurred',
            // 测试事件
            'test.run': 'test_run',
            'test.executed': 'test_run',
            'test.completed': 'test_run'
        };
        return typeMapping[rawType.toLowerCase()] || rawType;
    }
    /**
     * 生成会话ID
     */
    generateSessionId(timestamp) {
        return `session_${timestamp.getTime().toString(36)}`;
    }
    /**
     * 提取会话元数据
     */
    extractSessionMetadata(events, logPath, sessionId) {
        if (events.length === 0) {
            return {
                id: sessionId || this.generateSessionId(new Date()),
                startTime: new Date(),
                ideType: 'unknown'
            };
        }
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const startTime = sortedEvents[0].timestamp;
        const endTime = sortedEvents[sortedEvents.length - 1].timestamp;
        // 检测 IDE 类型
        let ideType = 'unknown';
        const hasVscodeEvents = events.some(event => event.type.includes('vscode') || event.payload?.source === 'vscode');
        const hasTraeEvents = events.some(event => event.type.includes('trae') || event.payload?.source === 'trae');
        if (hasVscodeEvents)
            ideType = 'vscode';
        if (hasTraeEvents)
            ideType = 'trae';
        return {
            id: sessionId || events[0]?.sessionId || this.generateSessionId(startTime),
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            projectPath: this.extractProjectPath(logPath),
            ideType
        };
    }
    /**
     * 提取项目路径
     */
    extractProjectPath(logPath) {
        try {
            const dirname = require('path').dirname(logPath);
            // 简单的启发式方法：如果日志文件在项目根目录或子目录中
            if (dirname.includes('src') || dirname.includes('packages')) {
                return require('path').resolve(dirname, '..');
            }
            return dirname;
        }
        catch {
            return undefined;
        }
    }
    /**
     * 生成统计信息
     */
    generateStatistics(events, parseTime, logPath) {
        const eventCounts = events.reduce((counts, event) => {
            counts[event.type] = (counts[event.type] || 0) + 1;
            return counts;
        }, {});
        return {
            totalEvents: events.length,
            validEvents: events.length,
            invalidEvents: 0, // 在实际实现中需要跟踪无效事件
            fileOpenedEvents: eventCounts['file_opened'] || 0,
            fileSavedEvents: eventCounts['file_saved'] || 0,
            commandExecutedEvents: eventCounts['command_executed'] || 0,
            errorOccurredEvents: eventCounts['error_occurred'] || 0,
            testRunEvents: eventCounts['test_run'] || 0,
            parseTime,
            fileSize: 0 // 需要文件统计
        };
    }
    /**
     * 批量解析多个会话日志
     */
    async parseMultipleSessions(logPaths, options = {}) {
        const results = [];
        for (const logPath of logPaths) {
            try {
                const result = await this.parseSessionLog(logPath, {
                    ...options,
                    sessionId: options.sessionId || `session_${Date.now()}`
                });
                results.push(result);
            }
            catch (error) {
                console.error(`解析会话日志失败 ${logPath}:`, error);
                // 继续处理其他文件
            }
        }
        return results;
    }
    /**
     * 验证事件数据完整性
     */
    validateEvent(event) {
        const errors = [];
        if (!event.timestamp || isNaN(event.timestamp.getTime())) {
            errors.push('无效的时间戳');
        }
        if (!event.type || typeof event.type !== 'string') {
            errors.push('事件类型必须是非空字符串');
        }
        if (!event.sessionId || typeof event.sessionId !== 'string') {
            errors.push('会话ID必须是非空字符串');
        }
        if (event.payload === undefined) {
            errors.push('事件载荷不能为undefined');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
exports.SessionLogParser = SessionLogParser;
// 导出便捷函数
const parseSessionLog = async (logPath, options) => {
    const parser = new SessionLogParser();
    return parser.parseSessionLog(logPath, options);
};
exports.parseSessionLog = parseSessionLog;
const parseMultipleSessions = async (logPaths, options) => {
    const parser = new SessionLogParser();
    return parser.parseMultipleSessions(logPaths, options);
};
exports.parseMultipleSessions = parseMultipleSessions;
// 默认导出
exports.default = SessionLogParser;
//# sourceMappingURL=log-parser.js.map