/**
 * 日誌記錄模組
 * 開發模式：輸出到 console
 * 正式版：寫入 %APPDATA%/termlauncher/logs/
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// 日誌目錄
const logsDir = path.join(app.getPath('userData'), 'logs');

// 判斷是否為開發模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 日誌級別
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 當前日誌級別（開發模式顯示所有，正式版只顯示 INFO 以上）
const currentLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;

// 保留日誌天數
const LOG_RETENTION_DAYS = 7;

// 敏感資訊過濾設定
const SENSITIVE_PATTERNS = [
  // Windows 使用者路徑
  { pattern: /C:\\Users\\[^\\]+/gi, replacement: 'C:\\Users\\[USER]' },
  { pattern: /\/Users\/[^/]+/gi, replacement: '/Users/[USER]' },
  // Linux 家目錄
  { pattern: /\/home\/[^/]+/gi, replacement: '/home/[USER]' },
  // 環境變數格式的敏感值
  {
    pattern: /(?:password|secret|token|key|credential)s?\s*[=:]\s*\S+/gi,
    replacement: '[REDACTED]',
  },
  // Email 地址
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
];

/**
 * 過濾敏感資訊
 * @param {string} text - 原始文字
 * @returns {string} 過濾後的文字
 */
function filterSensitiveInfo(text) {
  if (typeof text !== 'string') return text;

  let filtered = text;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    filtered = filtered.replace(pattern, replacement);
  }
  return filtered;
}

/**
 * 遞迴過濾物件中的敏感資訊
 * @param {*} data - 原始資料
 * @returns {*} 過濾後的資料
 */
function filterSensitiveData(data) {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return filterSensitiveInfo(data);
  }

  if (data instanceof Error) {
    const filtered = new Error(filterSensitiveInfo(data.message));
    filtered.stack = filterSensitiveInfo(data.stack);
    return filtered;
  }

  if (Array.isArray(data)) {
    return data.map(filterSensitiveData);
  }

  if (typeof data === 'object') {
    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
      // 對於明顯敏感的欄位，直接遮蔽
      if (/password|secret|token|key|credential/i.test(key)) {
        filtered[key] = '[REDACTED]';
      } else {
        filtered[key] = filterSensitiveData(value);
      }
    }
    return filtered;
  }

  return data;
}

/**
 * 確保日誌目錄存在
 */
function ensureLogDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * 取得當前日期字串 (YYYY-MM-DD)
 * @returns {string}
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 取得當前時間字串 (HH:mm:ss.SSS)
 * @returns {string}
 */
function getTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * 取得日誌檔路徑
 * @returns {string}
 */
function getLogFilePath() {
  return path.join(logsDir, `termlauncher-${getDateString()}.log`);
}

/**
 * 清理過期日誌
 */
function cleanOldLogs() {
  try {
    ensureLogDir();
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      if (!file.endsWith('.log')) return;

      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);
      const age = now - stat.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (err) {
    // 清理失敗不影響程式運行
    console.error('[Logger] Failed to clean old logs:', err);
  }
}

/**
 * 寫入日誌到檔案
 * @param {string} level - 日誌級別
 * @param {string} module - 模組名稱
 * @param {string} message - 日誌訊息
 * @param {any} [data] - 額外資料
 */
function writeToFile(level, module, message, data) {
  try {
    ensureLogDir();
    const timestamp = `${getDateString()} ${getTimeString()}`;
    // 過濾敏感資訊
    const filteredMessage = filterSensitiveInfo(message);
    let logLine = `[${timestamp}] [${level}] [${module}] ${filteredMessage}`;

    if (data !== undefined) {
      const filteredData = filterSensitiveData(data);
      if (filteredData instanceof Error) {
        logLine += `\n  Error: ${filteredData.message}\n  Stack: ${filteredData.stack}`;
      } else if (typeof filteredData === 'object') {
        logLine += `\n  Data: ${JSON.stringify(filteredData, null, 2)}`;
      } else {
        logLine += ` | ${filteredData}`;
      }
    }

    logLine += '\n';

    fs.appendFileSync(getLogFilePath(), logLine, 'utf-8');
  } catch (err) {
    // 寫入失敗時輸出到 console
    console.error('[Logger] Failed to write log:', err);
  }
}

/**
 * 輸出到 console
 * @param {string} level - 日誌級別
 * @param {string} module - 模組名稱
 * @param {string} message - 日誌訊息
 * @param {any} [data] - 額外資料
 */
function writeToConsole(level, module, message, data) {
  const prefix = `[${module}]`;

  switch (level) {
    case 'DEBUG':
      if (data !== undefined) {
        console.debug(prefix, message, data);
      } else {
        console.debug(prefix, message);
      }
      break;
    case 'INFO':
      if (data !== undefined) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
      break;
    case 'WARN':
      if (data !== undefined) {
        console.warn(prefix, message, data);
      } else {
        console.warn(prefix, message);
      }
      break;
    case 'ERROR':
      if (data !== undefined) {
        console.error(prefix, message, data);
      } else {
        console.error(prefix, message);
      }
      break;
  }
}

/**
 * 記錄日誌
 * @param {number} level - 日誌級別
 * @param {string} levelName - 級別名稱
 * @param {string} module - 模組名稱
 * @param {string} message - 日誌訊息
 * @param {any} [data] - 額外資料
 */
function log(level, levelName, module, message, data) {
  if (level < currentLevel) return;

  // 開發模式：輸出到 console
  if (isDev) {
    writeToConsole(levelName, module, message, data);
  }

  // 正式版：寫入檔案
  if (!isDev) {
    writeToFile(levelName, module, message, data);
  }
}

/**
 * 建立特定模組的 logger
 * @param {string} moduleName - 模組名稱
 * @returns {Object} logger 物件
 */
function createLogger(moduleName) {
  return {
    debug: (message, data) => log(LogLevel.DEBUG, 'DEBUG', moduleName, message, data),
    info: (message, data) => log(LogLevel.INFO, 'INFO', moduleName, message, data),
    warn: (message, data) => log(LogLevel.WARN, 'WARN', moduleName, message, data),
    error: (message, data) => log(LogLevel.ERROR, 'ERROR', moduleName, message, data),
  };
}

// 應用啟動時清理過期日誌
if (!isDev) {
  cleanOldLogs();
}

module.exports = {
  createLogger,
  cleanOldLogs,
  LogLevel,
  isDev,
  logsDir,
};
