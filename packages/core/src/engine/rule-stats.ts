/**
 * RuleForge 规则使用统计
 *
 * 跟踪规则的实际使用效果：
 * - 匹配次数、建议采纳次数
 * - 采纳率 = 采纳次数 / 匹配次数
 * - 基于采纳率动态调整 confidence
 * - 统计数据持久化到 stats.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── 单条规则统计 ───

export interface RuleStatEntry {
  /** 规则 ID */
  ruleId: string;
  /** 匹配次数 */
  matchCount: number;
  /** 建议采纳次数 */
  adoptCount: number;
  /** 采纳率（0-1） */
  adoptionRate: number;
  /** 首次匹配时间（ISO 8601） */
  firstMatchAt: string;
  /** 最近匹配时间（ISO 8601） */
  lastMatchAt: string;
}

// ─── 统计摘要 ───

export interface StatsSummary {
  /** 总匹配次数 */
  totalMatches: number;
  /** 总采纳次数 */
  totalAdopts: number;
  /** 整体采纳率 */
  overallAdoptionRate: number;
  /** 活跃规则数 */
  activeRuleCount: number;
  /** 按采纳率排序的规则统计 */
  rules: RuleStatEntry[];
}

// ─── RuleStats ───

export class RuleStats {
  private statsPath: string;
  private entries: Map<string, RuleStatEntry> = new Map();
  private loaded = false;

  constructor(statsPath: string) {
    this.statsPath = statsPath;
  }

  /**
   * 加载统计数据
   */
  async load(): Promise<void> {
    try {
      if (fs.existsSync(this.statsPath)) {
        const raw = fs.readFileSync(this.statsPath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const entry of data) {
            this.entries.set(entry.ruleId, entry);
          }
        }
      }
    } catch {
      // 文件不存在或解析失败，从空开始
    }
    this.loaded = true;
  }

  /**
   * 持久化统计数据
   */
  async save(): Promise<void> {
    if (!this.loaded) return;

    try {
      const dir = path.dirname(this.statsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = Array.from(this.entries.values());
      fs.writeFileSync(this.statsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // 保存失败不应影响引擎运行
    }
  }

  /**
   * 记录一次规则匹配
   */
  recordMatch(ruleId: string): void {
    const now = new Date().toISOString();
    const existing = this.entries.get(ruleId);

    if (existing) {
      existing.matchCount++;
      existing.lastMatchAt = now;
      existing.adoptionRate = existing.matchCount > 0
        ? existing.adoptCount / existing.matchCount
        : 0;
    } else {
      this.entries.set(ruleId, {
        ruleId,
        matchCount: 1,
        adoptCount: 0,
        adoptionRate: 0,
        firstMatchAt: now,
        lastMatchAt: now,
      });
    }
  }

  /**
   * 记录一次建议采纳
   */
  recordAdoption(ruleId: string): void {
    const existing = this.entries.get(ruleId);
    if (existing) {
      existing.adoptCount++;
      existing.adoptionRate = existing.matchCount > 0
        ? existing.adoptCount / existing.matchCount
        : 0;
    }
  }

  /**
   * 获取单条规则统计
   */
  getEntry(ruleId: string): RuleStatEntry | undefined {
    return this.entries.get(ruleId);
  }

  /**
   * 获取统计摘要
   */
  getSummary(): StatsSummary {
    const rules = Array.from(this.entries.values())
      .sort((a, b) => b.adoptionRate - a.adoptionRate);

    const totalMatches = rules.reduce((sum, r) => sum + r.matchCount, 0);
    const totalAdopts = rules.reduce((sum, r) => sum + r.adoptCount, 0);

    return {
      totalMatches,
      totalAdopts,
      overallAdoptionRate: totalMatches > 0 ? totalAdopts / totalMatches : 0,
      activeRuleCount: rules.length,
      rules,
    };
  }

  /**
   * 基于采纳率动态调整 confidence
   *
   * 规则：
   * - 采纳率 > 0.8 且匹配次数 >= 5：confidence += 0.05（上限 1.0）
   * - 采纳率 < 0.2 且匹配次数 >= 5：confidence -= 0.05（下限 0.1）
   * - 其他：不变
   */
  adjustConfidence(ruleId: string, currentConfidence: number): number {
    const entry = this.entries.get(ruleId);
    if (!entry || entry.matchCount < 5) return currentConfidence;

    if (entry.adoptionRate > 0.8) {
      return Math.min(1.0, currentConfidence + 0.05);
    } else if (entry.adoptionRate < 0.2) {
      return Math.max(0.1, currentConfidence - 0.05);
    }

    return currentConfidence;
  }

  /**
   * 重置所有统计
   */
  reset(): void {
    this.entries.clear();
  }
}
