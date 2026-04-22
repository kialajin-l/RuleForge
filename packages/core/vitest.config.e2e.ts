import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/e2e/**/*.test.ts'],
    exclude: ['__tests__/unit/**/*.test.ts', 'node_modules/**'],
    environment: 'node',
    globals: true,
    setupFiles: ['./__tests__/e2e/setup.ts'],
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage/e2e',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/index.ts'
      ],
      
      // 覆盖率阈值
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        
        // 核心模块应该有更高的覆盖率要求
        './src/extractor/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        
        './src/validator/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        
        './src/formatter/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      
      // 覆盖率报告配置
      reportOnFailure: true,
      all: true,
      clean: true,
      cleanOnRerun: true
    },
    
    // 测试超时设置
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // 输出配置
    silent: false,
    logHeapUsage: false,
    
    // 类型检查
    typecheck: {
      enabled: true,
      include: ['**/*.test-d.ts']
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});