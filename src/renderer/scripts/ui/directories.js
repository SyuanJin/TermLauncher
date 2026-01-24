/**
 * 目錄列表模組
 * 處理目錄的顯示、新增、刪除等操作
 */
import { getConfig, saveConfig, loadConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { t } from '../i18n.js';

/**
 * 渲染群組篩選下拉選單
 */
export function renderGroupFilter() {
  const config = getConfig();
  const select = document.getElementById('groupFilter');
  const defaultGroupName = t('common.default');
  select.innerHTML =
    '<option value="">' +
    t('ui.search.allGroups') +
    '</option>' +
    config.groups
      .map(
        g =>
          '<option value="' + g + '">' + (g === '預設' ? defaultGroupName : g) + '</option>'
      )
      .join('');
}

/**
 * 渲染新增目錄的群組下拉選單
 */
export function renderGroupSelect() {
  const config = getConfig();
  const defaultGroupName = t('common.default');
  document.getElementById('dirGroup').innerHTML = config.groups
    .map(g => '<option value="' + g + '">' + (g === '預設' ? defaultGroupName : g) + '</option>')
    .join('');
}

/**
 * 渲染目錄列表
 */
export function renderDirectories() {
  const config = getConfig();
  const search = document.getElementById('searchInput').value.toLowerCase();
  const groupFilter = document.getElementById('groupFilter').value;

  let dirs = config.directories.filter(d => {
    const matchSearch =
      !search || d.name.toLowerCase().includes(search) || d.path.toLowerCase().includes(search);
    const matchGroup = !groupFilter || d.group === groupFilter;
    return matchSearch && matchGroup;
  });

  const container = document.getElementById('directoryGroups');

  if (dirs.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><p>' +
      (search || groupFilter ? t('ui.directory.emptyFiltered') : t('ui.directory.emptyAll')) +
      '</p></div>';
    return;
  }

  const grouped = {};
  const defaultGroupName = t('common.default');
  dirs.forEach(d => {
    const g = d.group || '預設';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(d);
  });

  container.innerHTML = Object.entries(grouped)
    .map(
      ([group, items]) =>
        '<div class="group-section"><div class="group-header"><h3>' +
        (group === '預設' ? defaultGroupName : group) +
        '</h3><span class="group-count">' +
        items.length +
        '</span></div><div class="directory-list">' +
        items
          .map(
            dir =>
              '<div class="directory-item" data-id="' +
              dir.id +
              '" tabindex="0" role="button" aria-label="' +
              t('ui.directory.openTerminal', { name: dir.name }) +
              '"><div class="dir-icon ' +
              dir.type +
              '">' +
              (dir.type === 'wsl' ? '🐧' : '⚡') +
              '</div><div class="dir-info"><div class="dir-name">' +
              dir.name +
              '<span class="tag ' +
              (dir.type === 'wsl' ? 'wsl' : 'ps') +
              '">' +
              (dir.type === 'wsl' ? 'WSL' : 'PS') +
              '</span></div><div class="dir-path">' +
              dir.path +
              '</div></div><div class="dir-actions"><button class="btn-icon delete" data-delete-id="' +
              dir.id +
              '" title="' +
              t('ui.directory.delete') +
              '" aria-label="' +
              t('ui.directory.deleteItem', { name: dir.name }) +
              '">🗑️</button></div></div>'
          )
          .join('') +
        '</div></div>'
    )
    .join('');

  // 綁定事件
  bindDirectoryEvents();
}

/**
 * 綁定目錄項目的事件
 */
function bindDirectoryEvents() {
  // 點擊目錄項目開啟終端
  document.querySelectorAll('.directory-item').forEach(item => {
    const handleOpen = e => {
      // 如果點擊的是刪除按鈕，不觸發開啟終端
      if (e.target.closest('.btn-icon.delete')) return;
      const id = parseInt(item.dataset.id);
      openTerminal(id);
    };

    item.addEventListener('click', handleOpen);

    // 鍵盤支援（Enter 和 Space）
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen(e);
      }
    });
  });

  // 刪除按鈕
  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    const handleDelete = e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.deleteId);
      deleteDirectory(id);
    };

    btn.addEventListener('click', handleDelete);

    // 鍵盤支援（Enter 和 Space）
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDelete(e);
      }
    });
  });
}

