/**
 * DOM 快取工具模組
 * 快取頻繁訪問的 DOM 元素，避免重複查詢
 *
 * 使用注意：
 * - 只快取在應用生命週期內不會被移除的靜態元素
 * - 動態生成的元素不應該使用此快取
 * - 如果 DOM 結構改變，需要調用 invalidateCache() 清除快取
 */

// 元素快取
const cache = new Map();

/**
 * 取得快取的 DOM 元素
 * @param {string} id - 元素 ID
 * @returns {HTMLElement|null} DOM 元素或 null
 */
export function getElement(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const element = document.getElementById(id);
  if (element) {
    cache.set(id, element);
  }
  return element;
}

/**
 * 使特定元素的快取失效
 * @param {string} id - 元素 ID
 */
export function invalidateElement(id) {
  cache.delete(id);
}

/**
 * 清除所有快取
 */
export function invalidateCache() {
  cache.clear();
}

/**
 * 取得快取統計資訊（用於調試）
 * @returns {Object} 快取統計
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * 預先快取常用元素
 * 在應用初始化時調用以預熱快取
 * @param {string[]} ids - 要快取的元素 ID 列表
 */
export function preCacheElements(ids) {
  ids.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      cache.set(id, element);
    }
  });
}

// 常用元素 ID 列表
export const COMMON_ELEMENT_IDS = [
  // 容器
  'recentListContainer',
  'favoritesListContainer',
  'groupsListContainer',
  'directoriesContainer',
  'terminalsList',
  'terminalDetectionStatus',
  // 搜尋輸入
  'recentSearchInput',
  'favoritesSearchInput',
  'groupsSearchInput',
  'searchInput',
  // Tab
  'tabsContainer',
  // Toast
  'toast',
  'toastText',
];
