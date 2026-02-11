/**
 * 分頁切換模組
 * 處理分頁標籤的切換邏輯
 */

import { getConfig } from '../state.js';
import { getElement } from '../utils/dom-cache.js';

// 當前 Tab
let currentTab = 'recent';

// Tab 切換回調
const tabChangeCallbacks = [];

/**
 * 取得當前 Tab
 * @returns {string} 當前 Tab ID
 */
export function getCurrentTab() {
  return currentTab;
}

/**
 * 註冊 Tab 切換回調
 * @param {Function} callback - 回調函式 (tabId) => void
 */
export function onTabChange(callback) {
  tabChangeCallbacks.push(callback);
}

/**
 * 切換到指定 Tab
 * @param {string} tabId - Tab ID
 */
export function switchTab(tabId) {
  const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
  if (tab) {
    activateTab(tab);
  }
}

/**
 * 啟動指定的 Tab
 * @param {HTMLElement} tab - Tab 元素
 */
function activateTab(tab) {
  const tabId = tab.dataset.tab;

  // 移除所有 active 狀態
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // 設定當前分頁為 active
  tab.classList.add('active');
  const tabContent = document.getElementById(tabId + '-tab');
  if (tabContent) {
    tabContent.classList.add('active');
  }

  // 更新當前 Tab
  currentTab = tabId;

  // 觸發回調
  tabChangeCallbacks.forEach(cb => cb(tabId));
}

/**
 * 更新 Tab 文字顯示狀態
 * @param {boolean} showText - 是否顯示文字
 */
export function updateTabTextVisibility(showText) {
  const tabsContainer = getElement('tabsContainer');
  if (tabsContainer) {
    if (showText) {
      tabsContainer.classList.remove('icon-only');
    } else {
      tabsContainer.classList.add('icon-only');
    }
  }
}

/**
 * 檢查 Tab 列是否溢出，溢出時自動切換為純圖示模式
 * 當使用者手動關閉 Tab 文字時不介入
 */
export function checkTabsOverflow() {
  const tabsContainer = getElement('tabsContainer');
  if (!tabsContainer) return;

  // 使用者已手動關閉 Tab 文字，不介入
  if (document.body.classList.contains('hide-tab-text')) return;

  // 暫時移除 icon-only 以測量完整文字寬度
  tabsContainer.classList.remove('icon-only');

  // 存取 scrollWidth 會強制瀏覽器回流，取得準確測量值
  const isOverflowing = tabsContainer.scrollWidth > tabsContainer.clientWidth;

  if (isOverflowing) {
    tabsContainer.classList.add('icon-only');
  }
}

/** resize 防抖計時器 */
let resizeTimer = null;

/**
 * 設定分頁切換事件監聽
 */
export function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab);
    });
  });

  // 讀取設定，套用 Tab 文字顯示狀態
  const config = getConfig();
  if (config && config.settings) {
    const showText = config.settings.showTabText !== false; // 預設顯示
    updateTabTextVisibility(showText);
  }

  // 初始化時檢查溢出
  checkTabsOverflow();

  // 視窗大小變更時重新檢查
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkTabsOverflow, 100);
  });
}
