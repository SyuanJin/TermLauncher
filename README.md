# TermLauncher

<p align="center">
  <img src="assets/icon.png" alt="TermLauncher" width="128">
</p>

<p align="center">
  <strong>🚀 一鍵開啟終端，直達工作目錄</strong>
</p>

---

## 簡介

TermLauncher 是一個 Windows 桌面應用，讓你能夠快速開啟 Windows Terminal 並自動進入指定的工作目錄。支援 **WSL Ubuntu** 和 **PowerShell**，特別適合需要頻繁在不同專案間切換的開發者。

## ✨ 功能特色

| 功能                    | 說明                           |
| ----------------------- | ------------------------------ |
| 🐧 **WSL / PowerShell** | 支援兩種終端環境，一鍵切換     |
| 📁 **目錄分組**         | 將專案按工作、個人、學習等分類 |
| 🔍 **搜尋過濾**         | 快速找到目標目錄               |
| 🕐 **最近使用**         | 顯示最近開啟的目錄             |
| ⌨️ **全域快捷鍵**       | Alt+Space 快速呼叫（可自訂）   |
| 🔔 **系統托盤**         | 最小化到托盤，隨時待命         |
| 💾 **設定同步**         | 匯出/匯入配置檔                |

## 📦 安裝方式

### 方法一：下載 exe（推薦）

1. 前往 [Releases](../../releases) 頁面
2. 下載 `TermLauncher-Portable.exe`
3. 雙擊執行即可

### 方法二：從原始碼運行

```bash
# 複製專案
git clone https://github.com/SyuanJin/TermLauncher.git
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

## 🚀 使用方式

### 新增目錄

1. 點擊「展開」按鈕
2. 輸入名稱、選擇路徑
3. 選擇類型（WSL / PowerShell）
4. 點擊「新增目錄」

### 開啟終端

直接 **點擊目錄卡片** 即可開啟 Windows Terminal

### 路徑轉換

Windows 路徑會自動轉換為 WSL 格式：

```
D:\Projects\my-app  →  /mnt/d/Projects/my-app
```

## 📚 文檔

| 文檔                                    | 說明         |
| --------------------------------------- | ------------ |
| [PRD.md](docs/PRD.md)                   | 產品需求文檔 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技術架構文檔 |
| [UI_DESIGN.md](docs/UI_DESIGN.md)       | UI 設計規範  |
| [PROGRESS.md](docs/PROGRESS.md)         | 開發進度追蹤 |

## ⚙️ 系統需求

- Windows 10 (1903+) / Windows 11
- [Windows Terminal](https://aka.ms/terminal)
- WSL 2 + Ubuntu（如需使用 WSL 功能）

## 🛠️ 技術棧

- **Electron** - 跨平台桌面應用框架
- **Node.js** - 後端運行環境
- **HTML/CSS/JS** - 前端介面

## 📝 授權

MIT License © 2025
