# TermLauncher 技術架構文檔

> 版本：1.0.0  
> 更新日期：2025-01-24

---

## 1. 技術棧總覽

```
┌─────────────────────────────────────────────────┐
│                  TermLauncher                    │
├─────────────────────────────────────────────────┤
│  Frontend        │  Electron Renderer Process   │
│  (UI Layer)      │  - HTML5 / CSS3              │
│                  │  - Vanilla JavaScript        │
│                  │  - Google Fonts              │
├─────────────────────────────────────────────────┤
│  Backend         │  Electron Main Process       │
│  (Core Layer)    │  - Node.js                   │
│                  │  - File System (fs)          │
│                  │  - Child Process (spawn)     │
├─────────────────────────────────────────────────┤
│  System          │  Windows APIs                │
│  Integration     │  - Windows Terminal (wt.exe) │
│                  │  - WSL (wsl.exe)             │
│                  │  - Global Shortcuts          │
│                  │  - System Tray               │
└─────────────────────────────────────────────────┘
```

---

## 2. 專案結構

```
TermLauncher/
├── docs/                    # 📚 文檔目錄
│   ├── PRD.md              # 產品需求文檔
│   ├── ARCHITECTURE.md     # 技術架構文檔（本文件）
│   ├── UI_DESIGN.md        # UI 設計文檔
│   └── PROGRESS.md         # 開發進度追蹤
│
├── assets/                  # 🎨 資源檔案
│   ├── icon.ico            # 應用圖示 (Windows)
│   ├── icon.png            # 應用圖示 (通用)
│   ├── icon.svg            # 應用圖示 (原始檔)
│   └── tray-icon.png       # 托盤圖示
│
├── dist/                    # 📦 打包輸出目錄
│
├── main.js                 # Electron 主程序
├── index.html              # 前端介面（含 CSS 和 JS）
├── package.json            # 專案配置
├── .prettierrc             # Prettier 配置
├── .gitattributes          # Git 換行符配置
├── .gitignore              # Git 忽略規則
├── README.md               # 專案說明
└── LICENSE                 # 授權條款
```

---

## 3. 核心模組設計

### 3.1 配置管理

**配置檔位置**：`%APPDATA%/termlauncher/config.json`

**配置檔結構**：

```javascript
{
  "directories": [
    {
      "id": 1706123456789,        // 唯一識別碼 (timestamp)
      "name": "我的專案",          // 顯示名稱
      "path": "D:\\Projects\\app", // Windows 路徑
      "type": "wsl",              // "wsl" | "powershell"
      "group": "預設",             // 所屬群組
      "lastUsed": 1706123456789   // 最後使用時間 (timestamp)
    }
  ],
  "groups": ["預設"],
  "settings": {
    "startMinimized": false,
    "minimizeToTray": true,
    "globalShortcut": "Alt+Space"
  }
}
```

**主要函式**：

| 函式 | 說明 |
|------|------|
| `loadConfig()` | 從檔案讀取配置，若不存在則建立預設配置 |
| `saveConfig(config)` | 將配置寫入檔案 |

### 3.2 終端啟動模組

**路徑轉換規則**：

```
Windows: D:\Projects\my-app
   ↓
WSL:     /mnt/d/Projects/my-app
```

**啟動命令**：

```bash
# WSL Ubuntu
wt.exe -w 0 new-tab wsl.exe -d Ubuntu --cd /mnt/d/Projects/my-app

# PowerShell
wt.exe -w 0 new-tab -p "Windows PowerShell" -d D:\Projects\my-app
```

**主要函式**：

| 函式 | 說明 |
|------|------|
| `openTerminal(dir)` | 開啟終端並進入指定目錄 |
| `toWslPath(winPath)` | Windows 路徑轉 WSL 路徑 |

### 3.3 IPC 通訊設計

**主程序處理** (ipcMain.handle)

