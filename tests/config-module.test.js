/**
 * config.js 模組測試
 * 測試配置讀取、儲存、匯出匯入等核心功能
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import nodePath from 'path';

const {
  loadConfig,
  saveConfig,
  invalidateConfigCache,
  wasConfigCorrupted,
  defaultConfig,
  configPath,
  exportConfigAdvanced,
  importConfigAdvanced,
  getExportPreview,
  getDefaultTerminalId,
} = require('../src/main/config.js');

/**
 * 清理測試產生的檔案
 */
function cleanup() {
  const dir = nodePath.dirname(configPath);
  try {
    fs.unlinkSync(configPath);
  } catch {}
  try {
    fs.unlinkSync(configPath + '.tmp');
  } catch {}
  // 清除 backup 檔案
  try {
    const files = fs.readdirSync(dir);
    files
      .filter(f => f.startsWith('config.json.backup.'))
      .forEach(f => fs.unlinkSync(nodePath.join(dir, f)));
  } catch {}
}

describe('config 模組', () => {
  beforeEach(() => {
    invalidateConfigCache();
    cleanup();
    // 重置 corrupted flag（讀取一次即清除）
    wasConfigCorrupted();
  });

  afterEach(() => {
    invalidateConfigCache();
    cleanup();
  });

  // ===== loadConfig =====

  describe('loadConfig', () => {
    it('無配置檔時應回傳預設配置', () => {
      const config = loadConfig();
      expect(config).toEqual(defaultConfig);
    });

    it('應從檔案載入配置', () => {
      const testConfig = JSON.parse(JSON.stringify(defaultConfig));
      testConfig.settings.theme = 'light';
      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf-8');

      const config = loadConfig();
      expect(config.settings.theme).toBe('light');
    });

    it('後續呼叫應回傳快取（同一物件參考）', () => {
      const config1 = loadConfig();
      const config2 = loadConfig();
      expect(config1).toBe(config2);
    });

    it('JSON 損壞時應回傳預設配置並標記 corrupted', () => {
      fs.writeFileSync(configPath, '{invalid json!!!', 'utf-8');

      const config = loadConfig();
      expect(config).toEqual(defaultConfig);
      expect(wasConfigCorrupted()).toBe(true);
    });

    it('JSON 損壞時應建立備份檔', () => {
      fs.writeFileSync(configPath, 'corrupted', 'utf-8');
      loadConfig();

      const dir = nodePath.dirname(configPath);
      const files = fs.readdirSync(dir);
      const backups = files.filter(f => f.startsWith('config.json.backup.'));
      expect(backups.length).toBeGreaterThan(0);
    });
  });

  // ===== saveConfig =====

  describe('saveConfig', () => {
    it('應成功寫入配置並回傳 true', () => {
      const testConfig = JSON.parse(JSON.stringify(defaultConfig));
      const result = saveConfig(testConfig);

      expect(result).toBe(true);
      expect(fs.existsSync(configPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.settings.theme).toBe(testConfig.settings.theme);
    });

    it('儲存後快取應更新', () => {
      // 先載入一次建立快取
      loadConfig();

      const testConfig = JSON.parse(JSON.stringify(defaultConfig));
      testConfig.settings.theme = 'light';
      saveConfig(testConfig);

      // loadConfig 應回傳更新後的快取
      const loaded = loadConfig();
      expect(loaded.settings.theme).toBe('light');
    });

    it('應使用原子寫入（先寫 .tmp 再 rename）', () => {
      const testConfig = JSON.parse(JSON.stringify(defaultConfig));
      saveConfig(testConfig);

      // .tmp 檔案應已被清理
      expect(fs.existsSync(configPath + '.tmp')).toBe(false);
      // 正式檔案應存在
      expect(fs.existsSync(configPath)).toBe(true);
    });
  });

  // ===== invalidateConfigCache =====

  describe('invalidateConfigCache', () => {
    it('清除快取後應從磁碟重新載入', () => {
      // 寫入配置到磁碟，確保 loadConfig 走快取路徑
      const testConfig = JSON.parse(JSON.stringify(defaultConfig));
      testConfig.settings.theme = 'dark';
      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf-8');
      const config1 = loadConfig();
      expect(config1.settings.theme).toBe('dark');

      // 直接修改磁碟檔案
      const testConfig2 = JSON.parse(JSON.stringify(defaultConfig));
      testConfig2.settings.theme = 'light';
      fs.writeFileSync(configPath, JSON.stringify(testConfig2), 'utf-8');

      // 未清除快取時應回傳同一物件參考
      const config2 = loadConfig();
      expect(config2).toBe(config1);

      // 清除快取後應從磁碟重新載入
      invalidateConfigCache();
      const config3 = loadConfig();
      expect(config3.settings.theme).toBe('light');
    });
  });

  // ===== wasConfigCorrupted =====

  describe('wasConfigCorrupted', () => {
    it('無損壞時應回傳 false', () => {
      expect(wasConfigCorrupted()).toBe(false);
    });

    it('讀取後應重置為 false（只觸發一次）', () => {
      fs.writeFileSync(configPath, 'broken', 'utf-8');
      loadConfig();

      expect(wasConfigCorrupted()).toBe(true);
      expect(wasConfigCorrupted()).toBe(false);
    });
  });

  // ===== getDefaultTerminalId =====

  describe('getDefaultTerminalId', () => {
    it('應回傳非空字串', () => {
      const id = getDefaultTerminalId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  // ===== exportConfigAdvanced =====

  describe('exportConfigAdvanced', () => {
    it('預設應匯出所有區段', () => {
      const exported = exportConfigAdvanced();
      expect(exported.version).toBe('2.0');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('appVersion');
      expect(exported).toHaveProperty('terminals');
      expect(exported).toHaveProperty('groups');
      expect(exported).toHaveProperty('directories');
      expect(exported).toHaveProperty('settings');
      expect(exported).toHaveProperty('favorites');
    });

    it('應根據選項排除區段', () => {
      const exported = exportConfigAdvanced({
        includeTerminals: false,
        includeSettings: false,
      });
      expect(exported).not.toHaveProperty('terminals');
      expect(exported).not.toHaveProperty('settings');
      // 其他區段仍應存在
      expect(exported).toHaveProperty('directories');
      expect(exported).toHaveProperty('groups');
    });

    it('匯出的群組應排除預設群組', () => {
      const exported = exportConfigAdvanced();
      const hasDefault = exported.groups.some(g => g.isDefault);
      expect(hasDefault).toBe(false);
    });
  });

  // ===== getExportPreview =====

  describe('getExportPreview', () => {
    it('應回傳各區段數量', () => {
      const preview = getExportPreview();
      expect(typeof preview.terminalsCount).toBe('number');
      expect(typeof preview.groupsCount).toBe('number');
      expect(typeof preview.directoriesCount).toBe('number');
      expect(typeof preview.favoritesCount).toBe('number');
      expect(typeof preview.hasSettings).toBe('boolean');
    });
  });

  // ===== importConfigAdvanced =====

  describe('importConfigAdvanced', () => {
    it('無效資料應回傳失敗', () => {
      const result = importConfigAdvanced(null);
      expect(result.success).toBe(false);
    });

    it('空物件應成功匯入（無實際變更）', () => {
      const result = importConfigAdvanced({});
      expect(result.success).toBe(true);
    });

    it('合併模式應新增自訂終端', () => {
      // 確保初始配置已載入
      loadConfig();

      const importData = {
        terminals: [
          {
            id: 'test-term',
            name: 'Test Terminal',
            command: 'test {path}',
            pathFormat: 'unix',
            isBuiltin: false,
          },
        ],
      };

      const result = importConfigAdvanced(importData, { mergeTerminals: true });
      expect(result.success).toBe(true);

      invalidateConfigCache();
      const config = loadConfig();
      const found = config.terminals.find(t => t.name === 'Test Terminal');
      expect(found).toBeTruthy();
      expect(found.command).toBe('test {path}');
    });

    it('合併模式應跳過同名自訂終端', () => {
      // 先新增一個自訂終端
      const firstImport = {
        terminals: [
          {
            id: 'custom-1',
            name: 'My Custom Term',
            command: 'myterm {path}',
            pathFormat: 'unix',
            isBuiltin: false,
          },
        ],
      };
      importConfigAdvanced(firstImport, { mergeTerminals: true });

      invalidateConfigCache();
      const before = loadConfig().terminals.length;

      // 再次匯入同名終端，應被跳過
      const secondImport = {
        terminals: [
          {
            id: 'custom-2',
            name: 'My Custom Term',
            command: 'different {path}',
            pathFormat: 'unix',
            isBuiltin: false,
          },
        ],
      };
      importConfigAdvanced(secondImport, { mergeTerminals: true });

      invalidateConfigCache();
      const after = loadConfig();
      expect(after.terminals.length).toBe(before);
    });

    it('應合併群組並用 name 去重', () => {
      loadConfig();

      const importData = {
        groups: [
          {
            id: 'new-group',
            name: 'Work Projects',
            icon: '💼',
          },
        ],
      };

      const result = importConfigAdvanced(importData, { mergeGroups: true });
      expect(result.success).toBe(true);

      invalidateConfigCache();
      const config = loadConfig();
      const found = config.groups.find(g => g.name === 'Work Projects');
      expect(found).toBeTruthy();
    });

    it('應合併設定', () => {
      loadConfig();

      const importData = {
        settings: {
          theme: 'light',
          recentLimit: 20,
        },
      };

      const result = importConfigAdvanced(importData, { mergeSettings: true });
      expect(result.success).toBe(true);

      invalidateConfigCache();
      const config = loadConfig();
      expect(config.settings.theme).toBe('light');
      expect(config.settings.recentLimit).toBe(20);
    });
  });
});
