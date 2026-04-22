好的！我帮你生成完整的整合版 PRD 文档。以下是修改后的完整版本：

---

# 📘 RuleForge PRD 1.0 - 规则提取与贡献引擎

> **文档版本**：1.0  
> **最后更新**：2026-01-22  
> **开发环境**：Trae (VSCode兼容) + TypeScript + Node.js  
> **核心目标**：7天内跑通MVP（独立版），完成后3-5天集成至NightShift

---

## 🎯 一、产品概述

### 1.1 核心定位
```
✅ 一句话定义：
"RuleForge：从开发会话中自动提炼可复用编码规则，为 NightShift 编辑器提供智能规则引擎。"

✅ 开发策略：
• 阶段1（现在）：独立开发 RuleForge 核心引擎，验证 REP 协议标准
• 阶段2（完成后）：作为 NightShift 内置模块集成，提供规则提取/验证/注入能力

✅ 核心价值：
• 对 NightShift：让 AI Agent 遵循最佳实践，代码风格一致
• 对开发者：自动沉淀个人/团队规范，越用越懂你
• 对社区：开源 REP 标准，推动编码规范可执行化
```

### 1.2 MVP范围（7天独立开发 + 3-5天集成）
| 模块 | MVP包含 | 暂缓 |
|------|--------|------|
| 规则提取引擎 | 会话日志解析 + 候选规则生成 + YAML输出 | 多语言语义分析 |
| REP协议校验 | YAML Schema校验 + 基础语义检查 | 向量去重/冲突检测 |
| 本地规则库 | 规则缓存 + 版本回滚 + 冲突预览 | 规则效果追踪 |
| NightShift适配层 | 任务完成事件监听 + 规则自动注入 | 社区贡献/PR自动创建 |

📌 **说明**：
- GitHub集成、Trae/VSCode独立插件功能移至 V1.0（先验证核心）
- 优先保证能在 NightShift 中作为模块运行

---

## 🏗️ 二、技术架构

### 2.1 核心数据流

#### 阶段1：独立开发（现在）
```
[开发会话] → [规则提取引擎] → [候选规则] → [用户确认] → [本地保存]
     ↑              ↑              ↑            ↑
  事件监听      日志解析+模式识别   YAML生成    本地.yaml文件
  (插件层)      (核心引擎)        (核心引擎)
```

#### 阶段2：NightShift集成（完成后）
```
[NightShift任务完成] → [RuleForge提取] → [规则验证] → [注入Agent上下文]
         ↑                   ↑              ↑            ↑
    Agent提交结果      读取内存数据    REP校验     下次任务自动遵循
         ↓                   ↓              ↓            ↓
    侧边栏显示✅        提示用户确认    生成YAML    AI按规则生成代码
```

### 2.2 模块拆分

#### 阶段1：独立开发（现在）
```
@ruleforge/core          # 核心引擎（独立验证）
├── extractor/           # 会话日志解析 + 候选规则生成
├── validator/           # REP协议校验 + YAML Schema
├── formatter/           # YAML输出 + 脱敏处理
└── types/               # TypeScript类型定义 + REP协议

@ruleforge/cli           # 命令行工具（测试用）
└── commands/            # extract/validate 等命令
```

#### 阶段2：NightShift集成（完成后）
```
nightshift/
├── packages/
│   ├── ruleforge/       # symlink 到 @ruleforge/core
│   │   └── (复用独立版核心)
│   │
│   └── editor/
│       └── ruleforge-adapter/  # 新增适配层（2-3天）
│           ├── event-listener.ts    # 监听 task.completed
│           ├── context-injector.ts  # 注入规则到Agent
│           └── task-panel-ui.tsx    # 任务计划面板（含规则提示）
```

### 2.3 REP协议 v0.1 (Rule Execution Protocol)

```yaml
# 规则文件格式标准（工具无关）
meta:
  id: string              # 唯一标识，如 "vue-props-validation"
  name: string            # 人类可读名称
  version: semver         # 语义版本
  description: string     # 规则说明
  authors: string[]       # 贡献者列表
  license: string         # MIT/Apache-2.0

rule:
  trigger:
    keywords: string[]    # 触发关键词
    file_pattern: string  # glob匹配，如 "**/*.vue"
    language: string      # 编程语言
  condition: string       # 自然语言描述的检查逻辑
  suggestion: string      # 修复建议（含代码示例）

compatibility:
  frameworks: object      # 框架版本约束，如 {vue: ">=3.4"}
  languages: object       # 语言版本约束
  rep_version: string     # 协议版本，如 "^1.0"
```

