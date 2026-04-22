"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../core/dist/extractor/log-parser.js
var require_log_parser = __commonJS({
  "../core/dist/extractor/log-parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseMultipleSessions = exports2.parseSessionLog = exports2.SessionLogParser = void 0;
    var promises_1 = require("fs/promises");
    var fs_1 = require("fs");
    var readline_1 = require("readline");
    var SessionLogParser = class {
      defaultMaxFileSize = 10 * 1024 * 1024;
      // 10MB
      supportedFormats = ["jsonl", "vscode", "trae"];
      /**
       * 解析会话日志文件
       */
      async parseSessionLog(logPath, options = {}) {
        const startTime = Date.now();
        const warnings = [];
        const errors = [];
        try {
          console.log(`\u{1F50D} \u5F00\u59CB\u89E3\u6790\u4F1A\u8BDD\u65E5\u5FD7: ${logPath}`);
          await this.validateFile(logPath, options.maxFileSize);
          const formatDetection = await this.detectLogFormat(logPath);
          console.log(`\u{1F4CB} \u68C0\u6D4B\u5230\u65E5\u5FD7\u683C\u5F0F: ${formatDetection.format} (\u7F6E\u4FE1\u5EA6: ${formatDetection.confidence})`);
          if (formatDetection.confidence < 0.7) {
            warnings.push(`\u65E5\u5FD7\u683C\u5F0F\u68C0\u6D4B\u7F6E\u4FE1\u5EA6\u8F83\u4F4E: ${formatDetection.confidence}`);
          }
          let events = [];
          switch (formatDetection.format) {
            case "jsonl":
              events = await this.parseJsonlFormat(logPath, options);
              break;
            case "vscode":
              events = await this.parseVscodeFormat(logPath, options);
              break;
            case "trae":
              events = await this.parseTraeFormat(logPath, options);
              break;
            default:
              throw new Error(`\u4E0D\u652F\u6301\u7684\u65E5\u5FD7\u683C\u5F0F: ${formatDetection.format}`);
          }
          const metadata = this.extractSessionMetadata(events, logPath, options.sessionId);
          const statistics = this.generateStatistics(events, Date.now() - startTime, logPath);
          console.log(`\u2705 \u4F1A\u8BDD\u65E5\u5FD7\u89E3\u6790\u5B8C\u6210: ${events.length} \u4E2A\u4E8B\u4EF6`);
          return {
            events,
            metadata,
            statistics,
            warnings,
            errors
          };
        } catch (error) {
          console.error("\u274C \u4F1A\u8BDD\u65E5\u5FD7\u89E3\u6790\u5931\u8D25:", error);
          throw new Error(`\u4F1A\u8BDD\u65E5\u5FD7\u89E3\u6790\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 验证文件存在性和大小
       */
      async validateFile(logPath, maxFileSize) {
        try {
          const fileStats = await (0, promises_1.stat)(logPath);
          if (!fileStats.isFile()) {
            throw new Error(`\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6: ${logPath}`);
          }
          const maxSize = maxFileSize ?? this.defaultMaxFileSize;
          if (fileStats.size > maxSize) {
            throw new Error(`\u6587\u4EF6\u5927\u5C0F\u8D85\u8FC7\u9650\u5236: ${fileStats.size} > ${maxSize} \u5B57\u8282`);
          }
          console.log(`\u{1F4C4} \u6587\u4EF6\u9A8C\u8BC1\u901A\u8FC7: ${fileStats.size} \u5B57\u8282`);
        } catch (error) {
          if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            throw new Error(`\u6587\u4EF6\u4E0D\u5B58\u5728: ${logPath}`);
          }
          throw error;
        }
      }
      /**
       * 检测日志格式
       */
      async detectLogFormat(logPath) {
        try {
          const sampleContent = await this.readFileSample(logPath, 1024);
          if (this.isJsonlFormat(sampleContent)) {
            return { format: "jsonl", confidence: 0.95 };
          }
          if (this.isVscodeFormat(sampleContent)) {
            return { format: "vscode", confidence: 0.85 };
          }
          if (this.isTraeFormat(sampleContent)) {
            return { format: "trae", confidence: 0.8 };
          }
          return { format: "unknown", confidence: 0.1 };
        } catch (error) {
          console.warn("\u683C\u5F0F\u68C0\u6D4B\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u683C\u5F0F:", error);
          return { format: "jsonl", confidence: 0.5 };
        }
      }
      /**
       * 读取文件样本
       */
      async readFileSample(filePath, sampleSize) {
        const buffer = Buffer.alloc(sampleSize);
        const fd = await import("fs/promises");
        const fileHandle = await fd.open(filePath, "r");
        try {
          const { bytesRead } = await fileHandle.read(buffer, 0, sampleSize, 0);
          return buffer.toString("utf8", 0, bytesRead);
        } finally {
          await fileHandle.close();
        }
      }
      /**
       * 检测 JSON Lines 格式
       */
      isJsonlFormat(content) {
        const lines = content.split("\n").filter((line) => line.trim());
        if (lines.length === 0)
          return false;
        let validJsonCount = 0;
        for (const line of lines.slice(0, 10)) {
          try {
            const obj = JSON.parse(line.trim());
            if (obj && typeof obj === "object") {
              validJsonCount++;
            }
          } catch {
          }
        }
        return validJsonCount >= 3;
      }
      /**
       * 检测 VSCode 格式
       */
      isVscodeFormat(content) {
        const vscodePatterns = [
          /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/,
          // 时间戳格式
          /INFO\s+\-/,
          // INFO 前缀
          /ERROR\s+\-/,
          // ERROR 前缀
          /ExtensionHost/
          // VSCode 特定标识
        ];
        return vscodePatterns.some((pattern) => pattern.test(content));
      }
      /**
       * 检测 Trae 格式
       */
      isTraeFormat(content) {
        const traePatterns = [
          /trae/i,
          /TraeAI/,
          /multiagent/i,
          /session_.{8}/
          // session_id 格式
        ];
        return traePatterns.some((pattern) => pattern.test(content));
      }
      /**
       * 解析 JSON Lines 格式
       */
      async parseJsonlFormat(logPath, options) {
        const events = [];
        let lineNumber = 0;
        const fileStream = (0, fs_1.createReadStream)(logPath, {
          encoding: options.encoding ?? "utf8",
          highWaterMark: 64 * 1024
          // 64KB 缓冲区
        });
        const rl = (0, readline_1.createInterface)({
          input: fileStream,
          crlfDelay: Infinity
        });
        return new Promise((resolve, reject) => {
          rl.on("line", (line) => {
            lineNumber++;
            if (!line.trim())
              return;
            try {
              const eventData = JSON.parse(line);
              const standardizedEvent = this.standardizeEvent(eventData, options.sessionId);
              if (standardizedEvent) {
                events.push(standardizedEvent);
              }
              if (options.onProgress && lineNumber % 100 === 0) {
                options.onProgress({
                  bytesRead: lineNumber * 100,
                  // 估算值
                  totalBytes: 0,
                  // 需要文件统计
                  eventsParsed: events.length
                });
              }
            } catch (error) {
              if (options.strictMode) {
                reject(new Error(`\u7B2C ${lineNumber} \u884C JSON \u89E3\u6790\u5931\u8D25: ${error}`));
              }
            }
          });
          rl.on("close", () => {
            resolve(events);
          });
          rl.on("error", reject);
          fileStream.on("error", reject);
        });
      }
      /**
       * 解析 VSCode 格式（待实现）
       */
      async parseVscodeFormat(logPath, options) {
        console.warn("VSCode \u683C\u5F0F\u89E3\u6790\u5C1A\u672A\u5B9E\u73B0\uFF0C\u5C1D\u8BD5\u4F7F\u7528 JSON Lines \u683C\u5F0F");
        return this.parseJsonlFormat(logPath, options);
      }
      /**
       * 解析 Trae 格式（待实现）
       */
      async parseTraeFormat(logPath, options) {
        console.warn("Trae \u683C\u5F0F\u89E3\u6790\u5C1A\u672A\u5B9E\u73B0\uFF0C\u5C1D\u8BD5\u4F7F\u7528 JSON Lines \u683C\u5F0F");
        return this.parseJsonlFormat(logPath, options);
      }
      /**
       * 标准化事件数据
       */
      standardizeEvent(eventData, sessionId) {
        if (!eventData || typeof eventData !== "object") {
          return null;
        }
        let timestamp;
        if (eventData.timestamp) {
          timestamp = new Date(eventData.timestamp);
        } else if (eventData.time) {
          timestamp = new Date(eventData.time);
        } else {
          timestamp = /* @__PURE__ */ new Date();
        }
        if (isNaN(timestamp.getTime())) {
          timestamp = /* @__PURE__ */ new Date();
        }
        let type = eventData.type || eventData.event || "unknown";
        type = this.standardizeEventType(type);
        const payload = eventData.payload || eventData.data || eventData;
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
          "file.open": "file_opened",
          "file.opened": "file_opened",
          "file.save": "file_saved",
          "file.saved": "file_saved",
          "file.change": "file_changed",
          "file.changed": "file_changed",
          // 命令执行
          "command.run": "command_executed",
          "command.executed": "command_executed",
          "cmd.run": "command_executed",
          "terminal.command": "command_executed",
          // 错误事件
          "error": "error_occurred",
          "error.occurred": "error_occurred",
          "exception": "error_occurred",
          // 测试事件
          "test.run": "test_run",
          "test.executed": "test_run",
          "test.completed": "test_run"
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
            id: sessionId || this.generateSessionId(/* @__PURE__ */ new Date()),
            startTime: /* @__PURE__ */ new Date(),
            ideType: "unknown"
          };
        }
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const startTime = sortedEvents[0].timestamp;
        const endTime = sortedEvents[sortedEvents.length - 1].timestamp;
        let ideType = "unknown";
        const hasVscodeEvents = events.some((event) => event.type.includes("vscode") || event.payload?.source === "vscode");
        const hasTraeEvents = events.some((event) => event.type.includes("trae") || event.payload?.source === "trae");
        if (hasVscodeEvents)
          ideType = "vscode";
        if (hasTraeEvents)
          ideType = "trae";
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
          const dirname = require("path").dirname(logPath);
          if (dirname.includes("src") || dirname.includes("packages")) {
            return require("path").resolve(dirname, "..");
          }
          return dirname;
        } catch {
          return void 0;
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
          invalidEvents: 0,
          // 在实际实现中需要跟踪无效事件
          fileOpenedEvents: eventCounts["file_opened"] || 0,
          fileSavedEvents: eventCounts["file_saved"] || 0,
          commandExecutedEvents: eventCounts["command_executed"] || 0,
          errorOccurredEvents: eventCounts["error_occurred"] || 0,
          testRunEvents: eventCounts["test_run"] || 0,
          parseTime,
          fileSize: 0
          // 需要文件统计
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
          } catch (error) {
            console.error(`\u89E3\u6790\u4F1A\u8BDD\u65E5\u5FD7\u5931\u8D25 ${logPath}:`, error);
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
          errors.push("\u65E0\u6548\u7684\u65F6\u95F4\u6233");
        }
        if (!event.type || typeof event.type !== "string") {
          errors.push("\u4E8B\u4EF6\u7C7B\u578B\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
        }
        if (!event.sessionId || typeof event.sessionId !== "string") {
          errors.push("\u4F1A\u8BDDID\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
        }
        if (event.payload === void 0) {
          errors.push("\u4E8B\u4EF6\u8F7D\u8377\u4E0D\u80FD\u4E3Aundefined");
        }
        return {
          valid: errors.length === 0,
          errors
        };
      }
    };
    exports2.SessionLogParser = SessionLogParser;
    var parseSessionLog = async (logPath, options) => {
      const parser = new SessionLogParser();
      return parser.parseSessionLog(logPath, options);
    };
    exports2.parseSessionLog = parseSessionLog;
    var parseMultipleSessions = async (logPaths, options) => {
      const parser = new SessionLogParser();
      return parser.parseMultipleSessions(logPaths, options);
    };
    exports2.parseMultipleSessions = parseMultipleSessions;
    exports2.default = SessionLogParser;
  }
});

// ../core/dist/extractor/pattern-cluster.js
var require_pattern_cluster = __commonJS({
  "../core/dist/extractor/pattern-cluster.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.clusterPatterns = exports2.PatternClusterer = void 0;
    var PatternClusterer = class {
      defaultOptions = {
        minOccurrences: 2,
        minConfidence: 0.7,
        minApplicableScenes: 2,
        languageFocus: ["typescript", "javascript", "vue", "python"],
        excludePatterns: [],
        enableDebugLog: false
      };
      keywordPatterns = {
        validation: ["validate", "validation", "check", "verify", "assert"],
        errorHandling: ["try", "catch", "error", "exception", "throw"],
        component: ["component", "props", "emit", "template", "render"],
        function: ["function", "method", "fn", "callback", "handler"],
        type: ["type", "interface", "typedef", "generic", "typeof"],
        test: ["test", "spec", "it", "describe", "expect"]
      };
      /**
       * 从会话事件中聚类识别模式
       */
      async cluster(events, options = {}) {
        const startTime = Date.now();
        const mergedOptions = { ...this.defaultOptions, ...options };
        const warnings = [];
        try {
          console.log("\u{1F50D} \u5F00\u59CB\u6A21\u5F0F\u805A\u7C7B\u5206\u6790...");
          if (events.length === 0) {
            warnings.push("\u4E8B\u4EF6\u5217\u8868\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u8FDB\u884C\u6A21\u5F0F\u8BC6\u522B");
            return this.createEmptyResult(startTime);
          }
          const processedEvents = this.preprocessEvents(events, mergedOptions);
          const errorFixPatterns = this.identifyErrorFixPatterns(processedEvents, mergedOptions);
          const codeStructurePatterns = this.identifyCodeStructurePatterns(processedEvents, mergedOptions);
          const bestPracticePatterns = this.identifyBestPracticePatterns(processedEvents, mergedOptions);
          const allPatterns = [...errorFixPatterns, ...codeStructurePatterns, ...bestPracticePatterns];
          const filteredPatterns = this.filterPatterns(allPatterns, mergedOptions);
          const statistics = this.generateStatistics(filteredPatterns, events.length, Date.now() - startTime);
          console.log(`\u2705 \u6A21\u5F0F\u805A\u7C7B\u5B8C\u6210: \u53D1\u73B0 ${filteredPatterns.length} \u4E2A\u6A21\u5F0F`);
          this.logPatternSummary(filteredPatterns, mergedOptions);
          return {
            patterns: filteredPatterns,
            statistics,
            warnings
          };
        } catch (error) {
          console.error("\u274C \u6A21\u5F0F\u805A\u7C7B\u5931\u8D25:", error);
          throw new Error(`\u6A21\u5F0F\u805A\u7C7B\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 预处理事件数据
       */
      preprocessEvents(events, options) {
        return events.filter((event) => {
          if (options.languageFocus.length > 0 && event.payload?.language) {
            return options.languageFocus.some((lang) => event.payload.language.toLowerCase().includes(lang));
          }
          return true;
        }).filter((event) => {
          if (options.excludePatterns.length > 0 && event.type) {
            return !options.excludePatterns.some((pattern) => event.type.includes(pattern));
          }
          return true;
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      /**
       * 识别高频错误修复模式
       */
      identifyErrorFixPatterns(events, options) {
        const patterns = [];
        const errorFixSequences = this.findErrorFixSequences(events);
        const groupedSequences = this.groupErrorFixSequences(errorFixSequences);
        for (const [groupKey, sequences] of Object.entries(groupedSequences)) {
          if (sequences.length >= options.minOccurrences) {
            const pattern = this.createErrorFixPattern(sequences, groupKey);
            if (pattern && pattern.confidence >= options.minConfidence) {
              patterns.push(pattern);
            }
          }
        }
        if (options.enableDebugLog) {
          console.log(`   \u{1F527} \u9519\u8BEF\u4FEE\u590D\u6A21\u5F0F: ${patterns.length} \u4E2A`);
        }
        return patterns;
      }
      /**
       * 识别重复代码结构模式
       */
      identifyCodeStructurePatterns(events, options) {
        const patterns = [];
        const fileEvents = events.filter((event) => event.type === "file_opened" || event.type === "file_saved");
        const fileGroups = this.groupFilesByStructure(fileEvents);
        for (const [structureType, fileGroup] of Object.entries(fileGroups)) {
          if (fileGroup.files.length >= options.minOccurrences) {
            const pattern = this.createCodeStructurePattern(fileGroup, structureType);
            if (pattern && pattern.confidence >= options.minConfidence) {
              patterns.push(pattern);
            }
          }
        }
        if (options.enableDebugLog) {
          console.log(`   \u{1F3D7}\uFE0F \u4EE3\u7801\u7ED3\u6784\u6A21\u5F0F: ${patterns.length} \u4E2A`);
        }
        return patterns;
      }
      /**
       * 识别最佳实践应用模式
       */
      identifyBestPracticePatterns(events, options) {
        const patterns = [];
        const testPatterns = this.identifyTestBestPractices(events);
        const errorHandlingPatterns = this.identifyErrorHandlingPractices(events);
        const organizationPatterns = this.identifyCodeOrganizationPractices(events);
        const allPatterns = [...testPatterns, ...errorHandlingPatterns, ...organizationPatterns];
        return allPatterns.filter((pattern) => pattern.confidence >= options.minConfidence);
      }
      /**
       * 查找错误修复序列
       */
      findErrorFixSequences(events) {
        const sequences = [];
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          if (event.type === "error_occurred") {
            const fixEvents = [];
            let testEvent;
            for (let j = i + 1; j < events.length; j++) {
              const subsequentEvent = events[j];
              const timeDiff = subsequentEvent.timestamp.getTime() - event.timestamp.getTime();
              if (timeDiff > 30 * 60 * 1e3)
                break;
              if (subsequentEvent.type === "file_saved" && subsequentEvent.payload?.filePath === event.payload?.file) {
                fixEvents.push(subsequentEvent);
              }
              if (subsequentEvent.type === "test_run" && subsequentEvent.payload?.passed === true) {
                testEvent = subsequentEvent;
              }
            }
            if (fixEvents.length > 0) {
              sequences.push({ errorEvent: event, fixEvents, testEvent });
            }
          }
        }
        return sequences;
      }
      /**
       * 分组错误修复序列
       */
      groupErrorFixSequences(sequences) {
        const groups = {};
        for (const sequence of sequences) {
          const error = sequence.errorEvent.payload;
          const fileType = this.getFileType(sequence.errorEvent.payload?.file);
          const errorType = this.classifyError(error?.message);
          const groupKey = `${fileType}:${errorType}`;
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(sequence);
        }
        return groups;
      }
      /**
       * 创建错误修复模式
       */
      createErrorFixPattern(sequences, groupKey) {
        const [fileType, errorType] = groupKey.split(":");
        const occurrenceCount = sequences.length;
        const successCount = sequences.filter((s) => s.testEvent).length;
        const successRate = successCount / occurrenceCount;
        const applicabilityScore = this.calculateApplicabilityScore(sequences);
        const confidence = this.calculateConfidence(occurrenceCount, successRate, applicabilityScore);
        const keywords = this.extractKeywordsFromSequences(sequences);
        const description = this.generateErrorFixDescription(fileType, errorType, sequences.length);
        const examples = this.generateErrorFixExamples(sequences);
        return {
          id: this.generatePatternId("error-fix", fileType, errorType),
          name: `${this.capitalize(fileType)} ${errorType} \u9519\u8BEF\u4FEE\u590D`,
          description,
          trigger: {
            keywords,
            file_pattern: `**/*.${fileType}`,
            language: fileType
          },
          condition: `\u5F53\u68C0\u6D4B\u5230 ${errorType} \u9519\u8BEF\u65F6\uFF0C\u68C0\u67E5\u4EE3\u7801\u662F\u5426\u7B26\u5408\u6700\u4F73\u5B9E\u8DF5`,
          suggestion: this.generateErrorFixSuggestion(fileType, errorType, sequences[0]),
          confidence,
          applicableScenes: occurrenceCount,
          examples,
          metadata: {
            occurrenceCount,
            successRate,
            applicabilityScore,
            fileTypes: [fileType],
            firstSeen: sequences[0].errorEvent.timestamp,
            lastSeen: sequences[sequences.length - 1].errorEvent.timestamp
          }
        };
      }
      /**
       * 按代码结构分组文件
       */
      groupFilesByStructure(events) {
        const groups = {};
        for (const event of events) {
          if (event.payload?.filePath && event.payload?.content) {
            const fileType = this.getFileType(event.payload.filePath);
            const structureType = this.analyzeCodeStructure(event.payload.content);
            const groupKey = `${fileType}:${structureType}`;
            if (!groups[groupKey]) {
              groups[groupKey] = { files: [], contentSamples: [] };
            }
            groups[groupKey].files.push(event.payload.filePath);
            groups[groupKey].contentSamples.push(event.payload.content);
          }
        }
        return groups;
      }
      /**
       * 分析代码结构
       */
      analyzeCodeStructure(content) {
        const lines = content.split("\n");
        if (content.includes("class "))
          return "class";
        if (content.includes("function "))
          return "function";
        if (content.includes("interface "))
          return "interface";
        if (content.includes("export default"))
          return "vue-component";
        if (content.includes("describe("))
          return "test-suite";
        if (content.includes("import "))
          return "module";
        return "unknown";
      }
      /**
       * 创建代码结构模式
       */
      createCodeStructurePattern(fileGroup, structureType) {
        const [fileType, structure] = structureType.split(":");
        const occurrenceCount = fileGroup.files.length;
        const confidence = Math.min(occurrenceCount / 3, 0.95);
        const applicabilityScore = 2;
        const keywords = this.extractStructureKeywords(structure, fileGroup.contentSamples);
        return {
          id: this.generatePatternId("structure", fileType, structure),
          name: `${this.capitalize(fileType)} ${structure} \u6A21\u5F0F`,
          description: `\u8BC6\u522B ${fileType} \u6587\u4EF6\u4E2D\u7684 ${structure} \u7ED3\u6784\u6700\u4F73\u5B9E\u8DF5`,
          trigger: {
            keywords,
            file_pattern: `**/*.${fileType}`,
            language: fileType
          },
          condition: `\u5F53\u521B\u5EFA\u6216\u4FEE\u6539 ${fileType} \u6587\u4EF6\u65F6\uFF0C\u68C0\u67E5 ${structure} \u7ED3\u6784\u662F\u5426\u7B26\u5408\u89C4\u8303`,
          suggestion: this.generateStructureSuggestion(fileType, structure, fileGroup.contentSamples[0]),
          confidence,
          applicableScenes: occurrenceCount,
          examples: this.generateStructureExamples(fileGroup.contentSamples, structure),
          metadata: {
            occurrenceCount,
            successRate: 1,
            // 结构模式通常都是成功的
            applicabilityScore,
            fileTypes: [fileType],
            firstSeen: /* @__PURE__ */ new Date(),
            lastSeen: /* @__PURE__ */ new Date()
          }
        };
      }
      /**
       * 识别测试最佳实践
       */
      identifyTestBestPractices(events) {
        const patterns = [];
        const testEvents = events.filter((event) => event.type === "test_run");
        if (testEvents.length >= 2) {
          patterns.push(this.createTestPattern(testEvents));
        }
        return patterns;
      }
      /**
       * 创建测试模式
       */
      createTestPattern(testEvents) {
        const passedTests = testEvents.filter((event) => event.payload?.passed).length;
        const successRate = passedTests / testEvents.length;
        return {
          id: this.generatePatternId("test", "best-practice"),
          name: "\u6D4B\u8BD5\u6700\u4F73\u5B9E\u8DF5",
          description: "\u81EA\u52A8\u5316\u6D4B\u8BD5\u7F16\u5199\u548C\u6267\u884C\u7684\u6700\u4F73\u5B9E\u8DF5",
          trigger: {
            keywords: ["test", "spec", "it", "describe", "expect"],
            file_pattern: "**/*.{test,spec}.{js,ts,tsx,vue}",
            language: "typescript"
          },
          condition: "\u5F53\u7F16\u5199\u6216\u8FD0\u884C\u6D4B\u8BD5\u65F6\uFF0C\u68C0\u67E5\u6D4B\u8BD5\u7ED3\u6784\u548C\u65AD\u8A00\u662F\u5426\u7B26\u5408\u6700\u4F73\u5B9E\u8DF5",
          suggestion: "\u4F7F\u7528\u6E05\u6670\u7684\u6D4B\u8BD5\u63CF\u8FF0\uFF0C\u5305\u542B\u8FB9\u754C\u60C5\u51B5\u6D4B\u8BD5\uFF0C\u786E\u4FDD\u6D4B\u8BD5\u72EC\u7ACB\u6027\u548C\u53EF\u91CD\u590D\u6027",
          confidence: Math.min(successRate * 0.8, 0.9),
          applicableScenes: testEvents.length,
          examples: [{
            before: "// \u7F3A\u5C11\u63CF\u8FF0\u7684\u6D4B\u8BD5",
            after: 'it("should handle user input correctly", () => { ... })',
            context: "\u6D4B\u8BD5\u6587\u4EF6"
          }],
          metadata: {
            occurrenceCount: testEvents.length,
            successRate,
            applicabilityScore: 3,
            // 高适用性
            fileTypes: ["ts", "js", "vue"],
            firstSeen: testEvents[0].timestamp,
            lastSeen: testEvents[testEvents.length - 1].timestamp
          }
        };
      }
      /**
       * 识别错误处理实践
       */
      identifyErrorHandlingPractices(events) {
        return [];
      }
      /**
       * 识别代码组织实践
       */
      identifyCodeOrganizationPractices(events) {
        return [];
      }
      /**
       * 过滤模式
       */
      filterPatterns(patterns, options) {
        return patterns.filter((pattern) => {
          return pattern.confidence >= options.minConfidence && pattern.applicableScenes >= options.minApplicableScenes;
        });
      }
      /**
       * 计算置信度
       */
      calculateConfidence(occurrenceCount, successRate, applicabilityScore) {
        const occurrenceWeight = Math.min(occurrenceCount / 3, 1);
        const successWeight = successRate;
        const applicabilityWeight = applicabilityScore / 3;
        return occurrenceWeight * successWeight * applicabilityWeight;
      }
      /**
       * 计算适用性分数
       */
      calculateApplicabilityScore(sequences) {
        const uniqueFiles = new Set(sequences.map((s) => s.errorEvent.payload?.file));
        const uniqueFileTypes = new Set(sequences.map((s) => this.getFileType(s.errorEvent.payload?.file)));
        if (uniqueFileTypes.size >= 2)
          return 3;
        if (uniqueFiles.size >= 3)
          return 2;
        return 1;
      }
      /**
       * 生成模式ID
       */
      generatePatternId(category, ...parts) {
        return `${category}-${parts.join("-").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      }
      /**
       * 获取文件类型
       */
      getFileType(filePath) {
        if (!filePath)
          return "unknown";
        const match = filePath.match(/\.(\w+)$/);
        return match ? match[1] : "unknown";
      }
      /**
       * 分类错误类型
       */
      classifyError(errorMessage) {
        if (!errorMessage)
          return "unknown";
        if (errorMessage.includes("TypeError"))
          return "type-error";
        if (errorMessage.includes("ReferenceError"))
          return "reference-error";
        if (errorMessage.includes("SyntaxError"))
          return "syntax-error";
        if (errorMessage.includes("Validation"))
          return "validation-error";
        if (errorMessage.includes("not found"))
          return "not-found-error";
        return "general-error";
      }
      /**
       * 提取关键词
       */
      extractKeywordsFromSequences(sequences) {
        const keywords = /* @__PURE__ */ new Set();
        for (const sequence of sequences) {
          const error = sequence.errorEvent.payload;
          if (error?.message) {
            const words = error.message.toLowerCase().split(/\s+/);
            words.forEach((word) => {
              if (word.length > 3 && !this.isCommonWord(word)) {
                keywords.add(word);
              }
            });
          }
        }
        return Array.from(keywords).slice(0, 5);
      }
      /**
       * 判断是否为常见词
       */
      isCommonWord(word) {
        const commonWords = ["the", "and", "for", "with", "this", "that", "from", "have", "been"];
        return commonWords.includes(word);
      }
      /**
       * 生成错误修复描述
       */
      generateErrorFixDescription(fileType, errorType, count) {
        return `\u5728 ${count} \u4E2A ${fileType} \u6587\u4EF6\u4E2D\u8BC6\u522B\u5230 ${errorType} \u9519\u8BEF\u7684\u4FEE\u590D\u6A21\u5F0F\u3002\u8BE5\u6A21\u5F0F\u63D0\u4F9B\u4E86\u6709\u6548\u7684\u89E3\u51B3\u65B9\u6848\u548C\u6700\u4F73\u5B9E\u8DF5\u5EFA\u8BAE\u3002`;
      }
      /**
       * 生成错误修复建议
       */
      generateErrorFixSuggestion(fileType, errorType, sequence) {
        return `\u9488\u5BF9 ${fileType} \u6587\u4EF6\u4E2D\u7684 ${errorType} \u9519\u8BEF\uFF0C\u5EFA\u8BAE\u91C7\u7528\u4EE5\u4E0B\u4FEE\u590D\u7B56\u7565\uFF1A

1. \u68C0\u67E5\u76F8\u5173\u7C7B\u578B\u5B9A\u4E49
2. \u9A8C\u8BC1\u8F93\u5165\u53C2\u6570
3. \u6DFB\u52A0\u9002\u5F53\u7684\u9519\u8BEF\u5904\u7406
4. \u7F16\u5199\u5BF9\u5E94\u7684\u5355\u5143\u6D4B\u8BD5`;
      }
      /**
       * 生成错误修复示例
       */
      generateErrorFixExamples(sequences) {
        if (sequences.length === 0)
          return [];
        const firstSequence = sequences[0];
        return [{
          before: firstSequence.errorEvent.payload?.message || "\u9519\u8BEF\u53D1\u751F\u65F6\u7684\u4EE3\u7801\u72B6\u6001",
          after: "\u4FEE\u590D\u540E\u7684\u4EE3\u7801\u72B6\u6001",
          context: firstSequence.errorEvent.payload?.file || "\u76F8\u5173\u6587\u4EF6"
        }];
      }
      /**
       * 提取结构关键词
       */
      extractStructureKeywords(structure, contentSamples) {
        const baseKeywords = [structure];
        if (structure === "class") {
          baseKeywords.push("constructor", "method", "property");
        } else if (structure === "function") {
          baseKeywords.push("parameter", "return", "arrow");
        } else if (structure === "vue-component") {
          baseKeywords.push("template", "script", "style", "props");
        }
        return baseKeywords;
      }
      /**
       * 生成结构建议
       */
      generateStructureSuggestion(fileType, structure, sample) {
        return `\u5728 ${fileType} \u6587\u4EF6\u4E2D\u521B\u5EFA ${structure} \u7ED3\u6784\u65F6\uFF0C\u9075\u5FAA\u4E00\u81F4\u7684\u547D\u540D\u7EA6\u5B9A\u548C\u7EC4\u7EC7\u539F\u5219\uFF0C\u786E\u4FDD\u4EE3\u7801\u7684\u53EF\u8BFB\u6027\u548C\u53EF\u7EF4\u62A4\u6027\u3002`;
      }
      /**
       * 生成结构示例
       */
      generateStructureExamples(contentSamples, structure) {
        if (contentSamples.length === 0)
          return [];
        return [{
          before: `// \u4E0D\u826F\u7684 ${structure} \u7ED3\u6784\u793A\u4F8B`,
          after: `// \u826F\u597D\u7684 ${structure} \u7ED3\u6784\u793A\u4F8B`,
          context: "\u4EE3\u7801\u7EC4\u7EC7"
        }];
      }
      /**
       * 首字母大写
       */
      capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
      /**
       * 生成统计信息
       */
      generateStatistics(patterns, totalEvents, processingTime) {
        const highConfidencePatterns = patterns.filter((p) => p.confidence >= 0.8).length;
        const averageConfidence = patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0;
        return {
          totalEvents,
          totalPatterns: patterns.length,
          highConfidencePatterns,
          averageConfidence: Number(averageConfidence.toFixed(2)),
          processingTime
        };
      }
      /**
       * 输出模式摘要
       */
      logPatternSummary(patterns, options) {
        console.log(`\u{1F4CA} \u6A21\u5F0F\u8BC6\u522B\u6458\u8981:`);
        console.log(`   \u603B\u6A21\u5F0F\u6570: ${patterns.length}`);
        patterns.forEach((pattern) => {
          const confidenceLevel = pattern.confidence >= 0.8 ? "\u2705 \u9AD8" : pattern.confidence >= 0.6 ? "\u26A0\uFE0F \u4E2D" : "\u274C \u4F4E";
          console.log(`   ${pattern.name} (${confidenceLevel}\u7F6E\u4FE1\u5EA6: ${Math.round(pattern.confidence * 100)}%)`);
          if (pattern.confidence < options.minConfidence) {
            console.log(`      \u4F4E\u7F6E\u4FE1\u5EA6\uFF0C\u5EFA\u8BAE\u4EBA\u5DE5\u5BA1\u6838`);
          }
        });
      }
      /**
       * 创建空结果
       */
      createEmptyResult(startTime) {
        return {
          patterns: [],
          statistics: {
            totalEvents: 0,
            totalPatterns: 0,
            highConfidencePatterns: 0,
            averageConfidence: 0,
            processingTime: Date.now() - startTime
          },
          warnings: ["\u65E0\u4E8B\u4EF6\u6570\u636E\u53EF\u4F9B\u5206\u6790"]
        };
      }
    };
    exports2.PatternClusterer = PatternClusterer;
    var clusterPatterns = async (events, options) => {
      const clusterer = new PatternClusterer();
      return clusterer.cluster(events, options);
    };
    exports2.clusterPatterns = clusterPatterns;
    exports2.default = PatternClusterer;
  }
});

// ../../node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "../../node_modules/yaml/dist/nodes/identity.js"(exports2) {
    "use strict";
    var ALIAS = Symbol.for("yaml.alias");
    var DOC = Symbol.for("yaml.document");
    var MAP = Symbol.for("yaml.map");
    var PAIR = Symbol.for("yaml.pair");
    var SCALAR = Symbol.for("yaml.scalar");
    var SEQ = Symbol.for("yaml.seq");
    var NODE_TYPE = Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports2.ALIAS = ALIAS;
    exports2.DOC = DOC;
    exports2.MAP = MAP;
    exports2.NODE_TYPE = NODE_TYPE;
    exports2.PAIR = PAIR;
    exports2.SCALAR = SCALAR;
    exports2.SEQ = SEQ;
    exports2.hasAnchor = hasAnchor;
    exports2.isAlias = isAlias;
    exports2.isCollection = isCollection;
    exports2.isDocument = isDocument;
    exports2.isMap = isMap;
    exports2.isNode = isNode;
    exports2.isPair = isPair;
    exports2.isScalar = isScalar;
    exports2.isSeq = isSeq;
  }
});

