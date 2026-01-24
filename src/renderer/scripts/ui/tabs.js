/**
 * 分頁切換模組
 * 處理分頁標籤的切換邏輯
 */

/**
 * 設定分頁切換事件監聽
 */
export function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // 移除所有 active 狀態
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // 設定當前分頁為 active
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
    });
  });
}
