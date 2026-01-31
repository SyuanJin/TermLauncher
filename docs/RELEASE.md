# 發布指南

## 自動發布流程（推薦）

推送版本 tag 後，GitHub Actions 會自動：

1. 打包 Portable 版和安裝版
2. 從 CHANGELOG.md 提取版本說明
3. 建立 GitHub Release 並上傳檔案

### 步驟

```bash
# 1. 確認程式碼格式化
npm run format:check

# 2. 更新版本號（package.json）和 CHANGELOG.md

# 3. 提交變更
git add .
git commit -m "chore: bump version to vX.X.X"

# 4. 建立並推送 Tag
git tag vX.X.X
git push origin main
git push origin vX.X.X
```

發布完成後可在 [Releases](https://github.com/SyuanJin/TermLauncher/releases) 頁面查看。

## 手動發布流程

若需手動發布或測試打包：

### 1. 準備

```bash
# 確認可正常運行
npm start

# 格式化程式碼
npm run format
```

### 2. 打包

```bash
npm run build              # Portable 版
npm run build:installer    # 安裝版
npm run build:all          # 同時打包兩種版本
```

輸出位置：

- `dist/TermLauncher-Portable.exe`
- `dist/TermLauncher-Setup-x.x.x.exe`

### 3. 測試

執行打包後的 exe，測試核心功能：

- 新增/開啟目錄
- WSL / PowerShell 終端
- 系統托盤、全域快捷鍵
- 單一實例限制（重複開啟應聚焦現有視窗）

### 4. 上傳

到 GitHub Releases 頁面手動建立 Release 並上傳檔案。

## CHANGELOG 維護

- 每個版本的變更記錄在 `docs/CHANGELOG.md`
- 自動發布時會提取對應版本的內容作為 Release Notes
- 格式須遵循現有結構（`## vX.X.X (YYYY-MM-DD)` + 分類標題）

### 分類標題

| 標題     | 用途           |
| -------- | -------------- |
| `新功能` | 新增的功能     |
| `安全性` | 安全性相關改進 |
| `效能`   | 效能優化       |
| `修復`   | Bug 修復       |
| `其他`   | 重構、文件等   |

## 常見問題

| 問題                        | 解法                           |
| --------------------------- | ------------------------------ |
| Cannot create symbolic link | 以管理員執行，或啟用開發者模式 |
| default Electron icon       | 確認 `assets/icon.ico` 存在    |
| Actions 發布失敗            | 檢查 CHANGELOG.md 格式是否正確 |
