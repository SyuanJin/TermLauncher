/**
 * 終端相關共用工具模組
 * 提供終端操作相關的共用函數
 */
import { getConfig, loadConfig } from '../state.js';
import { api } from '../api.js';
import { showToast } from '../ui/toast.js';
import { t } from '../i18n.js';

/**
 * 錯誤類型對應訊息鍵
 */
const ErrorTypeToMessageKey = {
  PATH_NOT_FOUND: 'pathNotFound',
  PATH_NOT_DIRECTORY: 'pathNotDirectory',
  WINDOWS_TERMINAL_NOT_FOUND: 'windowsTerminalNotFound',
  WSL_NOT_FOUND: 'wslNotFound',
  WSL_DISTRO_NOT_FOUND: 'wslDistroNotFound',
};

/**
 * 取得錯誤訊息
 * @param {Object} result - API 回傳結果
 * @returns {string} 錯誤訊息
 */
export function getErrorMessage(result) {
  const messageKey = ErrorTypeToMessageKey[result.errorType];

  if (messageKey) {
    if (result.errorType === 'PATH_NOT_FOUND' || result.errorType === 'PATH_NOT_DIRECTORY') {
      return t('toast.' + messageKey, { path: result.errorDetail });
    }
    if (result.errorType === 'WSL_DISTRO_NOT_FOUND') {
      return t('toast.' + messageKey, { distro: result.errorDetail });
    }
    return t('toast.' + messageKey);
  }

  return t('toast.openFailed', { error: result.error || 'Unknown error' });
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
    showToast(errorMessage, 'error');
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
    showToast(errorMessage, 'error');
  }
}
