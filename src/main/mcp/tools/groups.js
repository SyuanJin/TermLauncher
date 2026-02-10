/**
 * MCP 工具：群組管理
 * list_groups, add_group, remove_group
 */
const { loadConfig, saveConfig } = require('../../config');
const { getMainWindow } = require('../../window');

/**
 * 通知前端配置已變更
 */
function notifyConfigChanged() {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('config-changed');
  }
}

/**
 * 註冊群組相關 MCP 工具
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('zod').ZodType} z
 */
function registerGroupTools(server, z) {
  // 列出群組
  server.tool('list_groups', 'List all project groups', {}, async () => {
    const config = loadConfig();
    const groups = (config.groups || []).map(g => {
      const dirCount = (config.directories || []).filter(d => d.group === g.id).length;
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        isDefault: g.isDefault,
        order: g.order,
        directoryCount: dirCount,
      };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }],
    };
  });

  // 新增群組
  server.tool(
    'add_group',
    'Add a new project group',
    {
      name: z.string().describe('Group display name'),
      icon: z.string().optional().describe('Emoji icon (default: 📁)'),
    },
    async ({ name, icon }) => {
      const config = loadConfig();

      // 檢查名稱是否重複
      const existing = config.groups.find(g => g.name === name);
      if (existing) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Group name already exists' }) }],
          isError: true,
        };
      }

      const newGroup = {
        id: `group-${Date.now()}`,
        name,
        icon: icon || '📁',
        isDefault: false,
        order: config.groups.length,
      };

      config.groups.push(newGroup);
      saveConfig(config);
      notifyConfigChanged();

      return {
        content: [{ type: 'text', text: JSON.stringify(newGroup, null, 2) }],
      };
    }
  );

  // 移除群組
  server.tool(
    'remove_group',
    'Remove a project group (directories will be moved to default group)',
    {
      id: z.string().describe('Group ID to remove'),
    },
    async ({ id }) => {
      const config = loadConfig();
      const groupIndex = config.groups.findIndex(g => g.id === id);

      if (groupIndex === -1) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Group not found' }) }],
          isError: true,
        };
      }

      const group = config.groups[groupIndex];
      if (group.isDefault) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ error: 'Cannot remove default group' }) },
          ],
          isError: true,
        };
      }

      // 將該群組的目錄移到預設群組
      const movedCount = config.directories.filter(d => d.group === id).length;
      config.directories.forEach(d => {
        if (d.group === id) {
          d.group = 'default';
        }
      });

      config.groups.splice(groupIndex, 1);
      saveConfig(config);
      notifyConfigChanged();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              removed: group.name,
              movedDirectories: movedCount,
            }),
          },
        ],
      };
    }
  );
}

module.exports = { registerGroupTools };
