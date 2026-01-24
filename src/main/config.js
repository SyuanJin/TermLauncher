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
    hidden: false,
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    icon: '⚡',
    command: 'wt.exe -w 0 new-tab -p "Windows PowerShell" -d {path}',
    pathFormat: 'windows',
    isBuiltin: true,
    hidden: false,
  },
  {
    id: 'git-bash',
    name: 'Git Bash',
    icon: '🐱',
    command: '"C:\\Program Files\\Git\\git-bash.exe" "--cd={path}"',
    pathFormat: 'windows',
    isBuiltin: true,
    hidden: false,
  },
];

// 預設群組列表
const defaultGroups = [
  {
    id: 'default',
    name: '預設',
    icon: '📁',
    isDefault: true,
    order: 0,
  },
];

// 預設配置
const defaultConfig = {
  directories: [
    {
      id: 1,
      name: '範例專案',
      icon: '📁',
      path: 'C:\\Users',
      terminalId: 'wsl-ubuntu',
      group: 'default',
      lastUsed: null,
      order: 0,
    },
  ],
  terminals: [...defaultTerminals],
  groups: [...defaultGroups],
  favorites: [],
  settings: {
    autoLaunch: false,
    startMinimized: false,
    minimizeToTray: true,
    globalShortcut: 'Alt+Space',
    theme: 'dark',
    language: 'zh-TW',
    showTabText: true,
    recentLimit: 10,
  },
};

/**
 * 遷移舊版配置
 * 支援 v1.x 到 v2.0.0 的配置遷移
 * @param {Object} config - 配置物件
 * @returns {Object} 遷移後的配置
 */
function migrateConfig(config) {
  let needsSave = false;

  // === 終端遷移 ===
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
        // 保留使用者的 hidden 設定
        const userHidden = config.terminals[existingIndex].hidden;
        config.terminals[existingIndex] = {
          ...defaultTerm,
          hidden: userHidden ?? false,
        };
      }
    });

    // 為所有終端新增 hidden 欄位（如果不存在）
    config.terminals.forEach(terminal => {
      if (terminal.hidden === undefined) {
        terminal.hidden = false;
        needsSave = true;
      }
    });
  }

  // === 群組遷移 ===
  // 偵測群組是否為舊版字串陣列格式
  if (Array.isArray(config.groups) && config.groups.length > 0) {
    if (typeof config.groups[0] === 'string') {
      // 舊版格式：字串陣列 -> 新版格式：物件陣列
      logger.info('Migrating groups from string array to object array');
      config.groups = config.groups.map((name, index) => ({
        id: name === '預設' ? 'default' : `group-${Date.now()}-${index}`,
        name,
        icon: '📁',
        isDefault: name === '預設',
        order: index,
      }));
      needsSave = true;
    } else {
      // 已是物件陣列，確保有必要欄位
      config.groups.forEach((group, index) => {
        if (group.id === undefined) {
          group.id = group.name === '預設' ? 'default' : `group-${Date.now()}-${index}`;
          needsSave = true;
        }
        if (group.icon === undefined) {
          group.icon = '📁';
          needsSave = true;
        }
        if (group.isDefault === undefined) {
          group.isDefault = group.name === '預設' || group.id === 'default';
          needsSave = true;
        }
        if (group.order === undefined) {
          group.order = index;
          needsSave = true;
        }
      });
    }
  } else {
    // 沒有群組，使用預設
    config.groups = [...defaultGroups];
    needsSave = true;
  }

  // 確保預設群組存在
  const hasDefaultGroup = config.groups.some(g => g.isDefault || g.id === 'default');
  if (!hasDefaultGroup) {
    config.groups.unshift({
      id: 'default',
      name: '預設',
      icon: '📁',
      isDefault: true,
      order: 0,
    });
    // 更新其他群組的 order
    config.groups.forEach((g, i) => {
      g.order = i;
    });
    needsSave = true;
  }

  // === 目錄遷移 ===
  if (config.directories) {
    config.directories.forEach((dir, index) => {
      // 遷移 type 為 terminalId（舊版相容）
      if (dir.type && !dir.terminalId) {
        if (dir.type === 'wsl') {
          dir.terminalId = 'wsl-ubuntu';
        } else if (dir.type === 'powershell') {
          dir.terminalId = 'powershell';
        }
        delete dir.type;
        needsSave = true;
      }

      // 新增 icon 欄位
      if (dir.icon === undefined) {
        dir.icon = '📁';
        needsSave = true;
      }

      // 新增 order 欄位
      if (dir.order === undefined) {
        dir.order = index;
        needsSave = true;
      }

      // 遷移群組名稱為群組 ID
      if (dir.group && typeof dir.group === 'string') {
        // 檢查是否為群組名稱（舊版）或群組 ID（新版）
        const groupById = config.groups.find(g => g.id === dir.group);
        if (!groupById) {
          // 是群組名稱，轉換為群組 ID
          const groupByName = config.groups.find(g => g.name === dir.group);
          if (groupByName) {
            dir.group = groupByName.id;
            needsSave = true;
          } else {
            // 找不到對應群組，歸類到預設
            dir.group = 'default';
            needsSave = true;
          }
        }
      }
    });
  }

  // === 新增 favorites 陣列 ===
  if (!config.favorites) {
    config.favorites = [];
    needsSave = true;
  }

  // === 設定遷移 ===
  if (!config.settings) {
    config.settings = { ...defaultConfig.settings };
    needsSave = true;
  } else {
    // 新增 showTabText 設定
    if (config.settings.showTabText === undefined) {
      config.settings.showTabText = true;
      needsSave = true;
    }

    // 新增 recentLimit 設定
    if (config.settings.recentLimit === undefined) {
      config.settings.recentLimit = 10;
      needsSave = true;
    }
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
  defaultGroups,
  configPath,
};
