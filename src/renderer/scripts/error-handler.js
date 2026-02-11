/**
 * 全域錯誤處理模組
 * 攔截前端錯誤並記錄到日誌檔案
 */

/**
 * 記錄錯誤到主進程日誌
 * @param {Error|string} error - 錯誤物件或訊息
 * @param {string} context - 錯誤發生的上下文
 */
async function logError(error, context) {
  try {
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : new Error().stack,
    };
    await window.electronAPI.logRendererError(errorInfo, context);
  } catch (e) {
    // 如果記錄失敗，至少在 console 輸出
    console.error('[ErrorHandler] Failed to log error:', e);
  }
}

/**
 * 初始化全域錯誤攔截器
 */
export function initErrorHandler() {
  // 攔截未捕獲的錯誤
  window.onerror = (message, source, lineno, colno, error) => {
    const context = `${source}:${lineno}:${colno}`;
    logError(error || message, context);
    // 返回 false 讓錯誤繼續傳播到 console
    return false;
  };

  // 攔截未處理的 Promise 拒絕
  window.onunhandledrejection = event => {
    const error = event.reason;
    logError(error, 'UnhandledPromiseRejection');
  };

  // 包裝 console.error 來自動記錄
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // 先呼叫原始的 console.error
    originalConsoleError.apply(console, args);

    // 將錯誤記錄到日誌
    const message = args
      .map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`;
        }
        return String(arg);
      })
      .join(' ');

    logError(message, 'console.error');
  };
}
