/**
 * Toast 通知模組
 * 顯示操作結果的通知提示
 */

/**
 * Toast 類型
 */
export const ToastType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Toast 圖示對應
 */
const ToastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

/**
 * 當前顯示的 Toast 計時器
 */
let currentToastTimer = null;

/**
 * 當前是否為持久顯示
 */
let isPersistent = false;

/**
 * 顯示 Toast 通知
 * @param {string} msg - 訊息內容
 * @param {string} type - 類型：'success' | 'error' | 'warning' | 'info'
 * @param {Object} [options] - 選項
 * @param {boolean} [options.persistent=false] - 是否持久顯示（需手動關閉）
 * @param {number} [options.duration=3000] - 自動消失時間（毫秒）
 */
export function showToast(msg, type = ToastType.INFO, options = {}) {
  const { persistent = false, duration = 3000 } = options;

  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  const toastIcon = toast.querySelector('.toast-icon');
  const closeBtn = toast.querySelector('.toast-close');

  // 清除之前的計時器
  if (currentToastTimer) {
    clearTimeout(currentToastTimer);
    currentToastTimer = null;
  }

  // 設定類型
  toast.className = 'toast ' + type;

  // 設定內容
  toastText.textContent = msg;
  toastIcon.textContent = ToastIcons[type] || ToastIcons.info;

  // 處理持久顯示
  isPersistent = persistent;
  if (closeBtn) {
    closeBtn.style.display = persistent ? 'flex' : 'none';
  }

  // 顯示 Toast
  toast.classList.add('show');

  // 自動消失（非持久模式）
  if (!persistent) {
    currentToastTimer = setTimeout(() => {
      hideToast();
    }, duration);
  }
}

/**
 * 隱藏 Toast 通知
 */
export function hideToast() {
  const toast = document.getElementById('toast');
  toast.classList.remove('show');
  isPersistent = false;

  if (currentToastTimer) {
    clearTimeout(currentToastTimer);
    currentToastTimer = null;
  }
}

/**
 * 顯示成功通知
 * @param {string} msg - 訊息內容
 * @param {Object} [options] - 選項
 */
export function showSuccess(msg, options = {}) {
  showToast(msg, ToastType.SUCCESS, options);
}

/**
 * 顯示錯誤通知
 * @param {string} msg - 訊息內容
 * @param {Object} [options] - 選項
 */
export function showError(msg, options = {}) {
  showToast(msg, ToastType.ERROR, options);
}

/**
 * 顯示警告通知
 * @param {string} msg - 訊息內容
 * @param {Object} [options] - 選項
 */
export function showWarning(msg, options = {}) {
  showToast(msg, ToastType.WARNING, options);
}

/**
 * 顯示資訊通知
 * @param {string} msg - 訊息內容
 * @param {Object} [options] - 選項
 */
export function showInfo(msg, options = {}) {
  showToast(msg, ToastType.INFO, options);
}

/**
 * 初始化 Toast 關閉按鈕事件
 */
export function initToast() {
  const toast = document.getElementById('toast');
  const closeBtn = toast?.querySelector('.toast-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideToast();
    });
  }
}
