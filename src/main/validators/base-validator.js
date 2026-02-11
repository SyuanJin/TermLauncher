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
  /**
   * @param {Object} options - 配置選項
   * @param {number} [options.cacheTTL=300000] - 快取 TTL（毫秒），預設 5 分鐘
   * @param {number} [options.maxCacheSize=100] - 最大快取項目數，預設 100
   */
  constructor(options = {}) {
    // 快取儲存
    this.cache = new Map();
    // 快取 TTL（預設 5 分鐘）
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000;
    // 最大快取大小
    this.maxCacheSize = options.maxCacheSize || 100;
    // 快取統計
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * 取得快取值
   * @param {string} key - 快取鍵
   * @returns {*} 快取值或 undefined
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      this.cacheStats.misses++;
      return undefined;
    }

    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      logger.debug(`Cache expired for key: ${key}`);
      return undefined;
    }

    this.cacheStats.hits++;
    logger.debug(`Using cached result for key: ${key}`);
    return cached.value;
  }

  /**
   * 設定快取值
   * @param {string} key - 快取鍵
   * @param {*} value - 快取值
   */
  setCache(key, value) {
    // 檢查快取大小限制，使用 LRU 策略移除最舊的項目
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
      logger.debug(`Cache evicted oldest key: ${oldestKey}`);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
    logger.debug(`Cached result for key: ${key}`);
  }

  /**
   * 取得快取統計資訊
   * @returns {Object} 快取統計
   */
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      ...this.cacheStats,
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: total > 0 ? ((this.cacheStats.hits / total) * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * 重設快取統計
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
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

  // ===== Windows 相容方法預設實作（非 Windows 平台回傳 false/空值）=====

  isWindowsTerminalInstalled() {
    return false;
  }

  isWslInstalled() {
    return false;
  }

  getWslDistros() {
    return [];
  }

  isWslDistroInstalled(distro) {
    return false;
  }

  extractWslDistro(command) {
    return null;
  }

  usesWindowsTerminal(command) {
    return false;
  }

  usesWsl(command) {
    return false;
  }
}

module.exports = { BaseValidator };
