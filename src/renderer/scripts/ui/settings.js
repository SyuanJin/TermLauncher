/**
 * 設定頁面模組
 * 處理設定的顯示與儲存
 */
import { getConfig, saveConfig, setConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { t, changeLocale, getAvailableLocales } from '../i18n.js';
import { openModal, openConfirmModal } from './modal.js';
import {
  renderGroupFilter,
  renderGroupSelect,
  renderDirectories,
  renderTerminalSelect,
} from './directories.js';
import { renderRecentList } from './recent.js';
import { renderGroupsTab } from './groups.js';

/**
 * 應用主題
 * @param {string} theme - 主題名稱 ('dark' 或 'light')
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'dark');
}

/**
 * 應用 Tab 文字顯示設定
 * @param {boolean} show - 是否顯示 Tab 文字
 */
export function applyShowTabText(show) {
  document.body.classList.toggle('hide-tab-text', !show);
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
 * 變更 Tab 文字顯示
 */
export async function changeShowTabText() {
  const config = getConfig();
  const show = document.getElementById('showTabText').checked;
  config.settings.showTabText = show;
  applyShowTabText(show);
  await saveConfig();
}

/**
 * 變更開機自動啟動設定
 */
export async function changeAutoLaunch() {
  const checkbox = document.getElementById('autoLaunch');
  const enabled = checkbox.checked;
  const result = await api.setAutoLaunch(enabled);
  if (result.success) {
    showToast(enabled ? t('toast.autoLaunchEnabled') : t('toast.autoLaunchDisabled'), 'success');

    // Portable 模式開啟時顯示提示
    if (enabled && result.isPortable) {
      openModal({
        id: 'portable-notice-modal',
        title: t('ui.settings.general.portableNoticeTitle'),
        content: `
          <div class="portable-notice">
            <p>${t('ui.settings.general.portableNoticeMessage')}</p>
            <ul>
              <li>${t('ui.settings.general.portableNoticeItem1')}</li>
              <li>${t('ui.settings.general.portableNoticeItem2')}</li>
            </ul>
          </div>
        `,
        confirmText: t('common.close'),
        showCancel: false,
      });
    }
  } else if (result.reason === 'dev-mode') {
    // 開發模式下不支援，還原 checkbox 狀態
    checkbox.checked = false;
    showToast(t('toast.autoLaunchDevMode'), 'warning');
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

  renderGroupFilter();
  renderGroupSelect();
  renderTerminalSelect();
  renderDirectories();
  renderGroupsTab();
  renderTerminalsList();
  renderRecentList();

  showToast(t('toast.languageChanged'), 'success');
}

/**
 * 變更最近使用數量上限
 */
export async function changeRecentLimit() {
  const config = getConfig();
  const limit = parseInt(document.getElementById('recentLimit').value, 10);
  config.settings.recentLimit = limit;
  await saveConfig();
  renderRecentList();
}

/**
 * 切換終端的隱藏狀態
 * @param {string} terminalId - 終端 ID
 */
export async function toggleTerminalHidden(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal) return;

  terminal.hidden = !terminal.hidden;
  await saveConfig();
  renderTerminalSelect();
}

/**
 * 渲染設定項目
 */
export async function renderSettings() {
  const config = getConfig();
  document.getElementById('themeSelect').value = config.settings.theme || 'dark';
  document.getElementById('showTabText').checked = config.settings.showTabText !== false;
  document.getElementById('startMinimized').checked = config.settings.startMinimized;
  document.getElementById('minimizeToTray').checked = config.settings.minimizeToTray;
  document.getElementById('globalShortcut').value = config.settings.globalShortcut || 'Alt+Space';
  document.getElementById('recentLimit').value = config.settings.recentLimit || 10;

  const autoLaunchEnabled = await api.getAutoLaunch();
  document.getElementById('autoLaunch').checked = autoLaunchEnabled;

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

  // 應用 Tab 文字顯示設定
  applyShowTabText(config.settings.showTabText !== false);

  // 顯示版本號
  const version = (await api.getAppVersion?.()) || '2.0.0';
  document.getElementById('appVersion').textContent = 'v' + version;

  // 渲染終端探測狀態
  await renderTerminalDetectionStatus();
}

/**
 * 探測結果快取
 */
let detectedTerminalsCache = null;

/**
 * 平台快取
 */
let platformCache = null;

/**
 * 探測已安裝的終端
 * @returns {Promise<Object>} 探測結果
 */
export async function detectTerminals() {
  if (!detectedTerminalsCache) {
    detectedTerminalsCache = await api.detectTerminals();
  }
  return detectedTerminalsCache;
}

/**
 * 取得當前平台
 * @returns {Promise<string>} 平台名稱
 */
async function getPlatform() {
  if (!platformCache) {
    platformCache = await api.getPlatform();
  }
  return platformCache;
}

/**
 * 取得 Windows 平台的終端項目
 * @param {Object} detected - 探測結果
 * @returns {Array} 終端項目列表
 */
function getWindowsTerminalItems(detected) {
  return [
    {
      name: 'Windows Terminal',
      icon: '🖥️',
      installed: detected.windowsTerminal,
    },
    {
      name: 'WSL',
      icon: '🐧',
      installed: detected.wsl,
      detail:
        detected.wsl && detected.wslDistros?.length > 0
          ? detected.wslDistros.length + ' ' + t('ui.settings.terminals.distros')
          : null,
    },
    {
      name: 'Git Bash',
      icon: '🐱',
      installed: detected.gitBash,
    },
    {
      name: 'PowerShell',
      icon: '⚡',
      installed: detected.powerShell,
    },
    {
      name: 'CMD',
      icon: '📟',
      installed: detected.cmd,
    },
  ];
}

/**
 * 取得 macOS 平台的終端項目
 * @param {Object} detected - 探測結果
 * @returns {Array} 終端項目列表
 */
function getMacOSTerminalItems(detected) {
  return [
    {
      name: 'Terminal.app',
      icon: '🖥️',
      installed: detected.terminalApp,
    },
    {
      name: 'iTerm2',
      icon: '🔲',
      installed: detected.iterm2,
    },
    {
      name: 'Alacritty',
      icon: '⚡',
      installed: detected.alacritty,
    },
    {
      name: 'Kitty',
      icon: '🐱',
      installed: detected.kitty,
    },
    {
      name: 'Hyper',
      icon: '💠',
      installed: detected.hyper,
    },
    {
      name: 'Warp',
      icon: '🚀',
      installed: detected.warp,
    },
  ];
}

/**
 * 取得 Linux 平台的終端項目
 * @param {Object} detected - 探測結果
 * @returns {Array} 終端項目列表
 */
function getLinuxTerminalItems(detected) {
  return [
    {
      name: 'GNOME Terminal',
      icon: '🖥️',
      installed: detected.gnomeTerminal,
    },
    {
      name: 'Konsole',
      icon: '📺',
      installed: detected.konsole,
    },
    {
      name: 'xterm',
      icon: '📟',
      installed: detected.xterm,
    },
    {
      name: 'Alacritty',
      icon: '⚡',
      installed: detected.alacritty,
    },
    {
      name: 'Kitty',
      icon: '🐱',
      installed: detected.kitty,
    },
    {
      name: 'Tilix',
      icon: '🔲',
      installed: detected.tilix,
    },
    {
      name: 'Terminator',
      icon: '🤖',
      installed: detected.terminator,
    },
    {
      name: 'Xfce Terminal',
      icon: '🐭',
      installed: detected.xfce4Terminal,
    },
  ];
}

/**
 * 渲染終端探測狀態
 */
export async function renderTerminalDetectionStatus() {
  const container = document.getElementById('terminalDetectionStatus');
  if (!container) return;

  const detected = await detectTerminals();
  const platform = await getPlatform();

  let items = [];

  // 根據平台選擇終端項目列表
  switch (platform) {
    case 'win32':
      items = getWindowsTerminalItems(detected);
      break;
    case 'darwin':
      items = getMacOSTerminalItems(detected);
      break;
    case 'linux':
      items = getLinuxTerminalItems(detected);
      break;
    default:
      // 預設使用 Linux 項目列表
      items = getLinuxTerminalItems(detected);
  }

  container.innerHTML = items
    .map(
      item =>
        '<div class="detection-item ' +
        (item.installed ? 'installed' : 'not-installed') +
        '">' +
        '<span class="detection-icon">' +
        item.icon +
        '</span>' +
        '<span class="detection-name">' +
        item.name +
        '</span>' +
        '<span class="detection-status">' +
        (item.installed
          ? '✓ ' + t('ui.settings.terminals.detected')
          : '✕ ' + t('ui.settings.terminals.notDetected')) +
        '</span>' +
        (item.detail ? '<span class="detection-detail">(' + item.detail + ')</span>' : '') +
        '</div>'
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
        (terminal.hidden ? ' hidden-terminal' : '') +
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
          ? '<label class="switch switch-sm" title="' +
            t('ui.settings.terminals.toggleVisibility') +
            '"><input type="checkbox" data-toggle-terminal="' +
            terminal.id +
            '"' +
            (terminal.hidden ? '' : ' checked') +
            ' /><span class="slider"></span></label>'
          : '<button class="btn-icon edit" data-edit-terminal="' +
            terminal.id +
            '" title="' +
            t('common.edit') +
            '">✏️</button><button class="btn-icon delete" data-delete-terminal="' +
            terminal.id +
            '" title="' +
            t('common.delete') +
            '">🗑️</button>') +
        '</div></div>'
    )
    .join('');

  bindTerminalEvents();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function bindTerminalEvents() {
  document.querySelectorAll('[data-edit-terminal]').forEach(btn => {
    btn.addEventListener('click', () => {
      showEditTerminalModal(btn.dataset.editTerminal);
    });
  });

  document.querySelectorAll('[data-delete-terminal]').forEach(btn => {
    btn.addEventListener('click', () => {
      showDeleteTerminalModal(btn.dataset.deleteTerminal);
    });
  });

  document.querySelectorAll('[data-toggle-terminal]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      toggleTerminalHidden(checkbox.dataset.toggleTerminal);
    });
  });
}

