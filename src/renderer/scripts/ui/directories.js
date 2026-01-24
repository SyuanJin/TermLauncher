/**
 * 目錄列表模組
 * 處理目錄的顯示、新增、刪除等操作
 */
import { getConfig, saveConfig, loadConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { openModal } from './modal.js';
import { t } from '../i18n.js';
import { renderFavoritesList } from './favorites.js';
import { renderRecentList } from './recent.js';
import { initDirectoriesDragDrop } from './dragDrop.js';
import { showContextMenu } from './contextMenu.js';
import {
  openTerminalWithType as openTerminalWithTypeUtil,
  getErrorMessage,
} from '../utils/terminal.js';

let allGroupsCollapsed = false;
let selectedGroupFilters = []; // 多選群組篩選

/**
 * 取得終端配置
 * @param {string} terminalId - 終端 ID
 * @returns {Object|null} 終端配置物件
 */
function getTerminal(terminalId) {
  const config = getConfig();
  return config.terminals?.find(t => t.id === terminalId) || null;
}

/**
 * 取得終端圖示
 * @param {string} terminalId - 終端 ID
 * @returns {string} 終端圖示
 */
function getTerminalIcon(terminalId) {
  const terminal = getTerminal(terminalId);
  return terminal?.icon || '💻';
}

/**
 * 取得終端名稱
 * @param {string} terminalId - 終端 ID
 * @returns {string} 終端名稱
 */
function getTerminalName(terminalId) {
  const terminal = getTerminal(terminalId);
  return terminal?.name || terminalId;
}

/**
 * 檢查是否為最愛
 * @param {number} id - 目錄 ID
 * @returns {boolean} 是否為最愛
 */
function isFavorite(id) {
  const config = getConfig();
  return config.favorites?.includes(id) || false;
}

/**
 * 取得群組顯示名稱
 * @param {Object} group - 群組物件
 * @returns {string} 群組顯示名稱
 */
function getGroupDisplayName(group) {
  const defaultGroupName = t('common.default');
  return group.isDefault ? defaultGroupName : group.name;
}

/**
 * 產生終端選項 HTML
 * @param {string} selectedId - 選中的終端 ID
 * @returns {string} 選項 HTML
 */
function getTerminalOptionsHtml(selectedId = 'wsl-ubuntu') {
  const config = getConfig();

  return config.terminals
    .filter(terminal => {
      // 過濾掉已隱藏的終端（但保留已選中的終端）
      if (terminal.hidden && terminal.id !== selectedId) {
        return false;
      }
      return true;
    })
    .map(
      terminal =>
        '<option value="' +
        terminal.id +
        '"' +
        (terminal.id === selectedId ? ' selected' : '') +
        '>' +
        terminal.icon +
        ' ' +
        terminal.name +
        '</option>'
    )
    .join('');
}

/**
 * 產生群組選項 HTML
 * @param {string} selectedId - 選中的群組 ID
 * @returns {string} 選項 HTML
 */
function getGroupOptionsHtml(selectedId = 'default') {
  const config = getConfig();
  // 按 order 排序群組
  const sortedGroups = [...config.groups].sort((a, b) => (a.order || 0) - (b.order || 0));
  return sortedGroups
    .map(
      g =>
        '<option value="' +
        g.id +
        '"' +
        (g.id === selectedId ? ' selected' : '') +
        '>' +
        getGroupDisplayName(g) +
        '</option>'
    )
    .join('');
}

/**
 * 渲染篩選標籤
 */
export function renderGroupFilter() {
  renderFilterTags();
}

/**
 * 渲染篩選標籤
 */
function renderFilterTags() {
  const config = getConfig();
  const container = document.getElementById('filterTags');
  const list = document.getElementById('filterTagsList');
  if (!container || !list) return;

  if (selectedGroupFilters.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  list.innerHTML = selectedGroupFilters
    .map(groupId => {
      const group = config.groups.find(g => g.id === groupId);
      if (!group) return '';
      const displayName = getGroupDisplayName(group);
      return (
        '<span class="filter-tag">' +
        (group.icon || '📁') +
        ' ' +
        displayName +
        '<button class="filter-tag-remove" data-remove-filter="' +
        groupId +
        '" title="' +
        t('ui.search.removeFilter') +
        '">×</button></span>'
      );
    })
    .join('');

  // 綁定移除按鈕事件
  list.querySelectorAll('[data-remove-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.removeFilter;
      selectedGroupFilters = selectedGroupFilters.filter(id => id !== groupId);
      renderFilterTags();
      renderDirectories();
    });
  });
}

