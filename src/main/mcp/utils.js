/**
 * MCP 共用工具函數
 */
const { getMainWindow } = require('../window');

/**
 * 通知前端配置已變更
 */
function notifyConfigChanged() {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('config-changed');
  }
}

module.exports = { notifyConfigChanged };
