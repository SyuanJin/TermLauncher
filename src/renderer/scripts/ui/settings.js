/**
 * 設定頁面模組
 * 處理設定的顯示與儲存
 */
import { getConfig, saveConfig, setConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { renderGroupFilter, renderGroupSelect, renderDirectories, renderRecentList } from './directories.js';

/**
 * 渲染設定項目
 */
export function renderSettings() {
  const config = getConfig();
  document.getElementById('startMinimized').checked = config.settings.startMinimized;
  document.getElementById('minimizeToTray').checked = config.settings.minimizeToTray;
  document.getElementById('globalShortcut').value = config.settings.globalShortcut || 'Alt+Space';
}

/**
 * 渲染群組列表
 */
export function renderGroupsList() {
  const config = getConfig();
  document.getElementById('groupsList').innerHTML = config.groups
    .map(
      g =>
        '<div class="group-tag">' +
        g +
        (g !== '預設'
          ? '<button class="delete-group" data-group="' +
            g +
            '" aria-label="刪除群組 ' +
            g +
            '">✕</button>'
          : '') +
        '</div>'
    )
    .join('');

  // 綁定刪除群組事件
  document.querySelectorAll('[data-group]').forEach(btn => {
    const handleDelete = () => {
      deleteGroup(btn.dataset.group);
    };

    btn.addEventListener('click', handleDelete);

    // 鍵盤支援（Enter 和 Space）
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDelete();
      }
    });
  });
}

/**
 * 儲存一般設定（開關設定）
 */
export async function saveSettings() {
  const config = getConfig();
  config.settings.startMinimized = document.getElementById('startMinimized').checked;
  config.settings.minimizeToTray = document.getElementById('minimizeToTray').checked;
  await saveConfig();
}

/**
 * 新增群組
 */
export async function addGroup() {
  const config = getConfig();
  const name = document.getElementById('newGroupName').value.trim();

  if (!name) {
    showToast('請輸入群組名稱', 'error');
    return;
  }

  if (config.groups.includes(name)) {
    showToast('群組已存在', 'error');
    return;
  }

  config.groups.push(name);
  await saveConfig();

  // 重新渲染
  renderGroupFilter();
  renderGroupSelect();
  renderGroupsList();

  document.getElementById('newGroupName').value = '';
  showToast('群組已新增', 'success');
}

/**
 * 刪除群組
 * @param {string} name - 群組名稱
 */
export async function deleteGroup(name) {
  if (name === '預設') return;

  const config = getConfig();

  // 將該群組的目錄移到預設群組
  config.directories.forEach(d => {
    if (d.group === name) d.group = '預設';
  });

  config.groups = config.groups.filter(g => g !== name);
  await saveConfig();

  // 重新渲染
  renderGroupFilter();
  renderGroupSelect();
  renderDirectories();
  renderGroupsList();

  showToast('群組已刪除', 'success');
}

/**
 * 匯出配置
 */
export async function exportConfig() {
  const result = await api.exportConfig();
  if (result.success) {
    showToast('設定已匯出', 'success');
  }
}

/**
 * 匯入配置
 */
export async function importConfig() {
  const result = await api.importConfig();
  if (result.success) {
    setConfig(result.config);

    // 重新渲染所有
    renderGroupFilter();
    renderGroupSelect();
    renderDirectories();
    renderRecentList();
    renderSettings();
    renderGroupsList();

    showToast('設定已匯入', 'success');
  } else if (result.error) {
    showToast('匯入失敗: ' + result.error, 'error');
  }
}

/**
 * 設定設定頁面的事件監聽
 */
export function setupSettingsEvents() {
  document.getElementById('startMinimized').addEventListener('change', saveSettings);
  document.getElementById('minimizeToTray').addEventListener('change', saveSettings);
  document.getElementById('newGroupName').addEventListener('keypress', e => {
    if (e.key === 'Enter') addGroup();
  });
}