/**
 * 顯示群組篩選彈窗
 */
export function showGroupFilterModal() {
  const config = getConfig();

  const getDirectoryCount = groupId => {
    return config.directories.filter(d => d.group === groupId).length;
  };

  const sortedGroups = [...config.groups].sort((a, b) => (a.order || 0) - (b.order || 0));

  const content =
    '<div class="group-filter-actions">' +
    '<button class="btn btn-secondary btn-sm" id="btnSelectAll">' +
    t('ui.search.selectAll') +
    '</button>' +
    '<button class="btn btn-secondary btn-sm" id="btnClearAll">' +
    t('ui.search.clearAll') +
    '</button>' +
    '</div>' +
    '<div class="group-filter-list">' +
    sortedGroups
      .map(group => {
        const displayName = getGroupDisplayName(group);
        const count = getDirectoryCount(group.id);
        const isSelected = selectedGroupFilters.includes(group.id);
        return (
          '<label class="group-filter-item' +
          (isSelected ? ' selected' : '') +
          '">' +
          '<input type="checkbox" data-group-id="' +
          group.id +
          '"' +
          (isSelected ? ' checked' : '') +
          ' />' +
          '<div class="group-filter-info">' +
          '<span class="group-filter-icon">' +
          (group.icon || '📁') +
          '</span>' +
          '<span class="group-filter-name">' +
          displayName +
          '</span>' +
          '<span class="group-filter-count">' +
          count +
          ' ' +
          t('ui.search.directories') +
          '</span>' +
          '</div>' +
          '</label>'
        );
      })
      .join('') +
    '</div>';

  openModal({
    title: t('ui.search.filterGroups'),
    content,
    confirmText: t('ui.search.applyFilter'),
    onConfirm: () => {
      const checkboxes = document.querySelectorAll('.group-filter-list input[type="checkbox"]');
      selectedGroupFilters = [];
      checkboxes.forEach(cb => {
        if (cb.checked) {
          selectedGroupFilters.push(cb.dataset.groupId);
        }
      });
      renderFilterTags();
      renderDirectories();
      return true;
    },
    onOpen: () => {
      // 全選按鈕
      document.getElementById('btnSelectAll')?.addEventListener('click', () => {
        document.querySelectorAll('.group-filter-list input[type="checkbox"]').forEach(cb => {
          cb.checked = true;
          cb.closest('.group-filter-item').classList.add('selected');
        });
      });

      // 清除按鈕
      document.getElementById('btnClearAll')?.addEventListener('click', () => {
        document.querySelectorAll('.group-filter-list input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
          cb.closest('.group-filter-item').classList.remove('selected');
        });
      });

      // checkbox 點擊時更新樣式
      document.querySelectorAll('.group-filter-list input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          cb.closest('.group-filter-item').classList.toggle('selected', cb.checked);
        });
      });
    },
  });
}

/**
 * 渲染群組下拉選單（保留向下相容）
 */
export function renderGroupSelect() {
  // 不再需要，但保留空函數避免錯誤
}

/**
 * 渲染終端下拉選單（保留向下相容）
 */
export function renderTerminalSelect() {
  // 不再需要，但保留空函數避免錯誤
}

/**
 * 渲染目錄列表
 */
