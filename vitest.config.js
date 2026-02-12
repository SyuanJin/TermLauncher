import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 測試檔案位置
    include: ['tests/**/*.test.js'],
    // 停用檔案平行執行（config-module 與 mcp-tools 共用 configPath）
    fileParallelism: false,
    // 全域變數（describe, it, expect）
    globals: true,
    // 測試環境
    environment: 'node',
    // Electron mock setup
    setupFiles: ['tests/setup-electron-mock.js'],
    // 覆蓋率設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/**/*.js'],
      // 排除強依賴 Electron runtime 的模組（無法在純 Node 環境中測試）
      exclude: ['src/main/index.js', 'src/main/window.js', 'src/main/tray.js'],
      // 覆蓋率門檻（防止回歸）
      thresholds: {
        statements: 50,
        branches: 75,
        functions: 35,
      },
    },
  },
});
