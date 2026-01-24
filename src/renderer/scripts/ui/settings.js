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
  renderTerminalSelect,
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
 * 變更開機自動啟動設定
 */
export async function changeAutoLaunch() {
  const enabled = document.getElementById('autoLaunch').checked;
  const result = await api.setAutoLaunch(enabled);
  if (result.success) {
    showToast(enabled ? t('toast.autoLaunchEnabled') : t('toast.autoLaunchDisabled'), 'success');
  }
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
  renderTerminalSelect();
  renderDirectories();
  renderRecentList();
  renderGroupsList();
  renderTerminalsList();

  showToast(t('toast.languageChanged'), 'success');
}

/**
 * 渲染設定項目
 */
export async function renderSettings() {
  const config = getConfig();
  document.getElementById('themeSelect').value = config.settings.theme || 'dark';
  document.getElementById('startMinimized').checked = config.settings.startMinimized;
  document.getElementById('minimizeToTray').checked = config.settings.minimizeToTray;
  document.getElementById('globalShortcut').value = config.settings.globalShortcut || 'Alt+Space';

  // 渲染開機自動啟動狀態（從系統取得實際狀態）
  const autoLaunchEnabled = await api.getAutoLaunch();
  document.getElementById('autoLaunch').checked = autoLaunchEnabled;

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
 * 渲染終端列表
 */
export function renderTerminalsList() {
  const config = getConfig();
  const container = document.getElementById('terminalsList');
  if (!container || !config.terminals) return;

  container.innerHTML = config.terminals
    .map(
      terminal =>
        '<div class="terminal-item' +
        (terminal.isBuiltin ? ' builtin' : '') +
        '" data-terminal-id="' +
        terminal.id +
        '"><div class="terminal-item-info"><span class="terminal-icon">' +
        terminal.icon +
        '</span><div class="terminal-details"><span class="terminal-name">' +
        terminal.name +
        (terminal.isBuiltin
          ? '<span class="builtin-badge">' + t('ui.settings.terminals.builtin') + '</span>'
          : '') +
        '</span><span class="terminal-command">' +
        escapeHtml(terminal.command) +
        '</span></div></div><div class="terminal-actions">' +
        (terminal.isBuiltin
          ? ''
          : '<button class="btn-icon edit" data-edit-terminal="' +
            terminal.id +
            '" title="' +
            t('ui.settings.terminals.edit') +
            '" aria-label="' +
            t('ui.settings.terminals.editTerminal', { name: terminal.name }) +
            '">✏️</button><button class="btn-icon delete" data-delete-terminal="' +
            terminal.id +
            '" title="' +
            t('ui.settings.terminals.delete') +
            '" aria-label="' +
            t('ui.settings.terminals.deleteTerminal', { name: terminal.name }) +
            '">🗑️</button>') +
        '</div></div>'
    )
    .join('');

  // 綁定編輯和刪除事件
  bindTerminalEvents();
}

/**
 * 跳脫 HTML 特殊字元
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 綁定終端項目事件
 */
function bindTerminalEvents() {
  // 編輯按鈕
  document.querySelectorAll('[data-edit-terminal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const terminalId = btn.dataset.editTerminal;
      editTerminal(terminalId);
    });
  });

  // 刪除按鈕
  document.querySelectorAll('[data-delete-terminal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const terminalId = btn.dataset.deleteTerminal;
      deleteTerminal(terminalId);
    });
  });
}

/**
 * 編輯終端
 * @param {string} terminalId - 終端 ID
 */
export function editTerminal(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal || terminal.isBuiltin) return;

  // 填入表單
  document.getElementById('terminalEditId').value = terminal.id;
  document.getElementById('terminalName').value = terminal.name;
  document.getElementById('terminalIcon').value = terminal.icon;
  document.getElementById('terminalCommand').value = terminal.command;
  document.getElementById('terminalPathFormat').value = terminal.pathFormat;

  // 更新表單標題和顯示取消按鈕
  document.getElementById('terminalFormTitle').textContent = t(
    'ui.settings.terminals.editExisting'
  );
  document.getElementById('btnCancelTerminal').style.display = 'flex';
  document.getElementById('btnSaveTerminal').textContent = t('ui.settings.terminals.update');
}

/**
 * 取消編輯終端
 */
