/**
 * state.js 模組測試
 * 測試狀態管理功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window.electronAPI
const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();
const mockValidatePaths = vi.fn();

vi.stubGlobal('window', {
  electronAPI: {
    getConfig: mockGetConfig,
    saveConfig: mockSaveConfig,
    validatePaths: mockValidatePaths,
  },
});

// 動態 import 以便在 mock 之後載入
const {
  getConfig,
  setConfig,
  loadConfig,
  saveConfig,
  isConfigLoaded,
  resetConfig,
  validateAllPaths,
  isPathValid,
  getInvalidPathDirectories,
} = await import('../src/renderer/scripts/state.js');

describe('state.js', () => {
  beforeEach(() => {
    // 重設狀態
    resetConfig();
    vi.clearAllMocks();
  });

  describe('isConfigLoaded', () => {
    it('配置未載入時應返回 false', () => {
      expect(isConfigLoaded()).toBe(false);
    });

    it('配置載入後應返回 true', () => {
      setConfig({ test: true });
      expect(isConfigLoaded()).toBe(true);
    });

    it('重設配置後應返回 false', () => {
      setConfig({ test: true });
      resetConfig();
      expect(isConfigLoaded()).toBe(false);
    });
  });

  describe('getConfig / setConfig', () => {
    it('應正確設定和取得配置', () => {
      const testConfig = { directories: [], terminals: [] };
      setConfig(testConfig);
      expect(getConfig()).toBe(testConfig);
    });

    it('配置未設定時應返回 null', () => {
      expect(getConfig()).toBeNull();
    });
  });

  describe('resetConfig', () => {
    it('應將配置重設為 null', () => {
      setConfig({ test: true });
      expect(getConfig()).not.toBeNull();

      resetConfig();
      expect(getConfig()).toBeNull();
    });
  });

  describe('loadConfig', () => {
    it('應從 API 載入配置', async () => {
      const mockConfig = { directories: [], terminals: [] };
      mockGetConfig.mockResolvedValue(mockConfig);

      const result = await loadConfig();

      expect(mockGetConfig).toHaveBeenCalled();
      expect(result).toBe(mockConfig);
      expect(getConfig()).toBe(mockConfig);
    });
  });

  describe('saveConfig', () => {
    it('應將配置儲存到 API', async () => {
      const testConfig = { directories: [], terminals: [] };
      setConfig(testConfig);
      mockSaveConfig.mockResolvedValue(true);

      const result = await saveConfig();

      expect(mockSaveConfig).toHaveBeenCalledWith(testConfig);
      expect(result).toBe(true);
    });
  });

  describe('validateAllPaths', () => {
    it('配置未載入時應返回空物件', async () => {
      const result = await validateAllPaths();
      expect(result).toEqual({});
    });

    it('應驗證所有目錄路徑', async () => {
      const testConfig = {
        directories: [
          { id: 1, path: '/path/a' },
          { id: 2, path: '/path/b' },
        ],
      };
      setConfig(testConfig);
      mockValidatePaths.mockResolvedValue({
        '/path/a': true,
        '/path/b': false,
      });

      const result = await validateAllPaths();

      expect(mockValidatePaths).toHaveBeenCalledWith(['/path/a', '/path/b']);
      expect(result).toEqual({ '/path/a': true, '/path/b': false });
    });

    it('應去除重複路徑', async () => {
      const testConfig = {
        directories: [
          { id: 1, path: '/same/path' },
          { id: 2, path: '/same/path' },
        ],
      };
      setConfig(testConfig);
      mockValidatePaths.mockResolvedValue({ '/same/path': true });

      await validateAllPaths();

      expect(mockValidatePaths).toHaveBeenCalledWith(['/same/path']);
    });
  });

  describe('isPathValid', () => {
    it('未驗證的路徑應返回 null', () => {
      expect(isPathValid('/unknown/path')).toBeNull();
    });

    it('驗證後應返回正確的狀態', async () => {
      const testConfig = {
        directories: [{ id: 1, path: '/test/path' }],
      };
      setConfig(testConfig);
      mockValidatePaths.mockResolvedValue({ '/test/path': false });

      await validateAllPaths();

      expect(isPathValid('/test/path')).toBe(false);
    });
  });

  describe('getInvalidPathDirectories', () => {
    it('配置未載入時應返回空陣列', () => {
      expect(getInvalidPathDirectories()).toEqual([]);
    });

    it('應返回無效路徑的目錄', async () => {
      const testConfig = {
        directories: [
          { id: 1, path: '/valid', name: 'Valid' },
          { id: 2, path: '/invalid', name: 'Invalid' },
        ],
      };
      setConfig(testConfig);
      mockValidatePaths.mockResolvedValue({
        '/valid': true,
        '/invalid': false,
      });

      await validateAllPaths();
      const invalid = getInvalidPathDirectories();

      expect(invalid).toHaveLength(1);
      expect(invalid[0].name).toBe('Invalid');
    });
  });
});
