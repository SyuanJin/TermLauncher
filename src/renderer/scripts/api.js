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
   * 預覽終端命令
   * @param {Object} dir - 目錄物件
   * @param {string} terminalId - 終端 ID（可選）
   * @returns {Promise<Object>} { success: boolean, command?: string }
   */
  previewCommand: (dir, terminalId) => window.electronAPI.previewCommand(dir, terminalId),

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
   * 進階匯出配置
   * @param {Object} options - 匯出選項
   * @returns {Promise<Object>} { success: boolean, path?: string, data?: Object }
   */
  exportConfigAdvanced: options => window.electronAPI.exportConfigAdvanced(options),

  /**
   * 進階匯入配置
   * @param {Object} options - 匯入選項
   * @returns {Promise<Object>} { success: boolean, config?: Object, errors?: string[] }
   */
  importConfigAdvanced: options => window.electronAPI.importConfigAdvanced(options),

  /**
   * 取得匯出預覽資訊
   * @returns {Promise<Object>} 預覽資訊
   */
  getExportPreview: () => window.electronAPI.getExportPreview(),

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

  /**
   * 探測已安裝的終端
   * @returns {Promise<Object>} 探測結果
   */
  detectTerminals: () => window.electronAPI.detectTerminals(),

  /**
   * 取得當前平台
   * @returns {Promise<string>} 平台名稱 ('win32' | 'darwin' | 'linux')
   */
  getPlatform: () => window.electronAPI.getPlatform(),

  /**
   * 批次驗證路徑是否存在
   * @param {string[]} paths - 路徑陣列
   * @returns {Promise<Object>} { path: boolean } 路徑存在狀態
   */
  validatePaths: paths => window.electronAPI.validatePaths(paths),

  /**
   * 檢查版本更新
   * @returns {Promise<Object>} { hasUpdate, currentVersion, latestVersion, releaseUrl }
   */
  checkForUpdates: () => window.electronAPI.checkForUpdates(),

  /**
   * 啟動 MCP Server
   * @param {number} port - 埠號
   * @returns {Promise<Object>} { success, port?, error? }
   */
  startMcpServer: port => window.electronAPI.startMcpServer(port),

  /**
   * 停止 MCP Server
   * @returns {Promise<Object>} { success, error? }
   */
  stopMcpServer: () => window.electronAPI.stopMcpServer(),

  /**
   * 取得 MCP Server 狀態
   * @returns {Promise<Object>} { running, port? }
   */
  getMcpStatus: () => window.electronAPI.getMcpStatus(),

  /**
   * 監聽配置變更事件
   * @param {Function} callback - 回呼函式
   */
  onConfigChanged: callback => window.electronAPI.onConfigChanged(callback),
};
