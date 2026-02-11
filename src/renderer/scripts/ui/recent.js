/**
 * 最近使用 Tab 模組
 * 處理最近使用目錄的顯示與管理
 */
import { getConfig, saveConfig, loadConfig, isPathValid } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { t } from '../i18n.js';
import { showContextMenu } from './contextMenu.js';
import { isFavorite, toggleFavorite } from './favorites.js';
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

/**
 * 格式化相對時間
 * @param {number} timestamp - 時間戳
 * @returns {string} 相對時間字串
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return t('ui.recent.daysAgo', { count: days });
  }
  if (hours > 0) {
    return t('ui.recent.hoursAgo', { count: hours });
  }
  if (minutes > 0) {
    return t('ui.recent.minutesAgo', { count: minutes });
  }
  return t('ui.recent.justNow');
}

/**
 * 取得最近使用的目錄列表
 * @returns {Array} 排序後的最近使用目錄
 */
function getRecentDirectories() {
  const config = getConfig();
  const recentLimit = config.settings?.recentLimit || 10;

  return config.directories
    .filter(d => d.lastUsed)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, recentLimit);
}

/**
 * 取得或重建空狀態元素
 * @returns {HTMLElement} 空狀態元素
 */
function getOrCreateEmptyState() {
  let emptyState = document.getElementById('recentEmptyState');
  if (!emptyState) {
    // 如果元素被移除，重新創建
    emptyState = document.createElement('div');
    emptyState.id = 'recentEmptyState';
    emptyState.className = 'empty-state';
    emptyState.innerHTML =
      '<span class="empty-icon">🕐</span>' +
      '<p data-i18n="ui.recent.empty">' +
      t('ui.recent.empty') +
      '</p>' +
      '<small data-i18n="ui.recent.emptyHint">' +
      t('ui.recent.emptyHint') +
      '</small>';
  }
  return emptyState;
}

/**
 * 渲染最近使用列表
 */
export function renderRecentList() {
  const config = getConfig();
  const container = getElement('recentListContainer');
  if (!container) return;

  const emptyState = getOrCreateEmptyState();
  const searchInput = getElement('recentSearchInput');
  const search = searchInput?.value?.toLowerCase() || '';

  let recentDirs = getRecentDirectories();

  if (search) {
    recentDirs = recentDirs.filter(
      d => d.name.toLowerCase().includes(search) || d.path.toLowerCase().includes(search)
    );
  }

  if (recentDirs.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'flex';

    if (search) {
      emptyState.querySelector('p').textContent = t('ui.recent.emptyFiltered');
      emptyState.querySelector('small').textContent = t('ui.recent.emptyFilteredHint');
    } else {
      emptyState.querySelector('p').textContent = t('ui.recent.empty');
      emptyState.querySelector('small').textContent = t('ui.recent.emptyHint');
    }
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML =
    '<div class="directory-list">' +
    recentDirs
      .map(dir => {
        const terminalId = dir.terminalId || getDefaultTerminalId();
        const terminalIcon = getTerminalIcon(terminalId);
        const terminalName = getTerminalName(terminalId);
        const relativeTime = formatRelativeTime(dir.lastUsed);
        const dirIsFavorite = config.favorites?.includes(dir.id);
        const pathValid = isPathValid(dir.path);
        const isInvalid = pathValid === false;

        return (
          '<div class="directory-item' +
          (isInvalid ? ' path-invalid' : '') +
          '" data-id="' +
          dir.id +
          '" tabindex="0" role="button" aria-label="' +
          escapeAttr(t('ui.directory.openTerminal', { name: dir.name })) +
          '"><div class="dir-icon">' +
          escapeHtml(terminalIcon) +
          '</div><div class="dir-info"><div class="dir-name">' +
          (dir.icon ? '<span class="dir-emoji">' + escapeHtml(dir.icon) + '</span>' : '') +
          escapeHtml(dir.name) +
          (isInvalid
            ? '<span class="path-warning" title="' +
              escapeAttr(t('ui.directory.pathInvalid')) +
              '">⚠️</span>'
            : '') +
          (dirIsFavorite ? '<span class="favorite-badge">⭐</span>' : '') +
          '<span class="tag">' +
          escapeHtml(terminalName) +
          '</span></div><div class="dir-path">' +
          escapeHtml(dir.path) +
          '</div><div class="dir-meta"><span class="last-used">' +
          escapeHtml(relativeTime) +
          '</span></div></div><div class="dir-actions"><button class="btn-icon delete" data-remove-recent="' +
          dir.id +
          '" title="' +
          escapeAttr(t('common.removeFromRecent')) +
          '" aria-label="' +
          escapeAttr(t('common.removeFromRecent')) +
          '">✕</button></div></div>'
        );
      })
      .join('') +
    '</div>';
}

/**
 * 初始化最近使用列表的事件委派（僅需呼叫一次）
 */
let recentDelegationInitialized = false;
function initRecentEventDelegation() {
  if (recentDelegationInitialized) return;
  recentDelegationInitialized = true;

  const container = document.getElementById('recentListContainer');
  if (!container) return;

  // 點擊事件委派
  container.addEventListener('click', e => {
    // 移除按鈕
    const removeBtn = e.target.closest('[data-remove-recent]');
    if (removeBtn) {
      e.stopPropagation();
      const id = parseInt(removeBtn.dataset.removeRecent, 10);
      removeFromRecent(id);
      return;
    }

    // 目錄項目（排除按鈕區域）
    if (e.target.closest('.btn-icon')) return;
    const item = e.target.closest('.directory-item');
    if (item) {
      const id = parseInt(item.dataset.id, 10);
      openTerminalUtil(id, renderRecentList);
    }
  });

  // 鍵盤事件委派
  container.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const removeBtn = e.target.closest('[data-remove-recent]');
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(removeBtn.dataset.removeRecent, 10);
      removeFromRecent(id);
      return;
    }

    const item = e.target.closest('.directory-item');
    if (item) {
      e.preventDefault();
      const id = parseInt(item.dataset.id, 10);
      openTerminalUtil(id, renderRecentList);
    }
  });

  // 右鍵選單事件委派
  container.addEventListener('contextmenu', e => {
    const item = e.target.closest('.directory-item');
    if (item) {
      const id = parseInt(item.dataset.id, 10);
      showRecentContextMenu(e, id);
    }
  });
}

