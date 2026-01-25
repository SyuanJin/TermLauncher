/**
 * 驗證器抽象基類
 * 提供快取機制與共用驗證邏輯
 */
const fs = require('fs');
const { createLogger } = require('../logger');

const logger = createLogger('BaseValidator');

/**
 * 驗證器抽象基類
 */
class BaseValidator {
  constructor() {
    // 快取儲存
    this.cache = new Map();
    // 快取 TTL（預設 5 分鐘）
    this.cacheTTL = 5 * 60 * 1000;
  }

  /**
   * 取得快取值
   * @param {string} key - 快取鍵
   * @returns {*} 快取值或 undefined
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return undefined;

    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      logger.debug(`Cache expired for key: ${key}`);
      return undefined;
    }

    logger.debug(`Using cached result for key: ${key}`);
    return cached.value;
  }

  /**
   * 設定快取值
   * @param {string} key - 快取鍵
   * @param {*} value - 快取值
   */
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
    logger.debug(`Cached result for key: ${key}`);
  }

  /**
   * 清除所有快取
   */
  invalidateCache() {
    this.cache.clear();
    logger.debug('Cache invalidated');
  }

  /**
   * 清除特定前綴的快取
   * @param {string} prefix - 快取鍵前綴
   */
  invalidateCacheByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    logger.debug(`Cache invalidated for prefix: ${prefix}`);
  }

  /**
   * 驗證終端是否可用（子類需實作）
   * @param {Object} terminal - 終端配置
   * @returns {Promise<Object>} 驗證結果
   */
  async validateTerminal(terminal) {
    throw new Error('validateTerminal() must be implemented by subclass');
  }

  /**
   * 驗證路徑是否存在且為目錄
   * @param {string} dirPath - 目錄路徑
   * @returns {Object} { valid: boolean, errorType?: string, errorDetail?: string }
   */
  validatePath(dirPath) {
    // 路徑驗證不使用快取，因為檔案系統可能隨時變更

    // 檢查路徑是否存在
    if (!fs.existsSync(dirPath)) {
      return {
        valid: false,
        errorType: 'PATH_NOT_FOUND',
        errorDetail: dirPath,
      };
    }

    // 檢查路徑是否為目錄
    try {
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) {
        return {
          valid: false,
          errorType: 'PATH_NOT_DIRECTORY',
          errorDetail: dirPath,
        };
      }
    } catch (err) {
      return {
        valid: false,
        errorType: 'PATH_NOT_FOUND',
        errorDetail: dirPath,
      };
    }

    return { valid: true };
  }

  /**
   * 驗證配置是否有效
   * @param {Object} terminal - 終端配置
   * @returns {Object} { valid: boolean, errorType?: string, errorDetail?: string }
   */
  validateConfig(terminal) {
    if (!terminal || !terminal.command) {
      return {
        valid: false,
        errorType: 'INVALID_CONFIG',
        errorDetail: 'terminal.command',
      };
    }
    return { valid: true };
  }

  /**
   * 執行完整驗證
   * @param {Object} dir - 目錄物件 { path }
   * @param {Object} terminal - 終端配置 { command, pathFormat }
   * @returns {Promise<Object>} { valid: boolean, errorType?: string, errorDetail?: string }
   */
  async validate(dir, terminal) {
    // 1. 驗證配置
    const configResult = this.validateConfig(terminal);
    if (!configResult.valid) {
      return configResult;
    }

    // 2. 驗證路徑
    const pathResult = this.validatePath(dir.path);
    if (!pathResult.valid) {
      return pathResult;
    }

    // 3. 驗證終端（由子類實作）
    const terminalResult = await this.validateTerminal(terminal);
    if (!terminalResult.valid) {
      return terminalResult;
    }

    return { valid: true };
  }
}

module.exports = { BaseValidator };
