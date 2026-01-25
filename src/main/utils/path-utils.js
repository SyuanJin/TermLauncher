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

module.exports = {
  toWslPath,
  formatPath,
  parseCommand,
};
