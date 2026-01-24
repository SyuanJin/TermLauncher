/**
 * 國際化 (i18n) 模組
 * 處理語系檔案的掃描與載入
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 語系檔案目錄
const localesDir = path.join(__dirname, '../locales');

// 快取已載入的語系
let localesCache = {};
let currentLocale = null;

/**
 * 取得可用的語系列表
 * @returns {Array<{code: string, name: string, nativeName: string}>} 語系列表
 */
function getAvailableLocales() {
  const locales = [];

  try {
    const files = fs.readdirSync(localesDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(localesDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          if (data.meta && data.meta.code) {
            locales.push({
              code: data.meta.code,
              name: data.meta.name || data.meta.code,
              nativeName: data.meta.nativeName || data.meta.name || data.meta.code,
            });
          }
        } catch (err) {
          console.error(`無法讀取語系檔案 ${file}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('無法掃描語系目錄:', err);
  }

  return locales;
}

/**
 * 載入指定語系
 * @param {string} localeCode - 語系代碼 (例如 'zh-TW')
 * @returns {Object|null} 語系資料
 */
function loadLocale(localeCode) {
  // 檢查快取
  if (localesCache[localeCode]) {
    currentLocale = localesCache[localeCode];
    return currentLocale;
  }

  const filePath = path.join(localesDir, `${localeCode}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      localesCache[localeCode] = data;
      currentLocale = data;
      return data;
    }
  } catch (err) {
    console.error(`無法載入語系 ${localeCode}:`, err);
  }

  // 如果找不到指定語系，嘗試載入預設語系
  if (localeCode !== 'zh-TW') {
    return loadLocale('zh-TW');
  }

  return null;
}

/**
 * 取得當前載入的語系
 * @returns {Object|null} 當前語系資料
 */
function getCurrentLocale() {
  return currentLocale;
}

/**
 * 翻譯函式 (主進程使用)
 * @param {string} key - 翻譯鍵，使用點號分隔 (例如 'tray.showWindow')
 * @param {Object} params - 替換參數
 * @returns {string} 翻譯後的文字
 */
function t(key, params = {}) {
  if (!currentLocale) {
    loadLocale('zh-TW');
  }

  const keys = key.split('.');
  let value = currentLocale;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // 找不到翻譯，返回原始 key
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // 替換參數 {name} -> params.name
  return value.replace(/\{(\w+)\}/g, (match, paramName) => {
    return params[paramName] !== undefined ? params[paramName] : match;
  });
}

/**
 * 清除語系快取
 */
function clearLocaleCache() {
  localesCache = {};
  currentLocale = null;
}

module.exports = {
  getAvailableLocales,
  loadLocale,
  getCurrentLocale,
  t,
  clearLocaleCache,
};
