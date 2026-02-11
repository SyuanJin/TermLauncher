/**
 * 啟動器管理模組
 * 處理啟動器的偵測、列表渲染與增刪改操作
 */
import { getConfig, saveConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { t } from '../i18n.js';
import { openModal } from './modal.js';
import { renderTerminalSelect, renderDirectories } from './directories.js';
import { escapeHtml, escapeAttr } from '../utils/escape.js';
import { initTerminalsDragDrop } from './dragDrop.js';
import { getTerminalDisplayName } from '../utils/terminal.js';

/**
 * 探測結果快取
 */
let detectedTerminalsCache = null;

/**
 * 平台快取
 */
let platformCache = null;

/**
 * 探測已安裝的啟動器
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
 * 取得 Windows 平台的啟動器項目
 * @param {Object} detected - 探測結果
 * @returns {Array} 啟動器項目列表
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
          ? detected.wslDistros.length + ' ' + t('ui.launchers.distros')
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
 * 取得 macOS 平台的啟動器項目
 * @param {Object} detected - 探測結果
 * @returns {Array} 啟動器項目列表
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
 * 取得 Linux 平台的啟動器項目
 * @param {Object} detected - 探測結果
 * @returns {Array} 啟動器項目列表
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
 * 渲染啟動器探測狀態
 */
export async function renderTerminalDetectionStatus() {
  const container = document.getElementById('terminalDetectionStatus');
  if (!container) return;

  const detected = await detectTerminals();
  const platform = await getPlatform();

  let items = [];

  // 根據平台選擇啟動器項目列表
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
        escapeHtml(item.icon) +
        '</span>' +
        '<span class="detection-name">' +
        escapeHtml(item.name) +
        '</span>' +
        '<span class="detection-status">' +
        (item.installed
          ? '✓ ' + escapeHtml(t('ui.launchers.detected'))
          : '✕ ' + escapeHtml(t('ui.launchers.notDetected'))) +
        '</span>' +
        (item.detail
          ? '<span class="detection-detail">(' + escapeHtml(item.detail) + ')</span>'
          : '') +
        '</div>'
    )
    .join('');
}

/**
 * 渲染啟動器列表
 */
export function renderTerminalsList() {
  const config = getConfig();
  const container = document.getElementById('terminalsList');
  if (!container || !config.terminals) return;

  // 搜尋過濾
  const searchInput = document.getElementById('launchersSearchInput');
  const search = searchInput?.value?.toLowerCase() || '';

  let terminals = config.terminals;
  if (search) {
    terminals = terminals.filter(
      terminal =>
        terminal.name.toLowerCase().includes(search) ||
        terminal.command.toLowerCase().includes(search)
    );
  }

  // 搜尋無結果時顯示空狀態
  if (terminals.length === 0 && search) {
    container.innerHTML =
      '<div class="empty-state"><p>' +
      escapeHtml(t('ui.launchers.emptyFiltered')) +
      '</p><small>' +
      escapeHtml(t('ui.launchers.emptyFilteredHint')) +
      '</small></div>';
    return;
  }

  container.innerHTML = terminals
    .map(
      terminal =>
        '<div class="terminal-item' +
        (terminal.isBuiltin ? ' builtin' : '') +
        (terminal.hidden ? ' hidden-terminal' : '') +
        '" data-terminal-id="' +
        escapeAttr(terminal.id) +
        '"><div class="drag-handle" title="' +
        escapeAttr(t('ui.favorites.dragHint')) +
        '">⋮⋮</div><div class="terminal-item-info"><span class="terminal-icon">' +
        escapeHtml(terminal.icon) +
        '</span><div class="terminal-details"><span class="terminal-name">' +
        escapeHtml(getTerminalDisplayName(terminal)) +
        (terminal.isBuiltin
          ? '<span class="builtin-badge">' + escapeHtml(t('ui.launchers.builtin')) + '</span>'
          : '') +
        '</span><span class="terminal-command">' +
        escapeHtml(terminal.command) +
        '</span></div></div><div class="terminal-actions">' +
        (terminal.isBuiltin
          ? '<label class="switch switch-sm" title="' +
            escapeAttr(t('ui.launchers.toggleVisibility')) +
            '"><input type="checkbox" data-toggle-terminal="' +
            escapeAttr(terminal.id) +
            '"' +
            (terminal.hidden ? '' : ' checked') +
            ' /><span class="slider"></span></label>'
          : '<button class="btn-icon edit" data-edit-terminal="' +
            escapeAttr(terminal.id) +
            '" title="' +
            escapeAttr(t('common.edit')) +
            '">✏️</button><button class="btn-icon delete" data-delete-terminal="' +
            escapeAttr(terminal.id) +
            '" title="' +
            escapeAttr(t('common.delete')) +
            '">🗑️</button>') +
        '</div></div>'
    )
    .join('');

  bindTerminalEvents();
  initTerminalsDragDrop();
}

