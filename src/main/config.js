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

/**
 * 根據平台回傳對應的檔案管理器配置
 * @returns {Object} 檔案管理器終端配置
 */
function getFileManagerTerminal() {
  const base = { id: 'file-manager', icon: '📂', isBuiltin: true, hidden: false };

  switch (process.platform) {
    case 'darwin':
      return { ...base, name: 'Finder', command: 'open {path}', pathFormat: 'unix' };
    case 'linux':
      return { ...base, name: 'File Manager', command: 'xdg-open {path}', pathFormat: 'unix' };
    default:
      // Windows
      return {
        ...base,
        name: 'File Explorer',
        command: 'explorer.exe {path}',
        pathFormat: 'windows',
      };
  }
}

/**
 * 根據平台回傳預設終端列表
 * @returns {Array} 預設終端配置陣列
 */
function getDefaultTerminals() {
  const fileManager = { ...getFileManagerTerminal(), order: 0 };

  switch (process.platform) {
    case 'darwin':
      return [
        fileManager,
        {
          id: 'terminal-app',
          name: 'Terminal',
          icon: '🖥️',
          command: 'open -a Terminal {path}',
          pathFormat: 'unix',
          isBuiltin: true,
          hidden: false,
          order: 1,
        },
      ];

    case 'linux':
      return [
        fileManager,
        {
          id: 'default-terminal',
          name: 'Terminal',
          icon: '🖥️',
          command: 'x-terminal-emulator --working-directory={path}',
          pathFormat: 'unix',
          isBuiltin: true,
          hidden: false,
          order: 1,
        },
      ];

    default:
      // Windows
      return [
        fileManager,
        {
          id: 'wsl-ubuntu',
          name: 'WSL Ubuntu',
          icon: '🐧',
          command: 'wt.exe -w 0 new-tab wsl.exe -d Ubuntu --cd {path}',
          pathFormat: 'unix',
          isBuiltin: true,
          hidden: false,
          order: 1,
        },
        {
          id: 'git-bash',
          name: 'Git Bash',
          icon: '🐱',
          command: '"C:\\Program Files\\Git\\git-bash.exe" "--cd={path}"',
          pathFormat: 'windows',
          isBuiltin: true,
          hidden: false,
          order: 2,
        },
        {
          id: 'powershell',
          name: 'PowerShell',
          icon: '⚡',
          command: 'wt.exe -w 0 new-tab -p "Windows PowerShell" -d {path}',
          pathFormat: 'windows',
          isBuiltin: true,
          hidden: false,
          order: 3,
        },
      ];
  }
}

// 預設終端列表（根據當前平台生成）
const defaultTerminals = getDefaultTerminals();

/**
 * 取得平台預設的終端 ID
 * @returns {string} 預設終端 ID
 */
function getDefaultTerminalId() {
  switch (process.platform) {
    case 'darwin':
      return 'terminal-app';
    case 'linux':
      return 'default-terminal';
    default:
      return 'wsl-ubuntu';
  }
}

/**
 * 取得平台預設的使用者目錄路徑
 * @returns {string} 預設路徑
 */
function getDefaultUserPath() {
  switch (process.platform) {
    case 'darwin':
      return '/Users';
    case 'linux':
      return '/home';
    default:
      return 'C:\\Users';
  }
}

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
      path: getDefaultUserPath(),
      terminalId: getDefaultTerminalId(),
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
    mcp: {
      enabled: true,
      port: 23549,
    },
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
        // 保留使用者的 hidden 和 order 設定
        const userHidden = config.terminals[existingIndex].hidden;
        const userOrder = config.terminals[existingIndex].order;
        config.terminals[existingIndex] = {
          ...defaultTerm,
          hidden: userHidden ?? false,
          order: userOrder ?? defaultTerm.order,
        };
      }
    });

    // 為所有終端新增 hidden 欄位（如果不存在）
    config.terminals.forEach((terminal, index) => {
      if (terminal.hidden === undefined) {
        terminal.hidden = false;
        needsSave = true;
      }
      if (terminal.order === undefined) {
        terminal.order = index;
        needsSave = true;
      }
    });

    // 按 order 物理排序陣列
    config.terminals.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

    // 新增 MCP 設定
    if (config.settings.mcp === undefined) {
      config.settings.mcp = { enabled: true, port: 23549 };
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

/**
 * 匯出配置（進階版本）
 * @param {Object} options - 匯出選項
 * @param {boolean} options.includeTerminals - 是否包含終端配置
 * @param {boolean} options.includeGroups - 是否包含群組配置
 * @param {boolean} options.includeDirectories - 是否包含目錄配置
 * @param {boolean} options.includeSettings - 是否包含設定
 * @param {boolean} options.includeFavorites - 是否包含最愛
 * @returns {Object} 匯出的配置物件
 */
function exportConfigAdvanced(options = {}) {
  const {
    includeTerminals = true,
    includeGroups = true,
    includeDirectories = true,
    includeSettings = true,
    includeFavorites = true,
  } = options;

  const config = loadConfig();

  const exportData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    appVersion: require('../../package.json').version,
  };

  if (includeTerminals) {
    // 匯出全部終端（含內建的 hidden/order 狀態）
    exportData.terminals = config.terminals || [];
  }

  if (includeGroups) {
    // 只匯出非預設群組
    exportData.groups = config.groups?.filter(g => !g.isDefault) || [];
  }

  if (includeDirectories) {
    exportData.directories = config.directories || [];
  }

  if (includeSettings) {
    exportData.settings = config.settings || {};
  }

  if (includeFavorites) {
    const validDirIds = new Set(
      (config.directories || [])
        .filter(d => {
          try {
            return fs.existsSync(d.path);
          } catch {
            return false;
          }
        })
        .map(d => d.id)
    );
    exportData.favorites = (config.favorites || []).filter(id => validDirIds.has(id));
  }

  return exportData;
}

