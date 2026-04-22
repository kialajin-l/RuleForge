/**
 * init 命令：初始化 RuleForge 项目配置
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { createStepProgress } from '../utils/progress.js';

/**
 * 模板配置
 */
const TEMPLATES = {
  default: {
    extraction: {
      minConfidence: 0.7,
      applicableScenes: 2,
      logPath: ".ruleforge/logs",
      languageFocus: ["typescript", "javascript", "vue", "python"],
      maxFileSize: 10485760
    },
    privacy: {
      autoRedact: true,
      allowedPatterns: [],
      projectName: "{project_name}",
      redactApiKeys: true,
      redactPaths: true
    },
    storage: {
      localRulesDir: ".ruleforge/rules",
      cacheEnabled: true,
      cacheTTL: 7200,
      maxVersions: 10,
      backupEnabled: true
    },
    output: {
      format: "yaml",
      prettyPrint: true,
      includeComments: true,
      validateOutput: true,
      generateReport: true
    }
  },
  
  vue: {
    extraction: {
      minConfidence: 0.7,
      applicableScenes: 2,
      logPath: ".ruleforge/logs",
      languageFocus: ["vue", "typescript", "javascript"],
      maxFileSize: 10485760
    },
    privacy: {
      autoRedact: true,
      allowedPatterns: [],
      projectName: "{project_name}",
      redactApiKeys: true,
      redactPaths: true
    },
    storage: {
      localRulesDir: ".ruleforge/rules",
      cacheEnabled: true,
      cacheTTL: 7200,
      maxVersions: 10,
      backupEnabled: true
    },
    output: {
      format: "yaml",
      prettyPrint: true,
      includeComments: true,
      validateOutput: true,
      generateReport: true
    }
  },
  
  react: {
    extraction: {
      minConfidence: 0.7,
      applicableScenes: 2,
      logPath: ".ruleforge/logs",
      languageFocus: ["typescript", "javascript", "react"],
      maxFileSize: 10485760
    },
    privacy: {
      autoRedact: true,
      allowedPatterns: [],
      projectName: "{project_name}",
      redactApiKeys: true,
      redactPaths: true
    },
    storage: {
      localRulesDir: ".ruleforge/rules",
      cacheEnabled: true,
      cacheTTL: 7200,
      maxVersions: 10,
      backupEnabled: true
    },
    output: {
      format: "yaml",
      prettyPrint: true,
      includeComments: true,
      validateOutput: true,
      generateReport: true
    }
  },
  
  fastapi: {
    extraction: {
      minConfidence: 0.7,
      applicableScenes: 2,
      logPath: ".ruleforge/logs",
      languageFocus: ["python"],
      maxFileSize: 10485760
    },
    privacy: {
      autoRedact: true,
      allowedPatterns: [],
      projectName: "{project_name}",
      redactApiKeys: true,
      redactPaths: true
    },
    storage: {
      localRulesDir: ".ruleforge/rules",
      cacheEnabled: true,
      cacheTTL: 7200,
      maxVersions: 10,
      backupEnabled: true
    },
    output: {
      format: "yaml",
      prettyPrint: true,
      includeComments: true,
      validateOutput: true,
      generateReport: true
    }
  }
};

/**
 * 示例规则模板
 */
