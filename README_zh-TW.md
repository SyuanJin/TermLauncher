# TermLauncher

<p align="center">
  <img src="assets/icon.png" alt="TermLauncher" width="128">
</p>

<p align="center">
  <strong>一鍵開啟終端，直達工作目錄</strong>
</p>

<p align="center">
  繁體中文 | <a href="README.md">English</a>
</p>

---

## 簡介

TermLauncher 是一個跨平台桌面應用，讓你能夠快速開啟終端並自動進入指定的工作目錄。在 Windows 上支援 **WSL**、**PowerShell**、**Git Bash** 等終端，在 macOS 和 Linux 上也提供實驗性支援。特別適合需要頻繁在不同專案間切換的開發者。

## 功能特色

| 功能             | 說明                                       |
| ---------------- | ------------------------------------------ |
| **多終端支援**   | WSL、PowerShell、Git Bash、CMD、自訂終端   |
| **目錄分組**     | 將專案按工作、個人、學習等分類             |
| **最愛功能**     | 標記常用目錄，快速存取                     |
| **搜尋過濾**     | 依名稱、路徑、群組快速找到目標目錄         |
| **最近使用**     | 顯示最近開啟的目錄，可設定保留數量上限     |
| **自訂終端**     | 自定義終端命令與參數                       |
| **拖拉排序**     | 最愛、群組、目錄皆可拖拉調整順序           |
| **右鍵選單**     | 快速操作（選擇終端、加入最愛、編輯、刪除） |
| **路徑失效預警** | 自動偵測並標示無效路徑                     |
| **開機自動啟動** | 支援 Portable 與安裝版                     |
| **進階匯出匯入** | 選擇性匯出、合併/覆蓋匯入                  |
| **鍵盤快捷鍵**   | 全域快捷鍵與應用內快捷鍵                   |
| **主題切換**     | 深色/淺色主題                              |
| **多語系**       | 繁體中文、English                          |

## 鍵盤快捷鍵

### 全域

| 快捷鍵    | 動作                    |
| --------- | ----------------------- |
| Alt+Space | 顯示/隱藏視窗（可自訂） |

### 應用內

| 快捷鍵   | 動作              |
| -------- | ----------------- |
| Ctrl+1~5 | 切換分頁          |
| Ctrl+N   | 新增目錄          |
| Ctrl+F   | 搜尋              |
| Escape   | 關閉彈窗/清空搜尋 |
| Enter    | 開啟選取的目錄    |

## 安裝方式

### 方法一：下載 exe（推薦）

1. 前往 [Releases](../../releases) 頁面
2. 下載 `TermLauncher-Portable.exe`
3. 雙擊執行即可

### 方法二：從原始碼運行

```bash
# 複製專案
git clone https://github.com/xjin9612/TermLauncher.git
cd TermLauncher

# 安裝依賴
npm install

# 運行
npm start
```

### 方法三：自行打包

```bash
# 打包成 Portable 版
npm run build

# 打包成安裝版
npm run build:installer
```

## 使用方式

### 新增目錄

1. 點擊展開按鈕
2. 輸入名稱、選擇路徑
3. 選擇終端（WSL、PowerShell、Git Bash、自訂）
4. 點擊「新增目錄」

### 開啟終端

直接 **點擊目錄卡片** 即可開啟終端。

### 路徑轉換

Windows 路徑會自動轉換為 WSL 格式：

```
D:\Projects\my-app  →  /mnt/d/Projects/my-app
```

## 文檔

| 文檔                                    | 說明         |
| --------------------------------------- | ------------ |
| [PRD.md](docs/PRD.md)                   | 產品需求文檔 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技術架構文檔 |
| [UI_DESIGN.md](docs/UI_DESIGN.md)       | UI 設計規範  |
| [CHANGELOG.md](docs/CHANGELOG.md)       | 版本變更記錄 |

## 系統需求

### Windows（完整支援）

- Windows 10 (1903+) / Windows 11
- [Windows Terminal](https://aka.ms/terminal)
- WSL 2 + Ubuntu（如需使用 WSL 功能）

### macOS（實驗性支援）

- macOS 10.15 (Catalina) 或更新版本
- 支援的終端：Terminal.app、iTerm2、Hyper、Warp、Alacritty、Kitty
- 需從原始碼建置（`npm run build:mac`）

### Linux（實驗性支援）

- Ubuntu 20.04+ / Fedora 35+ / Arch Linux 等主流發行版
- 支援的終端：GNOME Terminal、Konsole、Tilix、Alacritty、Kitty、xterm、Terminator
- 需從原始碼建置（`npm run build:linux`）

> **注意**：macOS 和 Linux 支援目前為實驗性，部分功能可能無法正常運作。歡迎回報問題！

## 技術棧

- **Electron** - 跨平台桌面應用框架
- **Node.js** - 後端運行環境
- **HTML/CSS/JS** - 前端介面（原生 ES Modules，無前端框架）
- **Vitest** - 單元測試框架
- **ESLint** - 程式碼檢查
- **Prettier** - 程式碼格式化

## 授權

MIT License © 2026
