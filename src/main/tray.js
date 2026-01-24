/**
 * 系統托盤模組
 * 處理系統托盤圖示與選單
 */
const { Tray, Menu, nativeImage, app } = require('electron');
const { getMainWindow } = require('./window');
const path = require('path');

let tray = null;

/**
 * 建立系統托盤
 */
function createTray() {
  // 使用實際的圖標文件（解決 Windows 托盤圖標不顯示問題）
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '顯示視窗',
      click: () => {
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.show();
      },
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

  tray.setToolTip('TermLauncher');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.show();
  });

  return tray;
}

/**
 * 取得托盤實例
 * @returns {Tray|null} 托盤實例
 */
function getTray() {
  return tray;
}

module.exports = {
  createTray,
  getTray,
};
