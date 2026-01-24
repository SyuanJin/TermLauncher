/**
 * 快捷鍵錄製模組
 * 處理快捷鍵的錄製與驗證
 */
import { getConfig, saveConfig } from '../state.js';
import { showToast } from '../ui/toast.js';
import { t } from '../i18n.js';

// 按鍵映射表：將 JavaScript 按鍵名稱轉換為 Electron globalShortcut 格式
const keyMap = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Escape',
  Enter: 'Return',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Tab: 'Tab',
};

/**
 * 錄製快捷鍵
 * @param {HTMLInputElement} input - 快捷鍵輸入框
 */
export function recordShortcut(input) {
  const originalValue = input.value;
  input.value = t('toast.pressShortcut');

  // 清理所有事件監聽器的函數
  const cleanup = () => {
    document.removeEventListener('keydown', handler);
    document.removeEventListener('click', cancelHandler);
  };

  const handler = async e => {
    e.preventDefault();
    e.stopPropagation();

    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    const key = e.key;

    // 如果只按了修飾鍵，繼續等待
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      return;
    }

    // 轉換按鍵名稱
    let mappedKey = keyMap[key];
    if (!mappedKey) {
      // 單一字母或數字轉大寫
      if (key.length === 1) {
        mappedKey = key.toUpperCase();
      } else if (key.startsWith('F') && !isNaN(key.slice(1))) {
        // F1-F12 保持原樣
        mappedKey = key;
      } else {
        mappedKey = key;
      }
    }

    keys.push(mappedKey);

    // 需要至少一個修飾鍵 + 一個主鍵
    if (keys.length > 1) {
      const shortcut = keys.join('+');
      input.value = shortcut;
      const config = getConfig();
      config.settings.globalShortcut = shortcut;
      await saveConfig();
      showToast(t('toast.shortcutUpdated', { shortcut }), 'success');
    } else {
      // 沒有修飾鍵，恢復原值
      input.value = originalValue;
      showToast(t('toast.shortcutNeedsModifier'), 'error');
    }
    cleanup();
  };

  // 點擊其他地方取消錄製
  const cancelHandler = e => {
    if (e.target !== input) {
      input.value = originalValue;
      cleanup();
    }
  };

  document.addEventListener('keydown', handler);
  setTimeout(() => {
    document.addEventListener('click', cancelHandler);
  }, 100);
}

/**
 * 從輸入框直接保存快捷鍵（手動輸入模式）
 * @param {HTMLInputElement} input - 快捷鍵輸入框
 */
export async function saveShortcutFromInput(input) {
  const config = getConfig();
  const shortcut = input.value.trim();

  if (!shortcut) {
    input.value = config.settings.globalShortcut || 'Alt+Space';
    return;
  }

  // 驗證格式：需要包含修飾鍵
  const parts = shortcut.split('+');
  const modifiers = ['Ctrl', 'Alt', 'Shift', 'Command', 'Super'];
  const hasModifier = parts.some(p => modifiers.includes(p));

  if (!hasModifier || parts.length < 2) {
    showToast(t('toast.shortcutFormatError'), 'error');
    input.value = config.settings.globalShortcut || 'Alt+Space';
    return;
  }

  // 標準化格式
  const normalizedShortcut = parts
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .map(p => (p === 'Control' ? 'Ctrl' : p))
    .join('+');

  if (normalizedShortcut !== config.settings.globalShortcut) {
    config.settings.globalShortcut = normalizedShortcut;
    input.value = normalizedShortcut;
    await saveConfig();
    showToast(t('toast.shortcutUpdated', { shortcut: normalizedShortcut }), 'success');
  }
}
