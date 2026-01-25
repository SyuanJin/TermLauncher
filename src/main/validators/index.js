/**
 * 驗證器模組導出
 */
const { BaseValidator } = require('./base-validator');
const { WindowsValidator, windowsValidator } = require('./windows-validator');

/**
 * 取得當前平台的驗證器實例
 * @returns {BaseValidator} 驗證器實例
 */
function getValidator() {
  // 目前只支援 Windows
  // 未來可根據 process.platform 返回不同的驗證器
  return windowsValidator;
}

module.exports = {
  BaseValidator,
  WindowsValidator,
  windowsValidator,
  getValidator,
};