/**
 * 顯示新增終端彈窗
 */
export function showAddTerminalModal() {
  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group flex-1">' +
    '<label>' +
    t('ui.settings.terminals.name') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalName" placeholder="' +
    t('ui.settings.terminals.namePlaceholder') +
    '" />' +
    '</div>' +
    '<div class="input-group" style="max-width: 80px">' +
    '<label>' +
    t('ui.settings.terminals.icon') +
    '</label>' +
    '<input type="text" id="modalTerminalIcon" placeholder="💻" maxlength="2" class="icon-input" title="' +
    t('ui.addDirectory.iconHint') +
    '" />' +
    '</div>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.settings.terminals.command') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalCommand" placeholder="' +
    t('ui.settings.terminals.commandPlaceholder') +
    '" class="mono-input" />' +
    '<small class="hint">' +
    t('ui.settings.terminals.commandHint') +
    '</small>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.settings.terminals.pathFormat') +
    '</label>' +
    '<select id="modalTerminalPathFormat">' +
    '<option value="windows">' +
    t('ui.settings.terminals.pathWindows') +
    '</option>' +
    '<option value="unix">' +
    t('ui.settings.terminals.pathUnix') +
    '</option>' +
    '</select>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.settings.terminals.addTitle'),
    content,
    confirmText: t('common.add'),
    onConfirm: async () => {
      const name = document.getElementById('modalTerminalName').value.trim();
      const icon = document.getElementById('modalTerminalIcon').value.trim() || '💻';
      const command = document.getElementById('modalTerminalCommand').value.trim();
      const pathFormat = document.getElementById('modalTerminalPathFormat').value;

      if (!name) {
        showToast(t('toast.terminalNameRequired'), 'error');
        return false;
      }
      if (!command) {
        showToast(t('toast.terminalCommandRequired'), 'error');
        return false;
      }
      if (!command.includes('{path}')) {
        showToast(t('toast.terminalCommandNeedsPath'), 'error');
        return false;
      }

      const config = getConfig();
      const newId = 'custom-' + Date.now();
      config.terminals.push({
        id: newId,
        name,
        icon,
        command,
        pathFormat,
        isBuiltin: false,
      });

      await saveConfig();
      renderTerminalsList();
      renderTerminalSelect();
      showToast(t('toast.terminalAdded'), 'success');
      return true;
    },
  });
}