export function renderDirectories() {
  const config = getConfig();
  const searchInput = document.getElementById('searchInput');
  const search = searchInput?.value?.toLowerCase() || '';

  let dirs = config.directories.filter(d => {
    const matchSearch =
      !search || d.name.toLowerCase().includes(search) || d.path.toLowerCase().includes(search);
    const matchGroup = selectedGroupFilters.length === 0 || selectedGroupFilters.includes(d.group);
    return matchSearch && matchGroup;
  });

  const container = document.getElementById('directoryGroups');

  if (dirs.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><p>' +
      (search || selectedGroupFilters.length > 0
        ? t('ui.directory.emptyFiltered')
        : t('ui.directory.emptyAll')) +
      '</p></div>';
    return;
  }

  const grouped = {};
  dirs.forEach(d => {
    const groupId = d.group || 'default';
    if (!grouped[groupId]) grouped[groupId] = [];
    grouped[groupId].push(d);
  });

  const sortedGroupIds = Object.keys(grouped).sort((a, b) => {
    const groupA = config.groups.find(g => g.id === a);
    const groupB = config.groups.find(g => g.id === b);
    return (groupA?.order || 0) - (groupB?.order || 0);
  });

  const getGroupName = groupId => {
    const group = config.groups.find(g => g.id === groupId);
    return group ? getGroupDisplayName(group) : groupId;
  };

  const getGroupIcon = groupId => {
    const group = config.groups.find(g => g.id === groupId);
    return group?.icon || '📁';
  };

  container.innerHTML = sortedGroupIds
    .map(groupId => {
      const items = grouped[groupId];
      const isCollapsed = allGroupsCollapsed;

      return (
        '<div class="group-section' +
        (isCollapsed ? ' collapsed' : '') +
        '" data-group-id="' +
        groupId +
        '"><div class="group-header"><button class="group-toggle" data-toggle-group="' +
        groupId +
        '" aria-expanded="' +
        !isCollapsed +
        '">' +
        (isCollapsed ? '▶' : '▼') +
        '</button><span class="group-header-icon">' +
        getGroupIcon(groupId) +
        '</span><h3>' +
        getGroupName(groupId) +
        '</h3><span class="group-count">' +
        items.length +
        '</span></div><div class="directory-list">' +
        items
          .map(dir => {
            const terminalId = dir.terminalId || 'wsl-ubuntu';
            const terminalIcon = getTerminalIcon(terminalId);
            const terminalName = getTerminalName(terminalId);
            const dirIsFavorite = isFavorite(dir.id);
            const favoriteTitle = dirIsFavorite
              ? t('common.removeFromFavorites')
              : t('common.addToFavorites');

            return (
              '<div class="directory-item" data-id="' +
              dir.id +
              '" tabindex="0" role="button" aria-label="' +
              t('ui.directory.openTerminal', { name: dir.name }) +
              '"><div class="drag-handle" title="' +
              t('ui.favorites.dragHint') +
              '">⋮⋮</div><div class="dir-icon">' +
              terminalIcon +
              '</div><div class="dir-info"><div class="dir-name">' +
              (dir.icon ? '<span class="dir-emoji">' + dir.icon + '</span>' : '') +
              dir.name +
              '<span class="tag">' +
              terminalName +
              '</span></div><div class="dir-path">' +
              dir.path +
              '</div></div><div class="dir-actions"><button class="btn-icon favorite' +
              (dirIsFavorite ? ' active' : '') +
              '" data-toggle-favorite="' +
              dir.id +
              '" title="' +
              favoriteTitle +
              '" aria-label="' +
              favoriteTitle +
              '">' +
              (dirIsFavorite ? '⭐' : '☆') +
              '</button><button class="btn-icon edit" data-edit-dir="' +
              dir.id +
              '" title="' +
              t('common.edit') +
              '" aria-label="' +
              t('ui.directory.editItem', { name: dir.name }) +
              '">✏️</button><button class="btn-icon delete" data-delete-id="' +
              dir.id +
              '" title="' +
              t('common.delete') +
              '" aria-label="' +
              t('ui.directory.deleteItem', { name: dir.name }) +
              '">🗑️</button></div></div>'
            );
          })
          .join('') +
        '</div></div>'
      );
    })
    .join('');

  bindDirectoryEvents();
  initDirectoriesDragDrop();
}

/**
 * 顯示目錄右鍵選單
 * @param {MouseEvent} event - 滑鼠事件
 * @param {number} dirId - 目錄 ID
 */