/**
 * 匯入配置（進階版本）
 * @param {Object} importData - 匯入的配置資料
 * @param {Object} options - 匯入選項
 * @param {boolean} options.mergeTerminals - 是否合併終端（否則覆蓋）
 * @param {boolean} options.mergeGroups - 是否合併群組
 * @param {boolean} options.mergeDirectories - 是否合併目錄
 * @param {boolean} options.mergeSettings - 是否合併設定
 * @param {boolean} options.mergeFavorites - 是否合併最愛
 * @returns {Object} { success: boolean, config?: Object, errors?: string[] }
 */
function importConfigAdvanced(importData, options = {}) {
  const {
    mergeTerminals = true,
    mergeGroups = true,
    mergeDirectories = true,
    mergeSettings = true,
    mergeFavorites = true,
  } = options;

  const errors = [];

  // 驗證格式
  if (!importData || typeof importData !== 'object') {
    return { success: false, errors: ['Invalid import data format'] };
  }

  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig };

  // 匯入終端
  const terminalIdMap = new Map();
  if (importData.terminals) {
    const importedBuiltin = importData.terminals.filter(t => t.isBuiltin);
    const importedCustom = importData.terminals.filter(t => !t.isBuiltin);

    // 更新內建終端的使用者設定（hidden、order）
    importedBuiltin.forEach(imported => {
      const existing = newConfig.terminals.find(t => t.id === imported.id && t.isBuiltin);
      if (existing) {
        if (imported.hidden !== undefined) existing.hidden = imported.hidden;
        if (imported.order !== undefined) existing.order = imported.order;
      }
    });

    // 處理自訂終端
    if (mergeTerminals) {
      // 合併模式：用 name 語意去重
      importedCustom.forEach(importedTerminal => {
        const existingByName = newConfig.terminals.find(
          t => !t.isBuiltin && t.name === importedTerminal.name
        );
        if (existingByName) {
          // 同名終端已存在，跳過並建立 ID 映射
          terminalIdMap.set(importedTerminal.id, existingByName.id);
          logger.info(`Terminal "${importedTerminal.name}" already exists, skipped`);
          return;
        }
        const existingById = newConfig.terminals.find(t => t.id === importedTerminal.id);
        if (existingById) {
          // ID 衝突，生成新 ID
          const newId = 'imported-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          terminalIdMap.set(importedTerminal.id, newId);
          importedTerminal.id = newId;
          logger.info(`Terminal ID conflict resolved, new ID: ${newId}`);
        }
        newConfig.terminals.push(importedTerminal);
      });
    } else {
      // 覆蓋模式：保留內建終端，替換自訂終端
      const builtinTerminals = newConfig.terminals.filter(t => t.isBuiltin);
      newConfig.terminals = [...builtinTerminals, ...importedCustom];
    }
  }

  // 匯入群組
  const groupIdMap = new Map();
  if (importData.groups) {
    if (mergeGroups) {
      // 合併模式：用 name 語意去重
      importData.groups.forEach(importedGroup => {
        const existingByName = newConfig.groups.find(g => g.name === importedGroup.name);
        if (existingByName) {
          // 同名群組已存在，跳過並建立 ID 映射
          groupIdMap.set(importedGroup.id, existingByName.id);
          logger.info(`Group "${importedGroup.name}" already exists, skipped`);
          return;
        }
        const idExists = newConfig.groups.some(g => g.id === importedGroup.id);
        if (idExists) {
          const newId = 'imported-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          groupIdMap.set(importedGroup.id, newId);
          importedGroup.id = newId;
        }
        importedGroup.order = newConfig.groups.length;
        newConfig.groups.push(importedGroup);
      });
    } else {
      // 覆蓋模式：保留預設群組
      const defaultGroup = newConfig.groups.find(g => g.isDefault);
      newConfig.groups = [defaultGroup, ...importData.groups];
    }
  }

  // 匯入目錄
  const dirIdMap = new Map();
  if (importData.directories) {
    if (mergeDirectories) {
      // 合併模式：用 path 語意去重，檢查終端和群組參照
      const maxId = Math.max(0, ...newConfig.directories.map(d => d.id));
      let nextId = maxId + 1;

      importData.directories.forEach(importedDir => {
        const existingByPath = newConfig.directories.find(d => d.path === importedDir.path);
        if (existingByPath) {
          // 同路徑目錄已存在，跳過並建立 ID 映射
          dirIdMap.set(importedDir.id, existingByPath.id);
          logger.info(`Directory "${importedDir.path}" already exists, skipped`);
          return;
        }

        // 生成新 ID
        const oldId = importedDir.id;
        importedDir.id = nextId++;
        dirIdMap.set(oldId, importedDir.id);

        // 映射 terminalId
        if (importedDir.terminalId && terminalIdMap.has(importedDir.terminalId)) {
          importedDir.terminalId = terminalIdMap.get(importedDir.terminalId);
        }
        // 映射 group
        if (importedDir.group && groupIdMap.has(importedDir.group)) {
          importedDir.group = groupIdMap.get(importedDir.group);
        }

        // 檢查終端 ID 是否存在
        if (
          importedDir.terminalId &&
          !newConfig.terminals.some(t => t.id === importedDir.terminalId)
        ) {
          // 終端不存在，使用預設
          errors.push(
            `Terminal "${importedDir.terminalId}" not found for directory "${importedDir.name}", using default`
          );
          importedDir.terminalId = getDefaultTerminalId();
        }

        // 檢查群組 ID 是否存在
        if (importedDir.group && !newConfig.groups.some(g => g.id === importedDir.group)) {
          // 群組不存在，使用預設
          errors.push(
            `Group "${importedDir.group}" not found for directory "${importedDir.name}", using default`
          );
          importedDir.group = 'default';
        }

        newConfig.directories.push(importedDir);
      });
    } else {
      // 覆蓋模式
      newConfig.directories = importData.directories;
    }
  }

  // 匯入設定
  if (importData.settings) {
    if (mergeSettings) {
      // 合併模式：深度合併
      newConfig.settings = { ...newConfig.settings, ...importData.settings };
    } else {
      newConfig.settings = importData.settings;
    }
  }

  // 匯入最愛
  if (importData.favorites) {
    if (mergeFavorites) {
      // 合併模式：用 dirIdMap 映射後去重
      const existingFavorites = new Set(newConfig.favorites);
      importData.favorites.forEach(fav => {
        const mappedId = dirIdMap.has(fav) ? dirIdMap.get(fav) : fav;
        if (!existingFavorites.has(mappedId)) {
          newConfig.favorites.push(mappedId);
          existingFavorites.add(mappedId);
        }
      });
    } else {
      newConfig.favorites = importData.favorites;
    }
  }

  // 儲存配置
  const saveResult = saveConfig(newConfig);
  if (!saveResult) {
    return { success: false, errors: ['Failed to save config'] };
  }

  return {
    success: true,
    config: newConfig,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 取得匯出預覽資訊
 * @returns {Object} 預覽資訊
 */
function getExportPreview() {
  const config = loadConfig();
  return {
    terminalsCount: config.terminals?.length || 0,
    groupsCount: config.groups?.filter(g => !g.isDefault).length || 0,
    directoriesCount: config.directories?.length || 0,
    favoritesCount: config.favorites?.length || 0,
    hasSettings: !!config.settings,
  };
}

module.exports = {
  loadConfig,
  saveConfig,
  wasConfigCorrupted,
  defaultConfig,
  defaultTerminals,
  defaultGroups,
  configPath,
  exportConfigAdvanced,
  importConfigAdvanced,
  getExportPreview,
  getDefaultTerminalId,
};
