/**
 * state.js 模組測試
 * 測試狀態管理功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window.electronAPI
const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();

vi.stubGlobal('window', {
  electronAPI: {
    getConfig: mockGetConfig,
    saveConfig: mockSaveConfig,
  },
});

// 動態 import 以便在 mock 之後載入
const {
  getConfig,
  setConfig,
  loadConfig,
  saveConfig,
  getConfigSnapshot,
  isConfigLoaded,
  resetConfig,
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

  describe('getConfigSnapshot', () => {
    it('配置未載入時應返回 null', () => {
      expect(getConfigSnapshot()).toBeNull();
    });

    it('應返回配置的深拷貝', () => {
      const testConfig = {
        directories: [{ id: 1, name: 'test' }],
        terminals: [{ id: 'wsl', name: 'WSL' }],
      };
      setConfig(testConfig);

      const snapshot = getConfigSnapshot();

      // 應該是不同的物件
      expect(snapshot).not.toBe(testConfig);
      // 內容應該相同
      expect(snapshot).toEqual(testConfig);
      // 深層物件也應該是不同的引用
      expect(snapshot.directories).not.toBe(testConfig.directories);
      expect(snapshot.directories[0]).not.toBe(testConfig.directories[0]);
    });

    it('修改快照不應影響原始配置', () => {
      const testConfig = {
        directories: [{ id: 1, name: 'original' }],
      };
      setConfig(testConfig);

      const snapshot = getConfigSnapshot();
      snapshot.directories[0].name = 'modified';

      // 原始配置應該不受影響
      expect(getConfig().directories[0].name).toBe('original');
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
});
