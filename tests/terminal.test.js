/**
 * terminal.js 單元測試
 * 測試命令預覽與錯誤類型功能
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';

// Mock validators
vi.mock('../src/main/validators', () => ({
  getValidator: () => ({
    validateConfig: terminal => {
      if (!terminal || !terminal.command) {
        return { valid: false, errorType: 'INVALID_CONFIG', errorDetail: 'Missing command' };
      }
      return { valid: true };
    },
    validatePath: () => ({ valid: true }),
    usesWindowsTerminal: () => false,
    usesWsl: () => false,
    extractWslDistro: () => null,
    isWindowsTerminalInstalled: () => true,
    isWslInstalled: () => false,
    isWslDistroInstalled: () => false,
    getWslDistros: () => [],
    getCacheStats: () => ({ size: 0, hits: 0, misses: 0 }),
    invalidateCache: vi.fn(),
    detectInstalledTerminals: () => [],
  }),
}));

const { previewCommand, ErrorType } = require('../src/main/terminal.js');

describe('previewCommand', () => {
  it('應該正確生成 Windows 路徑命令預覽', () => {
    const dir = { path: 'C:\\Users\\test\\project' };
    const terminal = {
      name: 'CMD',
      command: 'cmd.exe /k cd /d {path}',
      pathFormat: 'windows',
    };

    const result = previewCommand(dir, terminal);

    expect(result.success).toBe(true);
    expect(result.command).toContain('C:\\Users\\test\\project');
    expect(result.terminalName).toBe('CMD');
    expect(result.originalPath).toBe('C:\\Users\\test\\project');
  });

  it('應該正確生成 Unix 路徑命令預覽', () => {
    const dir = { path: '/home/user/project' };
    const terminal = {
      name: 'Terminal',
      command: 'open -a Terminal {path}',
      pathFormat: 'unix',
    };

    const result = previewCommand(dir, terminal);

    expect(result.success).toBe(true);
    expect(result.command).toContain('/home/user/project');
    expect(result.terminalName).toBe('Terminal');
  });

  it('應該處理帶空格的路徑', () => {
    const dir = { path: 'C:\\Users\\test user\\my project' };
    const terminal = {
      name: 'CMD',
      command: 'cmd.exe /k cd /d {path}',
      pathFormat: 'windows',
    };

    const result = previewCommand(dir, terminal);

    expect(result.success).toBe(true);
    // 路徑應被引號包裹
    expect(result.command).toContain('"');
  });

  it('當終端配置無效時應回傳錯誤', () => {
    const dir = { path: 'C:\\test' };
    const terminal = { name: 'Bad', pathFormat: 'windows' }; // 缺少 command

    const result = previewCommand(dir, terminal);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('INVALID_CONFIG');
  });

  it('應該替換多個 {path} 佔位符', () => {
    const dir = { path: '/home/user/project' };
    const terminal = {
      name: 'Custom',
      command: 'echo {path} && cd {path}',
      pathFormat: 'unix',
    };

    const result = previewCommand(dir, terminal);

    expect(result.success).toBe(true);
    // 兩個 {path} 都應被替換
    expect(result.command).not.toContain('{path}');
  });
});

describe('ErrorType', () => {
  it('應該定義所有錯誤類型常數', () => {
    expect(ErrorType.INVALID_CONFIG).toBe('INVALID_CONFIG');
    expect(ErrorType.PATH_NOT_FOUND).toBe('PATH_NOT_FOUND');
    expect(ErrorType.PATH_NOT_DIRECTORY).toBe('PATH_NOT_DIRECTORY');
    expect(ErrorType.PATH_UNSAFE).toBe('PATH_UNSAFE');
    expect(ErrorType.WINDOWS_TERMINAL_NOT_FOUND).toBe('WINDOWS_TERMINAL_NOT_FOUND');
    expect(ErrorType.WSL_NOT_FOUND).toBe('WSL_NOT_FOUND');
    expect(ErrorType.WSL_DISTRO_NOT_FOUND).toBe('WSL_DISTRO_NOT_FOUND');
    expect(ErrorType.TERMINAL_NOT_FOUND).toBe('TERMINAL_NOT_FOUND');
    expect(ErrorType.SPAWN_FAILED).toBe('SPAWN_FAILED');
  });
});
