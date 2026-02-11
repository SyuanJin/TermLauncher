/**
 * i18n 國際化模組測試
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  getAvailableLocales,
  loadLocale,
  getCurrentLocale,
  t,
  clearLocaleCache,
} = require('../src/main/i18n.js');

beforeEach(() => {
  clearLocaleCache();
});

describe('getAvailableLocales', () => {
  it('應該返回可用語系列表', () => {
    const locales = getAvailableLocales();
    expect(Array.isArray(locales)).toBe(true);
    expect(locales.length).toBeGreaterThanOrEqual(2);

    const codes = locales.map(l => l.code);
    expect(codes).toContain('zh-TW');
    expect(codes).toContain('en-US');
  });

  it('每個語系應有完整的 meta 資訊', () => {
    const locales = getAvailableLocales();
    for (const locale of locales) {
      expect(locale).toHaveProperty('code');
      expect(locale).toHaveProperty('name');
      expect(locale).toHaveProperty('nativeName');
      expect(typeof locale.code).toBe('string');
    }
  });
});

describe('loadLocale', () => {
  it('應該成功載入 zh-TW 語系', () => {
    const data = loadLocale('zh-TW');
    expect(data).not.toBeNull();
    expect(data.meta).toBeDefined();
    expect(data.meta.code).toBe('zh-TW');
  });

  it('應該成功載入 en-US 語系', () => {
    const data = loadLocale('en-US');
    expect(data).not.toBeNull();
    expect(data.meta.code).toBe('en-US');
  });

  it('載入不存在的語系應回退到 zh-TW', () => {
    const data = loadLocale('fr-FR');
    expect(data).not.toBeNull();
    expect(data.meta.code).toBe('zh-TW');
  });

  it('重複載入應使用快取', () => {
    const data1 = loadLocale('zh-TW');
    const data2 = loadLocale('zh-TW');
    expect(data1).toBe(data2); // 同一個引用
  });
});

describe('getCurrentLocale', () => {
  it('未載入時應返回 null', () => {
    expect(getCurrentLocale()).toBeNull();
  });

  it('載入後應返回當前語系', () => {
    loadLocale('en-US');
    const current = getCurrentLocale();
    expect(current).not.toBeNull();
    expect(current.meta.code).toBe('en-US');
  });
});

describe('t (翻譯函式)', () => {
  it('應該正確翻譯已知鍵', () => {
    loadLocale('zh-TW');
    const result = t('tray.showWindow');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('tray.showWindow'); // 不應返回原始 key
  });

  it('未找到鍵時應返回原始 key', () => {
    loadLocale('zh-TW');
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('應該替換參數', () => {
    loadLocale('zh-TW');
    const result = t('toast.updateAvailable', { version: '2.0.0' });
    expect(result).toContain('2.0.0');
  });

  it('未提供的參數應保留佔位符', () => {
    loadLocale('zh-TW');
    const result = t('toast.updateAvailable', {});
    expect(result).toContain('{version}');
  });

  it('未載入語系時應自動載入預設語系', () => {
    const result = t('tray.showWindow');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('tray.showWindow');
  });
});

describe('clearLocaleCache', () => {
  it('清除快取後應重置狀態', () => {
    loadLocale('zh-TW');
    expect(getCurrentLocale()).not.toBeNull();

    clearLocaleCache();
    expect(getCurrentLocale()).toBeNull();
  });
});