// ../../node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "../../node_modules/yaml/dist/visit.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var BREAK = Symbol("break visit");
    var SKIP = Symbol("skip children");
    var REMOVE = Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path3) {
      const ctrl = callVisitor(key, node, visitor, path3);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path3, ctrl);
        return visit_(key, ctrl, visitor, path3);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path3 = Object.freeze(path3.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path3);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path3 = Object.freeze(path3.concat(node));
          const ck = visit_("key", node.key, visitor, path3);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path3);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path3) {
      const ctrl = await callVisitor(key, node, visitor, path3);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path3, ctrl);
        return visitAsync_(key, ctrl, visitor, path3);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path3 = Object.freeze(path3.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path3);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path3 = Object.freeze(path3.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path3);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path3);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path3) {
      if (typeof visitor === "function")
        return visitor(key, node, path3);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path3);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path3);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path3);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path3);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path3);
      return void 0;
    }
    function replaceNode(key, path3, node) {
      const parent = path3[path3.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports2.visit = visit;
    exports2.visitAsync = visitAsync;
  }
});

// ../../node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "../../node_modules/yaml/dist/doc/directives.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports2.Directives = Directives;
  }
});

// ../../node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "../../node_modules/yaml/dist/doc/anchors.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports2.anchorIsValid = anchorIsValid;
    exports2.anchorNames = anchorNames;
    exports2.createNodeAnchors = createNodeAnchors;
    exports2.findNewAnchor = findNewAnchor;
  }
});

// ../../node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "../../node_modules/yaml/dist/doc/applyReviver.js"(exports2) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports2.applyReviver = applyReviver;
  }
});

// ../../node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "../../node_modules/yaml/dist/nodes/toJS.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports2.toJS = toJS;
  }
});

// ../../node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "../../node_modules/yaml/dist/nodes/Node.js"(exports2) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports2.NodeBase = NodeBase;
  }
});

// ../../node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "../../node_modules/yaml/dist/nodes/Alias.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (data?.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports2.Alias = Alias;
  }
});

// ../../node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "../../node_modules/yaml/dist/nodes/Scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports2.Scalar = Scalar;
    exports2.isScalarValue = isScalarValue;
  }
});

// ../../node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "../../node_modules/yaml/dist/doc/createNode.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports2.createNode = createNode;
  }
});

// ../../node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "../../node_modules/yaml/dist/nodes/Collection.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path3, value) {
      let v = value;
      for (let i = path3.length - 1; i >= 0; --i) {
        const k = path3[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path3) => path3 == null || typeof path3 === "object" && !!path3[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path3, value) {
        if (isEmptyPath(path3))
          this.add(value);
        else {
          const [key, ...rest] = path3;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path3) {
        const [key, ...rest] = path3;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path3, keepScalar) {
        const [key, ...rest] = path3;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path3) {
        const [key, ...rest] = path3;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path3, value) {
        const [key, ...rest] = path3;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports2.Collection = Collection;
    exports2.collectionFromPath = collectionFromPath;
    exports2.isEmptyPath = isEmptyPath;
  }
});

// ../../node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringifyComment.js"(exports2) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports2.indentComment = indentComment;
    exports2.lineComment = lineComment;
    exports2.stringifyComment = stringifyComment;
  }
});

// ../../node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "../../node_modules/yaml/dist/stringify/foldFlowLines.js"(exports2) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports2.FOLD_BLOCK = FOLD_BLOCK;
    exports2.FOLD_FLOW = FOLD_FLOW;
    exports2.FOLD_QUOTED = FOLD_QUOTED;
    exports2.foldFlowLines = foldFlowLines;
  }
});

// ../../node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringifyString.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports2.stringifyString = stringifyString;
  }
});

// ../../node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringify.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports2.createStringifyContext = createStringifyContext;
    exports2.stringify = stringify;
  }
});

// ../../node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringifyPair.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports2.stringifyPair = stringifyPair;
  }
});

// ../../node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "../../node_modules/yaml/dist/log.js"(exports2) {
    "use strict";
    var node_process = require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports2.debug = debug;
    exports2.warn = warn;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      value = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
      if (identity.isSeq(value))
        for (const it of value.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(value))
        for (const it of value)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, value);
    }
    function mergeValue(ctx, map, value) {
      const source = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    exports2.addMergeToJSMap = addMergeToJSMap;
    exports2.isMergeKey = isMergeKey;
    exports2.merge = merge;
  }
});

// ../../node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "../../node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports2) {
    "use strict";
    var log2 = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log2.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports2.addPairToJSMap = addPairToJSMap;
  }
});

// ../../node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "../../node_modules/yaml/dist/nodes/Pair.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports2.Pair = Pair;
    exports2.createPair = createPair;
  }
});

// ../../node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringifyCollection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports2.stringifyCollection = stringifyCollection;
  }
});

// ../../node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "../../node_modules/yaml/dist/nodes/YAMLMap.js"(exports2) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports2.YAMLMap = YAMLMap;
    exports2.findPair = findPair;
  }
});

// ../../node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "../../node_modules/yaml/dist/schema/common/map.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports2.map = map;
  }
});

// ../../node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "../../node_modules/yaml/dist/nodes/YAMLSeq.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports2.YAMLSeq = YAMLSeq;
  }
});

// ../../node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "../../node_modules/yaml/dist/schema/common/seq.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports2.seq = seq;
  }
});

// ../../node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "../../node_modules/yaml/dist/schema/common/string.js"(exports2) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports2.string = string;
  }
});

// ../../node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "../../node_modules/yaml/dist/schema/common/null.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports2.nullTag = nullTag;
  }
});

// ../../node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "../../node_modules/yaml/dist/schema/core/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports2.boolTag = boolTag;
  }
});

// ../../node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringifyNumber.js"(exports2) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^\d/.test(n)) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports2.stringifyNumber = stringifyNumber;
  }
});

// ../../node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "../../node_modules/yaml/dist/schema/core/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// ../../node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "../../node_modules/yaml/dist/schema/core/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// ../../node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "../../node_modules/yaml/dist/schema/core/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports2.schema = schema;
  }
});

// ../../node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "../../node_modules/yaml/dist/schema/json/schema.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports2.schema = schema;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports2) {
    "use strict";
    var node_buffer = require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports2.binary = binary;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports2.createPairs = createPairs;
    exports2.pairs = pairs;
    exports2.resolvePairs = resolvePairs;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports2.YAMLOMap = YAMLOMap;
    exports2.omap = omap;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports2.falseTag = falseTag;
    exports2.trueTag = trueTag;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intBin = intBin;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports2.YAMLSet = YAMLSet;
    exports2.set = set;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports2.floatTime = floatTime;
    exports2.intTime = intTime;
    exports2.timestamp = timestamp;
  }
});

// ../../node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "../../node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports2.schema = schema;
  }
});

// ../../node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "../../node_modules/yaml/dist/schema/tags.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports2.coreKnownTags = coreKnownTags;
    exports2.getTags = getTags;
  }
});

// ../../node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "../../node_modules/yaml/dist/schema/Schema.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports2.Schema = Schema;
  }
});

// ../../node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "../../node_modules/yaml/dist/stringify/stringifyDocument.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports2.stringifyDocument = stringifyDocument;
  }
});

// ../../node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "../../node_modules/yaml/dist/doc/Document.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path3, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path3, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path3) {
        if (Collection.isEmptyPath(path3)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path3) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path3, keepScalar) {
        if (Collection.isEmptyPath(path3))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path3, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path3) {
        if (Collection.isEmptyPath(path3))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path3) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path3, value) {
        if (Collection.isEmptyPath(path3)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path3), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path3, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports2.Document = Document;
  }
});

// ../../node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "../../node_modules/yaml/dist/errors.js"(exports2) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports2.YAMLError = YAMLError;
    exports2.YAMLParseError = YAMLParseError;
    exports2.YAMLWarning = YAMLWarning;
    exports2.prettifyError = prettifyError;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-props.js"(exports2) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports2.resolveProps = resolveProps;
  }
});

// ../../node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "../../node_modules/yaml/dist/compose/util-contains-newline.js"(exports2) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports2.containsNewline = containsNewline;
  }
});

// ../../node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "../../node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports2) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports2.flowIndentCheck = flowIndentCheck;
  }
});

// ../../node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "../../node_modules/yaml/dist/compose/util-map-includes.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports2.mapIncludes = mapIncludes;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-block-map.js"(exports2) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports2.resolveBlockMap = resolveBlockMap;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-block-seq.js"(exports2) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports2.resolveBlockSeq = resolveBlockSeq;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-end.js"(exports2) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports2.resolveEnd = resolveEnd;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop:
              for (const st of start) {
                switch (st.type) {
                  case "comma":
                  case "space":
                    break;
                  case "comment":
                    prevItemComment = st.source.substring(1);
                    break loop;
                  default:
                    break loop;
                }
              }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports2.resolveFlowCollection = resolveFlowCollection;
  }
});

// ../../node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "../../node_modules/yaml/dist/compose/compose-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports2.composeCollection = composeCollection;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports2.resolveBlockScalar = resolveBlockScalar;
  }
});

// ../../node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "../../node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + match[1];
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = { x: 2, u: 4, U: 8 }[next];
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      if (isNaN(code)) {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
      return String.fromCodePoint(code);
    }
    exports2.resolveFlowScalar = resolveFlowScalar;
  }
});

// ../../node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "../../node_modules/yaml/dist/compose/compose-scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports2.composeScalar = composeScalar;
  }
});

// ../../node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "../../node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports2) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports2.emptyScalarPosition = emptyScalarPosition;
  }
});

// ../../node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "../../node_modules/yaml/dist/compose/compose-node.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports2.composeEmptyNode = composeEmptyNode;
    exports2.composeNode = composeNode;
  }
});

// ../../node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "../../node_modules/yaml/dist/compose/compose-doc.js"(exports2) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports2.composeDoc = composeDoc;
  }
});

// ../../node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "../../node_modules/yaml/dist/compose/composer.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          Array.prototype.push.apply(doc.errors, this.errors);
          Array.prototype.push.apply(doc.warnings, this.warnings);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports2.Composer = Composer;
  }
});

// ../../node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "../../node_modules/yaml/dist/parse/cst-scalar.js"(exports2) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports2.createScalarToken = createScalarToken;
    exports2.resolveAsScalar = resolveAsScalar;
    exports2.setScalarValue = setScalarValue;
  }
});

// ../../node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "../../node_modules/yaml/dist/parse/cst-stringify.js"(exports2) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports2.stringify = stringify;
  }
});

// ../../node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "../../node_modules/yaml/dist/parse/cst-visit.js"(exports2) {
    "use strict";
    var BREAK = Symbol("break visit");
    var SKIP = Symbol("skip children");
    var REMOVE = Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path3) => {
      let item = cst;
      for (const [field, index] of path3) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path3) => {
      const parent = visit.itemAtPath(cst, path3.slice(0, -1));
      const field = path3[path3.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path3, item, visitor) {
      let ctrl = visitor(item, path3);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path3.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path3);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path3) : ctrl;
    }
    exports2.visit = visit;
  }
});

// ../../node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "../../node_modules/yaml/dist/parse/cst.js"(exports2) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports2.createScalarToken = cstScalar.createScalarToken;
    exports2.resolveAsScalar = cstScalar.resolveAsScalar;
    exports2.setScalarValue = cstScalar.setScalarValue;
    exports2.stringify = cstStringify.stringify;
    exports2.visit = cstVisit.visit;
    exports2.BOM = BOM;
    exports2.DOCUMENT = DOCUMENT;
    exports2.FLOW_END = FLOW_END;
    exports2.SCALAR = SCALAR;
    exports2.isCollection = isCollection;
    exports2.isScalar = isScalar;
    exports2.prettyToken = prettyToken;
    exports2.tokenType = tokenType;
  }
});

// ../../node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "../../node_modules/yaml/dist/parse/lexer.js"(exports2) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return yield* this.parseBlockStart();
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop:
          for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
            switch (ch) {
              case " ":
                indent += 1;
                break;
              case "\n":
                nl = i2;
                indent = 0;
                break;
              case "\r": {
                const next = this.buffer[i2 + 1];
                if (!next && !this.atEnd)
                  return this.setNext("block-scalar");
                if (next === "\n")
                  break;
              }
              default:
                break loop;
            }
          }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        switch (this.charAt(0)) {
          case "!":
            return (yield* this.pushTag()) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          case "&":
            return (yield* this.pushUntil(isNotAnchorChar)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          case "-":
          case "?":
          case ":": {
            const inFlow = this.flowLevel > 0;
            const ch1 = this.charAt(1);
            if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
              if (!inFlow)
                this.indentNext = this.indentValue + 1;
              else if (this.flowKey)
                this.flowKey = false;
              return (yield* this.pushCount(1)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
            }
          }
        }
        return 0;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports2.Lexer = Lexer;
  }
});

// ../../node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "../../node_modules/yaml/dist/parse/line-counter.js"(exports2) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports2.LineCounter = LineCounter;
  }
});

// ../../node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "../../node_modules/yaml/dist/parse/parser.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop:
        while (--i >= 0) {
          switch (prev[i].type) {
            case "doc-start":
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
            case "newline":
              break loop;
          }
        }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                Array.prototype.push.apply(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              Array.prototype.push.apply(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  Array.prototype.push.apply(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs3 = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs3, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs3);
              } else {
                Object.assign(it, { key: fs3, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  Array.prototype.push.apply(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs3 = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs3, sep: [] });
              else if (it.sep)
                this.stack.push(fs3);
              else
                Object.assign(it, { key: fs3, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports2.Parser = Parser;
  }
});

// ../../node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "../../node_modules/yaml/dist/public-api.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log2 = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log2.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports2.parse = parse;
    exports2.parseAllDocuments = parseAllDocuments;
    exports2.parseDocument = parseDocument;
    exports2.stringify = stringify;
  }
});

// ../../node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/yaml/dist/index.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports2.Composer = composer.Composer;
    exports2.Document = Document.Document;
    exports2.Schema = Schema.Schema;
    exports2.YAMLError = errors.YAMLError;
    exports2.YAMLParseError = errors.YAMLParseError;
    exports2.YAMLWarning = errors.YAMLWarning;
    exports2.Alias = Alias.Alias;
    exports2.isAlias = identity.isAlias;
    exports2.isCollection = identity.isCollection;
    exports2.isDocument = identity.isDocument;
    exports2.isMap = identity.isMap;
    exports2.isNode = identity.isNode;
    exports2.isPair = identity.isPair;
    exports2.isScalar = identity.isScalar;
    exports2.isSeq = identity.isSeq;
    exports2.Pair = Pair.Pair;
    exports2.Scalar = Scalar.Scalar;
    exports2.YAMLMap = YAMLMap.YAMLMap;
    exports2.YAMLSeq = YAMLSeq.YAMLSeq;
    exports2.CST = cst;
    exports2.Lexer = lexer.Lexer;
    exports2.LineCounter = lineCounter.LineCounter;
    exports2.Parser = parser.Parser;
    exports2.parse = publicApi.parse;
    exports2.parseAllDocuments = publicApi.parseAllDocuments;
    exports2.parseDocument = publicApi.parseDocument;
    exports2.stringify = publicApi.stringify;
    exports2.visit = visit.visit;
    exports2.visitAsync = visit.visitAsync;
  }
});

// ../../node_modules/zod/v3/helpers/util.cjs
var require_util = __commonJS({
  "../../node_modules/zod/v3/helpers/util.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getParsedType = exports2.ZodParsedType = exports2.objectUtil = exports2.util = void 0;
    var util;
    (function(util2) {
      util2.assertEqual = (_) => {
      };
      function assertIs(_arg) {
      }
      util2.assertIs = assertIs;
      function assertNever(_x) {
        throw new Error();
      }
      util2.assertNever = assertNever;
      util2.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
          obj[item] = item;
        }
        return obj;
      };
      util2.getValidEnumValues = (obj) => {
        const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
          filtered[k] = obj[k];
        }
        return util2.objectValues(filtered);
      };
      util2.objectValues = (obj) => {
        return util2.objectKeys(obj).map(function(e) {
          return obj[e];
        });
      };
      util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
        const keys = [];
        for (const key in object) {
          if (Object.prototype.hasOwnProperty.call(object, key)) {
            keys.push(key);
          }
        }
        return keys;
      };
      util2.find = (arr, checker) => {
        for (const item of arr) {
          if (checker(item))
            return item;
        }
        return void 0;
      };
      util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
      function joinValues(array, separator = " | ") {
        return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
      }
      util2.joinValues = joinValues;
      util2.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
    })(util || (exports2.util = util = {}));
    var objectUtil;
    (function(objectUtil2) {
      objectUtil2.mergeShapes = (first, second) => {
        return {
          ...first,
          ...second
          // second overwrites first
        };
      };
    })(objectUtil || (exports2.objectUtil = objectUtil = {}));
    exports2.ZodParsedType = util.arrayToEnum([
      "string",
      "nan",
      "number",
      "integer",
      "float",
      "boolean",
      "date",
      "bigint",
      "symbol",
      "function",
      "undefined",
      "null",
      "array",
      "object",
      "unknown",
      "promise",
      "void",
      "never",
      "map",
      "set"
    ]);
    var getParsedType = (data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return exports2.ZodParsedType.undefined;
        case "string":
          return exports2.ZodParsedType.string;
        case "number":
          return Number.isNaN(data) ? exports2.ZodParsedType.nan : exports2.ZodParsedType.number;
        case "boolean":
          return exports2.ZodParsedType.boolean;
        case "function":
          return exports2.ZodParsedType.function;
        case "bigint":
          return exports2.ZodParsedType.bigint;
        case "symbol":
          return exports2.ZodParsedType.symbol;
        case "object":
          if (Array.isArray(data)) {
            return exports2.ZodParsedType.array;
          }
          if (data === null) {
            return exports2.ZodParsedType.null;
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return exports2.ZodParsedType.promise;
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return exports2.ZodParsedType.map;
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return exports2.ZodParsedType.set;
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return exports2.ZodParsedType.date;
          }
          return exports2.ZodParsedType.object;
        default:
          return exports2.ZodParsedType.unknown;
      }
    };
    exports2.getParsedType = getParsedType;
  }
});

// ../../node_modules/zod/v3/ZodError.cjs
var require_ZodError = __commonJS({
  "../../node_modules/zod/v3/ZodError.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ZodError = exports2.quotelessJson = exports2.ZodIssueCode = void 0;
    var util_js_1 = require_util();
    exports2.ZodIssueCode = util_js_1.util.arrayToEnum([
      "invalid_type",
      "invalid_literal",
      "custom",
      "invalid_union",
      "invalid_union_discriminator",
      "invalid_enum_value",
      "unrecognized_keys",
      "invalid_arguments",
      "invalid_return_type",
      "invalid_date",
      "invalid_string",
      "too_small",
      "too_big",
      "invalid_intersection_types",
      "not_multiple_of",
      "not_finite"
    ]);
    var quotelessJson = (obj) => {
      const json = JSON.stringify(obj, null, 2);
      return json.replace(/"([^"]+)":/g, "$1:");
    };
    exports2.quotelessJson = quotelessJson;
    var ZodError = class _ZodError extends Error {
      get errors() {
        return this.issues;
      }
      constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
          this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
          this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(this, actualProto);
        } else {
          this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
      }
      format(_mapper) {
        const mapper = _mapper || function(issue) {
          return issue.message;
        };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
          for (const issue of error.issues) {
            if (issue.code === "invalid_union") {
              issue.unionErrors.map(processError);
            } else if (issue.code === "invalid_return_type") {
              processError(issue.returnTypeError);
            } else if (issue.code === "invalid_arguments") {
              processError(issue.argumentsError);
            } else if (issue.path.length === 0) {
              fieldErrors._errors.push(mapper(issue));
            } else {
              let curr = fieldErrors;
              let i = 0;
              while (i < issue.path.length) {
                const el = issue.path[i];
                const terminal = i === issue.path.length - 1;
                if (!terminal) {
                  curr[el] = curr[el] || { _errors: [] };
                } else {
                  curr[el] = curr[el] || { _errors: [] };
                  curr[el]._errors.push(mapper(issue));
                }
                curr = curr[el];
                i++;
              }
            }
          }
        };
        processError(this);
        return fieldErrors;
      }
      static assert(value) {
        if (!(value instanceof _ZodError)) {
          throw new Error(`Not a ZodError: ${value}`);
        }
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, util_js_1.util.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
          if (sub.path.length > 0) {
            const firstEl = sub.path[0];
            fieldErrors[firstEl] = fieldErrors[firstEl] || [];
            fieldErrors[firstEl].push(mapper(sub));
          } else {
            formErrors.push(mapper(sub));
          }
        }
        return { formErrors, fieldErrors };
      }
      get formErrors() {
        return this.flatten();
      }
    };
    exports2.ZodError = ZodError;
    ZodError.create = (issues) => {
      const error = new ZodError(issues);
      return error;
    };
  }
});

