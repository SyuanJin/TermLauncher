/**
 * Windows 平台驗證器
 * 實作 Windows 專屬的終端驗證邏輯
 */
const { execSync } = require('child_process');
const { BaseValidator } = require('./base-validator');
const { createLogger } = require('../logger');

const logger = createLogger('WindowsValidator');

/**
 * Windows 平台驗證器
 */
class WindowsValidator extends BaseValidator {
  constructor() {
    super();
  }

  /**
   * 檢測 Windows Terminal 是否已安裝
   * @returns {boolean}
   */
  isWindowsTerminalInstalled() {
    const cacheKey = 'wt_installed';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      execSync('where wt.exe', { stdio: 'ignore' });
      this.setCache(cacheKey, true);
      return true;
    } catch {
      this.setCache(cacheKey, false);
      return false;
    }
  }

  /**
   * 檢測 WSL 是否已安裝
   * @returns {boolean}
   */
  isWslInstalled() {
    const cacheKey = 'wsl_installed';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      execSync('wsl --status', { stdio: 'ignore' });
      this.setCache(cacheKey, true);
      return true;
    } catch {
      this.setCache(cacheKey, false);
      return false;
    }
  }

  /**
   * 取得已安裝的 WSL 發行版列表
   * @returns {string[]}
   */
  getWslDistros() {
    const cacheKey = 'wsl_distros';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const output = execSync('wsl -l -q', { encoding: 'utf-8' });
      const distros = output
        .replace(/\0/g, '') // 移除 null 字元
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      this.setCache(cacheKey, distros);
      return distros;
    } catch {
      this.setCache(cacheKey, []);
      return [];
    }
  }

  /**
   * 檢測特定 WSL 發行版是否存在
   * @param {string} distro - 發行版名稱
   * @returns {boolean}
   */
  isWslDistroInstalled(distro) {
    const distros = this.getWslDistros();
    return distros.some(d => d.toLowerCase() === distro.toLowerCase());
  }

  /**
   * 檢測 Git Bash 是否已安裝
   * @returns {boolean}
   */
  isGitBashInstalled() {
    const cacheKey = 'git_bash_installed';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const fs = require('fs');
    const paths = [
      'C:\\Program Files\\Git\\git-bash.exe',
      'C:\\Program Files (x86)\\Git\\git-bash.exe',
    ];

    const installed = paths.some(p => fs.existsSync(p));
    this.setCache(cacheKey, installed);
    return installed;
  }

  /**
   * 檢測 PowerShell 是否可用
   * @returns {boolean}
   */
  isPowerShellAvailable() {
    const cacheKey = 'powershell_available';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      execSync('where powershell.exe', { stdio: 'ignore' });
      this.setCache(cacheKey, true);
      return true;
    } catch {
      this.setCache(cacheKey, false);
      return false;
    }
  }

  /**
   * 檢測 CMD 是否可用
   * @returns {boolean}
   */
  isCmdAvailable() {
    const cacheKey = 'cmd_available';
    const cached = this.getCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      execSync('where cmd.exe', { stdio: 'ignore' });
      this.setCache(cacheKey, true);
      return true;
    } catch {
      this.setCache(cacheKey, false);
      return false;
    }
  }

  /**
   * 從指令中提取 WSL 發行版名稱
   * @param {string} command - 終端指令
   * @returns {string|null} 發行版名稱或 null
   */
  extractWslDistro(command) {
    const match = command.match(/wsl(?:\.exe)?\s+-d\s+([^\s]+)/i);
    return match ? match[1] : null;
  }

  /**
   * 檢測指令是否使用 Windows Terminal
   * @param {string} command - 終端指令
   * @returns {boolean}
   */
  usesWindowsTerminal(command) {
    return /wt(?:\.exe)?[\s"]/i.test(command);
  }

  /**
   * 檢測指令是否使用 WSL
   * @param {string} command - 終端指令
   * @returns {boolean}
   */
  usesWsl(command) {
    return /wsl(?:\.exe)?/i.test(command);
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

    // 檢查 Windows Terminal
    if (this.usesWindowsTerminal(command)) {
      if (!this.isWindowsTerminalInstalled()) {
        result = {
          valid: false,
          errorType: 'WINDOWS_TERMINAL_NOT_FOUND',
          errorDetail: null,
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    // 檢查 WSL
    if (this.usesWsl(command)) {
      if (!this.isWslInstalled()) {
        result = {
          valid: false,
          errorType: 'WSL_NOT_FOUND',
          errorDetail: null,
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // 檢查特定發行版
      const distro = this.extractWslDistro(command);
      if (distro && !this.isWslDistroInstalled(distro)) {
        result = {
          valid: false,
          errorType: 'WSL_DISTRO_NOT_FOUND',
          errorDetail: distro,
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
      windowsTerminal: this.isWindowsTerminalInstalled(),
      wsl: this.isWslInstalled(),
      wslDistros: this.getWslDistros(),
      gitBash: this.isGitBashInstalled(),
      powerShell: this.isPowerShellAvailable(),
      cmd: this.isCmdAvailable(),
    };

    logger.info('Terminal detection completed', result);
    this.setCache(cacheKey, result);
    return result;
  }
}

// 建立單例實例
const windowsValidator = new WindowsValidator();

module.exports = {
  WindowsValidator,
  windowsValidator,
};
