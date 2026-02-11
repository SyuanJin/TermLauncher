/**
 * 最愛 Tab 模組
 * 處理最愛目錄的顯示與管理
 */
import { getConfig, saveConfig, loadConfig, isPathValid } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { t } from '../i18n.js';
import { renderRecentList } from './recent.js';
import { initFavoritesDragDrop } from './dragDrop.js';
import { showContextMenu } from './contextMenu.js';
import { debounce } from '../utils/debounce.js';
import {
  openTerminal as openTerminalUtil,
  openTerminalWithType as openTerminalWithTypeUtil,
  getErrorMessage,
  getTerminalDisplayName,
  getDefaultTerminalId,
  getTerminalIcon,
  getTerminalName,
} from '../utils/terminal.js';
import { escapeHtml, escapeAttr } from '../utils/escape.js';
import { getElement } from '../utils/dom-cache.js';

// 延遲導入以避免循環依賴
let showEditDirectoryModal = null;
let deleteDirectoryFn = null;
let renderDirectoriesFn = null;

// 事件委派初始化標記
let favoritesDelegationInitialized = false;

/**
 * 動態導入 directories 模組
 */
async function importDirectoriesModule() {
  if (!showEditDirectoryModal) {
    const dirModule = await import('./directories.js');
    showEditDirectoryModal = dirModule.showEditDirectoryModal;
    deleteDirectoryFn = dirModule.deleteDirectory;
    renderDirectoriesFn = dirModule.renderDirectories;
  }
}

/**
 * 取得群組名稱
 * @param {string} groupId - 群組 ID
 * @returns {string} 群組名稱
 */
function getGroupName(groupId) {
  const config = getConfig();
  const group = config.groups?.find(g => g.id === groupId);
  if (!group) return groupId;
  return group.isDefault ? t('common.default') : group.name;
}

/**
 * 清理 favorites 中的贓數據
 * - 移除孤兒 ID（目錄 entry 已不存在）
 * - 移除指向無效路徑的 ID（檔案系統路徑不存在）
 * @returns {boolean} 是否有清理動作
 */
function cleanFavorites() {
  const config = getConfig();
  if (!config.favorites || config.favorites.length === 0) return false;

  const originalLength = config.favorites.length;

  config.favorites = config.favorites.filter(id => {
    const dir = config.directories.find(d => d.id === id);
    if (!dir) return false; // 孤兒 ID

    const valid = isPathValid(dir.path);
    if (valid === false) return false; // 路徑不存在

    return true; // valid === true 或 null（未驗證）都保留
  });

  return config.favorites.length !== originalLength;
}

/**
 * 取得最愛目錄列表
 * @returns {Array} 最愛目錄
 */
function getFavoriteDirectories() {
  const config = getConfig();
  const favoriteIds = config.favorites || [];

  return config.directories
    .filter(d => favoriteIds.includes(d.id))
    .sort((a, b) => {
      const indexA = favoriteIds.indexOf(a.id);
      const indexB = favoriteIds.indexOf(b.id);
      return indexA - indexB;
    });
}

/**
 * 取得或重建空狀態元素
 * @returns {HTMLElement} 空狀態元素
 */
function getOrCreateEmptyState() {
  let emptyState = document.getElementById('favoritesEmptyState');
  if (!emptyState) {
    // 如果元素被移除，重新創建
    emptyState = document.createElement('div');
    emptyState.id = 'favoritesEmptyState';
    emptyState.className = 'empty-state';
    emptyState.innerHTML =
      '<span class="empty-icon">⭐</span>' +
      '<p data-i18n="ui.favorites.empty">' +
      t('ui.favorites.empty') +
      '</p>' +
      '<small data-i18n="ui.favorites.emptyHint">' +
      t('ui.favorites.emptyHint') +
      '</small>';
  }
  return emptyState;
}

/**
 * 渲染最愛列表
 */