// ../../node_modules/zod/v3/locales/en.cjs
var require_en = __commonJS({
  "../../node_modules/zod/v3/locales/en.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ZodError_js_1 = require_ZodError();
    var util_js_1 = require_util();
    var errorMap = (issue, _ctx) => {
      let message;
      switch (issue.code) {
        case ZodError_js_1.ZodIssueCode.invalid_type:
          if (issue.received === util_js_1.ZodParsedType.undefined) {
            message = "Required";
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case ZodError_js_1.ZodIssueCode.invalid_literal:
          message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util_js_1.util.jsonStringifyReplacer)}`;
          break;
        case ZodError_js_1.ZodIssueCode.unrecognized_keys:
          message = `Unrecognized key(s) in object: ${util_js_1.util.joinValues(issue.keys, ", ")}`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_union:
          message = `Invalid input`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_union_discriminator:
          message = `Invalid discriminator value. Expected ${util_js_1.util.joinValues(issue.options)}`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_enum_value:
          message = `Invalid enum value. Expected ${util_js_1.util.joinValues(issue.options)}, received '${issue.received}'`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_arguments:
          message = `Invalid function arguments`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_return_type:
          message = `Invalid function return type`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_date:
          message = `Invalid date`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_string:
          if (typeof issue.validation === "object") {
            if ("includes" in issue.validation) {
              message = `Invalid input: must include "${issue.validation.includes}"`;
              if (typeof issue.validation.position === "number") {
                message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
              }
            } else if ("startsWith" in issue.validation) {
              message = `Invalid input: must start with "${issue.validation.startsWith}"`;
            } else if ("endsWith" in issue.validation) {
              message = `Invalid input: must end with "${issue.validation.endsWith}"`;
            } else {
              util_js_1.util.assertNever(issue.validation);
            }
          } else if (issue.validation !== "regex") {
            message = `Invalid ${issue.validation}`;
          } else {
            message = "Invalid";
          }
          break;
        case ZodError_js_1.ZodIssueCode.too_small:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "bigint")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
          else
            message = "Invalid input";
          break;
        case ZodError_js_1.ZodIssueCode.too_big:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "bigint")
            message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
          else
            message = "Invalid input";
          break;
        case ZodError_js_1.ZodIssueCode.custom:
          message = `Invalid input`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_intersection_types:
          message = `Intersection results could not be merged`;
          break;
        case ZodError_js_1.ZodIssueCode.not_multiple_of:
          message = `Number must be a multiple of ${issue.multipleOf}`;
          break;
        case ZodError_js_1.ZodIssueCode.not_finite:
          message = "Number must be finite";
          break;
        default:
          message = _ctx.defaultError;
          util_js_1.util.assertNever(issue);
      }
      return { message };
    };
    exports2.default = errorMap;
  }
});

// ../../node_modules/zod/v3/errors.cjs
var require_errors2 = __commonJS({
  "../../node_modules/zod/v3/errors.cjs"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultErrorMap = void 0;
    exports2.setErrorMap = setErrorMap;
    exports2.getErrorMap = getErrorMap;
    var en_js_1 = __importDefault(require_en());
    exports2.defaultErrorMap = en_js_1.default;
    var overrideErrorMap = en_js_1.default;
    function setErrorMap(map) {
      overrideErrorMap = map;
    }
    function getErrorMap() {
      return overrideErrorMap;
    }
  }
});

// ../../node_modules/zod/v3/helpers/parseUtil.cjs
var require_parseUtil = __commonJS({
  "../../node_modules/zod/v3/helpers/parseUtil.cjs"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isAsync = exports2.isValid = exports2.isDirty = exports2.isAborted = exports2.OK = exports2.DIRTY = exports2.INVALID = exports2.ParseStatus = exports2.EMPTY_PATH = exports2.makeIssue = void 0;
    exports2.addIssueToContext = addIssueToContext;
    var errors_js_1 = require_errors2();
    var en_js_1 = __importDefault(require_en());
    var makeIssue = (params) => {
      const { data, path: path3, errorMaps, issueData } = params;
      const fullPath = [...path3, ...issueData.path || []];
      const fullIssue = {
        ...issueData,
        path: fullPath
      };
      if (issueData.message !== void 0) {
        return {
          ...issueData,
          path: fullPath,
          message: issueData.message
        };
      }
      let errorMessage = "";
      const maps = errorMaps.filter((m) => !!m).slice().reverse();
      for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
      }
      return {
        ...issueData,
        path: fullPath,
        message: errorMessage
      };
    };
    exports2.makeIssue = makeIssue;
    exports2.EMPTY_PATH = [];
    function addIssueToContext(ctx, issueData) {
      const overrideMap = (0, errors_js_1.getErrorMap)();
      const issue = (0, exports2.makeIssue)({
        issueData,
        data: ctx.data,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          // contextual error map is first priority
          ctx.schemaErrorMap,
          // then schema-bound map if available
          overrideMap,
          // then global override map
          overrideMap === en_js_1.default ? void 0 : en_js_1.default
          // then global default map
        ].filter((x) => !!x)
      });
      ctx.common.issues.push(issue);
    }
    var ParseStatus = class _ParseStatus {
      constructor() {
        this.value = "valid";
      }
      dirty() {
        if (this.value === "valid")
          this.value = "dirty";
      }
      abort() {
        if (this.value !== "aborted")
          this.value = "aborted";
      }
      static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
          if (s.status === "aborted")
            return exports2.INVALID;
          if (s.status === "dirty")
            status.dirty();
          arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
      }
      static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value
          });
        }
        return _ParseStatus.mergeObjectSync(status, syncPairs);
      }
      static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
          const { key, value } = pair;
          if (key.status === "aborted")
            return exports2.INVALID;
          if (value.status === "aborted")
            return exports2.INVALID;
          if (key.status === "dirty")
            status.dirty();
          if (value.status === "dirty")
            status.dirty();
          if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
            finalObject[key.value] = value.value;
          }
        }
        return { status: status.value, value: finalObject };
      }
    };
    exports2.ParseStatus = ParseStatus;
    exports2.INVALID = Object.freeze({
      status: "aborted"
    });
    var DIRTY = (value) => ({ status: "dirty", value });
    exports2.DIRTY = DIRTY;
    var OK = (value) => ({ status: "valid", value });
    exports2.OK = OK;
    var isAborted = (x) => x.status === "aborted";
    exports2.isAborted = isAborted;
    var isDirty = (x) => x.status === "dirty";
    exports2.isDirty = isDirty;
    var isValid = (x) => x.status === "valid";
    exports2.isValid = isValid;
    var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
    exports2.isAsync = isAsync;
  }
});

// ../../node_modules/zod/v3/helpers/typeAliases.cjs
var require_typeAliases = __commonJS({
  "../../node_modules/zod/v3/helpers/typeAliases.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// ../../node_modules/zod/v3/helpers/errorUtil.cjs
var require_errorUtil = __commonJS({
  "../../node_modules/zod/v3/helpers/errorUtil.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.errorUtil = void 0;
    var errorUtil;
    (function(errorUtil2) {
      errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
      errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
    })(errorUtil || (exports2.errorUtil = errorUtil = {}));
  }
});

// ../../node_modules/zod/v3/types.cjs
var require_types = __commonJS({
  "../../node_modules/zod/v3/types.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.discriminatedUnion = exports2.date = exports2.boolean = exports2.bigint = exports2.array = exports2.any = exports2.coerce = exports2.ZodFirstPartyTypeKind = exports2.late = exports2.ZodSchema = exports2.Schema = exports2.ZodReadonly = exports2.ZodPipeline = exports2.ZodBranded = exports2.BRAND = exports2.ZodNaN = exports2.ZodCatch = exports2.ZodDefault = exports2.ZodNullable = exports2.ZodOptional = exports2.ZodTransformer = exports2.ZodEffects = exports2.ZodPromise = exports2.ZodNativeEnum = exports2.ZodEnum = exports2.ZodLiteral = exports2.ZodLazy = exports2.ZodFunction = exports2.ZodSet = exports2.ZodMap = exports2.ZodRecord = exports2.ZodTuple = exports2.ZodIntersection = exports2.ZodDiscriminatedUnion = exports2.ZodUnion = exports2.ZodObject = exports2.ZodArray = exports2.ZodVoid = exports2.ZodNever = exports2.ZodUnknown = exports2.ZodAny = exports2.ZodNull = exports2.ZodUndefined = exports2.ZodSymbol = exports2.ZodDate = exports2.ZodBoolean = exports2.ZodBigInt = exports2.ZodNumber = exports2.ZodString = exports2.ZodType = void 0;
    exports2.NEVER = exports2.void = exports2.unknown = exports2.union = exports2.undefined = exports2.tuple = exports2.transformer = exports2.symbol = exports2.string = exports2.strictObject = exports2.set = exports2.record = exports2.promise = exports2.preprocess = exports2.pipeline = exports2.ostring = exports2.optional = exports2.onumber = exports2.oboolean = exports2.object = exports2.number = exports2.nullable = exports2.null = exports2.never = exports2.nativeEnum = exports2.nan = exports2.map = exports2.literal = exports2.lazy = exports2.intersection = exports2.instanceof = exports2.function = exports2.enum = exports2.effect = void 0;
    exports2.datetimeRegex = datetimeRegex;
    exports2.custom = custom;
    var ZodError_js_1 = require_ZodError();
    var errors_js_1 = require_errors2();
    var errorUtil_js_1 = require_errorUtil();
    var parseUtil_js_1 = require_parseUtil();
    var util_js_1 = require_util();
    var ParseInputLazyPath = class {
      constructor(parent, value, path3, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path3;
        this._key = key;
      }
      get path() {
        if (!this._cachedPath.length) {
          if (Array.isArray(this._key)) {
            this._cachedPath.push(...this._path, ...this._key);
          } else {
            this._cachedPath.push(...this._path, this._key);
          }
        }
        return this._cachedPath;
      }
    };
    var handleResult = (ctx, result) => {
      if ((0, parseUtil_js_1.isValid)(result)) {
        return { success: true, data: result.value };
      } else {
        if (!ctx.common.issues.length) {
          throw new Error("Validation failed but no issues detected.");
        }
        return {
          success: false,
          get error() {
            if (this._error)
              return this._error;
            const error = new ZodError_js_1.ZodError(ctx.common.issues);
            this._error = error;
            return this._error;
          }
        };
      }
    };
    function processCreateParams(params) {
      if (!params)
        return {};
      const { errorMap, invalid_type_error, required_error, description } = params;
      if (errorMap && (invalid_type_error || required_error)) {
        throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
      }
      if (errorMap)
        return { errorMap, description };
      const customMap = (iss, ctx) => {
        const { message } = params;
        if (iss.code === "invalid_enum_value") {
          return { message: message ?? ctx.defaultError };
        }
        if (typeof ctx.data === "undefined") {
          return { message: message ?? required_error ?? ctx.defaultError };
        }
        if (iss.code !== "invalid_type")
          return { message: ctx.defaultError };
        return { message: message ?? invalid_type_error ?? ctx.defaultError };
      };
      return { errorMap: customMap, description };
    }
    var ZodType = class {
      get description() {
        return this._def.description;
      }
      _getType(input) {
        return (0, util_js_1.getParsedType)(input.data);
      }
      _getOrReturnCtx(input, ctx) {
        return ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: (0, util_js_1.getParsedType)(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        };
      }
      _processInputParams(input) {
        return {
          status: new parseUtil_js_1.ParseStatus(),
          ctx: {
            common: input.parent.common,
            data: input.data,
            parsedType: (0, util_js_1.getParsedType)(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent
          }
        };
      }
      _parseSync(input) {
        const result = this._parse(input);
        if ((0, parseUtil_js_1.isAsync)(result)) {
          throw new Error("Synchronous parse encountered promise.");
        }
        return result;
      }
      _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
      }
      parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      safeParse(data, params) {
        const ctx = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
      }
      "~validate"(data) {
        const ctx = {
          common: {
            issues: [],
            async: !!this["~standard"].async
          },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        if (!this["~standard"].async) {
          try {
            const result = this._parseSync({ data, path: [], parent: ctx });
            return (0, parseUtil_js_1.isValid)(result) ? {
              value: result.value
            } : {
              issues: ctx.common.issues
            };
          } catch (err) {
            if (err?.message?.toLowerCase()?.includes("encountered")) {
              this["~standard"].async = true;
            }
            ctx.common = {
              issues: [],
              async: true
            };
          }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => (0, parseUtil_js_1.isValid)(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        });
      }
      async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      async safeParseAsync(data, params) {
        const ctx = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await ((0, parseUtil_js_1.isAsync)(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
      }
      refine(check, message) {
        const getIssueProperties = (val) => {
          if (typeof message === "string" || typeof message === "undefined") {
            return { message };
          } else if (typeof message === "function") {
            return message(val);
          } else {
            return message;
          }
        };
        return this._refinement((val, ctx) => {
          const result = check(val);
          const setError = () => ctx.addIssue({
            code: ZodError_js_1.ZodIssueCode.custom,
            ...getIssueProperties(val)
          });
          if (typeof Promise !== "undefined" && result instanceof Promise) {
            return result.then((data) => {
              if (!data) {
                setError();
                return false;
              } else {
                return true;
              }
            });
          }
          if (!result) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
          if (!check(val)) {
            ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
            return false;
          } else {
            return true;
          }
        });
      }
      _refinement(refinement) {
        return new ZodEffects({
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "refinement", refinement }
        });
      }
      superRefine(refinement) {
        return this._refinement(refinement);
      }
      constructor(def) {
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
          version: 1,
          vendor: "zod",
          validate: (data) => this["~validate"](data)
        };
      }
      optional() {
        return ZodOptional.create(this, this._def);
      }
      nullable() {
        return ZodNullable.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return ZodArray.create(this);
      }
      promise() {
        return ZodPromise.create(this, this._def);
      }
      or(option) {
        return ZodUnion.create([this, option], this._def);
      }
      and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
      }
      transform(transform) {
        return new ZodEffects({
          ...processCreateParams(this._def),
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "transform", transform }
        });
      }
      default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
          ...processCreateParams(this._def),
          innerType: this,
          defaultValue: defaultValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodDefault
        });
      }
      brand() {
        return new ZodBranded({
          typeName: ZodFirstPartyTypeKind.ZodBranded,
          type: this,
          ...processCreateParams(this._def)
        });
      }
      catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
          ...processCreateParams(this._def),
          innerType: this,
          catchValue: catchValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodCatch
        });
      }
      describe(description) {
        const This = this.constructor;
        return new This({
          ...this._def,
          description
        });
      }
      pipe(target) {
        return ZodPipeline.create(this, target);
      }
      readonly() {
        return ZodReadonly.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    };
    exports2.ZodType = ZodType;
    exports2.Schema = ZodType;
    exports2.ZodSchema = ZodType;
    var cuidRegex = /^c[^\s-]{8,}$/i;
    var cuid2Regex = /^[0-9a-z]+$/;
    var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
    var nanoidRegex = /^[a-z0-9_-]{21}$/i;
    var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    var emojiRegex;
    var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
    var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
    var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
    var dateRegex = new RegExp(`^${dateRegexSource}$`);
    function timeRegexSource(args) {
      let secondsRegexSource = `[0-5]\\d`;
      if (args.precision) {
        secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
      } else if (args.precision == null) {
        secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
      }
      const secondsQuantifier = args.precision ? "+" : "?";
      return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
    }
    function timeRegex(args) {
      return new RegExp(`^${timeRegexSource(args)}$`);
    }
    function datetimeRegex(args) {
      let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
      const opts = [];
      opts.push(args.local ? `Z?` : `Z`);
      if (args.offset)
        opts.push(`([+-]\\d{2}:?\\d{2})`);
      regex = `${regex}(${opts.join("|")})`;
      return new RegExp(`^${regex}$`);
    }
    function isValidIP(ip, version) {
      if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
        return true;
      }
      if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
        return true;
      }
      return false;
    }
    function isValidJWT(jwt, alg) {
      if (!jwtRegex.test(jwt))
        return false;
      try {
        const [header] = jwt.split(".");
        if (!header)
          return false;
        const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
        const decoded = JSON.parse(atob(base64));
        if (typeof decoded !== "object" || decoded === null)
          return false;
        if ("typ" in decoded && decoded?.typ !== "JWT")
          return false;
        if (!decoded.alg)
          return false;
        if (alg && decoded.alg !== alg)
          return false;
        return true;
      } catch {
        return false;
      }
    }
    function isValidCidr(ip, version) {
      if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
        return true;
      }
      if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
        return true;
      }
      return false;
    }
    var ZodString = class _ZodString extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.string) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.string,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const status = new parseUtil_js_1.ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.length < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.length > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "length") {
            const tooBig = input.data.length > check.value;
            const tooSmall = input.data.length < check.value;
            if (tooBig || tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              if (tooBig) {
                (0, parseUtil_js_1.addIssueToContext)(ctx, {
                  code: ZodError_js_1.ZodIssueCode.too_big,
                  maximum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              } else if (tooSmall) {
                (0, parseUtil_js_1.addIssueToContext)(ctx, {
                  code: ZodError_js_1.ZodIssueCode.too_small,
                  minimum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              }
              status.dirty();
            }
          } else if (check.kind === "email") {
            if (!emailRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "email",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "emoji") {
            if (!emojiRegex) {
              emojiRegex = new RegExp(_emojiRegex, "u");
            }
            if (!emojiRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "emoji",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "uuid") {
            if (!uuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "uuid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "nanoid") {
            if (!nanoidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "nanoid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid") {
            if (!cuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cuid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid2") {
            if (!cuid2Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cuid2",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ulid") {
            if (!ulidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "ulid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "url") {
            try {
              new URL(input.data);
            } catch {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "url",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "regex") {
            check.regex.lastIndex = 0;
            const testResult = check.regex.test(input.data);
            if (!testResult) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "regex",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "trim") {
            input.data = input.data.trim();
          } else if (check.kind === "includes") {
            if (!input.data.includes(check.value, check.position)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { includes: check.value, position: check.position },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "toLowerCase") {
            input.data = input.data.toLowerCase();
          } else if (check.kind === "toUpperCase") {
            input.data = input.data.toUpperCase();
          } else if (check.kind === "startsWith") {
            if (!input.data.startsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { startsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "endsWith") {
            if (!input.data.endsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { endsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "datetime") {
            const regex = datetimeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "datetime",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "date") {
            const regex = dateRegex;
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "date",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "time") {
            const regex = timeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "time",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "duration") {
            if (!durationRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "duration",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ip") {
            if (!isValidIP(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "ip",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "jwt") {
            if (!isValidJWT(input.data, check.alg)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "jwt",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cidr") {
            if (!isValidCidr(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cidr",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64") {
            if (!base64Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "base64",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64url") {
            if (!base64urlRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "base64url",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
          validation,
          code: ZodError_js_1.ZodIssueCode.invalid_string,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      _addCheck(check) {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      email(message) {
        return this._addCheck({ kind: "email", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      url(message) {
        return this._addCheck({ kind: "url", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      base64url(message) {
        return this._addCheck({
          kind: "base64url",
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      datetime(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "datetime",
            precision: null,
            offset: false,
            local: false,
            message: options
          });
        }
        return this._addCheck({
          kind: "datetime",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          offset: options?.offset ?? false,
          local: options?.local ?? false,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      date(message) {
        return this._addCheck({ kind: "date", message });
      }
      time(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "time",
            precision: null,
            message: options
          });
        }
        return this._addCheck({
          kind: "time",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      regex(regex, message) {
        return this._addCheck({
          kind: "regex",
          regex,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      includes(value, options) {
        return this._addCheck({
          kind: "includes",
          value,
          position: options?.position,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      startsWith(value, message) {
        return this._addCheck({
          kind: "startsWith",
          value,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      endsWith(value, message) {
        return this._addCheck({
          kind: "endsWith",
          value,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      min(minLength, message) {
        return this._addCheck({
          kind: "min",
          value: minLength,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      max(maxLength, message) {
        return this._addCheck({
          kind: "max",
          value: maxLength,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      length(len, message) {
        return this._addCheck({
          kind: "length",
          value: len,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      /**
       * Equivalent to `.min(1)`
       */
      nonempty(message) {
        return this.min(1, errorUtil_js_1.errorUtil.errToObj(message));
      }
      trim() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "trim" }]
        });
      }
      toLowerCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toLowerCase" }]
        });
      }
      toUpperCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toUpperCase" }]
        });
      }
      get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
      }
      get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
      }
      get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
      }
      get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
      }
      get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
      }
      get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
      }
      get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
      }
      get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
      }
      get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
      }
      get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
      }
      get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
      }
      get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
      }
      get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
      }
      get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
      }
      get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
      }
      get isBase64url() {
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
      }
      get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    exports2.ZodString = ZodString;
    ZodString.create = (params) => {
      return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    function floatSafeRemainder(val, step) {
      const valDecCount = (val.toString().split(".")[1] || "").length;
      const stepDecCount = (step.toString().split(".")[1] || "").length;
      const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
      const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
      const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
      return valInt % stepInt / 10 ** decCount;
    }
    var ZodNumber = class _ZodNumber extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
      }
      _parse(input) {
        if (this._def.coerce) {
          input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.number) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.number,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        let ctx = void 0;
        const status = new parseUtil_js_1.ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "int") {
            if (!util_js_1.util.isInteger(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_type,
                expected: "integer",
                received: "float",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                minimum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                maximum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (floatSafeRemainder(input.data, check.value) !== 0) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "finite") {
            if (!Number.isFinite(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_finite,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodNumber({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil_js_1.errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodNumber({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      int(message) {
        return this._addCheck({
          kind: "int",
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      finite(message) {
        return this._addCheck({
          kind: "finite",
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      safe(message) {
        return this._addCheck({
          kind: "min",
          inclusive: true,
          value: Number.MIN_SAFE_INTEGER,
          message: errorUtil_js_1.errorUtil.toString(message)
        })._addCheck({
          kind: "max",
          inclusive: true,
          value: Number.MAX_SAFE_INTEGER,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
      get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util_js_1.util.isInteger(ch.value));
      }
      get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
            return true;
          } else if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          } else if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return Number.isFinite(min) && Number.isFinite(max);
      }
    };
    exports2.ZodNumber = ZodNumber;
    ZodNumber.create = (params) => {
      return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    var ZodBigInt = class _ZodBigInt extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
      }
      _parse(input) {
        if (this._def.coerce) {
          try {
            input.data = BigInt(input.data);
          } catch {
            return this._getInvalidInput(input);
          }
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.bigint) {
          return this._getInvalidInput(input);
        }
        let ctx = void 0;
        const status = new parseUtil_js_1.ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                type: "bigint",
                minimum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                type: "bigint",
                maximum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (input.data % check.value !== BigInt(0)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        (0, parseUtil_js_1.addIssueToContext)(ctx, {
          code: ZodError_js_1.ZodIssueCode.invalid_type,
          expected: util_js_1.ZodParsedType.bigint,
          received: ctx.parsedType
        });
        return parseUtil_js_1.INVALID;
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodBigInt({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil_js_1.errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodBigInt({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    exports2.ZodBigInt = ZodBigInt;
    ZodBigInt.create = (params) => {
      return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    var ZodBoolean = class extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.boolean) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.boolean,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodBoolean = ZodBoolean;
    ZodBoolean.create = (params) => {
      return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    var ZodDate = class _ZodDate extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.date) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.date,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_date
          });
          return parseUtil_js_1.INVALID;
        }
        const status = new parseUtil_js_1.ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.getTime() < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                message: check.message,
                inclusive: true,
                exact: false,
                minimum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.getTime() > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                message: check.message,
                inclusive: true,
                exact: false,
                maximum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return {
          status: status.value,
          value: new Date(input.data.getTime())
        };
      }
      _addCheck(check) {
        return new _ZodDate({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      min(minDate, message) {
        return this._addCheck({
          kind: "min",
          value: minDate.getTime(),
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      max(maxDate, message) {
        return this._addCheck({
          kind: "max",
          value: maxDate.getTime(),
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min != null ? new Date(min) : null;
      }
      get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max != null ? new Date(max) : null;
      }
    };
    exports2.ZodDate = ZodDate;
    ZodDate.create = (params) => {
      return new ZodDate({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params)
      });
    };
    var ZodSymbol = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.symbol) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.symbol,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodSymbol = ZodSymbol;
    ZodSymbol.create = (params) => {
      return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params)
      });
    };
    var ZodUndefined = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.undefined,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodUndefined = ZodUndefined;
    ZodUndefined.create = (params) => {
      return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params)
      });
    };
    var ZodNull = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.null) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.null,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodNull = ZodNull;
    ZodNull.create = (params) => {
      return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params)
      });
    };
    var ZodAny = class extends ZodType {
      constructor() {
        super(...arguments);
        this._any = true;
      }
      _parse(input) {
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodAny = ZodAny;
    ZodAny.create = (params) => {
      return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params)
      });
    };
    var ZodUnknown = class extends ZodType {
      constructor() {
        super(...arguments);
        this._unknown = true;
      }
      _parse(input) {
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodUnknown = ZodUnknown;
    ZodUnknown.create = (params) => {
      return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params)
      });
    };
    var ZodNever = class extends ZodType {
      _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        (0, parseUtil_js_1.addIssueToContext)(ctx, {
          code: ZodError_js_1.ZodIssueCode.invalid_type,
          expected: util_js_1.ZodParsedType.never,
          received: ctx.parsedType
        });
        return parseUtil_js_1.INVALID;
      }
    };
    exports2.ZodNever = ZodNever;
    ZodNever.create = (params) => {
      return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params)
      });
    };
    var ZodVoid = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.void,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodVoid = ZodVoid;
    ZodVoid.create = (params) => {
      return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params)
      });
    };
    var ZodArray = class _ZodArray extends ZodType {
      _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== util_js_1.ZodParsedType.array) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.array,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (def.exactLength !== null) {
          const tooBig = ctx.data.length > def.exactLength.value;
          const tooSmall = ctx.data.length < def.exactLength.value;
          if (tooBig || tooSmall) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: tooBig ? ZodError_js_1.ZodIssueCode.too_big : ZodError_js_1.ZodIssueCode.too_small,
              minimum: tooSmall ? def.exactLength.value : void 0,
              maximum: tooBig ? def.exactLength.value : void 0,
              type: "array",
              inclusive: true,
              exact: true,
              message: def.exactLength.message
            });
            status.dirty();
          }
        }
        if (def.minLength !== null) {
          if (ctx.data.length < def.minLength.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_small,
              minimum: def.minLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.minLength.message
            });
            status.dirty();
          }
        }
        if (def.maxLength !== null) {
          if (ctx.data.length > def.maxLength.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_big,
              maximum: def.maxLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.maxLength.message
            });
            status.dirty();
          }
        }
        if (ctx.common.async) {
          return Promise.all([...ctx.data].map((item, i) => {
            return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
          })).then((result2) => {
            return parseUtil_js_1.ParseStatus.mergeArray(status, result2);
          });
        }
        const result = [...ctx.data].map((item, i) => {
          return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return parseUtil_js_1.ParseStatus.mergeArray(status, result);
      }
      get element() {
        return this._def.type;
      }
      min(minLength, message) {
        return new _ZodArray({
          ...this._def,
          minLength: { value: minLength, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      max(maxLength, message) {
        return new _ZodArray({
          ...this._def,
          maxLength: { value: maxLength, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      length(len, message) {
        return new _ZodArray({
          ...this._def,
          exactLength: { value: len, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    exports2.ZodArray = ZodArray;
    ZodArray.create = (schema, params) => {
      return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params)
      });
    };
    function deepPartialify(schema) {
      if (schema instanceof ZodObject) {
        const newShape = {};
        for (const key in schema.shape) {
          const fieldSchema = schema.shape[key];
          newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
        }
        return new ZodObject({
          ...schema._def,
          shape: () => newShape
        });
      } else if (schema instanceof ZodArray) {
        return new ZodArray({
          ...schema._def,
          type: deepPartialify(schema.element)
        });
      } else if (schema instanceof ZodOptional) {
        return ZodOptional.create(deepPartialify(schema.unwrap()));
      } else if (schema instanceof ZodNullable) {
        return ZodNullable.create(deepPartialify(schema.unwrap()));
      } else if (schema instanceof ZodTuple) {
        return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
      } else {
        return schema;
      }
    }
    var ZodObject = class _ZodObject extends ZodType {
      constructor() {
        super(...arguments);
        this._cached = null;
        this.nonstrict = this.passthrough;
        this.augment = this.extend;
      }
      _getCached() {
        if (this._cached !== null)
          return this._cached;
        const shape = this._def.shape();
        const keys = util_js_1.util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
      }
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.object) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
          for (const key in ctx.data) {
            if (!shapeKeys.includes(key)) {
              extraKeys.push(key);
            }
          }
        }
        const pairs = [];
        for (const key of shapeKeys) {
          const keyValidator = shape[key];
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (this._def.catchall instanceof ZodNever) {
          const unknownKeys = this._def.unknownKeys;
          if (unknownKeys === "passthrough") {
            for (const key of extraKeys) {
              pairs.push({
                key: { status: "valid", value: key },
                value: { status: "valid", value: ctx.data[key] }
              });
            }
          } else if (unknownKeys === "strict") {
            if (extraKeys.length > 0) {
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.unrecognized_keys,
                keys: extraKeys
              });
              status.dirty();
            }
          } else if (unknownKeys === "strip") {
          } else {
            throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
          }
        } else {
          const catchall = this._def.catchall;
          for (const key of extraKeys) {
            const value = ctx.data[key];
            pairs.push({
              key: { status: "valid", value: key },
              value: catchall._parse(
                new ParseInputLazyPath(ctx, value, ctx.path, key)
                //, ctx.child(key), value, getParsedType(value)
              ),
              alwaysSet: key in ctx.data
            });
          }
        }
        if (ctx.common.async) {
          return Promise.resolve().then(async () => {
            const syncPairs = [];
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              });
            }
            return syncPairs;
          }).then((syncPairs) => {
            return parseUtil_js_1.ParseStatus.mergeObjectSync(status, syncPairs);
          });
        } else {
          return parseUtil_js_1.ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get shape() {
        return this._def.shape();
      }
      strict(message) {
        errorUtil_js_1.errorUtil.errToObj;
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strict",
          ...message !== void 0 ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil_js_1.errorUtil.errToObj(message).message ?? defaultError
                };
              return {
                message: defaultError
              };
            }
          } : {}
        });
      }
      strip() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strip"
        });
      }
      passthrough() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "passthrough"
        });
      }
      // const AugmentFactory =
      //   <Def extends ZodObjectDef>(def: Def) =>
      //   <Augmentation extends ZodRawShape>(
      //     augmentation: Augmentation
      //   ): ZodObject<
      //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
      //     Def["unknownKeys"],
      //     Def["catchall"]
      //   > => {
      //     return new ZodObject({
      //       ...def,
      //       shape: () => ({
      //         ...def.shape(),
      //         ...augmentation,
      //       }),
      //     }) as any;
      //   };
      extend(augmentation) {
        return new _ZodObject({
          ...this._def,
          shape: () => ({
            ...this._def.shape(),
            ...augmentation
          })
        });
      }
      /**
       * Prior to zod@1.0.12 there was a bug in the
       * inferred type of merged objects. Please
       * upgrade if you are experiencing issues.
       */
      merge(merging) {
        const merged = new _ZodObject({
          unknownKeys: merging._def.unknownKeys,
          catchall: merging._def.catchall,
          shape: () => ({
            ...this._def.shape(),
            ...merging._def.shape()
          }),
          typeName: ZodFirstPartyTypeKind.ZodObject
        });
        return merged;
      }
      // merge<
      //   Incoming extends AnyZodObject,
      //   Augmentation extends Incoming["shape"],
      //   NewOutput extends {
      //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
      //       ? Augmentation[k]["_output"]
      //       : k extends keyof Output
      //       ? Output[k]
      //       : never;
      //   },
      //   NewInput extends {
      //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
      //       ? Augmentation[k]["_input"]
      //       : k extends keyof Input
      //       ? Input[k]
      //       : never;
      //   }
      // >(
      //   merging: Incoming
      // ): ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"],
      //   NewOutput,
      //   NewInput
      // > {
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      setKey(key, schema) {
        return this.augment({ [key]: schema });
      }
      // merge<Incoming extends AnyZodObject>(
      //   merging: Incoming
      // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
      // ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"]
      // > {
      //   // const mergedShape = objectUtil.mergeShapes(
      //   //   this._def.shape(),
      //   //   merging._def.shape()
      //   // );
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      catchall(index) {
        return new _ZodObject({
          ...this._def,
          catchall: index
        });
      }
      pick(mask) {
        const shape = {};
        for (const key of util_js_1.util.objectKeys(mask)) {
          if (mask[key] && this.shape[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      omit(mask) {
        const shape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          if (!mask[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      /**
       * @deprecated
       */
      deepPartial() {
        return deepPartialify(this);
      }
      partial(mask) {
        const newShape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          const fieldSchema = this.shape[key];
          if (mask && !mask[key]) {
            newShape[key] = fieldSchema;
          } else {
            newShape[key] = fieldSchema.optional();
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      required(mask) {
        const newShape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          if (mask && !mask[key]) {
            newShape[key] = this.shape[key];
          } else {
            const fieldSchema = this.shape[key];
            let newField = fieldSchema;
            while (newField instanceof ZodOptional) {
              newField = newField._def.innerType;
            }
            newShape[key] = newField;
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      keyof() {
        return createZodEnum(util_js_1.util.objectKeys(this.shape));
      }
    };
    exports2.ZodObject = ZodObject;
    ZodObject.create = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.strictCreate = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.lazycreate = (shape, params) => {
      return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    var ZodUnion = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
          for (const result of results) {
            if (result.result.status === "valid") {
              return result.result;
            }
          }
          for (const result of results) {
            if (result.result.status === "dirty") {
              ctx.common.issues.push(...result.ctx.common.issues);
              return result.result;
            }
          }
          const unionErrors = results.map((result) => new ZodError_js_1.ZodError(result.ctx.common.issues));
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union,
            unionErrors
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.common.async) {
          return Promise.all(options.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            };
          })).then(handleResults);
        } else {
          let dirty = void 0;
          const issues = [];
          for (const option of options) {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            const result = option._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            });
            if (result.status === "valid") {
              return result;
            } else if (result.status === "dirty" && !dirty) {
              dirty = { result, ctx: childCtx };
            }
            if (childCtx.common.issues.length) {
              issues.push(childCtx.common.issues);
            }
          }
          if (dirty) {
            ctx.common.issues.push(...dirty.ctx.common.issues);
            return dirty.result;
          }
          const unionErrors = issues.map((issues2) => new ZodError_js_1.ZodError(issues2));
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union,
            unionErrors
          });
          return parseUtil_js_1.INVALID;
        }
      }
      get options() {
        return this._def.options;
      }
    };
    exports2.ZodUnion = ZodUnion;
    ZodUnion.create = (types, params) => {
      return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params)
      });
    };
    var getDiscriminator = (type) => {
      if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
      } else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
      } else if (type instanceof ZodLiteral) {
        return [type.value];
      } else if (type instanceof ZodEnum) {
        return type.options;
      } else if (type instanceof ZodNativeEnum) {
        return util_js_1.util.objectValues(type.enum);
      } else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
      } else if (type instanceof ZodUndefined) {
        return [void 0];
      } else if (type instanceof ZodNull) {
        return [null];
      } else if (type instanceof ZodOptional) {
        return [void 0, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
      } else {
        return [];
      }
    };
    var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.object) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union_discriminator,
            options: Array.from(this.optionsMap.keys()),
            path: [discriminator]
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.common.async) {
          return option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        } else {
          return option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        }
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      /**
       * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
       * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
       * have a different value for each object in the union.
       * @param discriminator the name of the discriminator property
       * @param types an array of object schemas
       * @param params
       */
      static create(discriminator, options, params) {
        const optionsMap = /* @__PURE__ */ new Map();
        for (const type of options) {
          const discriminatorValues = getDiscriminator(type.shape[discriminator]);
          if (!discriminatorValues.length) {
            throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
          }
          for (const value of discriminatorValues) {
            if (optionsMap.has(value)) {
              throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
            }
            optionsMap.set(value, type);
          }
        }
        return new _ZodDiscriminatedUnion({
          typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
          discriminator,
          options,
          optionsMap,
          ...processCreateParams(params)
        });
      }
    };
    exports2.ZodDiscriminatedUnion = ZodDiscriminatedUnion;
    function mergeValues(a, b) {
      const aType = (0, util_js_1.getParsedType)(a);
      const bType = (0, util_js_1.getParsedType)(b);
      if (a === b) {
        return { valid: true, data: a };
      } else if (aType === util_js_1.ZodParsedType.object && bType === util_js_1.ZodParsedType.object) {
        const bKeys = util_js_1.util.objectKeys(b);
        const sharedKeys = util_js_1.util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
          const sharedValue = mergeValues(a[key], b[key]);
          if (!sharedValue.valid) {
            return { valid: false };
          }
          newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
      } else if (aType === util_js_1.ZodParsedType.array && bType === util_js_1.ZodParsedType.array) {
        if (a.length !== b.length) {
          return { valid: false };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
          const itemA = a[index];
          const itemB = b[index];
          const sharedValue = mergeValues(itemA, itemB);
          if (!sharedValue.valid) {
            return { valid: false };
          }
          newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
      } else if (aType === util_js_1.ZodParsedType.date && bType === util_js_1.ZodParsedType.date && +a === +b) {
        return { valid: true, data: a };
      } else {
        return { valid: false };
      }
    }
    var ZodIntersection = class extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
          if ((0, parseUtil_js_1.isAborted)(parsedLeft) || (0, parseUtil_js_1.isAborted)(parsedRight)) {
            return parseUtil_js_1.INVALID;
          }
          const merged = mergeValues(parsedLeft.value, parsedRight.value);
          if (!merged.valid) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.invalid_intersection_types
            });
            return parseUtil_js_1.INVALID;
          }
          if ((0, parseUtil_js_1.isDirty)(parsedLeft) || (0, parseUtil_js_1.isDirty)(parsedRight)) {
            status.dirty();
          }
          return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
          return Promise.all([
            this._def.left._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            }),
            this._def.right._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            })
          ]).then(([left, right]) => handleParsed(left, right));
        } else {
          return handleParsed(this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }), this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }));
        }
      }
    };
    exports2.ZodIntersection = ZodIntersection;
    ZodIntersection.create = (left, right, params) => {
      return new ZodIntersection({
        left,
        right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params)
      });
    };
    var ZodTuple = class _ZodTuple extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.array) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.array,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.too_small,
            minimum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          return parseUtil_js_1.INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.too_big,
            maximum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          status.dirty();
        }
        const items = [...ctx.data].map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema)
            return null;
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        }).filter((x) => !!x);
        if (ctx.common.async) {
          return Promise.all(items).then((results) => {
            return parseUtil_js_1.ParseStatus.mergeArray(status, results);
          });
        } else {
          return parseUtil_js_1.ParseStatus.mergeArray(status, items);
        }
      }
      get items() {
        return this._def.items;
      }
      rest(rest) {
        return new _ZodTuple({
          ...this._def,
          rest
        });
      }
    };
    exports2.ZodTuple = ZodTuple;
    ZodTuple.create = (schemas, params) => {
      if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
      }
      return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params)
      });
    };
    var ZodRecord = class _ZodRecord extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.object) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
          pairs.push({
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
            value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (ctx.common.async) {
          return parseUtil_js_1.ParseStatus.mergeObjectAsync(status, pairs);
        } else {
          return parseUtil_js_1.ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get element() {
        return this._def.valueType;
      }
      static create(first, second, third) {
        if (second instanceof ZodType) {
          return new _ZodRecord({
            keyType: first,
            valueType: second,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(third)
          });
        }
        return new _ZodRecord({
          keyType: ZodString.create(),
          valueType: first,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(second)
        });
      }
    };
    exports2.ZodRecord = ZodRecord;
    var ZodMap = class extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.map) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.map,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
          return {
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
            value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
          };
        });
        if (ctx.common.async) {
          const finalMap = /* @__PURE__ */ new Map();
          return Promise.resolve().then(async () => {
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              if (key.status === "aborted" || value.status === "aborted") {
                return parseUtil_js_1.INVALID;
              }
              if (key.status === "dirty" || value.status === "dirty") {
                status.dirty();
              }
              finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
          });
        } else {
          const finalMap = /* @__PURE__ */ new Map();
          for (const pair of pairs) {
            const key = pair.key;
            const value = pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return parseUtil_js_1.INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        }
      }
    };
    exports2.ZodMap = ZodMap;
    ZodMap.create = (keyType, valueType, params) => {
      return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params)
      });
    };
    var ZodSet = class _ZodSet extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.set) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.set,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
          if (ctx.data.size < def.minSize.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_small,
              minimum: def.minSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.minSize.message
            });
            status.dirty();
          }
        }
        if (def.maxSize !== null) {
          if (ctx.data.size > def.maxSize.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_big,
              maximum: def.maxSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.maxSize.message
            });
            status.dirty();
          }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements2) {
          const parsedSet = /* @__PURE__ */ new Set();
          for (const element of elements2) {
            if (element.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (element.status === "dirty")
              status.dirty();
            parsedSet.add(element.value);
          }
          return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
          return Promise.all(elements).then((elements2) => finalizeSet(elements2));
        } else {
          return finalizeSet(elements);
        }
      }
      min(minSize, message) {
        return new _ZodSet({
          ...this._def,
          minSize: { value: minSize, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      max(maxSize, message) {
        return new _ZodSet({
          ...this._def,
          maxSize: { value: maxSize, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      size(size, message) {
        return this.min(size, message).max(size, message);
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    exports2.ZodSet = ZodSet;
    ZodSet.create = (valueType, params) => {
      return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params)
      });
    };
    var ZodFunction = class _ZodFunction extends ZodType {
      constructor() {
        super(...arguments);
        this.validate = this.implement;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.function) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.function,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        function makeArgsIssue(args, error) {
          return (0, parseUtil_js_1.makeIssue)({
            data: args,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, (0, errors_js_1.getErrorMap)(), errors_js_1.defaultErrorMap].filter((x) => !!x),
            issueData: {
              code: ZodError_js_1.ZodIssueCode.invalid_arguments,
              argumentsError: error
            }
          });
        }
        function makeReturnsIssue(returns, error) {
          return (0, parseUtil_js_1.makeIssue)({
            data: returns,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, (0, errors_js_1.getErrorMap)(), errors_js_1.defaultErrorMap].filter((x) => !!x),
            issueData: {
              code: ZodError_js_1.ZodIssueCode.invalid_return_type,
              returnTypeError: error
            }
          });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
          const me = this;
          return (0, parseUtil_js_1.OK)(async function(...args) {
            const error = new ZodError_js_1.ZodError([]);
            const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
              error.addIssue(makeArgsIssue(args, e));
              throw error;
            });
            const result = await Reflect.apply(fn, this, parsedArgs);
            const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
              error.addIssue(makeReturnsIssue(result, e));
              throw error;
            });
            return parsedReturns;
          });
        } else {
          const me = this;
          return (0, parseUtil_js_1.OK)(function(...args) {
            const parsedArgs = me._def.args.safeParse(args, params);
            if (!parsedArgs.success) {
              throw new ZodError_js_1.ZodError([makeArgsIssue(args, parsedArgs.error)]);
            }
            const result = Reflect.apply(fn, this, parsedArgs.data);
            const parsedReturns = me._def.returns.safeParse(result, params);
            if (!parsedReturns.success) {
              throw new ZodError_js_1.ZodError([makeReturnsIssue(result, parsedReturns.error)]);
            }
            return parsedReturns.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...items) {
        return new _ZodFunction({
          ...this._def,
          args: ZodTuple.create(items).rest(ZodUnknown.create())
        });
      }
      returns(returnType) {
        return new _ZodFunction({
          ...this._def,
          returns: returnType
        });
      }
      implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      static create(args, returns, params) {
        return new _ZodFunction({
          args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
          returns: returns || ZodUnknown.create(),
          typeName: ZodFirstPartyTypeKind.ZodFunction,
          ...processCreateParams(params)
        });
      }
    };
    exports2.ZodFunction = ZodFunction;
    var ZodLazy = class extends ZodType {
      get schema() {
        return this._def.getter();
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
      }
    };
    exports2.ZodLazy = ZodLazy;
    ZodLazy.create = (getter, params) => {
      return new ZodLazy({
        getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params)
      });
    };
    var ZodLiteral = class extends ZodType {
      _parse(input) {
        if (input.data !== this._def.value) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_literal,
            expected: this._def.value
          });
          return parseUtil_js_1.INVALID;
        }
        return { status: "valid", value: input.data };
      }
      get value() {
        return this._def.value;
      }
    };
    exports2.ZodLiteral = ZodLiteral;
    ZodLiteral.create = (value, params) => {
      return new ZodLiteral({
        value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params)
      });
    };
    function createZodEnum(values, params) {
      return new ZodEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodEnum,
        ...processCreateParams(params)
      });
    }
    var ZodEnum = class _ZodEnum extends ZodType {
      _parse(input) {
        if (typeof input.data !== "string") {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            expected: util_js_1.util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodError_js_1.ZodIssueCode.invalid_type
          });
          return parseUtil_js_1.INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(this._def.values);
        }
        if (!this._cache.has(input.data)) {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
      get options() {
        return this._def.values;
      }
      get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      extract(values, newDef = this._def) {
        return _ZodEnum.create(values, {
          ...this._def,
          ...newDef
        });
      }
      exclude(values, newDef = this._def) {
        return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
          ...this._def,
          ...newDef
        });
      }
    };
    exports2.ZodEnum = ZodEnum;
    ZodEnum.create = createZodEnum;
    var ZodNativeEnum = class extends ZodType {
      _parse(input) {
        const nativeEnumValues = util_js_1.util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.string && ctx.parsedType !== util_js_1.ZodParsedType.number) {
          const expectedValues = util_js_1.util.objectValues(nativeEnumValues);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            expected: util_js_1.util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodError_js_1.ZodIssueCode.invalid_type
          });
          return parseUtil_js_1.INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(util_js_1.util.getValidEnumValues(this._def.values));
        }
        if (!this._cache.has(input.data)) {
          const expectedValues = util_js_1.util.objectValues(nativeEnumValues);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
      get enum() {
        return this._def.values;
      }
    };
    exports2.ZodNativeEnum = ZodNativeEnum;
    ZodNativeEnum.create = (values, params) => {
      return new ZodNativeEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params)
      });
    };
    var ZodPromise = class extends ZodType {
      unwrap() {
        return this._def.type;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.promise && ctx.common.async === false) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.promise,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const promisified = ctx.parsedType === util_js_1.ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return (0, parseUtil_js_1.OK)(promisified.then((data) => {
          return this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          });
        }));
      }
    };
    exports2.ZodPromise = ZodPromise;
    ZodPromise.create = (schema, params) => {
      return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params)
      });
    };
    var ZodEffects = class extends ZodType {
      innerType() {
        return this._def.schema;
      }
      sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
          addIssue: (arg) => {
            (0, parseUtil_js_1.addIssueToContext)(ctx, arg);
            if (arg.fatal) {
              status.abort();
            } else {
              status.dirty();
            }
          },
          get path() {
            return ctx.path;
          }
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
          const processed = effect.transform(ctx.data, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(processed).then(async (processed2) => {
              if (status.value === "aborted")
                return parseUtil_js_1.INVALID;
              const result = await this._def.schema._parseAsync({
                data: processed2,
                path: ctx.path,
                parent: ctx
              });
              if (result.status === "aborted")
                return parseUtil_js_1.INVALID;
              if (result.status === "dirty")
                return (0, parseUtil_js_1.DIRTY)(result.value);
              if (status.value === "dirty")
                return (0, parseUtil_js_1.DIRTY)(result.value);
              return result;
            });
          } else {
            if (status.value === "aborted")
              return parseUtil_js_1.INVALID;
            const result = this._def.schema._parseSync({
              data: processed,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (result.status === "dirty")
              return (0, parseUtil_js_1.DIRTY)(result.value);
            if (status.value === "dirty")
              return (0, parseUtil_js_1.DIRTY)(result.value);
            return result;
          }
        }
        if (effect.type === "refinement") {
          const executeRefinement = (acc) => {
            const result = effect.refinement(acc, checkCtx);
            if (ctx.common.async) {
              return Promise.resolve(result);
            }
            if (result instanceof Promise) {
              throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
            }
            return acc;
          };
          if (ctx.common.async === false) {
            const inner = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inner.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (inner.status === "dirty")
              status.dirty();
            executeRefinement(inner.value);
            return { status: status.value, value: inner.value };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
              if (inner.status === "aborted")
                return parseUtil_js_1.INVALID;
              if (inner.status === "dirty")
                status.dirty();
              return executeRefinement(inner.value).then(() => {
                return { status: status.value, value: inner.value };
              });
            });
          }
        }
        if (effect.type === "transform") {
          if (ctx.common.async === false) {
            const base = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (!(0, parseUtil_js_1.isValid)(base))
              return parseUtil_js_1.INVALID;
            const result = effect.transform(base.value, checkCtx);
            if (result instanceof Promise) {
              throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
            }
            return { status: status.value, value: result };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
              if (!(0, parseUtil_js_1.isValid)(base))
                return parseUtil_js_1.INVALID;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result
              }));
            });
          }
        }
        util_js_1.util.assertNever(effect);
      }
    };
    exports2.ZodEffects = ZodEffects;
    exports2.ZodTransformer = ZodEffects;
    ZodEffects.create = (schema, effect, params) => {
      return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params)
      });
    };
    ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
      return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params)
      });
    };
    var ZodOptional = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === util_js_1.ZodParsedType.undefined) {
          return (0, parseUtil_js_1.OK)(void 0);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports2.ZodOptional = ZodOptional;
    ZodOptional.create = (type, params) => {
      return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params)
      });
    };
    var ZodNullable = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === util_js_1.ZodParsedType.null) {
          return (0, parseUtil_js_1.OK)(null);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports2.ZodNullable = ZodNullable;
    ZodNullable.create = (type, params) => {
      return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params)
      });
    };
    var ZodDefault = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === util_js_1.ZodParsedType.undefined) {
          data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      removeDefault() {
        return this._def.innerType;
      }
    };
    exports2.ZodDefault = ZodDefault;
    ZodDefault.create = (type, params) => {
      return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams(params)
      });
    };
    var ZodCatch = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const newCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          }
        };
        const result = this._def.innerType._parse({
          data: newCtx.data,
          path: newCtx.path,
          parent: {
            ...newCtx
          }
        });
        if ((0, parseUtil_js_1.isAsync)(result)) {
          return result.then((result2) => {
            return {
              status: "valid",
              value: result2.status === "valid" ? result2.value : this._def.catchValue({
                get error() {
                  return new ZodError_js_1.ZodError(newCtx.common.issues);
                },
                input: newCtx.data
              })
            };
          });
        } else {
          return {
            status: "valid",
            value: result.status === "valid" ? result.value : this._def.catchValue({
              get error() {
                return new ZodError_js_1.ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        }
      }
      removeCatch() {
        return this._def.innerType;
      }
    };
    exports2.ZodCatch = ZodCatch;
    ZodCatch.create = (type, params) => {
      return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params)
      });
    };
    var ZodNaN = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.nan) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.nan,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return { status: "valid", value: input.data };
      }
    };
    exports2.ZodNaN = ZodNaN;
    ZodNaN.create = (params) => {
      return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params)
      });
    };
    exports2.BRAND = Symbol("zod_brand");
    var ZodBranded = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      unwrap() {
        return this._def.type;
      }
    };
    exports2.ZodBranded = ZodBranded;
    var ZodPipeline = class _ZodPipeline extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
          const handleAsync = async () => {
            const inResult = await this._def.in._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inResult.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (inResult.status === "dirty") {
              status.dirty();
              return (0, parseUtil_js_1.DIRTY)(inResult.value);
            } else {
              return this._def.out._parseAsync({
                data: inResult.value,
                path: ctx.path,
                parent: ctx
              });
            }
          };
          return handleAsync();
        } else {
          const inResult = this._def.in._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return parseUtil_js_1.INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return {
              status: "dirty",
              value: inResult.value
            };
          } else {
            return this._def.out._parseSync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        }
      }
      static create(a, b) {
        return new _ZodPipeline({
          in: a,
          out: b,
          typeName: ZodFirstPartyTypeKind.ZodPipeline
        });
      }
    };
    exports2.ZodPipeline = ZodPipeline;
    var ZodReadonly = class extends ZodType {
      _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
          if ((0, parseUtil_js_1.isValid)(data)) {
            data.value = Object.freeze(data.value);
          }
          return data;
        };
        return (0, parseUtil_js_1.isAsync)(result) ? result.then((data) => freeze(data)) : freeze(result);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports2.ZodReadonly = ZodReadonly;
    ZodReadonly.create = (type, params) => {
      return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params)
      });
    };
    function cleanParams(params, data) {
      const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
      const p2 = typeof p === "string" ? { message: p } : p;
      return p2;
    }
    function custom(check, _params = {}, fatal) {
      if (check)
        return ZodAny.create().superRefine((data, ctx) => {
          const r = check(data);
          if (r instanceof Promise) {
            return r.then((r2) => {
              if (!r2) {
                const params = cleanParams(_params, data);
                const _fatal = params.fatal ?? fatal ?? true;
                ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
              }
            });
          }
          if (!r) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
          return;
        });
      return ZodAny.create();
    }
    exports2.late = {
      object: ZodObject.lazycreate
    };
    var ZodFirstPartyTypeKind;
    (function(ZodFirstPartyTypeKind2) {
      ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
      ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
      ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
      ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
      ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
      ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
      ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
      ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
      ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
      ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
      ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
      ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
      ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
      ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
      ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
      ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
      ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
      ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
      ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
      ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
      ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
      ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
      ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
      ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
      ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
      ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
      ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
      ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
      ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
      ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
      ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
      ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
      ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
      ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
      ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
      ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
    })(ZodFirstPartyTypeKind || (exports2.ZodFirstPartyTypeKind = ZodFirstPartyTypeKind = {}));
    var instanceOfType = (cls, params = {
      message: `Input not instance of ${cls.name}`
    }) => custom((data) => data instanceof cls, params);
    exports2.instanceof = instanceOfType;
    var stringType = ZodString.create;
    exports2.string = stringType;
    var numberType = ZodNumber.create;
    exports2.number = numberType;
    var nanType = ZodNaN.create;
    exports2.nan = nanType;
    var bigIntType = ZodBigInt.create;
    exports2.bigint = bigIntType;
    var booleanType = ZodBoolean.create;
    exports2.boolean = booleanType;
    var dateType = ZodDate.create;
    exports2.date = dateType;
    var symbolType = ZodSymbol.create;
    exports2.symbol = symbolType;
    var undefinedType = ZodUndefined.create;
    exports2.undefined = undefinedType;
    var nullType = ZodNull.create;
    exports2.null = nullType;
    var anyType = ZodAny.create;
    exports2.any = anyType;
    var unknownType = ZodUnknown.create;
    exports2.unknown = unknownType;
    var neverType = ZodNever.create;
    exports2.never = neverType;
    var voidType = ZodVoid.create;
    exports2.void = voidType;
    var arrayType = ZodArray.create;
    exports2.array = arrayType;
    var objectType = ZodObject.create;
    exports2.object = objectType;
    var strictObjectType = ZodObject.strictCreate;
    exports2.strictObject = strictObjectType;
    var unionType = ZodUnion.create;
    exports2.union = unionType;
    var discriminatedUnionType = ZodDiscriminatedUnion.create;
    exports2.discriminatedUnion = discriminatedUnionType;
    var intersectionType = ZodIntersection.create;
    exports2.intersection = intersectionType;
    var tupleType = ZodTuple.create;
    exports2.tuple = tupleType;
    var recordType = ZodRecord.create;
    exports2.record = recordType;
    var mapType = ZodMap.create;
    exports2.map = mapType;
    var setType = ZodSet.create;
    exports2.set = setType;
    var functionType = ZodFunction.create;
    exports2.function = functionType;
    var lazyType = ZodLazy.create;
    exports2.lazy = lazyType;
    var literalType = ZodLiteral.create;
    exports2.literal = literalType;
    var enumType = ZodEnum.create;
    exports2.enum = enumType;
    var nativeEnumType = ZodNativeEnum.create;
    exports2.nativeEnum = nativeEnumType;
    var promiseType = ZodPromise.create;
    exports2.promise = promiseType;
    var effectsType = ZodEffects.create;
    exports2.effect = effectsType;
    exports2.transformer = effectsType;
    var optionalType = ZodOptional.create;
    exports2.optional = optionalType;
    var nullableType = ZodNullable.create;
    exports2.nullable = nullableType;
    var preprocessType = ZodEffects.createWithPreprocess;
    exports2.preprocess = preprocessType;
    var pipelineType = ZodPipeline.create;
    exports2.pipeline = pipelineType;
    var ostring = () => stringType().optional();
    exports2.ostring = ostring;
    var onumber = () => numberType().optional();
    exports2.onumber = onumber;
    var oboolean = () => booleanType().optional();
    exports2.oboolean = oboolean;
    exports2.coerce = {
      string: (arg) => ZodString.create({ ...arg, coerce: true }),
      number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
      boolean: (arg) => ZodBoolean.create({
        ...arg,
        coerce: true
      }),
      bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
      date: (arg) => ZodDate.create({ ...arg, coerce: true })
    };
    exports2.NEVER = parseUtil_js_1.INVALID;
  }
});

// ../../node_modules/zod/v3/external.cjs
var require_external = __commonJS({
  "../../node_modules/zod/v3/external.cjs"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p))
          __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_errors2(), exports2);
    __exportStar(require_parseUtil(), exports2);
    __exportStar(require_typeAliases(), exports2);
    __exportStar(require_util(), exports2);
    __exportStar(require_types(), exports2);
    __exportStar(require_ZodError(), exports2);
  }
});

// ../../node_modules/zod/index.cjs
var require_zod = __commonJS({
  "../../node_modules/zod/index.cjs"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p))
          __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.z = void 0;
    var z = __importStar(require_external());
    exports2.z = z;
    __exportStar(require_external(), exports2);
    exports2.default = z;
  }
});

// ../core/dist/types/rule-schema.js
var require_rule_schema = __commonJS({
  "../core/dist/types/rule-schema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RuleSchema = exports2.RuleContentSchema = exports2.RuleCompatibilitySchema = exports2.RuleSuggestionSchema = exports2.RuleConditionSchema = exports2.RuleTriggerSchema = exports2.RuleMetaSchema = void 0;
    var zod_1 = require_zod();
    exports2.RuleMetaSchema = zod_1.z.object({
      id: zod_1.z.string().regex(/^[a-z0-9-]+$/, "ID\u53EA\u80FD\u5305\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u8FDE\u5B57\u7B26"),
      name: zod_1.z.string().min(3, "\u540D\u79F0\u81F3\u5C113\u4E2A\u5B57\u7B26"),
      version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/, "\u7248\u672C\u53F7\u5FC5\u987B\u7B26\u5408\u8BED\u4E49\u7248\u672C\u89C4\u8303"),
      description: zod_1.z.string().min(10, "\u63CF\u8FF0\u81F3\u5C1110\u4E2A\u5B57\u7B26"),
      authors: zod_1.z.array(zod_1.z.string()).min(1, "\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u4F5C\u8005"),
      license: zod_1.z.enum(["MIT", "Apache-2.0", "BSD-3-Clause"], {
        errorMap: () => ({ message: "\u8BB8\u53EF\u8BC1\u5FC5\u987B\u662F MIT\u3001Apache-2.0 \u6216 BSD-3-Clause" })
      }),
      created: zod_1.z.string().datetime(),
      updated: zod_1.z.string().datetime()
    });
    exports2.RuleTriggerSchema = zod_1.z.object({
      type: zod_1.z.enum(["file_pattern", "code_pattern", "command", "git_operation"]),
      pattern: zod_1.z.string().min(1, "\u6A21\u5F0F\u4E0D\u80FD\u4E3A\u7A7A"),
      file_types: zod_1.z.array(zod_1.z.string()).optional(),
      context: zod_1.z.string().optional()
    });
    exports2.RuleConditionSchema = zod_1.z.object({
      type: zod_1.z.enum(["file_exists", "code_contains", "dependency_check", "config_check"]),
      condition: zod_1.z.string().min(1, "\u6761\u4EF6\u4E0D\u80FD\u4E3A\u7A7A"),
      negated: zod_1.z.boolean().optional()
    });
    exports2.RuleSuggestionSchema = zod_1.z.object({
      type: zod_1.z.enum(["code_fix", "config_change", "dependency_add", "command_run"]),
      description: zod_1.z.string().min(10, "\u5EFA\u8BAE\u63CF\u8FF0\u81F3\u5C1110\u4E2A\u5B57\u7B26"),
      code: zod_1.z.string().optional(),
      command: zod_1.z.string().optional(),
      files: zod_1.z.array(zod_1.z.string()).optional()
    });
    exports2.RuleCompatibilitySchema = zod_1.z.object({
      languages: zod_1.z.array(zod_1.z.string()).min(1, "\u81F3\u5C11\u652F\u6301\u4E00\u79CD\u8BED\u8A00"),
      frameworks: zod_1.z.array(zod_1.z.string()).optional(),
      tools: zod_1.z.array(zod_1.z.string()).optional(),
      min_version: zod_1.z.string().optional(),
      max_version: zod_1.z.string().optional()
    });
    exports2.RuleContentSchema = zod_1.z.object({
      trigger: exports2.RuleTriggerSchema,
      conditions: zod_1.z.array(exports2.RuleConditionSchema).min(1, "\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u6761\u4EF6"),
      suggestions: zod_1.z.array(exports2.RuleSuggestionSchema).min(1, "\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u5EFA\u8BAE")
    });
    exports2.RuleSchema = zod_1.z.object({
      meta: exports2.RuleMetaSchema,
      rule: exports2.RuleContentSchema,
      compatibility: exports2.RuleCompatibilitySchema,
      confidence: zod_1.z.number().min(0).max(1, "\u7F6E\u4FE1\u5EA6\u5FC5\u987B\u57280-1\u4E4B\u95F4")
    });
  }
});

// ../core/dist/validator/rule-validator.js
var require_rule_validator = __commonJS({
  "../core/dist/validator/rule-validator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RuleValidator = void 0;
    var rule_schema_1 = require_rule_schema();
    var RuleValidator = class _RuleValidator {
      defaultOptions = {
        strict: true,
        allowPartial: false,
        customRules: []
      };
      /**
       * 验证规则是否符合 REP v0.1 协议
       */
      validate(rule, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const errors = [];
        const warnings = [];
        try {
          console.log("\u{1F50D} \u5F00\u59CB\u9A8C\u8BC1\u89C4\u5219...");
          const validationResult = rule_schema_1.RuleSchema.safeParse(rule);
          if (!validationResult.success) {
            const schemaErrors = this.formatZodErrors(validationResult.error);
            errors.push(...schemaErrors);
            if (mergedOptions.allowPartial && schemaErrors.length > 0) {
              warnings.push("\u89C4\u5219\u5305\u542B\u90E8\u5206\u9519\u8BEF\uFF0C\u4F46\u5141\u8BB8\u90E8\u5206\u9A8C\u8BC1");
            } else {
              return {
                valid: false,
                errors,
                warnings
              };
            }
          }
          const validatedRule = validationResult.success ? validationResult.data : rule;
          const semanticResults = this.validateSemantics(validatedRule);
          errors.push(...semanticResults.errors);
          warnings.push(...semanticResults.warnings);
          if (mergedOptions.customRules && mergedOptions.customRules.length > 0) {
            const customResults = this.validateCustomRules(validatedRule, mergedOptions.customRules);
            errors.push(...customResults.errors);
            warnings.push(...customResults.warnings);
          }
          if (validatedRule.confidence < 0.5) {
            warnings.push("\u89C4\u5219\u7F6E\u4FE1\u5EA6\u8F83\u4F4E\uFF0C\u5EFA\u8BAE\u8FDB\u4E00\u6B65\u9A8C\u8BC1");
          }
          const compatibilityResults = this.validateCompatibility(validatedRule);
          warnings.push(...compatibilityResults);
          const isValid = errors.length === 0 || mergedOptions.allowPartial && errors.length < 3;
          console.log(`\u2705 \u89C4\u5219\u9A8C\u8BC1\u5B8C\u6210: ${isValid ? "\u901A\u8FC7" : "\u5931\u8D25"}`);
          return {
            valid: isValid,
            errors,
            warnings
          };
        } catch (error) {
          console.error("\u274C \u89C4\u5219\u9A8C\u8BC1\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF:", error);
          return {
            valid: false,
            errors: [`\u9A8C\u8BC1\u8FC7\u7A0B\u9519\u8BEF: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`],
            warnings
          };
        }
      }
      /**
       * 批量验证多个规则
       */
      validateBatch(rules, options = {}) {
        return rules.map((rule, index) => {
          console.log(`\u{1F50D} \u9A8C\u8BC1\u89C4\u5219 ${index + 1}/${rules.length}...`);
          return this.validate(rule, options);
        });
      }
      /**
       * 格式化 Zod 错误信息
       */
      formatZodErrors(error) {
        return error.errors.map((err) => {
          const path3 = err.path.length > 0 ? `\u8DEF\u5F84: ${err.path.join(".")}` : "";
          return `${err.message} ${path3}`.trim();
        });
      }
      /**
       * 语义验证
       */
      validateSemantics(rule) {
        const errors = [];
        const warnings = [];
        if (!this.isValidRuleId(rule.meta.id)) {
          errors.push("\u89C4\u5219ID\u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u53EA\u80FD\u5305\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u8FDE\u5B57\u7B26");
        }
        if (!this.isValidVersion(rule.meta.version)) {
          errors.push("\u7248\u672C\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u5FC5\u987B\u7B26\u5408\u8BED\u4E49\u7248\u672C\u89C4\u8303");
        }
        if (rule.rule.trigger.type === "file_pattern" && !rule.rule.trigger.file_types) {
          warnings.push("\u6587\u4EF6\u6A21\u5F0F\u89E6\u53D1\u5668\u5EFA\u8BAE\u6307\u5B9A\u6587\u4EF6\u7C7B\u578B");
        }
        rule.rule.suggestions.forEach((suggestion, index) => {
          if (!suggestion.code && !suggestion.command && !suggestion.files) {
            warnings.push(`\u5EFA\u8BAE ${index + 1} \u7F3A\u5C11\u5177\u4F53\u7684\u5B9E\u73B0\u5185\u5BB9`);
          }
        });
        if (rule.compatibility.languages.length === 0) {
          warnings.push("\u89C4\u5219\u672A\u6307\u5B9A\u9002\u7528\u7684\u7F16\u7A0B\u8BED\u8A00");
        }
        const hasNegatedConditions = rule.rule.conditions.some((cond) => cond.negated);
        const hasNormalConditions = rule.rule.conditions.some((cond) => !cond.negated);
        if (hasNegatedConditions && !hasNormalConditions) {
          warnings.push("\u89C4\u5219\u6761\u4EF6\u5168\u90E8\u4E3A\u5426\u5B9A\u5F62\u5F0F\uFF0C\u53EF\u80FD\u96BE\u4EE5\u89E6\u53D1");
        }
        if (rule.confidence > 0.9 && rule.meta.version === "0.1.0") {
          warnings.push("\u65B0\u89C4\u5219\u7248\u672C\u7F6E\u4FE1\u5EA6\u8FC7\u9AD8\uFF0C\u5EFA\u8BAE\u8C28\u614E\u9A8C\u8BC1");
        }
        return { errors, warnings };
      }
      /**
       * 验证自定义规则
       */
      validateCustomRules(rule, customRules) {
        const errors = [];
        const warnings = [];
        customRules.forEach((customRule) => {
          const result = customRule.validate(rule);
          if (!result.valid) {
            errors.push(`\u81EA\u5B9A\u4E49\u89C4\u5219\u9A8C\u8BC1\u5931\u8D25 [${customRule.name}]: ${result.message}`);
          }
        });
        return { errors, warnings };
      }
      /**
       * 验证兼容性信息
       */
      validateCompatibility(rule) {
        const warnings = [];
        if (rule.compatibility.frameworks && rule.compatibility.frameworks.length > 0) {
          const hasVersionConstraints = rule.compatibility.frameworks.some((fw) => rule.compatibility.min_version || rule.compatibility.max_version);
          if (!hasVersionConstraints) {
            warnings.push("\u6846\u67B6\u517C\u5BB9\u6027\u4FE1\u606F\u7F3A\u5C11\u7248\u672C\u7EA6\u675F");
          }
        }
        if (rule.compatibility.tools && rule.compatibility.tools.length > 0) {
          const supportedTools = ["vscode", "trae", "webstorm", "vim"];
          const unsupportedTools = rule.compatibility.tools.filter((tool) => !supportedTools.includes(tool.toLowerCase()));
          if (unsupportedTools.length > 0) {
            warnings.push(`\u68C0\u6D4B\u5230\u4E0D\u5E38\u89C1\u7684\u5DE5\u5177\u517C\u5BB9\u6027\u58F0\u660E: ${unsupportedTools.join(", ")}`);
          }
        }
        return warnings;
      }
      /**
       * 检查规则ID格式
       */
      isValidRuleId(id) {
        return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
      }
      /**
       * 检查版本号格式
       */
      isValidVersion(version) {
        return /^\d+\.\d+\.\d+$/.test(version);
      }
      /**
       * 创建预定义的验证规则集合
       */
      static createStandardValidator(options = {}) {
        const validator = new _RuleValidator();
        const standardRules = [
          {
            name: "description-length",
            validate: (rule) => ({
              valid: rule.meta.description.length >= 20,
              message: "\u89C4\u5219\u63CF\u8FF0\u5E94\u81F3\u5C11\u5305\u542B20\u4E2A\u5B57\u7B26\u4EE5\u63D0\u4F9B\u8DB3\u591F\u7684\u4FE1\u606F"
            })
          },
          {
            name: "suggestion-completeness",
            validate: (rule) => {
              const hasCompleteSuggestions = rule.rule.suggestions.every((suggestion) => suggestion.code || suggestion.command || suggestion.files);
              return {
                valid: hasCompleteSuggestions,
                message: "\u6240\u6709\u5EFA\u8BAE\u90FD\u5E94\u5305\u542B\u5177\u4F53\u7684\u5B9E\u73B0\u5185\u5BB9\uFF08\u4EE3\u7801\u3001\u547D\u4EE4\u6216\u6587\u4EF6\uFF09"
              };
            }
          },
          {
            name: "trigger-specificity",
            validate: (rule) => {
              const isSpecific = rule.rule.trigger.pattern !== "**/*" && rule.rule.trigger.pattern !== "*";
              return {
                valid: isSpecific,
                message: "\u89E6\u53D1\u5668\u6A21\u5F0F\u5E94\u5177\u4F53\u660E\u786E\uFF0C\u907F\u514D\u4F7F\u7528\u8FC7\u4E8E\u5BBD\u6CDB\u7684\u6A21\u5F0F"
              };
            }
          }
        ];
        return new _RuleValidator();
      }
      /**
       * 生成验证报告
       */
      generateReport(validationResults) {
        const totalRules = validationResults.length;
        const validRules = validationResults.filter((result) => result.valid).length;
        const totalErrors = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
        const totalWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
        let report = `# RuleForge \u9A8C\u8BC1\u62A5\u544A

`;
        report += `## \u7EDF\u8BA1\u4FE1\u606F
`;
        report += `- \u603B\u89C4\u5219\u6570: ${totalRules}
`;
        report += `- \u6709\u6548\u89C4\u5219: ${validRules}
`;
        report += `- \u65E0\u6548\u89C4\u5219: ${totalRules - validRules}
`;
        report += `- \u603B\u9519\u8BEF\u6570: ${totalErrors}
`;
        report += `- \u603B\u8B66\u544A\u6570: ${totalWarnings}

`;
        validationResults.forEach((result, index) => {
          report += `## \u89C4\u5219 ${index + 1} - ${result.valid ? "\u2705 \u901A\u8FC7" : "\u274C \u5931\u8D25"}
`;
          if (result.errors.length > 0) {
            report += `### \u9519\u8BEF\u4FE1\u606F
`;
            result.errors.forEach((error) => {
              report += `- ${error}
`;
            });
            report += `
`;
          }
          if (result.warnings.length > 0) {
            report += `### \u8B66\u544A\u4FE1\u606F
`;
            result.warnings.forEach((warning) => {
              report += `- \u26A0\uFE0F ${warning}
`;
            });
            report += `
`;
          }
        });
        return report;
      }
    };
    exports2.RuleValidator = RuleValidator;
  }
});

// ../core/dist/formatter/pattern-yaml-formatter.js
var require_pattern_yaml_formatter = __commonJS({
  "../core/dist/formatter/pattern-yaml-formatter.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.patternsToYAMLBatch = exports2.patternToYAML = exports2.PatternYamlFormatter = void 0;
    var yaml_1 = __importDefault(require_dist());
    var rule_validator_1 = require_rule_validator();
    var PatternYamlFormatter = class {
      defaultOptions = {
        indent: 2,
        lineWidth: 80,
        includeComments: true,
        sanitizePaths: true,
        projectName: "{project_name}",
        validateOutput: true
      };
      validator;
      constructor() {
        this.validator = new rule_validator_1.RuleValidator();
      }
      /**
       * 将模式格式化为 YAML 字符串
       */
      async toYAML(pattern, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const warnings = [];
        try {
          console.log(`\u{1F4DD} \u5F00\u59CB\u683C\u5F0F\u5316\u6A21\u5F0F: ${pattern.name}`);
          const processedPattern = this.preprocessPattern(pattern, mergedOptions, warnings);
          const ruleObject = this.patternToRule(processedPattern);
          const yamlContent = this.generateYaml(ruleObject, mergedOptions);
          let validationResult;
          if (mergedOptions.validateOutput) {
            validationResult = this.validator.validate(ruleObject);
            if (!validationResult.valid) {
              warnings.push("YAML \u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u89C4\u5219\u683C\u5F0F");
              warnings.push(...validationResult.errors);
            }
          }
          const fileName = this.generateFileName(pattern);
          console.log(`\u2705 \u6A21\u5F0F\u683C\u5F0F\u5316\u5B8C\u6210: ${fileName}`);
          return {
            yaml: yamlContent,
            fileName,
            warnings,
            validationResult
          };
        } catch (error) {
          console.error("\u274C \u6A21\u5F0F\u683C\u5F0F\u5316\u5931\u8D25:", error);
          throw new Error(`\u6A21\u5F0F\u683C\u5F0F\u5316\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 批量格式化多个模式
       */
      async toYAMLBatch(patterns, options = {}) {
        const results = [];
        for (let i = 0; i < patterns.length; i++) {
          console.log(`\u{1F4DD} \u683C\u5F0F\u5316\u6A21\u5F0F ${i + 1}/${patterns.length}...`);
          try {
            const result = await this.toYAML(patterns[i], options);
            results.push(result);
          } catch (error) {
            console.error(`\u683C\u5F0F\u5316\u6A21\u5F0F ${i + 1} \u5931\u8D25:`, error);
          }
        }
        return results;
      }
      /**
       * 预处理模式数据
       */
      preprocessPattern(pattern, options, warnings) {
        const processedPattern = { ...pattern };
        if (options.sanitizePaths) {
          this.sanitizePatternPaths(processedPattern, options.projectName, warnings);
        }
        this.optimizeCodeExamples(processedPattern, warnings);
        this.filterSensitiveInfo(processedPattern, warnings);
        return processedPattern;
      }
      /**
       * 路径脱敏处理
       */
      sanitizePatternPaths(pattern, projectName, warnings) {
        if (pattern.trigger.file_pattern) {
          const originalPattern = pattern.trigger.file_pattern;
          const sanitizedPattern = originalPattern.replace(/[\w-]+\//g, `${projectName}/`);
          if (originalPattern !== sanitizedPattern) {
            pattern.trigger.file_pattern = sanitizedPattern;
            warnings.push("\u6587\u4EF6\u8DEF\u5F84\u5DF2\u8131\u654F\u5904\u7406");
          }
        }
        pattern.examples.forEach((example, index) => {
          if (example.context && example.context.includes("/")) {
            example.context = example.context.replace(/[\w-]+\//g, `${projectName}/`);
          }
        });
      }
      /**
       * 优化代码示例
       */
      optimizeCodeExamples(pattern, warnings) {
        const maxLines = 15;
        pattern.examples.forEach((example, index) => {
          if (example.before) {
            const beforeLines = example.before.split("\n");
            if (beforeLines.length > maxLines) {
              example.before = this.truncateCodeExample(beforeLines, maxLines);
              warnings.push(`\u793A\u4F8B ${index + 1} \u7684 before \u4EE3\u7801\u5DF2\u622A\u65AD`);
            }
          }
          if (example.after) {
            const afterLines = example.after.split("\n");
            if (afterLines.length > maxLines) {
              example.after = this.truncateCodeExample(afterLines, maxLines);
              warnings.push(`\u793A\u4F8B ${index + 1} \u7684 after \u4EE3\u7801\u5DF2\u622A\u65AD`);
            }
          }
        });
      }
      /**
       * 截断代码示例
       */
      truncateCodeExample(lines, maxLines) {
        if (lines.length <= maxLines)
          return lines.join("\n");
        const importantLines = [
          ...lines.slice(0, 3),
          "// ... (\u4EE3\u7801\u5DF2\u622A\u65AD\uFF0C\u4FDD\u7559\u5173\u952E\u903B\u8F91) ...",
          ...lines.slice(-3)
        ];
        return importantLines.join("\n");
      }
      /**
       * 过滤敏感信息
       */
      filterSensitiveInfo(pattern, warnings) {
        const sensitivePatterns = [
          /api[_-]?key/i,
          /password/i,
          /secret/i,
          /token/i,
          /[a-f0-9]{32}/i,
          // MD5 hash
          /[a-f0-9]{64}/i
          // SHA256 hash
        ];
        let foundSensitiveInfo = false;
        if (pattern.condition) {
          sensitivePatterns.forEach((patternRegex) => {
            if (patternRegex.test(pattern.condition)) {
              pattern.condition = pattern.condition.replace(patternRegex, "***");
              foundSensitiveInfo = true;
            }
          });
        }
        if (pattern.suggestion) {
          sensitivePatterns.forEach((patternRegex) => {
            if (patternRegex.test(pattern.suggestion)) {
              pattern.suggestion = pattern.suggestion.replace(patternRegex, "***");
              foundSensitiveInfo = true;
            }
          });
        }
        pattern.examples.forEach((example) => {
          ["before", "after"].forEach((key) => {
            const code = example[key];
            if (typeof code === "string") {
              sensitivePatterns.forEach((patternRegex) => {
                if (patternRegex.test(code)) {
                  example[key] = code.replace(patternRegex, "***");
                  foundSensitiveInfo = true;
                }
              });
            }
          });
        });
        if (foundSensitiveInfo) {
          warnings.push("\u68C0\u6D4B\u5230\u654F\u611F\u4FE1\u606F\uFF0C\u5DF2\u8FDB\u884C\u8131\u654F\u5904\u7406");
        }
      }
      /**
       * 将模式转换为规则对象
       */
      patternToRule(pattern) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        return {
          meta: {
            id: pattern.id,
            name: pattern.name,
            version: "0.1.0",
            description: pattern.description,
            authors: ["auto-generated by RuleForge"],
            license: "MIT",
            created: now,
            updated: now
          },
          rule: {
            trigger: {
              keywords: pattern.trigger.keywords,
              file_pattern: pattern.trigger.file_pattern,
              language: pattern.trigger.language || "typescript"
            },
            condition: pattern.condition,
            suggestion: this.generateSuggestionWithExamples(pattern)
          },
          compatibility: this.generateCompatibility(pattern),
          confidence: pattern.confidence
        };
      }
      /**
       * 生成包含示例的建议内容
       */
      generateSuggestionWithExamples(pattern) {
        let suggestion = pattern.suggestion;
        if (pattern.examples.length > 0) {
          suggestion += "\n\n\u63A8\u8350\u505A\u6CD5\uFF1A\n";
          pattern.examples.forEach((example, index) => {
            suggestion += `
\u793A\u4F8B ${index + 1}:
`;
            if (example.before && example.after) {
              suggestion += "\n```" + (pattern.trigger.language || "typescript") + "\n";
              suggestion += "// \u6539\u8FDB\u524D\uFF1A\n";
              suggestion += example.before + "\n\n";
              suggestion += "// \u6539\u8FDB\u540E\uFF1A\n";
              suggestion += example.after + "\n";
              suggestion += "```\n";
            }
            if (example.context) {
              suggestion += `\u4E0A\u4E0B\u6587: ${example.context}
`;
            }
          });
        }
        return suggestion;
      }
      /**
       * 生成兼容性信息
       */
      generateCompatibility(pattern) {
        const compatibility = {
          languages: [pattern.trigger.language || "typescript"],
          rep_version: "^1.0"
        };
        const language = pattern.trigger.language || "typescript";
        if (language === "vue") {
          compatibility.frameworks = { vue: ">=3.4" };
        } else if (language === "typescript") {
          compatibility.languages = { typescript: ">=5.0" };
        }
        return compatibility;
      }
      /**
       * 生成 YAML 内容
       */
      generateYaml(ruleObject, options) {
        const yamlString = yaml_1.default.stringify(ruleObject, {
          indent: options.indent,
          lineWidth: options.lineWidth
        });
        let result = "";
        if (options.includeComments) {
          result += this.generateHeaderComment(ruleObject);
        }
        result += yamlString;
        return result;
      }
      /**
       * 生成文件头注释
       */
      generateHeaderComment(ruleObject) {
        return `# RuleForge Rule - ${ruleObject.meta.name}
# ID: ${ruleObject.meta.id}
# Version: ${ruleObject.meta.version}
# Description: ${ruleObject.meta.description}
# Authors: ${ruleObject.meta.authors.join(", ")}
# Created: ${ruleObject.meta.created}
# Updated: ${ruleObject.meta.updated}
# Confidence: ${Math.round(ruleObject.confidence * 100)}%
#
# This rule was automatically generated by RuleForge engine.
# REP Protocol Version: v0.1

`;
      }
      /**
       * 生成文件名
       */
      generateFileName(pattern) {
        const sanitizedId = pattern.id.replace(/[^a-z0-9-]/g, "-");
        return `${sanitizedId}.yaml`;
      }
      /**
       * 验证 YAML 格式
       */
      validateYAML(yamlContent) {
        try {
          const parsed = yaml_1.default.parse(yamlContent);
          if (!parsed) {
            return { valid: false, error: "YAML \u5185\u5BB9\u4E3A\u7A7A\u6216\u65E0\u6548" };
          }
          const requiredFields = ["meta", "rule"];
          for (const field of requiredFields) {
            if (!parsed[field]) {
              return { valid: false, error: `\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5: ${field}` };
            }
          }
          const metaFields = ["id", "name", "version"];
          for (const field of metaFields) {
            if (!parsed.meta[field]) {
              return { valid: false, error: `meta \u7F3A\u5C11\u5B57\u6BB5: ${field}` };
            }
          }
          const ruleFields = ["trigger", "condition", "suggestion"];
          for (const field of ruleFields) {
            if (!parsed.rule[field]) {
              return { valid: false, error: `rule \u7F3A\u5C11\u5B57\u6BB5: ${field}` };
            }
          }
          return { valid: true };
        } catch (error) {
          return {
            valid: false,
            error: `YAML \u9A8C\u8BC1\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`
          };
        }
      }
      /**
       * 美化 YAML 输出
       */
      prettify(yamlContent, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        try {
          const lines = yamlContent.split("\n");
          const prettifiedLines = [];
          let inCommentBlock = false;
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("#")) {
              if (!inCommentBlock) {
                inCommentBlock = true;
                if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== "") {
                  prettifiedLines.push("");
                }
              }
              prettifiedLines.push(line);
            } else if (trimmedLine === "") {
              if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== "") {
                prettifiedLines.push("");
              }
              inCommentBlock = false;
            } else {
              inCommentBlock = false;
              prettifiedLines.push(line);
            }
          }
          while (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] === "") {
            prettifiedLines.pop();
          }
          return prettifiedLines.join("\n");
        } catch (error) {
          console.warn("YAML \u7F8E\u5316\u5931\u8D25\uFF0C\u8FD4\u56DE\u539F\u5185\u5BB9:", error);
          return yamlContent;
        }
      }
      /**
       * 生成模式摘要报告
       */
      generatePatternReport(patterns, formatResults) {
        let report = `# RuleForge \u6A21\u5F0F\u751F\u6210\u62A5\u544A

`;
        report += `## \u7EDF\u8BA1\u4FE1\u606F
`;
        report += `- \u603B\u6A21\u5F0F\u6570: ${patterns.length}
`;
        report += `- \u6210\u529F\u751F\u6210: ${formatResults.length}
`;
        report += `- \u5931\u8D25\u6570: ${patterns.length - formatResults.length}

`;
        report += `## \u6A21\u5F0F\u8BE6\u60C5
`;
        patterns.forEach((pattern, index) => {
          const formatResult = formatResults[index];
          report += `### ${pattern.name}
`;
          report += `- ID: ${pattern.id}
`;
          report += `- \u7F6E\u4FE1\u5EA6: ${Math.round(pattern.confidence * 100)}%
`;
          report += `- \u9002\u7528\u573A\u666F: ${pattern.applicableScenes}
`;
          if (formatResult) {
            report += `- \u6587\u4EF6: ${formatResult.fileName}
`;
            if (formatResult.validationResult) {
              const status = formatResult.validationResult.valid ? "\u2705 \u901A\u8FC7" : "\u274C \u5931\u8D25";
              report += `- \u9A8C\u8BC1: ${status}
`;
            }
          } else {
            report += `- \u72B6\u6001: \u274C \u751F\u6210\u5931\u8D25
`;
          }
          report += `
`;
        });
        return report;
      }
    };
    exports2.PatternYamlFormatter = PatternYamlFormatter;
    var patternToYAML = async (pattern, options) => {
      const formatter = new PatternYamlFormatter();
      return formatter.toYAML(pattern, options);
    };
    exports2.patternToYAML = patternToYAML;
    var patternsToYAMLBatch = async (patterns, options) => {
      const formatter = new PatternYamlFormatter();
      return formatter.toYAMLBatch(patterns, options);
    };
    exports2.patternsToYAMLBatch = patternsToYAMLBatch;
    exports2.default = PatternYamlFormatter;
  }
});

