/**
 * 國際化 (i18n) 模組 - 渲染進程
 * 處理翻譯函式與 UI 更新
 */
import { api } from './api.js';

// 當前語系資料
let currentLocale = null;
let availableLocales = [];

/**
 * 初始化 i18n
 * @param {string} localeCode - 語系代碼
 */
export async function initI18n(localeCode) {
  // 取得可用語系列表
  availableLocales = await api.getAvailableLocales();

  // 載入語系
  currentLocale = await api.loadLocale(localeCode);

  // 更新 HTML lang 屬性
  document.documentElement.lang = localeCode;

  // 應用翻譯到 HTML
  applyTranslations();

  return currentLocale;
}

/**
 * 切換語系
 * @param {string} localeCode - 語系代碼
 */
export async function changeLocale(localeCode) {
  currentLocale = await api.loadLocale(localeCode);
  document.documentElement.lang = localeCode;
  applyTranslations();
  return currentLocale;
}

/**
 * 取得可用語系列表
 * @returns {Array} 語系列表
 */
export function getAvailableLocales() {
  return availableLocales;
}

/**
 * 翻譯函式
 * @param {string} key - 翻譯鍵，使用點號分隔 (例如 'ui.tabs.directories')
 * @param {Object} params - 替換參數
 * @returns {string} 翻譯後的文字
 */
export function t(key, params = {}) {
  if (!currentLocale) {
    return key;
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
 * 應用翻譯到 HTML 元素
 * 掃描所有帶有 data-i18n 屬性的元素
 */
export function applyTranslations() {
  // 翻譯 text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // 翻譯 placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  // 翻譯 aria-label
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  });

  // 翻譯 title (tooltip)
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
    }
  });

  // 翻譯 data-tooltip (CSS tooltip)
  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    const key = el.getAttribute('data-i18n-tooltip');
    if (key) {
      el.setAttribute('data-tooltip', t(key));
    }
  });
}
