/**
 * 終端啟動模組
 * 處理終端的動態啟動邏輯
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

const logger = createLogger('Terminal');

/**
 * 錯誤類型常數
 */
const ErrorType = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  PATH_NOT_FOUND: 'PATH_NOT_FOUND',
  PATH_NOT_DIRECTORY: 'PATH_NOT_DIRECTORY',
  WINDOWS_TERMINAL_NOT_FOUND: 'WINDOWS_TERMINAL_NOT_FOUND',
  WSL_NOT_FOUND: 'WSL_NOT_FOUND',
  WSL_DISTRO_NOT_FOUND: 'WSL_DISTRO_NOT_FOUND',
  SPAWN_FAILED: 'SPAWN_FAILED',
};

/**
 * 檢測 Windows Terminal 是否已安裝
 * @returns {boolean}
 */
function isWindowsTerminalInstalled() {
  try {
    // 嘗試執行 where wt.exe
    execSync('where wt.exe', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 檢測 WSL 是否已安裝
 * @returns {boolean}
 */
function isWslInstalled() {
  try {
    // 嘗試執行 wsl --status
    execSync('wsl --status', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 取得已安裝的 WSL 發行版列表
 * @returns {string[]}
 */
function getWslDistros() {
  try {
    const output = execSync('wsl -l -q', { encoding: 'utf-8' });
    // 移除 BOM 和空白字元，分割為陣列
    return output
      .replace(/\0/g, '') // 移除 null 字元
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * 檢測特定 WSL 發行版是否存在
 * @param {string} distro - 發行版名稱
 * @returns {boolean}
 */
function isWslDistroInstalled(distro) {
  const distros = getWslDistros();
  return distros.some(d => d.toLowerCase() === distro.toLowerCase());
}

/**
 * 從指令中提取 WSL 發行版名稱
 * @param {string} command - 終端指令
 * @returns {string|null} 發行版名稱或 null
 */
function extractWslDistro(command) {
  // 匹配 wsl.exe -d <distro> 或 wsl -d <distro>
  const match = command.match(/wsl(?:\.exe)?\s+-d\s+([^\s]+)/i);
  return match ? match[1] : null;
}

/**
 * 檢測指令是否使用 Windows Terminal
 * @param {string} command - 終端指令
 * @returns {boolean}
 */
function usesWindowsTerminal(command) {
  return /wt(?:\.exe)?[\s"]/i.test(command);
}

/**
 * 檢測指令是否使用 WSL
 * @param {string} command - 終端指令
 * @returns {boolean}
 */
function usesWsl(command) {
  return /wsl(?:\.exe)?/i.test(command);
}

/**
 * Windows 路徑轉 WSL 路徑 (/mnt/c/...)
 * @param {string} winPath - Windows 路徑
 * @returns {string} WSL 路徑
 */
function toWslPath(winPath) {
  const match = winPath.match(/^([A-Za-z]):\\(.*)$/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, '/');
    return `/mnt/${drive}/${rest}`;
  }
  return winPath.replace(/\\/g, '/');
}

/**
 * 格式化路徑
 * @param {string} dirPath - 原始路徑
 * @param {string} pathFormat - 路徑格式 ('windows' | 'unix')
 * @returns {string} 格式化後的路徑
 */
function formatPath(dirPath, pathFormat) {
  if (pathFormat === 'unix') {
    return toWslPath(dirPath);
  }
  return dirPath;
}

/**
 * 解析指令字串
 * 處理引號內的空格，將指令分割為陣列
 * @param {string} command - 指令字串
 * @returns {string[]} 指令參數陣列
 */
function parseCommand(command) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      // 開始引號
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      // 結束引號
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      // 空格分隔（非引號內）
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  // 處理最後一個參數
  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

/**
 * 驗證終端啟動前置條件
 * @param {Object} dir - 目錄物件 { path }
 * @param {Object} terminal - 終端配置 { command, pathFormat }
 * @returns {Object} { valid: boolean, errorType?: string, errorDetail?: string }
 */
function validatePrerequisites(dir, terminal) {
  // 1. 檢查配置有效性
  if (!terminal || !terminal.command) {
    return {
      valid: false,
      errorType: ErrorType.INVALID_CONFIG,
      errorDetail: 'terminal.command',
    };
  }

  // 2. 檢查路徑是否存在
  if (!fs.existsSync(dir.path)) {
    return {
      valid: false,
      errorType: ErrorType.PATH_NOT_FOUND,
      errorDetail: dir.path,
    };
  }

  // 3. 檢查路徑是否為目錄
  try {
    const stat = fs.statSync(dir.path);
    if (!stat.isDirectory()) {
      return {
        valid: false,
        errorType: ErrorType.PATH_NOT_DIRECTORY,
        errorDetail: dir.path,
      };
    }
  } catch (err) {
    return {
      valid: false,
      errorType: ErrorType.PATH_NOT_FOUND,
      errorDetail: dir.path,
    };
  }

  const command = terminal.command;

  // 4. 檢查 Windows Terminal（如果指令需要）
  if (usesWindowsTerminal(command)) {
    if (!isWindowsTerminalInstalled()) {
      return {
        valid: false,
        errorType: ErrorType.WINDOWS_TERMINAL_NOT_FOUND,
        errorDetail: null,
      };
    }
  }

  // 5. 檢查 WSL（如果指令需要）
  if (usesWsl(command)) {
    if (!isWslInstalled()) {
      return {
        valid: false,
        errorType: ErrorType.WSL_NOT_FOUND,
        errorDetail: null,
      };
    }

    // 6. 檢查特定發行版
    const distro = extractWslDistro(command);
    if (distro && !isWslDistroInstalled(distro)) {
      return {
        valid: false,
        errorType: ErrorType.WSL_DISTRO_NOT_FOUND,
        errorDetail: distro,
      };
    }
  }

  return { valid: true };
}

/**
 * 開啟終端
 * @param {Object} dir - 目錄物件 { path }
 * @param {Object} terminal - 終端配置 { command, pathFormat }
 * @returns {Object} { success: boolean, errorType?: string, errorDetail?: string, error?: string }
 */
function openTerminal(dir, terminal) {
  // 驗證前置條件
  const validation = validatePrerequisites(dir, terminal);
  if (!validation.valid) {
    logger.warn('Prerequisites check failed', {
      errorType: validation.errorType,
      errorDetail: validation.errorDetail,
    });
    return {
      success: false,
      errorType: validation.errorType,
      errorDetail: validation.errorDetail,
    };
  }

  // 根據路徑格式轉換路徑
  const formattedPath = formatPath(dir.path, terminal.pathFormat);

  // 替換 {path} 佔位符
  const commandWithPath = terminal.command.replace(/\{path\}/g, formattedPath);

  logger.debug('Execute terminal command', commandWithPath);

  try {
    // 直接使用 shell 執行完整指令，避免解析引號問題
    spawn(commandWithPath, [], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
    return { success: true };
  } catch (err) {
    logger.error('Failed to spawn terminal', err);
    return {
      success: false,
      errorType: ErrorType.SPAWN_FAILED,
      error: err.message,
    };
  }
}

module.exports = {
  toWslPath,
  formatPath,
  parseCommand,
  openTerminal,
  validatePrerequisites,
  isWindowsTerminalInstalled,
  isWslInstalled,
  isWslDistroInstalled,
  getWslDistros,
  ErrorType,
};