/**
 * 顯示編輯終端彈窗
 * @param {string} terminalId - 終端 ID
 */
function showEditTerminalModal(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal || terminal.isBuiltin) return;

  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group flex-1">' +
    '<label>' +
    t('ui.settings.terminals.name') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalName" value="' +
    escapeHtml(terminal.name) +
    '" />' +
    '</div>' +
    '<div class="input-group" style="max-width: 80px">' +
    '<label>' +
    t('ui.settings.terminals.icon') +
    '</label>' +
    '<input type="text" id="modalTerminalIcon" value="' +
    (terminal.icon || '') +
    '" maxlength="2" class="icon-input" title="' +
    t('ui.addDirectory.iconHint') +
    '" />' +
    '</div>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.settings.terminals.command') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalCommand" value="' +
    escapeHtml(terminal.command) +
    '" class="mono-input" />' +
    '<small class="hint">' +
    t('ui.settings.terminals.commandHint') +
    '</small>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.settings.terminals.pathFormat') +
    '</label>' +
    '<select id="modalTerminalPathFormat">' +
    '<option value="windows"' +
    (terminal.pathFormat === 'windows' ? ' selected' : '') +
    '>' +
    t('ui.settings.terminals.pathWindows') +
    '</option>' +
    '<option value="unix"' +
    (terminal.pathFormat === 'unix' ? ' selected' : '') +
    '>' +
    t('ui.settings.terminals.pathUnix') +
    '</option>' +
    '</select>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.settings.terminals.editTitle'),
    content,
    confirmText: t('common.save'),
    onConfirm: async () => {
      const name = document.getElementById('modalTerminalName').value.trim();
      const icon = document.getElementById('modalTerminalIcon').value.trim() || '💻';
      const command = document.getElementById('modalTerminalCommand').value.trim();
      const pathFormat = document.getElementById('modalTerminalPathFormat').value;

      if (!name) {
        showToast(t('toast.terminalNameRequired'), 'error');
        return false;
      }
      if (!command) {
        showToast(t('toast.terminalCommandRequired'), 'error');
        return false;
      }
      if (!command.includes('{path}')) {
        showToast(t('toast.terminalCommandNeedsPath'), 'error');
        return false;
      }

      const terminalIndex = config.terminals.findIndex(t => t.id === terminalId);
      if (terminalIndex !== -1) {
        config.terminals[terminalIndex] = {
          ...config.terminals[terminalIndex],
          name,
          icon,
          command,
          pathFormat,
        };
        await saveConfig();
        renderTerminalsList();
        renderTerminalSelect();
        renderDirectories();
        showToast(t('toast.terminalUpdated'), 'success');
      }
      return true;
    },
  });
}

