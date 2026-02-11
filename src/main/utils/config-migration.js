/**
 * 配置遷移工具模組
 * 純邏輯，不依賴 Electron 或 Logger
 */

/**
 * 遷移舊版配置
 * 支援 v1.x 到 v2.0.0 的配置遷移
 * @param {Object} config - 配置物件
 * @param {Object} options - 遷移選項
 * @param {Array} options.defaultTerminals - 預設終端列表
 * @param {Array} options.defaultGroups - 預設群組列表
 * @param {Object} options.defaultSettings - 預設設定
 * @returns {{ config: Object, needsSave: boolean }} 遷移後的配置
 */
function migrateConfig(config, { defaultTerminals, defaultGroups, defaultSettings }) {
  let needsSave = false;

  // === 終端遷移 ===
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
  if (Array.isArray(config.groups) && config.groups.length > 0) {
    if (typeof config.groups[0] === 'string') {
      // 舊版格式：字串陣列 -> 新版格式：物件陣列
      config.groups = config.groups.map((name, index) => ({
        id: name === '預設' || name === 'Default' ? 'default' : `group-${Date.now()}-${index}`,
        name,
        icon: '📁',
        isDefault: name === '預設' || name === 'Default',
        order: index,
      }));
      needsSave = true;
    } else {
      // 已是物件陣列，確保有必要欄位
      config.groups.forEach((group, index) => {
        if (group.id === undefined) {
          group.id =
            group.name === '預設' || group.name === 'Default'
              ? 'default'
              : `group-${Date.now()}-${index}`;
          needsSave = true;
        }
        if (group.icon === undefined) {
          group.icon = '📁';
          needsSave = true;
        }
        if (group.isDefault === undefined) {
          group.isDefault =
            group.name === '預設' || group.name === 'Default' || group.id === 'default';
          needsSave = true;
        }
        if (group.order === undefined) {
          group.order = index;
          needsSave = true;
        }
      });
    }
  } else {
    config.groups = [...defaultGroups];
    needsSave = true;
  }

  // 確保預設群組存在
  const hasDefaultGroup = config.groups.some(g => g.isDefault || g.id === 'default');
  if (!hasDefaultGroup) {
    config.groups.unshift({
      id: 'default',
      name: 'Default',
      icon: '📁',
      isDefault: true,
      order: 0,
    });
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
        const groupById = config.groups.find(g => g.id === dir.group);
        if (!groupById) {
          const groupByName = config.groups.find(g => g.name === dir.group);
          if (groupByName) {
            dir.group = groupByName.id;
            needsSave = true;
          } else {
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
    config.settings = { ...defaultSettings };
    needsSave = true;
  } else {
    if (config.settings.showTabText === undefined) {
      config.settings.showTabText = true;
      needsSave = true;
    }
    if (config.settings.recentLimit === undefined) {
      config.settings.recentLimit = 10;
      needsSave = true;
    }
    if (config.settings.mcp === undefined) {
      config.settings.mcp = { enabled: true, port: 23549 };
      needsSave = true;
    }
  }

  return { config, needsSave };
}

module.exports = { migrateConfig };
