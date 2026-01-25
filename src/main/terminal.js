/**
 * 終端啟動模組
 * 處理終端的動態啟動邏輯
 */
const { spawn } = require('child_process');
const { createLogger } = require('./logger');
const { getValidator } = require('./validators');
const { toWslPath, formatPath, parseCommand } = require('./utils/path-utils');

const logger = createLogger('Terminal');

/**
 * 錯誤類型常數
 */
const ErrorType = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  PATH_NOT_FOUND: 'PATH_NOT_FOUND',
  PATH_NOT_DIRECTORY: 'PATH_NOT_DIRECTORY',
  // Windows 專屬錯誤類型
  WINDOWS_TERMINAL_NOT_FOUND: 'WINDOWS_TERMINAL_NOT_FOUND',
  WSL_NOT_FOUND: 'WSL_NOT_FOUND',
  WSL_DISTRO_NOT_FOUND: 'WSL_DISTRO_NOT_FOUND',
  // 通用錯誤類型
  TERMINAL_NOT_FOUND: 'TERMINAL_NOT_FOUND',
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

// toWslPath, formatPath, parseCommand 已移至 utils/path-utils.js

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

  // Windows 專屬檢查
  if (process.platform === 'win32') {
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
  } else {
    // macOS / Linux：使用驗證器的終端類型檢測方法
    if (typeof validator.extractTerminalType === 'function') {
      const terminalType = validator.extractTerminalType(command);

      if (terminalType) {
        // 根據終端類型檢查是否已安裝
        const checkMethodMap = {
          // macOS 終端
          terminalApp: 'isTerminalAppInstalled',
          iterm2: 'isITerm2Installed',
          // Linux 終端
          gnomeTerminal: 'isGnomeTerminalInstalled',
          konsole: 'isKonsoleInstalled',
          xterm: 'isXtermInstalled',
          tilix: 'isTilixInstalled',
          terminator: 'isTerminatorInstalled',
          xfce4Terminal: 'isXfce4TerminalInstalled',
          // 共用終端
          alacritty: 'isAlacrittyInstalled',
          kitty: 'isKittyInstalled',
          hyper: 'isHyperInstalled',
          warp: 'isWarpInstalled',
        };

        const checkMethod = checkMethodMap[terminalType];
        if (checkMethod && typeof validator[checkMethod] === 'function') {
          if (!validator[checkMethod]()) {
            return {
              valid: false,
              errorType: ErrorType.TERMINAL_NOT_FOUND,
              errorDetail: terminal.name || terminalType,
            };
          }
        }
      }
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
 * 取得終端的安裝連結（macOS）
 * @param {string} terminalName - 終端名稱
 * @returns {Object|null} { type, labelKey, value } 或 null
 */
function getMacOSInstallAction(terminalName) {
  const lowerName = terminalName.toLowerCase();

  // 終端安裝連結對照表
  const installLinks = {
    iterm2: 'https://iterm2.com/',
    alacritty: 'https://alacritty.org/',
    kitty: 'https://sw.kovidgoyal.net/kitty/',
    hyper: 'https://hyper.is/',
    warp: 'https://www.warp.dev/',
  };

  for (const [key, url] of Object.entries(installLinks)) {
    if (lowerName.includes(key)) {
      return {
        type: 'url',
        labelKey: 'error.action.installFromWebsite',
        value: url,
      };
    }
  }

  return null;
}

/**
 * 取得終端的安裝指令提示（Linux）
 * @param {string} terminalName - 終端名稱
 * @returns {string|null} 安裝指令提示或 null
 */
function getLinuxInstallHint(terminalName) {
  const lowerName = terminalName.toLowerCase();

  // 終端安裝指令對照表（以 apt 為例）
  const installCommands = {
    'gnome-terminal': 'apt install gnome-terminal',
    gnometerminal: 'apt install gnome-terminal',
    konsole: 'apt install konsole',
    xterm: 'apt install xterm',
    alacritty: 'apt install alacritty',
    kitty: 'apt install kitty',
    tilix: 'apt install tilix',
    terminator: 'apt install terminator',
    'xfce4-terminal': 'apt install xfce4-terminal',
    xfce4terminal: 'apt install xfce4-terminal',
  };

  for (const [key, cmd] of Object.entries(installCommands)) {
    if (lowerName.includes(key)) {
      return cmd;
    }
  }

  return null;
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

  const platform = process.platform;

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

    case ErrorType.TERMINAL_NOT_FOUND:
      // 根據平台提供不同的行動建議
      if (platform === 'darwin') {
        // macOS: 提供官網下載連結
        const macAction = getMacOSInstallAction(errorDetail || '');
        if (macAction) {
          result.actions.push(macAction);
        }
      } else if (platform === 'linux') {
        // Linux: 提供套件管理器指令提示
        const installHint = getLinuxInstallHint(errorDetail || '');
        if (installHint) {
          result.installHint = installHint;
        }
      }
      // 都加上切換終端的選項
      result.actions.push({
        type: 'internal',
        labelKey: 'error.action.switchTerminal',
        value: 'open-terminal-settings',
      });
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