/**
 * 切換最愛狀態並更新最近使用列表
 * @param {number} id - 目錄 ID
 */
async function toggleFavoriteAndRefresh(id) {
  await toggleFavorite(id);
  renderRecentList();
}

/**
 * 顯示最近使用右鍵選單
 * @param {MouseEvent} event - 滑鼠事件
 * @param {number} dirId - 目錄 ID
 */
function showRecentContextMenu(event, dirId) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  const dirIsFavorite = isFavorite(dirId);

  // 構建終端子選單
  const terminalSubmenu = config.terminals
    .filter(terminal => !terminal.hidden)
    .map(terminal => ({
      icon: terminal.icon || '💻',
      label: getTerminalDisplayName(terminal),
      onClick: () => openTerminalWithTypeUtil(dirId, terminal.id, renderRecentList),
    }));

  const menuItems = [
    {
      icon: getTerminalIcon(dir.terminalId || getDefaultTerminalId()),
      label: t('contextMenu.openDefault'),
      onClick: () => openTerminalUtil(dirId, renderRecentList),
    },
    {
      icon: '▶',
      label: t('contextMenu.openWith'),
      submenu: terminalSubmenu,
    },
    { separator: true },
    {
      icon: dirIsFavorite ? '⭐' : '☆',
      label: dirIsFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites'),
      onClick: () => toggleFavoriteAndRefresh(dirId),
    },
    { separator: true },
    {
      icon: '✕',
      label: t('common.removeFromRecent'),
      onClick: () => removeFromRecent(dirId),
    },
  ];

  showContextMenu(event, menuItems);
}

/**
 * 從最近使用中移除
 * @param {number} id - 目錄 ID
 */
async function removeFromRecent(id) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === id);
  if (!dir) return;

  dir.lastUsed = null;
  await saveConfig();

  renderRecentList();
  showToast(t('toast.removedFromRecent'), 'success');
}

/**
 * 清除所有最近使用紀錄
 */
export async function clearAllRecent() {
  const config = getConfig();

  config.directories.forEach(dir => {
    dir.lastUsed = null;
  });

  await saveConfig();
  renderRecentList();
  showToast(t('toast.recentCleared'), 'success');
}

/**
 * 設定最近使用 Tab 的事件監聽
 */
export function setupRecentEvents() {
  const searchInput = getElement('recentSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(renderRecentList, 150));
  }
  initRecentEventDelegation();
}
