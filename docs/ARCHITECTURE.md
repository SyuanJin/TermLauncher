# 技術架構文檔

> 版本：2.4.0 | 更新：2026-02-12

## 技術棧

| 層級     | 技術                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | Electron Renderer + HTML/CSS/ES Modules                     |
| Preload  | Context Bridge (contextIsolation: true)                     |
| Backend  | Electron Main + Node.js                                     |
| System   | 跨平台應用程式支援（Windows/macOS/Linux）、Global Shortcuts |

## 專案結構

```
src/
├── main/                 # Electron 主進程
│   ├── index.js         # 入口、生命週期
│   ├── config.js        # 配置管理
│   ├── terminal.js      # 應用程式啟動
│   ├── window.js        # 視窗管理
│   ├── tray.js          # 系統托盤
│   ├── shortcuts.js     # 全域快捷鍵
│   ├── ipc-handlers.js  # IPC 處理
│   ├── i18n.js          # 國際化
│   ├── logger.js        # 日誌記錄
│   ├── updater.js       # 版本更新檢查
│   ├── mcp/             # MCP 協議伺服器
│   │   ├── index.js     # MCP 伺服器核心
│   │   ├── tools/       # MCP 工具模組
│   │   └── utils.js     # MCP 工具函式
│   ├── validators/      # 跨平台終端驗證器
│   │   ├── index.js              # 驗證器匯出入口
│   │   ├── base-validator.js     # 驗證器基類（快取機制）
│   │   ├── windows-validator.js  # Windows 終端驗證
│   │   ├── macos-validator.js    # macOS 終端驗證
│   │   └── linux-validator.js    # Linux 終端驗證
│   └── utils/           # 工具函式
│       ├── path-utils.js         # 路徑轉換與安全驗證
│       ├── ipc-validators.js     # IPC 參數驗證
│       ├── version-utils.js      # 版本比較工具
│       └── config-migration.js   # 配置版本遷移
│
├── preload/preload.js   # Context Bridge API
│
├── renderer/            # 前端渲染進程
│   ├── index.html
│   ├── styles/          # CSS (variables, base, components, layout)
│   └── scripts/
│       ├── app.js          # 應用入口
│       ├── api.js          # IPC 封裝
│       ├── state.js        # 狀態管理
│       ├── i18n.js         # 前端翻譯
│       ├── error-handler.js # 錯誤處理
│       ├── ui/          # UI 模組 (tabs, recent, favorites, groups, directories, launchers, settings, modal, contextMenu, dragDrop, toast)
│       └── utils/       # 工具函式
│           ├── debounce.js   # 防抖函式
│           ├── dom-cache.js  # DOM 快取
│           ├── escape.js     # HTML/屬性轉義
│           ├── keyboard.js   # 應用內鍵盤快捷鍵
│           ├── shortcuts.js  # 快捷鍵顯示工具
│           └── terminal.js   # 啟動器輔助函式
│
└── locales/             # 語系檔 (zh-TW, en-US)
```

## 核心模組

| 模組            | 職責                             |
| --------------- | -------------------------------- |
| config.js       | 配置檔讀取、儲存、遷移           |
| terminal.js     | 應用程式啟動、路徑轉換、前置驗證 |
| ipc-handlers.js | 主進程 IPC 事件處理              |
| state.js        | 前端全域配置狀態                 |
| ui/\*.js        | 各 Tab 的渲染與操作邏輯          |

## 配置檔

**位置**（由 `app.getPath('userData')` 決定）：

| 平台    | 路徑                                                  |
| ------- | ----------------------------------------------------- |
| Windows | `%APPDATA%\termlauncher\config.json`                  |
| macOS   | `~/Library/Application Support/termlauncher/config.json` |
| Linux   | `~/.config/termlauncher/config.json`                  |

**結構摘要**：

- `directories[]` - 目錄列表 (id, name, icon, path, terminalId, group, order)
- `terminals[]` - 終端列表 (id, name, icon, command, pathFormat, isBuiltin)
- `groups[]` - 群組列表 (id, name, icon, isDefault, order)
- `favorites[]` - 最愛目錄 ID
- `settings{}` - 設定 (theme, language, globalShortcut, etc.)

## IPC 通訊

共 32 個 Channel，依功能分組：

### 配置管理

| Channel                | 方式   | 說明                         |
| ---------------------- | ------ | ---------------------------- |
| get-config             | handle | 取得配置                     |
| save-config            | handle | 儲存配置（含重新註冊快捷鍵） |
| check-config-corrupted | handle | 檢查配置是否曾損壞           |
| reset-config           | handle | 重設所有設定為預設值         |
| config-changed         | send   | 配置變更事件（通知前端）     |

