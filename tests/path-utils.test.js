/**
 * path-utils.js 單元測試
 * 測試路徑轉換和命令解析功能
 */
import { describe, it, expect } from 'vitest';

// 直接導入純函數模組（不依賴 Electron）
const { toWslPath, formatPath, parseCommand } = require('../src/main/utils/path-utils.js');

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

describe('parseCommand', () => {
  it('應該分割簡單命令', () => {
    expect(parseCommand('wt -d /path')).toEqual(['wt', '-d', '/path']);
  });

  it('應該處理雙引號', () => {
    expect(parseCommand('cmd /c "echo hello"')).toEqual(['cmd', '/c', 'echo hello']);
  });

  it('應該處理單引號', () => {
    expect(parseCommand("bash -c 'ls -la'")).toEqual(['bash', '-c', 'ls -la']);
  });

  it('應該處理路徑中的空格（使用引號）', () => {
    expect(parseCommand('cd "/path/with spaces"')).toEqual(['cd', '/path/with spaces']);
  });

  it('應該處理多個參數', () => {
    expect(parseCommand('wt -p Ubuntu -d /mnt/c')).toEqual(['wt', '-p', 'Ubuntu', '-d', '/mnt/c']);
  });

  it('應該處理空命令', () => {
    expect(parseCommand('')).toEqual([]);
  });

  it('應該處理只有空格的命令', () => {
    expect(parseCommand('   ')).toEqual([]);
  });

  it('應該處理連續空格', () => {
    expect(parseCommand('cmd  -c   test')).toEqual(['cmd', '-c', 'test']);
  });

  it('應該處理複雜的 Windows Terminal 命令', () => {
    expect(parseCommand('wt -p "Ubuntu" -d "/mnt/d/Projects"')).toEqual([
      'wt',
      '-p',
      'Ubuntu',
      '-d',
      '/mnt/d/Projects',
    ]);
  });
});