### 2.4 任务计划面板（Task Plan UI）【新增】

#### 侧边栏结构
```
┌─────────────────────────────┐
│ 📋 开发计划                  │
├─────────────────────────────┤
│ ☐ 1. 后端：User API         │
│   ├─ 设计Schema             │
│   ├─ 实现CRUD               │
│   └─ 添加JWT认证            │
│   状态: 🔄 Agent-2 执行中    │
│   规则: ✅ 已应用 3 条       │
│                             │
│ ☐ 2. 前端：登录组件         │
│   ├─ 表单UI                 │
│   ├─ 验证逻辑               │
│   └─ 调用API                │
│   状态: ⏳ 等待中            │
│   规则: ✅ 已应用 2 条       │
│                             │
│ ──────────────────────────  │
│ 进度：0/2 任务完成           │
│ 预计时间：45分钟             │
└─────────────────────────────┘
```

#### 自动勾选逻辑
1. Agent 完成任务 → 提交代码 + 测试报告
2. RuleForge 验证：
   - 代码是否符合规则？（AST校验）
   - 测试是否通过？
3. 验证通过 → 自动勾选 ✅ + 生成 Git Commit Msg
4. 验证失败 → 标记 ❌ + 提示修复建议

#### 与 RuleForge 联动
- 面板底部常驻显示："已应用 X 条规则"
- 点击展开：查看具体规则摘要（name + condition）
- 任务完成后：提示"发现可复用模式" → 一键保存为规则

---

## 📁 三、项目结构（PowerShell脚本生成）

