/**
 * TermLauncher 主進程入口點
 * 應用程式生命週期管理
 */
const { app, BrowserWindow } = require('electron');
const { createWindow } = require('./window');
const { createTray } = require('./tray');
const { registerShortcut, unregisterAllShortcuts } = require('./shortcuts');
const { setupIpcHandlers } = require('./ipc-handlers');

// 設定 IPC 事件處理器
setupIpcHandlers();

// App 事件
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcut();
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
  unregisterAllShortcuts();
});
