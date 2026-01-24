/**
 * 狀態管理模組
 * 管理應用程式的全域狀態
 */
import { api } from './api.js';

// 全域配置狀態
let config = null;

/**
 * 取得當前配置
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
