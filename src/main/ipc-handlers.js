/**
 * IPC 事件處理模組
 * 處理主進程與渲染進程之間的通訊
 */
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const { loadConfig, saveConfig } = require('./config');
const { openTerminal } = require('./terminal');
const { registerShortcut } = require('./shortcuts');
const { getMainWindow } = require('./window');

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
    // 更新最近使用時間
    const config = loadConfig();
    const dirIndex = config.directories.findIndex(d => d.id === dir.id);
    if (dirIndex !== -1) {
      config.directories[dirIndex].lastUsed = Date.now();
      saveConfig(config);
    }
    return openTerminal(dir);
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
