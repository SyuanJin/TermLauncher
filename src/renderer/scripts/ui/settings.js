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
import { escapeHtml, escapeAttr } from '../utils/escape.js';
import { renderLaunchersTab } from './launchers.js';
import { checkTabsOverflow } from './tabs.js';

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
  // 開啟文字顯示後重新檢查溢出
  if (show) checkTabsOverflow();
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
  renderLaunchersTab();
  renderRecentList();

  // 語言切換後重新檢查 Tab 列是否溢出
  checkTabsOverflow();

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
 * 更新 MCP 狀態顯示
 */
async function updateMcpStatus() {
  const status = await api.getMcpStatus();
  const el = document.getElementById('mcpStatus');
  if (el) {
    if (status.running) {
      el.textContent = t('ui.settings.mcp.statusRunning') + ' (:' + status.port + ')';
      el.className = 'mcp-status mcp-running';
    } else {
      el.textContent = t('ui.settings.mcp.statusStopped');
      el.className = 'mcp-status mcp-stopped';
    }
  }
}

/**
 * 變更 MCP 啟用狀態
 */
async function changeMcpEnabled() {
  const config = getConfig();
  const enabled = document.getElementById('mcpEnabled').checked;
  if (!config.settings.mcp) config.settings.mcp = {};
  config.settings.mcp.enabled = enabled;
  await saveConfig();

  if (enabled) {
    const port = config.settings.mcp.port || 23549;
    const result = await api.startMcpServer(port);
    if (result.success) {
      showToast(t('toast.mcpStarted'), 'success');
    } else if (result.error === 'port-in-use') {
      showToast(t('toast.mcpPortInUse', { port }), 'error');
    } else {
      showToast(t('toast.mcpStartFailed', { error: result.error }), 'error');
    }
  } else {
    await api.stopMcpServer();
    showToast(t('toast.mcpStopped'), 'success');
  }

  await updateMcpStatus();
}

/**
 * 變更 MCP 埠號
 */
async function changeMcpPort() {
  const config = getConfig();
  const port = parseInt(document.getElementById('mcpPort').value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) return;

  if (!config.settings.mcp) config.settings.mcp = {};
  const oldPort = config.settings.mcp.port;
  config.settings.mcp.port = port;
  await saveConfig();

  // 如果 MCP 正在運行且埠號變更，重啟
  if (config.settings.mcp.enabled && port !== oldPort) {
    await api.stopMcpServer();
    const result = await api.startMcpServer(port);
    if (result.success) {
      showToast(t('toast.mcpStarted'), 'success');
    } else if (result.error === 'port-in-use') {
      showToast(t('toast.mcpPortInUse', { port }), 'error');
    } else {
      showToast(t('toast.mcpStartFailed', { error: result.error }), 'error');
    }
    await updateMcpStatus();
  }
}

/**
 * 複製 MCP Claude Code 配置到剪貼簿
 */
