#!/usr/bin/env node
/**
 * RuleForge CLI 工具
 * 命令行界面，用于管理开发规则
 */
import { Command } from 'commander';
import { logger } from './utils/logger.js';
import { initCommand } from './commands/init.js';
import { extractCommand } from './commands/extract.js';
import { validateCommand } from './commands/validate.js';
import { listCommand } from './commands/list.js';
import { showCommand } from './commands/show.js';
import { deleteCommand } from './commands/delete.js';
// CLI 版本信息
const VERSION = '0.1.0';
/**
 * 创建 CLI 程序
 */
function createProgram() {
    const program = new Command();
    program
        .name('ruleforge')
        .description('RuleForge CLI - Extract and manage development rules from your codebase')
        .version(VERSION, '-v, --version', '显示版本信息')
        .option('--verbose', '显示详细日志')
        .option('--silent', '静默模式，不输出日志')
        .hook('preAction', (thisCommand) => {
        // 设置日志级别
        const options = thisCommand.opts();
        if (options['verbose']) {
            logger.setLevel('verbose');
        }
        else if (options['silent']) {
            logger.setLevel('silent');
        }
    });
    return program;
}
/**
 * 注册所有命令
 */
function registerCommands(program) {
    // init 命令
    program
        .command('init')
        .description('初始化 RuleForge 项目配置')
        .option('--force', '覆盖已存在的配置')
        .option('--template <template>', '选择模板 (default/vue/react/fastapi)', 'default')
        .action(initCommand);
    // extract 命令
    program
        .command('extract')
        .description('从日志文件提取候选规则')
        .option('--log <path>', '日志文件路径', '.ruleforge/logs/')
        .option('--output <dir>', '输出目录', '.ruleforge/candidates/')
        .option('--min-conf <number>', '最小置信度', '0.7')
        .option('--dry-run', '仅显示，不保存文件')
        .option('--json', '输出 JSON 格式')
        .action(extractCommand);
    // validate 命令
    program
        .command('validate <file>')
        .description('验证 YAML 文件是否符合 REP v0.1')
        .option('--strict', '严格模式（警告也视为错误）')
        .option('--fix', '自动修复可修复的问题')
        .action(validateCommand);
    // list 命令
    program
        .command('list')
        .description('列出本地规则库中的所有规则')
        .option('--format <type>', '输出格式 (table/json/yaml)', 'table')
        .option('--tag <tags...>', '按标签过滤')
        .option('--framework <fw>', '按框架过滤')
        .option('--language <lang>', '按语言过滤')
        .option('--min-confidence <number>', '最小置信度')
        .action(listCommand);
    // show 命令
    program
        .command('show <rule-id>')
        .description('显示指定规则的详细信息')
        .option('--yaml', '显示完整的 YAML 内容')
        .option('--stats', '显示统计信息')
        .action(showCommand);
    // delete 命令
    program
        .command('delete <rule-id>')
        .description('删除指定规则')
        .option('--force', '不询问确认')
        .action(deleteCommand);
    // export 命令（暂未实现）
    program
        .command('export')
        .description('导出规则库（功能开发中）')
        .action(() => {
        logger.error('export 命令暂未实现，将在后续版本中提供');
    });
    // import 命令（暂未实现）
    program
        .command('import <file>')
        .description('从导出文件导入规则（功能开发中）')
        .action(() => {
        logger.error('import 命令暂未实现，将在后续版本中提供');
    });
    // 添加帮助信息
    program.addHelpText('after', `
示例:
  $ ruleforge init --force
  $ ruleforge extract --log ./logs/ --min-conf 0.8
  $ ruleforge validate rule.yaml --fix
  $ ruleforge list --format table --framework react
  $ ruleforge show rule-001 --yaml
  $ ruleforge delete rule-001 --force
  $ ruleforge export --output my-rules.zip
  $ ruleforge import rules.zip --strategy merge

更多信息请访问: https://ruleforge.dev/docs/cli
  `);
}
/**
 * 主函数
 */
async function main() {
    try {
        const program = createProgram();
        registerCommands(program);
        // 处理未匹配的命令
        program.showHelpAfterError('(使用 --help 查看可用命令)');
        // 解析命令行参数
        await program.parseAsync(process.argv);
    }
    catch (error) {
        logger.error(`CLI 执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
        // 根据错误类型设置退出码
        if (error instanceof Error) {
            if (error.message.includes('配置')) {
                process.exit(2); // 配置错误
            }
            else if (error.message.includes('验证')) {
                process.exit(3); // 验证失败
            }
        }
        process.exit(1); // 一般错误
    }
}
// 导出 CLI 程序（用于测试）
export { createProgram, registerCommands };
// 如果是直接运行，则执行主函数
const scriptPath = process.argv[1]?.replace(/\\/g, '/');
const importUrl = import.meta.url.replace('file:///', '').replace('file://', '');
if (scriptPath && (importUrl.includes(scriptPath) || importUrl.endsWith(scriptPath))) {
    main().catch(error => {
        logger.error('CLI 启动失败:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map