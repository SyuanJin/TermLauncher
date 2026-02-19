/**
 * MCP 共用工具函數
 */
const { getMainWindow } = require('../window');
const { updateTrayMenu } = require('../tray');

/**
 * 通知前端配置已變更
 */
function notifyConfigChanged() {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('config-changed');
  }
  updateTrayMenu();
}

module.exports = { notifyConfigChanged };
