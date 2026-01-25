/**
 * macOS 平台驗證器
 * 實作 macOS 專屬的終端驗證邏輯
 */
const fs = require('fs');
const { execSync } = require('child_process');
const { BaseValidator } = require('./base-validator');
const { createLogger } = require('../logger');

const logger = createLogger('MacOSValidator');

/**
 * macOS 平台驗證器
 */
class MacOSValidator extends BaseValidator {
  constructor() {
    super();
  }

  /**
   * 檢查指令是否存在
   * @param {string} cmd - 指令名稱
   * @returns {boolean}
   */
  commandExists(cmd) {
    const cacheKey = `cmd_exists_${cmd}`;
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
      this.setCache(cacheKey, true);
      return true;
    } catch {
      this.setCache(cacheKey, false);
      return false;
    }
  }

  /**
   * 檢查應用程式是否存在
   * @param {string} appPath - 應用程式路徑
   * @returns {boolean}
   */
  appExists(appPath) {
    const cacheKey = `app_exists_${appPath}`;
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const exists = fs.existsSync(appPath);
    this.setCache(cacheKey, exists);
    return exists;
  }

  /**
   * 檢測 Terminal.app 是否已安裝
   * @returns {boolean}
   */
  isTerminalAppInstalled() {
    return this.appExists('/Applications/Utilities/Terminal.app');
  }

  /**
   * 檢測 iTerm2 是否已安裝
   * @returns {boolean}
   */
  isITerm2Installed() {
    return this.appExists('/Applications/iTerm.app');
  }

  /**
   * 檢測 Alacritty 是否已安裝
   * @returns {boolean}
   */
  isAlacrittyInstalled() {
    return this.commandExists('alacritty') || this.appExists('/Applications/Alacritty.app');
  }

  /**
   * 檢測 Kitty 是否已安裝
   * @returns {boolean}
   */
  isKittyInstalled() {
    return this.commandExists('kitty') || this.appExists('/Applications/kitty.app');
  }

  /**
   * 檢測 Hyper 是否已安裝
   * @returns {boolean}
   */
  isHyperInstalled() {
    return this.appExists('/Applications/Hyper.app');
  }

  /**
   * 檢測 Warp 是否已安裝
   * @returns {boolean}
   */
  isWarpInstalled() {
    return this.appExists('/Applications/Warp.app');
  }

  // ===== Windows 相容方法（始終回傳 false/空值）=====

  /**
   * 檢測 Windows Terminal 是否已安裝（macOS 不適用）
   * @returns {boolean}
   */
  isWindowsTerminalInstalled() {
    return false;
  }

  /**
   * 檢測 WSL 是否已安裝（macOS 不適用）
   * @returns {boolean}
   */
  isWslInstalled() {
    return false;
  }

  /**
   * 取得已安裝的 WSL 發行版列表（macOS 不適用）
   * @returns {string[]}
   */
  getWslDistros() {
    return [];
  }

  /**
   * 檢測特定 WSL 發行版是否存在（macOS 不適用）
   * @param {string} distro - 發行版名稱
   * @returns {boolean}
   */
  isWslDistroInstalled(distro) {
    return false;
  }

  /**
   * 從指令中提取 WSL 發行版名稱（macOS 不適用）
   * @param {string} command - 終端指令
   * @returns {string|null}
   */
  extractWslDistro(command) {
    return null;
  }

  /**
   * 檢測指令是否使用 Windows Terminal（macOS 不適用）
   * @param {string} command - 終端指令
   * @returns {boolean}
   */
  usesWindowsTerminal(command) {
    return false;
  }

  /**
   * 檢測指令是否使用 WSL（macOS 不適用）
   * @param {string} command - 終端指令
   * @returns {boolean}
   */
  usesWsl(command) {
    return false;
  }

  // ===== macOS 專屬方法 =====

  /**
   * 從指令中提取終端類型
   * @param {string} command - 終端指令
   * @returns {string|null} 終端類型或 null
   */
  extractTerminalType(command) {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('terminal.app') || lowerCommand.includes('terminal')) {
      return 'terminalApp';
    }
    if (lowerCommand.includes('iterm')) {
      return 'iterm2';
    }
    if (lowerCommand.includes('alacritty')) {
      return 'alacritty';
    }
    if (lowerCommand.includes('kitty')) {
      return 'kitty';
    }
    if (lowerCommand.includes('hyper')) {
      return 'hyper';
    }
    if (lowerCommand.includes('warp')) {
      return 'warp';
    }

    return null;
  }

  /**
   * 驗證終端是否可用
   * @param {Object} terminal - 終端配置
   * @returns {Promise<Object>} { valid: boolean, errorType?: string, errorDetail?: string }
   */
  async validateTerminal(terminal) {
    const command = terminal.command;

    // 建立終端專屬的快取鍵
    const cacheKey = `terminal_${terminal.id || command}`;
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      logger.debug(`Using cached validation result for terminal: ${terminal.name || terminal.id}`);
      return cached;
    }

    let result = { valid: true };

    const terminalType = this.extractTerminalType(command);

    if (terminalType) {
      const checkMap = {
        terminalApp: () => this.isTerminalAppInstalled(),
        iterm2: () => this.isITerm2Installed(),
        alacritty: () => this.isAlacrittyInstalled(),
        kitty: () => this.isKittyInstalled(),
        hyper: () => this.isHyperInstalled(),
        warp: () => this.isWarpInstalled(),
      };

      const checkFn = checkMap[terminalType];
      if (checkFn && !checkFn()) {
        result = {
          valid: false,
          errorType: 'TERMINAL_NOT_FOUND',
          errorDetail: terminal.name || terminalType,
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 探測已安裝的終端
   * @returns {Object} 探測結果
   */
  detectInstalledTerminals() {
    const cacheKey = 'detected_terminals';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    logger.info('Detecting installed terminals...');

    const result = {
      terminalApp: this.isTerminalAppInstalled(),
      iterm2: this.isITerm2Installed(),
      alacritty: this.isAlacrittyInstalled(),
      kitty: this.isKittyInstalled(),
      hyper: this.isHyperInstalled(),
      warp: this.isWarpInstalled(),
    };

    logger.info('Terminal detection completed', result);
    this.setCache(cacheKey, result);
    return result;
  }
}

// 建立單例實例
const macosValidator = new MacOSValidator();

module.exports = {
  MacOSValidator,
  macosValidator,
};
