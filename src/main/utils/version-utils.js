/**
 * 版本比較工具
 * 純函數，不依賴 Electron
 */

/**
 * 比較語意化版本
 * @param {string} current - 當前版本 (e.g., "2.3.0")
 * @param {string} latest - 最新版本 (e.g., "2.4.0")
 * @returns {boolean} 最新版本是否大於當前版本
 */
function isNewerVersion(current, latest) {
  const currentParts = current.replace(/^v/, '').split('.').map(Number);
  const latestParts = latest.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

module.exports = {
  isNewerVersion,
};
