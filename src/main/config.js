/**
 * 配置管理模組
 * 處理應用程式配置的讀取與儲存
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('./logger');

const logger = createLogger('Config');

// 配置檔路徑
const configPath = path.join(app.getPath('userData'), 'config.json');

// 預設終端列表
const defaultTerminals = [
  {
    id: 'wsl-ubuntu',
    name: 'WSL Ubuntu',
    icon: '🐧',
    command: 'wt.exe -w 0 new-tab wsl.exe -d Ubuntu --cd {path}',
    pathFormat: 'unix',
    isBuiltin: true,
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    icon: '⚡',
    command: 'wt.exe -w 0 new-tab -p "Windows PowerShell" -d {path}',
    pathFormat: 'windows',
    isBuiltin: true,
  },
  {
    id: 'git-bash',
    name: 'Git Bash',
    icon: '🐱',
    command: '"C:\\Program Files\\Git\\git-bash.exe" "--cd={path}"',
    pathFormat: 'windows',
    isBuiltin: true,
  },
];

// 預設配置
const defaultConfig = {
  directories: [
    {
      id: 1,
      name: '範例專案',
      path: 'C:\\Users',
      terminalId: 'wsl-ubuntu',
      group: '預設',
      lastUsed: null,
    },
  ],
  terminals: [...defaultTerminals],
  groups: ['預設'],
  settings: {
    autoLaunch: false,
    startMinimized: false,
    minimizeToTray: true,
    globalShortcut: 'Alt+Space',
    theme: 'dark',
    language: 'zh-TW',
  },
};

/**
 * 遷移舊版配置
 * 將 type 轉換為 terminalId
 * @param {Object} config - 配置物件
 * @returns {Object} 遷移後的配置
 */
function migrateConfig(config) {
  let needsSave = false;

  // 確保 terminals 陣列存在
  if (!config.terminals) {
    config.terminals = [...defaultTerminals];
    needsSave = true;
  } else {
    // 確保內建終端存在且為最新版本
    defaultTerminals.forEach(defaultTerm => {
      const existingIndex = config.terminals.findIndex(t => t.id === defaultTerm.id);
      if (existingIndex === -1) {
        config.terminals.push(defaultTerm);
        needsSave = true;
      } else if (config.terminals[existingIndex].isBuiltin) {
        // 更新內建終端的配置（保持最新）
        config.terminals[existingIndex] = defaultTerm;
      }
    });
  }

  // 遷移目錄的 type 為 terminalId
  if (config.directories) {
    config.directories.forEach(dir => {
      if (dir.type && !dir.terminalId) {
        // 將舊的 type 轉換為 terminalId
        if (dir.type === 'wsl') {
          dir.terminalId = 'wsl-ubuntu';
        } else if (dir.type === 'powershell') {
          dir.terminalId = 'powershell';
        }
        delete dir.type;
        needsSave = true;
      }
    });
  }

  return { config, needsSave };
}

/**
 * 配置是否曾損壞（用於通知前端）
 */
let configWasCorrupted = false;

/**
 * 檢查配置是否曾損壞
 * @returns {boolean}
 */
function wasConfigCorrupted() {
  const result = configWasCorrupted;
  configWasCorrupted = false; // 讀取後重置
  return result;
}

/**
 * 備份損壞的配置
 */
function backupCorruptedConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const backupPath = configPath + '.backup.' + Date.now();
      fs.copyFileSync(configPath, backupPath);
      logger.info('Corrupted config backed up', backupPath);
    }
  } catch (err) {
    logger.error('Failed to backup corrupted config', err);
  }
}

/**
 * 讀取配置
 * @returns {Object} 配置物件
 */
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      let config = JSON.parse(data);

      // 執行配置遷移
      const { config: migratedConfig, needsSave } = migrateConfig(config);
      config = migratedConfig;

      // 如果有遷移變更，儲存配置
      if (needsSave) {
        saveConfig(config);
      }

      return config;
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      // JSON 解析錯誤，配置損壞
      logger.error('Config file corrupted (JSON parse error)', err);
      backupCorruptedConfig();
      configWasCorrupted = true;
    } else {
      logger.error('Failed to load config', err);
    }
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
    logger.info('Config saved successfully');
    return true;
  } catch (err) {
    logger.error('Failed to save config', err);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  wasConfigCorrupted,
  defaultConfig,
  defaultTerminals,
  configPath,
};