function showDirectoryContextMenu(event, dirId) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  const dirIsFavorite = isFavorite(dirId);

  // 構建終端子選單
  const terminalSubmenu = config.terminals
    .filter(terminal => !terminal.hidden)
    .map(terminal => ({
      icon: terminal.icon || '💻',
      label: terminal.name,
      onClick: () => openTerminalWithTypeUtil(dirId, terminal.id, refreshDirectoryViews),
    }));

  const menuItems = [
    {
      icon: getTerminalIcon(dir.terminalId || 'wsl-ubuntu'),
      label: t('contextMenu.openDefault'),
      onClick: () => openTerminal(dirId),
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
      onClick: () => toggleFavorite(dirId),
    },
    {
      icon: '✏️',
      label: t('common.edit'),
      onClick: () => showEditDirectoryModal(dirId),
    },
    { separator: true },
    {
      icon: '🗑️',
      label: t('common.delete'),
      danger: true,
      onClick: () => deleteDirectory(dirId),
    },
  ];

  showContextMenu(event, menuItems);
}

/**
 * 重新整理目錄相關視圖
 */
function refreshDirectoryViews() {
  renderDirectories();
  renderRecentList();
  renderFavoritesList();
}

/**
 * 綁定目錄項目的事件
 */
function bindDirectoryEvents() {
  document.querySelectorAll('#directoryGroups .directory-item').forEach(item => {
    const handleOpen = e => {
      if (e.target.closest('.btn-icon')) return;
      const id = parseInt(item.dataset.id);
      openTerminal(id);
    };

    item.addEventListener('click', handleOpen);
    item.addEventListener('dblclick', e => {
      if (e.target.closest('.btn-icon')) return;
      const id = parseInt(item.dataset.id);
      showEditDirectoryModal(id);
    });
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen(e);
      }
    });

    // 右鍵選單
    item.addEventListener('contextmenu', e => {
      const id = parseInt(item.dataset.id);
      showDirectoryContextMenu(e, id);
    });
  });

  document.querySelectorAll('#directoryGroups [data-toggle-favorite]').forEach(btn => {
    const handleToggle = e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.toggleFavorite);
      toggleFavorite(id);
    };

    btn.addEventListener('click', handleToggle);
  });

  document.querySelectorAll('#directoryGroups [data-edit-dir]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.editDir);
      showEditDirectoryModal(id);
    });
  });

  document.querySelectorAll('#directoryGroups [data-delete-id]').forEach(btn => {
    const handleDelete = e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.deleteId);
      deleteDirectory(id);
    };

    btn.addEventListener('click', handleDelete);
  });

  document.querySelectorAll('[data-toggle-group]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const groupId = btn.dataset.toggleGroup;
      toggleGroupCollapse(groupId);
    });
  });
}

/**
 * 切換群組收合狀態
 * @param {string} groupId - 群組 ID
 */
function toggleGroupCollapse(groupId) {
  const section = document.querySelector('.group-section[data-group-id="' + groupId + '"]');
  if (!section) return;

  const isCollapsed = section.classList.toggle('collapsed');
  const btn = section.querySelector('[data-toggle-group]');
  if (btn) {
    btn.textContent = isCollapsed ? '▶' : '▼';
    btn.setAttribute('aria-expanded', (!isCollapsed).toString());
  }
}

/**
 * 切換所有群組收合狀態
 */
export function toggleAllGroups() {
  allGroupsCollapsed = !allGroupsCollapsed;

  const btn = document.getElementById('btnToggleAllGroups');
  if (btn) {
    btn.textContent = allGroupsCollapsed ? '📁' : '📂';
    btn.title = allGroupsCollapsed
      ? t('ui.directory.expandAllGroups')
      : t('ui.directory.collapseAllGroups');
  }

  renderDirectories();
}

/**
 * 顯示新增目錄彈窗
 * @param {string} defaultGroupId - 預設群組 ID
 */
