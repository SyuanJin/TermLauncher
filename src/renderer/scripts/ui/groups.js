/**
 * 群組 Tab 模組
 * 處理群組的顯示與管理
 */
import { getConfig, saveConfig } from '../state.js';
import { showToast } from './toast.js';
import { t } from '../i18n.js';
import { openModal } from './modal.js';
import { renderGroupFilter, renderGroupSelect, renderDirectories } from './directories.js';
import { initGroupsDragDrop } from './dragDrop.js';
import { escapeHtml, escapeAttr } from '../utils/escape.js';
import { getElement } from '../utils/dom-cache.js';
import { debounce } from '../utils/debounce.js';
import { getGroupDisplayName } from '../utils/terminal.js';

// 事件委派初始化標記
let groupsDelegationInitialized = false;

/**
 * 取得或重建空狀態元素
 * @returns {HTMLElement} 空狀態元素
 */
function getOrCreateEmptyState() {
  let emptyState = document.getElementById('groupsEmptyState');
  if (!emptyState) {
    // 如果元素被移除，重新創建
    emptyState = document.createElement('div');
    emptyState.id = 'groupsEmptyState';
    emptyState.className = 'empty-state';
    emptyState.innerHTML =
      '<span class="empty-icon">📁</span>' +
      '<p data-i18n="ui.groups.empty">' +
      t('ui.groups.empty') +
      '</p>' +
      '<small data-i18n="ui.groups.emptyHint">' +
      t('ui.groups.emptyHint') +
      '</small>';
  }
  return emptyState;
}

/**
 * 計算群組內的目錄數量
 * @param {string} groupId - 群組 ID
 * @returns {number} 目錄數量
 */
function getDirectoryCount(groupId) {
  const config = getConfig();
  return config.directories.filter(d => d.group === groupId).length;
}

/**
 * 取得所有群組（按 order 排序）
 * @returns {Array} 排序後的群組
 */
