/**
 * 驗證器模組導出
 */
const { BaseValidator } = require('./base-validator');
const { WindowsValidator, windowsValidator } = require('./windows-validator');
const { MacOSValidator, macosValidator } = require('./macos-validator');
const { LinuxValidator, linuxValidator } = require('./linux-validator');

/**
 * 取得當前平台的驗證器實例
 * @returns {BaseValidator} 驗證器實例
 */
function getValidator() {
  switch (process.platform) {
    case 'win32':
      return windowsValidator;
    case 'darwin':
      return macosValidator;
    case 'linux':
      return linuxValidator;
    default:
      // 預設使用 Linux 驗證器，因其使用通用的 which 命令
      return linuxValidator;
  }
}

/**
 * 取得當前平台名稱
 * @returns {string} 平台名稱
 */
function getPlatformName() {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return process.platform;
  }
}

module.exports = {
  BaseValidator,
  WindowsValidator,
  windowsValidator,
  MacOSValidator,
  macosValidator,
  LinuxValidator,
  linuxValidator,
  getValidator,
  getPlatformName,
};
