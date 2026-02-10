/**
 * MCP 工具：啟動器管理
 * list_launchers, open_in, detect_installed_launchers
 */
const { loadConfig, saveConfig } = require('../../config');
const { openTerminal, detectInstalledTerminals } = require('../../terminal');
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
 * 註冊啟動器相關 MCP 工具
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('zod').ZodType} z
 */
function registerLauncherTools(server, z) {
  // 列出啟動器
  server.tool('list_launchers', 'List all available launchers', {}, async () => {
    const config = loadConfig();
    const terminals = (config.terminals || []).map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      command: t.command,
      pathFormat: t.pathFormat,
      isBuiltin: t.isBuiltin,
      hidden: t.hidden,
      order: t.order,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(terminals, null, 2) }],
    };
  });

  // 以指定啟動器開啟目錄
  server.tool(
    'open_in',
    'Open a directory with a specified launcher (terminal, editor, IDE, file manager, etc.)',
    {
      path: z.string().describe('Absolute path to the directory to open'),
      launcherId: z.string().describe('Launcher ID (use list_launchers to see available IDs)'),
    },
    async ({ path, launcherId }) => {
      const config = loadConfig();

      // 查找啟動器
      const terminal = config.terminals?.find(t => t.id === launcherId);
      if (!terminal) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Launcher not found',
                available: (config.terminals || []).map(t => ({ id: t.id, name: t.name })),
              }),
            },
          ],
          isError: true,
        };
      }

      // 更新最近使用時間（如果目錄在配置中）
      const dirIndex = config.directories.findIndex(d => d.path === path);
      if (dirIndex !== -1) {
        config.directories[dirIndex].lastUsed = Date.now();
        saveConfig(config);
        notifyConfigChanged();
      }

      // 開啟目錄
      const result = openTerminal({ path }, terminal);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Opened ${path} with ${terminal.name}`,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to open',
              errorType: result.errorType,
              errorDetail: result.errorDetail || result.error,
            }),
          },
        ],
        isError: true,
      };
    }
  );

  // 偵測已安裝的啟動器
  server.tool(
    'detect_installed_launchers',
    'Detect which launchers are installed on the system',
    {},
    async () => {
      const result = detectInstalledTerminals();

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

module.exports = { registerLauncherTools };