async function copyMcpConfig() {
  const config = getConfig();
  const port = config.settings?.mcp?.port || 23549;
  const mcpConfig = {
    mcpServers: {
      termlauncher: {
        type: 'http',
        url: `http://127.0.0.1:${port}/mcp`,
      },
    },
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
    showToast(t('toast.mcpConfigCopied'), 'success');
  } catch {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = JSON.stringify(mcpConfig, null, 2);
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(t('toast.mcpConfigCopied'), 'success');
  }
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
        escapeAttr(locale.code) +
        '"' +
        (locale.code === currentLanguage ? ' selected' : '') +
        '>' +
        escapeHtml(locale.nativeName) +
        '</option>'
    )
    .join('');

  // 應用 Tab 文字顯示設定
  applyShowTabText(config.settings.showTabText !== false);

  // 顯示版本號
  const version = (await api.getAppVersion?.()) || '2.0.0';
  document.getElementById('appVersion').textContent = 'v' + version;

  // MCP 設定
  const mcpSettings = config.settings?.mcp || {};
  document.getElementById('mcpEnabled').checked = mcpSettings.enabled !== false;
  document.getElementById('mcpPort').value = mcpSettings.port || 23549;
  await updateMcpStatus();
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
        d.lastUsed = null;
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
    { key: 'Ctrl+1~6', desc: t('ui.shortcuts.switchTab') },
    { key: 'Ctrl+N', desc: t('ui.shortcuts.addDirectory') },
    { key: 'Ctrl+F', desc: t('ui.shortcuts.focusSearch') },
    { key: 'Escape', desc: t('ui.shortcuts.closeModal') },
    { key: 'Enter', desc: t('ui.shortcuts.openDirectory') },
  ];

  const renderShortcuts = shortcuts =>
    shortcuts
      .map(
        s =>
          '<div class="shortcut-item"><kbd>' +
          escapeHtml(s.key) +
          '</kbd><span>' +
          escapeHtml(s.desc) +
          '</span></div>'
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
        renderLaunchersTab();
        renderRecentList();
        applyTheme(result.config.settings?.theme || 'dark');
        showToast(t('toast.settingsReset'), 'success');
      }
      return true;
    },
  });
}

/**
 * 手動檢查版本更新
 */
export async function checkForUpdatesManual() {
  const btn = document.getElementById('btnCheckUpdate');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('span:last-child').textContent = t('toast.updateChecking');
  }

  try {
    const result = await api.checkForUpdates();
    if (result.hasUpdate) {
      showToast(t('toast.updateAvailable', { version: result.latestVersion }), 'info', {
        persistent: true,
        actions: [
          {
            label: t('toast.updateDownload'),
            onClick: () => {
              api.openExternal(result.releaseUrl);
            },
          },
        ],
      });
    } else if (result.error) {
      showToast(t('toast.updateCheckFailed'), 'warning');
    } else {
      showToast(t('toast.updateLatest'), 'success');
    }
  } catch {
    showToast(t('toast.updateCheckFailed'), 'warning');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span:last-child').textContent = t('ui.settings.about.checkUpdate');
    }
  }
}

/**
 * 開啟 GitHub
 */
export function openGithub() {
  api.openExternal?.('https://github.com/xjin9612/TermLauncher');
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
    '<input type="checkbox" id="exportFavorites" checked />' +
    '<span>' +
    t('ui.settings.data.exportFavorites') +
    ' (' +
    preview.favoritesCount +
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
    '<input type="checkbox" id="exportTerminals" checked />' +
    '<span>' +
    t('ui.settings.data.exportTerminals') +
    ' (' +
    preview.terminalsCount +
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
    '<input type="checkbox" id="mergeFavorites" checked />' +
    '<span>' +
    t('ui.settings.data.mergeFavorites') +
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
    '<input type="checkbox" id="mergeTerminals" checked />' +
    '<span>' +
    t('ui.settings.data.mergeTerminals') +
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
        renderLaunchersTab();
        renderRecentList();
        applyTheme(result.config.settings?.theme || 'dark');

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
  document.getElementById('btnExportConfig')?.addEventListener('click', exportConfig);
  document.getElementById('btnImportConfig')?.addEventListener('click', importConfig);
  document.getElementById('btnOpenConfigDir')?.addEventListener('click', openConfigDirectory);
  document.getElementById('btnClearLogs')?.addEventListener('click', clearLogs);
  document.getElementById('btnResetSettings')?.addEventListener('click', resetAllSettings);
  document.getElementById('btnOpenGithub')?.addEventListener('click', openGithub);
  document.getElementById('btnCheckUpdate')?.addEventListener('click', checkForUpdatesManual);

  // MCP 設定
  document.getElementById('mcpEnabled')?.addEventListener('change', changeMcpEnabled);
  document.getElementById('mcpPort')?.addEventListener('change', changeMcpPort);
  document.getElementById('btnCopyMcpConfig')?.addEventListener('click', copyMcpConfig);
}
