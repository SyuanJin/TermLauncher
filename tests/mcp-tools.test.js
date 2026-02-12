/**
 * MCP 工具模組測試
 * 使用真實 config 模組進行整合測試
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

const { invalidateConfigCache, configPath, loadConfig } = require('../src/main/config.js');

// ===== Test helpers =====

/** 寫入測試配置並清除快取 */
function writeTestConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');
  invalidateConfigCache();
}

/** 建立標準測試配置 */
function createTestConfig() {
  return {
    directories: [
      {
        id: 1,
        name: 'Project A',
        icon: '📁',
        path: '/tmp',
        terminalId: 'term-1',
        group: 'default',
        lastUsed: 1000000,
        order: 0,
      },
      {
        id: 2,
        name: 'Project B',
        icon: '📂',
        path: '/home',
        terminalId: 'term-1',
        group: 'work',
        lastUsed: 2000000,
        order: 1,
      },
    ],
    terminals: [
      {
        id: 'term-1',
        name: 'Terminal',
        icon: '🖥️',
        command: 'bash {path}',
        pathFormat: 'unix',
        isBuiltin: true,
        hidden: false,
        order: 0,
      },
    ],
    groups: [
      { id: 'default', name: 'Default', icon: '📁', isDefault: true, order: 0 },
      { id: 'work', name: 'Work', icon: '💼', isDefault: false, order: 1 },
    ],
    favorites: [1],
    settings: {
      theme: 'dark',
      recentLimit: 10,
      language: 'zh-TW',
      showTabText: true,
      startMinimized: false,
      minimizeToTray: true,
      globalShortcut: 'Alt+Space',
      mcp: { enabled: true, port: 23549 },
    },
  };
}

/** 建立 mock server 和 z 物件，擷取 handler */
function createMockServerAndZ() {
  const handlers = {};
  const server = {
    tool: (name, _desc, _schema, handler) => {
      handlers[name] = handler;
    },
  };
  const schemaMock = {
    optional: () => schemaMock,
    describe: () => schemaMock,
    min: () => schemaMock,
    int: () => schemaMock,
  };
  const z = { string: () => schemaMock, number: () => schemaMock };
  return { server, z, handlers };
}

/** 解析 MCP tool 回傳的 JSON */
function parseResult(result) {
  return JSON.parse(result.content[0].text);
}

// ===== Tests =====

