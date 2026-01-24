/**
 * 終端啟動模組
 * 處理終端的動態啟動邏輯
 */
const { spawn } = require('child_process');

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
 * @param {string} path - 原始路徑
 * @param {string} pathFormat - 路徑格式 ('windows' | 'unix')
 * @returns {string} 格式化後的路徑
 */
function formatPath(path, pathFormat) {
  if (pathFormat === 'unix') {
    return toWslPath(path);
  }
  return path;
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
 * 開啟終端
 * @param {Object} dir - 目錄物件 { path }
 * @param {Object} terminal - 終端配置 { command, pathFormat }
 * @returns {Object} { success: boolean, error?: string }
 */
function openTerminal(dir, terminal) {
  if (!terminal || !terminal.command) {
    return { success: false, error: 'Invalid terminal config' };
  }

  // 根據路徑格式轉換路徑
  const formattedPath = formatPath(dir.path, terminal.pathFormat);

  // 替換 {path} 佔位符
  const commandWithPath = terminal.command.replace(/\{path\}/g, formattedPath);

  console.log('[Terminal] Execute:', commandWithPath);

  try {
    // 直接使用 shell 執行完整指令，避免解析引號問題
    spawn(commandWithPath, [], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
    return { success: true };
  } catch (err) {
    console.error('[Terminal] Failed to open:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  toWslPath,
  formatPath,
  parseCommand,
  openTerminal,
};