function getSortedGroups() {
  const config = getConfig();
  return [...config.groups].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * 渲染群組列表
 */
export function renderGroupsTab() {
  const container = getElement('groupsListContainer');
  if (!container) return;

  const emptyState = getOrCreateEmptyState();
  const searchInput = getElement('groupsSearchInput');
  const search = searchInput?.value?.toLowerCase() || '';

  let groups = getSortedGroups();

  if (search) {
    groups = groups.filter(g => {
      const displayName = getGroupDisplayName(g);
      return displayName.toLowerCase().includes(search);
    });
  }

  if (groups.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.classList.remove('hidden');

    if (search) {
      emptyState.querySelector('p').textContent = t('ui.groups.emptyFiltered');
      emptyState.querySelector('small').textContent = t('ui.groups.emptyFilteredHint');
    } else {
      emptyState.querySelector('p').textContent = t('ui.groups.empty');
      emptyState.querySelector('small').textContent = t('ui.groups.emptyHint');
    }
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML =
    '<div class="groups-grid">' +
    groups
      .map(group => {
        const displayName = getGroupDisplayName(group);
        const dirCount = getDirectoryCount(group.id);

        return (
          '<div class="group-card' +
          (group.isDefault ? ' default' : '') +
          '" data-group-id="' +
          escapeAttr(group.id) +
          '" tabindex="0" role="button"><div class="drag-handle" title="' +
          escapeAttr(t('ui.favorites.dragHint')) +
          '">⋮⋮</div><div class="group-card-icon">' +
          escapeHtml(group.icon || '📁') +
          '</div><div class="group-card-info"><div class="group-card-name">' +
          escapeHtml(displayName) +
          (group.isDefault
            ? '<span class="default-badge">' + escapeHtml(t('ui.groups.defaultBadge')) + '</span>'
            : '') +
          '</div><div class="group-card-count">' +
          escapeHtml(t('ui.groups.directoryCount', { count: dirCount })) +
          '</div></div><div class="group-card-actions">' +
          (group.isDefault
            ? ''
            : '<button class="btn-icon edit" data-edit-group="' +
              escapeAttr(group.id) +
              '" title="' +
              escapeAttr(t('common.edit')) +
              '" aria-label="' +
              escapeAttr(t('ui.groups.editGroup', { name: displayName })) +
              '">✏️</button><button class="btn-icon delete" data-delete-group="' +
              escapeAttr(group.id) +
              '" title="' +
              escapeAttr(t('common.delete')) +
              '" aria-label="' +
              escapeAttr(t('ui.groups.deleteGroupLabel', { name: displayName })) +
              '">🗑️</button>') +
          '</div></div>'
        );
      })
      .join('') +
    '</div>';

  initGroupsDragDrop();
}

/**
 * 初始化群組事件委派（僅執行一次）
 */
function initGroupsEventDelegation() {
  if (groupsDelegationInitialized) return;
  groupsDelegationInitialized = true;

  const container = getElement('groupsListContainer');
  if (!container) return;

  // 處理點擊事件
  const handleClick = e => {
    // 檢查是否點擊編輯按鈕
    const editBtn = e.target.closest('[data-edit-group]');
    if (editBtn) {
      e.stopPropagation();
      showEditGroupModal(editBtn.dataset.editGroup);
      return;
    }

    // 檢查是否點擊刪除按鈕
    const deleteBtn = e.target.closest('[data-delete-group]');
    if (deleteBtn) {
      e.stopPropagation();
      showDeleteGroupModal(deleteBtn.dataset.deleteGroup);
      return;
    }

    // 檢查是否點擊群組卡片（但不是按鈕）
    const card = e.target.closest('.group-card');
    if (card && !e.target.closest('.btn-icon')) {
      const groupId = card.dataset.groupId;
      const config = getConfig();
      const group = config.groups.find(g => g.id === groupId);
      if (group && !group.isDefault) {
        showEditGroupModal(groupId);
      }
    }
  };

  container.addEventListener('click', handleClick);
  container.addEventListener('dblclick', handleClick);

  // 處理鍵盤事件
  container.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.group-card');
      if (card && !e.target.closest('.btn-icon')) {
        e.preventDefault();
        const groupId = card.dataset.groupId;
        const config = getConfig();
        const group = config.groups.find(g => g.id === groupId);
        if (group && !group.isDefault) {
          showEditGroupModal(groupId);
        }
      }
    }
  });
}

/**
 * 顯示新增群組彈窗
 */
export function showAddGroupModal() {
  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group" style="max-width: 80px">' +
    '<label>' +
    escapeHtml(t('ui.groups.icon')) +
    '</label>' +
    '<input type="text" id="modalGroupIcon" placeholder="📁" maxlength="2" class="icon-input" title="' +
    escapeAttr(t('ui.addDirectory.iconHint')) +
    '" />' +
    '</div>' +
    '<div class="input-group flex-1">' +
    '<label>' +
    escapeHtml(t('ui.groups.name')) +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalGroupName" placeholder="' +
    escapeAttr(t('ui.groups.namePlaceholder')) +
    '" />' +
    '</div>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.groups.addTitle'),
    content,
    confirmText: t('common.add'),
    onConfirm: async () => {
      const name = document.getElementById('modalGroupName').value.trim();
      const icon = document.getElementById('modalGroupIcon').value.trim() || '📁';

      if (!name) {
        showToast(t('toast.enterGroupName'), 'error');
        return false;
      }

      const config = getConfig();
      const exists = config.groups.some(g => g.name === name);
      if (exists) {
        showToast(t('toast.groupExists'), 'error');
        return false;
      }

      const maxOrder = Math.max(...config.groups.map(g => g.order || 0), -1);

      config.groups.push({
        id: 'group-' + Date.now(),
        name,
        icon,
        isDefault: false,
        order: maxOrder + 1,
      });

      await saveConfig();
      renderGroupsTab();
      renderGroupFilter();
      renderGroupSelect();
      showToast(t('toast.groupAdded'), 'success');
      return true;
    },
  });

  setTimeout(() => {
    document.getElementById('modalGroupName')?.focus();
  }, 100);
}