```powershell
# new-ruleforge.ps1 - 一键生成RuleForge项目结构
# 用法：.\new-ruleforge.ps1 -ProjectName "my-ruleforge"

param(
    [string]$ProjectName = "ruleforge",
    [string]$Author = "your-name",
    [string]$Email = "your@email.com"
)

Write-Host "🔨 Creating RuleForge project: $ProjectName" -ForegroundColor Cyan

# 创建根目录
New-Item -ItemType Directory -Path $ProjectName -Force | Out-Null
Set-Location $ProjectName

# 创建核心包 @ruleforge/core
New-Item -ItemType Directory -Path "packages/core/src/{extractor,validator,formatter,github,types}" -Force | Out-Null
New-Item -ItemType Directory -Path "packages/core/__tests__" -Force | Out-Null

# 创建Trae/VSCode插件（共用，因API兼容）
New-Item -ItemType Directory -Path "packages/adapter-trae/src/{ui,bridge,config}" -Force | Out-Null
New-Item -ItemType Directory -Path "packages/adapter-trae/images" -Force | Out-Null

# 创建CLI工具
New-Item -ItemType Directory -Path "packages/cli/src/commands" -Force | Out-Null

# 创建共享配置
New-Item -ItemType Directory -Path "config/{schemas,templates}" -Force | Out-Null

# 生成 package.json (core)
@'
{
  "name": "@ruleforge/core",
  "version": "0.1.0",
  "description": "RuleForge core engine: extract rules from dev sessions",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "yaml": "^2.4.0",
    "zod": "^3.22.4",
    "axios": "^1.6.8",
    "glob": "^10.3.10",
    "ignore": "^5.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2",
    "eslint": "^8.56.0"
  }
}
'@ | Out-File "packages/core/package.json" -Encoding UTF8

# 生成 package.json (adapter-trae)
@'
{
  "name": "@ruleforge/adapter-trae",
  "version": "0.1.0",
  "displayName": "RuleForge for Trae",
  "description": "Extract and share coding rules from your Trae sessions",
  "publisher": "ruleforge",
  "engines": {
    "vscode": "^1.85.0",
    "trae": "^1.0.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onLanguage", "onCommand:ruleforge.extract"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "ruleforge.extract",
        "title": "RuleForge: Extract Rules from Session"
      }
    ],
    "configuration": {
      "title": "RuleForge",
      "properties": {
        "ruleforge.autoTrigger": {
          "type": "boolean",
          "default": true,
          "description": "Automatically suggest rule extraction on session end"
        },
        "ruleforge.defaultRepo": {
          "type": "string",
          "default": "multiagent/rules",
          "description": "Default GitHub repo for rule contributions"
        }
      }
    }
  },
  "scripts": {
    "build": "esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node",
    "watch": "npm run build -- --watch",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "esbuild": "^0.20.0",
    "@ruleforge/core": "file:../core"
  }
}
'@ | Out-File "packages/adapter-trae/package.json" -Encoding UTF8

# 生成根 package.json (monorepo)
@'
{
  "name": "ruleforge-monorepo",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "package:cli": "cd packages/cli && npm run package",
    "package:plugin": "cd packages/adapter-trae && npm run package"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "concurrently": "^8.2.2"
  }
}
'@ | Out-File "package.json" -Encoding UTF8

# 生成 tsconfig.json
@'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
'@ | Out-File "packages/core/tsconfig.json" -Encoding UTF8

# 生成 .trae/ 配置 (插件嵌入用)
New-Item -ItemType Directory -Path ".trae" -Force | Out-Null
@'
# RuleForge 规则注入配置
# 此文件由插件自动管理，手动修改可能被覆盖

rules:
  sources:
    - name: "official"
      url: "https://github.com/multiagent/rules"
      priority: 1
    - name: "local"
      path: "./.ruleforge/local"
      priority: 0  # 本地规则优先

contribution:
  enabled: true
  auto_trigger: true
  default_repo: "multiagent/rules"
'@ | Out-File ".trae/ruleforge.yaml" -Encoding UTF8

# 生成初始规则模板
@'
meta:
  id: "your-rule-id"
  name: "Your Rule Name"
  version: "0.1.0"
  description: "Describe what this rule enforces"
  authors: ["{{AUTHOR}} <{{EMAIL}}>"]
  license: "MIT"

rule:
  trigger:
    keywords: ["keyword1", "keyword2"]
    file_pattern: "**/*.{ts,js,vue}"
    language: "typescript"
  condition: |
    When detecting [pattern], check that:
    1. [condition 1]
    2. [condition 2]
  suggestion: |
    Recommended approach:
    ```ts
    // example code
    ```

compatibility:
  frameworks:
    vue: ">=3.4"
  languages:
    typescript: ">=5.0"
  rep_version: "^1.0"
'@ | Out-File "config/templates/rule.example.yaml" -Encoding UTF8

# 生成 REP Schema (Zod)
@'
import { z } from 'zod';

export const RuleMetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(3),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10),
  authors: z.array(z.string()),
  license: z.enum(['MIT', 'Apache-2.0', 'BSD-3-Clause'])
});

export const RuleTriggerSchema = z.object({
  keywords: z.array(z.string()),
  file_pattern: z.string(),
  language: z.string()
});

export const RuleContentSchema = z.object({
  trigger: RuleTriggerSchema,
  condition: z.string().min(20),
  suggestion: z.string().min(30)
});

export const CompatibilitySchema = z.object({
  frameworks: z.record(z.string()).optional(),
  languages: z.record(z.string()).optional(),
  rep_version: z.string().regex(/^\^?\d+\.\d+/)
});

export const RuleSchema = z.object({
  meta: RuleMetaSchema,
  rule: RuleContentSchema,
  compatibility: CompatibilitySchema
});

export type RuleYAML = z.infer<typeof RuleSchema>;
'@ | Out-File "packages/core/src/types/rule-schema.ts" -Encoding UTF8

# 生成基础提取器骨架
@'
import { RuleYAML } from '../types/rule-schema';
import { parseSessionLog } from './log-parser';

export interface ExtractOptions {
  sessionId: string;
  logPath: string;
  minConfidence?: number;  // default: 0.7
  applicableScenes?: number; // default: 2
}

export class RuleExtractor {
  async extract(options: ExtractOptions): Promise<RuleYAML[]> {
    // 1. 解析会话日志
    const events = await parseSessionLog(options.logPath);
    
    // 2. 识别高频模式（简化版：关键词+文件变更聚类）
    const patterns = this._clusterPatterns(events);
    
    // 3. 生成候选规则（仅高置信度）
    const candidates = patterns
      .filter(p => p.confidence >= (options.minConfidence ?? 0.7))
      .filter(p => p.applicableScenes >= (options.applicableScenes ?? 2))
      .map(p => this._toRuleYAML(p));
    
    return candidates;
  }
  
  private _clusterPatterns(events: any[]): Pattern[] {
    // MVP: 简单关键词匹配 + 文件类型分组
    // V1.0: 引入轻量向量模型做语义聚类
    return [];
  }
  
  private _toRuleYAML(pattern: Pattern): RuleYAML {
    return {
      meta: {
        id: pattern.id,
        name: pattern.name,
        version: "0.1.0",
        description: pattern.description,
        authors: [],
        license: "MIT"
      },
      rule: {
        trigger: pattern.trigger,
        condition: pattern.condition,
        suggestion: pattern.suggestion
      },
      compatibility: pattern.compatibility
    };
  }
}
'@ | Out-File "packages/core/src/extractor/rule-extractor.ts" -Encoding UTF8

# 生成插件入口 (VSCode/Trae兼容)
@'
import * as vscode from 'vscode';
import { RuleExtractor } from '@ruleforge/core';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ RuleForge activated');
  
  const extractor = new RuleExtractor();
  
  // 命令：手动触发规则提取
  const extractCmd = vscode.commands.registerCommand(
    'ruleforge.extract',
    async () => {
      const session = await getCurrentSession();
      if (!session) return;
      
      const candidates = await extractor.extract({
        sessionId: session.id,
        logPath: session.logPath
      });
      
      if (candidates.length > 0) {
        showConfirmationPanel(candidates);
      }
    }
  );
  
  // 事件监听：会话结束时自动提示（可配置）
  const config = vscode.workspace.getConfiguration('ruleforge');
  if (config.get('autoTrigger')) {
    const disposable = vscode.workspace.onDidSaveTextDocument((doc) => {
      // 防抖 + 会话结束检测逻辑
      debouncedCheckSessionEnd(doc, extractor);
    });
    context.subscriptions.push(disposable);
  }
  
  context.subscriptions.push(extractCmd);
}

export function deactivate() {}

// 辅助函数（简化版，实际需完善）
async function getCurrentSession() { /* ... */ }
function showConfirmationPanel(candidates: any[]) { /* ... */ }
function debouncedCheckSessionEnd(doc: any, extractor: any) { /* ... */ }
'@ | Out-File "packages/adapter-trae/src/extension.ts" -Encoding UTF8

# 生成 README
@'
# RuleForge

> Extract reusable coding rules from your development sessions. Share them with the world.

## Quick Start

### As CLI Tool
```bash
npm install -g @ruleforge/cli
ruleforge init          # Initialize project config
ruleforge extract       # Scan recent sessions for rule candidates
ruleforge submit -p rule.yaml  # Submit to GitHub repo
```

### As Trae/VSCode Plugin
1. Install from marketplace: `@ruleforge/adapter-trae`
2. Open a project, code as usual
3. When session ends, get a non-blocking prompt: "🎯 Found 2 reusable patterns"
4. Click "Share" → auto-create GitHub PR

## Project Structure
```
packages/
├── core/          # Rule extraction engine (language-agnostic)
├── adapter-trae/  # VSCode/Trae plugin (shared codebase)
└── cli/           # Command-line interface
```

## Development
```bash
npm install
npm run dev          # Build + watch all packages
npm run test         # Run tests
npm run package:plugin  # Build plugin for distribution
```

## License
MIT
'@ | Out-File "README.md" -Encoding UTF8

Write-Host "✅ RuleForge project created: $ProjectName" -ForegroundColor Green
Write-Host "📁 Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd $ProjectName && npm install"
Write-Host "  2. npm run dev  # Start development mode"
Write-Host "  3. Open in Trae/VSCode and start coding!"
```

