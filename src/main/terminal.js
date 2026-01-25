/**
 * 終端啟動模組
 * 處理終端的動態啟動邏輯
 */
const { spawn } = require('child_process');
const { createLogger } = require('./logger');
const { getValidator } = require('./validators');

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

// 取得驗證器實例
const validator = getValidator();

/**
 * 檢測 Windows Terminal 是否已安裝
 * @returns {boolean}
 */
function isWindowsTerminalInstalled() {
  return validator.isWindowsTerminalInstalled();
}

/**
 * 檢測 WSL 是否已安裝
 * @returns {boolean}
 */
function isWslInstalled() {
  return validator.isWslInstalled();
}

/**
 * 取得已安裝的 WSL 發行版列表
 * @returns {string[]}
 */
function getWslDistros() {
  return validator.getWslDistros();
}

/**
 * 檢測特定 WSL 發行版是否存在
 * @param {string} distro - 發行版名稱
 * @returns {boolean}
 */
function isWslDistroInstalled(distro) {
  return validator.isWslDistroInstalled(distro);
}

/**
 * 從指令中提取 WSL 發行版名稱
 * @param {string} command - 終端指令
 * @returns {string|null} 發行版名稱或 null
 */
function extractWslDistro(command) {
  return validator.extractWslDistro(command);
}

/**
 * 檢測指令是否使用 Windows Terminal
 * @param {string} command - 終端指令
 * @returns {boolean}
 */
function usesWindowsTerminal(command) {
  return validator.usesWindowsTerminal(command);
}

/**
 * 檢測指令是否使用 WSL
 * @param {string} command - 終端指令
 * @returns {boolean}
 */
function usesWsl(command) {
  return validator.usesWsl(command);
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
 * 驗證終端啟動前置條件（同步版本，保持向後相容）
 * @param {Object} dir - 目錄物件 { path }
 * @param {Object} terminal - 終端配置 { command, pathFormat }
 * @returns {Object} { valid: boolean, errorType?: string, errorDetail?: string }
 */
function validatePrerequisites(dir, terminal) {
  // 使用驗證器進行驗證
  // 1. 檢查配置有效性
  const configResult = validator.validateConfig(terminal);
  if (!configResult.valid) {
    return configResult;
  }

  // 2. 檢查路徑
  const pathResult = validator.validatePath(dir.path);
  if (!pathResult.valid) {
    return pathResult;
  }

  // 3. 檢查終端相關依賴（使用快取）
  const command = terminal.command;

  // 檢查 Windows Terminal
  if (usesWindowsTerminal(command)) {
    if (!isWindowsTerminalInstalled()) {
      return {
        valid: false,
        errorType: ErrorType.WINDOWS_TERMINAL_NOT_FOUND,
        errorDetail: null,
      };
    }
  }

  // 檢查 WSL
  if (usesWsl(command)) {
    if (!isWslInstalled()) {
      return {
        valid: false,
        errorType: ErrorType.WSL_NOT_FOUND,
        errorDetail: null,
      };
    }

    // 檢查特定發行版
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
 * 探測已安裝的終端
 * @returns {Object} 探測結果
 */
function detectInstalledTerminals() {
  return validator.detectInstalledTerminals();
}

/**
 * 清除驗證器快取
 */
function invalidateValidatorCache() {
  validator.invalidateCache();
}

/**
 * 建立帶有行動按鈕的錯誤結果
 * @param {string} errorType - 錯誤類型
 * @param {string|null} errorDetail - 錯誤詳情
 * @returns {Object} 錯誤結果物件
 */
function createErrorResult(errorType, errorDetail) {
  const result = {
    success: false,
    errorType,
    errorDetail,
    actions: [],
  };

  // 根據錯誤類型設定對應的行動
  switch (errorType) {
    case ErrorType.WINDOWS_TERMINAL_NOT_FOUND:
      result.actions = [
        {
          type: 'url',
          labelKey: 'error.action.installWindowsTerminal',
          value: 'ms-windows-store://pdp/?productid=9N0DX20HK701',
        },
        {
          type: 'internal',
          labelKey: 'error.action.switchTerminal',
          value: 'open-terminal-settings',
        },
      ];
      break;

    case ErrorType.WSL_NOT_FOUND:
      result.actions = [
        {
          type: 'url',
          labelKey: 'error.action.installWsl',
          value: 'https://docs.microsoft.com/windows/wsl/install',
        },
        {
          type: 'internal',
          labelKey: 'error.action.switchTerminal',
          value: 'open-terminal-settings',
        },
      ];
      break;

    case ErrorType.WSL_DISTRO_NOT_FOUND:
      result.actions = [
        {
          type: 'url',
          labelKey: 'error.action.installDistro',
          value: 'ms-windows-store://search/?query=wsl',
        },
        {
          type: 'internal',
          labelKey: 'error.action.switchTerminal',
          value: 'open-terminal-settings',
        },
      ];
      break;

    case ErrorType.PATH_NOT_FOUND:
    case ErrorType.PATH_NOT_DIRECTORY:
      result.actions = [
        {
          type: 'internal',
          labelKey: 'error.action.editDirectory',
          value: 'edit-directory',
        },
      ];
      break;

    default:
      break;
  }

  return result;
}

/**
 * 預覽將要執行的終端命令
 * @param {Object} dir - 目錄物件 { path }
 * @param {Object} terminal - 終端配置 { command, pathFormat }
 * @returns {Object} { success: boolean, command?: string, formattedPath?: string, errorType?: string }
 */
function previewCommand(dir, terminal) {
  // 驗證配置
  const configResult = validator.validateConfig(terminal);
  if (!configResult.valid) {
    return {
      success: false,
      errorType: configResult.errorType,
      errorDetail: configResult.errorDetail,
    };
  }

  // 格式化路徑
  const formattedPath = formatPath(dir.path, terminal.pathFormat);

  // 替換佔位符
  const command = terminal.command.replace(/\{path\}/g, formattedPath);

  return {
    success: true,
    command,
    formattedPath,
    originalPath: dir.path,
    terminalName: terminal.name,
    pathFormat: terminal.pathFormat,
  };
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
    return createErrorResult(validation.errorType, validation.errorDetail);
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
  previewCommand,
  validatePrerequisites,
  isWindowsTerminalInstalled,
  isWslInstalled,
  isWslDistroInstalled,
  getWslDistros,
  detectInstalledTerminals,
  invalidateValidatorCache,
  ErrorType,
};