/**
 * 顯示編輯群組彈窗
 * @param {string} groupId - 群組 ID
 */
function showEditGroupModal(groupId) {
  const config = getConfig();
  const group = config.groups.find(g => g.id === groupId);
  if (!group || group.isDefault) return;

  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group" style="max-width: 80px">' +
    '<label>' +
    escapeHtml(t('ui.groups.icon')) +
    '</label>' +
    '<input type="text" id="modalGroupIcon" value="' +
    escapeAttr(group.icon || '') +
    '" maxlength="2" class="icon-input" title="' +
    escapeAttr(t('ui.addDirectory.iconHint')) +
    '" />' +
    '</div>' +
    '<div class="input-group flex-1">' +
    '<label>' +
    escapeHtml(t('ui.groups.name')) +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalGroupName" value="' +
    escapeAttr(group.name) +
    '" />' +
    '</div>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.groups.editTitle'),
    content,
    confirmText: t('common.save'),
    onConfirm: async () => {
      const name = document.getElementById('modalGroupName').value.trim();
      const icon = document.getElementById('modalGroupIcon').value.trim() || '📁';

      if (!name) {
        showToast(t('toast.enterGroupName'), 'error');
        return false;
      }

      const exists = config.groups.some(g => g.id !== groupId && g.name === name);
      if (exists) {
        showToast(t('toast.groupExists'), 'error');
        return false;
      }

      group.name = name;
      group.icon = icon;

      await saveConfig();
      renderGroupsTab();
      renderGroupFilter();
      renderGroupSelect();
      renderDirectories();
      showToast(t('toast.groupUpdated'), 'success');
      return true;
    },
  });

  setTimeout(() => {
    document.getElementById('modalGroupName')?.focus();
  }, 100);
}

/**
 * 顯示刪除群組彈窗
 * @param {string} groupId - 群組 ID
 */
function showDeleteGroupModal(groupId) {
  const config = getConfig();
  const group = config.groups.find(g => g.id === groupId);
  if (!group || group.isDefault) return;

  const dirCount = getDirectoryCount(groupId);
  const displayName = getGroupDisplayName(group);

  let content = '<p>' + escapeHtml(t('ui.groups.deleteConfirm', { name: displayName })) + '</p>';

  if (dirCount > 0) {
    content +=
      '<p class="warning">' +
      escapeHtml(t('ui.groups.deleteHasDirectories', { count: dirCount })) +
      '</p><div class="radio-group"><label><input type="radio" name="deleteAction" value="move" checked /> ' +
      escapeHtml(t('ui.groups.moveToDefault')) +
      '</label><label><input type="radio" name="deleteAction" value="delete" /> ' +
      escapeHtml(t('ui.groups.deleteWithDirectories')) +
      '</label></div>';
  }

  openModal({
    title: t('ui.groups.deleteTitle'),
    content,
    confirmText: t('ui.groups.confirmDelete'),
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      const action = document.querySelector('input[name="deleteAction"]:checked')?.value || 'move';

      if (action === 'delete') {
        config.directories = config.directories.filter(d => d.group !== groupId);
        config.favorites =
          config.favorites?.filter(id => {
            return config.directories.some(d => d.id === id);
          }) || [];
      } else {
        config.directories.forEach(d => {
          if (d.group === groupId) d.group = 'default';
        });
      }

      config.groups = config.groups.filter(g => g.id !== groupId);
      await saveConfig();

      renderGroupsTab();
      renderGroupFilter();
      renderGroupSelect();
      renderDirectories();
      showToast(t('toast.groupDeleted'), 'success');
      return true;
    },
  });
}

/**
 * 設定群組 Tab 的事件監聽
 */
export function setupGroupsEvents() {
  const searchInput = getElement('groupsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(renderGroupsTab, 150));
  }

  const addBtn = getElement('btnAddGroupTab');
  if (addBtn) {
    addBtn.addEventListener('click', showAddGroupModal);
  }

  // 初始化事件委派
  initGroupsEventDelegation();
}
