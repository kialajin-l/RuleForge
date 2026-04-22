/**
 * 性能报告生成器
 * 用于生成和保存性能测试报告
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 性能报告生成器类
 */
export class PerformanceReporter {
  private reportsDir: string;
  private currentReport: any = {};

  constructor(reportsDir?: string) {
    this.reportsDir = reportsDir || path.join(__dirname, '..', 'reports');
  }

  /**
   * 创建新的性能报告
   */
  createReport(testName: string, metadata: any = {}): void {
    this.currentReport = {
      test: testName,
      timestamp: new Date().toISOString(),
      metadata,
      performance: {},
      assertions: [],
      recommendations: [],
      environment: this.getEnvironmentInfo()
    };
  }

  /**
   * 添加性能指标
   */
  addMetric(name: string, value: any, unit?: string): void {
    if (!this.currentReport.performance) {
      this.currentReport.performance = {};
    }
    
    this.currentReport.performance[name] = {
      value,
      unit: unit || this.inferUnit(value),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 添加断言结果
   */
  addAssertion(description: string, passed: boolean, expected?: any, actual?: any): void {
    this.currentReport.assertions.push({
      description,
      passed,
      expected,
      actual,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 添加性能建议
   */
  addRecommendation(text: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    this.currentReport.recommendations.push({
      text,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 保存性能报告
   */
  async saveReport(reportData?: any, testName?: string): Promise<string> {
    const report = reportData || this.currentReport;
    
    if (!report) {
      throw new Error('没有可保存的性能报告');
    }

    // 确保报告目录存在
    await fs.mkdir(this.reportsDir, { recursive: true });

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const test = testName || report.test || 'performance-test';
    const filename = `${test}-${timestamp}.json`;
    const filePath = path.join(this.reportsDir, filename);

    // 保存报告
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    
    console.log(`✅ 性能报告已保存: ${filePath}`);
    return filePath;
  }

  /**
   * 保存多个测试的汇总报告
   */
  async saveSummaryReport(reports: any[], summaryName: string = 'performance-summary'): Promise<string> {
    const summary = {
      summary: summaryName,
      timestamp: new Date().toISOString(),
      totalTests: reports.length,
      passedTests: reports.filter(r => this.isTestPassed(r)).length,
      failedTests: reports.filter(r => !this.isTestPassed(r)).length,
      tests: reports,
      overallPerformance: this.calculateOverallPerformance(reports),
      environment: this.getEnvironmentInfo(),
      recommendations: this.generateSummaryRecommendations(reports)
    };

    return await this.saveReport(summary, summaryName);
  }

  /**
   * 生成性能比较报告
   */
  async saveComparisonReport(baseline: any, current: any, testName: string): Promise<string> {
    const comparison = {
      test: testName,
      timestamp: new Date().toISOString(),
      baseline: {
        ...baseline,
        timestamp: baseline.timestamp || new Date().toISOString()
      },
      current: {
        ...current,
        timestamp: current.timestamp || new Date().toISOString()
      },
      comparison: this.comparePerformance(baseline, current),
      environment: this.getEnvironmentInfo()
    };

    return await this.saveReport(comparison, `${testName}-comparison`);
  }

  /**
   * 生成可视化报告（控制台表格）
   */
  generateConsoleTable(report: any): void {
    console.log('\n📊 性能报告摘要');
    console.log('='.repeat(60));
    
    if (report.performance) {
      console.log('\n📈 性能指标:');
      const tableData = Object.entries(report.performance).map(([key, metric]: [string, any]) => ({
        指标: key,
        数值: metric.value,
        单位: metric.unit || ''
      }));
      
      console.table(tableData);
    }

    if (report.assertions && report.assertions.length > 0) {
      console.log('\n✅ 断言结果:');
      const assertionTable = report.assertions.map((assertion: any) => ({
        描述: assertion.description,
        结果: assertion.passed ? '✅ 通过' : '❌ 失败',
        期望: assertion.expected || 'N/A',
        实际: assertion.actual || 'N/A'
      }));
      
      console.table(assertionTable);
    }

    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\n💡 性能建议:');
      report.recommendations.forEach((rec: any, index: number) => {
        const priorityIcon = rec.priority === 'high' ? '🚨' : rec.priority === 'medium' ? '⚠️' : 'ℹ️';
        console.log(`${priorityIcon} ${index + 1}. ${rec.text}`);
      });
    }
  }

  /**
   * 获取环境信息
   */
  private getEnvironmentInfo(): any {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 推断数值单位
   */
  private inferUnit(value: any): string {
    if (typeof value === 'number') {
      if (value < 1000) return 'ms';
      if (value < 60000) return 's';
      if (value < 3600000) return 'min';
      return 'hours';
    }
    return '';
  }

  /**
   * 检查测试是否通过
   */
  private isTestPassed(report: any): boolean {
    if (!report.assertions || report.assertions.length === 0) {
      return true; // 没有断言视为通过
    }
    
    return report.assertions.every((assertion: any) => assertion.passed);
  }

  /**
   * 计算整体性能
   */
  private calculateOverallPerformance(reports: any[]): any {
    const performanceMetrics = reports
      .flatMap((report: any) => 
        Object.entries(report.performance || {})
          .filter(([_, metric]: [string, any]) => typeof metric.value === 'number')
          .map(([key, metric]: [string, any]) => ({ key, value: metric.value }))
      );

    const grouped = performanceMetrics.reduce((acc, { key, value }) => {
      if (!acc[key]) acc[key] = [];
      acc[key].push(value);
      return acc;
    }, {} as Record<string, number[]>);

    const overall: any = {};
    
    for (const [key, values] of Object.entries(grouped)) {
      const numValues = values as number[];
      overall[key] = {
        min: Math.min(...numValues),
        max: Math.max(...numValues),
        avg: numValues.reduce((sum, val) => sum + val, 0) / numValues.length,
        count: numValues.length
      };
    }

    return overall;
  }

  /**
   * 生成汇总建议
   */
  private generateSummaryRecommendations(reports: any[]): any[] {
    const allRecommendations = reports.flatMap((report: any) => 
      (report.recommendations || []).map((rec: any) => ({
        ...rec,
        source: report.test || 'unknown'
      }))
    );

    // 按优先级分组
    const byPriority = allRecommendations.reduce((acc, rec) => {
      if (!acc[rec.priority]) acc[rec.priority] = [];
      acc[rec.priority].push(rec);
      return acc;
    }, {} as Record<string, any[]>);

    const recommendations: any[] = [];

    // 高优先级建议
    if (byPriority.high) {
      recommendations.push({
        priority: 'high',
        count: byPriority.high.length,
        examples: byPriority.high.slice(0, 3)
      });
    }

    // 中优先级建议
    if (byPriority.medium) {
      recommendations.push({
        priority: 'medium',
        count: byPriority.medium.length,
        examples: byPriority.medium.slice(0, 3)
      });
    }

    return recommendations;
  }

  /**
   * 比较性能数据
   */
  private comparePerformance(baseline: any, current: any): any {
    const comparison: any = {};
    
    if (baseline.performance && current.performance) {
      for (const [key, baselineMetric] of Object.entries(baseline.performance)) {
        const currentMetric = (current.performance as any)[key];
        
        if (currentMetric && typeof (baselineMetric as any).value === 'number' && 
            typeof (currentMetric as any).value === 'number') {
          
          const baselineValue = (baselineMetric as any).value;
          const currentValue = (currentMetric as any).value;
          const difference = currentValue - baselineValue;
          const percentage = baselineValue !== 0 ? (difference / baselineValue) * 100 : 0;
          
          comparison[key] = {
            baseline: baselineValue,
            current: currentValue,
            difference,
            percentage: Math.round(percentage * 100) / 100,
            improved: difference < 0, // 数值越小越好
            significance: Math.abs(percentage) > 10 ? 'significant' : 'minor'
          };
        }
      }
    }

    return comparison;
  }

  /**
   * 加载历史报告
   */
  async loadReport(filename: string): Promise<any> {
    const filePath = path.join(this.reportsDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 列出所有报告
   */
  async listReports(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.reportsDir);
      return files.filter(file => file.endsWith('.json'));
    } catch {
      return [];
    }
  }

  /**
   * 清理旧报告
   */
  async cleanupOldReports(daysToKeep: number = 30): Promise<void> {
    const files = await this.listReports();
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(this.reportsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtimeMs < cutoffTime) {
        await fs.unlink(filePath);
        console.log(`🗑️  删除旧报告: ${file}`);
      }
    }
  }
}

/**
 * 性能报告工具函数
 */
export const PerformanceReportUtils = {
  /**
   * 格式化性能指标
   */
  formatMetric(value: number, unit: string): string {
    const formatters: Record<string, (v: number) => string> = {
      'ms': (v) => `${v.toFixed(0)}ms`,
      's': (v) => `${(v / 1000).toFixed(2)}s`,
      'MB': (v) => `${v.toFixed(0)}MB`,
      'events/s': (v) => `${v.toLocaleString()} events/s`,
      '%': (v) => `${v.toFixed(1)}%`
    };
    
    const formatter = formatters[unit] || ((v: number) => `${v}${unit}`);
    return formatter(value);
  },

  /**
   * 创建性能快照
   */
  createPerformanceSnapshot(): any {
    return {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpu: process.cpuUsage()
    };
  },

  /**
   * 计算性能差异
   */
  calculatePerformanceDifference(before: any, after: any): any {
    const diff: any = {};
    
    if (before.memory && after.memory) {
      diff.memory = {};
      for (const key in before.memory) {
        diff.memory[key] = after.memory[key] - before.memory[key];
      }
    }
    
    if (before.cpu && after.cpu) {
      diff.cpu = {
        user: after.cpu.user - before.cpu.user,
        system: after.cpu.system - before.cpu.system
      };
    }
    
    diff.uptime = after.uptime - before.uptime;
    diff.timestamp = after.timestamp;
    
    return diff;
  }
};

export default PerformanceReporter;