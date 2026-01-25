/**
 * HTML 轉義工具模組
 * 防止 XSS 攻擊
 */

/**
 * HTML 轉義
 * 將特殊字符轉換為 HTML 實體，防止 XSS 攻擊
 * @param {string} text - 原始文字
 * @returns {string} 轉義後的文字
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const str = String(text);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 轉義 HTML 屬性值
 * 用於安全地插入 HTML 屬性
 * @param {string} text - 原始文字
 * @returns {string} 轉義後的文字
 */
export function escapeAttr(text) {
  if (text === null || text === undefined) {
    return '';
  }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