export function renderFavoritesList() {
  // 清理無效的最愛引用
  const cleaned = cleanFavorites();
  if (cleaned) {
    saveConfig().catch(() => {});
  }

  const container = getElement('favoritesListContainer');
  if (!container) return;

  const emptyState = getOrCreateEmptyState();
  const searchInput = getElement('favoritesSearchInput');
  const search = searchInput?.value?.toLowerCase() || '';

  let favoriteDirs = getFavoriteDirectories();

  if (search) {
    favoriteDirs = favoriteDirs.filter(
      d => d.name.toLowerCase().includes(search) || d.path.toLowerCase().includes(search)
    );
  }

  if (favoriteDirs.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'flex';

    if (search) {
      emptyState.querySelector('p').textContent = t('ui.favorites.emptyFiltered');
      emptyState.querySelector('small').textContent = t('ui.favorites.emptyFilteredHint');
    } else {
      emptyState.querySelector('p').textContent = t('ui.favorites.empty');
      emptyState.querySelector('small').textContent = t('ui.favorites.emptyHint');
    }
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML =
    '<div class="directory-list">' +
    favoriteDirs
      .map(dir => {
        const terminalId = dir.terminalId || getDefaultTerminalId();
        const terminalIcon = getTerminalIcon(terminalId);
        const terminalName = getTerminalName(terminalId);
        const pathValid = isPathValid(dir.path);
        const isInvalid = pathValid === false;

        return (
          '<div class="directory-item' +
          (isInvalid ? ' path-invalid' : '') +
          '" data-id="' +
          dir.id +
          '" tabindex="0" role="button" aria-label="' +
          escapeAttr(t('ui.directory.openTerminal', { name: dir.name })) +
          '"><div class="drag-handle" title="' +
          escapeAttr(t('ui.favorites.dragHint')) +
          '">⋮⋮</div><div class="dir-icon">' +
          escapeHtml(terminalIcon) +
          '</div><div class="dir-info"><div class="dir-name">' +
          (dir.icon ? '<span class="dir-emoji">' + escapeHtml(dir.icon) + '</span>' : '') +
          escapeHtml(dir.name) +
          (isInvalid
            ? '<span class="path-warning" title="' +
              escapeAttr(t('ui.directory.pathInvalid')) +
              '">⚠️</span>'
            : '') +
          '<span class="tag">' +
          escapeHtml(terminalName) +
          '</span></div><div class="dir-path">' +
          escapeHtml(dir.path) +
          '</div></div><div class="dir-actions"><button class="btn-icon favorite active" data-toggle-favorite="' +
          dir.id +
          '" title="' +
          escapeAttr(t('common.removeFromFavorites')) +
          '" aria-label="' +
          escapeAttr(t('common.removeFromFavorites')) +
          '">⭐</button><button class="btn-icon edit" data-edit-dir="' +
          dir.id +
          '" title="' +
          escapeAttr(t('common.edit')) +
          '" aria-label="' +
          escapeAttr(t('ui.directory.editItem', { name: dir.name })) +
          '">✏️</button><button class="btn-icon delete" data-delete-dir="' +
          dir.id +
          '" title="' +
          escapeAttr(t('common.delete')) +
          '" aria-label="' +
          escapeAttr(t('ui.directory.deleteItem', { name: dir.name })) +
          '">🗑️</button></div></div>'
        );
      })
      .join('') +
    '</div>';

  initFavoritesDragDrop();
}

/**
 * 初始化最愛項目的事件委派
 * 只執行一次，在容器上綁定事件監聽器
 */
function initFavoritesEventDelegation() {
  if (favoritesDelegationInitialized) return;
  favoritesDelegationInitialized = true;

  const container = getElement('favoritesListContainer');
  if (!container) return;

  // 點擊事件委派
  container.addEventListener('click', async e => {
    // 處理最愛按鈕
    const toggleBtn = e.target.closest('[data-toggle-favorite]');
    if (toggleBtn) {
      e.stopPropagation();
      const id = parseInt(toggleBtn.dataset.toggleFavorite, 10);
      toggleFavorite(id);
      return;
    }

    // 處理編輯按鈕
    const editBtn = e.target.closest('[data-edit-dir]');
    if (editBtn) {
      e.stopPropagation();
      await importDirectoriesModule();
      const id = parseInt(editBtn.dataset.editDir, 10);
      showEditDirectoryModal(id);
      return;
    }

    // 處理刪除按鈕
    const deleteBtn = e.target.closest('[data-delete-dir]');
    if (deleteBtn) {
      e.stopPropagation();
      await importDirectoriesModule();
      const id = parseInt(deleteBtn.dataset.deleteDir, 10);
      await deleteDirectoryFn(id);
      return;
    }

    // 處理目錄項目點擊（開啟終端）
    const item = e.target.closest('.directory-item');
    if (item && !e.target.closest('.btn-icon')) {
      const id = parseInt(item.dataset.id, 10);
      openTerminalUtil(id, refreshFavoritesViews);
    }
  });

  // 鍵盤事件委派
  container.addEventListener('keydown', async e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    // 處理最愛按鈕
    const toggleBtn = e.target.closest('[data-toggle-favorite]');
    if (toggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(toggleBtn.dataset.toggleFavorite, 10);
      toggleFavorite(id);
      return;
    }

    // 處理目錄項目（開啟終端）
    const item = e.target.closest('.directory-item');
    if (item && !e.target.closest('.btn-icon')) {
      e.preventDefault();
      const id = parseInt(item.dataset.id, 10);
      openTerminalUtil(id, refreshFavoritesViews);
    }
  });

  // 右鍵選單事件委派
  container.addEventListener('contextmenu', e => {
    const item = e.target.closest('.directory-item');
    if (item) {
      const id = parseInt(item.dataset.id, 10);
      showFavoritesContextMenu(e, id);
    }
  });

  // 雙擊編輯事件委派
  container.addEventListener('dblclick', async e => {
    const item = e.target.closest('.directory-item');
    if (item && !e.target.closest('.btn-icon')) {
      await importDirectoriesModule();
      const id = parseInt(item.dataset.id, 10);
      showEditDirectoryModal(id);
    }
  });
}