/**
 * 綁定啟動器列表的事件
 */
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
 * 切換啟動器的隱藏狀態
 * @param {string} terminalId - 啟動器 ID
 */
async function toggleTerminalHidden(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal) return;

  terminal.hidden = !terminal.hidden;
  await saveConfig();
  renderTerminalSelect();
}

/**
 * 顯示新增啟動器彈窗
 */
export function showAddTerminalModal() {
  const content =
    '<div class="modal-form">' +
    '<div class="input-row">' +
    '<div class="input-group flex-1">' +
    '<label>' +
    t('ui.launchers.name') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalName" placeholder="' +
    t('ui.launchers.namePlaceholder') +
    '" />' +
    '</div>' +
    '<div class="input-group" style="max-width: 80px">' +
    '<label>' +
    t('ui.launchers.icon') +
    '</label>' +
    '<input type="text" id="modalTerminalIcon" placeholder="💻" maxlength="2" class="icon-input" title="' +
    t('ui.addDirectory.iconHint') +
    '" />' +
    '</div>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.launchers.command') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalCommand" placeholder="' +
    t('ui.launchers.commandPlaceholder') +
    '" class="mono-input" />' +
    '<small class="hint">' +
    t('ui.launchers.commandHint') +
    '</small>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.launchers.pathFormat') +
    '</label>' +
    '<select id="modalTerminalPathFormat">' +
    '<option value="windows">' +
    t('ui.launchers.pathWindows') +
    '</option>' +
    '<option value="unix">' +
    t('ui.launchers.pathUnix') +
    '</option>' +
    '</select>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.launchers.addTitle'),
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
 * 顯示編輯啟動器彈窗
 * @param {string} terminalId - 啟動器 ID
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
    t('ui.launchers.name') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalName" value="' +
    escapeAttr(terminal.name) +
    '" />' +
    '</div>' +
    '<div class="input-group" style="max-width: 80px">' +
    '<label>' +
    t('ui.launchers.icon') +
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
    t('ui.launchers.command') +
    '<span class="required-mark">*</span></label>' +
    '<input type="text" id="modalTerminalCommand" value="' +
    escapeAttr(terminal.command) +
    '" class="mono-input" />' +
    '<small class="hint">' +
    t('ui.launchers.commandHint') +
    '</small>' +
    '</div>' +
    '<div class="input-group">' +
    '<label>' +
    t('ui.launchers.pathFormat') +
    '</label>' +
    '<select id="modalTerminalPathFormat">' +
    '<option value="windows"' +
    (terminal.pathFormat === 'windows' ? ' selected' : '') +
    '>' +
    t('ui.launchers.pathWindows') +
    '</option>' +
    '<option value="unix"' +
    (terminal.pathFormat === 'unix' ? ' selected' : '') +
    '>' +
    t('ui.launchers.pathUnix') +
    '</option>' +
    '</select>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('ui.launchers.editTitle'),
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
 * 顯示刪除啟動器彈窗（含替代選項）
 * @param {string} terminalId - 啟動器 ID
 */
