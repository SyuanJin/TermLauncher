/**
 * 應用程式入口
 * 初始化並整合所有模組
 */
import { loadConfig, getConfig, isConfigLoaded, validateAllPaths } from './state.js';
import { api } from './api.js';
import { initI18n, t } from './i18n.js';
import { preCacheElements, COMMON_ELEMENT_IDS, getElement } from './utils/dom-cache.js';
import { setupTabs, onTabChange } from './ui/tabs.js';
import { renderRecentList, setupRecentEvents } from './ui/recent.js';
import { renderFavoritesList, setupFavoritesEvents } from './ui/favorites.js';
import { renderGroupsTab, setupGroupsEvents } from './ui/groups.js';
import {
  renderGroupFilter,
  renderGroupSelect,
  renderTerminalSelect,
  renderDirectories,
  setupDirectoryEvents,
} from './ui/directories.js';
import {
  renderSettings,
  setupSettingsEvents,
  applyTheme,
  applyShowTabText,
} from './ui/settings.js';
import { renderLaunchersTab, setupLaunchersEvents } from './ui/launchers.js';
import { recordShortcut, saveShortcutFromInput } from './utils/shortcuts.js';
import { initToast, showWarning } from './ui/toast.js';
import { initErrorHandler } from './error-handler.js';
import { initKeyboardShortcuts } from './utils/keyboard.js';

/**
 * 渲染所有內容
 * 在配置載入後才會執行渲染
 */
async function renderAll() {
  // 防禦性檢查：確保配置已載入
  if (!isConfigLoaded()) {
    console.warn('[App] Config not loaded, skipping renderAll');
    return;
  }

  renderRecentList();
  renderFavoritesList();
  renderGroupsTab();
  renderGroupFilter();
  renderGroupSelect();
  renderTerminalSelect();
  renderDirectories();
  await renderSettings();
  await renderLaunchersTab();
}

/**
 * 設定所有事件監聽
 */
function setupEventListeners() {
  // 分頁切換
  setupTabs();

  // Tab 切換時重新渲染對應內容
  onTabChange(tabId => {
    switch (tabId) {
      case 'recent':
        renderRecentList();
        break;
      case 'favorites':
        renderFavoritesList();
        break;
      case 'groups':
        renderGroupsTab();
        break;
      case 'directories':
        renderGroupFilter();
        renderDirectories();
        break;
      case 'launchers':
        renderLaunchersTab();
        break;
    }
  });

  // 最近使用相關事件
  setupRecentEvents();

  // 最愛相關事件
  setupFavoritesEvents();

  // 群組相關事件
  setupGroupsEvents();

  // 目錄相關事件
  setupDirectoryEvents();

  // 啟動器頁面事件
  setupLaunchersEvents();

  // 設定頁面事件
  setupSettingsEvents();

  // 標題欄按鈕
  document.getElementById('btnMinimize').addEventListener('click', () => api.minimizeWindow());
  document.getElementById('btnClose').addEventListener('click', () => api.closeWindow());

  // 快捷鍵設定
  const shortcutInput = document.getElementById('globalShortcut');
  document
    .getElementById('btnRecordShortcut')
    .addEventListener('click', () => recordShortcut(shortcutInput));
  shortcutInput.addEventListener('change', () => saveShortcutFromInput(shortcutInput));
  shortcutInput.addEventListener('blur', () => saveShortcutFromInput(shortcutInput));
}

/**
 * 檢查啟動時的錯誤狀態
 */
async function checkStartupErrors() {
  // 檢查配置是否曾損壞
  const configCorrupted = await api.checkConfigCorrupted();
  if (configCorrupted) {
    showWarning(t('toast.configCorrupted'), { persistent: true });
    return; // 避免同時顯示多個警告
  }

  // 檢查快捷鍵註冊狀態
  const shortcutStatus = await api.getShortcutStatus();
  if (shortcutStatus && !shortcutStatus.success) {
    if (shortcutStatus.errorType === 'ALREADY_REGISTERED') {
      showWarning(t('toast.shortcutConflict', { shortcut: shortcutStatus.shortcut }));
    } else {
      showWarning(t('toast.shortcutRegistrationFailed'));
    }
  }
}

/**
 * 初始化應用程式
 */
async function init() {
  // 初始化全域錯誤攔截器（最先執行）
  initErrorHandler();

  // 預先快取常用 DOM 元素
  preCacheElements(COMMON_ELEMENT_IDS);

  await loadConfig();

  // 驗證所有目錄路徑（背景執行，不阻塞 UI）
  validateAllPaths();

  // 應用保存的主題設定
  const config = getConfig();
  applyTheme(config.settings?.theme || 'dark');
  applyShowTabText(config.settings?.showTabText !== false);

  // 初始化 i18n
  await initI18n(config.settings?.language || 'zh-TW');

  // 初始化 Toast 通知
  initToast();

  await renderAll();
  setupEventListeners();

  // 初始化鍵盤快捷鍵
  initKeyboardShortcuts();

  // 檢查啟動時的錯誤狀態
  await checkStartupErrors();
}

// 啟動應用程式
init();