export function cancelEditTerminal() {
  // 清空表單
  document.getElementById('terminalEditId').value = '';
  document.getElementById('terminalName').value = '';
  document.getElementById('terminalIcon').value = '';
  document.getElementById('terminalCommand').value = '';
  document.getElementById('terminalPathFormat').value = 'windows';

  // 重置表單標題
  document.getElementById('terminalFormTitle').textContent = t('ui.settings.terminals.addNew');
  document.getElementById('btnCancelTerminal').style.display = 'none';
  document.getElementById('btnSaveTerminal').textContent = t('ui.settings.terminals.save');
}

/**
 * 儲存終端
 */
export async function saveTerminal() {
  const config = getConfig();
  const editId = document.getElementById('terminalEditId').value;
  const name = document.getElementById('terminalName').value.trim();
  const icon = document.getElementById('terminalIcon').value.trim();
  const command = document.getElementById('terminalCommand').value.trim();
  const pathFormat = document.getElementById('terminalPathFormat').value;

  // 驗證
  if (!name) {
    showToast(t('toast.terminalNameRequired'), 'error');
    return;
  }
  if (!command) {
    showToast(t('toast.terminalCommandRequired'), 'error');
    return;
  }
  if (!command.includes('{path}')) {
    showToast(t('toast.terminalCommandNeedsPath'), 'error');
    return;
  }

  if (editId) {
    // 編輯現有終端
    const terminalIndex = config.terminals.findIndex(t => t.id === editId);
    if (terminalIndex !== -1 && !config.terminals[terminalIndex].isBuiltin) {
      config.terminals[terminalIndex] = {
        ...config.terminals[terminalIndex],
        name,
        icon: icon || '💻',
        command,
        pathFormat,
      };
      await saveConfig();
      showToast(t('toast.terminalUpdated'), 'success');
    }
  } else {
    // 新增終端
    const newId = 'custom-' + Date.now();
    config.terminals.push({
      id: newId,
      name,
      icon: icon || '💻',
      command,
      pathFormat,
      isBuiltin: false,
    });
    await saveConfig();
    showToast(t('toast.terminalAdded'), 'success');
  }

  // 清空表單並重新渲染
  cancelEditTerminal();
  renderTerminalsList();
  renderTerminalSelect();
  renderDirectories();
}

/**
 * 刪除終端
 * @param {string} terminalId - 終端 ID
 */
export async function deleteTerminal(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal || terminal.isBuiltin) return;

  // 將使用該終端的目錄遷移至預設終端
  const defaultTerminalId = config.terminals.find(t => t.isBuiltin)?.id || 'wsl-ubuntu';
  config.directories.forEach(dir => {
    if (dir.terminalId === terminalId) {
      dir.terminalId = defaultTerminalId;
    }
  });

  // 刪除終端
  config.terminals = config.terminals.filter(t => t.id !== terminalId);
  await saveConfig();

  // 重新渲染
  renderTerminalsList();
  renderTerminalSelect();
  renderDirectories();

  showToast(t('toast.terminalDeleted'), 'success');
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
    renderTerminalSelect();
    renderDirectories();
    renderRecentList();
    await renderSettings();
    renderGroupsList();
    renderTerminalsList();

    showToast(t('toast.configImported'), 'success');
  } else if (result.error) {
    showToast(t('toast.importFailed', { error: result.error }), 'error');
  }
}

/**
 * 設定設定頁面的事件監聯
 */
export function setupSettingsEvents() {
  document.getElementById('themeSelect').addEventListener('change', changeTheme);
  document.getElementById('languageSelect').addEventListener('change', changeLanguage);
  document.getElementById('autoLaunch').addEventListener('change', changeAutoLaunch);
  document.getElementById('startMinimized').addEventListener('change', saveSettings);
  document.getElementById('minimizeToTray').addEventListener('change', saveSettings);
  document.getElementById('newGroupName').addEventListener('keypress', e => {
    if (e.key === 'Enter') addGroup();
  });

  // 終端管理事件
  document.getElementById('btnSaveTerminal').addEventListener('click', saveTerminal);
  document.getElementById('btnCancelTerminal').addEventListener('click', cancelEditTerminal);
  document.getElementById('terminalName').addEventListener('keypress', e => {
    if (e.key === 'Enter') saveTerminal();
  });
}
