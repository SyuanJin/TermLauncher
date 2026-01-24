/**
 * 視窗管理模組
 * 處理主視窗的建立與管理
 */
const { BrowserWindow, app } = require('electron');
const path = require('path');
const { loadConfig } = require('./config');

let mainWindow = null;

/**
 * 建立主視窗
 * @returns {BrowserWindow} 主視窗實例
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 800,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

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

  return mainWindow;
}

/**
 * 取得主視窗實例
 * @returns {BrowserWindow|null} 主視窗實例
 */
function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  getMainWindow,
};
