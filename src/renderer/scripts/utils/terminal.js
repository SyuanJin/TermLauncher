/**
 * 終端相關共用工具模組
 * 提供終端操作相關的共用函數
 */
import { getConfig, loadConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from '../ui/toast.js';
import { openModal } from '../ui/modal.js';
import { t } from '../i18n.js';
import { switchTab } from '../ui/tabs.js';
import { escapeHtml } from './escape.js';

/**
 * 取得預設終端 ID（從配置中取得第一個非檔案管理器的終端）
 * @returns {string} 預設終端 ID
 */
export function getDefaultTerminalId() {
  const config = getConfig();
  const nonFileManager = config?.terminals?.find(t => t.id !== 'file-manager' && !t.hidden);
  return nonFileManager?.id || config?.terminals?.[0]?.id || 'file-manager';
}

/**
 * 取得終端顯示名稱（支援 i18n）
 * 內建終端嘗試翻譯，自訂終端直接使用 name
 * @param {Object} terminal - 終端配置物件
 * @returns {string} 終端顯示名稱
 */
export function getTerminalDisplayName(terminal) {
  if (terminal.isBuiltin) {
    const key = 'terminals.' + terminal.id;
    const translated = t(key);
    return translated !== key ? translated : terminal.name;
  }
  return terminal.name;
}

/**
 * 錯誤類型對應訊息鍵
 */
const ErrorTypeToMessageKey = {
  PATH_NOT_FOUND: 'pathNotFound',
  PATH_NOT_DIRECTORY: 'pathNotDirectory',
  PATH_UNSAFE: 'pathUnsafe',
  WINDOWS_TERMINAL_NOT_FOUND: 'windowsTerminalNotFound',
  WSL_NOT_FOUND: 'wslNotFound',
  WSL_DISTRO_NOT_FOUND: 'wslDistroNotFound',
  TERMINAL_NOT_FOUND: 'terminalNotFound',
};

/**
 * 取得錯誤訊息
 * @param {Object} result - API 回傳結果
 * @returns {string} 錯誤訊息
 */
export function getErrorMessage(result) {
  const messageKey = ErrorTypeToMessageKey[result.errorType];

  if (messageKey) {
    if (
      result.errorType === 'PATH_NOT_FOUND' ||
      result.errorType === 'PATH_NOT_DIRECTORY' ||
      result.errorType === 'PATH_UNSAFE'
    ) {
      return t('toast.' + messageKey, { path: result.errorDetail });
    }
    if (result.errorType === 'WSL_DISTRO_NOT_FOUND') {
      return t('toast.' + messageKey, { distro: result.errorDetail });
    }
    if (result.errorType === 'TERMINAL_NOT_FOUND') {
      return t('toast.' + messageKey, { name: result.errorDetail });
    }
    return t('toast.' + messageKey);
  }

  return t('toast.openFailed', { error: result.error || 'Unknown error' });
}

/**
 * 取得錯誤行動按鈕
 * @param {Object} result - API 回傳結果
 * @param {Object} dir - 目錄物件
 * @returns {Array} 行動按鈕陣列
 */
export function getErrorActions(result, dir) {
  if (!result.actions || result.actions.length === 0) {
    return [];
  }

  return result.actions.map(action => {
    const label = t(action.labelKey);
    let onClick;

    switch (action.type) {
      case 'url':
        onClick = () => {
          api.openExternal(action.value);
        };
        break;
      case 'internal':
        onClick = () => {
          if (action.value === 'open-terminal-settings') {
            switchTab('settings');
          } else if (action.value === 'edit-directory' && dir) {
            // 觸發編輯目錄事件
            const event = new CustomEvent('edit-directory', { detail: { dirId: dir.id } });
            window.dispatchEvent(event);
          }
        };
        break;
      default:
        onClick = () => {};
    }

    return { label, onClick };
  });
}

/**
 * 使用指定終端開啟目錄
 * @param {number} dirId - 目錄 ID
 * @param {string} terminalId - 終端 ID
 * @param {Function} onSuccess - 成功後的回調函數
 */
export async function openTerminalWithType(dirId, terminalId, onSuccess) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  const dirWithTerminal = { ...dir, terminalId };
  const result = await api.openTerminal(dirWithTerminal);

  if (result.success) {
    showToast(t('toast.openingDirectory', { name: dir.name }), 'success');
    await loadConfig();
    if (onSuccess) {
      onSuccess();
    }
  } else {
    const errorMessage = getErrorMessage(result);
    const actions = getErrorActions(result, dir);
    showToast(errorMessage, 'error', { actions });
  }
}

/**
 * 開啟終端（使用目錄預設終端）
 * @param {number} dirId - 目錄 ID
 * @param {Function} onSuccess - 成功後的回調函數
 */
export async function openTerminal(dirId, onSuccess) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  const result = await api.openTerminal(dir);

  if (result.success) {
    showToast(t('toast.openingDirectory', { name: dir.name }), 'success');
    await loadConfig();
    if (onSuccess) {
      onSuccess();
    }
  } else {
    const errorMessage = getErrorMessage(result);
    const actions = getErrorActions(result, dir);
    showToast(errorMessage, 'error', { actions });
  }
}

/**
 * 顯示命令預覽彈窗
 * @param {number} dirId - 目錄 ID
 * @param {string} terminalId - 終端 ID（可選）
 */
export async function showCommandPreview(dirId, terminalId) {
  const config = getConfig();
  const dir = config.directories.find(d => d.id === dirId);
  if (!dir) return;

  const result = await api.previewCommand(dir, terminalId || dir.terminalId);

  if (!result.success) {
    showToast(t('toast.previewFailed'), 'error');
    return;
  }

  const content =
    '<div class="command-preview">' +
    '<div class="preview-section">' +
    '<label>' +
    t('contextMenu.previewTerminal') +
    '</label>' +
    '<div class="preview-value">' +
    escapeHtml(result.terminalName) +
    '</div>' +
    '</div>' +
    '<div class="preview-section">' +
    '<label>' +
    t('contextMenu.previewOriginalPath') +
    '</label>' +
    '<div class="preview-value path">' +
    escapeHtml(result.originalPath) +
    '</div>' +
    '</div>' +
    '<div class="preview-section">' +
    '<label>' +
    t('contextMenu.previewFormattedPath') +
    ' (' +
    (result.pathFormat === 'unix' ? 'WSL' : 'Windows') +
    ')</label>' +
    '<div class="preview-value path">' +
    escapeHtml(result.formattedPath) +
    '</div>' +
    '</div>' +
    '<div class="preview-section">' +
    '<label>' +
    t('contextMenu.previewCommand') +
    '</label>' +
    '<div class="preview-value command">' +
    escapeHtml(result.command) +
    '</div>' +
    '</div>' +
    '</div>';

  openModal({
    title: t('contextMenu.previewTitle'),
    content,
    confirmText: t('contextMenu.previewExecute'),
    cancelText: t('contextMenu.previewCopy'),
    modalClass: 'command-preview-modal',
    onConfirm: async () => {
      // 執行命令
      await openTerminal(dirId);
      return true;
    },
    onCancel: () => {
      // 複製命令
      navigator.clipboard.writeText(result.command);
      showToast(t('toast.commandCopied'), 'success');
      return true;
    },
  });
}