export function showAddDirectoryModal(defaultGroupId = 'default') {
  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group" style="max-width: 80px"><label>' +
    t('ui.addDirectory.icon') +
    '</label><input type="text" id="modalDirIcon" placeholder="📁" maxlength="2" class="icon-input" title="' +
    t('ui.addDirectory.iconHint') +
    '" /></div>' +
    '<div class="input-group flex-1"><label>' +
    t('ui.addDirectory.name') +
    '<span class="required-mark">*</span></label><input type="text" id="modalDirName" placeholder="' +
    t('ui.addDirectory.namePlaceholder') +
    '" /></div>' +
    '</div>' +
    '<div class="input-group"><label>' +
    t('ui.addDirectory.path') +
    '<span class="required-mark">*</span></label><div class="path-input-wrapper"><input type="text" id="modalDirPath" placeholder="' +
    t('ui.addDirectory.pathPlaceholder') +
    '" /><button class="browse-btn" id="modalBrowsePath">' +
    t('ui.addDirectory.browse') +
    '</button></div></div>' +
    '<div class="input-row">' +
    '<div class="input-group flex-1"><label>' +
    t('ui.addDirectory.group') +
    '</label><select id="modalDirGroup">' +
    getGroupOptionsHtml(defaultGroupId) +
    '</select></div>' +
    '<div class="input-group flex-1"><label>' +
    t('ui.addDirectory.type') +
    '</label><select id="modalDirType">' +
    getTerminalOptionsHtml() +
    '</select></div>' +
    '</div>' +
    '<label class="checkbox-label"><input type="checkbox" id="modalDirFavorite" /><span>' +
    t('common.addToFavorites') +
    '</span></label>' +
    '</div>';

  openModal({
    title: t('ui.addDirectory.title'),
    content,
    confirmText: t('common.add'),
    onConfirm: async () => {
      const name = document.getElementById('modalDirName').value.trim();
      const icon = document.getElementById('modalDirIcon').value.trim() || '📁';
      const path = document.getElementById('modalDirPath').value.trim();
      const terminalId = document.getElementById('modalDirType').value;
      const group = document.getElementById('modalDirGroup').value;
      const addToFavorites = document.getElementById('modalDirFavorite').checked;

      if (!name || !path) {
        showToast(t('toast.fillNameAndPath'), 'error');
        return false;
      }

      const config = getConfig();
      const sameGroupDirs = config.directories.filter(d => d.group === group);
      const maxOrder =
        sameGroupDirs.length > 0 ? Math.max(...sameGroupDirs.map(d => d.order || 0)) : -1;

      const newId = Date.now();
      config.directories.push({
        id: newId,
        name,
        icon,
        path,
        terminalId,
        group,
        lastUsed: null,
        order: maxOrder + 1,
      });

      if (addToFavorites) {
        if (!config.favorites) {
          config.favorites = [];
        }
        config.favorites.push(newId);
      }

      await saveConfig();
      renderDirectories();
      renderFavoritesList();
      showToast(t('toast.directoryAdded'), 'success');
      return true;
    },
    onOpen: () => {
      document.getElementById('modalBrowsePath')?.addEventListener('click', async () => {
        const result = await api.selectFolder();
        if (result.success) {
          document.getElementById('modalDirPath').value = result.path;
        }
      });
      document.getElementById('modalDirName')?.focus();
    },
  });
}

/**
 * 顯示編輯目錄彈窗
 * @param {number} dirId - 目錄 ID
 */
