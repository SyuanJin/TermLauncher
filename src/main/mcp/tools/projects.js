/**
 * MCP 工具：專案目錄管理
 * list_projects, add_project, update_project, remove_project
 */
const fs = require('fs');
const { loadConfig, saveConfig, getDefaultTerminalId } = require('../../config');
const { validatePathSafety } = require('../../utils/path-utils');
const { notifyConfigChanged } = require('../utils');

/**
 * 註冊專案相關 MCP 工具
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('zod').ZodType} z
 */
function registerProjectTools(server, z) {
  // 列出專案目錄
  server.tool(
    'list_projects',
    'List all project directories, optionally filtered by group',
    {
      group: z.string().optional().describe('Filter by group ID'),
    },
    async ({ group }) => {
      const config = loadConfig();
      let directories = config.directories || [];

      if (group) {
        directories = directories.filter(d => d.group === group);
      }

      // 附加群組名稱和啟動器名稱
      const groups = config.groups || [];
      const terminals = config.terminals || [];

      const result = directories.map(d => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        path: d.path,
        terminalId: d.terminalId,
        terminalName: terminals.find(t => t.id === d.terminalId)?.name || d.terminalId,
        group: d.group,
        groupName: groups.find(g => g.id === d.group)?.name || d.group,
        lastUsed: d.lastUsed,
        order: d.order,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 新增專案目錄
  server.tool(
    'add_project',
    'Add a new project directory',
    {
      name: z.string().describe('Directory display name'),
      path: z.string().describe('Absolute path to the directory'),
      icon: z.string().optional().describe('Emoji icon (default: 📁)'),
      terminalId: z.string().optional().describe('Launcher ID to use (default: first available)'),
      group: z.string().optional().describe('Group ID (default: "default")'),
    },
    async ({ name, path, icon, terminalId, group }) => {
      // 驗證路徑安全性
      const pathSafety = validatePathSafety(path);
      if (!pathSafety.safe) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ error: `Unsafe path: ${pathSafety.reason}` }) },
          ],
          isError: true,
        };
      }

      // 驗證路徑是否存在且為目錄
      if (!fs.existsSync(path)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Path does not exist' }) }],
          isError: true,
        };
      }

      try {
        if (!fs.statSync(path).isDirectory()) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Path is not a directory' }) }],
            isError: true,
          };
        }
      } catch {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Cannot access path' }) }],
          isError: true,
        };
      }

      const config = loadConfig();

      // 檢查路徑是否已存在
      const existing = config.directories.find(d => d.path === path);
      if (existing) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { error: 'Directory with this path already exists', existing },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // 產生新 ID
      const maxId = Math.max(0, ...config.directories.map(d => d.id));
      const newDir = {
        id: maxId + 1,
        name,
        icon: icon || '📁',
        path,
        terminalId: terminalId || config.terminals?.[0]?.id || getDefaultTerminalId(),
        group: group || 'default',
        lastUsed: null,
        order: config.directories.length,
      };

      config.directories.push(newDir);
      saveConfig(config);
      notifyConfigChanged();

      return {
        content: [{ type: 'text', text: JSON.stringify(newDir, null, 2) }],
      };
    }
  );

  // 更新專案目錄
  server.tool(
    'update_project',
    'Update an existing project directory',
    {
      id: z.number().describe('Directory ID'),
      name: z.string().optional().describe('New display name'),
      path: z.string().optional().describe('New absolute path'),
      icon: z.string().optional().describe('New emoji icon'),
      terminalId: z.string().optional().describe('New launcher ID'),
      group: z.string().optional().describe('New group ID'),
    },
    async ({ id, name, path, icon, terminalId, group }) => {
      const config = loadConfig();
      const dirIndex = config.directories.findIndex(d => d.id === id);

      if (dirIndex === -1) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Directory not found' }) }],
          isError: true,
        };
      }

      // 若提供了新路徑，驗證安全性與存在性
      if (path !== undefined) {
        const pathSafety = validatePathSafety(path);
        if (!pathSafety.safe) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unsafe path: ${pathSafety.reason}` }),
              },
            ],
            isError: true,
          };
        }
        if (!fs.existsSync(path)) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Path does not exist' }) }],
            isError: true,
          };
        }
        try {
          if (!fs.statSync(path).isDirectory()) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ error: 'Path is not a directory' }) },
              ],
              isError: true,
            };
          }
        } catch {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Cannot access path' }) }],
            isError: true,
          };
        }
      }

      const dir = config.directories[dirIndex];
      if (name !== undefined) dir.name = name;
      if (path !== undefined) dir.path = path;
      if (icon !== undefined) dir.icon = icon;
      if (terminalId !== undefined) dir.terminalId = terminalId;
      if (group !== undefined) dir.group = group;

      saveConfig(config);
      notifyConfigChanged();

      return {
        content: [{ type: 'text', text: JSON.stringify(dir, null, 2) }],
      };
    }
  );

  // 移除專案目錄
  server.tool(
    'remove_project',
    'Remove a project directory',
    {
      id: z.number().describe('Directory ID to remove'),
    },
    async ({ id }) => {
      const config = loadConfig();
      const dirIndex = config.directories.findIndex(d => d.id === id);

      if (dirIndex === -1) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Directory not found' }) }],
          isError: true,
        };
      }

      const removed = config.directories.splice(dirIndex, 1)[0];

      // 從最愛中移除
      config.favorites = (config.favorites || []).filter(fId => fId !== id);

      saveConfig(config);
      notifyConfigChanged();

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, removed: removed.name }) }],
      };
    }
  );
}

module.exports = { registerProjectTools };