### 啟動器操作

| Channel          | 方式   | 說明                     |
| ---------------- | ------ | ------------------------ |
| open-terminal    | handle | 開啟啟動器並進入指定目錄 |
| preview-command  | handle | 預覽啟動器執行命令與參數 |
| detect-terminals | handle | 探測已安裝的啟動器       |

### 檔案與路徑

| Channel        | 方式   | 說明                 |
| -------------- | ------ | -------------------- |
| select-folder  | handle | 開啟資料夾選擇器     |
| validate-paths | handle | 批次驗證路徑是否存在 |

### 匯出匯入

| Channel                | 方式   | 說明                       |
| ---------------------- | ------ | -------------------------- |
| export-config          | handle | 基本匯出（完整配置）       |
| import-config          | handle | 基本匯入（完整覆蓋）       |
| export-config-advanced | handle | 進階匯出（選擇性匯出項目） |
| import-config-advanced | handle | 進階匯入（合併/覆蓋模式）  |
| get-export-preview     | handle | 取得匯出預覽（各項目數量） |

### 國際化

| Channel               | 方式   | 說明             |
| --------------------- | ------ | ---------------- |
| get-available-locales | handle | 取得可用語系列表 |
| load-locale           | handle | 載入指定語系     |

### 自動啟動

| Channel         | 方式   | 說明             |
| --------------- | ------ | ---------------- |
| set-auto-launch | handle | 設定開機自動啟動 |
| get-auto-launch | handle | 取得自動啟動狀態 |

### 系統資訊

| Channel             | 方式   | 說明                 |
| ------------------- | ------ | -------------------- |
| get-app-version     | handle | 取得應用程式版本     |
| get-platform        | handle | 取得當前作業系統平台 |
| get-shortcut-status | handle | 取得快捷鍵註冊狀態   |
| check-for-updates   | handle | 檢查版本更新         |

### 外部操作

| Channel               | 方式   | 說明                        |
| --------------------- | ------ | --------------------------- |
| open-external         | handle | 開啟外部連結（僅限 http/s） |
| open-config-directory | handle | 開啟設定檔目錄              |

### 錯誤與日誌

| Channel            | 方式   | 說明             |
| ------------------ | ------ | ---------------- |
| log-renderer-error | handle | 記錄前端錯誤     |
| clear-logs         | handle | 清除所有日誌檔案 |

### 視窗控制

| Channel         | 方式 | 說明            |
| --------------- | ---- | --------------- |
| minimize-window | on   | 最小化視窗      |
| maximize-window | on   | 最大化/還原視窗 |
| close-window    | on   | 關閉視窗        |

### MCP 伺服器

| Channel          | 方式   | 說明                |
| ---------------- | ------ | ------------------- |
| start-mcp-server | handle | 啟動 MCP 伺服器     |
| stop-mcp-server  | handle | 停止 MCP 伺服器     |
| get-mcp-status   | handle | 取得 MCP 伺服器狀態 |

## MCP 子系統

**Model Context Protocol (MCP)** 允許 AI 應用程式透過標準化協議存取 TermLauncher 功能。

### 架構

- **伺服器實作**：`src/main/mcp/index.js`
- **通訊協議**：Stdio (標準輸入/輸出)
- **工具模組**：`src/main/mcp/tools/` (目錄、群組、啟動器操作)

### 功能

- 查詢與管理目錄、群組、啟動器
- 開啟終端並切換到指定目錄
- 探測系統已安裝的啟動器
- 匯出/匯入配置

### 使用方式

```bash
# 透過 Claude Desktop 或其他 MCP 客戶端連接
termlauncher.exe --mcp
```

## 安全機制

- `contextIsolation: true` + `nodeIntegration: false`
- CSP 限制外部資源
- 使用 `spawn` 而非 `exec` 避免 shell 注入
- 路徑啟動前驗證存在性與安全性
- IPC 參數驗證防止惡意輸入
- 日誌敏感資訊過濾
- XSS 防護（HTML/屬性轉義）

## 錯誤處理

| 錯誤類型                | 處理方式           |
| ----------------------- | ------------------ |
| Windows Terminal 未安裝 | Toast 提示用戶安裝 |
| WSL/發行版不存在        | Toast 提示檢查     |
| 路徑不存在              | Toast 提示路徑錯誤 |
| 配置檔損壞              | 自動備份，重建預設 |

## 日誌

- **位置**：`<userData>/logs/`（各平台路徑同上配置檔）
- **格式**：`termlauncher-YYYY-MM-DD.log`
- **清理**：自動刪除 7 天前的日誌
