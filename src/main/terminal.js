/**
 * 終端啟動模組
 * 處理 Windows Terminal 的啟動邏輯
 */
const { spawn } = require('child_process');

/**
 * Windows 路徑轉 WSL 路徑
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
 * 開啟 Windows Terminal
 * @param {Object} dir - 目錄物件 { path, type }
 * @returns {Object} { success: boolean, error?: string }
 */
function openTerminal(dir) {
  let args = [];

  if (dir.type === 'wsl') {
    const wslPath = toWslPath(dir.path);
    // WSL: 使用 wsl.exe 並透過 --cd 進入目錄
    args = ['wt.exe', '-w', '0', 'new-tab', 'wsl.exe', '-d', 'Ubuntu', '--cd', wslPath];
  } else {
    // PowerShell: 使用正確的 profile 名稱
    args = ['wt.exe', '-w', '0', 'new-tab', '-p', 'Windows PowerShell', '-d', dir.path];
  }

  try {
    spawn(args[0], args.slice(1), {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
    return { success: true };
  } catch (err) {
    console.error('開啟終端失敗:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  toWslPath,
  openTerminal,
};
