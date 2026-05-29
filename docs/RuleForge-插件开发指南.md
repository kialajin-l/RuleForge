# RuleForge 插件开发指南

> 为 RuleForge 开发编辑器插件和适配器

## 概述

RuleForge 采用核心引擎 + 适配层的架构设计，支持为不同编辑器和开发环境开发插件。本指南介绍如何开发 RuleForge 插件。

## 架构设计

### 核心架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   编辑器插件    │────│   适配层        │────│   核心引擎      │
│ (VSCode/Trae)   │    │ (@ruleforge/    │    │ (@ruleforge/    │
│                 │    │ adapter-*)      │    │ core)           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 数据流

1. **事件收集**: 插件监听编辑器事件
2. **数据处理**: 适配器转换事件格式
3. **规则提取**: 核心引擎处理数据
4. **结果展示**: 插件显示提取结果

## 开发 Trae 插件

### 环境搭建

#### 创建插件项目

```bash
# 创建插件目录
mkdir ruleforge-trae-plugin
cd ruleforge-trae-plugin

# 初始化项目
npm init -y

# 安装依赖
npm install @ruleforge/core
npm install --save-dev typescript @types/node
```

#### 项目结构

```
ruleforge-trae-plugin/
├── src/
│   ├── index.ts          # 插件入口
│   ├── event-listener.ts # 事件监听器
│   ├── ui-components.ts  # UI 组件
│   └── types.ts          # 类型定义
├── package.json
├── tsconfig.json
└── README.md
```

### 插件实现

#### 基本插件结构

```typescript
// src/index.ts
import { RuleExtractor, RuleValidator } from '@ruleforge/core';
import { EventListener } from './event-listener';
import { RulePanel } from './ui-components';

export class RuleForgeTraePlugin {
  private extractor: RuleExtractor;
  private validator: RuleValidator;
  private eventListener: EventListener;
  private rulePanel: RulePanel;

  constructor() {
    this.extractor = new RuleExtractor();
    this.validator = RuleValidator.createStandardValidator();
    this.eventListener = new EventListener();
    this.rulePanel = new RulePanel();
    
    this.initialize();
  }

  private initialize(): void {
    // 注册事件监听
    this.eventListener.on('file_saved', this.handleFileSaved.bind(this));
    this.eventListener.on('error_fixed', this.handleErrorFixed.bind(this));
    this.eventListener.on('test_run', this.handleTestRun.bind(this));
    
    // 初始化 UI
    this.rulePanel.initialize();
  }

  private async handleFileSaved(event: FileSavedEvent): Promise<void> {
    // 处理文件保存事件
    const result = await this.extractor.extractFromEvents([event]);
    this.rulePanel.updateRules(result.rules);
  }

  // 其他事件处理方法...
}

// 导出插件实例
export const plugin = new RuleForgeTraePlugin();
```

#### 事件监听器

```typescript
// src/event-listener.ts
export class EventListener {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Trae 特定事件监听
  listenToTraeEvents(): void {
    // 监听 Trae 编辑器事件
    // 这里需要根据 Trae 的 API 进行实现
    
    // 示例：监听文件保存
    trae.editor.onFileSave((filePath: string, content: string) => {
      this.emit('file_saved', {
        type: 'file_saved',
        timestamp: new Date().toISOString(),
        file: filePath,
        content: content,
        language: this.detectLanguage(filePath)
      });
    });

    // 监听错误修复
    trae.error.onFixApplied((error: Error, fix: string) => {
      this.emit('error_fixed', {
        type: 'error_fixed',
        timestamp: new Date().toISOString(),
        error: error.message,
        fix: fix,
        file: error.file
      });
    });
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'vue': 'vue',
      'py': 'python',
      'java': 'java'
    };
    return languageMap[ext || ''] || 'unknown';
  }
}
```

#### UI 组件

