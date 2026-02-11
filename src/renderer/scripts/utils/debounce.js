/**
 * 防抖工具
 * 延遲執行函數，在指定時間內若再次被呼叫則重新計時
 * @param {Function} fn - 要防抖的函數
 * @param {number} delay - 延遲時間（毫秒）
 * @returns {Function} 防抖後的函數
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
