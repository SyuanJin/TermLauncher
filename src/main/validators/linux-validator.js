/**
 * Linux 平台驗證器
 * 實作 Linux 專屬的終端驗證邏輯
 */
const { execSync } = require('child_process');
const { BaseValidator } = require('./base-validator');
const { createLogger } = require('../logger');

const logger = createLogger('LinuxValidator');

/**
 * Linux 平台驗證器
 */
class LinuxValidator extends BaseValidator {
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
   * 檢測 gnome-terminal 是否已安裝
   * @returns {boolean}
   */
  isGnomeTerminalInstalled() {
    return this.commandExists('gnome-terminal');
  }

  /**
   * 檢測 konsole 是否已安裝
   * @returns {boolean}
   */
  isKonsoleInstalled() {
    return this.commandExists('konsole');
  }

  /**
   * 檢測 xterm 是否已安裝
   * @returns {boolean}
   */
  isXtermInstalled() {
    return this.commandExists('xterm');
  }

  /**
   * 檢測 Alacritty 是否已安裝
   * @returns {boolean}
   */
  isAlacrittyInstalled() {
    return this.commandExists('alacritty');
  }

  /**
   * 檢測 Kitty 是否已安裝
   * @returns {boolean}
   */
  isKittyInstalled() {
    return this.commandExists('kitty');
  }

  /**
   * 檢測 Tilix 是否已安裝
   * @returns {boolean}
   */
  isTilixInstalled() {
    return this.commandExists('tilix');
  }

  /**
   * 檢測 Terminator 是否已安裝
   * @returns {boolean}
   */
  isTerminatorInstalled() {
    return this.commandExists('terminator');
  }

  /**
   * 檢測 xfce4-terminal 是否已安裝
   * @returns {boolean}
   */
  isXfce4TerminalInstalled() {
    return this.commandExists('xfce4-terminal');
  }

  // ===== Linux 專屬方法 =====

  /**
   * 從指令中提取終端類型
   * @param {string} command - 終端指令
   * @returns {string|null} 終端類型或 null
   */
  extractTerminalType(command) {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('gnome-terminal')) {
      return 'gnomeTerminal';
    }
    if (lowerCommand.includes('konsole')) {
      return 'konsole';
    }
    if (lowerCommand.includes('xfce4-terminal')) {
      return 'xfce4Terminal';
    }
    if (lowerCommand.includes('xterm')) {
      return 'xterm';
    }
    if (lowerCommand.includes('alacritty')) {
      return 'alacritty';
    }
    if (lowerCommand.includes('kitty')) {
      return 'kitty';
    }
    if (lowerCommand.includes('tilix')) {
      return 'tilix';
    }
    if (lowerCommand.includes('terminator')) {
      return 'terminator';
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
        gnomeTerminal: () => this.isGnomeTerminalInstalled(),
        konsole: () => this.isKonsoleInstalled(),
        xterm: () => this.isXtermInstalled(),
        alacritty: () => this.isAlacrittyInstalled(),
        kitty: () => this.isKittyInstalled(),
        tilix: () => this.isTilixInstalled(),
        terminator: () => this.isTerminatorInstalled(),
        xfce4Terminal: () => this.isXfce4TerminalInstalled(),
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
      gnomeTerminal: this.isGnomeTerminalInstalled(),
      konsole: this.isKonsoleInstalled(),
      xterm: this.isXtermInstalled(),
      alacritty: this.isAlacrittyInstalled(),
      kitty: this.isKittyInstalled(),
      tilix: this.isTilixInstalled(),
      terminator: this.isTerminatorInstalled(),
      xfce4Terminal: this.isXfce4TerminalInstalled(),
    };

    logger.info('Terminal detection completed', result);
    this.setCache(cacheKey, result);
    return result;
  }
}

// 建立單例實例
const linuxValidator = new LinuxValidator();

module.exports = {
  LinuxValidator,
  linuxValidator,
};
