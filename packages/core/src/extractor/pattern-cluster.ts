/**
 * RuleForge 模式聚类引擎
 * 从会话事件中识别可复用的编码模式
 */

import { SessionEvent } from './log-parser';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  trigger: {
    keywords: string[];
    file_pattern: string;
    language?: string;
  };
  condition: string;
  suggestion: string;
  confidence: number;
  applicableScenes: number;
  examples: {
    before: string;
    after: string;
    context?: string;
  }[];
  metadata: {
    occurrenceCount: number;
    successRate: number;
    applicabilityScore: number;
    fileTypes: string[];
    firstSeen: Date;
    lastSeen: Date;
  };
}

export interface PatternClusterOptions {
  minOccurrences?: number;
  minConfidence?: number;
  minApplicableScenes?: number;
  languageFocus?: string[];
  excludePatterns?: string[];
  enableDebugLog?: boolean;
}

export interface PatternClusterResult {
  patterns: Pattern[];
  statistics: {
    totalEvents: number;
    totalPatterns: number;
    highConfidencePatterns: number;
    averageConfidence: number;
    processingTime: number;
  };
  warnings: string[];
}

export interface CodeChange {
  filePath: string;
  before: string;
  after: string;
  changeType: 'add' | 'modify' | 'delete';
  language: string;
}

export class PatternClusterer {
  private readonly defaultOptions: Required<PatternClusterOptions> = {
    minOccurrences: 2,
    minConfidence: 0.7,
    minApplicableScenes: 2,
    languageFocus: ['typescript', 'javascript', 'vue', 'python'],
    excludePatterns: [],
    enableDebugLog: false
  };

  private readonly keywordPatterns = {
    validation: ['validate', 'validation', 'check', 'verify', 'assert'],
    errorHandling: ['try', 'catch', 'error', 'exception', 'throw'],
    component: ['component', 'props', 'emit', 'template', 'render'],
    function: ['function', 'method', 'fn', 'callback', 'handler'],
    type: ['type', 'interface', 'typedef', 'generic', 'typeof'],
    test: ['test', 'spec', 'it', 'describe', 'expect']
  };

