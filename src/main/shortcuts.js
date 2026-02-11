/**
 * 快捷鍵管理模組
 * 處理全域快捷鍵的註冊與管理
 */
const { globalShortcut } = require('electron');
const { loadConfig } = require('./config');
const { getMainWindow } = require('./window');
const { createLogger } = require('./logger');

const logger = createLogger('Shortcut');

/**
 * 錯誤類型常數
 */
const ShortcutError = {
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  INVALID_SHORTCUT: 'INVALID_SHORTCUT',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
};

/**
 * 最後一次註冊結果
 */
let lastRegistrationResult = null;

/**
 * 註冊全域快捷鍵
 * @param {string} [customShortcut] - 可選的自訂快捷鍵，若未提供則從配置讀取
 * @returns {Object} { success: boolean, shortcut: string, errorType?: string }
 */
function registerShortcut(customShortcut) {
  const config = loadConfig();
  const shortcut = customShortcut || config.settings.globalShortcut || 'Alt+Space';

  // 先取消所有已註冊的快捷鍵
  globalShortcut.unregisterAll();

  // 檢測快捷鍵是否已被其他程式佔用
  // 注意：Electron 的 isRegistered 只檢測本應用程式註冊的快捷鍵
  // 無法檢測系統或其他程式的佔用

  try {
    const success = globalShortcut.register(shortcut, () => {
      const mainWindow = getMainWindow();
      if (!mainWindow) return;

      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    if (success) {
      lastRegistrationResult = {
        success: true,
        shortcut,
      };
    } else {
      // 註冊失敗，可能是快捷鍵已被佔用
      logger.warn('Shortcut registration failed (may be occupied)', shortcut);
      lastRegistrationResult = {
        success: false,
        shortcut,
        errorType: ShortcutError.ALREADY_REGISTERED,
      };
    }

    return lastRegistrationResult;
  } catch (err) {
    logger.error('Shortcut registration error', err);
    lastRegistrationResult = {
      success: false,
      shortcut,
      errorType: ShortcutError.REGISTRATION_FAILED,
      error: err.message,
    };
    return lastRegistrationResult;
  }
}

/**
 * 取得最後一次註冊結果
 * @returns {Object|null}
 */
function getLastRegistrationResult() {
  return lastRegistrationResult;
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
  getLastRegistrationResult,
  ShortcutError,
};
