/**
 * IPC 事件處理模組
 * 處理主進程與渲染進程之間的通訊
 */
const { ipcMain, dialog, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  saveConfig,
  wasConfigCorrupted,
  defaultConfig,
  exportConfigAdvanced,
  importConfigAdvanced,
  getExportPreview,
} = require('./config');
const { openTerminal, previewCommand, detectInstalledTerminals } = require('./terminal');
const { registerShortcut, getLastRegistrationResult } = require('./shortcuts');
const { getMainWindow } = require('./window');
const { getAvailableLocales, loadLocale, t } = require('./i18n');
const { updateTrayMenu } = require('./tray');
const { startMcpServer, stopMcpServer, getMcpStatus } = require('./mcp');
const { createLogger } = require('./logger');
const {
  validateConfig,
  validateDirectory,
  validateExportOptions,
  validateImportOptions,
  validateLocaleCode,
  validateBoolean,
  validateSafeUrl,
  validateString,
} = require('./utils/ipc-validators');

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
    // 驗證配置物件
    const validation = validateConfig(config);
    if (!validation.valid) {
      logger.warn(`Invalid config: ${validation.error}`);
      return false;
    }

    const result = saveConfig(config);
    if (result) {
      registerShortcut(); // 重新註冊快捷鍵
    }
    return result;
  });

  // 開啟終端
  ipcMain.handle('open-terminal', (event, dir) => {
    // 驗證目錄物件
    const validation = validateDirectory(dir);
    if (!validation.valid) {
      logger.warn(`Invalid directory: ${validation.error}`);
      return { success: false, error: validation.error };
    }

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

  // 預覽終端命令
  ipcMain.handle('preview-command', (event, dir, terminalId) => {
    // 驗證目錄物件
    const validation = validateDirectory(dir);
    if (!validation.valid) {
      logger.warn(`Invalid directory: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    // 驗證 terminalId（如果提供）
    if (terminalId !== undefined && terminalId !== null) {
      const terminalValidation = validateString(terminalId, 'terminalId');
      if (!terminalValidation.valid) {
        logger.warn(`Invalid terminalId: ${terminalValidation.error}`);
        return { success: false, error: terminalValidation.error };
      }
    }

    const config = loadConfig();

    // 取得終端配置
    const terminal = config.terminals?.find(
      t => t.id === (terminalId || dir.terminalId || 'wsl-ubuntu')
    );

    if (!terminal) {
      return { success: false, error: 'Terminal config not found' };
    }

    return previewCommand(dir, terminal);
  });

  // 匯出配置（基本版）
  ipcMain.handle('export-config', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showSaveDialog(mainWindow, {
      title: t('dialog.exportTitle'),
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

  // 匯出配置（進階版）
  ipcMain.handle('export-config-advanced', async (event, options) => {
    // 驗證匯出選項
    const validation = validateExportOptions(options);
    if (!validation.valid) {
      logger.warn(`Invalid export options: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const mainWindow = getMainWindow();
    const result = await dialog.showSaveDialog(mainWindow, {
      title: t('dialog.exportTitle'),
      defaultPath: 'termlauncher-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!result.canceled && result.filePath) {
      const exportData = exportConfigAdvanced(options);
      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
      return { success: true, path: result.filePath, data: exportData };
    }
    return { success: false };
  });

  // 匯入配置（基本版）
  ipcMain.handle('import-config', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialog.importTitle'),
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

  // 匯入配置（進階版）
  ipcMain.handle('import-config-advanced', async (event, options) => {
    // 驗證匯入選項
    const validation = validateImportOptions(options);
    if (!validation.valid) {
      logger.warn(`Invalid import options: ${validation.error}`);
      return { success: false, errors: [validation.error] };
    }

    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialog.importTitle'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const data = fs.readFileSync(result.filePaths[0], 'utf-8');
        const importData = JSON.parse(data);

        return importConfigAdvanced(importData, options);
      } catch (err) {
        return { success: false, errors: [err.message] };
      }
    }
    return { success: false };
  });

  // 取得匯出預覽
  ipcMain.handle('get-export-preview', () => {
    return getExportPreview();
  });

  // 選擇資料夾
  ipcMain.handle('select-folder', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialog.selectFolder'),
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
    // 驗證語系代碼
    const validation = validateLocaleCode(localeCode);
    if (!validation.valid) {
      logger.warn(`Invalid locale code: ${validation.error}`);
      return null;
    }

    const locale = loadLocale(localeCode);
    // 更新托盤選單語言
    updateTrayMenu();
    return locale;
  });

  // 設定開機自動啟動
  ipcMain.handle('set-auto-launch', (event, enabled) => {
    // 驗證 enabled 參數
    const validation = validateBoolean(enabled, 'enabled');
    if (!validation.valid) {
      logger.warn(`Invalid enabled value: ${validation.error}`);
      return { success: false, enabled: false, reason: 'invalid-param' };
    }

    // 開發模式下不支援自動啟動（會啟動空白 Electron）
    if (!app.isPackaged) {
      logger.warn('Auto-launch not supported in dev mode');
      return { success: false, enabled: false, reason: 'dev-mode' };
    }

    const config = loadConfig();

    // 取得正確的可執行檔路徑
    // Portable 版本需要使用 PORTABLE_EXECUTABLE_FILE 環境變數
    let exePath = process.execPath;
    if (process.env.PORTABLE_EXECUTABLE_FILE) {
      exePath = process.env.PORTABLE_EXECUTABLE_FILE;
      logger.info(`Portable mode, using path: ${exePath}`);
    }

    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: config.settings.startMinimized || false,
      path: exePath,
    });
    config.settings.autoLaunch = enabled;
    saveConfig(config);

    // 回傳是否為 Portable 模式
    const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;
    return { success: true, enabled, isPortable };
  });

  // 取得開機自動啟動狀態
  ipcMain.handle('get-auto-launch', () => {
    // 開發模式下回傳 false
    if (!app.isPackaged) {
      return false;
    }

    // Portable 版本需要使用正確的路徑檢查
    let exePath = process.execPath;
    if (process.env.PORTABLE_EXECUTABLE_FILE) {
      exePath = process.env.PORTABLE_EXECUTABLE_FILE;
    }

    const settings = app.getLoginItemSettings({ path: exePath });
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
    // 驗證 URL 是否安全（只允許 http/https）
    const validation = validateSafeUrl(url);
    if (!validation.valid) {
      logger.warn(`Blocked unsafe URL: ${validation.error}`);
      return { success: false, error: validation.error };
    }

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

  // 探測已安裝的終端
  ipcMain.handle('detect-terminals', () => {
    return detectInstalledTerminals();
  });

  // 取得當前平台
  ipcMain.handle('get-platform', () => {
    return process.platform;
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

  // 驗證多個路徑是否存在
  ipcMain.handle('validate-paths', (event, paths) => {
    if (!Array.isArray(paths)) {
      return {};
    }

    const results = {};
    for (const p of paths) {
      if (typeof p !== 'string') continue;
      try {
        results[p] = fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        results[p] = false;
      }
    }
    return results;
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

  // MCP Server 控制
  ipcMain.handle('start-mcp-server', async (event, port) => {
    if (port !== undefined && (typeof port !== 'number' || port < 1024 || port > 65535)) {
      return { success: false, error: 'invalid-port' };
    }
    return await startMcpServer(port);
  });

  ipcMain.handle('stop-mcp-server', async () => {
    return await stopMcpServer();
  });

  ipcMain.handle('get-mcp-status', () => {
    return getMcpStatus();
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
