/**
 * IPC 事件處理模組
 * 處理主進程與渲染進程之間的通訊
 */
const { ipcMain, dialog, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { loadConfig, saveConfig, wasConfigCorrupted, defaultConfig } = require('./config');
const { openTerminal } = require('./terminal');
const { registerShortcut, getLastRegistrationResult } = require('./shortcuts');
const { getMainWindow } = require('./window');
const { getAvailableLocales, loadLocale } = require('./i18n');
const { updateTrayMenu } = require('./tray');
const { createLogger } = require('./logger');

const logger = createLogger('IPC');

/**
 * 設定所有 IPC 事件處理器
 */
function setupIpcHandlers() {
  // 取得配置
  ipcMain.handle('get-config', () => {
    return loadConfig();
  });

  // 儲存配置
  ipcMain.handle('save-config', (event, config) => {
    const result = saveConfig(config);
    if (result) {
      registerShortcut(); // 重新註冊快捷鍵
    }
    return result;
  });

  // 開啟終端
  ipcMain.handle('open-terminal', (event, dir) => {
    const config = loadConfig();

    // 更新最近使用時間
    const dirIndex = config.directories.findIndex(d => d.id === dir.id);
    if (dirIndex !== -1) {
      config.directories[dirIndex].lastUsed = Date.now();
      saveConfig(config);
    }

    // 取得終端配置
    const terminalId = dir.terminalId || 'wsl-ubuntu';
    const terminal = config.terminals?.find(t => t.id === terminalId);

    if (!terminal) {
      return { success: false, error: 'Terminal config not found' };
    }

    return openTerminal(dir, terminal);
  });

  // 匯出配置
  ipcMain.handle('export-config', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '匯出設定',
      defaultPath: 'termlauncher-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!result.canceled && result.filePath) {
      const config = loadConfig();
      fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  // 匯入配置
  ipcMain.handle('import-config', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '匯入設定',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const data = fs.readFileSync(result.filePaths[0], 'utf-8');
        const config = JSON.parse(data);
        saveConfig(config);
        return { success: true, config };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false };
  });

  // 選擇資料夾
  ipcMain.handle('select-folder', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '選擇資料夾',
      properties: ['openDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });

  // 取得可用語系列表
  ipcMain.handle('get-available-locales', () => {
    return getAvailableLocales();
  });

  // 載入語系
  ipcMain.handle('load-locale', (event, localeCode) => {
    const locale = loadLocale(localeCode);
    // 更新托盤選單語言
    updateTrayMenu();
    return locale;
  });

  // 設定開機自動啟動
  ipcMain.handle('set-auto-launch', (event, enabled) => {
    const config = loadConfig();
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: config.settings.startMinimized || false,
    });
    config.settings.autoLaunch = enabled;
    saveConfig(config);
    return { success: true, enabled };
  });

  // 取得開機自動啟動狀態
  ipcMain.handle('get-auto-launch', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  // 檢查配置是否曾損壞
  ipcMain.handle('check-config-corrupted', () => {
    return wasConfigCorrupted();
  });

  // 取得快捷鍵註冊狀態
  ipcMain.handle('get-shortcut-status', () => {
    return getLastRegistrationResult();
  });

  // 開啟外部連結
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
    return { success: true };
  });

  // 開啟設定目錄
  ipcMain.handle('open-config-directory', () => {
    const configPath = path.join(app.getPath('userData'));
    shell.openPath(configPath);
    return { success: true };
  });

  // 取得應用程式版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // 記錄前端錯誤
  const rendererLogger = createLogger('Renderer');
  ipcMain.handle('log-renderer-error', (event, error, context) => {
    rendererLogger.error(`[${context || 'Unknown'}] ${error.message}`, {
      stack: error.stack,
      context,
    });
    return { success: true };
  });

  // 清除日誌
  ipcMain.handle('clear-logs', () => {
    try {
      const logsPath = path.join(app.getPath('userData'), 'logs');
      if (fs.existsSync(logsPath)) {
        const files = fs.readdirSync(logsPath);
        files.forEach(file => {
          const filePath = path.join(logsPath, file);
          fs.unlinkSync(filePath);
        });
      }
      return { success: true };
    } catch (err) {
      logger.error('Failed to clear logs', err);
      return { success: false, error: err.message };
    }
  });

  // 重設所有設定
  ipcMain.handle('reset-config', () => {
    try {
      // 深拷貝預設設定
      const newConfig = JSON.parse(JSON.stringify(defaultConfig));
      saveConfig(newConfig);
      return { success: true, config: newConfig };
    } catch (err) {
      logger.error('Failed to reset config', err);
      return { success: false, error: err.message };
    }
  });

  // 視窗控制
  ipcMain.on('minimize-window', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('close-window', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.close();
  });
}

module.exports = {
  setupIpcHandlers,
};
