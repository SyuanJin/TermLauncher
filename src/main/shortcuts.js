/**
 * 快捷鍵管理模組
 * 處理全域快捷鍵的註冊與管理
 */
const { globalShortcut } = require('electron');
const { loadConfig } = require('./config');
const { getMainWindow } = require('./window');

/**
 * 註冊全域快捷鍵
 */
function registerShortcut() {
  const config = loadConfig();
  const shortcut = config.settings.globalShortcut || 'Alt+Space';

  globalShortcut.unregisterAll();

  try {
    globalShortcut.register(shortcut, () => {
      const mainWindow = getMainWindow();
      if (!mainWindow) return;

      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('註冊快捷鍵失敗:', err);
  }
}

/**
 * 取消所有快捷鍵註冊
 */
function unregisterAllShortcuts() {
  globalShortcut.unregisterAll();
}

module.exports = {
  registerShortcut,
  unregisterAllShortcuts,
};