```typescript
// src/ui-components.ts
export class RulePanel {
  private panelElement: HTMLElement | null = null;
  private rules: any[] = [];

  initialize(): void {
    this.createPanel();
    this.render();
  }

  private createPanel(): void {
    // 创建 RuleForge 面板
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'ruleforge-panel';
    this.panelElement.className = 'ruleforge-panel';
    
    // 添加到 Trae 界面
    const traeUI = document.querySelector('.trae-ui-container');
    if (traeUI) {
      traeUI.appendChild(this.panelElement);
    }
  }

  updateRules(rules: any[]): void {
    this.rules = rules;
    this.render();
  }

  private render(): void {
    if (!this.panelElement) return;

    this.panelElement.innerHTML = `
      <div class="ruleforge-header">
        <h3>RuleForge</h3>
        <span class="rule-count">${this.rules.length} 规则</span>
      </div>
      <div class="rules-list">
        ${this.rules.map(rule => this.renderRule(rule)).join('')}
      </div>
    `;
  }

  private renderRule(rule: any): string {
    return `
      <div class="rule-item" data-rule-id="${rule.meta.id}">
        <div class="rule-header">
          <span class="rule-name">${rule.meta.name}</span>
          <span class="rule-confidence">${(rule.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="rule-description">${rule.meta.description}</div>
        <div class="rule-tags">
          ${rule.meta.tags?.map((tag: string) => 
            `<span class="tag">${tag}</span>`
          ).join('') || ''}
        </div>
      </div>
    `;
  }
}
```

### 插件配置

#### package.json

```json
{
  "name": "@ruleforge/trae-plugin",
  "version": "1.0.0",
  "description": "RuleForge plugin for Trae IDE",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest"
  },
  "dependencies": {
    "@ruleforge/core": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  },
  "trae": {
    "name": "RuleForge",
    "description": "Extract coding rules from development sessions",
    "author": "RuleForge Team",
    "version": "1.0.0",
    "entry": "dist/index.js",
    "permissions": ["editor", "filesystem", "ui"]
  }
}
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 开发 VSCode 插件

### 项目结构

```
ruleforge-vscode-extension/
├── src/
│   ├── extension.ts        # 扩展入口
│   ├── rule-provider.ts    # 规则提供者
│   ├── webview-panel.ts    # WebView 面板
│   └── event-tracker.ts    # 事件跟踪器
├── package.json
├── tsconfig.json
├── .vscodeignore
└── README.md
```

### 扩展实现

#### 扩展入口

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { RuleForgeProvider } from './rule-provider';
import { RuleForgePanel } from './webview-panel';

export function activate(context: vscode.ExtensionContext) {
  // 注册规则提供者
  const ruleProvider = new RuleForgeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('ruleforgeView', ruleProvider)
  );

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ruleforge.extractRules', () => {
      RuleForgePanel.createOrShow(context.extensionUri);
    })
  );

  // 启动事件跟踪
  ruleProvider.startEventTracking();
}

export function deactivate() {}
```

#### 规则提供者

```typescript
// src/rule-provider.ts
import * as vscode from 'vscode';
import { RuleExtractor } from '@ruleforge/core';

export class RuleForgeProvider implements vscode.TreeDataProvider<RuleItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RuleItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private extractor: RuleExtractor;
  private rules: RuleItem[] = [];

  constructor() {
    this.extractor = new RuleExtractor();
  }

  startEventTracking(): void {
    // 监听文件保存事件
    vscode.workspace.onDidSaveTextDocument((document) => {
      this.handleFileSaved(document);
    });

    // 监听诊断变化（错误修复）
    vscode.languages.onDidChangeDiagnostics((event) => {
      this.handleDiagnosticsChange(event);
    });
  }

  private async handleFileSaved(document: vscode.TextDocument): Promise<void> {
    const event = {
      type: 'file_saved',
      timestamp: new Date().toISOString(),
      file: document.fileName,
      content: document.getText(),
      language: document.languageId
    };

    const result = await this.extractor.extractFromEvents([event]);
    this.updateRules(result.rules);
  }

  private updateRules(rules: any[]): void {
    this.rules = rules.map(rule => new RuleItem(rule));
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: RuleItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: RuleItem): Thenable<RuleItem[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.rules);
    }
  }
}

class RuleItem extends vscode.TreeItem {
  constructor(rule: any) {
    super(
      rule.meta.name,
      vscode.TreeItemCollapsibleState.None
    );

    this.description = `${(rule.confidence * 100).toFixed(0)}%`;
    this.tooltip = rule.meta.description;
    this.contextValue = 'rule';
  }
}
```

## 事件系统

### 可用事件

RuleForge 插件可以监听以下事件：

#### 编辑器事件

| 事件 | 描述 | 数据格式 |
|------|------|----------|
| `file_saved` | 文件保存 | `{file, content, language}` |
| `file_created` | 文件创建 | `{file, content}` |
| `file_deleted` | 文件删除 | `{file}` |
| `file_renamed` | 文件重命名 | `{oldFile, newFile}` |

#### 开发事件

| 事件 | 描述 | 数据格式 |
|------|------|----------|
| `error_occurred` | 错误发生 | `{error, file, line}` |
| `error_fixed` | 错误修复 | `{error, fix, file}` |
| `test_run` | 测试运行 | `{testFile, passed, failed}` |
| `command_executed` | 命令执行 | `{command, args, output}` |

#### 规则事件

| 事件 | 描述 | 数据格式 |
|------|------|----------|
| `rule_extracted` | 规则提取完成 | `{rules, statistics}` |
| `rule_validated` | 规则验证完成 | `{rule, valid, errors}` |
| `rule_applied` | 规则应用 | `{rule, context}` |

### 事件监听最佳实践

```typescript
// 事件监听示例
class EventHandler {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 使用防抖避免频繁触发
    this.debouncedFileSave = this.debounce(this.handleFileSave, 1000);
    
    // 监听多个相关事件
    vscode.workspace.onDidSaveTextDocument(this.debouncedFileSave);
    vscode.workspace.onDidCreateFiles(this.handleFileCreate);
    vscode.workspace.onDidDeleteFiles(this.handleFileDelete);
  }

  private debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  private async handleFileSave(document: vscode.TextDocument): Promise<void> {
    // 只处理特定文件类型
    if (!['typescript', 'javascript', 'vue'].includes(document.languageId)) {
      return;
    }

    // 处理文件保存逻辑
    await this.processFileEvent('file_saved', document);
  }
}
```

## UI 组件开发

### 组件设计原则

1. **一致性**: 遵循编辑器 UI 规范
2. **响应式**: 适应不同屏幕尺寸
3. **无障碍**: 支持键盘导航和屏幕阅读器
4. **性能**: 优化渲染性能

### 常用组件

#### 规则列表组件

```typescript
interface RuleListProps {
  rules: Rule[];
  onRuleSelect: (rule: Rule) => void;
  onRuleApply: (rule: Rule) => void;
}

const RuleList: React.FC<RuleListProps> = ({ rules, onRuleSelect, onRuleApply }) => {
  return (
    <div className="rule-list">
      {rules.map(rule => (
        <RuleListItem
          key={rule.meta.id}
          rule={rule}
          onSelect={onRuleSelect}
          onApply={onRuleApply}
        />
      ))}
    </div>
  );
};
```

#### 规则详情面板

```typescript
interface RuleDetailProps {
  rule: Rule;
  onClose: () => void;
}

const RuleDetail: React.FC<RuleDetailProps> = ({ rule, onClose }) => {
  return (
    <div className="rule-detail">
      <header>
        <h2>{rule.meta.name}</h2>
        <button onClick={onClose}>关闭</button>
      </header>
      
      <section className="meta-info">
        <p><strong>描述:</strong> {rule.meta.description}</p>
        <p><strong>置信度:</strong> {(rule.confidence * 100).toFixed(0)}%</p>
        <p><strong>版本:</strong> {rule.meta.version}</p>
      </section>
      
      <section className="suggestions">
        <h3>建议</h3>
        {rule.rule.suggestions.map((suggestion, index) => (
          <SuggestionItem key={index} suggestion={suggestion} />
        ))}
      </section>
    </div>
  );
};
```

## 发布流程

### 打包插件

```bash
# 构建插件
npm run build

# 创建发布包
npm run package

# 测试插件
npm run test
```

### 发布到市场

#### VSCode 扩展市场

```bash
# 安装 vsce
npm install -g vsce

# 打包扩展
vsce package

# 发布扩展
vsce publish
```

#### Trae 插件市场

```json
{
  "name": "@ruleforge/trae-plugin",
  "version": "1.0.0",
  "trae": {
    "displayName": "RuleForge",
    "description": "Extract coding rules from development sessions",
    "categories": ["productivity", "code-quality"],
    "keywords": ["rules", "patterns", "best-practices"],
    "repository": "https://github.com/kialajin/ruleforge",
    "homepage": "https://ruleforge.dev"
  }
}
```

### 版本管理

遵循语义版本规范：

- **主版本**: 不兼容的 API 修改
- **次版本**: 向下兼容的功能新增
- **修订号**: 问题修复

## 测试策略

### 单元测试

```typescript
// tests/event-listener.test.ts
import { EventListener } from '../src/event-listener';

describe('EventListener', () => {
  let eventListener: EventListener;

  beforeEach(() => {
    eventListener = new EventListener();
  });

  test('should register and emit events', () => {
    const mockCallback = vi.fn();
    eventListener.on('test_event', mockCallback);
    
    eventListener.emit('test_event', { data: 'test' });
    
    expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

### 集成测试

```typescript
// tests/integration.test.ts
import { RuleForgeTraePlugin } from '../src/index';

describe('RuleForgeTraePlugin', () => {
  let plugin: RuleForgeTraePlugin;

  beforeAll(() => {
    plugin = new RuleForgeTraePlugin();
  });

  test('should handle file saved events', async () => {
    const mockEvent = {
      type: 'file_saved',
      file: '/test/component.vue',
      content: '<template>...</template>',
      language: 'vue'
    };

    // 模拟事件触发
    await plugin['handleFileSaved'](mockEvent);
    
    // 验证规则提取结果
    expect(plugin.getRules().length).toBeGreaterThan(0);
  });
});
```

## 性能优化

### 事件处理优化

```typescript
class OptimizedEventHandler {
  private eventQueue: any[] = [];
  private processing = false;

  async handleEvent(event: any): Promise<void> {
    this.eventQueue.push(event);
    
    if (!this.processing) {
      this.processing = true;
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.processEvent(event);
      
      // 添加延迟避免阻塞
      if (this.eventQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.processing = false;
  }
}
```

### 内存管理

```typescript
class MemoryManager {
  private rulesCache = new Map<string, Rule>();
  private maxCacheSize = 100;

  cacheRule(rule: Rule): void {
    if (this.rulesCache.size >= this.maxCacheSize) {
      // 移除最旧的规则
      const firstKey = this.rulesCache.keys().next().value;
      this.rulesCache.delete(firstKey);
    }
    
    this.rulesCache.set(rule.meta.id, rule);
  }

  clearCache(): void {
    this.rulesCache.clear();
  }
}
```

## 故障排除

### 常见问题

**Q: 插件无法加载**
- 检查依赖版本兼容性
- 验证插件配置格式
- 查看编辑器控制台错误日志

**Q: 事件监听不工作**
- 确认权限设置正确
- 检查事件名称拼写
- 验证事件数据格式

**Q: 性能问题**
- 优化事件处理逻辑
- 实现数据缓存
- 使用防抖和节流

### 调试技巧

```typescript
// 启用调试模式
class DebugHelper {
  static enableDebug(): void {
    if (process.env.NODE_ENV === 'development') {
      window.ruleforgeDebug = {
        events: [],
        rules: [],
        logEvent: (event: any) => {
          this.events.push(event);
          console.log('RuleForge Event:', event);
        }
      };
    }
  }
}
```

## 相关资源

- [RuleForge Core API](API.md)
- [VSCode 扩展指南](https://code.visualstudio.com/api)
- [Trae 插件文档](https://trae.dev/docs/plugins)
- [示例插件代码](https://github.com/kialajin/ruleforge/tree/main/examples/plugins)

---

**版本**: v1.0.0  
**最后更新**: 2024-01-22  
**维护者**: RuleForge Team