---

## 3.3 RuleForge 与 NightShift 集成架构【新增】

### 集成策略
```
方案：npm link / symlink（保持独立仓库，运行时链接）

优势：
✅ RuleForge 可独立发布版本
✅ NightShift 升级 RuleForge 无需修改核心代码
✅ 两个项目可分别测试
```

### 适配层接口定义
```typescript
// packages/editor/src/ruleforge-adapter.ts
export interface NightShiftRuleForgeAdapter {
  // 1. 初始化
  initialize(config: {
    rulesDir: string;
    minConfidence: number;
  }): Promise<void>;
  
  // 2. 监听任务完成
  onTaskCompleted(handler: (task: Task, session: Session) => Promise<void>): void;
  
  // 3. 规则注入
  injectRules(agentId: string, task: Task): Promise<Rule[]>;
  
  // 4. UI 渲染
  renderTaskPanel(taskId: string): React.ReactNode;
}
```

### 配置统一方案
```yaml
# nightshift/config/rules.yaml
ruleforge:
  enabled: true
  storage: ".nightshift/rules"
  auto_extract: true
  min_confidence: 0.8
  
  # 规则源（优先级从高到低）
  sources:
    - name: "local"
      path: ".nightshift/rules"
      priority: 0
    - name: "community"
      url: "https://github.com/multiagent/rules"
      priority: 1
      auto_sync: false
```

