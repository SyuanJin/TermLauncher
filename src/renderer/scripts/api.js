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
};