/**
 * 顯示刪除終端彈窗（含替代選項）
 * @param {string} terminalId - 終端 ID
 */
function showDeleteTerminalModal(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal || terminal.isBuiltin) return;

  // 計算使用此終端的目錄數量
  const dirCount = config.directories.filter(d => d.terminalId === terminalId).length;

  // 其他可用的終端
  const otherTerminals = config.terminals.filter(t => t.id !== terminalId);

  let content = '<p>' + t('ui.settings.terminals.deleteConfirm', { name: terminal.name }) + '</p>';

  if (dirCount > 0) {
    content +=
      '<p class="warning">' +
      t('ui.settings.terminals.deleteHasDirectories', { count: dirCount }) +
      '</p>' +
      '<div class="input-group">' +
      '<label>' +
      t('ui.settings.terminals.replaceWith') +
      '</label>' +
      '<select id="modalReplaceTerminal">' +
      otherTerminals
        .map(t => '<option value="' + t.id + '">' + t.icon + ' ' + t.name + '</option>')
        .join('') +
      '</select>' +
      '</div>';
  }

  openModal({
    title: t('ui.settings.terminals.deleteTitle'),
    content,
    confirmText: t('ui.settings.terminals.confirmDelete'),
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      // 替換使用此終端的目錄
      if (dirCount > 0) {
        const replaceId = document.getElementById('modalReplaceTerminal').value;
        config.directories.forEach(dir => {
          if (dir.terminalId === terminalId) {
            dir.terminalId = replaceId;
          }
        });
      }

      config.terminals = config.terminals.filter(t => t.id !== terminalId);
      await saveConfig();

      renderTerminalsList();
      renderTerminalSelect();
      renderDirectories();
      showToast(t('toast.terminalDeleted'), 'success');
      return true;
    },
  });
}

/**
 * 清除最近使用記錄
 */
export async function clearRecentHistory() {
  openConfirmModal({
    title: t('ui.settings.recent.clearTitle'),
    message: t('ui.settings.recent.clearConfirm'),
    confirmText: t('ui.settings.recent.clearButton'),
    danger: true,
    onConfirm: async () => {
      const config = getConfig();
      config.directories.forEach(d => {
        delete d.lastUsed;
      });
      await saveConfig();
      renderRecentList();
      showToast(t('toast.recentCleared'), 'success');
      return true;
    },
  });
}

/**
 * 顯示快捷鍵彈窗
 */