function showDeleteTerminalModal(terminalId) {
  const config = getConfig();
  const terminal = config.terminals?.find(t => t.id === terminalId);
  if (!terminal || terminal.isBuiltin) return;

  // 計算使用此啟動器的目錄數量
  const dirCount = config.directories.filter(d => d.terminalId === terminalId).length;

  // 其他可用的啟動器
  const otherTerminals = config.terminals.filter(t => t.id !== terminalId);

  let content = '<p>' + t('ui.launchers.deleteConfirm', { name: terminal.name }) + '</p>';

  if (dirCount > 0) {
    content +=
      '<p class="warning">' +
      t('ui.launchers.deleteHasDirectories', { count: dirCount }) +
      '</p>' +
      '<div class="input-group">' +
      '<label>' +
      t('ui.launchers.replaceWith') +
      '</label>' +
      '<select id="modalReplaceTerminal">' +
      otherTerminals
        .map(
          t =>
            '<option value="' +
            escapeAttr(t.id) +
            '">' +
            escapeHtml(t.icon) +
            ' ' +
            escapeHtml(getTerminalDisplayName(t)) +
            '</option>'
        )
        .join('') +
      '</select>' +
      '</div>';
  }

  openModal({
    title: t('ui.launchers.deleteTitle'),
    content,
    confirmText: t('ui.launchers.confirmDelete'),
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      // 替換使用此啟動器的目錄
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
 * 渲染啟動器 Tab 內容
 */
export async function renderLaunchersTab() {
  await renderTerminalDetectionStatus();
  renderTerminalsList();
}

/**
 * 顯示啟動器設定指南彈窗
 */
function showLauncherGuideModal() {
  const guides = [
    {
      category: t('ui.launchers.guide.editors'),
      hint: t('ui.launchers.guide.editorsHint'),
      items: [
        { icon: '💻', name: 'VS Code', command: 'code {path}', pathFormat: 'windows' },
        {
          icon: '💻',
          name: 'VS Code (WSL)',
          command: 'code --remote wsl+Ubuntu {path}',
          pathFormat: 'unix',
        },
        { icon: '✏️', name: 'Sublime Text', command: 'subl {path}', pathFormat: 'windows' },
      ],
    },
    {
      category: t('ui.launchers.guide.jetbrains'),
      hint: t('ui.launchers.guide.jetbrainsHint'),
      items: [
        { icon: '🧠', name: 'IntelliJ IDEA', command: 'idea {path}', pathFormat: 'windows' },
        { icon: '🌐', name: 'WebStorm', command: 'webstorm {path}', pathFormat: 'windows' },
        { icon: '🐍', name: 'PyCharm', command: 'pycharm {path}', pathFormat: 'windows' },
        {
          icon: '🤖',
          name: 'Android Studio',
          command: '"C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe" {path}',
          pathFormat: 'windows',
        },
      ],
    },
    {
      category: t('ui.launchers.guide.terminals'),
      hint: t('ui.launchers.guide.terminalsHint'),
      items: [
        {
          icon: '⚡',
          name: 'PowerShell',
          command: 'powershell -NoExit -Command "cd \'{path}\'"',
          pathFormat: 'windows',
        },
        { icon: '📟', name: 'CMD', command: 'cmd /k cd /d {path}', pathFormat: 'windows' },
        { icon: '🐧', name: 'WSL', command: 'wsl -d Ubuntu --cd {path}', pathFormat: 'unix' },
      ],
    },
  ];

  const renderGuideItems = items =>
    items
      .map(
        item =>
          '<div class="guide-item" data-copy-command="' +
          escapeAttr(item.command) +
          '">' +
          '<span class="guide-item-name">' +
          item.icon +
          ' ' +
          escapeHtml(item.name) +
          '</span>' +
          '<code class="guide-item-command">' +
          escapeHtml(item.command) +
          '</code>' +
          '</div>'
      )
      .join('');

  const content =
    '<p class="guide-hint">' +
    escapeHtml(t('ui.launchers.guide.hint')) +
    '</p>' +
    guides
      .map(
        g =>
          '<div class="shortcuts-section">' +
          '<h4>' +
          escapeHtml(g.category) +
          '</h4>' +
          (g.hint ? '<small class="hint">' + escapeHtml(g.hint) + '</small>' : '') +
          '<div class="shortcuts-list">' +
          renderGuideItems(g.items) +
          '</div>' +
          '</div>'
      )
      .join('');

  openModal({
    title: t('ui.launchers.guideTitle'),
    content,
    confirmText: t('common.close'),
    showCancel: false,
    modalClass: 'launcher-guide-modal',
    onOpen: () => {
      document.querySelectorAll('[data-copy-command]').forEach(el => {
        el.addEventListener('click', () => {
          navigator.clipboard.writeText(el.dataset.copyCommand);
          showToast(t('toast.commandCopied'), 'success');
        });
      });
    },
  });
}

/**
 * 設定啟動器 Tab 的事件監聽
 */
export function setupLaunchersEvents() {
  document.getElementById('btnAddTerminal')?.addEventListener('click', showAddTerminalModal);
  document.getElementById('btnLauncherGuide')?.addEventListener('click', showLauncherGuideModal);

  // 搜尋輸入事件
  const searchInput = document.getElementById('launchersSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderTerminalsList);
  }
}
