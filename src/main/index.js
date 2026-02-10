/**
 * TermLauncher 主進程入口點
 * 應用程式生命週期管理
 */
const { app, BrowserWindow } = require('electron');
const { createWindow, getMainWindow } = require('./window');
const { createTray } = require('./tray');
const { registerShortcut, unregisterAllShortcuts } = require('./shortcuts');
const { setupIpcHandlers } = require('./ipc-handlers');
const { loadLocale } = require('./i18n');
const { loadConfig } = require('./config');
const { logCacheStats } = require('./terminal');
const { startMcpServer, stopMcpServer } = require('./mcp');

// 單一實例鎖定
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 已有實例運行中，退出當前實例
  app.quit();
} else {
  // 當第二個實例嘗試啟動時，聚焦到現有視窗
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 設定 IPC 事件處理器
  setupIpcHandlers();

  // App 事件
  app.whenReady().then(() => {
    // 載入配置並初始化語系
    const config = loadConfig();
    loadLocale(config.settings?.language || 'zh-TW');

    createWindow();
    createTray();
    registerShortcut();

    // 依配置啟動 MCP Server
    const mcpSettings = config.settings?.mcp;
    if (mcpSettings?.enabled !== false) {
      const port = mcpSettings?.port || 23549;
      startMcpServer(port);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('will-quit', () => {
    // 記錄驗證器快取統計（用於性能分析）
    logCacheStats();
    unregisterAllShortcuts();
    stopMcpServer();
  });
}