  /**
   * 从会话事件中聚类识别模式
   */
  async cluster(events: SessionEvent[], options: PatternClusterOptions = {}): Promise<PatternClusterResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];

    try {
      console.log('🔍 开始模式聚类分析...');
      
      if (events.length === 0) {
        warnings.push('事件列表为空，无法进行模式识别');
        return this.createEmptyResult(startTime);
      }

      // 1. 预处理事件数据
      const processedEvents = this.preprocessEvents(events, mergedOptions);
      
      // 2. 识别高频错误修复模式
      const errorFixPatterns = this.identifyErrorFixPatterns(processedEvents, mergedOptions);
      
      // 3. 识别重复代码结构模式
      const codeStructurePatterns = this.identifyCodeStructurePatterns(processedEvents, mergedOptions);
      
      // 4. 识别最佳实践应用模式
      const bestPracticePatterns = this.identifyBestPracticePatterns(processedEvents, mergedOptions);
      
      // 5. 合并和过滤模式
      const allPatterns = [...errorFixPatterns, ...codeStructurePatterns, ...bestPracticePatterns];
      const filteredPatterns = this.filterPatterns(allPatterns, mergedOptions);
      
      // 6. 生成统计信息
      const statistics = this.generateStatistics(filteredPatterns, events.length, Date.now() - startTime);
      
      console.log(`✅ 模式聚类完成: 发现 ${filteredPatterns.length} 个模式`);
      
      // 7. 输出模式摘要
      this.logPatternSummary(filteredPatterns, mergedOptions);
      
      return {
        patterns: filteredPatterns,
        statistics,
        warnings
      };

    } catch (error) {
      console.error('❌ 模式聚类失败:', error);
      throw new Error(`模式聚类失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 预处理事件数据
   */
  private preprocessEvents(events: SessionEvent[], options: Required<PatternClusterOptions>): SessionEvent[] {
    return events
      .filter(event => {
        // 过滤语言焦点：如果事件有语言信息，检查是否在焦点范围内
        if (options.languageFocus.length > 0) {
          const eventLang = event.payload?.language;
          // 如果没有语言信息，保留事件（可能是其他类型的事件）
          if (!eventLang) return true;
          return options.languageFocus.some(lang => 
            eventLang.toLowerCase().includes(lang)
          );
        }
        return true;
      })
      .filter(event => {
        // 过滤排除模式
        if (options.excludePatterns.length > 0 && event.type) {
          return !options.excludePatterns.some(pattern => 
            event.type.includes(pattern)
          );
        }
        return true;
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * 识别高频错误修复模式
   */
  private identifyErrorFixPatterns(events: SessionEvent[], options: Required<PatternClusterOptions>): Pattern[] {
    const patterns: Pattern[] = [];
    
    // 1. 识别错误发生和修复的序列
    const errorFixSequences = this.findErrorFixSequences(events);
    
    // 2. 按文件类型和错误类型分组
    const groupedSequences = this.groupErrorFixSequences(errorFixSequences);
    
    // 3. 为每个分组创建模式
    for (const [groupKey, sequences] of Object.entries(groupedSequences)) {
      if (sequences.length >= options.minOccurrences) {
        const pattern = this.createErrorFixPattern(sequences, groupKey);
        if (pattern && pattern.confidence >= options.minConfidence) {
          patterns.push(pattern);
        }
      }
    }
    
    if (options.enableDebugLog) {
      console.log(`   🔧 错误修复模式: ${patterns.length} 个`);
    }
    
    return patterns;
  }

  /**
   * 识别重复代码结构模式
   */
  private identifyCodeStructurePatterns(events: SessionEvent[], options: Required<PatternClusterOptions>): Pattern[] {
    const patterns: Pattern[] = [];
    
    // 1. 提取文件创建和修改事件
    const fileEvents = events.filter(event => 
      event.type === 'file_opened' || event.type === 'file_saved'
    );
    
    // 2. 按文件类型和内容特征分组
    const fileGroups = this.groupFilesByStructure(fileEvents);
    
    // 3. 识别重复结构
    for (const [structureType, fileGroup] of Object.entries(fileGroups)) {
      if (fileGroup.files.length >= options.minOccurrences) {
        const pattern = this.createCodeStructurePattern(fileGroup, structureType);
        if (pattern && pattern.confidence >= options.minConfidence) {
          patterns.push(pattern);
        }
      }
    }
    
    if (options.enableDebugLog) {
      console.log(`   🏗️ 代码结构模式: ${patterns.length} 个`);
    }
    
    return patterns;
  }

  /**
   * 识别最佳实践应用模式
   */
  private identifyBestPracticePatterns(events: SessionEvent[], options: Required<PatternClusterOptions>): Pattern[] {
    const patterns: Pattern[] = [];
    
    // 1. 识别测试相关的实践
    const testPatterns = this.identifyTestBestPractices(events);
    
    // 2. 识别错误处理实践
    const errorHandlingPatterns = this.identifyErrorHandlingPractices(events);
    
    // 3. 识别代码组织实践
    const organizationPatterns = this.identifyCodeOrganizationPractices(events);
    
    const allPatterns = [...testPatterns, ...errorHandlingPatterns, ...organizationPatterns];
    
    // 过滤低置信度模式
    return allPatterns.filter(pattern => pattern.confidence >= options.minConfidence);
  }

  /**
   * 查找错误修复序列
   */
  private findErrorFixSequences(events: SessionEvent[]): Array<{
    errorEvent: SessionEvent;
    fixEvents: SessionEvent[];
    testEvent?: SessionEvent;
  }> {
    const sequences: Array<{
      errorEvent: SessionEvent;
      fixEvents: SessionEvent[];
      testEvent?: SessionEvent;
    }> = [];
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.type === 'error_occurred') {
        // 查找后续的修复事件
        const fixEvents: SessionEvent[] = [];
        let testEvent: SessionEvent | undefined;
        
        for (let j = i + 1; j < events.length; j++) {
          const subsequentEvent = events[j];
          
          // 检查时间窗口（30分钟内）
          const timeDiff = subsequentEvent.timestamp.getTime() - event.timestamp.getTime();
          if (timeDiff > 30 * 60 * 1000) break;
          
          // 检查是否是对同一文件的修复
          if (subsequentEvent.type === 'file_saved' && 
              subsequentEvent.payload?.filePath === event.payload?.file) {
            fixEvents.push(subsequentEvent);
          }
          
          // 检查测试事件
          if (subsequentEvent.type === 'test_run' && 
              subsequentEvent.payload?.passed === true) {
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
  private groupErrorFixSequences(sequences: ReturnType<typeof this.findErrorFixSequences>) {
    const groups: Record<string, typeof sequences> = {};
    
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
  private createErrorFixPattern(sequences: any[], groupKey: string): Pattern | null {
    const [fileType, errorType] = groupKey.split(':');
    const occurrenceCount = sequences.length;
    
    // 计算成功率
    const successCount = sequences.filter(s => s.testEvent).length;
    const successRate = successCount / occurrenceCount;
    
    // 计算适用性分数
    const applicabilityScore = this.calculateApplicabilityScore(sequences);
    
    // 计算置信度
    const confidence = this.calculateConfidence(occurrenceCount, successRate, applicabilityScore);
    
    // 提取关键词
    const keywords = this.extractKeywordsFromSequences(sequences);
    
    // 生成模式描述
    const description = this.generateErrorFixDescription(fileType, errorType, sequences.length);
    
    // 生成示例
    const examples = this.generateErrorFixExamples(sequences);
    
    return {
      id: this.generatePatternId('error-fix', fileType, errorType),
      name: `${this.capitalize(fileType)} ${errorType} 错误修复`,
      description,
      trigger: {
        keywords,
        file_pattern: `**/*.${fileType}`,
        language: fileType
      },
      condition: `当检测到 ${errorType} 错误时，检查代码是否符合最佳实践`,
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
  private groupFilesByStructure(events: SessionEvent[]) {
    const groups: Record<string, { files: string[]; contentSamples: string[] }> = {};
    
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
  private analyzeCodeStructure(content: string): string {
    const lines = content.split('\n');
    
    // 简单的结构分析
    if (content.includes('class ')) return 'class';
    if (content.includes('function ')) return 'function';
    if (content.includes('interface ')) return 'interface';
    if (content.includes('export default')) return 'vue-component';
    if (content.includes('describe(')) return 'test-suite';
    if (content.includes('import ')) return 'module';
    
    return 'unknown';
  }

  /**
   * 创建代码结构模式
   */
  private createCodeStructurePattern(fileGroup: any, structureType: string): Pattern | null {
    const [fileType, structure] = structureType.split(':');
    const occurrenceCount = fileGroup.files.length;
    
    // 简单的置信度计算
    const confidence = Math.min(occurrenceCount / 3, 0.95);
    const applicabilityScore = 2; // 中等适用性
    
    const keywords = this.extractStructureKeywords(structure, fileGroup.contentSamples);
    
    return {
      id: this.generatePatternId('structure', fileType, structure),
      name: `${this.capitalize(fileType)} ${structure} 模式`,
      description: `识别 ${fileType} 文件中的 ${structure} 结构最佳实践`,
      trigger: {
        keywords,
        file_pattern: `**/*.${fileType}`,
        language: fileType
      },
      condition: `当创建或修改 ${fileType} 文件时，检查 ${structure} 结构是否符合规范`,
      suggestion: this.generateStructureSuggestion(fileType, structure, fileGroup.contentSamples[0]),
      confidence,
      applicableScenes: occurrenceCount,
      examples: this.generateStructureExamples(fileGroup.contentSamples, structure),
      metadata: {
        occurrenceCount,
        successRate: 1.0, // 结构模式通常都是成功的
        applicabilityScore,
        fileTypes: [fileType],
        firstSeen: new Date(),
        lastSeen: new Date()
      }
    };
  }

  /**
   * 识别测试最佳实践
   */
  private identifyTestBestPractices(events: SessionEvent[]): Pattern[] {
    const patterns: Pattern[] = [];
    const testEvents = events.filter(event => event.type === 'test_run');
    
    if (testEvents.length >= 2) {
      patterns.push(this.createTestPattern(testEvents));
    }
    
    return patterns;
  }

  /**
   * 创建测试模式
   */
  private createTestPattern(testEvents: SessionEvent[]): Pattern {
    const passedTests = testEvents.filter(event => event.payload?.passed).length;
    const successRate = passedTests / testEvents.length;
    
    return {
      id: this.generatePatternId('test', 'best-practice'),
      name: '测试最佳实践',
      description: '自动化测试编写和执行的最佳实践',
      trigger: {
        keywords: ['test', 'spec', 'it', 'describe', 'expect'],
        file_pattern: '**/*.{test,spec}.{js,ts,tsx,vue}',
        language: 'typescript'
      },
      condition: '当编写或运行测试时，检查测试结构和断言是否符合最佳实践',
      suggestion: '使用清晰的测试描述，包含边界情况测试，确保测试独立性和可重复性',
      confidence: Math.min(successRate * 0.8, 0.9),
      applicableScenes: testEvents.length,
      examples: [{
        before: '// 缺少描述的测试',
        after: 'it("should handle user input correctly", () => { ... })',
        context: '测试文件'
      }],
      metadata: {
        occurrenceCount: testEvents.length,
        successRate,
        applicabilityScore: 3, // 高适用性
        fileTypes: ['ts', 'js', 'vue'],
        firstSeen: testEvents[0].timestamp,
        lastSeen: testEvents[testEvents.length - 1].timestamp
      }
    };
  }

  /**
   * 识别错误处理实践
   */
  private identifyErrorHandlingPractices(events: SessionEvent[]): Pattern[] {
    // 实现错误处理模式识别
    return [];
  }

  /**
   * 识别代码组织实践
   */
  private identifyCodeOrganizationPractices(events: SessionEvent[]): Pattern[] {
    // 实现代码组织模式识别
    return [];
  }

  /**
   * 过滤模式
   */
  private filterPatterns(patterns: Pattern[], options: Required<PatternClusterOptions>): Pattern[] {
    return patterns.filter(pattern => {
      return pattern.confidence >= options.minConfidence &&
             pattern.applicableScenes >= options.minApplicableScenes;
    });
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(occurrenceCount: number, successRate: number, applicabilityScore: number): number {
    const occurrenceWeight = Math.min(occurrenceCount / 3, 1.0);
    const successWeight = successRate;
    const applicabilityWeight = applicabilityScore / 3;
    
    return occurrenceWeight * successWeight * applicabilityWeight;
  }

  /**
   * 计算适用性分数
   */
  private calculateApplicabilityScore(sequences: any[]): number {
    // 简单的适用性评估
    const uniqueFiles = new Set(sequences.map(s => s.errorEvent.payload?.file));
    const uniqueFileTypes = new Set(sequences.map(s => 
      this.getFileType(s.errorEvent.payload?.file)
    ));
    
    if (uniqueFileTypes.size >= 2) return 3; // 高适用性
    if (uniqueFiles.size >= 3) return 2;     // 中等适用性
    return 1;                                // 低适用性
  }

  /**
   * 生成模式ID
   */
  private generatePatternId(category: string, ...parts: string[]): string {
    return `${category}-${parts.join('-').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  /**
   * 获取文件类型
   */
  private getFileType(filePath?: string): string {
    if (!filePath) return 'unknown';
    const match = filePath.match(/\.(\w+)$/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 分类错误类型
   */
  private classifyError(errorMessage?: string): string {
    if (!errorMessage) return 'unknown';
    
    if (errorMessage.includes('TypeError')) return 'type-error';
    if (errorMessage.includes('ReferenceError')) return 'reference-error';
    if (errorMessage.includes('SyntaxError')) return 'syntax-error';
    if (errorMessage.includes('Validation')) return 'validation-error';
    if (errorMessage.includes('not found')) return 'not-found-error';
    
    return 'general-error';
  }

  /**
   * 提取关键词
   */
  private extractKeywordsFromSequences(sequences: any[]): string[] {
    const keywords = new Set<string>();
    
    for (const sequence of sequences) {
      const error = sequence.errorEvent.payload;
      if (error?.message) {
        // 从错误消息中提取关键词
        const words = error.message.toLowerCase().split(/\s+/);
        words.forEach((word: string) => {
          if (word.length > 3 && !this.isCommonWord(word)) {
            keywords.add(word);
          }
        });
      }
    }
    
    return Array.from(keywords).slice(0, 5); // 限制关键词数量
  }

  /**
   * 判断是否为常见词
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'been'];
    return commonWords.includes(word);
  }

  /**
   * 生成错误修复描述
   */
  private generateErrorFixDescription(fileType: string, errorType: string, count: number): string {
    return `在 ${count} 个 ${fileType} 文件中识别到 ${errorType} 错误的修复模式。该模式提供了有效的解决方案和最佳实践建议。`;
  }

  /**
   * 生成错误修复建议
   */
  private generateErrorFixSuggestion(fileType: string, errorType: string, sequence: any): string {
    return `针对 ${fileType} 文件中的 ${errorType} 错误，建议采用以下修复策略：\n\n1. 检查相关类型定义\n2. 验证输入参数\n3. 添加适当的错误处理\n4. 编写对应的单元测试`;
  }

  /**
   * 生成错误修复示例
   */
  private generateErrorFixExamples(sequences: any[]): Pattern['examples'] {
    if (sequences.length === 0) return [];
    
    const firstSequence = sequences[0];
    return [{
      before: firstSequence.errorEvent.payload?.message || '错误发生时的代码状态',
      after: '修复后的代码状态',
      context: firstSequence.errorEvent.payload?.file || '相关文件'
    }];
  }

  /**
   * 提取结构关键词
   */
  private extractStructureKeywords(structure: string, contentSamples: string[]): string[] {
    const baseKeywords = [structure];
    
    // 根据结构类型添加特定关键词
    if (structure === 'class') {
      baseKeywords.push('constructor', 'method', 'property');
    } else if (structure === 'function') {
      baseKeywords.push('parameter', 'return', 'arrow');
    } else if (structure === 'vue-component') {
      baseKeywords.push('template', 'script', 'style', 'props');
    }
    
    return baseKeywords;
  }

  /**
   * 生成结构建议
   */
  private generateStructureSuggestion(fileType: string, structure: string, sample: string): string {
    return `在 ${fileType} 文件中创建 ${structure} 结构时，遵循一致的命名约定和组织原则，确保代码的可读性和可维护性。`;
  }

  /**
   * 生成结构示例
   */
  private generateStructureExamples(contentSamples: string[], structure: string): Pattern['examples'] {
    if (contentSamples.length === 0) return [];
    
    return [{
      before: `// 不良的 ${structure} 结构示例`,
      after: `// 良好的 ${structure} 结构示例`,
      context: '代码组织'
    }];
  }

  /**
   * 首字母大写
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(patterns: Pattern[], totalEvents: number, processingTime: number) {
    const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.8).length;
    const averageConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;
    
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
  private logPatternSummary(patterns: Pattern[], options: Required<PatternClusterOptions>) {
    console.log(`📊 模式识别摘要:`);
    console.log(`   总模式数: ${patterns.length}`);
    
    patterns.forEach(pattern => {
      const confidenceLevel = pattern.confidence >= 0.8 ? '✅ 高' : 
                            pattern.confidence >= 0.6 ? '⚠️ 中' : '❌ 低';
      
      console.log(`   ${pattern.name} (${confidenceLevel}置信度: ${Math.round(pattern.confidence * 100)}%)`);
      
      if (pattern.confidence < options.minConfidence) {
        console.log(`      低置信度，建议人工审核`);
      }
    });
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(startTime: number): PatternClusterResult {
    return {
      patterns: [],
      statistics: {
        totalEvents: 0,
        totalPatterns: 0,
        highConfidencePatterns: 0,
        averageConfidence: 0,
        processingTime: Date.now() - startTime
      },
      warnings: ['无事件数据可供分析']
    };
  }
}

// 导出便捷函数
export const clusterPatterns = async (events: SessionEvent[], options?: PatternClusterOptions) => {
  const clusterer = new PatternClusterer();
  return clusterer.cluster(events, options);
};

// 默认导出
export default PatternClusterer;