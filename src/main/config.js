/**
 * 配置管理模組
 * 處理應用程式配置的讀取與儲存
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

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
    theme: 'dark',
  },
};

/**
 * 讀取配置
 * @returns {Object} 配置物件
 */
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

/**
 * 儲存配置
 * @param {Object} config - 配置物件
 * @returns {boolean} 儲存是否成功
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('儲存配置失敗:', err);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  defaultConfig,
  configPath,
};