### 数据流
```
NightShift 任务调度
    ↓
分配任务给 Agent
    ↓
RuleForge 加载规则（按 task.language + task.framework 匹配）
    ↓
注入到 Agent System Prompt
    ↓
Agent 生成代码（遵循规则）
    ↓
RuleForge 本地验证（AST 检查）
    ↓
通过 → 勾选 ✅ / 失败 → 重试或提示
```

---

## 🧭 四、CLAUDE.md 行为规则（RuleForge 专用版）

> 基于 [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) 适配，聚焦规则提取场景

```markdown
# CLAUDE.md - RuleForge Development Guidelines

Behavioral guidelines for developing RuleForge. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding (Rule Extraction Context)

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing rule extraction logic:

- State assumptions about session log format explicitly. If uncertain, ask.
- If multiple pattern interpretations exist (e.g., "is this a bug fix or a feature?"), present them - don't pick silently.
- If a simpler extraction heuristic exists (regex vs. AST), say so. Push back when warranted.
- If log parsing is unclear (e.g., mixed editor formats), stop. Name what's confusing. Ask.

**RuleForge-specific:** When generating candidate rules, always include:
- Confidence score (0.0-1.0) with justification
- Applicable scenarios count (≥2 required for submission)
- Example before/after code snippets

---

## 2. Simplicity First (Rule YAML Design)

**Minimum YAML that captures the rule. Nothing speculative.**

- No fields beyond REP v0.1 schema unless explicitly requested
- No nested abstractions for single-use rule patterns
- No "future-proof" optional fields that aren't used
- If a rule condition can be expressed in 3 lines, don't write 20

**The test:** Would a rule consumer understand this in <30 seconds? If no, simplify.

**Example (Good):**
```yaml
rule:
  trigger:
    keywords: ["defineProps", "props"]
    file_pattern: "**/*.vue"
  condition: "Check props use TypeScript interface, avoid any"
  suggestion: "Use interface Props { title: string; count?: number }"
```

**Example (Bad - overcomplicated):**
```yaml
rule:
  trigger:
    advanced_regex: "(?<=defineProps<)[^>]+"  # unnecessary complexity
    # ... 10 more fields for edge cases nobody asked for