// ../core/dist/extractor/rule-extractor.js
var require_rule_extractor = __commonJS({
  "../core/dist/extractor/rule-extractor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extractRulesBatch = exports2.extractRules = exports2.RuleExtractor = void 0;
    var log_parser_1 = require_log_parser();
    var pattern_cluster_1 = require_pattern_cluster();
    var pattern_yaml_formatter_1 = require_pattern_yaml_formatter();
    var RuleExtractor = class {
      logParser;
      patternClusterer;
      yamlFormatter;
      constructor() {
        this.logParser = new log_parser_1.SessionLogParser();
        this.patternClusterer = new pattern_cluster_1.PatternClusterer();
        this.yamlFormatter = new pattern_yaml_formatter_1.PatternYamlFormatter();
      }
      /**
       * 从开发会话日志中提取规则
       */
      async extract(options) {
        const startTime = Date.now();
        const warnings = [];
        const errors = [];
        try {
          console.log(`\u{1F680} \u5F00\u59CB RuleForge \u89C4\u5219\u63D0\u53D6\u6D41\u7A0B...`);
          console.log(`   \u4F1A\u8BDDID: ${options.sessionId}`);
          console.log(`   \u65E5\u5FD7\u6587\u4EF6: ${options.logPath}
`);
          console.log("\u{1F50D} \u6B65\u9AA4 1: \u89E3\u6790\u4F1A\u8BDD\u65E5\u5FD7...");
          const parseResult = await this.parseSessionLog(options.logPath, options);
          if (parseResult.events.length === 0) {
            warnings.push("\u4F1A\u8BDD\u65E5\u5FD7\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u63D0\u53D6\u89C4\u5219");
            return this.createEmptyResult(startTime, warnings);
          }
          console.log(`\u2705 \u89E3\u6790\u5B8C\u6210: ${parseResult.events.length} \u4E2A\u4E8B\u4EF6`);
          console.log("\n\u{1F9E9} \u6B65\u9AA4 2: \u6A21\u5F0F\u805A\u7C7B\u5206\u6790...");
          const clusterResult = await this.clusterPatterns(parseResult.events, options);
          if (clusterResult.patterns.length === 0) {
            warnings.push("\u672A\u53D1\u73B0\u53EF\u63D0\u53D6\u7684\u6A21\u5F0F");
            return this.createEmptyResult(startTime, warnings);
          }
          console.log(`\u2705 \u805A\u7C7B\u5B8C\u6210: ${clusterResult.patterns.length} \u4E2A\u6A21\u5F0F`);
          console.log("\n\u{1F4C4} \u6B65\u9AA4 3: \u751F\u6210 YAML \u89C4\u5219\u6587\u4EF6...");
          const formatResults = await this.generateYamlRules(clusterResult.patterns, options);
          console.log(`\u2705 \u683C\u5F0F\u5316\u5B8C\u6210: ${formatResults.length} \u4E2A\u89C4\u5219\u6587\u4EF6`);
          const rules = this.patternsToRuleYAML(clusterResult.patterns, options);
          const statistics = this.generateStatistics(parseResult.events.length, clusterResult.patterns.length, rules.length, clusterResult.statistics, Date.now() - startTime);
          console.log(`
\u{1F389} \u89C4\u5219\u63D0\u53D6\u5B8C\u6210!`);
          console.log(`   \u603B\u6587\u4EF6\u6570: ${statistics.totalFiles}`);
          console.log(`   \u603B\u547D\u4EE4\u6570: ${statistics.totalCommands}`);
          console.log(`   \u53D1\u73B0\u6A21\u5F0F\u6570: ${statistics.patternsFound}`);
          console.log(`   \u5904\u7406\u65F6\u95F4: ${statistics.extractionTime}ms`);
          return {
            rules,
            yamlFiles: formatResults,
            statistics,
            warnings: [...warnings, ...clusterResult.warnings],
            errors
          };
        } catch (error) {
          console.error("\u274C \u89C4\u5219\u63D0\u53D6\u5931\u8D25:", error);
          errors.push(`\u89C4\u5219\u63D0\u53D6\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
          return {
            rules: [],
            yamlFiles: [],
            statistics: this.generateStatistics(0, 0, 0, { totalEvents: 0, totalPatterns: 0, highConfidencePatterns: 0, averageConfidence: 0, processingTime: Date.now() - startTime }, Date.now() - startTime),
            warnings,
            errors
          };
        }
      }
      /**
       * 解析会话日志
       */
      async parseSessionLog(logPath, options) {
        return this.logParser.parseSessionLog(logPath, {
          sessionId: options.sessionId,
          onProgress: (progress) => {
            if (options.enableDebugLog) {
              console.log(`   \u89E3\u6790\u8FDB\u5EA6: ${progress.eventsParsed} \u4E8B\u4EF6`);
            }
          }
        });
      }
      /**
       * 模式聚类分析
       */
      async clusterPatterns(events, options) {
        return this.patternClusterer.cluster(events, {
          minOccurrences: options.applicableScenes ?? 2,
          minConfidence: options.minConfidence ?? 0.7,
          languageFocus: options.language ? [options.language] : void 0,
          enableDebugLog: options.enableDebugLog ?? false
        });
      }
      /**
       * 生成 YAML 规则文件
       */
      async generateYamlRules(patterns, options) {
        const formatResults = await this.yamlFormatter.toYAMLBatch(patterns, {
          sanitizePaths: options.sanitizePaths ?? true,
          projectName: options.projectName ?? "{project_name}",
          validateOutput: options.validateOutput ?? true
        });
        return formatResults.map((result, index) => ({
          fileName: result.fileName,
          yamlContent: result.yaml,
          pattern: patterns[index],
          warnings: result.warnings,
          validationResult: result.validationResult
        }));
      }
      /**
       * 将模式转换为 RuleYAML 对象
       */
      patternsToRuleYAML(patterns, options) {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        return patterns.map((pattern) => ({
          meta: {
            id: pattern.id,
            name: pattern.name,
            version: "0.1.0",
            description: pattern.description,
            authors: [`auto-generated-from-${options.sessionId}`],
            license: "MIT",
            created: timestamp,
            updated: timestamp
          },
          rule: {
            trigger: {
              type: "file_pattern",
              pattern: pattern.trigger.file_pattern,
              file_types: [pattern.trigger.language || "typescript"],
              context: pattern.condition
            },
            conditions: [
              {
                type: "code_contains",
                condition: pattern.condition,
                negated: false
              }
            ],
            suggestions: [
              {
                type: "code_fix",
                description: pattern.suggestion,
                code: pattern.examples.length > 0 ? pattern.examples[0].after : pattern.suggestion
              }
            ]
          },
          compatibility: {
            languages: [pattern.trigger.language || "typescript"],
            frameworks: pattern.trigger.language === "vue" ? ["vue"] : [],
            tools: ["vscode", "trae"],
            min_version: "1.0"
          },
          confidence: pattern.confidence
        }));
      }
      /**
       * 生成统计信息
       */
      generateStatistics(totalEvents, totalPatterns, totalRules, clusterStats, extractionTime) {
        const totalFiles = Math.floor(totalEvents / 3);
        const totalCommands = Math.floor(totalEvents / 5);
        return {
          totalFiles,
          totalCommands,
          patternsFound: totalPatterns,
          extractionTime
        };
      }
      /**
       * 创建空结果
       */
      createEmptyResult(startTime, warnings) {
        return {
          rules: [],
          yamlFiles: [],
          statistics: {
            totalFiles: 0,
            totalCommands: 0,
            patternsFound: 0,
            extractionTime: Date.now() - startTime
          },
          warnings,
          errors: []
        };
      }
      /**
       * 批量提取多个会话的规则
       */
      async extractBatch(sessions, options = {}) {
        const results = [];
        console.log(`\u{1F680} \u5F00\u59CB\u6279\u91CF\u63D0\u53D6 ${sessions.length} \u4E2A\u4F1A\u8BDD\u7684\u89C4\u5219...
`);
        for (let i = 0; i < sessions.length; i++) {
          const session = sessions[i];
          console.log(`\u{1F4DD} \u5904\u7406\u4F1A\u8BDD ${i + 1}/${sessions.length}: ${session.sessionId}`);
          try {
            const result = await this.extract({
              ...options,
              sessionId: session.sessionId,
              logPath: session.logPath
            });
            results.push({ sessionId: session.sessionId, result });
            console.log(`   \u2705 \u5B8C\u6210: ${result.rules.length} \u4E2A\u89C4\u5219`);
          } catch (error) {
            console.error(`   \u274C \u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
            results.push({
              sessionId: session.sessionId,
              result: {
                rules: [],
                yamlFiles: [],
                statistics: {
                  totalFiles: 0,
                  totalCommands: 0,
                  patternsFound: 0,
                  extractionTime: 0
                },
                warnings: [],
                errors: [`\u63D0\u53D6\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`]
              }
            });
          }
        }
        console.log(`
\u{1F389} \u6279\u91CF\u63D0\u53D6\u5B8C\u6210!`);
        console.log(`   \u6210\u529F\u4F1A\u8BDD: ${results.filter((r) => r.result.rules.length > 0).length}`);
        console.log(`   \u5931\u8D25\u4F1A\u8BDD: ${results.filter((r) => r.result.errors.length > 0).length}`);
        return results;
      }
      /**
       * 生成提取报告
       */
      generateExtractionReport(results) {
        let report = `# RuleForge \u89C4\u5219\u63D0\u53D6\u62A5\u544A

`;
        report += `## \u7EDF\u8BA1\u6458\u8981
`;
        const totalSessions = results.length;
        const successfulSessions = results.filter((r) => r.result.rules.length > 0).length;
        const totalRules = results.reduce((sum, r) => sum + r.result.rules.length, 0);
        const totalPatterns = results.reduce((sum, r) => sum + r.result.statistics.patternsFound, 0);
        report += `- \u603B\u4F1A\u8BDD\u6570: ${totalSessions}
`;
        report += `- \u6210\u529F\u4F1A\u8BDD: ${successfulSessions}
`;
        report += `- \u603B\u89C4\u5219\u6570: ${totalRules}
`;
        report += `- \u603B\u6A21\u5F0F\u6570: ${totalPatterns}

`;
        report += `## \u4F1A\u8BDD\u8BE6\u60C5
`;
        results.forEach(({ sessionId, result }) => {
          report += `### ${sessionId}
`;
          report += `- \u72B6\u6001: ${result.rules.length > 0 ? "\u2705 \u6210\u529F" : "\u274C \u5931\u8D25"}
`;
          report += `- \u6587\u4EF6\u6570: ${result.statistics.totalFiles}
`;
          report += `- \u547D\u4EE4\u6570: ${result.statistics.totalCommands}
`;
          report += `- \u53D1\u73B0\u6A21\u5F0F\u6570: ${result.statistics.patternsFound}
`;
          if (result.warnings.length > 0) {
            report += `- \u8B66\u544A: ${result.warnings.join(", ")}
`;
          }
          if (result.errors.length > 0) {
            report += `- \u9519\u8BEF: ${result.errors.join(", ")}
`;
          }
          report += `
`;
        });
        return report;
      }
      /**
       * 验证规则质量
       */
      validateRuleQuality(rule) {
        const issues = [];
        let score = 100;
        if (rule.confidence < 0.7) {
          issues.push("\u7F6E\u4FE1\u5EA6\u8FC7\u4F4E (< 0.7)");
          score -= 20;
        }
        if (!rule.meta.description || rule.meta.description.length < 20) {
          issues.push("\u63CF\u8FF0\u8FC7\u4E8E\u7B80\u5355");
          score -= 10;
        }
        if (!rule.rule.conditions || rule.rule.conditions.length === 0) {
          issues.push("\u7F3A\u5C11\u660E\u786E\u7684\u89E6\u53D1\u6761\u4EF6");
          score -= 15;
        }
        if (!rule.rule.suggestions || rule.rule.suggestions.length === 0) {
          issues.push("\u7F3A\u5C11\u5B9E\u7528\u7684\u6539\u8FDB\u5EFA\u8BAE");
          score -= 15;
        }
        return {
          valid: score >= 70,
          score: Math.max(0, score),
          issues
        };
      }
    };
    exports2.RuleExtractor = RuleExtractor;
    var extractRules = async (options) => {
      const extractor = new RuleExtractor();
      return extractor.extract(options);
    };
    exports2.extractRules = extractRules;
    var extractRulesBatch = async (sessions, options) => {
      const extractor = new RuleExtractor();
      return extractor.extractBatch(sessions, options);
    };
    exports2.extractRulesBatch = extractRulesBatch;
    exports2.default = RuleExtractor;
  }
});