const EXAMPLE_RULES = {
  "typescript-function-naming": {
    meta: {
      id: "typescript-function-naming",
      name: "TypeScript 函数命名规范",
      version: "1.0.0",
      description: "检测 TypeScript 函数命名是否符合规范",
      authors: ["ruleforge-init"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    rule: {
      trigger: {
        type: "file_pattern",
        pattern: "*.ts",
        file_types: ["typescript"],
        context: "函数定义"
      },
      conditions: [
        {
          type: "code_contains",
          condition: "函数名不以大写字母开头",
          negated: false
        }
      ],
      suggestions: [
        {
          description: "建议使用 PascalCase 命名函数",
          code: "function ProperFunctionName() {\\n  // 正确的函数命名\\n}"
        }
      ]
    },
    compatibility: {
      languages: ["typescript", "javascript"],
      frameworks: ["react", "vue", "angular"],
      min_version: "1.0.0",
      max_version: "3.0.0"
    },
    confidence: 0.92
  },
  
  "react-component-props": {
    meta: {
      id: "react-component-props",
      name: "React 组件 Props 类型检查",
      version: "1.0.0",
      description: "检测 React 组件是否缺少 Props 类型定义",
      authors: ["ruleforge-init"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    rule: {
      trigger: {
        type: "file_pattern",
        pattern: "*.tsx",
        file_types: ["typescript"],
        context: "React 组件定义"
      },
      conditions: [
        {
          type: "code_contains",
          condition: "组件函数缺少 Props 类型注解",
          negated: false
        }
      ],
      suggestions: [
        {
          description: "建议添加 Props 接口定义",
          code: "interface ComponentProps {\\n  // 定义 props 属性\\n}\\n\\nfunction Component(props: ComponentProps) {\\n  // 组件实现\\n}"
        }
      ]
    },
    compatibility: {
      languages: ["typescript"],
      frameworks: ["react"],
      min_version: "16.8.0",
      max_version: "18.0.0"
    },
    confidence: 0.88
  }
};

/**
 * init 命令处理函数
 */
export async function initCommand(options: {
  force?: boolean;
  template?: string;
}): Promise<void> {
  const { force = false, template = 'default' } = options;
  
  logger.title('RuleForge 项目初始化');
  
  try {
    // 验证模板
    if (!(template in TEMPLATES)) {
      throw new Error(`无效的模板: ${template}。可用模板: ${Object.keys(TEMPLATES).join(', ')}`);
    }
    
    const selectedTemplate = TEMPLATES[template as keyof typeof TEMPLATES];
    
    // 创建步骤进度指示器
    const steps = createStepProgress([
      '检查现有配置',
      '创建配置目录',
      '生成配置文件',
      '初始化规则库目录',
      '创建示例规则',
      '完成初始化'
    ]);
    
    steps.next();
    
    // 1. 检查现有配置
    const configPath = path.join(process.cwd(), '.ruleforge.yaml');
    const configExists = await fileExists(configPath);
    
    if (configExists && !force) {
      logger.warn('配置文件已存在，使用 --force 选项覆盖');
      return;
    }
    
    steps.next();
    
    // 2. 创建配置目录
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    steps.next();
    
    // 3. 生成配置文件
    const yamlContent = generateYamlConfig(selectedTemplate);
    await fs.writeFile(configPath, yamlContent);
    
    steps.next();
    
    // 4. 初始化规则库目录
    const rulesDir = path.join(process.cwd(), '.ruleforge', 'rules');
    const versionsDir = path.join(rulesDir, 'versions');
    const logsDir = path.join(process.cwd(), '.ruleforge', 'logs');
    
    await fs.mkdir(rulesDir, { recursive: true });
    await fs.mkdir(versionsDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });
    
    steps.next();
    
    // 5. 创建示例规则
    for (const [ruleId, rule] of Object.entries(EXAMPLE_RULES)) {
      const rulePath = path.join(rulesDir, `${ruleId}.yaml`);
      const ruleYaml = generateYamlRule(rule);
      await fs.writeFile(rulePath, ruleYaml);
    }
    
    // 创建规则索引
    const indexContent = {
      version: "1.0.0",
      updatedAt: new Date().toISOString(),
      rules: Object.entries(EXAMPLE_RULES).map(([ruleId, rule]) => ({
        id: ruleId,
        name: rule.meta.name,
        version: rule.meta.version,
        filePath: `${ruleId}.yaml`,
        updatedAt: rule.meta.updated_at,
        confidence: rule.confidence,
        language: rule.compatibility.languages[0],
        framework: rule.compatibility.frameworks?.[0]
      }))
    };
    
    await fs.writeFile(
      path.join(rulesDir, 'rules-index.json'),
      JSON.stringify(indexContent, null, 2)
    );
    
    steps.complete();
    
    // 输出成功信息
    logger.newline();
    logger.success('RuleForge 项目初始化完成！');
    logger.newline();
    
    logger.subtitle('创建的文件和目录:');
    logger.item('.ruleforge.yaml - 主配置文件');
    logger.item('.ruleforge/rules/ - 规则存储目录');
    logger.item('.ruleforge/rules/versions/ - 版本备份目录');
    logger.item('.ruleforge/logs/ - 日志目录');
    logger.item('.ruleforge/rules/rules-index.json - 规则索引');
    
    for (const ruleId of Object.keys(EXAMPLE_RULES)) {
      logger.item(`.ruleforge/rules/${ruleId}.yaml - 示例规则`);
    }
    
    logger.newline();
    logger.subtitle('下一步操作:');
    logger.item('1. 编辑 .ruleforge.yaml 配置项目名称和参数');
    logger.item('2. 运行 ruleforge extract 开始提取规则');
    logger.item('3. 运行 ruleforge list 查看现有规则');
    
    logger.newline();
    logger.keyValue('使用的模板', template);
    logger.keyValue('配置文件', configPath);
    logger.keyValue('规则目录', rulesDir);
    
  } catch (error) {
    logger.error('初始化失败:', error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

/**
 * 生成 YAML 配置文件内容
 */
function generateYamlConfig(config: any): string {
  const header = `# RuleForge 配置文件
# 生成时间: ${new Date().toISOString()}
# 模板: ${Object.keys(TEMPLATES).find(key => TEMPLATES[key as keyof typeof TEMPLATES] === config) || 'default'}
# 文档: https://ruleforge.dev/docs/configuration

`;
  
  const yaml = require('js-yaml');
  return header + yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

/**
 * 生成 YAML 规则内容
 */
function generateYamlRule(rule: any): string {
  const header = `# RuleForge Rule - ${rule.meta.name}
# ID: ${rule.meta.id}
# Version: ${rule.meta.version}
# Generated: ${new Date().toISOString()}

`;
  
  const yaml = require('js-yaml');
  return header + yaml.dump(rule, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 导出命令配置（用于测试）
export const initCommandConfig = {
  name: 'init',
  description: '初始化 RuleForge 项目配置',
  options: [
    { flags: '--force', description: '覆盖已存在的配置' },
    { flags: '--template <template>', description: '选择模板 (default/vue/react/fastapi)' }
  ]
};