/**
 * 渲染最近使用列表
 */
export function renderRecentList() {
  const config = getConfig();
  const recent = config.directories
    .filter(d => d.lastUsed)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, 5);

  const section = document.getElementById('recentSection');
  const list = document.getElementById('recentList');

  if (recent.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = recent
    .map(
      d =>
        '<div class="recent-item" data-recent-id="' +
        d.id +
        '" tabindex="0" role="button" aria-label="' +
        t('ui.directory.openTerminal', { name: d.name }) +
        '"><span>' +
        (d.type === 'wsl' ? '🐧' : '⚡') +
        '</span><span>' +
        d.name +
        '</span></div>'
    )
    .join('');

  // 綁定點擊和鍵盤事件
  document.querySelectorAll('[data-recent-id]').forEach(item => {
    const handleOpen = () => {
      const id = parseInt(item.dataset.recentId);
      openTerminal(id);
    };

    item.addEventListener('click', handleOpen);

    // 鍵盤支援（Enter 和 Space）
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
    });
  });
}

/**
 * 切換新增表單顯示
 */
export function toggleAddForm() {
  const form = document.getElementById('addForm');
  const btn = document.getElementById('btnToggleAddForm');
  form.classList.toggle('show');
  const isExpanded = form.classList.contains('show');
  btn.textContent = isExpanded
    ? t('ui.addDirectory.collapse')
    : t('ui.addDirectory.expand');
  btn.setAttribute('aria-expanded', isExpanded.toString());
}

/**
 * 瀏覽並選擇路徑
 */
export async function browsePath() {
  const result = await api.selectFolder();
  if (result.success) {
    document.getElementById('dirPath').value = result.path;
  }
}

/**
 * 新增目錄
 */
export async function addDirectory() {
  const config = getConfig();
  const name = document.getElementById('dirName').value.trim();
  const path = document.getElementById('dirPath').value.trim();
  const type = document.getElementById('dirType').value;
  const group = document.getElementById('dirGroup').value;

  if (!name || !path) {
    showToast(t('toast.fillNameAndPath'), 'error');
    return;
  }

  config.directories.push({ id: Date.now(), name, path, type, group, lastUsed: null });
  await saveConfig();

  // 重新渲染
  renderGroupFilter();
  renderGroupSelect();
  renderDirectories();
  renderRecentList();

  // 清空表單
  document.getElementById('dirName').value = '';
  document.getElementById('dirPath').value = '';

  showToast(t('toast.directoryAdded'), 'success');
}

/**
 * 刪除目錄
 * @param {number} id - 目錄 ID
 */
export async function deleteDirectory(id) {
  const config = getConfig();
  config.directories = config.directories.filter(d => d.id !== id);
  await saveConfig();

  // 重新渲染
  renderGroupFilter();
  renderGroupSelect();
  renderDirectories();
  renderRecentList();

  showToast(t('toast.directoryDeleted'), 'success');
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
    // 重新載入配置以更新最近使用時間
    await loadConfig();
    renderRecentList();
  } else {
    showToast(t('toast.openFailed', { error: result.error }), 'error');
  }
}

/**
 * 設定目錄相關的事件監聽
 */
export function setupDirectoryEvents() {
  document.getElementById('searchInput').addEventListener('input', renderDirectories);
  document.getElementById('groupFilter').addEventListener('change', renderDirectories);
  document.getElementById('dirPath').addEventListener('keypress', e => {
    if (e.key === 'Enter') addDirectory();
  });
}
