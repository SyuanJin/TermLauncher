/**
 * Preload 腳本
 * 透過 contextBridge 安全暴露 API 給渲染進程
 */
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 給渲染進程
contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: config => ipcRenderer.invoke('save-config', config),

  // 終端操作
  openTerminal: dir => ipcRenderer.invoke('open-terminal', dir),
  previewCommand: (dir, terminalId) => ipcRenderer.invoke('preview-command', dir, terminalId),

  // 檔案操作
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  exportConfig: () => ipcRenderer.invoke('export-config'),
  importConfig: () => ipcRenderer.invoke('import-config'),
  exportConfigAdvanced: options => ipcRenderer.invoke('export-config-advanced', options),
  importConfigAdvanced: options => ipcRenderer.invoke('import-config-advanced', options),
  getExportPreview: () => ipcRenderer.invoke('get-export-preview'),

  // 視窗控制
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // 國際化
  getAvailableLocales: () => ipcRenderer.invoke('get-available-locales'),
  loadLocale: localeCode => ipcRenderer.invoke('load-locale', localeCode),

  // 開機自動啟動
  setAutoLaunch: enabled => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),

  // 錯誤處理
  checkConfigCorrupted: () => ipcRenderer.invoke('check-config-corrupted'),
  getShortcutStatus: () => ipcRenderer.invoke('get-shortcut-status'),

  // 外部操作
  openExternal: url => ipcRenderer.invoke('open-external', url),
  openConfigDirectory: () => ipcRenderer.invoke('open-config-directory'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 錯誤日誌
  logRendererError: (error, context) => ipcRenderer.invoke('log-renderer-error', error, context),

  // 進階操作
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  resetConfig: () => ipcRenderer.invoke('reset-config'),

  // 終端探測
  detectTerminals: () => ipcRenderer.invoke('detect-terminals'),

  // 平台資訊
  getPlatform: () => ipcRenderer.invoke('get-platform'),
});
