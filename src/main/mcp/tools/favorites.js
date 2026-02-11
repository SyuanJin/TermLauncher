/**
 * MCP 工具：最愛管理
 * list_favorites, toggle_favorite
 */
const { loadConfig, saveConfig } = require('../../config');
const { notifyConfigChanged } = require('../utils');

/**
 * 註冊最愛相關 MCP 工具
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('zod').ZodType} z
 */
function registerFavoriteTools(server, z) {
  // 列出最愛
  server.tool('list_favorites', 'List all favorite directories', {}, async () => {
    const config = loadConfig();
    const favorites = config.favorites || [];
    const directories = config.directories || [];
    const terminals = config.terminals || [];
    const groups = config.groups || [];

    const result = favorites
      .map(fId => {
        const dir = directories.find(d => d.id === fId);
        if (!dir) return null;
        return {
          id: dir.id,
          name: dir.name,
          icon: dir.icon,
          path: dir.path,
          terminalId: dir.terminalId,
          terminalName: terminals.find(t => t.id === dir.terminalId)?.name || dir.terminalId,
          group: dir.group,
          groupName: groups.find(g => g.id === dir.group)?.name || dir.group,
        };
      })
      .filter(Boolean);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  });

  // 切換最愛
  server.tool(
    'toggle_favorite',
    'Toggle a directory as favorite',
    {
      directoryId: z.number().describe('Directory ID to toggle'),
    },
    async ({ directoryId }) => {
      const config = loadConfig();

      // 檢查目錄是否存在
      const dir = config.directories.find(d => d.id === directoryId);
      if (!dir) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Directory not found' }) }],
          isError: true,
        };
      }

      if (!config.favorites) config.favorites = [];

      const favIndex = config.favorites.indexOf(directoryId);
      let isFavorite;
      if (favIndex === -1) {
        config.favorites.push(directoryId);
        isFavorite = true;
      } else {
        config.favorites.splice(favIndex, 1);
        isFavorite = false;
      }

      saveConfig(config);
      notifyConfigChanged();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              directoryId,
              name: dir.name,
              isFavorite,
            }),
          },
        ],
      };
    }
  );
}

module.exports = { registerFavoriteTools };