describe('MCP Tools', () => {
  beforeEach(() => {
    writeTestConfig(createTestConfig());
  });

  afterEach(() => {
    invalidateConfigCache();
    try {
      fs.unlinkSync(configPath);
    } catch {}
  });

  // ===== Projects =====

  describe('projects', () => {
    let handlers;

    beforeEach(() => {
      const { server, z, handlers: h } = createMockServerAndZ();
      handlers = h;
      const { registerProjectTools } = require('../src/main/mcp/tools/projects');
      registerProjectTools(server, z);
    });

    it('list_projects 應列出所有專案', async () => {
      const result = await handlers.list_projects({});
      const data = parseResult(result);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Project A');
      expect(data[0].groupName).toBe('Default');
      expect(data[0].terminalName).toBe('Terminal');
    });

    it('list_projects 應支援群組過濾', async () => {
      const result = await handlers.list_projects({ group: 'work' });
      const data = parseResult(result);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Project B');
    });

    it('add_project 應新增專案', async () => {
      // 使用真實存在的路徑
      const result = await handlers.add_project({ name: 'New Project', path: '/var' });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.id).toBe(3);
      expect(data.name).toBe('New Project');
      expect(data.group).toBe('default');
      // 驗證已寫入磁碟
      invalidateConfigCache();
      const config = loadConfig();
      expect(config.directories).toHaveLength(3);
    });

    it('add_project 應拒絕空白名稱', async () => {
      const result = await handlers.add_project({ name: '   ', path: '/tmp' });
      expect(result.isError).toBe(true);
    });

    it('add_project 應拒絕不安全路徑', async () => {
      const result = await handlers.add_project({ name: 'Bad', path: '/tmp/; rm -rf /' });
      expect(result.isError).toBe(true);
    });

    it('add_project 應拒絕不存在的路徑', async () => {
      const result = await handlers.add_project({
        name: 'Missing',
        path: '/tmp/nonexistent_test_path_xyz',
      });
      expect(result.isError).toBe(true);
    });

    it('add_project 應拒絕重複路徑', async () => {
      const result = await handlers.add_project({ name: 'Dup', path: '/tmp' });
      expect(result.isError).toBe(true);
    });

    it('update_project 應更新專案', async () => {
      const result = await handlers.update_project({ id: 1, name: 'Renamed' });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.name).toBe('Renamed');
      // 驗證已寫入磁碟
      invalidateConfigCache();
      expect(loadConfig().directories[0].name).toBe('Renamed');
    });

    it('update_project 應拒絕不存在的 ID', async () => {
      const result = await handlers.update_project({ id: 999, name: 'X' });
      expect(result.isError).toBe(true);
    });

    it('remove_project 應移除專案並清除最愛', async () => {
      const result = await handlers.remove_project({ id: 1 });
      const data = parseResult(result);
      expect(data.success).toBe(true);
      expect(data.removed).toBe('Project A');
      // 驗證已寫入磁碟
      invalidateConfigCache();
      const config = loadConfig();
      expect(config.directories).toHaveLength(1);
      expect(config.favorites).not.toContain(1);
    });

    it('remove_project 應拒絕不存在的 ID', async () => {
      const result = await handlers.remove_project({ id: 999 });
      expect(result.isError).toBe(true);
    });
  });

  // ===== Groups =====

  describe('groups', () => {
    let handlers;

    beforeEach(() => {
      const { server, z, handlers: h } = createMockServerAndZ();
      handlers = h;
      const { registerGroupTools } = require('../src/main/mcp/tools/groups');
      registerGroupTools(server, z);
    });

    it('list_groups 應列出群組及目錄數', async () => {
      const result = await handlers.list_groups({});
      const data = parseResult(result);
      expect(data).toHaveLength(2);
      const def = data.find(g => g.id === 'default');
      expect(def.directoryCount).toBe(1);
      const work = data.find(g => g.id === 'work');
      expect(work.directoryCount).toBe(1);
    });

    it('add_group 應新增群組', async () => {
      const result = await handlers.add_group({ name: 'Personal', icon: '🏠' });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.name).toBe('Personal');
      expect(data.icon).toBe('🏠');
      expect(data.isDefault).toBe(false);
      // 驗證已寫入磁碟
      invalidateConfigCache();
      expect(loadConfig().groups).toHaveLength(3);
    });

    it('add_group 應拒絕重複名稱', async () => {
      const result = await handlers.add_group({ name: 'Default' });
      expect(result.isError).toBe(true);
    });

    it('add_group 應拒絕空白名稱', async () => {
      const result = await handlers.add_group({ name: '  ' });
      expect(result.isError).toBe(true);
    });

    it('remove_group 應移除群組並移動目錄到預設', async () => {
      const result = await handlers.remove_group({ id: 'work' });
      const data = parseResult(result);
      expect(data.success).toBe(true);
      expect(data.movedDirectories).toBe(1);
      // 驗證目錄已移到 default
      invalidateConfigCache();
      const config = loadConfig();
      expect(config.groups).toHaveLength(1);
      expect(config.directories.find(d => d.id === 2).group).toBe('default');
    });

    it('remove_group 應拒絕移除預設群組', async () => {
      const result = await handlers.remove_group({ id: 'default' });
      expect(result.isError).toBe(true);
    });

    it('remove_group 應拒絕不存在的群組', async () => {
      const result = await handlers.remove_group({ id: 'nonexistent' });
      expect(result.isError).toBe(true);
    });
  });

  // ===== Favorites =====

  describe('favorites', () => {
    let handlers;

    beforeEach(() => {
      const { server, z, handlers: h } = createMockServerAndZ();
      handlers = h;
      const { registerFavoriteTools } = require('../src/main/mcp/tools/favorites');
      registerFavoriteTools(server, z);
    });

    it('list_favorites 應列出最愛目錄', async () => {
      const result = await handlers.list_favorites({});
      const data = parseResult(result);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Project A');
    });

    it('toggle_favorite 應加入最愛', async () => {
      const result = await handlers.toggle_favorite({ directoryId: 2 });
      const data = parseResult(result);
      expect(data.isFavorite).toBe(true);
      invalidateConfigCache();
      expect(loadConfig().favorites).toContain(2);
    });

    it('toggle_favorite 應移除最愛', async () => {
      const result = await handlers.toggle_favorite({ directoryId: 1 });
      const data = parseResult(result);
      expect(data.isFavorite).toBe(false);
      invalidateConfigCache();
      expect(loadConfig().favorites).not.toContain(1);
    });

    it('toggle_favorite 應拒絕不存在的目錄', async () => {
      const result = await handlers.toggle_favorite({ directoryId: 999 });
      expect(result.isError).toBe(true);
    });
  });

  // ===== Recent =====

  describe('recent', () => {
    let handlers;

    beforeEach(() => {
      const { server, z, handlers: h } = createMockServerAndZ();
      handlers = h;
      const { registerRecentTools } = require('../src/main/mcp/tools/recent');
      registerRecentTools(server, z);
    });

    it('list_recent 應按 lastUsed 降冪排序', async () => {
      const result = await handlers.list_recent({});
      const data = parseResult(result);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Project B'); // lastUsed: 2000000
      expect(data[1].name).toBe('Project A'); // lastUsed: 1000000
    });

    it('list_recent 應尊重 limit 參數', async () => {
      const result = await handlers.list_recent({ limit: 1 });
      const data = parseResult(result);
      expect(data).toHaveLength(1);
    });

    it('list_recent 應排除無 lastUsed 的目錄', async () => {
      // 修改配置使 Project A 無 lastUsed
      const config = createTestConfig();
      config.directories[0].lastUsed = null;
      writeTestConfig(config);

      const result = await handlers.list_recent({});
      const data = parseResult(result);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Project B');
    });
  });
});
