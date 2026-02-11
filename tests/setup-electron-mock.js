/**
 * Vitest setup file for tests that require Electron mocks
 * 透過 require cache 注入 electron mock，確保 CJS require('electron') 能取到 mock
 */
const Module = require('module');

const electronMock = {
  app: {
    getPath: () => '/tmp',
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
