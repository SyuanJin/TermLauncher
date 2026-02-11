/**
 * IPC 參數驗證工具模組
 * 提供 IPC 通訊的參數驗證功能，防止不合法的輸入
 */

/**
 * 驗證結果類型
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 是否驗證通過
 * @property {string} [error] - 錯誤訊息
 */

/**
 * 驗證是否為非空字串
 * @param {*} value - 要驗證的值
 * @param {string} fieldName - 欄位名稱（用於錯誤訊息）
 * @returns {ValidationResult}
 */
function validateString(value, fieldName) {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  if (value.trim().length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }
  return { valid: true };
}

/**
 * 驗證是否為布林值
 * @param {*} value - 要驗證的值
 * @param {string} fieldName - 欄位名稱
 * @returns {ValidationResult}
 */
function validateBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    return { valid: false, error: `${fieldName} must be a boolean` };
  }
  return { valid: true };
}

/**
 * 驗證是否為物件
 * @param {*} value - 要驗證的值
 * @param {string} fieldName - 欄位名稱
 * @returns {ValidationResult}
 */
function validateObject(value, fieldName) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: `${fieldName} must be an object` };
  }
  return { valid: true };
}

/**
 * 驗證是否為正整數
 * @param {*} value - 要驗證的值
 * @param {string} fieldName - 欄位名稱
 * @returns {ValidationResult}
 */
function validatePositiveInteger(value, fieldName) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return { valid: false, error: `${fieldName} must be a positive integer` };
  }
  return { valid: true };
}

/**
 * 驗證 URL 是否安全（只允許 http/https）
 * @param {*} url - 要驗證的 URL
 * @returns {ValidationResult}
 */
function validateSafeUrl(url) {
  const result = validateString(url, 'url');
  if (!result.valid) return result;

  try {
    const parsedUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'ms-windows-store:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return {
        valid: false,
        error: `URL protocol not allowed, got: ${parsedUrl.protocol}`,
      };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Invalid URL format: ${err.message}` };
  }
}

/**
 * 驗證目錄物件
 * @param {*} dir - 目錄物件
 * @returns {ValidationResult}
 */
function validateDirectory(dir) {
  const objResult = validateObject(dir, 'directory');
  if (!objResult.valid) return objResult;

  // 驗證 id（可以是數字或字串）
  if (dir.id === undefined || dir.id === null) {
    return { valid: false, error: 'directory.id is required' };
  }

  // 驗證 path
  const pathResult = validateString(dir.path, 'directory.path');
  if (!pathResult.valid) return pathResult;

  return { valid: true };
}

/**
 * 驗證配置物件的基本結構
 * @param {*} config - 配置物件
 * @returns {ValidationResult}
 */
function validateConfig(config) {
  const objResult = validateObject(config, 'config');
  if (!objResult.valid) return objResult;

  // 驗證必要欄位存在
  if (!Array.isArray(config.directories)) {
    return { valid: false, error: 'config.directories must be an array' };
  }

  if (!Array.isArray(config.groups)) {
    return { valid: false, error: 'config.groups must be an array' };
  }

  if (!Array.isArray(config.terminals)) {
    return { valid: false, error: 'config.terminals must be an array' };
  }

  if (config.settings !== undefined && typeof config.settings !== 'object') {
    return { valid: false, error: 'config.settings must be an object' };
  }

  return { valid: true };
}

/**
 * 驗證匯出選項
 * @param {*} options - 匯出選項
 * @returns {ValidationResult}
 */
function validateExportOptions(options) {
  const objResult = validateObject(options, 'export options');
  if (!objResult.valid) return objResult;

  // 所有選項應為布林值（如果存在）
  const booleanFields = [
    'exportTerminals',
    'exportGroups',
    'exportDirectories',
    'exportFavorites',
    'exportSettings',
  ];

  for (const field of booleanFields) {
    if (options[field] !== undefined && typeof options[field] !== 'boolean') {
      return { valid: false, error: `${field} must be a boolean` };
    }
  }

  return { valid: true };
}

/**
 * 驗證匯入選項
 * @param {*} options - 匯入選項
 * @returns {ValidationResult}
 */
function validateImportOptions(options) {
  const objResult = validateObject(options, 'import options');
  if (!objResult.valid) return objResult;

  // 所有選項應為布林值（如果存在）
  const booleanFields = [
    'mergeTerminals',
    'mergeGroups',
    'mergeDirectories',
    'mergeFavorites',
    'mergeSettings',
  ];

  for (const field of booleanFields) {
    if (options[field] !== undefined && typeof options[field] !== 'boolean') {
      return { valid: false, error: `${field} must be a boolean` };
    }
  }

  return { valid: true };
}

/**
 * 驗證語系代碼
 * @param {*} localeCode - 語系代碼
 * @returns {ValidationResult}
 */
function validateLocaleCode(localeCode) {
  const result = validateString(localeCode, 'localeCode');
  if (!result.valid) return result;

  // 語系代碼格式：xx-XX 或 xx
  const localePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  if (!localePattern.test(localeCode)) {
    return { valid: false, error: 'Invalid locale code format (expected: xx or xx-XX)' };
  }

  return { valid: true };
}

/**
 * 創建驗證包裝器
 * @param {Function} validator - 驗證函數
 * @param {string} handlerName - IPC handler 名稱（用於錯誤訊息）
 * @returns {Function} 包裝後的驗證函數
 */
function createValidator(validator, handlerName) {
  return value => {
    const result = validator(value);
    if (!result.valid) {
      result.handlerName = handlerName;
    }
    return result;
  };
}

module.exports = {
  validateString,
  validateBoolean,
  validateObject,
  validatePositiveInteger,
  validateSafeUrl,
  validateDirectory,
  validateConfig,
  validateExportOptions,
  validateImportOptions,
  validateLocaleCode,
  createValidator,
};