```

---

## 3. Surgical Changes (Plugin Development)

**Touch only what you must. Clean up only your own mess.**

When modifying the Trae/VSCode adapter:

- Don't "improve" unrelated UI components or config schemas
- Don't refactor core engine APIs unless fixing a bug
- Match existing event handling patterns, even if you'd design differently
- If you notice unused imports in core, mention in PR - don't delete

When your changes create orphans:

- Remove event listeners/types that YOUR changes made unused
- Don't remove pre-existing deprecated APIs unless asked

**The test:** Every changed line in `extension.ts` should trace directly to a user-facing feature or bug fix.

---

## 4. Goal-Driven Execution (Rule Contribution Flow)

**Define success criteria. Loop until verified.**

Transform implementation tasks into verifiable goals:

| Instead of... | Transform to... |
|--------------|----------------|
| "Add rule extraction" | "Extract 3 candidate rules from test session, output valid YAML" |
| "Fix GitHub PR creation" | "Write test that mocks GitHub API, then make it pass" |
| "Improve UI" | "User can confirm rule submission in ≤3 clicks, verify with e2e test" |

For multi-step features, state a brief plan:
```
1. Parse session log → verify: output structured events
2. Cluster patterns → verify: ≥2 high-confidence candidates
3. Generate YAML → verify: passes Zod schema validation
4. Create PR → verify: GitHub API returns 201 Created
```

**RuleForge-specific success criteria:**
- Candidate rules pass `RuleSchema.parse()` without errors
- GitHub PR creation succeeds with mock token
- Plugin prompt appears within 500ms of session end
- User can dismiss prompt without side effects

---

## RuleForge-Specific Additions

### REP Protocol Compliance
- All generated rules MUST validate against `RuleSchema` in `src/types/rule-schema.ts`
- New fields require schema update + version bump + backward compatibility note

### Privacy by Default
- Auto-redact: API keys, internal paths, user emails, project names
- Never include full file contents in rule suggestions - only minimal snippets
- When in doubt, ask: "Could this YAML leak sensitive info?"

### Community-First Design
- Default repo: `multiagent/rules` (not personal forks)
- Contribution prompts emphasize "help other developers" over "earn points"
- Always provide "Save locally only" option - never force sharing

---

## How to Know It's Working

These guidelines are working if you see:
- **Cleaner rule YAML** - No speculative fields, easy to review
- **Fewer plugin bugs** - Surgical changes mean fewer regressions
- **Faster reviews** - Clear success criteria let PRs merge quicker
- **Happy contributors** - Users actually submit rules because flow is frictionless

---

*Last updated: 2026-01-22 for RuleForge MVP*
```

---

## 🔌 五、Trae 与 VSCode 插件兼容性说明

### ✅ 核心结论：**完全兼容，可共用代码库**

🔹 **Trae 基于 VSCode Extension API 构建**
- 支持 `vscode` 模块导入
- 兼容 `package.json` 的 `contributes` 配置
- 支持相同的事件系统（onDidSaveTextDocument 等）

🔹 **唯一差异点（<5 处）：**
- 插件市场入口不同（Trae 有独立市场）
- 部分 UI 组件样式需微调（Trae 主题变量）
- `.trae/` 目录为 Trae 专属配置（VSCode 忽略）

🔹 **开发策略：**
- 主代码库：`packages/adapter-trae`（实际是 VSCode 兼容层）
- 构建时：通过 `engines` 字段区分发布目标
- 配置时：读取 `.trae/` 或 `.vscode/` 目录自动适配

### 🔹 插件 package.json 关键配置
```json
{
  "name": "@ruleforge/adapter-trae",
  "engines": {
    "vscode": "^1.85.0",
    "trae": "^1.0.0"
  },
  "contributes": {
    "commands": [...],
    "configuration": {
      "title": "RuleForge",
      "properties": {
        "ruleforge.autoTrigger": { ... },
        "ruleforge.traeSpecific": {
          "type": "boolean",
          "default": false,
          "description": "Enable Trae-only features (e.g., .trae/ config sync)"
        }
      }
    }
  },
  "trae": {
    "icon": "images/trae-icon.png",
    "marketplace_category": "AI Tools"
  }
}
```

### 🔹 适配层代码示例
```typescript
// packages/adapter-trae/src/bridge/ide-detector.ts
export function detectIDE(): 'vscode' | 'trae' | 'unknown' {
  // Trae 设置特定环境变量
  if (process.env.TRAE_EXTENSION_HOST) return 'trae';
  // VSCode 标准检测
  if (vscode.env.appName.includes('Visual Studio Code')) return 'vscode';
  return 'unknown';
}

// 使用示例
const ide = detectIDE();
if (ide === 'trae') {
  // 启用 .trae/ 配置同步
  loadTraeConfig();
} else {
  // 标准 VSCode 流程
  loadVSCodeConfig();
}
```

---

## 🚀 六、立即执行清单（今晚 Trae 开发）

