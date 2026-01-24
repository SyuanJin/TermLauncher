/**
 * API 封裝模組
 * 封裝與主進程的 IPC 通訊
 */

export const api = {
  /**
   * 取得配置
   * @returns {Promise<Object>} 配置物件
   */
  getConfig: () => window.electronAPI.getConfig(),

  /**
   * 儲存配置
   * @param {Object} config - 配置物件
   * @returns {Promise<boolean>} 是否儲存成功
   */
  saveConfig: config => window.electronAPI.saveConfig(config),

  /**
   * 開啟終端
   * @param {Object} dir - 目錄物件
   * @returns {Promise<Object>} { success: boolean, error?: string }
   */
  openTerminal: dir => window.electronAPI.openTerminal(dir),

  /**
   * 選擇資料夾
   * @returns {Promise<Object>} { success: boolean, path?: string }
   */
  selectFolder: () => window.electronAPI.selectFolder(),

  /**
   * 匯出配置
   * @returns {Promise<Object>} { success: boolean, path?: string }
   */
  exportConfig: () => window.electronAPI.exportConfig(),

  /**
   * 匯入配置
   * @returns {Promise<Object>} { success: boolean, config?: Object, error?: string }
   */
  importConfig: () => window.electronAPI.importConfig(),

  /**
   * 最小化視窗
   */
  minimizeWindow: () => window.electronAPI.minimizeWindow(),

  /**
   * 最大化視窗
   */
  maximizeWindow: () => window.electronAPI.maximizeWindow(),

  /**
   * 關閉視窗
   */
  closeWindow: () => window.electronAPI.closeWindow(),

  /**
   * 取得可用語系列表
   * @returns {Promise<Array>} 語系列表
   */
  getAvailableLocales: () => window.electronAPI.getAvailableLocales(),

  /**
   * 載入語系
   * @param {string} localeCode - 語系代碼
   * @returns {Promise<Object>} 語系資料
   */
  loadLocale: localeCode => window.electronAPI.loadLocale(localeCode),

  /**
   * 設定開機自動啟動
   * @param {boolean} enabled - 是否啟用
   * @returns {Promise<Object>} { success: boolean, enabled: boolean }
   */
  setAutoLaunch: enabled => window.electronAPI.setAutoLaunch(enabled),

  /**
   * 取得開機自動啟動狀態
   * @returns {Promise<boolean>} 是否啟用
   */
  getAutoLaunch: () => window.electronAPI.getAutoLaunch(),

  /**
   * 檢查配置是否曾損壞
   * @returns {Promise<boolean>} 是否曾損壞
   */
  checkConfigCorrupted: () => window.electronAPI.checkConfigCorrupted(),

  /**
   * 取得快捷鍵註冊狀態
   * @returns {Promise<Object|null>} { success: boolean, shortcut: string, errorType?: string }
   */
  getShortcutStatus: () => window.electronAPI.getShortcutStatus(),

  /**
   * 開啟設定目錄
   * @returns {Promise<Object>} { success: boolean }
   */
  openConfigDirectory: () => window.electronAPI.openConfigDirectory(),

  /**
   * 清除日誌
   * @returns {Promise<Object>} { success: boolean }
   */
  clearLogs: () => window.electronAPI.clearLogs(),

  /**
   * 重設所有設定
   * @returns {Promise<Object>} { success: boolean, config?: Object }
   */
  resetConfig: () => window.electronAPI.resetConfig(),

  /**
   * 取得應用程式版本
   * @returns {Promise<string>} 版本號
   */
  getAppVersion: () => window.electronAPI.getAppVersion(),

  /**
   * 開啟外部連結
   * @param {string} url - 網址
   * @returns {Promise<Object>} { success: boolean }
   */
  openExternal: url => window.electronAPI.openExternal(url),

  /**
   * 記錄前端錯誤
   * @param {Object} error - 錯誤物件
   * @param {string} context - 錯誤發生的上下文
   * @returns {Promise<void>}
   */
  logRendererError: (error, context) => window.electronAPI.logRendererError(error, context),
};
