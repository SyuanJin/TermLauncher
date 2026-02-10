/**
 * 應用內鍵盤快捷鍵模組
 * 處理應用程式內的鍵盤操作
 */
import { switchTab, getCurrentTab } from '../ui/tabs.js';
import { closeCurrentModal } from '../ui/modal.js';
import { showAddDirectoryModal } from '../ui/directories.js';

// Tab 對應表
const TAB_MAP = {
  1: 'recent',
  2: 'favorites',
  3: 'groups',
  4: 'directories',
  5: 'launchers',
  6: 'settings',
};

// 當前 Tab 對應的搜尋框 ID
const SEARCH_INPUT_MAP = {
  recent: 'recentSearchInput',
  favorites: 'favoritesSearchInput',
  groups: 'groupsSearchInput',
  directories: 'searchInput',
};

/**
 * 取得當前 Tab 的搜尋框
 * @returns {HTMLElement|null} 搜尋框元素
 */
function getCurrentSearchInput() {
  const currentTab = getCurrentTab();
  const inputId = SEARCH_INPUT_MAP[currentTab];
  return inputId ? document.getElementById(inputId) : null;
}

/**
 * 聚焦搜尋框
 */
function focusSearch() {
  const searchInput = getCurrentSearchInput();
  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
}

/**
 * 清空搜尋框
 */
function clearSearch() {
  const searchInput = getCurrentSearchInput();
  if (searchInput && searchInput.value) {
    searchInput.value = '';
    // 觸發 input 事件以更新列表
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}

/**
 * 處理 Escape 鍵
 */
function handleEscape() {
  // 優先關閉彈窗
  if (closeCurrentModal()) {
    return;
  }

  // 其次清空搜尋框
  clearSearch();
}

/**
 * 處理鍵盤事件
 * @param {KeyboardEvent} e - 鍵盤事件
 */
function handleKeydown(e) {
  // 如果在輸入框中，只處理特定快捷鍵
  const isInputFocused =
    document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

  // Escape - 關閉彈窗或清空搜尋
  if (e.key === 'Escape') {
    handleEscape();
    return;
  }

  // 以下快捷鍵在輸入框中不觸發（除了 Ctrl+F）
  if (isInputFocused && !(e.ctrlKey && e.key === 'f')) {
    return;
  }

  // Ctrl + 數字鍵 - 切換 Tab
  if (e.ctrlKey && !e.shiftKey && !e.altKey) {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 6) {
      e.preventDefault();
      const tabId = TAB_MAP[num];
      if (tabId) {
        switchTab(tabId);
      }
      return;
    }

    // Ctrl+N - 新增目錄
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      showAddDirectoryModal();
      return;
    }

    // Ctrl+F - 聚焦搜尋框
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      focusSearch();
      return;
    }
  }
}

/**
 * 初始化鍵盤快捷鍵
 */
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeydown);
}