| Channel         | 參數      | 回傳     | 說明             |
| --------------- | --------- | -------- | ---------------- |
| `get-config`    | -         | Config   | 取得配置         |
| `save-config`   | Config    | boolean  | 儲存配置         |
| `open-terminal` | Directory | Result   | 開啟終端         |
| `select-folder` | -         | {path}   | 開啟資料夾選擇器 |
| `export-config` | -         | {path}   | 匯出配置檔       |
| `import-config` | -         | {config} | 匯入配置檔       |

**視窗控制** (ipcRenderer.send)

| Channel           | 說明            |
| ----------------- | --------------- |
| `minimize-window` | 最小化視窗      |
| `maximize-window` | 最大化/還原視窗 |
| `close-window`    | 關閉視窗        |

---

## 4. 資料流程圖

### 4.1 開啟終端流程

```
┌──────────────┐    click     ┌──────────────┐
│  目錄卡片    │ ──────────→ │  openTerminal │
│  (Renderer)  │              │  (Renderer)  │
└──────────────┘              └──────┬───────┘
                                     │ IPC invoke
                                     ↓
┌──────────────┐   spawn      ┌──────────────┐
│  wt.exe      │ ←─────────── │  open-terminal│
│  (System)    │              │  (Main)      │
└──────────────┘              └──────┬───────┘
                                     │ update lastUsed
                                     ↓
                              ┌──────────────┐
                              │  saveConfig  │
                              │  (Main)      │
                              └──────────────┘
```

### 4.2 配置同步流程

```
┌─────────────┐  變更   ┌─────────────┐  IPC   ┌─────────────┐
│  UI 操作    │ ──────→ │  更新 state │ ─────→ │  save-config │
│  (Renderer) │         │  (Renderer) │        │  (Main)      │
└─────────────┘         └─────────────┘        └──────┬──────┘
                                                      │ fs.writeFile
                                                      ↓
                                               ┌─────────────┐
                                               │ config.json │
                                               │  (Disk)     │
                                               └─────────────┘
```

---

## 5. 安全考量

### 5.1 程序間通訊

- 目前使用 `contextIsolation: false`（簡化開發）
- 正式版建議改為 `contextIsolation: true` + `preload.js`

### 5.2 路徑處理

- 使用 `spawn` 而非 `exec`，避免 shell 注入
- 路徑參數直接傳遞，不經過 shell 解析

### 5.3 配置驗證

- 載入配置時檢查結構
- 匯入配置時驗證格式

---

## 6. 打包配置

### 6.1 electron-builder 配置

```json
{
  "build": {
    "appId": "com.termlauncher.app",
    "productName": "TermLauncher",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": ["portable", "nsis"],
      "icon": "assets/icon.ico"
    },
    "portable": {
      "artifactName": "TermLauncher-Portable.exe"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### 6.2 輸出檔案

| 類型      | 檔名                        | 說明               |
| --------- | --------------------------- | ------------------ |
| Portable  | `TermLauncher-Portable.exe` | 免安裝版，單一 exe |
| Installer | `TermLauncher-Setup.exe`    | 安裝版，含捷徑建立 |

---

## 7. 開發環境

### 7.1 環境需求

```
Node.js >= 16.0.0
npm >= 8.0.0
Windows 10/11
Windows Terminal (已安裝)
```

### 7.2 開發指令

```bash
# 安裝依賴
npm install

# 運行應用
npm start

# 格式化程式碼
npm run format

# 檢查格式
npm run format:check

# 打包 Portable 版
npm run build

# 打包安裝版
npm run build:installer
```

---

## 8. 錯誤處理

### 8.1 常見錯誤

| 錯誤 | 原因 | 處理方式 |
| ---- | ---- | -------- |
| Windows Terminal 未安裝 | 系統沒有 wt.exe | 提示用戶安裝 |
| WSL 未安裝 | 沒有 WSL 環境 | 提示用戶安裝 WSL |
| 路徑不存在 | 目錄已被刪除 | 提示用戶檢查路徑 |
| 配置檔損壞 | JSON 格式錯誤 | 重建預設配置 |
| 快捷鍵衝突 | 已被其他程式佔用 | 提示用戶更換 |

### 8.2 日誌記錄

- 開發模式：輸出到 console
- 正式版：可考慮寫入 `%APPDATA%/termlauncher/logs/`