### ✅ 第 1 步：生成项目骨架（独立版）
1. 复制上方 PowerShell 脚本为 `new-ruleforge.ps1`
2. 在终端运行：`.\new-ruleforge.ps1 -ProjectName "ruleforge-mvp"`
3. 用 Trae 打开生成的项目
4. 验证：`npm install` 能成功安装依赖

### ✅ 第 2 步：初始化核心引擎（D1-D3）
5. 在 Trae 输入 Prompt：
   ```
   "作为 TypeScript 专家，完善 packages/core/src/extractor/rule-extractor.ts 的 _clusterPatterns 方法，
    实现基于关键词频率 + 文件类型聚类的简单模式识别，输出 Pattern[] 数组，包含 id/name/confidence/applicableScenes 字段"
   ```

6. 运行 `npm run dev` 启动开发模式
7. 手动触发测试：创建测试日志文件 → 运行 `node packages/cli/dist/extract.js` → 验证 YAML 输出

### ✅ 第 3 步：验证核心逻辑（D4-D5）
8. 准备 3 个测试场景：
   - **场景1**：多次修复同一类错误（如 props 类型）
   - **场景2**：重复创建类似组件（如 Vue 表单）
   - **场景3**：遵循同一编码规范（如 FastAPI 路由）
   
9. 验证输出：
   - YAML 符合 REP v0.1 Schema
   - 置信度评分合理（0.7-0.95）
   - 代码示例清晰可理解

### ✅ 第 4 步：准备 NightShift 集成（D6-D7）
10. 创建 NightShift 仓库骨架
11. 将 RuleForge 作为 Git Submodule 添加：
    ```bash
    git submodule add https://github.com/your-name/ruleforge packages/ruleforge
    ```
12. 编写适配层接口定义（TypeScript interface）

💡 **关键原则**：
- 先保证 RuleForge 独立跑通（7天）
- 不追求完美，先有可用的 MVP
- 每天提交代码 + 写简短日志
- 遇到卡点记录，第二天优先解决

📊 **成功标准**：
- ✅ D7 结束：能运行 `ruleforge extract` 并输出有效 YAML
- ✅ D7 结束：有 3 个示例规则文件
- ✅ D7 结束：README 有完整使用说明

---

## 7.0 合规与开源策略【新增】

### 许可证选择
- **RuleForge**：MIT License（完全开源，可商用）
- **NightShift**：MIT License（完全开源，可商用）

### 清洁室开发原则
```
✅ 可以参考：
• CodePilot 的架构设计思路（多 Agent 并发）
• Multica 的任务调度逻辑（DAG/依赖管理）
• 任何开源项目的"思想"

❌ 不能复制：
• 任何一行源码（变量名/函数体/注释）
• 目录结构（按自己逻辑重新组织）
• CSS 样式/UI 布局

✅ 正确做法：
1. 看文档/架构图理解思路
2. 关闭原项目代码
3. 从零写自己的实现
4. 保留开发日志证明独立创作
```

### 第三方鸣谢模板
```markdown
## 🙏 Acknowledgements

RuleForge is inspired by amazing projects in the AI coding space:

- [CodePilot](https://github.com/op7418/CodePilot) - for pioneering the multi-agent coding workflow
- [Multica](https://github.com/multica-ai/multica) - for innovative task orchestration ideas

All code in this repository is independently written. No source code was copied from other projects.

Licensed under MIT License.
```

### 开发日志建议
- 每天写简短开发日志（`docs/dev-log.md`）
- 记录：今天做了什么、参考了什么、怎么实现的
- 目的：证明独立创作过程

---

## 🎯 最后确认

你已拥有：
- ✅ 完整 PRD（可直接粘贴给 Trae）
- ✅ PowerShell 项目生成脚本（一键初始化）
- ✅ Karpathy 风格 CLAUDE.md（保障代码质量）
- ✅ Trae/VSCode 共用插件方案（减少重复开发）
- ✅ NightShift 集成架构（适配层接口 + 配置方案）
- ✅ 合规策略（清洁室开发 + MIT 许可证）

**现在只需**：运行脚本 → 打开 Trae → 开始编码 → 7 天后验证 MVP 🚀