export function showShortcutsModal() {
  const globalShortcuts = [{ key: 'Alt+Space', desc: t('ui.shortcuts.toggleWindow') }];

  const appShortcuts = [
    { key: 'Ctrl+1~5', desc: t('ui.shortcuts.switchTab') },
    { key: 'Ctrl+N', desc: t('ui.shortcuts.addDirectory') },
    { key: 'Ctrl+F', desc: t('ui.shortcuts.focusSearch') },
    { key: 'Escape', desc: t('ui.shortcuts.closeModal') },
    { key: 'Enter', desc: t('ui.shortcuts.openDirectory') },
  ];

  const renderShortcuts = shortcuts =>
    shortcuts
      .map(
        s => '<div class="shortcut-item"><kbd>' + s.key + '</kbd><span>' + s.desc + '</span></div>'
      )
      .join('');

  const content =
    '<div class="shortcuts-section">' +
    '<h4>' +
    t('ui.shortcuts.global') +
    '</h4>' +
    '<div class="shortcuts-list">' +
    renderShortcuts(globalShortcuts) +
    '</div>' +
    '</div>' +
    '<div class="shortcuts-section">' +
    '<h4>' +
    t('ui.shortcuts.app') +
    '</h4>' +
    '<div class="shortcuts-list">' +
    renderShortcuts(appShortcuts) +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.shortcuts.title'),
    content,
    confirmText: t('common.close'),
    showCancel: false,
    modalClass: 'shortcuts-modal',
  });
}

/**
 * 開啟設定目錄
 */
export async function openConfigDirectory() {
  const result = await api.openConfigDirectory?.();
  if (result?.success) {
    showToast(t('toast.configDirOpened'), 'success');
  }
}

/**
 * 清除日誌
 */
export async function clearLogs() {
  openConfirmModal({
    title: t('ui.settings.advanced.clearLogsTitle'),
    message: t('ui.settings.advanced.clearLogsConfirm'),
    confirmText: t('ui.settings.advanced.clearLogs'),
    danger: false,
    onConfirm: async () => {
      const result = await api.clearLogs?.();
      if (result?.success) {
        showToast(t('toast.logsCleared'), 'success');
      }
      return true;
    },
  });
}

/**
 * 重設所有設定
 */
export async function resetAllSettings() {
  openConfirmModal({
    title: t('ui.settings.advanced.resetTitle'),
    message: t('ui.settings.advanced.resetConfirm'),
    confirmText: t('ui.settings.advanced.resetSettings'),
    danger: true,
    onConfirm: async () => {
      const result = await api.resetConfig?.();
      if (result?.success) {
        setConfig(result.config);
        await renderSettings();
        renderGroupFilter();
        renderGroupSelect();
        renderTerminalSelect();
        renderDirectories();
        renderGroupsTab();
        renderTerminalsList();
        renderRecentList();
        applyTheme(result.config.settings?.theme || 'dark');
        showToast(t('toast.settingsReset'), 'success');
      }
      return true;
    },
  });
}

/**
 * 開啟 GitHub
 */
export function openGithub() {
  api.openExternal?.('https://github.com/SyuanJin/TermLauncher');
}

/**
 * 儲存一般設定
 */
export async function saveSettings() {
  const config = getConfig();
  config.settings.startMinimized = document.getElementById('startMinimized').checked;
  config.settings.minimizeToTray = document.getElementById('minimizeToTray').checked;
  await saveConfig();
}

/**
 * 匯出配置（顯示選項彈窗）
 */
export async function exportConfig() {
  const preview = await api.getExportPreview();

  const content =
    '<div class="modal-form">' +
    '<p class="modal-description">' +
    t('ui.settings.data.exportAdvancedDesc') +
    '</p>' +
    '<div class="export-options">' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="exportTerminals" checked />' +
    '<span>' +
    t('ui.settings.data.exportTerminals') +
    ' (' +
    preview.terminalsCount +
    ')</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="exportGroups" checked />' +
    '<span>' +
    t('ui.settings.data.exportGroups') +
    ' (' +
    preview.groupsCount +
    ')</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="exportDirectories" checked />' +
    '<span>' +
    t('ui.settings.data.exportDirectories') +
    ' (' +
    preview.directoriesCount +
    ')</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="exportFavorites" checked />' +
    '<span>' +
    t('ui.settings.data.exportFavorites') +
    ' (' +
    preview.favoritesCount +
    ')</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="exportSettings" checked />' +
    '<span>' +
    t('ui.settings.data.exportSettings') +
    '</span>' +
    '</label>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.settings.data.exportAdvancedTitle'),
    content,
    confirmText: t('ui.settings.data.export'),
    onConfirm: async () => {
      const options = {
        includeTerminals: document.getElementById('exportTerminals').checked,
        includeGroups: document.getElementById('exportGroups').checked,
        includeDirectories: document.getElementById('exportDirectories').checked,
        includeFavorites: document.getElementById('exportFavorites').checked,
        includeSettings: document.getElementById('exportSettings').checked,
      };

      const result = await api.exportConfigAdvanced(options);
      if (result.success) {
        showToast(t('toast.configExported'), 'success');
      }
      return true;
    },
  });
}

