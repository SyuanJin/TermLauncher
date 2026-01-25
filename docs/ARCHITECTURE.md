# 技術架構文檔

> 版本：2.0.0 | 更新：2026-01-25

## 技術棧

| 層級     | 技術                                                          |
| -------- | ------------------------------------------------------------- |
| Frontend | Electron Renderer + HTML/CSS/ES Modules                       |
| Preload  | Context Bridge (contextIsolation: true)                       |
| Backend  | Electron Main + Node.js                                       |
| System   | 跨平台終端支援（Windows/macOS/Linux）、Global Shortcuts       |

## 專案結構

```
src/
├── main/                 # Electron 主進程
│   ├── index.js         # 入口、生命週期
│   ├── config.js        # 配置管理
│   ├── terminal.js      # 終端啟動
│   ├── window.js        # 視窗管理
│   ├── tray.js          # 系統托盤
│   ├── shortcuts.js     # 全域快捷鍵
│   ├── ipc-handlers.js  # IPC 處理
│   ├── i18n.js          # 國際化
│   ├── logger.js        # 日誌記錄
│   ├── validators/      # 跨平台終端驗證器
│   │   ├── base-validator.js     # 驗證器基類（快取機制）
│   │   ├── windows-validator.js  # Windows 終端驗證
│   │   ├── macos-validator.js    # macOS 終端驗證
│   │   └── linux-validator.js    # Linux 終端驗證
│   └── utils/           # 工具函式
│       ├── path-utils.js      # 路徑轉換與安全驗證
│       └── ipc-validators.js  # IPC 參數驗證
│
├── preload/preload.js   # Context Bridge API
│
├── renderer/            # 前端渲染進程
│   ├── index.html
│   ├── styles/          # CSS (variables, base, components, layout)
│   └── scripts/
│       ├── app.js       # 應用入口
│       ├── api.js       # IPC 封裝
│       ├── state.js     # 狀態管理
│       ├── i18n.js      # 前端翻譯
│       ├── ui/          # UI 模組 (tabs, recent, favorites, groups, directories, settings, modal, contextMenu, dragDrop, toast)
│       └── utils/       # 工具函式
│
└── locales/             # 語系檔 (zh-TW, en-US)
```

## 核心模組

| 模組            | 職責                         |
| --------------- | ---------------------------- |
| config.js       | 配置檔讀取、儲存、遷移       |
| terminal.js     | 終端啟動、路徑轉換、前置驗證 |
| ipc-handlers.js | 主進程 IPC 事件處理          |
| state.js        | 前端全域配置狀態             |
| ui/\*.js        | 各 Tab 的渲染與操作邏輯      |

## 配置檔

**位置**：`%APPDATA%/termlauncher/config.json`

**結構摘要**：

- `directories[]` - 目錄列表 (id, name, icon, path, terminalId, group, order)
- `terminals[]` - 終端列表 (id, name, icon, command, pathFormat, isBuiltin)
- `groups[]` - 群組列表 (id, name, icon, isDefault, order)
- `favorites[]` - 最愛目錄 ID
- `settings{}` - 設定 (theme, language, globalShortcut, etc.)

## IPC 通訊

| Channel               | 說明             |
| --------------------- | ---------------- |
| get-config            | 取得配置         |
| save-config           | 儲存配置         |
| open-terminal         | 開啟終端         |
| select-folder         | 資料夾選擇器     |
| export/import-config  | 匯出/匯入配置    |
| get/set-auto-launch   | 開機自動啟動     |
| load-locale           | 載入語系         |
| open-external         | 開啟外部連結     |
| open-config-directory | 開啟設定目錄     |
| get-app-version       | 取得應用程式版本 |
| log-renderer-error    | 記錄前端錯誤     |
| clear-logs            | 清除日誌         |
| reset-config          | 重設所有設定     |

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

- **位置**：`%APPDATA%/termlauncher/logs/`
- **格式**：`termlauncher-YYYY-MM-DD.log`
- **清理**：自動刪除 7 天前的日誌