// ../core/dist/formatter/yaml-formatter.js
var require_yaml_formatter = __commonJS({
  "../core/dist/formatter/yaml-formatter.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.YamlFormatter = void 0;
    var yaml_1 = __importDefault(require_dist());
    var YamlFormatter = class {
      defaultOptions = {
        indent: 2,
        lineWidth: 80,
        includeComments: true,
        sanitizePaths: true,
        projectName: "{project_name}"
      };
      /**
       * 将规则格式化为 YAML 字符串
       */
      format(rule, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const warnings = [];
        try {
          console.log("\u{1F4DD} \u5F00\u59CB\u683C\u5F0F\u5316\u89C4\u5219...");
          const processedRule = this.preprocessRule(rule, mergedOptions, warnings);
          const yamlContent = this.generateYaml(processedRule, mergedOptions);
          const fileName = this.generateFileName(rule);
          console.log("\u2705 \u89C4\u5219\u683C\u5F0F\u5316\u5B8C\u6210");
          return {
            yaml: yamlContent,
            fileName,
            warnings
          };
        } catch (error) {
          console.error("\u274C \u89C4\u5219\u683C\u5F0F\u5316\u5931\u8D25:", error);
          throw new Error(`\u89C4\u5219\u683C\u5F0F\u5316\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 批量格式化多个规则
       */
      formatBatch(rules, options = {}) {
        return rules.map((rule, index) => {
          console.log(`\u{1F4DD} \u683C\u5F0F\u5316\u89C4\u5219 ${index + 1}/${rules.length}...`);
          return this.format(rule, options);
        });
      }
      /**
       * 预处理规则数据
       */
      preprocessRule(rule, options, warnings) {
        const processedRule = { ...rule };
        if (options.sanitizePaths) {
          this.sanitizePaths(processedRule, options.projectName, warnings);
        }
        this.limitCodeExamples(processedRule, warnings);
        this.formatTimestamps(processedRule);
        return processedRule;
      }
      /**
       * 路径脱敏处理
       */
      sanitizePaths(rule, projectName, warnings) {
        if (rule.rule.trigger.type === "file_pattern") {
          const originalPattern = rule.rule.trigger.pattern;
          const sanitizedPattern = originalPattern.replace(/[\w-]+\//g, `${projectName}/`);
          if (originalPattern !== sanitizedPattern) {
            rule.rule.trigger.pattern = sanitizedPattern;
            warnings.push("\u6587\u4EF6\u8DEF\u5F84\u5DF2\u8131\u654F\u5904\u7406");
          }
        }
        rule.rule.suggestions.forEach((suggestion, index) => {
          if (suggestion.files) {
            suggestion.files = suggestion.files.map((file) => file.replace(/[\w-]+\//g, `${projectName}/`));
          }
        });
      }
      /**
       * 限制代码示例长度
       */
      limitCodeExamples(rule, warnings) {
        const maxLines = 15;
        rule.rule.suggestions.forEach((suggestion, index) => {
          if (suggestion.code) {
            const lines = suggestion.code.split("\n");
            if (lines.length > maxLines) {
              const importantLines = lines.filter((line) => line.includes("export") || line.includes("function") || line.includes("class") || line.includes("return") || line.trim().startsWith("//") || line.includes("TODO"));
              if (importantLines.length <= maxLines) {
                suggestion.code = importantLines.join("\n");
              } else {
                suggestion.code = [
                  ...lines.slice(0, 5),
                  "// ... (\u4EE3\u7801\u5DF2\u622A\u65AD\uFF0C\u4FDD\u7559\u5173\u952E\u903B\u8F91) ...",
                  ...lines.slice(-5)
                ].join("\n");
              }
              warnings.push(`\u5EFA\u8BAE ${index + 1} \u7684\u4EE3\u7801\u793A\u4F8B\u5DF2\u622A\u65AD\uFF0C\u4FDD\u7559\u5173\u952E\u903B\u8F91`);
            }
          }
        });
      }
      /**
       * 格式化时间戳
       */
      formatTimestamps(rule) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (!rule.meta.created) {
          rule.meta.created = now;
        }
        rule.meta.updated = now;
      }
      /**
       * 生成 YAML 内容
       */
      generateYaml(rule, options) {
        const yamlObject = this.createYamlObject(rule, options.includeComments);
        const yamlString = yaml_1.default.stringify(yamlObject, {
          indent: options.indent,
          lineWidth: options.lineWidth
        });
        let result = "";
        if (options.includeComments) {
          result += this.generateHeaderComment(rule);
        }
        result += yamlString;
        return result;
      }
      /**
       * 创建 YAML 对象结构
       */
      createYamlObject(rule, includeComments = true) {
        const yamlObj = {};
        yamlObj.meta = {
          id: rule.meta.id,
          name: rule.meta.name,
          version: rule.meta.version,
          description: rule.meta.description,
          authors: rule.meta.authors,
          license: rule.meta.license,
          created: rule.meta.created,
          updated: rule.meta.updated
        };
        yamlObj.rule = {
          trigger: {
            type: rule.rule.trigger.type,
            pattern: rule.rule.trigger.pattern
          }
        };
        if (rule.rule.trigger.file_types) {
          yamlObj.rule.trigger.file_types = rule.rule.trigger.file_types;
        }
        if (rule.rule.trigger.context) {
          yamlObj.rule.trigger.context = rule.rule.trigger.context;
        }
        yamlObj.rule.conditions = rule.rule.conditions.map((condition) => ({
          type: condition.type,
          condition: condition.condition,
          ...condition.negated !== void 0 && { negated: condition.negated }
        }));
        yamlObj.rule.suggestions = rule.rule.suggestions.map((suggestion) => {
          const suggestionObj = {
            type: suggestion.type,
            description: suggestion.description
          };
          if (suggestion.code) {
            suggestionObj.code = suggestion.code;
          }
          if (suggestion.command) {
            suggestionObj.command = suggestion.command;
          }
          if (suggestion.files) {
            suggestionObj.files = suggestion.files;
          }
          return suggestionObj;
        });
        yamlObj.compatibility = {
          languages: rule.compatibility.languages
        };
        if (rule.compatibility.frameworks && rule.compatibility.frameworks.length > 0) {
          yamlObj.compatibility.frameworks = rule.compatibility.frameworks;
        }
        if (rule.compatibility.tools && rule.compatibility.tools.length > 0) {
          yamlObj.compatibility.tools = rule.compatibility.tools;
        }
        if (rule.compatibility.min_version) {
          yamlObj.compatibility.min_version = rule.compatibility.min_version;
        }
        if (rule.compatibility.max_version) {
          yamlObj.compatibility.max_version = rule.compatibility.max_version;
        }
        yamlObj.confidence = Math.round(rule.confidence * 100) / 100;
        return yamlObj;
      }
      /**
       * 生成文件头注释
       */
      generateHeaderComment(rule) {
        return `# RuleForge Rule - ${rule.meta.name}
# ID: ${rule.meta.id}
# Version: ${rule.meta.version}
# Description: ${rule.meta.description}
# Authors: ${rule.meta.authors.join(", ")}
# Created: ${rule.meta.created}
# Updated: ${rule.meta.updated}
# Confidence: ${Math.round(rule.confidence * 100)}%
#
# This rule was automatically generated by RuleForge engine.
# REP Protocol Version: v0.1

`;
      }
      /**
       * 生成文件名
       */
      generateFileName(rule) {
        const sanitizedId = rule.meta.id.replace(/[^a-z0-9-]/g, "-");
        return `${sanitizedId}-v${rule.meta.version}.yaml`;
      }
      /**
       * 验证 YAML 格式
       */
      validateYaml(yamlContent) {
        try {
          if (!yamlContent.trim()) {
            return { valid: false, error: "YAML \u5185\u5BB9\u4E3A\u7A7A" };
          }
          if (!yamlContent.includes("meta:") || !yamlContent.includes("rule:")) {
            return { valid: false, error: "YAML \u7F3A\u5C11\u5FC5\u8981\u7684\u6839\u7EA7\u5B57\u6BB5 (meta, rule)" };
          }
          const lines = yamlContent.split("\n");
          let indentLevel = 0;
          const indentStack = [];
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith("#"))
              continue;
            const currentIndent = line.search(/\S/);
            if (currentIndent > -1) {
              if (indentStack.length === 0) {
                indentStack.push(currentIndent);
              } else if (currentIndent > indentStack[indentStack.length - 1]) {
                indentStack.push(currentIndent);
              } else if (currentIndent < indentStack[indentStack.length - 1]) {
                while (indentStack.length > 0 && currentIndent < indentStack[indentStack.length - 1]) {
                  indentStack.pop();
                }
                if (indentStack.length === 0 || currentIndent !== indentStack[indentStack.length - 1]) {
                  return { valid: false, error: "YAML \u7F29\u8FDB\u4E0D\u4E00\u81F4" };
                }
              }
            }
          }
          return { valid: true };
        } catch (error) {
          return {
            valid: false,
            error: `YAML \u9A8C\u8BC1\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`
          };
        }
      }
      /**
       * 美化 YAML 输出
       */
      prettify(yamlContent, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        try {
          const lines = yamlContent.split("\n");
          const prettifiedLines = [];
          let inCommentBlock = false;
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("#")) {
              if (!inCommentBlock && trimmedLine.startsWith("# ---")) {
                inCommentBlock = true;
                prettifiedLines.push("");
              }
              prettifiedLines.push(line);
            } else if (trimmedLine === "") {
              if (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] !== "") {
                prettifiedLines.push("");
              }
            } else {
              inCommentBlock = false;
              prettifiedLines.push(line);
            }
          }
          while (prettifiedLines.length > 0 && prettifiedLines[prettifiedLines.length - 1] === "") {
            prettifiedLines.pop();
          }
          return prettifiedLines.join("\n");
        } catch (error) {
          console.warn("YAML \u7F8E\u5316\u5931\u8D25\uFF0C\u8FD4\u56DE\u539F\u5185\u5BB9:", error);
          return yamlContent;
        }
      }
    };
    exports2.YamlFormatter = YamlFormatter;
  }
});

// ../core/dist/config/config-manager.js
var require_config_manager = __commonJS({
  "../core/dist/config/config-manager.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createDefaultConfig = exports2.loadConfig = exports2.ConfigManager = exports2.RuleForgeConfigSchema = void 0;
    var zod_1 = require_zod();
    exports2.RuleForgeConfigSchema = zod_1.z.object({
      extraction: zod_1.z.object({
        minConfidence: zod_1.z.number().min(0).max(1).default(0.7),
        applicableScenes: zod_1.z.number().int().min(1).default(2),
        logPath: zod_1.z.string().default(".ruleforge/logs"),
        languageFocus: zod_1.z.array(zod_1.z.string()).default(["typescript", "javascript", "vue", "python"]),
        maxFileSize: zod_1.z.number().int().min(1024).default(10 * 1024 * 1024)
        // 10MB
      }),
      privacy: zod_1.z.object({
        autoRedact: zod_1.z.boolean().default(true),
        allowedPatterns: zod_1.z.array(zod_1.z.string()).default([]),
        projectName: zod_1.z.string().default("{project_name}"),
        redactApiKeys: zod_1.z.boolean().default(true),
        redactPaths: zod_1.z.boolean().default(true)
      }),
      storage: zod_1.z.object({
        localRulesDir: zod_1.z.string().default(".ruleforge/rules"),
        cacheEnabled: zod_1.z.boolean().default(true),
        cacheTTL: zod_1.z.number().int().min(60).default(2 * 60 * 60),
        // 2小时
        maxVersions: zod_1.z.number().int().min(1).default(10),
        backupEnabled: zod_1.z.boolean().default(true)
      }),
      output: zod_1.z.object({
        format: zod_1.z.enum(["yaml", "json"]).default("yaml"),
        prettyPrint: zod_1.z.boolean().default(true),
        includeComments: zod_1.z.boolean().default(true),
        validateOutput: zod_1.z.boolean().default(true),
        generateReport: zod_1.z.boolean().default(true)
      }),
      github: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        autoCreatePR: zod_1.z.boolean().default(false),
        baseBranch: zod_1.z.string().default("main"),
        labels: zod_1.z.array(zod_1.z.string()).default(["ruleforge", "auto-generated"])
      }).optional()
    });
    var ConfigManager = class {
      config;
      sources = [];
      options;
      constructor(options = {}) {
        this.options = {
          configPath: options.configPath || ".ruleforge.yaml",
          userConfigPath: options.userConfigPath || "~/.ruleforge/config.yaml",
          envPrefix: options.envPrefix || "RULEFORGE_",
          validate: options.validate ?? true,
          createDefault: options.createDefault ?? false
        };
        this.config = exports2.RuleForgeConfigSchema.parse({});
      }
      /**
       * 加载配置（多层级合并）
       */
      async load() {
        console.log("\u{1F527} \u52A0\u8F7D RuleForge \u914D\u7F6E...");
        try {
          const defaultConfig = this.loadDefaultConfig();
          this.addSource("default", defaultConfig, 0);
          const userConfig = await this.loadUserConfig();
          if (userConfig) {
            this.addSource("user", userConfig, 1);
          }
          const projectConfig = await this.loadProjectConfig();
          if (projectConfig) {
            this.addSource("project", projectConfig, 2);
          }
          const envConfig = this.loadEnvConfig();
          this.addSource("environment", envConfig, 3);
          this.config = this.mergeConfigs();
          if (this.options.validate) {
            const validation = this.validate();
            if (!validation.valid) {
              console.warn("\u26A0\uFE0F \u914D\u7F6E\u9A8C\u8BC1\u8B66\u544A:", validation.warnings.join(", "));
            }
          }
          console.log("\u2705 \u914D\u7F6E\u52A0\u8F7D\u5B8C\u6210");
          this.logConfigSummary();
          return this.config;
        } catch (error) {
          console.error("\u274C \u914D\u7F6E\u52A0\u8F7D\u5931\u8D25:", error);
          throw new Error(`\u914D\u7F6E\u52A0\u8F7D\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 获取配置值
       */
      get(key) {
        const keys = key.split(".");
        let value = this.config;
        for (const k of keys) {
          if (value && typeof value === "object" && k in value) {
            value = value[k];
          } else {
            throw new Error(`\u914D\u7F6E\u952E\u4E0D\u5B58\u5728: ${key}`);
          }
        }
        return value;
      }
      /**
       * 设置配置值（仅内存中）
       */
      set(key, value) {
        const keys = key.split(".");
        let config = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!(k in config)) {
            config[k] = {};
          }
          config = config[k];
        }
        config[keys[keys.length - 1]] = value;
      }
      /**
       * 验证配置
       */
      validate() {
        try {
          const validated = exports2.RuleForgeConfigSchema.parse(this.config);
          return {
            valid: true,
            errors: [],
            warnings: []
          };
        } catch (error) {
          if (error instanceof zod_1.z.ZodError) {
            return {
              valid: false,
              errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
              warnings: []
            };
          }
          return {
            valid: false,
            errors: ["\u914D\u7F6E\u9A8C\u8BC1\u5931\u8D25"],
            warnings: []
          };
        }
      }
      /**
       * 保存配置到项目级文件
       */
      async save() {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const dir = path3.dirname(this.options.configPath);
          await fs3.mkdir(dir, { recursive: true });
          const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
          const yamlContent = yaml.stringify(this.config, {
            indent: 2,
            defaultKeyType: "PLAIN",
            defaultStringType: "PLAIN"
          });
          const header = `# RuleForge \u914D\u7F6E\u6587\u4EF6
# \u751F\u6210\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toISOString()}
# \u6587\u6863: https://ruleforge.dev/docs/configuration

`;
          await fs3.writeFile(this.options.configPath, header + yamlContent);
          console.log(`\u2705 \u914D\u7F6E\u5DF2\u4FDD\u5B58: ${this.options.configPath}`);
        } catch (error) {
          console.error("\u274C \u914D\u7F6E\u4FDD\u5B58\u5931\u8D25:", error);
          throw new Error(`\u914D\u7F6E\u4FDD\u5B58\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 获取配置源信息
       */
      getSources() {
        return [...this.sources];
      }
      /**
       * 重新加载配置
       */
      async reload() {
        this.sources = [];
        return this.load();
      }
      /**
       * 加载默认配置
       */
      loadDefaultConfig() {
        return exports2.RuleForgeConfigSchema.parse({});
      }
      /**
       * 加载用户级配置
       */
      async loadUserConfig() {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const os = await import("os");
          const userConfigPath = this.options.userConfigPath.replace("~", os.homedir());
          if (await this.fileExists(userConfigPath)) {
            const content = await fs3.readFile(userConfigPath, "utf-8");
            const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
            return yaml.parse(content);
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F \u7528\u6237\u7EA7\u914D\u7F6E\u52A0\u8F7D\u5931\u8D25:", error);
        }
        return null;
      }
      /**
       * 加载项目级配置
       */
      async loadProjectConfig() {
        try {
          const fs3 = await import("fs/promises");
          if (await this.fileExists(this.options.configPath)) {
            const content = await fs3.readFile(this.options.configPath, "utf-8");
            const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
            return yaml.parse(content);
          } else if (this.options.createDefault) {
            await this.createDefaultConfigFile();
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F \u9879\u76EE\u7EA7\u914D\u7F6E\u52A0\u8F7D\u5931\u8D25:", error);
        }
        return null;
      }
      /**
       * 加载环境变量配置
       */
      loadEnvConfig() {
        const envConfig = {};
        const prefix = this.options.envPrefix;
        const extractionConfig = {};
        const privacyConfig = {};
        const storageConfig = {};
        const outputConfig = {};
        if (process.env[`${prefix}MIN_CONFIDENCE`]) {
          extractionConfig.minConfidence = parseFloat(process.env[`${prefix}MIN_CONFIDENCE`]);
        }
        if (process.env[`${prefix}LOG_PATH`]) {
          extractionConfig.logPath = process.env[`${prefix}LOG_PATH`];
        }
        if (process.env[`${prefix}AUTO_REDACT`]) {
          privacyConfig.autoRedact = process.env[`${prefix}AUTO_REDACT`].toLowerCase() === "true";
        }
        if (process.env[`${prefix}LOCAL_RULES_DIR`]) {
          storageConfig.localRulesDir = process.env[`${prefix}LOCAL_RULES_DIR`];
        }
        if (process.env[`${prefix}OUTPUT_FORMAT`]) {
          outputConfig.format = process.env[`${prefix}OUTPUT_FORMAT`];
        }
        if (Object.keys(extractionConfig).length > 0) {
          envConfig.extraction = extractionConfig;
        }
        if (Object.keys(privacyConfig).length > 0) {
          envConfig.privacy = privacyConfig;
        }
        if (Object.keys(storageConfig).length > 0) {
          envConfig.storage = storageConfig;
        }
        if (Object.keys(outputConfig).length > 0) {
          envConfig.output = outputConfig;
        }
        return envConfig;
      }
      /**
       * 合并配置源
       */
      mergeConfigs() {
        const sortedSources = [...this.sources].sort((a, b) => b.priority - a.priority);
        let merged = {};
        for (const source of sortedSources) {
          merged = this.deepMerge(merged, source.config);
        }
        return exports2.RuleForgeConfigSchema.parse(merged);
      }
      /**
       * 深度合并对象
       */
      deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
          if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            result[key] = this.deepMerge(result[key] || {}, source[key]);
          } else {
            result[key] = source[key];
          }
        }
        return result;
      }
      /**
       * 添加配置源
       */
      addSource(name, config, priority) {
        this.sources.push({
          name,
          config,
          priority
        });
      }
      /**
       * 检查文件是否存在
       */
      async fileExists(path3) {
        try {
          const fs3 = await import("fs/promises");
          await fs3.access(path3);
          return true;
        } catch {
          return false;
        }
      }
      /**
       * 创建默认配置文件
       */
      async createDefaultConfigFile() {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const dir = path3.dirname(this.options.configPath);
          await fs3.mkdir(dir, { recursive: true });
          const defaultConfig = exports2.RuleForgeConfigSchema.parse({});
          const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
          const yamlContent = yaml.stringify(defaultConfig, {
            indent: 2,
            defaultKeyType: "PLAIN",
            defaultStringType: "PLAIN"
          });
          const header = `# RuleForge \u9ED8\u8BA4\u914D\u7F6E\u6587\u4EF6
# \u751F\u6210\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toISOString()}
# \u6587\u6863: https://ruleforge.dev/docs/configuration

`;
          await fs3.writeFile(this.options.configPath, header + yamlContent);
          console.log(`\u{1F4DD} \u521B\u5EFA\u9ED8\u8BA4\u914D\u7F6E\u6587\u4EF6: ${this.options.configPath}`);
        } catch (error) {
          console.warn("\u26A0\uFE0F \u521B\u5EFA\u9ED8\u8BA4\u914D\u7F6E\u6587\u4EF6\u5931\u8D25:", error);
        }
      }
      /**
       * 输出配置摘要
       */
      logConfigSummary() {
        console.log("\u{1F4CA} \u914D\u7F6E\u6458\u8981:");
        console.log(`   \u63D0\u53D6\u914D\u7F6E: \u6700\u5C0F\u7F6E\u4FE1\u5EA6=${this.config.extraction.minConfidence}, \u65E5\u5FD7\u8DEF\u5F84=${this.config.extraction.logPath}`);
        console.log(`   \u9690\u79C1\u914D\u7F6E: \u81EA\u52A8\u8131\u654F=${this.config.privacy.autoRedact}, \u9879\u76EE\u540D\u79F0=${this.config.privacy.projectName}`);
        console.log(`   \u5B58\u50A8\u914D\u7F6E: \u89C4\u5219\u76EE\u5F55=${this.config.storage.localRulesDir}, \u7F13\u5B58=${this.config.storage.cacheEnabled}`);
        console.log(`   \u8F93\u51FA\u914D\u7F6E: \u683C\u5F0F=${this.config.output.format}, \u7F8E\u5316=${this.config.output.prettyPrint}`);
        console.log(`   \u914D\u7F6E\u6E90\u6570: ${this.sources.length}`);
      }
      /**
       * 导出当前配置（用于调试）
       */
      export() {
        return { ...this.config };
      }
      /**
       * 重置为默认配置
       */
      reset() {
        this.config = exports2.RuleForgeConfigSchema.parse({});
        this.sources = [];
      }
    };
    exports2.ConfigManager = ConfigManager;
    var loadConfig = async (options) => {
      const manager = new ConfigManager(options);
      return manager.load();
    };
    exports2.loadConfig = loadConfig;
    var createDefaultConfig = async (configPath = ".ruleforge.yaml") => {
      const manager = new ConfigManager({ configPath, createDefault: true });
      await manager.load();
    };
    exports2.createDefaultConfig = createDefaultConfig;
    exports2.default = ConfigManager;
  }
});

// ../core/dist/storage/rule-store.js
var require_rule_store = __commonJS({
  "../core/dist/storage/rule-store.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createRuleStore = exports2.RuleStore = void 0;
    var rule_validator_1 = require_rule_validator();
    var RuleStore = class {
      rulesDir;
      maxVersions;
      backupEnabled;
      autoValidate;
      createIndex;
      validator;
      index = null;
      constructor(options = {}) {
        this.rulesDir = options.rulesDir || ".ruleforge/rules";
        this.maxVersions = options.maxVersions || 10;
        this.backupEnabled = options.backupEnabled ?? true;
        this.autoValidate = options.autoValidate ?? true;
        this.createIndex = options.createIndex ?? true;
        this.validator = new rule_validator_1.RuleValidator();
      }
      /**
       * 初始化规则库
       */
      async initialize() {
        console.log(`\u{1F4DA} \u521D\u59CB\u5316\u89C4\u5219\u5E93: ${this.rulesDir}`);
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          await fs3.mkdir(this.rulesDir, { recursive: true });
          const versionsDir = path3.join(this.rulesDir, "versions");
          await fs3.mkdir(versionsDir, { recursive: true });
          if (this.createIndex) {
            await this.loadOrCreateIndex();
          }
          console.log("\u2705 \u89C4\u5219\u5E93\u521D\u59CB\u5316\u5B8C\u6210");
        } catch (error) {
          console.error("\u274C \u89C4\u5219\u5E93\u521D\u59CB\u5316\u5931\u8D25:", error);
          throw new Error(`\u89C4\u5219\u5E93\u521D\u59CB\u5316\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 加载规则
       */
      async load(ruleId) {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const rulePath = path3.join(this.rulesDir, `${ruleId}.yaml`);
          if (!await this.fileExists(rulePath)) {
            return null;
          }
          const content = await fs3.readFile(rulePath, "utf-8");
          const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
          const rule = yaml.parse(content);
          if (this.autoValidate) {
            const validation = this.validator.validate(rule);
            if (!validation.valid) {
              console.warn(`\u26A0\uFE0F \u89C4\u5219 ${ruleId} \u9A8C\u8BC1\u5931\u8D25:`, validation.errors.join(", "));
            }
          }
          return rule;
        } catch (error) {
          console.error(`\u274C \u52A0\u8F7D\u89C4\u5219 ${ruleId} \u5931\u8D25:`, error);
          return null;
        }
      }
      /**
       * 保存规则
       */
      async save(rule) {
        try {
          console.log(`\u{1F4BE} \u4FDD\u5B58\u89C4\u5219: ${rule.meta.id}`);
          const conflictResult = await this.detectConflicts(rule);
          if (conflictResult.hasConflict) {
            console.warn("\u26A0\uFE0F \u68C0\u6D4B\u5230\u89C4\u5219\u51B2\u7A81:", conflictResult.conflicts.map((c) => c.description).join(", "));
          }
          if (this.autoValidate) {
            const validation = this.validator.validate(rule);
            if (!validation.valid) {
              throw new Error(`\u89C4\u5219\u9A8C\u8BC1\u5931\u8D25: ${validation.errors.join(", ")}`);
            }
          }
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          if (this.backupEnabled) {
            await this.createBackup(rule);
          }
          const rulePath = path3.join(this.rulesDir, `${rule.meta.id}.yaml`);
          const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
          const yamlContent = yaml.stringify(rule, {
            indent: 2,
            defaultKeyType: "PLAIN",
            defaultStringType: "PLAIN"
          });
          const header = `# RuleForge Rule - ${rule.meta.name}
# ID: ${rule.meta.id}
# Version: ${rule.meta.version}
# Updated: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
          await fs3.writeFile(rulePath, header + yamlContent);
          if (this.createIndex) {
            await this.updateIndex(rule, rulePath);
          }
          console.log(`\u2705 \u89C4\u5219\u5DF2\u4FDD\u5B58: ${rulePath}`);
        } catch (error) {
          console.error("\u274C \u89C4\u5219\u4FDD\u5B58\u5931\u8D25:", error);
          throw new Error(`\u89C4\u5219\u4FDD\u5B58\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 删除规则
       */
      async delete(ruleId) {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const rulePath = path3.join(this.rulesDir, `${ruleId}.yaml`);
          if (!await this.fileExists(rulePath)) {
            throw new Error(`\u89C4\u5219\u4E0D\u5B58\u5728: ${ruleId}`);
          }
          const trashDir = path3.join(this.rulesDir, "trash");
          await fs3.mkdir(trashDir, { recursive: true });
          const trashPath = path3.join(trashDir, `${ruleId}-${Date.now()}.yaml`);
          await fs3.rename(rulePath, trashPath);
          if (this.createIndex && this.index) {
            this.index.rules = this.index.rules.filter((r) => r.id !== ruleId);
            await this.saveIndex();
          }
          console.log(`\u{1F5D1}\uFE0F \u89C4\u5219\u5DF2\u5220\u9664: ${ruleId}`);
        } catch (error) {
          console.error(`\u274C \u5220\u9664\u89C4\u5219 ${ruleId} \u5931\u8D25:`, error);
          throw new Error(`\u5220\u9664\u89C4\u5219\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 列出规则
       */
      async list(filters) {
        try {
          if (this.createIndex && this.index) {
            const filteredItems = this.filterIndex(this.index.rules, filters);
            const rules = [];
            for (const item of filteredItems) {
              const rule = await this.load(item.id);
              if (rule) {
                rules.push(rule);
              }
            }
            return rules;
          } else {
            return await this.scanRulesDir(filters);
          }
        } catch (error) {
          console.error("\u274C \u5217\u51FA\u89C4\u5219\u5931\u8D25:", error);
          return [];
        }
      }
      /**
       * 检查规则是否存在
       */
      async exists(ruleId) {
        const fs3 = await import("fs/promises");
        const path3 = await import("path");
        const rulePath = path3.join(this.rulesDir, `${ruleId}.yaml`);
        return this.fileExists(rulePath);
      }
      /**
       * 获取规则版本历史
       */
      async getVersions(ruleId) {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const versionsDir = path3.join(this.rulesDir, "versions", ruleId);
          if (!await this.fileExists(versionsDir)) {
            return [];
          }
          const files = await fs3.readdir(versionsDir);
          const versions = [];
          for (const file of files) {
            if (file.endsWith(".yaml")) {
              const filePath = path3.join(versionsDir, file);
              const stats = await fs3.stat(filePath);
              versions.push({
                version: file.replace(".yaml", ""),
                timestamp: stats.mtime.toISOString(),
                filePath
              });
            }
          }
          return versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
          console.error(`\u274C \u83B7\u53D6\u89C4\u5219 ${ruleId} \u7248\u672C\u5386\u53F2\u5931\u8D25:`, error);
          return [];
        }
      }
      /**
       * 回滚到指定版本
       */
      async rollback(ruleId, version) {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const versionPath = path3.join(this.rulesDir, "versions", ruleId, `${version}.yaml`);
          if (!await this.fileExists(versionPath)) {
            throw new Error(`\u7248\u672C\u4E0D\u5B58\u5728: ${version}`);
          }
          const content = await fs3.readFile(versionPath, "utf-8");
          const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
          const rule = yaml.parse(content);
          await this.save(rule);
          console.log(`\u21A9\uFE0F \u89C4\u5219 ${ruleId} \u5DF2\u56DE\u6EDA\u5230\u7248\u672C ${version}`);
        } catch (error) {
          console.error(`\u274C \u56DE\u6EDA\u89C4\u5219 ${ruleId} \u5931\u8D25:`, error);
          throw new Error(`\u56DE\u6EDA\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 批量导入规则
       */
      async importRules(rules) {
        const result = {
          total: rules.length,
          success: 0,
          failed: 0,
          errors: []
        };
        for (const rule of rules) {
          try {
            await this.save(rule);
            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              ruleId: rule.meta.id,
              error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"
            });
          }
        }
        console.log(`\u{1F4E6} \u6279\u91CF\u5BFC\u5165\u5B8C\u6210: ${result.success} \u6210\u529F, ${result.failed} \u5931\u8D25`);
        return result;
      }
      /**
       * 批量导出规则
       */
      async exportRules(filters) {
        return this.list(filters);
      }
      /**
       * 验证所有规则
       */
      async validateAll() {
        const rules = await this.list();
        const report = {
          total: rules.length,
          valid: 0,
          invalid: 0,
          details: []
        };
        for (const rule of rules) {
          const validation = this.validator.validate(rule);
          if (validation.valid) {
            report.valid++;
          } else {
            report.invalid++;
            report.details.push({
              ruleId: rule.meta.id,
              errors: validation.errors,
              warnings: validation.warnings
            });
          }
        }
        return report;
      }
      /**
       * 搜索规则
       */
      async search(query, filters) {
        const allRules = await this.list(filters);
        return allRules.filter((rule) => {
          const searchText = [
            rule.meta.name,
            rule.meta.description,
            rule.rule.conditions[0]?.condition || "",
            ...rule.rule.suggestions.map((s) => s.description)
          ].join(" ").toLowerCase();
          return searchText.includes(query.toLowerCase());
        });
      }
      /**
       * 获取统计信息
       */
      async getStatistics() {
        const rules = await this.list();
        return {
          totalRules: rules.length,
          languages: [...new Set(rules.map((r) => r.compatibility.languages).flat())],
          frameworks: [...new Set(rules.map((r) => r.compatibility.frameworks || []).flat())],
          averageConfidence: rules.reduce((sum, r) => sum + r.confidence, 0) / rules.length,
          lastUpdated: this.index?.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      /**
       * 检测冲突
       */
      async detectConflicts(newRule) {
        const conflicts = [];
        const existingRule = await this.load(newRule.meta.id);
        if (existingRule) {
          conflicts.push({
            type: "id",
            ruleId: newRule.meta.id,
            existingRule,
            newRule,
            description: `\u89C4\u5219 ID \u51B2\u7A81: ${newRule.meta.id}`
          });
        }
        const similarRules = await this.findSimilarRules(newRule);
        for (const rule of similarRules) {
          if (rule.rule.conditions[0]?.condition !== newRule.rule.conditions[0]?.condition) {
            conflicts.push({
              type: "content",
              ruleId: rule.meta.id,
              existingRule: rule,
              newRule,
              description: `\u89C4\u5219\u5185\u5BB9\u51B2\u7A81: ${newRule.meta.id} \u4E0E ${rule.meta.id}`
            });
          }
        }
        return {
          hasConflict: conflicts.length > 0,
          conflicts,
          suggestions: conflicts.length > 0 ? [
            "\u8003\u8651\u4FEE\u6539\u89C4\u5219 ID",
            "\u5408\u5E76\u76F8\u4F3C\u7684\u89C4\u5219",
            "\u6DFB\u52A0\u66F4\u5177\u4F53\u7684\u89E6\u53D1\u6761\u4EF6"
          ] : []
        };
      }
      /**
       * 查找相似规则
       */
      async findSimilarRules(rule) {
        const allRules = await this.list();
        return allRules.filter((existingRule) => {
          return existingRule.rule.trigger.pattern === rule.rule.trigger.pattern && existingRule.meta.id !== rule.meta.id;
        });
      }
      /**
       * 创建备份
       */
      async createBackup(rule) {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const versionsDir = path3.join(this.rulesDir, "versions", rule.meta.id);
          await fs3.mkdir(versionsDir, { recursive: true });
          const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
          const versionPath = path3.join(versionsDir, `${timestamp}.yaml`);
          const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
          const yamlContent = yaml.stringify(rule, {
            indent: 2,
            defaultKeyType: "PLAIN",
            defaultStringType: "PLAIN"
          });
          await fs3.writeFile(versionPath, yamlContent);
          await this.cleanupOldVersions(rule.meta.id);
        } catch (error) {
          console.warn("\u26A0\uFE0F \u521B\u5EFA\u5907\u4EFD\u5931\u8D25:", error);
        }
      }
      /**
       * 清理旧版本
       */
      async cleanupOldVersions(ruleId) {
        try {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const versionsDir = path3.join(this.rulesDir, "versions", ruleId);
          if (!await this.fileExists(versionsDir)) {
            return;
          }
          const files = await fs3.readdir(versionsDir);
          const versionFiles = files.filter((f) => f.endsWith(".yaml"));
          if (versionFiles.length > this.maxVersions) {
            versionFiles.sort().reverse();
            const filesToDelete = versionFiles.slice(this.maxVersions);
            for (const file of filesToDelete) {
              await fs3.unlink(path3.join(versionsDir, file));
            }
            console.log(`\u{1F9F9} \u6E05\u7406\u4E86 ${filesToDelete.length} \u4E2A\u65E7\u7248\u672C: ${ruleId}`);
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F \u6E05\u7406\u65E7\u7248\u672C\u5931\u8D25:", error);
        }
      }
      /**
       * 加载或创建索引
       */
      async loadOrCreateIndex() {
        const fs3 = await import("fs/promises");
        const path3 = await import("path");
        const indexPath = path3.join(this.rulesDir, "rules-index.json");
        try {
          if (await this.fileExists(indexPath)) {
            const content = await fs3.readFile(indexPath, "utf-8");
            this.index = JSON.parse(content);
            console.log("\u{1F4CB} \u89C4\u5219\u7D22\u5F15\u5DF2\u52A0\u8F7D");
          } else {
            this.index = {
              version: "1.0.0",
              updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
              rules: []
            };
            await this.saveIndex();
            console.log("\u{1F4CB} \u521B\u5EFA\u65B0\u89C4\u5219\u7D22\u5F15");
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F \u52A0\u8F7D\u7D22\u5F15\u5931\u8D25\uFF0C\u521B\u5EFA\u65B0\u7D22\u5F15:", error);
          this.index = {
            version: "1.0.0",
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            rules: []
          };
        }
      }
      /**
       * 更新索引
       */
      async updateIndex(rule, filePath) {
        if (!this.index)
          return;
        const existingIndex = this.index.rules.findIndex((r) => r.id === rule.meta.id);
        const indexItem = {
          id: rule.meta.id,
          name: rule.meta.name,
          version: rule.meta.version,
          filePath,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          confidence: rule.confidence,
          language: rule.compatibility.languages[0],
          framework: rule.compatibility.frameworks?.[0],
          tags: this.extractTags(rule)
        };
        if (existingIndex >= 0) {
          this.index.rules[existingIndex] = indexItem;
        } else {
          this.index.rules.push(indexItem);
        }
        this.index.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await this.saveIndex();
      }
      /**
       * 保存索引
       */
      async saveIndex() {
        if (!this.index)
          return;
        const fs3 = await import("fs/promises");
        const path3 = await import("path");
        const indexPath = path3.join(this.rulesDir, "rules-index.json");
        await fs3.writeFile(indexPath, JSON.stringify(this.index, null, 2));
      }
      /**
       * 过滤索引
       */
      filterIndex(items, filters) {
        let filtered = [...items];
        if (filters?.language) {
          filtered = filtered.filter((item) => item.language === filters.language);
        }
        if (filters?.framework) {
          filtered = filtered.filter((item) => item.framework === filters.framework);
        }
        if (filters?.minConfidence) {
          filtered = filtered.filter((item) => item.confidence >= filters.minConfidence);
        }
        if (filters?.tags && filters.tags.length > 0) {
          filtered = filtered.filter((item) => item.tags?.some((tag) => filters.tags.includes(tag)));
        }
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter((item) => item.name.toLowerCase().includes(searchLower) || item.id.toLowerCase().includes(searchLower));
        }
        if (filters?.limit) {
          const offset = filters.offset || 0;
          filtered = filtered.slice(offset, offset + filters.limit);
        }
        return filtered;
      }
      /**
       * 扫描规则目录
       */
      async scanRulesDir(filters) {
        const fs3 = await import("fs/promises");
        const path3 = await import("path");
        const rules = [];
        try {
          const files = await fs3.readdir(this.rulesDir);
          for (const file of files) {
            if (file.endsWith(".yaml") && !file.startsWith(".")) {
              try {
                const rulePath = path3.join(this.rulesDir, file);
                const content = await fs3.readFile(rulePath, "utf-8");
                const yaml = await Promise.resolve().then(() => __toESM(require_dist()));
                const rule = yaml.parse(content);
                if (this.matchesFilters(rule, filters)) {
                  rules.push(rule);
                }
              } catch (error) {
                console.warn(`\u26A0\uFE0F \u52A0\u8F7D\u89C4\u5219\u6587\u4EF6\u5931\u8D25: ${file}`, error);
              }
            }
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F \u626B\u63CF\u89C4\u5219\u76EE\u5F55\u5931\u8D25:", error);
        }
        return rules;
      }
      /**
       * 检查规则是否匹配过滤器
       */
      matchesFilters(rule, filters) {
        if (!filters)
          return true;
        if (filters.language && !rule.compatibility.languages.includes(filters.language)) {
          return false;
        }
        if (filters.framework && !rule.compatibility.frameworks?.includes(filters.framework)) {
          return false;
        }
        if (filters.minConfidence && rule.confidence < filters.minConfidence) {
          return false;
        }
        return true;
      }
      /**
       * 提取标签
       */
      extractTags(rule) {
        const tags = [];
        const text = `${rule.meta.name} ${rule.meta.description}`.toLowerCase();
        const commonTags = ["validation", "error", "test", "component", "function", "type", "security"];
        for (const tag of commonTags) {
          if (text.includes(tag)) {
            tags.push(tag);
          }
        }
        tags.push(...rule.compatibility.languages);
        return [...new Set(tags)];
      }
      /**
       * 检查文件是否存在
       */
      async fileExists(path3) {
        try {
          const fs3 = await import("fs/promises");
          await fs3.access(path3);
          return true;
        } catch {
          return false;
        }
      }
    };
    exports2.RuleStore = RuleStore;
    var createRuleStore = async (options) => {
      const store = new RuleStore(options);
      await store.initialize();
      return store;
    };
    exports2.createRuleStore = createRuleStore;
    exports2.default = RuleStore;
  }
});

// ../core/dist/index.js
var require_dist2 = __commonJS({
  "../core/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createRuleStore = exports2.loadConfig = exports2.formatRules = exports2.validateRules = exports2.extractRules = exports2.createRuleForgeEngine = exports2.RuleStore = exports2.ConfigManager = exports2.YamlFormatter = exports2.RuleValidator = exports2.RuleExtractor = exports2.RuleForgeEngine = void 0;
    var rule_extractor_1 = require_rule_extractor();
    var rule_validator_1 = require_rule_validator();
    var yaml_formatter_1 = require_yaml_formatter();
    var config_manager_1 = require_config_manager();
    var rule_store_1 = require_rule_store();
    var RuleForgeEngine2 = class {
      extractor;
      validator;
      formatter;
      config;
      store;
      options;
      constructor(options = {}) {
        this.extractor = new rule_extractor_1.RuleExtractor();
        this.validator = rule_validator_1.RuleValidator.createStandardValidator();
        this.formatter = new yaml_formatter_1.YamlFormatter();
        this.config = new config_manager_1.ConfigManager({
          configPath: options.configPath
        });
        this.store = new rule_store_1.RuleStore({
          rulesDir: options.rulesDir
        });
        this.options = {
          minConfidence: options.minConfidence ?? 0.7,
          strictValidation: options.strictValidation ?? true,
          includeComments: options.includeComments ?? true,
          projectName: options.projectName ?? "{project_name}",
          configPath: options.configPath ?? ".ruleforge.yaml",
          rulesDir: options.rulesDir ?? ".ruleforge/rules",
          autoSave: options.autoSave ?? true
        };
      }
      /**
       * 初始化引擎（加载配置和规则库）
       */
      async initialize() {
        try {
          console.log("\u{1F527} \u521D\u59CB\u5316 RuleForge \u5F15\u64CE...");
          await this.config.load();
          await this.store.initialize();
          this.updateOptionsFromConfig();
          console.log("\u2705 RuleForge \u5F15\u64CE\u521D\u59CB\u5316\u5B8C\u6210");
        } catch (error) {
          console.error("\u274C RuleForge \u5F15\u64CE\u521D\u59CB\u5316\u5931\u8D25:", error);
          throw new Error(`\u5F15\u64CE\u521D\u59CB\u5316\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 完整的规则处理流程
       */
      async processSession(sessionOptions) {
        const startTime = Date.now();
        try {
          console.log("\u{1F680} \u5F00\u59CB RuleForge \u89C4\u5219\u5904\u7406\u6D41\u7A0B...");
          if (!this.isInitialized()) {
            await this.initialize();
          }
          const extractStart = Date.now();
          const extractionResult = await this.extractor.extract({
            ...sessionOptions,
            minConfidence: this.options.minConfidence
          });
          const extractionTime = Date.now() - extractStart;
          if (extractionResult.rules.length === 0) {
            console.log("\u26A0\uFE0F \u672A\u53D1\u73B0\u53EF\u63D0\u53D6\u7684\u89C4\u5219");
            return this.createEmptyResult(extractionResult);
          }
          console.log(`\u2705 \u63D0\u53D6\u5B8C\u6210\uFF0C\u53D1\u73B0 ${extractionResult.rules.length} \u4E2A\u5019\u9009\u89C4\u5219`);
          const validationStart = Date.now();
          const validationOptions = {
            strict: this.options.strictValidation
          };
          const validationResults = this.validator.validateBatch(extractionResult.rules, validationOptions);
          const validationTime = Date.now() - validationStart;
          const formattingStart = Date.now();
          const formatOptions = {
            includeComments: this.options.includeComments,
            projectName: this.options.projectName
          };
          const formattedResults = this.formatter.formatBatch(extractionResult.rules, formatOptions);
          const formattingTime = Date.now() - formattingStart;
          if (this.options.autoSave) {
            await this.saveRulesToStore(extractionResult.rules);
          }
          const validRules = validationResults.filter((result2) => result2.valid).length;
          const totalTime = Date.now() - startTime;
          const result = {
            extraction: extractionResult,
            validation: validationResults,
            formatted: extractionResult.rules.map((rule, index) => ({
              rule,
              yaml: formattedResults[index].yaml,
              fileName: formattedResults[index].fileName
            })),
            summary: {
              totalRules: extractionResult.rules.length,
              validRules,
              extractionTime,
              validationTime,
              formattingTime
            }
          };
          console.log(`\u{1F389} RuleForge \u5904\u7406\u5B8C\u6210\uFF01`);
          console.log(`\u{1F4CA} \u7EDF\u8BA1\u4FE1\u606F:`);
          console.log(`   - \u603B\u89C4\u5219\u6570: ${result.summary.totalRules}`);
          console.log(`   - \u6709\u6548\u89C4\u5219: ${result.summary.validRules}`);
          console.log(`   - \u63D0\u53D6\u65F6\u95F4: ${result.summary.extractionTime}ms`);
          console.log(`   - \u9A8C\u8BC1\u65F6\u95F4: ${result.summary.validationTime}ms`);
          console.log(`   - \u683C\u5F0F\u5316\u65F6\u95F4: ${result.summary.formattingTime}ms`);
          console.log(`   - \u603B\u8017\u65F6: ${totalTime}ms`);
          return result;
        } catch (error) {
          console.error("\u274C RuleForge \u5904\u7406\u5931\u8D25:", error);
          throw new Error(`RuleForge \u5904\u7406\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 仅提取规则（不验证和格式化）
       */
      async extractOnly(sessionOptions) {
        return await this.extractor.extract({
          ...sessionOptions,
          minConfidence: this.options.minConfidence
        });
      }
      /**
       * 仅验证规则
       */
      validateOnly(rules, options = {}) {
        return this.validator.validateBatch(rules, {
          ...options,
          strict: this.options.strictValidation
        });
      }
      /**
       * 仅格式化规则
       */
      formatOnly(rules, options = {}) {
        const formatOptions = {
          ...options,
          includeComments: this.options.includeComments,
          projectName: this.options.projectName
        };
        return this.formatter.formatBatch(rules, formatOptions);
      }
      /**
       * 获取所有规则
       */
      async getRules() {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        return await this.store.list();
      }
      /**
       * 获取单个规则
       */
      async getRule(id) {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        return await this.store.load(id);
      }
      /**
       * 删除规则
       */
      async deleteRule(id) {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        await this.store.delete(id);
      }
      /**
       * 保存规则到本地库
       */
      async saveRule(rule) {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        await this.store.save(rule);
      }
      /**
       * 批量导入规则
       */
      async importRules(rules) {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        return await this.store.importRules(rules);
      }
      /**
       * 验证所有本地规则
       */
      async validateAllRules() {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        return await this.store.validateAll();
      }
      /**
       * 获取规则统计信息
       */
      async getRuleStatistics() {
        if (!this.isInitialized()) {
          await this.initialize();
        }
        return await this.store.getStatistics();
      }
      /**
       * 获取配置信息
       */
      getConfig() {
        return this.config.export();
      }
      /**
       * 保存当前配置
       */
      async saveConfig() {
        await this.config.save();
      }
      /**
       * 重新加载配置
       */
      async reloadConfig() {
        await this.config.reload();
        this.updateOptionsFromConfig();
      }
      /**
       * 生成处理报告
       */
      generateReport(processResult) {
        let report = `# RuleForge \u5904\u7406\u62A5\u544A

`;
        report += `## \u5904\u7406\u6982\u89C8
`;
        report += `- \u4F1A\u8BDDID: ${processResult.extraction.rules[0]?.meta.authors[0]?.replace("extracted-from-", "") || "\u672A\u77E5"}
`;
        report += `- \u5904\u7406\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
        report += `- \u603B\u89C4\u5219\u6570: ${processResult.summary.totalRules}
`;
        report += `- \u6709\u6548\u89C4\u5219: ${processResult.summary.validRules}
`;
        report += `- \u6210\u529F\u7387: ${(processResult.summary.validRules / processResult.summary.totalRules * 100).toFixed(1)}%

`;
        report += `## \u65F6\u95F4\u7EDF\u8BA1
`;
        report += `- \u89C4\u5219\u63D0\u53D6: ${processResult.summary.extractionTime}ms
`;
        report += `- \u89C4\u5219\u9A8C\u8BC1: ${processResult.summary.validationTime}ms
`;
        report += `- \u89C4\u5219\u683C\u5F0F\u5316: ${processResult.summary.formattingTime}ms
`;
        report += `- \u603B\u8017\u65F6: ${processResult.summary.extractionTime + processResult.summary.validationTime + processResult.summary.formattingTime}ms

`;
        const validationReport = this.validator.generateReport(processResult.validation);
        report += validationReport;
        const allWarnings = [
          ...processResult.extraction.warnings,
          ...processResult.validation.flatMap((result) => result.warnings),
          ...processResult.formatted.flatMap((item) => item.yaml.includes("\u8B66\u544A") ? ["\u683C\u5F0F\u5316\u8B66\u544A"] : [])
        ];
        if (allWarnings.length > 0) {
          report += `## \u8B66\u544A\u4FE1\u606F
`;
          allWarnings.forEach((warning) => {
            report += `- \u26A0\uFE0F ${warning}
`;
          });
          report += `
`;
        }
        return report;
      }
      /**
       * 导出规则文件
       */
      async exportRules(processResult, outputDir) {
        const exportedFiles = [];
        try {
          processResult.formatted.forEach((item) => {
            const filePath = `${outputDir}/${item.fileName}`;
            exportedFiles.push(filePath);
            console.log(`\u{1F4C4} \u5BFC\u51FA\u89C4\u5219\u6587\u4EF6: ${filePath}`);
          });
          const reportContent = this.generateReport(processResult);
          const reportPath = `${outputDir}/ruleforge-report.md`;
          exportedFiles.push(reportPath);
          console.log(`\u{1F4CA} \u5BFC\u51FA\u62A5\u544A\u6587\u4EF6: ${reportPath}`);
          return exportedFiles;
        } catch (error) {
          console.error("\u274C \u89C4\u5219\u5BFC\u51FA\u5931\u8D25:", error);
          throw new Error(`\u89C4\u5219\u5BFC\u51FA\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      /**
       * 更新引擎配置
       */
      updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        console.log("\u2699\uFE0F \u5F15\u64CE\u914D\u7F6E\u5DF2\u66F4\u65B0");
      }
      /**
       * 获取当前配置
       */
      getOptions() {
        return { ...this.options };
      }
      /**
       * 检查引擎是否已初始化
       */
      isInitialized() {
        return this.config.getSources().length > 0;
      }
      /**
       * 从配置更新引擎选项
       */
      updateOptionsFromConfig() {
        const config = this.config.export();
        this.options = {
          ...this.options,
          minConfidence: config.extraction.minConfidence,
          projectName: config.privacy.projectName,
          rulesDir: config.storage.localRulesDir
        };
      }
      /**
       * 保存规则到本地库
       */
      async saveRulesToStore(rules) {
        try {
          console.log(`\u{1F4BE} \u81EA\u52A8\u4FDD\u5B58 ${rules.length} \u4E2A\u89C4\u5219\u5230\u672C\u5730\u5E93...`);
          for (const rule of rules) {
            await this.store.save(rule);
          }
          console.log("\u2705 \u89C4\u5219\u4FDD\u5B58\u5B8C\u6210");
        } catch (error) {
          console.warn("\u26A0\uFE0F \u81EA\u52A8\u4FDD\u5B58\u89C4\u5219\u5931\u8D25:", error);
        }
      }
      /**
       * 创建空结果
       */
      createEmptyResult(extractionResult) {
        return {
          extraction: extractionResult,
          validation: [],
          formatted: [],
          summary: {
            totalRules: 0,
            validRules: 0,
            extractionTime: extractionResult.statistics.extractionTime,
            validationTime: 0,
            formattingTime: 0
          }
        };
      }
    };
    exports2.RuleForgeEngine = RuleForgeEngine2;
    var rule_extractor_2 = require_rule_extractor();
    Object.defineProperty(exports2, "RuleExtractor", { enumerable: true, get: function() {
      return rule_extractor_2.RuleExtractor;
    } });
    var rule_validator_2 = require_rule_validator();
    Object.defineProperty(exports2, "RuleValidator", { enumerable: true, get: function() {
      return rule_validator_2.RuleValidator;
    } });
    var yaml_formatter_2 = require_yaml_formatter();
    Object.defineProperty(exports2, "YamlFormatter", { enumerable: true, get: function() {
      return yaml_formatter_2.YamlFormatter;
    } });
    var config_manager_2 = require_config_manager();
    Object.defineProperty(exports2, "ConfigManager", { enumerable: true, get: function() {
      return config_manager_2.ConfigManager;
    } });
    var rule_store_2 = require_rule_store();
    Object.defineProperty(exports2, "RuleStore", { enumerable: true, get: function() {
      return rule_store_2.RuleStore;
    } });
    var createRuleForgeEngine = (options) => new RuleForgeEngine2(options);
    exports2.createRuleForgeEngine = createRuleForgeEngine;
    var extractRules = async (sessionOptions) => {
      const engine2 = new RuleForgeEngine2();
      return await engine2.extractOnly(sessionOptions);
    };
    exports2.extractRules = extractRules;
    var validateRules = (rules, options) => {
      const validator = rule_validator_1.RuleValidator.createStandardValidator();
      return validator.validateBatch(rules, options);
    };
    exports2.validateRules = validateRules;
    var formatRules = (rules, options) => {
      const formatter = new yaml_formatter_1.YamlFormatter();
      return formatter.formatBatch(rules, options);
    };
    exports2.formatRules = formatRules;
    var loadConfig = async (options) => {
      const configManager = new config_manager_1.ConfigManager(options);
      return await configManager.load();
    };
    exports2.loadConfig = loadConfig;
    var createRuleStore = async (options) => {
      const store = new rule_store_1.RuleStore(options);
      await store.initialize();
      return store;
    };
    exports2.createRuleStore = createRuleStore;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs/promises"));
var import_core = __toESM(require_dist2());

// src/ui/confirmation-panel.ts
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs/promises"));
async function showConfirmationPanel(rules) {
  if (rules.length === 0) {
    vscode.window.showInformationMessage("\u6CA1\u6709\u5019\u9009\u89C4\u5219\u9700\u8981\u786E\u8BA4");
    return [];
  }
  const panel = vscode.window.createWebviewPanel(
    "ruleforge.confirmation",
    "RuleForge - \u5019\u9009\u89C4\u5219\u786E\u8BA4",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  panel.webview.html = getWebviewContent(rules);
  const results = [];
  const messagePromise = new Promise((resolve) => {
    const disposable = panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "action":
          results.push({
            rule: rules[message.index],
            action: message.action
          });
          break;
        case "done":
          disposable.dispose();
          resolve(results);
          break;
      }
    });
    panel.onDidDispose(() => {
      disposable.dispose();
      resolve(results);
    });
  });
  const actionResults = await messagePromise;
  panel.dispose();
  await processResults(actionResults);
  return actionResults;
}
function getWebviewContent(rules) {
  const rulesHtml = rules.map((rule, index) => `
    <div class="rule-card" data-index="${index}">
      <div class="rule-header">
        <h3>${escapeHtml(rule.meta.name)}</h3>
        <span class="confidence-badge" style="background-color: ${getConfidenceColor(rule.confidence)}">
          ${(rule.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <p class="rule-description">${escapeHtml(rule.meta.description || "\u65E0\u63CF\u8FF0")}</p>
      <div class="rule-meta">
        <span class="meta-item">\u{1F4C1} ${escapeHtml(rule.compatibility.languages.join(", "))}</span>
        <span class="meta-item">\u{1F527} ${escapeHtml(rule.compatibility.frameworks?.join(", ") || "\u65E0")}</span>
      </div>
      <div class="rule-actions">
        <button class="btn btn-share" onclick="handleAction(${index}, 'share')">
          \u{1F310} \u5206\u4EAB
        </button>
        <button class="btn btn-save" onclick="handleAction(${index}, 'save_local')">
          \u{1F4BE} \u672C\u5730\u4FDD\u5B58
        </button>
        <button class="btn btn-later" onclick="handleAction(${index}, 'later')">
          \u23F0 \u7A0D\u540E
        </button>
      </div>
    </div>
  `).join("");
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RuleForge \u786E\u8BA4\u9762\u677F</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        .rule-card {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .rule-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .confidence-badge {
          padding: 4px 8px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .rule-description {
          margin: 8px 0;
          color: var(--vscode-descriptionForeground);
        }
        .rule-meta {
          display: flex;
          gap: 16px;
          margin: 12px 0;
          font-size: 14px;
        }
        .meta-item {
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .rule-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .btn:hover {
          opacity: 0.9;
        }
        .btn-share {
          background-color: #0066CC;
          color: white;
        }
        .btn-save {
          background-color: #28a745;
          color: white;
        }
        .btn-later {
          background-color: #6c757d;
          color: white;
        }
        .summary {
          margin-top: 20px;
          padding: 16px;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 8px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>\u{1F50D} \u53D1\u73B0 ${rules.length} \u4E2A\u53EF\u590D\u7528\u89C4\u5219</h1>
      ${rulesHtml}
      <div class="summary">
        <button class="btn btn-share" onclick="done()" style="width: 200px;">
          \u2705 \u5B8C\u6210
        </button>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        
        function handleAction(index, action) {
          vscode.postMessage({
            command: 'action',
            index: index,
            action: action
          });
          
          // \u89C6\u89C9\u53CD\u9988
          const card = document.querySelector(\`.rule-card[data-index="\${index}"]\`);
          card.style.opacity = '0.5';
          card.querySelector('.rule-actions').innerHTML = '<span style="color: #28a745;">\u2713 \u5DF2\u5904\u7406</span>';
        }
        
        function done() {
          vscode.postMessage({
            command: 'done'
          });
        }
      </script>
    </body>
    </html>
  `;
}
async function processResults(results) {
  const shareRules = results.filter((r) => r.action === "share" /* Share */);
  const saveLocalRules = results.filter((r) => r.action === "save_local" /* SaveLocal */);
  if (shareRules.length > 0) {
    await handleShareRules(shareRules);
  }
  if (saveLocalRules.length > 0) {
    await handleSaveLocalRules(saveLocalRules);
  }
  const summary = [];
  if (shareRules.length > 0) {
    summary.push(`${shareRules.length} \u4E2A\u89C4\u5219\u5C06\u5206\u4EAB`);
  }
  if (saveLocalRules.length > 0) {
    summary.push(`${saveLocalRules.length} \u4E2A\u89C4\u5219\u5DF2\u672C\u5730\u4FDD\u5B58`);
  }
  if (summary.length > 0) {
    vscode.window.showInformationMessage(`RuleForge: ${summary.join("\uFF0C")}`);
  }
}
async function handleShareRules(results) {
  console.log("\u5206\u4EAB\u89C4\u5219:", results.map((r) => r.rule.meta.id));
}
async function handleSaveLocalRules(results) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("\u8BF7\u5148\u6253\u5F00\u5DE5\u4F5C\u533A");
    return;
  }
  const rulesDir = path.join(workspaceFolder.uri.fsPath, ".ruleforge", "rules");
  await fs.mkdir(rulesDir, { recursive: true });
  for (const result of results) {
    try {
      const rule = result.rule;
      const fileName = `${rule.meta.id}.yaml`;
      const filePath = path.join(rulesDir, fileName);
      const yamlContent = `# RuleForge \u89C4\u5219
# ID: ${rule.meta.id}
# \u540D\u79F0: ${rule.meta.name}
# \u7F6E\u4FE1\u5EA6: ${(rule.confidence * 100).toFixed(0)}%

# \u89C4\u5219\u5185\u5BB9\u5F85\u5B9E\u73B0
`;
      await fs.writeFile(filePath, yamlContent, "utf-8");
      console.log(`\u4FDD\u5B58\u89C4\u5219: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
      console.error(`\u4FDD\u5B58\u89C4\u5219\u5931\u8D25: ${errorMessage}`);
    }
  }
}
function getConfidenceColor(confidence) {
  if (confidence >= 0.8) {
    return "#28a745";
  } else if (confidence >= 0.6) {
    return "#ffc107";
  } else {
    return "#dc3545";
  }
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// src/extension.ts
var outputChannel;
var engine;
var sessionLogPath;
async function activate(context) {
  outputChannel = vscode2.window.createOutputChannel("RuleForge");
  context.subscriptions.push(outputChannel);
  log("RuleForge \u63D2\u4EF6\u6FC0\u6D3B\u4E2D...");
  try {
    engine = new import_core.RuleForgeEngine();
    const workspaceFolder = vscode2.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      sessionLogPath = path2.join(workspaceFolder.uri.fsPath, ".ruleforge", "logs");
      await fs2.mkdir(sessionLogPath, { recursive: true });
      log(`\u4F1A\u8BDD\u65E5\u5FD7\u8DEF\u5F84: ${sessionLogPath}`);
    } else {
      sessionLogPath = path2.join(process.env.HOME || process.env.USERPROFILE || "", ".ruleforge", "logs");
      await fs2.mkdir(sessionLogPath, { recursive: true });
      log(`\u4F7F\u7528\u5168\u5C40\u65E5\u5FD7\u8DEF\u5F84: ${sessionLogPath}`);
    }
    const extractCommand = vscode2.commands.registerCommand("ruleforge.extract", handleExtractCommand);
    context.subscriptions.push(extractCommand);
    const showRulesCommand = vscode2.commands.registerCommand("ruleforge.showRules", handleShowRulesCommand);
    context.subscriptions.push(showRulesCommand);
    const contributeRuleCommand = vscode2.commands.registerCommand("ruleforge.contributeRule", handleContributeRuleCommand);
    context.subscriptions.push(contributeRuleCommand);
    const onDidSaveDisposable = vscode2.workspace.onDidSaveTextDocument(handleDocumentSave);
    context.subscriptions.push(onDidSaveDisposable);
    const onDidChangeWorkspaceDisposable = vscode2.workspace.onDidChangeWorkspaceFolders(handleWorkspaceChange);
    context.subscriptions.push(onDidChangeWorkspaceDisposable);
    log("RuleForge \u63D2\u4EF6\u6FC0\u6D3B\u5B8C\u6210");
    vscode2.window.showInformationMessage("RuleForge \u5DF2\u6FC0\u6D3B\uFF0C\u81EA\u52A8\u8BB0\u5F55\u5F00\u53D1\u4F1A\u8BDD");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
    log(`\u6FC0\u6D3B\u5931\u8D25: ${errorMessage}`, "error");
    vscode2.window.showErrorMessage(`RuleForge \u6FC0\u6D3B\u5931\u8D25: ${errorMessage}`);
  }
}
function deactivate(context) {
  log("RuleForge \u63D2\u4EF6\u505C\u7528");
  outputChannel.dispose();
}
async function handleExtractCommand() {
  log("\u5F00\u59CB\u6267\u884C\u89C4\u5219\u63D0\u53D6\u547D\u4EE4");
  try {
    await vscode2.window.withProgress({
      location: vscode2.ProgressLocation.Notification,
      title: "RuleForge \u63D0\u53D6\u89C4\u5219\u4E2D...",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: "\u8BFB\u53D6\u4F1A\u8BDD\u65E5\u5FD7..." });
      const logFiles = await getRecentLogFiles();
      if (logFiles.length === 0) {
        vscode2.window.showWarningMessage("\u672A\u627E\u5230\u4F1A\u8BDD\u65E5\u5FD7\u6587\u4EF6");
        return;
      }
      progress.report({ increment: 30, message: `\u5206\u6790 ${logFiles.length} \u4E2A\u65E5\u5FD7\u6587\u4EF6...` });
      const allRules = [];
      for (const logFile of logFiles) {
        try {
          const result = await engine.extractOnly({
            sessionId: path2.basename(logFile),
            logPath: logFile,
            minConfidence: 0.7
          });
          allRules.push(...result.rules);
        } catch (error) {
          log(`\u63D0\u53D6\u89C4\u5219\u5931\u8D25: ${logFile}`, "warn");
        }
      }
      progress.report({ increment: 40, message: `\u53D1\u73B0 ${allRules.length} \u4E2A\u5019\u9009\u89C4\u5219` });
      if (allRules.length === 0) {
        vscode2.window.showInformationMessage("\u672A\u53D1\u73B0\u53EF\u590D\u7528\u7684\u89C4\u5219");
        return;
      }
      progress.report({ increment: 20, message: "\u9A8C\u8BC1\u89C4\u5219..." });
      const validationResults = engine.validateOnly(allRules);
      const validRules = allRules.filter((_, index) => validationResults[index]?.valid);
      progress.report({ increment: 10, message: "\u663E\u793A\u786E\u8BA4\u9762\u677F..." });
      if (validRules.length > 0) {
        await showConfirmationPanel(validRules);
      } else {
        vscode2.window.showInformationMessage("\u6240\u6709\u5019\u9009\u89C4\u5219\u9A8C\u8BC1\u5931\u8D25");
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
    log(`\u89C4\u5219\u63D0\u53D6\u5931\u8D25: ${errorMessage}`, "error");
    vscode2.window.showErrorMessage(`\u89C4\u5219\u63D0\u53D6\u5931\u8D25: ${errorMessage}`);
  }
}
async function handleShowRulesCommand() {
  log("\u663E\u793A\u672C\u5730\u89C4\u5219\u5E93");
  try {
    const workspaceFolder = vscode2.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode2.window.showWarningMessage("\u8BF7\u5148\u6253\u5F00\u5DE5\u4F5C\u533A");
      return;
    }
    const rulesDir = path2.join(workspaceFolder.uri.fsPath, ".ruleforge", "rules");
    const files = await fs2.readdir(rulesDir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    if (yamlFiles.length === 0) {
      vscode2.window.showInformationMessage("\u672C\u5730\u89C4\u5219\u5E93\u4E3A\u7A7A");
      return;
    }
    const selected = await vscode2.window.showQuickPick(yamlFiles, {
      placeHolder: "\u9009\u62E9\u8981\u67E5\u770B\u7684\u89C4\u5219",
      title: "RuleForge \u672C\u5730\u89C4\u5219\u5E93"
    });
    if (selected) {
      const rulePath = path2.join(rulesDir, selected);
      const document2 = await vscode2.workspace.openTextDocument(rulePath);
      await vscode2.window.showTextDocument(document2);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
    log(`\u663E\u793A\u89C4\u5219\u5931\u8D25: ${errorMessage}`, "error");
    vscode2.window.showErrorMessage(`\u663E\u793A\u89C4\u5219\u5931\u8D25: ${errorMessage}`);
  }
}
async function handleContributeRuleCommand() {
  log("\u8D21\u732E\u89C4\u5219\u81F3\u5F00\u6E90\u793E\u533A");
  try {
    const config = vscode2.workspace.getConfiguration("ruleforge");
    const defaultRepo = config.get("defaultRepo", "multiagent/rules");
    const repo = await vscode2.window.showInputBox({
      prompt: "\u8F93\u5165\u76EE\u6807 GitHub \u4ED3\u5E93",
      value: defaultRepo,
      placeHolder: "owner/repo"
    });
    if (!repo) {
      return;
    }
    vscode2.window.showInformationMessage(`\u89C4\u5219\u5C06\u8D21\u732E\u81F3: ${repo}`);
    log(`\u8D21\u732E\u89C4\u5219\u81F3: ${repo}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
    log(`\u8D21\u732E\u89C4\u5219\u5931\u8D25: ${errorMessage}`, "error");
    vscode2.window.showErrorMessage(`\u8D21\u732E\u89C4\u5219\u5931\u8D25: ${errorMessage}`);
  }
}
async function handleDocumentSave(document2) {
  try {
    const config = vscode2.workspace.getConfiguration("ruleforge");
    const autoTrigger = config.get("autoTrigger", true);
    if (!autoTrigger) {
      return;
    }
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      event: "file_save",
      file: document2.uri.fsPath,
      language: document2.languageId,
      lineCount: document2.lineCount
    };
    await appendToSessionLog(logEntry);
  } catch (error) {
    log(`\u8BB0\u5F55\u6587\u4EF6\u4FDD\u5B58\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`, "warn");
  }
}
async function handleWorkspaceChange(event) {
  if (event.added.length > 0) {
    const newWorkspace = event.added[0];
    sessionLogPath = path2.join(newWorkspace.uri.fsPath, ".ruleforge", "logs");
    await fs2.mkdir(sessionLogPath, { recursive: true });
    log(`\u5DE5\u4F5C\u533A\u53D8\u5316\uFF0C\u66F4\u65B0\u65E5\u5FD7\u8DEF\u5F84: ${sessionLogPath}`);
  }
}
async function getRecentLogFiles() {
  try {
    const files = await fs2.readdir(sessionLogPath);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).map((f) => path2.join(sessionLogPath, f));
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
    const recentFiles = [];
    for (const file of jsonlFiles) {
      const stats = await fs2.stat(file);
      if (stats.mtimeMs > sevenDaysAgo) {
        recentFiles.push(file);
      }
    }
    return recentFiles.sort((a, b) => {
      const statA = fs2.stat(a);
      const statB = fs2.stat(b);
      return Promise.all([statA, statB]).then(([a2, b2]) => b2.mtimeMs - a2.mtimeMs);
    });
  } catch (error) {
    log(`\u83B7\u53D6\u65E5\u5FD7\u6587\u4EF6\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`, "warn");
    return [];
  }
}
async function appendToSessionLog(entry) {
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const logFile = path2.join(sessionLogPath, `session-${today}.jsonl`);
    const logLine = JSON.stringify(entry) + "\n";
    await fs2.appendFile(logFile, logLine, "utf-8");
  } catch (error) {
    log(`\u5199\u5165\u4F1A\u8BDD\u65E5\u5FD7\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`, "warn");
  }
}
function log(message, level = "info") {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const prefix = level === "error" ? "\u274C" : level === "warn" ? "\u26A0\uFE0F" : "\u2139\uFE0F";
  const logMessage = `[${timestamp}] ${prefix} ${message}`;
  outputChannel.appendLine(logMessage);
  if (level === "error") {
    console.error(logMessage);
  } else if (level === "warn") {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
