/**
 * 狀態管理模組
 * 管理應用程式的全域狀態
 *
 * 注意：此模組直接返回配置物件的引用，調用者可以直接修改它。
 * 修改後需要調用 saveConfig() 來持久化變更。
 */
import { api } from './api.js';

// 全域配置狀態
let config = null;

// 路徑有效性狀態 { path: boolean }
let pathValidityCache = {};

/**
 * 取得當前配置
 * 注意：返回的是配置物件的直接引用，修改後需調用 saveConfig()
 * @returns {Object|null} 配置物件
 */
export function getConfig() {
  return config;
}

/**
 * 設定配置
 * @param {Object} newConfig - 新的配置物件
 */
export function setConfig(newConfig) {
  config = newConfig;
}

/**
 * 載入配置
 * @returns {Promise<Object>} 配置物件
 */
export async function loadConfig() {
  config = await api.getConfig();
  return config;
}

/**
 * 儲存配置
 * @returns {Promise<boolean>} 是否儲存成功
 */
export async function saveConfig() {
  return await api.saveConfig(config);
}

/**
 * 檢查配置是否已載入
 * @returns {boolean} 配置是否已載入
 */
export function isConfigLoaded() {
  return config !== null;
}

/**
 * 重設配置狀態（主要用於測試）
 */
export function resetConfig() {
  config = null;
  pathValidityCache = {};
}

/**
 * 驗證所有目錄路徑的有效性
 * @returns {Promise<Object>} { path: boolean } 路徑有效性狀態
 */
export async function validateAllPaths() {
  if (!config || !config.directories) {
    return {};
  }

  const paths = config.directories.map(d => d.path);
  const uniquePaths = [...new Set(paths)];

  try {
    pathValidityCache = await api.validatePaths(uniquePaths);
  } catch (err) {
    console.error('Failed to validate paths:', err);
    pathValidityCache = {};
  }

  return pathValidityCache;
}

/**
 * 檢查路徑是否有效
 * @param {string} path - 路徑
 * @returns {boolean|null} true=有效, false=無效, null=未知
 */
export function isPathValid(path) {
  if (path in pathValidityCache) {
    return pathValidityCache[path];
  }
  return null; // 未驗證
}

/**
 * 取得無效路徑的目錄列表
 * @returns {Array} 無效路徑的目錄
 */
export function getInvalidPathDirectories() {
  if (!config || !config.directories) {
    return [];
  }

  return config.directories.filter(d => pathValidityCache[d.path] === false);
}
