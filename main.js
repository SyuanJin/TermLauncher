const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let tray = null;

// 配置檔路徑
const configPath = path.join(app.getPath('userData'), 'config.json');

// 預設配置
const defaultConfig = {
  directories: [
    { id: 1, name: '範例專案', path: 'C:\\Users', type: 'wsl', group: '預設', lastUsed: null },
  ],
  groups: ['預設'],
  settings: {
    startMinimized: false,
    minimizeToTray: true,
    globalShortcut: 'Alt+Space',
  },
};

// 讀取配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('讀取配置失敗:', err);
  }
  return defaultConfig;
}

// 儲存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('儲存配置失敗:', err);
    return false;
  }
}

// Windows 路徑轉 WSL 路徑
function toWslPath(winPath) {
  const match = winPath.match(/^([A-Za-z]):\\(.*)$/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, '/');
    return `/mnt/${drive}/${rest}`;
  }
  return winPath.replace(/\\/g, '/');
}

// 開啟 Windows Terminal
function openTerminal(dir) {
  let args = [];

  if (dir.type === 'wsl') {
    const wslPath = toWslPath(dir.path);
    // WSL: 使用 wsl.exe 並透過 --cd 進入目錄
    args = ['wt.exe', '-w', '0', 'new-tab', 'wsl.exe', '-d', 'Ubuntu', '--cd', wslPath];
  } else {
    // PowerShell: 使用正確的 profile 名稱
    args = ['wt.exe', '-w', '0', 'new-tab', '-p', 'Windows PowerShell', '-d', dir.path];
  }

  try {
    spawn(args[0], args.slice(1), {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
    return { success: true };
  } catch (err) {
    console.error('開啟終端失敗:', err);
    return { success: false, error: err.message };
  }
}

// 建立主視窗
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 800,
    minWidth: 500,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
  });

  mainWindow.loadFile('index.html');

  // 準備好後顯示
  mainWindow.once('ready-to-show', () => {
    const config = loadConfig();
    if (!config.settings.startMinimized) {
      mainWindow.show();
    }
  });

  // 最小化到托盤
  mainWindow.on('close', event => {
    const config = loadConfig();
    if (config.settings.minimizeToTray && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// 建立系統托盤
function createTray() {
  // 建立簡單的托盤圖示
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKoSURBVFiF7ZdNaBNBFMd/s5tNsk2apE1jqy1Si4IIFqwieBDBgxcvnrx4EfTkwYMnwYMX8eLNi+BJ8KQXEUQQBBGtoFYrFa22mvpRm6RJk81md8eDMd1kN2lU8OI/DOy8eW/+M/Nm5q1QSvE/m/a/CfwrC9g2IIRwAR3AWuATEAUGlVJz/ySAEKIMOAvsA1qBeSHEK+AecE8p9TlrwHwVSNqPANATz+uiVcBhYHtKn1JKvU1IgD+sQCnVmq8A2SywJU5qwAJzfyKE08a+m+O5ELh7IYR7IRBCNCAiCvQgOoDhTOP9CzQHPKVUMGXALaVUtB8CYWRFANgwzN2/A1QE5oDGJL8A7gB+4EMG7Q7gqFLqGYAW7wjDfTpKKYRqB67m2wXwXil1J6UP+Iq4AQeBXcByIIi4gR8BJuAAcB1oBH4B55RSoXwEAEgp5ZdStQB7gXeAJxZ7FFiWIvsB2KaUCjpZYBaYVEoF45z3Ai+Bg8AaIYQghBgGJpVS7wGUUp5YQQL0A/twHKD0WwagA3AOcF8p9cRB7jvQqpT6TbwrWuVCVLCB04A7xTKplPqS6AfmhBB3gSql1A0hhF8IcR3YBDQDV5VSbxtMB1DnxKEQwgBuA8FAX9B7s0VKaYCyJLoqFJuBU0FfT7N2UNfHIqMtHg+xHfgJ3APKJaVMcQC2A7uBC0qpkYJ4LLAD2A20AQNKqUdJso7nwAQwAHQA64UQ08ANYAEYA/YopYZN7oZhHA8EAquBzcAssCqL8gDwBAgAr4HBDJaGYYwBe5RSI7FYAKVUOBgMdMQKK4BRk7uhlIoIIW4BQ+k+wqJj+xYAOu/aqgJAEJhSSoVMxEeBCCljF7AZ2BVfp2HgI+BO8ncCzVYngBHgRaGr/l/bH+gXrBaIG2g2AAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '顯示視窗',
      click: () => mainWindow.show(),
    },
    { type: 'separator' },
    {
      label: '結束',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('WSL 快速啟動器');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// 註冊全域快捷鍵
function registerShortcut() {
  const config = loadConfig();
  const shortcut = config.settings.globalShortcut || 'Alt+Space';

  globalShortcut.unregisterAll();

  try {
    globalShortcut.register(shortcut, () => {
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

// IPC 事件處理
ipcMain.handle('get-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, config) => {
  const result = saveConfig(config);
  if (result) {
    registerShortcut(); // 重新註冊快捷鍵
  }
  return result;
});

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

ipcMain.handle('export-config', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '匯出設定',
    defaultPath: 'wsl-launcher-config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePath) {
    const config = loadConfig();
    fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('import-config', async () => {
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

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '選擇資料夾',
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('close-window', () => mainWindow.close());

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
  globalShortcut.unregisterAll();
});
