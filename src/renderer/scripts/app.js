/**
 * 應用程式入口
 * 初始化並整合所有模組
 */
import { loadConfig, getConfig } from './state.js';
import { api } from './api.js';
import { initI18n } from './i18n.js';
import { setupTabs } from './ui/tabs.js';
import {
  renderGroupFilter,
  renderGroupSelect,
  renderDirectories,
  renderRecentList,
  toggleAddForm,
  browsePath,
  addDirectory,
  setupDirectoryEvents,
} from './ui/directories.js';
import {
  renderSettings,
  renderGroupsList,
  addGroup,
  exportConfig,
  importConfig,
  setupSettingsEvents,
  applyTheme,
} from './ui/settings.js';
import { recordShortcut, saveShortcutFromInput } from './utils/shortcuts.js';

/**
 * 渲染所有內容
 */
function renderAll() {
  renderGroupFilter();
  renderGroupSelect();
  renderDirectories();
  renderRecentList();
  renderSettings();
  renderGroupsList();
}

/**
 * 設定所有事件監聽
 */
function setupEventListeners() {
  // 分頁切換
  setupTabs();

  // 目錄相關事件
  setupDirectoryEvents();

  // 設定頁面事件
  setupSettingsEvents();

  // 標題欄按鈕
  document.getElementById('btnMinimize').addEventListener('click', () => api.minimizeWindow());
  document.getElementById('btnClose').addEventListener('click', () => api.closeWindow());

  // 新增目錄區塊
  document.getElementById('btnToggleAddForm').addEventListener('click', toggleAddForm);
  document.getElementById('btnBrowsePath').addEventListener('click', browsePath);
  document.getElementById('btnAddDirectory').addEventListener('click', addDirectory);

  // 快捷鍵設定
  const shortcutInput = document.getElementById('globalShortcut');
  document
    .getElementById('btnRecordShortcut')
    .addEventListener('click', () => recordShortcut(shortcutInput));
  shortcutInput.addEventListener('change', () => saveShortcutFromInput(shortcutInput));
  shortcutInput.addEventListener('blur', () => saveShortcutFromInput(shortcutInput));

  // 群組管理
  document.getElementById('btnAddGroup').addEventListener('click', addGroup);

  // 匯入匯出
  document.getElementById('btnExportConfig').addEventListener('click', exportConfig);
  document.getElementById('btnImportConfig').addEventListener('click', importConfig);
}

/**
 * 初始化應用程式
 */
async function init() {
  await loadConfig();

  // 應用保存的主題設定
  const config = getConfig();
  applyTheme(config.settings?.theme || 'dark');

  // 初始化 i18n
  await initI18n(config.settings?.language || 'zh-TW');

  renderAll();
  setupEventListeners();
}

// 啟動應用程式
init();