/**
 * 顯示最愛右鍵選單
 * @param {MouseEvent} event - 滑鼠事件
 * @param {number} dirId - 目錄 ID
 */
function showFavoritesContextMenu(event, dirId) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  // 構建終端子選單
  const terminalSubmenu = config.terminals
    .filter(terminal => !terminal.hidden)
    .map(terminal => ({
      icon: terminal.icon || '💻',
      label: getTerminalDisplayName(terminal),
      onClick: () => openTerminalWithTypeUtil(dirId, terminal.id, refreshFavoritesViews),
    }));

  const menuItems = [
    {
      icon: getTerminalIcon(dir.terminalId || getDefaultTerminalId()),
      label: t('contextMenu.openDefault'),
      onClick: () => openTerminalUtil(dirId, refreshFavoritesViews),
    },
    {
      icon: '▶',
      label: t('contextMenu.openWith'),
      submenu: terminalSubmenu,
    },
    { separator: true },
    {
      icon: '⭐',
      label: t('common.removeFromFavorites'),
      onClick: () => toggleFavorite(dirId),
    },
    {
      icon: '✏️',
      label: t('common.edit'),
      onClick: async () => {
        await importDirectoriesModule();
        showEditDirectoryModal(dirId);
      },
    },
    { separator: true },
    {
      icon: '🗑️',
      label: t('common.delete'),
      danger: true,
      onClick: async () => {
        await importDirectoriesModule();
        await deleteDirectoryFn(dirId);
      },
    },
  ];

  showContextMenu(event, menuItems);
}

/**
 * 重新整理最愛相關視圖
 */
function refreshFavoritesViews() {
  renderFavoritesList();
  renderRecentList();
}

/**
 * 切換最愛狀態
 * @param {number} id - 目錄 ID
 */
export async function toggleFavorite(id) {
  const config = getConfig();
  if (!config.favorites) {
    config.favorites = [];
  }

  const index = config.favorites.indexOf(id);
  if (index === -1) {
    config.favorites.push(id);
    await saveConfig();
    showToast(t('toast.addedToFavorites'), 'success');
  } else {
    config.favorites.splice(index, 1);
    await saveConfig();
    showToast(t('toast.removedFromFavorites'), 'success');
  }

  renderFavoritesList();
}

/**
 * 檢查是否為最愛
 * @param {number} id - 目錄 ID
 * @returns {boolean} 是否為最愛
 */
export function isFavorite(id) {
  const config = getConfig();
  return config.favorites?.includes(id) || false;
}

/**
 * 設定最愛 Tab 的事件監聽
 */
export function setupFavoritesEvents() {
  const searchInput = getElement('favoritesSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(renderFavoritesList, 150));
  }

  // 初始化事件委派（只執行一次）
  initFavoritesEventDelegation();
}
