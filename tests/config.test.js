/**
 * 配置遷移邏輯測試
 * 測試 config-migration 純工具模組
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { migrateConfig } = require('../src/main/utils/config-migration.js');

// 測試用的預設值（模擬 Linux 環境）
const defaultTerminals = [
  {
    id: 'file-manager',
    name: 'File Manager',
    icon: '📂',
    command: 'xdg-open {path}',
    pathFormat: 'unix',
    isBuiltin: true,
    hidden: false,
    order: 0,
  },
  {
    id: 'default-terminal',
    name: 'Terminal',
    icon: '🖥️',
    command: 'x-terminal-emulator --working-directory={path}',
    pathFormat: 'unix',
    isBuiltin: true,
    hidden: false,
    order: 1,
  },
];

const defaultGroups = [
  { id: 'default', name: '預設', icon: '📁', isDefault: true, order: 0 },
];

const defaultSettings = {
  autoLaunch: false,
  startMinimized: false,
  minimizeToTray: true,
  globalShortcut: 'Alt+Space',
  theme: 'dark',
  language: 'zh-TW',
  showTabText: true,
  recentLimit: 10,
  mcp: { enabled: true, port: 23549 },
};

const opts = { defaultTerminals, defaultGroups, defaultSettings };

describe('migrateConfig', () => {
  describe('終端遷移', () => {
    it('應該在缺少 terminals 時補上預設終端', () => {
      const config = { groups: [...defaultGroups], directories: [], favorites: [] };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(migrated.terminals.length).toBeGreaterThanOrEqual(1);
      expect(needsSave).toBe(true);
    });

    it('應該為終端補上缺少的 hidden 欄位', () => {
      const config = {
        terminals: [
          { id: 'custom', name: 'Custom', command: 'test {path}', pathFormat: 'unix', order: 0 },
        ],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      const custom = migrated.terminals.find(t => t.id === 'custom');
      expect(custom.hidden).toBe(false);
      expect(needsSave).toBe(true);
    });

    it('應該為終端補上缺少的 order 欄位', () => {
      const config = {
        terminals: [
          {
            id: 'custom',
            name: 'Custom',
            command: 'test {path}',
            pathFormat: 'unix',
            hidden: false,
          },
        ],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      const custom = migrated.terminals.find(t => t.id === 'custom');
      expect(typeof custom.order).toBe('number');
      expect(needsSave).toBe(true);
    });

    it('應該保留內建終端的使用者 hidden/order 設定', () => {
      const config = {
        terminals: [{ ...defaultTerminals[0], hidden: true, order: 99 }],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
      };
      const { config: migrated } = migrateConfig(config, opts);

      const builtin = migrated.terminals.find(t => t.id === 'file-manager');
      expect(builtin.hidden).toBe(true);
      expect(builtin.order).toBe(99);
    });

    it('應該補上缺少的內建終端', () => {
      const config = {
        terminals: [
          {
            id: 'custom-only',
            name: 'Custom',
            command: 'test {path}',
            pathFormat: 'unix',
            hidden: false,
            order: 0,
          },
        ],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      const fm = migrated.terminals.find(t => t.id === 'file-manager');
      expect(fm).toBeDefined();
      const term = migrated.terminals.find(t => t.id === 'default-terminal');
      expect(term).toBeDefined();
    });

    it('應該按 order 排序終端', () => {
      const config = {
        terminals: [
          { id: 'b', name: 'B', command: 'b {path}', pathFormat: 'unix', hidden: false, order: 2 },
          { id: 'a', name: 'A', command: 'a {path}', pathFormat: 'unix', hidden: false, order: 1 },
        ],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
      };
      const { config: migrated } = migrateConfig(config, opts);

      const nonBuiltin = migrated.terminals.filter(
        t => !defaultTerminals.some(dt => dt.id === t.id)
      );
      expect(nonBuiltin[0].id).toBe('a');
      expect(nonBuiltin[1].id).toBe('b');
    });
  });

  describe('群組遷移', () => {
    it('應該從舊版字串陣列格式遷移', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: ['預設', '工作', '個人'],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.groups.length).toBe(3);
      expect(migrated.groups[0].id).toBe('default');
      expect(migrated.groups[0].isDefault).toBe(true);
      migrated.groups.forEach(g => {
        expect(typeof g.id).toBe('string');
        expect(typeof g.name).toBe('string');
        expect(typeof g.icon).toBe('string');
        expect(typeof g.order).toBe('number');
      });
    });

    it('應該在缺少群組時建立預設群組', () => {
      const config = {
        terminals: [...defaultTerminals],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.groups.length).toBe(1);
      expect(migrated.groups[0].id).toBe('default');
      expect(migrated.groups[0].isDefault).toBe(true);
    });

    it('應該在沒有預設群組時補上', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [{ id: 'work', name: '工作', icon: '💼', isDefault: false, order: 0 }],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      const defGroup = migrated.groups.find(g => g.isDefault || g.id === 'default');
      expect(defGroup).toBeDefined();
    });

    it('應該為物件群組補上缺少的欄位', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [{ name: '預設' }, { name: '工作' }],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      migrated.groups.forEach(g => {
        expect(g.id).toBeDefined();
        expect(g.icon).toBeDefined();
        expect(g.isDefault).toBeDefined();
        expect(typeof g.order).toBe('number');
      });
    });
  });

  describe('目錄遷移', () => {
    it('應該將舊版 type 欄位遷移為 terminalId', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [
          { id: 1, name: 'test', path: '/test', type: 'wsl', group: 'default' },
          { id: 2, name: 'test2', path: '/test2', type: 'powershell', group: 'default' },
        ],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.directories[0].terminalId).toBe('wsl-ubuntu');
      expect(migrated.directories[0].type).toBeUndefined();
      expect(migrated.directories[1].terminalId).toBe('powershell');
    });

    it('應該為目錄補上缺少的 icon 和 order', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [{ id: 1, name: 'test', path: '/test', terminalId: 'file-manager' }],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.directories[0].icon).toBe('📁');
      expect(typeof migrated.directories[0].order).toBe('number');
    });

    it('應該將群組名稱映射為群組 ID', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [
          { id: 'default', name: '預設', icon: '📁', isDefault: true, order: 0 },
          { id: 'work-123', name: '工作', icon: '💼', isDefault: false, order: 1 },
        ],
        directories: [
          {
            id: 1,
            name: 'test',
            path: '/test',
            terminalId: 'file-manager',
            group: '工作',
            icon: '📁',
            order: 0,
          },
        ],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.directories[0].group).toBe('work-123');
    });

    it('應該在找不到群組時歸類到預設', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [
          {
            id: 1,
            name: 'test',
            path: '/test',
            terminalId: 'file-manager',
            group: '不存在的群組',
            icon: '📁',
            order: 0,
          },
        ],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.directories[0].group).toBe('default');
    });
  });

  describe('favorites 遷移', () => {
    it('應該在缺少 favorites 時建立空陣列', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(Array.isArray(migrated.favorites)).toBe(true);
      expect(migrated.favorites.length).toBe(0);
    });
  });

  describe('settings 遷移', () => {
    it('應該在缺少 settings 時使用預設值', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.settings).toBeDefined();
      expect(migrated.settings.theme).toBe('dark');
      expect(migrated.settings.language).toBe('zh-TW');
    });

    it('應該補上缺少的 showTabText 設定', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
        settings: { theme: 'dark', language: 'zh-TW' },
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.settings.showTabText).toBe(true);
    });

    it('應該補上缺少的 recentLimit 設定', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
        settings: { theme: 'dark', showTabText: true },
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.settings.recentLimit).toBe(10);
    });

    it('應該補上缺少的 MCP 設定', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [...defaultGroups],
        directories: [],
        favorites: [],
        settings: { theme: 'dark', showTabText: true, recentLimit: 10 },
      };
      const { config: migrated, needsSave } = migrateConfig(config, opts);

      expect(needsSave).toBe(true);
      expect(migrated.settings.mcp).toBeDefined();
      expect(migrated.settings.mcp.enabled).toBe(true);
      expect(migrated.settings.mcp.port).toBe(23549);
    });

    it('已有完整設定時不應需要儲存', () => {
      const config = {
        terminals: [...defaultTerminals],
        groups: [{ id: 'default', name: '預設', icon: '📁', isDefault: true, order: 0 }],
        directories: [],
        favorites: [],
        settings: {
          theme: 'dark',
          language: 'zh-TW',
          showTabText: true,
          recentLimit: 10,
          mcp: { enabled: true, port: 23549 },
        },
      };
      const { needsSave } = migrateConfig(config, opts);
      expect(needsSave).toBe(false);
    });
  });
});
