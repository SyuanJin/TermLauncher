# 發布指南

## 發布流程

### 1. 準備

```bash
# 確認可正常運行
npm start

# 格式化程式碼
npm run format

# 修改 package.json 版本號
```

### 2. 打包

```bash
npm run build              # Portable 版
npm run build:installer    # 安裝版
```

輸出位置：

- `dist/TermLauncher-Portable.exe`
- `dist/TermLauncher-Setup-x.x.x.exe`

### 3. 測試

執行打包後的 exe，測試核心功能：

- 新增/開啟目錄
- WSL / PowerShell 終端
- 系統托盤、全域快捷鍵

### 4. 發布

```bash
# 提交並建立 Tag
git add .
git commit -m "chore: release vX.X.X"
git tag -a vX.X.X -m "vX.X.X"
git push origin main
git push origin vX.X.X
```

到 GitHub Releases 頁面：

1. 選擇 Tag
2. 填寫標題和描述
3. 上傳 exe 檔案
4. Publish

## 常見問題

| 問題                        | 解法                           |
| --------------------------- | ------------------------------ |
| Cannot create symbolic link | 以管理員執行，或啟用開發者模式 |
| default Electron icon       | 確認 `assets/icon.ico` 存在    |
