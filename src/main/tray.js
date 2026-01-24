/**
 * 系統托盤模組
 * 處理系統托盤圖示與選單
 */
const { Tray, Menu, nativeImage, app } = require('electron');
const { getMainWindow } = require('./window');
const { t } = require('./i18n');
const path = require('path');

let tray = null;

/**
 * 建立托盤選單
 * @returns {Menu} 托盤選單
 */
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: t('tray.showWindow'),
      click: () => {
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.show();
      },
    },
    { type: 'separator' },
    {
      label: t('tray.quit'),
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

/**
 * 建立系統托盤
 */
function createTray() {
  // 使用實際的圖標文件（解決 Windows 托盤圖標不顯示問題）
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);

  tray.setToolTip('TermLauncher');
  tray.setContextMenu(buildTrayMenu());

  tray.on('double-click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.show();
  });

  return tray;
}

/**
 * 更新托盤選單（語言變更時呼叫）
 */
function updateTrayMenu() {
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }
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
  updateTrayMenu,
};