/**
 * 匯入配置（顯示選項彈窗）
 */
export function importConfig() {
  const content =
    '<div class="modal-form">' +
    '<p class="modal-description">' +
    t('ui.settings.data.importAdvancedDesc') +
    '</p>' +
    '<div class="import-options">' +
    '<h4>' +
    t('ui.settings.data.importMode') +
    '</h4>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="mergeTerminals" checked />' +
    '<span>' +
    t('ui.settings.data.mergeTerminals') +
    '</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="mergeGroups" checked />' +
    '<span>' +
    t('ui.settings.data.mergeGroups') +
    '</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="mergeDirectories" checked />' +
    '<span>' +
    t('ui.settings.data.mergeDirectories') +
    '</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="mergeFavorites" checked />' +
    '<span>' +
    t('ui.settings.data.mergeFavorites') +
    '</span>' +
    '</label>' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="mergeSettings" checked />' +
    '<span>' +
    t('ui.settings.data.mergeSettings') +
    '</span>' +
    '</label>' +
    '<small class="hint">' +
    t('ui.settings.data.mergeHint') +
    '</small>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.settings.data.importAdvancedTitle'),
    content,
    confirmText: t('ui.settings.data.import'),
    onConfirm: async () => {
      const options = {
        mergeTerminals: document.getElementById('mergeTerminals').checked,
        mergeGroups: document.getElementById('mergeGroups').checked,
        mergeDirectories: document.getElementById('mergeDirectories').checked,
        mergeFavorites: document.getElementById('mergeFavorites').checked,
        mergeSettings: document.getElementById('mergeSettings').checked,
      };

      const result = await api.importConfigAdvanced(options);
      if (result.success) {
        setConfig(result.config);
        renderGroupFilter();
        renderGroupSelect();
        renderTerminalSelect();
        renderDirectories();
        await renderSettings();
        renderGroupsTab();
        renderTerminalsList();

        if (result.errors && result.errors.length > 0) {
          showToast(t('toast.configImportedWithWarnings'), 'warning');
        } else {
          showToast(t('toast.configImported'), 'success');
        }
      } else if (result.errors) {
        showToast(t('toast.importFailed', { error: result.errors.join(', ') }), 'error');
      }
      return true;
    },
  });
}

/**
 * 設定設定頁面的事件監聽
 */
export function setupSettingsEvents() {
  document.getElementById('themeSelect').addEventListener('change', changeTheme);
  document.getElementById('languageSelect').addEventListener('change', changeLanguage);
  document.getElementById('showTabText').addEventListener('change', changeShowTabText);
  document.getElementById('autoLaunch').addEventListener('change', changeAutoLaunch);
  document.getElementById('startMinimized').addEventListener('change', saveSettings);
  document.getElementById('minimizeToTray').addEventListener('change', saveSettings);
  document.getElementById('recentLimit').addEventListener('change', changeRecentLimit);

  document.getElementById('btnViewShortcuts')?.addEventListener('click', showShortcutsModal);
  document.getElementById('btnClearRecent')?.addEventListener('click', clearRecentHistory);
  document.getElementById('btnAddTerminal')?.addEventListener('click', showAddTerminalModal);
  document.getElementById('btnExportConfig')?.addEventListener('click', exportConfig);
  document.getElementById('btnImportConfig')?.addEventListener('click', importConfig);
  document.getElementById('btnOpenConfigDir')?.addEventListener('click', openConfigDirectory);
  document.getElementById('btnClearLogs')?.addEventListener('click', clearLogs);
  document.getElementById('btnResetSettings')?.addEventListener('click', resetAllSettings);
  document.getElementById('btnOpenGithub')?.addEventListener('click', openGithub);
}
