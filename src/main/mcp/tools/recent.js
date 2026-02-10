/**
 * MCP 工具：最近使用
 * list_recent
 */
const { loadConfig } = require('../../config');

/**
 * 註冊最近使用相關 MCP 工具
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('zod').ZodType} z
 */
function registerRecentTools(server, z) {
  // 列出最近使用
  server.tool(
    'list_recent',
    'List recently used directories',
    {
      limit: z.number().optional().describe('Maximum number of results (default: from settings)'),
    },
    async ({ limit }) => {
      const config = loadConfig();
      const recentLimit = limit || config.settings?.recentLimit || 10;
      const terminals = config.terminals || [];
      const groups = config.groups || [];

      const recent = (config.directories || [])
        .filter(d => d.lastUsed)
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, recentLimit)
        .map(d => ({
          id: d.id,
          name: d.name,
          icon: d.icon,
          path: d.path,
          terminalId: d.terminalId,
          terminalName: terminals.find(t => t.id === d.terminalId)?.name || d.terminalId,
          group: d.group,
          groupName: groups.find(g => g.id === d.group)?.name || d.group,
          lastUsed: d.lastUsed,
          lastUsedAt: new Date(d.lastUsed).toISOString(),
        }));

      return {
        content: [{ type: 'text', text: JSON.stringify(recent, null, 2) }],
      };
    }
  );
}

module.exports = { registerRecentTools };
