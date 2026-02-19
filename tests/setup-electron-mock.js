/**
 * Vitest setup file for tests that require Electron mocks
 * 透過 require cache 注入 electron mock，確保 CJS require('electron') 能取到 mock
 */
const Module = require('module');
const os = require('os');
const path = require('path');
const fs = require('fs');

// 使用跨平台臨時目錄，並建立專屬子目錄避免衝突
const testUserDataDir = path.join(os.tmpdir(), 'termlauncher-test');
if (!fs.existsSync(testUserDataDir)) {
  fs.mkdirSync(testUserDataDir, { recursive: true });
}

const electronMock = {
  app: {
    getPath: () => testUserDataDir,
    isPackaged: false,
    on: () => {},
    once: () => {},
  },
  ipcMain: {
    handle: () => {},
    on: () => {},
  },
  BrowserWindow: class {},
  dialog: {
    showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  },
};

// 攔截 require('electron')
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'electron') {
    return 'electron';
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.cache['electron'] = {
  id: 'electron',
  filename: 'electron',
  loaded: true,
  parent: null,
  children: [],
  paths: [],
  exports: electronMock,
};
