# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

TermLauncher 是一個跨平台桌面應用，支援以任意應用程式開啟專案目錄 — 終端、編輯器、IDE、檔案總管等。Windows 完整支援，macOS/Linux 實驗性支援。

## 建置與執行命令

```bash
# 安裝依賴
npm install

# 開發運行
npm start

# 打包便攜版
npm run build

# 打包安裝版
npm run build:installer

# 代碼格式檢查
npm run format:check

# 代碼格式化
npm run format

# 執行測試
npm test

# 執行測試並產生覆蓋率報告
npm run test:coverage

# 執行 ESLint 檢查
npm run lint
```

## 架構設計

### 進程架構（Electron）

```
Renderer Process (前端 UI)
    ↕ IPC (api.js ↔ ipc-handlers.js)
Preload Script (Context Bridge 安全通訊層)
    ↕
Main Process (後端/系統整合)
    ↕
系統服務 (Windows Terminal, WSL, 托盤, 快捷鍵)
```

### 主進程模組 (`src/main/`)

| 模組              | 職責                             |
| ----------------- | -------------------------------- |
| `index.js`        | 應用入口、生命週期管理           |
| `config.js`       | 配置讀寫、版本遷移（v1→v2）      |
| `terminal.js`     | 應用程式啟動、路徑轉換、前置驗證 |
| `window.js`       | 主視窗管理                       |
| `tray.js`         | 系統托盤                         |
| `shortcuts.js`    | 全域快捷鍵註冊/註銷              |
| `ipc-handlers.js` | IPC 事件處理                     |
| `i18n.js`         | 國際化                           |
| `logger.js`       | 日誌系統                         |
| `updater.js`      | 版本更新檢查                     |
| `mcp/`            | MCP 協議伺服器                   |

### 前端模組 (`src/renderer/scripts/`)

- **核心**：`app.js`（入口）、`api.js`（IPC 封裝）、`state.js`（狀態管理）
- **UI 模組**（`ui/`）：tabs、recent、favorites、groups、directories、launchers、settings、modal、toast、contextMenu、dragDrop
- **工具模組**（`utils/`）：keyboard、shortcuts、terminal

### 配置與日誌位置

- 配置檔：`%APPDATA%/termlauncher/config.json`
- 日誌目錄：`%APPDATA%/termlauncher/logs/`

## 安全機制

- `contextIsolation: true` + `nodeIntegration: false`
- Context Bridge 限制 API 暴露
- CSP 防止外部資源注入

## 技術棧

- Electron v33.0.0
- 原生 HTML/CSS/ES Modules（無前端框架）
- electron-builder 打包
- Prettier 代碼格式化
- ESLint 代碼檢查
- Vitest 測試框架

## 開發注意事項

- 前端使用 ES Modules，所有模組需透過 `import/export`
- IPC 通訊需同時修改 `preload/preload.js` 和 `ipc-handlers.js`
- 新增啟動器類型需修改 `terminal.js` 的路徑轉換邏輯
- 國際化字串放在 `src/locales/` 下的 JSON 檔案

## 相關文件

| 文件                                    | 說明                           |
| --------------------------------------- | ------------------------------ |
| [RELEASE.md](docs/RELEASE.md)           | 發布指南、CHANGELOG 格式與模板 |
| [CHANGELOG.md](docs/CHANGELOG.md)       | 版本變更記錄                   |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架構設計文件                   |
