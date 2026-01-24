/**
 * Toast 通知模組
 * 顯示操作結果的通知提示
 */

/**
 * 顯示 Toast 通知
 * @param {string} msg - 訊息內容
 * @param {string} type - 類型：'success' 或 'error'
 */
export function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.className = 'toast ' + type;
  document.getElementById('toastText').textContent = msg;
  toast.querySelector('.toast-icon').textContent = type === 'success' ? '✓' : '✕';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
