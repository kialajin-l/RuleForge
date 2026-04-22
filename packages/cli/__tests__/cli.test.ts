/**
 * CLI 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createProgram, registerCommands } from '../src/index.js';
import { logger } from '../src/utils/logger.js';

// Mock 依赖
vi.mock('@ruleforge/core', () => ({
  RuleForgeEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getRules: vi.fn().mockResolvedValue([]),
    getRule: vi.fn().mockResolvedValue(null),
    deleteRule: vi.fn().mockResolvedValue(undefined)
  })),
  RuleValidator: {
    createStandardValidator: vi.fn().mockReturnValue({
      validate: vi.fn().mockReturnValue({
        valid: true,
        errors: [],
        warnings: []
      })
    })
  }
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('test content'),
    access: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false }),
    readdir: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ confirm: true })
  }
}));

describe('CLI 程序', () => {
  let program: any;

  beforeEach(() => {
    program = createProgram();
    registerCommands(program);
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'success').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('程序创建', () => {
    it('应该正确创建 CLI 程序', () => {
      expect(program).toBeDefined();
      expect(program.name()).toBe('ruleforge');
    });

    it('应该包含版本信息', () => {
      expect(program.version()).toBe('0.1.0');
    });
  });

  describe('命令注册', () => {
    it('应该注册所有命令', () => {
      const commands = program.commands.map((cmd: any) => cmd.name());
      expect(commands).toContain('init');
      expect(commands).toContain('extract');
      expect(commands).toContain('validate');
      expect(commands).toContain('list');
      expect(commands).toContain('show');
      expect(commands).toContain('delete');
      expect(commands).toContain('export');
      expect(commands).toContain('import');
    });

    it('每个命令应该有正确的描述', () => {
      const initCmd = program.commands.find((cmd: any) => cmd.name() === 'init');
      expect(initCmd.description()).toBe('初始化 RuleForge 项目配置');

      const extractCmd = program.commands.find((cmd: any) => cmd.name() === 'extract');
      expect(extractCmd.description()).toBe('从日志文件提取候选规则');
    });
  });

  describe('init 命令', () => {
    it('应该处理 init 命令', async () => {
      await program.parseAsync(['node', 'ruleforge', 'init', '--force'], { from: 'user' });
      
      // 验证命令被正确调用
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理模板选项', async () => {
      await program.parseAsync(['node', 'ruleforge', 'init', '--template', 'vue'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('extract 命令', () => {
    it('应该处理 extract 命令', async () => {
      await program.parseAsync(['node', 'ruleforge', 'extract', '--dry-run'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理日志路径选项', async () => {
      await program.parseAsync(['node', 'ruleforge', 'extract', '--log', './logs'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('validate 命令', () => {
    it('应该处理 validate 命令', async () => {
      await program.parseAsync(['node', 'ruleforge', 'validate', 'test.yaml'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理严格模式选项', async () => {
      await program.parseAsync(['node', 'ruleforge', 'validate', 'test.yaml', '--strict'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('list 命令', () => {
    it('应该处理 list 命令', async () => {
      await program.parseAsync(['node', 'ruleforge', 'list'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理格式选项', async () => {
      await program.parseAsync(['node', 'ruleforge', 'list', '--format', 'json'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('show 命令', () => {
    it('应该处理 show 命令', async () => {
      await program.parseAsync(['node', 'ruleforge', 'show', 'rule-001'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理 YAML 选项', async () => {
      await program.parseAsync(['node', 'ruleforge', 'show', 'rule-001', '--yaml'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('delete 命令', () => {
    it('应该处理 delete 命令', async () => {
      await program.parseAsync(['node', 'ruleforge', 'delete', 'rule-001'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理强制选项', async () => {
      await program.parseAsync(['node', 'ruleforge', 'delete', 'rule-001', '--force'], { from: 'user' });
      
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该显示帮助信息当命令不存在时', async () => {
      await program.parseAsync(['node', 'ruleforge', 'unknown-command'], { from: 'user' });
      
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

describe('日志工具', () => {
  it('应该设置日志级别', () => {
    logger.setLevel('verbose');
    expect(logger['level']).toBe('verbose');
  });

  it('应该记录不同级别的日志', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    logger.setLevel('info');
    logger.info('测试信息');
    
    expect(consoleSpy).toHaveBeenCalled();
  });
});