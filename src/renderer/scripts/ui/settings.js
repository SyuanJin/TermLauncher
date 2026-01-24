/**
 * 設定頁面模組
 * 處理設定的顯示與儲存
 */
import { getConfig, saveConfig, setConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { t, changeLocale, getAvailableLocales, applyTranslations } from '../i18n.js';
import {
  renderGroupFilter,
  renderGroupSelect,
  renderDirectories,
  renderRecentList,
} from './directories.js';

/**
 * 應用主題
 * @param {string} theme - 主題名稱 ('dark' 或 'light')
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'dark');
}

/**
 * 變更主題
 */
export async function changeTheme() {
  const config = getConfig();
  const theme = document.getElementById('themeSelect').value;
  config.settings.theme = theme;
  applyTheme(theme);
  await saveConfig();
  showToast(theme === 'dark' ? t('toast.themeDark') : t('toast.themeLight'), 'success');
}

/**
 * 變更語言
 */
export async function changeLanguage() {
  const config = getConfig();
  const language = document.getElementById('languageSelect').value;
  config.settings.language = language;
  await saveConfig();
  await changeLocale(language);

  // 重新渲染動態內容
  renderGroupFilter();
  renderGroupSelect();
  renderDirectories();
  renderRecentList();
  renderGroupsList();

  showToast(t('toast.languageChanged'), 'success');
}

/**
 * 渲染設定項目
 */
export function renderSettings() {
  const config = getConfig();
  document.getElementById('themeSelect').value = config.settings.theme || 'dark';
  document.getElementById('startMinimized').checked = config.settings.startMinimized;
  document.getElementById('minimizeToTray').checked = config.settings.minimizeToTray;
  document.getElementById('globalShortcut').value = config.settings.globalShortcut || 'Alt+Space';

  // 渲染語言選擇器
  const languageSelect = document.getElementById('languageSelect');
  const availableLocales = getAvailableLocales();
  const currentLanguage = config.settings.language || 'zh-TW';

  languageSelect.innerHTML = availableLocales
    .map(
      locale =>
        '<option value="' +
        locale.code +
        '"' +
        (locale.code === currentLanguage ? ' selected' : '') +
        '>' +
        locale.nativeName +
        '</option>'
    )
    .join('');
}

/**
 * 渲染群組列表
 */
export function renderGroupsList() {
  const config = getConfig();
  const defaultGroupName = t('common.default');
  document.getElementById('groupsList').innerHTML = config.groups
    .map(
      g =>
        '<div class="group-tag">' +
        (g === '預設' ? defaultGroupName : g) +
        (g !== '預設'
          ? '<button class="delete-group" data-group="' +
            g +
            '" aria-label="' +
            t('ui.settings.groups.deleteGroup', { name: g }) +
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
    showToast(t('toast.enterGroupName'), 'error');
    return;
  }

  if (config.groups.includes(name)) {
    showToast(t('toast.groupExists'), 'error');
    return;
  }

  config.groups.push(name);
  await saveConfig();

  // 重新渲染
  renderGroupFilter();
  renderGroupSelect();
  renderGroupsList();

  document.getElementById('newGroupName').value = '';
  showToast(t('toast.groupAdded'), 'success');
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

  showToast(t('toast.groupDeleted'), 'success');
}

/**
 * 匯出配置
 */
export async function exportConfig() {
  const result = await api.exportConfig();
  if (result.success) {
    showToast(t('toast.configExported'), 'success');
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

    showToast(t('toast.configImported'), 'success');
  } else if (result.error) {
    showToast(t('toast.importFailed', { error: result.error }), 'error');
  }
}

/**
 * 設定設定頁面的事件監聽
 */
export function setupSettingsEvents() {
  document.getElementById('themeSelect').addEventListener('change', changeTheme);
  document.getElementById('languageSelect').addEventListener('change', changeLanguage);
  document.getElementById('startMinimized').addEventListener('change', saveSettings);
  document.getElementById('minimizeToTray').addEventListener('change', saveSettings);
  document.getElementById('newGroupName').addEventListener('keypress', e => {
    if (e.key === 'Enter') addGroup();
  });
}
