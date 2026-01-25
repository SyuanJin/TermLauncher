import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 測試檔案位置
    include: ['tests/**/*.test.js'],
    // 全域變數（describe, it, expect）
    globals: true,
    // 測試環境
    environment: 'node',
    // 覆蓋率設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/**/*.js'],
      exclude: ['src/main/index.js', 'src/main/window.js', 'src/main/tray.js'],
    },
  },
});
