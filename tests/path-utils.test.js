/**
 * path-utils.js 單元測試
 * 測試路徑轉換和安全性驗證功能
 */
import { describe, it, expect } from 'vitest';

// 直接導入純函數模組（不依賴 Electron）
const {
  toWslPath,
  formatPath,
  validatePathSafety,
  escapePathForShell,
} = require('../src/main/utils/path-utils.js');

describe('toWslPath', () => {
  it('應該將 Windows 路徑轉換為 WSL 路徑', () => {
    expect(toWslPath('C:\\Users\\test')).toBe('/mnt/c/Users/test');
    expect(toWslPath('D:\\Projects\\my-app')).toBe('/mnt/d/Projects/my-app');
  });

  it('應該處理小寫磁碟代號', () => {
    expect(toWslPath('c:\\Users\\test')).toBe('/mnt/c/Users/test');
  });

  it('應該處理深層路徑', () => {
    expect(toWslPath('E:\\a\\b\\c\\d\\e')).toBe('/mnt/e/a/b/c/d/e');
  });

  it('應該處理非 Windows 路徑（僅替換反斜線）', () => {
    expect(toWslPath('/mnt/c/test')).toBe('/mnt/c/test');
    expect(toWslPath('relative\\path')).toBe('relative/path');
  });

  it('應該處理根目錄', () => {
    expect(toWslPath('C:\\')).toBe('/mnt/c/');
  });

  it('應該處理含空格的路徑', () => {
    expect(toWslPath('C:\\Program Files\\App')).toBe('/mnt/c/Program Files/App');
  });
});

describe('formatPath', () => {
  it('unix 格式應該呼叫 toWslPath', () => {
    expect(formatPath('D:\\Projects', 'unix')).toBe('/mnt/d/Projects');
  });

  it('windows 格式應該保持原樣', () => {
    expect(formatPath('D:\\Projects', 'windows')).toBe('D:\\Projects');
  });

  it('預設應該保持原樣', () => {
    expect(formatPath('D:\\Projects', undefined)).toBe('D:\\Projects');
  });
});

describe('validatePathSafety', () => {
  it('正常路徑應該通過驗證', () => {
    expect(validatePathSafety('C:\\Users\\test')).toEqual({ safe: true });
    expect(validatePathSafety('/mnt/c/Users/test')).toEqual({ safe: true });
    expect(validatePathSafety('D:\\Projects\\my-app')).toEqual({ safe: true });
  });

  it('含空格的路徑應該通過驗證', () => {
    expect(validatePathSafety('C:\\Program Files\\App')).toEqual({ safe: true });
    expect(validatePathSafety('/mnt/c/Program Files/App')).toEqual({ safe: true });
  });

  it('含 & 的路徑應該通過驗證（Windows 允許）', () => {
    expect(validatePathSafety('C:\\Users\\test & backup')).toEqual({ safe: true });
  });

  it('含分號的路徑應該被拒絕', () => {
    const result = validatePathSafety('C:\\Users;rm -rf /');
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('SHELL_METACHAR');
  });

  it('含管道的路徑應該被拒絕', () => {
    const result = validatePathSafety('C:\\Users|cat /etc/passwd');
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('SHELL_METACHAR');
  });

  it('含命令替換的路徑應該被拒絕', () => {
    const result = validatePathSafety('C:\\Users$(whoami)');
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('COMMAND_SUBSTITUTION');
  });

  it('含反引號的路徑應該被拒絕', () => {
    const result = validatePathSafety('C:\\Users`whoami`');
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('SHELL_METACHAR');
  });

  it('含重導向的路徑應該被拒絕', () => {
    expect(validatePathSafety('C:\\Users > /tmp/out').safe).toBe(false);
    expect(validatePathSafety('C:\\Users >> /tmp/out').safe).toBe(false);
    expect(validatePathSafety('C:\\Users < /tmp/in').safe).toBe(false);
  });

  it('含換行符的路徑應該被拒絕', () => {
    expect(validatePathSafety('C:\\Users\nrm -rf /').safe).toBe(false);
    expect(validatePathSafety('C:\\Users\r\nrm -rf /').safe).toBe(false);
  });

  it('空路徑或非字串應該被拒絕', () => {
    expect(validatePathSafety('').safe).toBe(false);
    expect(validatePathSafety(null).safe).toBe(false);
    expect(validatePathSafety(undefined).safe).toBe(false);
  });
});

describe('escapePathForShell', () => {
  it('Unix 格式應該使用單引號包裹', () => {
    expect(escapePathForShell('/mnt/c/Users', 'unix')).toBe("'/mnt/c/Users'");
  });

  it('Unix 格式應該轉義內部單引號', () => {
    expect(escapePathForShell("/mnt/c/User's", 'unix')).toBe("'/mnt/c/User'\\''s'");
  });

  it('Windows 格式應該使用雙引號包裹', () => {
    expect(escapePathForShell('C:\\Users', 'windows')).toBe('"C:\\Users"');
  });

  it('Windows 格式應該轉義內部雙引號', () => {
    expect(escapePathForShell('C:\\Users\\"test"', 'windows')).toBe('"C:\\Users\\""test"""');
  });

  it('含空格的路徑應該被正確包裹', () => {
    expect(escapePathForShell('/mnt/c/Program Files', 'unix')).toBe("'/mnt/c/Program Files'");
    expect(escapePathForShell('C:\\Program Files', 'windows')).toBe('"C:\\Program Files"');
  });
});
