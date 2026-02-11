/**
 * 系統托盤模組
 * 處理系統托盤圖示與選單
 */
const { Tray, Menu, nativeImage, app } = require('electron');
const { getMainWindow } = require('./window');
const { t } = require('./i18n');
const { loadConfig, getDefaultTerminalId } = require('./config');
const { openTerminal } = require('./terminal');
const path = require('path');

let tray = null;

/**
 * 建立目錄快速啟動選單項目
 * @param {Object} dir - 目錄物件
 * @param {Object} config - 配置物件
 * @returns {Object} Electron MenuItem 選項
 */
function buildDirectoryMenuItem(dir, config) {
  const terminalId = dir.terminalId || getDefaultTerminalId();
  const terminal = config.terminals?.find(t => t.id === terminalId);

  return {
    label: `${dir.icon || '📁'} ${dir.name}`,
    click: () => {
      if (terminal) {
        openTerminal(dir, terminal);
      }
    },
  };
}

/**
 * 建立托盤選單
 * @returns {Menu} 托盤選單
 */
function buildTrayMenu() {
  const config = loadConfig();
  const menuTemplate = [];

  // 顯示視窗
  menuTemplate.push({
    label: t('tray.showWindow'),
    click: () => {
      const mainWindow = getMainWindow();
      if (mainWindow) mainWindow.show();
    },
  });

  menuTemplate.push({ type: 'separator' });

  // 最愛目錄子選單
  const favoriteIds = config.favorites || [];
  const favoriteDirs = favoriteIds
    .map(id => config.directories?.find(d => d.id === id))
    .filter(Boolean);

  if (favoriteDirs.length > 0) {
    menuTemplate.push({
      label: `⭐ ${t('tray.favorites')}`,
      submenu: favoriteDirs.map(dir => buildDirectoryMenuItem(dir, config)),
    });
  }

  // 最近使用子選單
  const recentLimit = config.settings?.recentLimit || 10;
  const recentDirs = [...(config.directories || [])]
    .filter(d => d.lastUsed)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, recentLimit);

  if (recentDirs.length > 0) {
    menuTemplate.push({
      label: `🕐 ${t('tray.recent')}`,
      submenu: recentDirs.map(dir => buildDirectoryMenuItem(dir, config)),
    });
  }

  if (favoriteDirs.length > 0 || recentDirs.length > 0) {
    menuTemplate.push({ type: 'separator' });
  }

  // 結束
  menuTemplate.push({
    label: t('tray.quit'),
    click: () => {
      app.isQuitting = true;
      app.quit();
    },
  });

  return Menu.buildFromTemplate(menuTemplate);
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
 * 更新托盤選單（語言變更或配置變更時呼叫）
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
