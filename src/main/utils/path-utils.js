/**
 * 路徑工具模組
 * 提供路徑轉換和命令解析的純函數
 * 此模組不依賴 Electron 或其他外部模組，便於單元測試
 */

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
 * 檢查路徑是否包含危險的 shell 元字符
 * 注意：此函數僅用於基本安全檢查，不能完全防止所有注入攻擊
 * @param {string} path - 要檢查的路徑
 * @returns {Object} { safe: boolean, reason?: string }
 */
function validatePathSafety(path) {
  if (!path || typeof path !== 'string') {
    return { safe: false, reason: 'INVALID_PATH' };
  }

  // 危險的 shell 元字符模式
  // 注意：不包含 & 因為 Windows 文件名可能包含 &
  // 注意：檢查順序很重要，更具體的模式應該在前面
  const dangerousPatterns = [
    { pattern: /\$\(/, reason: 'COMMAND_SUBSTITUTION' }, // $(cmd) - 要在 $ 之前檢查
    { pattern: /[;|`$]/, reason: 'SHELL_METACHAR' }, // 命令分隔/管道/反引號/$
    { pattern: />>|>|</, reason: 'REDIRECTION' }, // 重導向
    { pattern: /\n|\r/, reason: 'NEWLINE' }, // 換行符
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(path)) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}

/**
 * 對路徑進行轉義，使其可以安全地用於 shell 命令
 * @param {string} path - 要轉義的路徑
 * @param {string} format - 路徑格式 ('windows' | 'unix')
 * @returns {string} 轉義後的路徑（已包含引號）
 */
function escapePathForShell(path, format) {
  // 在 Windows 平台上，即使是 WSL 路徑，命令也是在 Windows shell 中執行的
  // 因此必須使用雙引號（Windows shell 不支援單引號作為字串定界符）
  if (process.platform === 'win32') {
    // Windows: 使用雙引號，並轉義內部的雙引號
    return '"' + path.replace(/"/g, '""') + '"';
  } else if (format === 'unix') {
    // Unix/Linux/macOS: 使用單引號，並轉義內部的單引號
    // 'path' -> 'path'
    // path's -> 'path'\''s'
    return "'" + path.replace(/'/g, "'\\''") + "'";
  } else {
    // 其他情況: 使用雙引號
    return '"' + path.replace(/"/g, '""') + '"';
  }
}

module.exports = {
  toWslPath,
  formatPath,
  validatePathSafety,
  escapePathForShell,
};