export function showEditDirectoryModal(dirId) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  const dirIsFavorite = isFavorite(dirId);

  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group" style="max-width: 80px"><label>' +
    t('ui.addDirectory.icon') +
    '</label><input type="text" id="modalDirIcon" value="' +
    (dir.icon || '') +
    '" maxlength="2" class="icon-input" title="' +
    t('ui.addDirectory.iconHint') +
    '" /></div>' +
    '<div class="input-group flex-1"><label>' +
    t('ui.addDirectory.name') +
    '<span class="required-mark">*</span></label><input type="text" id="modalDirName" value="' +
    escapeHtml(dir.name) +
    '" /></div>' +
    '</div>' +
    '<div class="input-group"><label>' +
    t('ui.addDirectory.path') +
    '<span class="required-mark">*</span></label><div class="path-input-wrapper"><input type="text" id="modalDirPath" value="' +
    escapeHtml(dir.path) +
    '" /><button class="browse-btn" id="modalBrowsePath">' +
    t('ui.addDirectory.browse') +
    '</button></div></div>' +
    '<div class="input-row">' +
    '<div class="input-group flex-1"><label>' +
    t('ui.addDirectory.group') +
    '</label><select id="modalDirGroup">' +
    getGroupOptionsHtml(dir.group) +
    '</select></div>' +
    '<div class="input-group flex-1"><label>' +
    t('ui.addDirectory.type') +
    '</label><select id="modalDirType">' +
    getTerminalOptionsHtml(dir.terminalId) +
    '</select></div>' +
    '</div>' +
    '<label class="checkbox-label"><input type="checkbox" id="modalDirFavorite"' +
    (dirIsFavorite ? ' checked' : '') +
    ' /><span>' +
    t('common.addToFavorites') +
    '</span></label>' +
    '</div>';

  openModal({
    title: t('ui.directory.editTitle'),
    content,
    confirmText: t('common.save'),
    onConfirm: async () => {
      const name = document.getElementById('modalDirName').value.trim();
      const icon = document.getElementById('modalDirIcon').value.trim() || '📁';
      const path = document.getElementById('modalDirPath').value.trim();
      const terminalId = document.getElementById('modalDirType').value;
      const group = document.getElementById('modalDirGroup').value;
      const shouldBeFavorite = document.getElementById('modalDirFavorite').checked;

      if (!name || !path) {
        showToast(t('toast.fillNameAndPath'), 'error');
        return false;
      }

      dir.name = name;
      dir.icon = icon;
      dir.path = path;
      dir.terminalId = terminalId;
      dir.group = group;

      // 更新最愛狀態
      if (!config.favorites) {
        config.favorites = [];
      }
      const favoriteIndex = config.favorites.indexOf(dirId);
      if (shouldBeFavorite && favoriteIndex === -1) {
        config.favorites.push(dirId);
      } else if (!shouldBeFavorite && favoriteIndex !== -1) {
        config.favorites.splice(favoriteIndex, 1);
      }

      await saveConfig();
      renderDirectories();
      renderFavoritesList();
      renderRecentList();
      showToast(t('toast.directoryUpdated'), 'success');
      return true;
    },
    onOpen: () => {
      document.getElementById('modalBrowsePath')?.addEventListener('click', async () => {
        const result = await api.selectFolder();
        if (result.success) {
          document.getElementById('modalDirPath').value = result.path;
        }
      });
      document.getElementById('modalDirName')?.focus();
    },
  });
}

/**
 * HTML 跳脫
 * @param {string} text - 原始文字
 * @returns {string} 跳脫後的文字
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 刪除目錄
 * @param {number} id - 目錄 ID
 */
export async function deleteDirectory(id) {
  const config = getConfig();
  config.directories = config.directories.filter(d => d.id !== id);
  if (config.favorites) {
    config.favorites = config.favorites.filter(fid => fid !== id);
  }
  await saveConfig();

  renderDirectories();
  renderFavoritesList();
  renderRecentList();
  showToast(t('toast.directoryDeleted'), 'success');
}

/**
 * 切換最愛狀態
 * @param {number} id - 目錄 ID
 */
async function toggleFavorite(id) {
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

  renderDirectories();
  renderFavoritesList();
}

/**
 * 開啟終端
 * @param {number} id - 目錄 ID
 */
export async function openTerminal(id) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === id);
  if (!dir) return;

  const result = await api.openTerminal(dir);
  if (result.success) {
    showToast(t('toast.openingDirectory', { name: dir.name }), 'success');
    await loadConfig();
    refreshDirectoryViews();
  } else {
    const errorMessage = getErrorMessage(result);
    showToast(errorMessage, 'error');
  }
}

/**
 * 設定目錄相關的事件監聽
 */
export function setupDirectoryEvents() {
  document.getElementById('searchInput')?.addEventListener('input', renderDirectories);
  document.getElementById('btnGroupFilter')?.addEventListener('click', showGroupFilterModal);
  document.getElementById('btnToggleAllGroups')?.addEventListener('click', toggleAllGroups);
  document.getElementById('btnAddDirectoryModal')?.addEventListener('click', () => {
    showAddDirectoryModal();
  });
}
