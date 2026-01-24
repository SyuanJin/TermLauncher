# TermLauncher 發布指南

> 本文件說明如何打包應用程式並發布到 GitHub Release

---

## 1. 發布前檢查清單

### 1.1 程式碼準備

- [ ] 所有功能已測試通過
- [ ] `npm start` 可正常運行
- [ ] 程式碼已格式化 (`npm run format`)
- [ ] 所有變更已提交

### 1.2 版本號更新

修改 `package.json` 中的版本號：

```json
{
  "version": "1.0.0"
}
```

版本號規則（[語意化版本](https://semver.org/lang/zh-TW/)）：
- **主版本號**：不相容的 API 變更
- **次版本號**：向下相容的功能新增
- **修訂號**：向下相容的問題修正

---

## 2. 打包應用程式

### 2.1 環境準備

確保已安裝依賴：

```bash
npm install
```

### 2.2 打包指令

```bash
# 打包 Portable 版（免安裝，單一 exe）
npm run build

# 打包安裝版（有安裝精靈）
npm run build:installer

# 同時打包兩種版本
npm run build && npm run build:installer
```

### 2.3 打包輸出

打包完成後，檔案在 `dist/` 資料夾：

```
dist/
├── TermLauncher-Portable.exe    # 免安裝版
├── TermLauncher-Setup-1.0.0.exe # 安裝版
└── win-unpacked/                # 未打包的檔案（可刪除）
```

### 2.4 常見問題

#### 問題：Cannot create symbolic link

**原因**：Windows 建立符號連結需要管理員權限

**解法**：

1. 以**系統管理員身份**執行終端或 IDE
2. 或啟用 Windows **開發者模式**：
   - 設定 → 系統 → 開發人員選項 → 開啟

#### 問題：default Electron icon is used

**原因**：找不到應用程式圖示

**解法**：確認 `assets/icon.ico` 存在，且 `package.json` 設定正確：

```json
{
  "build": {
    "win": {
      "icon": "assets/icon.ico"
    }
  }
}
```

---

## 3. 測試打包結果

發布前務必測試打包後的 exe：

### 3.1 Portable 版測試

1. 執行 `dist/TermLauncher-Portable.exe`
2. 測試所有功能：
   - [ ] 新增目錄
   - [ ] 開啟 WSL 終端
   - [ ] 開啟 PowerShell 終端
   - [ ] 系統托盤
   - [ ] 全域快捷鍵

### 3.2 安裝版測試

1. 執行 `dist/TermLauncher-Setup-x.x.x.exe`
2. 完成安裝流程
3. 從開始選單啟動
4. 測試所有功能
5. 測試解除安裝

---

## 4. 提交並建立 Tag

### 4.1 提交最終變更

```bash
git add .
git commit -m "chore: release v1.0.0"
```

### 4.2 建立版本 Tag

```bash
# 建立標註標籤
git tag -a v1.0.0 -m "v1.0.0 初始發布"

# 推送到 GitHub
git push origin main
git push origin v1.0.0
```

---

## 5. 建立 GitHub Release

### 5.1 網頁操作方式

1. 前往 GitHub 專案頁面
2. 點擊右側 **Releases** → **Create a new release**
3. 填寫資訊：

| 欄位 | 內容 |
|------|------|
| **Choose a tag** | 選擇 `v1.0.0` |
| **Release title** | `v1.0.0 - 初始發布` |
| **Description** | 見下方範本 |

4. 上傳檔案：
   - `TermLauncher-Portable.exe`
   - `TermLauncher-Setup-1.0.0.exe`

5. 點擊 **Publish release**

### 5.2 Release 描述範本

```markdown
## ✨ TermLauncher v1.0.0

第一個正式版本！

### 功能
- 🐧 支援 WSL Ubuntu 終端
- ⚡ 支援 PowerShell 終端
- 📁 目錄分組管理
- 🔍 搜尋過濾
- 🕐 最近使用記錄
- ⌨️ 全域快捷鍵 (Alt+Space)
- 🔔 系統托盤
- 💾 設定匯出/匯入

### 下載
| 檔案 | 說明 |
|------|------|
| `TermLauncher-Portable.exe` | 免安裝版，下載即用 |
| `TermLauncher-Setup-1.0.0.exe` | 安裝版，含開始選單捷徑 |

### 系統需求
- Windows 10 (1903+) / Windows 11
- [Windows Terminal](https://aka.ms/terminal)
- WSL2 + Ubuntu（如需使用 WSL 功能）

### 安裝說明
**Portable 版**：下載後直接執行，無需安裝

**安裝版**：執行安裝程式，依照指示完成安裝
```

### 5.3 GitHub CLI 方式（可選）

如果已安裝 [GitHub CLI](https://cli.github.com/)：

```bash
# 建立 Release 並上傳檔案
gh release create v1.0.0 \
  dist/TermLauncher-Portable.exe \
  dist/TermLauncher-Setup-1.0.0.exe \
  --title "v1.0.0 - 初始發布" \
  --notes-file docs/RELEASE_NOTES.md
```

---

## 6. 發布後檢查

- [ ] Release 頁面顯示正確
- [ ] 下載連結可正常下載
- [ ] 下載的 exe 可正常執行
- [ ] README 的 Release 連結正確

---

## 7. 更新版本流程

後續發布新版本時：

```bash
# 1. 修改 package.json 版本號
# 2. 提交變更
git add .
git commit -m "chore: release v1.1.0"

# 3. 打包
npm run build

# 4. 建立 Tag
git tag -a v1.1.0 -m "v1.1.0"
git push origin main
git push origin v1.1.0

# 5. 到 GitHub 建立 Release
```

---

## 附錄：完整指令速查

```bash
# === 打包 ===
npm run build              # Portable 版
npm run build:installer    # 安裝版

# === Git 操作 ===
git add .
git commit -m "chore: release vX.X.X"
git tag -a vX.X.X -m "vX.X.X"
git push origin main
git push origin vX.X.X

# === 清理 ===
rm -rf dist/               # 刪除打包輸出
rm -rf node_modules/       # 刪除依賴（需重新 npm install）
```
