/**
 * IPC 驗證器測試
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// 使用 createRequire 來導入 CommonJS 模組
const require = createRequire(import.meta.url);
const {
  validateString,
  validateBoolean,
  validateObject,
  validatePositiveInteger,
  validateSafeUrl,
  validateDirectory,
  validateConfig,
  validateExportOptions,
  validateImportOptions,
  validateLocaleCode,
} = require('../src/main/utils/ipc-validators.js');

describe('validateString', () => {
  it('應該接受有效字串', () => {
    expect(validateString('hello', 'test').valid).toBe(true);
    expect(validateString('hello world', 'test').valid).toBe(true);
    expect(validateString('中文字串', 'test').valid).toBe(true);
  });

  it('應該拒絕非字串', () => {
    expect(validateString(123, 'test').valid).toBe(false);
    expect(validateString(null, 'test').valid).toBe(false);
    expect(validateString(undefined, 'test').valid).toBe(false);
    expect(validateString({}, 'test').valid).toBe(false);
    expect(validateString([], 'test').valid).toBe(false);
  });

  it('應該拒絕空字串', () => {
    expect(validateString('', 'test').valid).toBe(false);
    expect(validateString('   ', 'test').valid).toBe(false);
  });
});

describe('validateBoolean', () => {
  it('應該接受布林值', () => {
    expect(validateBoolean(true, 'test').valid).toBe(true);
    expect(validateBoolean(false, 'test').valid).toBe(true);
  });

  it('應該拒絕非布林值', () => {
    expect(validateBoolean('true', 'test').valid).toBe(false);
    expect(validateBoolean(1, 'test').valid).toBe(false);
    expect(validateBoolean(null, 'test').valid).toBe(false);
    expect(validateBoolean(undefined, 'test').valid).toBe(false);
  });
});

describe('validateObject', () => {
  it('應該接受物件', () => {
    expect(validateObject({}, 'test').valid).toBe(true);
    expect(validateObject({ key: 'value' }, 'test').valid).toBe(true);
  });

  it('應該拒絕非物件', () => {
    expect(validateObject(null, 'test').valid).toBe(false);
    expect(validateObject([], 'test').valid).toBe(false);
    expect(validateObject('string', 'test').valid).toBe(false);
    expect(validateObject(123, 'test').valid).toBe(false);
    expect(validateObject(undefined, 'test').valid).toBe(false);
  });
});

describe('validatePositiveInteger', () => {
  it('應該接受正整數', () => {
    expect(validatePositiveInteger(0, 'test').valid).toBe(true);
    expect(validatePositiveInteger(1, 'test').valid).toBe(true);
    expect(validatePositiveInteger(100, 'test').valid).toBe(true);
  });

  it('應該拒絕負數', () => {
    expect(validatePositiveInteger(-1, 'test').valid).toBe(false);
    expect(validatePositiveInteger(-100, 'test').valid).toBe(false);
  });

  it('應該拒絕非整數', () => {
    expect(validatePositiveInteger(1.5, 'test').valid).toBe(false);
    expect(validatePositiveInteger('1', 'test').valid).toBe(false);
  });
});

describe('validateSafeUrl', () => {
  it('應該接受 http/https URL', () => {
    expect(validateSafeUrl('https://example.com').valid).toBe(true);
    expect(validateSafeUrl('http://example.com').valid).toBe(true);
    expect(validateSafeUrl('https://example.com/path?query=1').valid).toBe(true);
  });

  it('應該拒絕非 http/https URL', () => {
    expect(validateSafeUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateSafeUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateSafeUrl('data:text/html,<script>alert(1)</script>').valid).toBe(false);
    expect(validateSafeUrl('ftp://example.com').valid).toBe(false);
  });

  it('應該拒絕無效 URL', () => {
    expect(validateSafeUrl('not-a-url').valid).toBe(false);
    expect(validateSafeUrl('').valid).toBe(false);
    expect(validateSafeUrl(123).valid).toBe(false);
  });
});

describe('validateDirectory', () => {
  it('應該接受有效目錄物件', () => {
    expect(validateDirectory({ id: 1, path: '/home/user' }).valid).toBe(true);
    expect(validateDirectory({ id: 'dir-1', path: 'C:\\Users' }).valid).toBe(true);
  });

  it('應該拒絕缺少必要欄位', () => {
    expect(validateDirectory({ path: '/home' }).valid).toBe(false);
    expect(validateDirectory({ id: 1 }).valid).toBe(false);
    expect(validateDirectory({}).valid).toBe(false);
  });

  it('應該拒絕非物件', () => {
    expect(validateDirectory(null).valid).toBe(false);
    expect(validateDirectory('string').valid).toBe(false);
  });

  it('應該拒絕空路徑', () => {
    expect(validateDirectory({ id: 1, path: '' }).valid).toBe(false);
    expect(validateDirectory({ id: 1, path: '   ' }).valid).toBe(false);
  });
});

describe('validateConfig', () => {
  it('應該接受有效配置', () => {
    const validConfig = {
      directories: [],
      groups: [],
      terminals: [],
      settings: {},
    };
    expect(validateConfig(validConfig).valid).toBe(true);
  });

  it('應該接受帶有資料的配置', () => {
    const validConfig = {
      directories: [{ id: 1, path: '/home' }],
      groups: [{ id: 'default', name: 'Default' }],
      terminals: [{ id: 'wsl', name: 'WSL' }],
      settings: { theme: 'dark' },
    };
    expect(validateConfig(validConfig).valid).toBe(true);
  });

  it('應該拒絕缺少必要欄位', () => {
    expect(validateConfig({}).valid).toBe(false);
    expect(validateConfig({ directories: [] }).valid).toBe(false);
    expect(validateConfig({ directories: [], groups: [] }).valid).toBe(false);
  });

  it('應該拒絕非陣列欄位', () => {
    expect(validateConfig({ directories: {}, groups: [], terminals: [] }).valid).toBe(false);
    expect(validateConfig({ directories: [], groups: 'not-array', terminals: [] }).valid).toBe(false);
  });
});

describe('validateExportOptions', () => {
  it('應該接受有效匯出選項', () => {
    expect(validateExportOptions({}).valid).toBe(true);
    expect(validateExportOptions({ exportTerminals: true }).valid).toBe(true);
    expect(validateExportOptions({
      exportTerminals: true,
      exportGroups: false,
      exportDirectories: true,
      exportFavorites: true,
      exportSettings: false,
    }).valid).toBe(true);
  });

  it('應該拒絕非布林選項', () => {
    expect(validateExportOptions({ exportTerminals: 'yes' }).valid).toBe(false);
    expect(validateExportOptions({ exportGroups: 1 }).valid).toBe(false);
  });
});

describe('validateImportOptions', () => {
  it('應該接受有效匯入選項', () => {
    expect(validateImportOptions({}).valid).toBe(true);
    expect(validateImportOptions({ mergeTerminals: true }).valid).toBe(true);
    expect(validateImportOptions({
      mergeTerminals: true,
      mergeGroups: false,
      mergeDirectories: true,
      mergeFavorites: true,
      mergeSettings: false,
    }).valid).toBe(true);
  });

  it('應該拒絕非布林選項', () => {
    expect(validateImportOptions({ mergeTerminals: 'yes' }).valid).toBe(false);
    expect(validateImportOptions({ mergeGroups: 1 }).valid).toBe(false);
  });
});

describe('validateLocaleCode', () => {
  it('應該接受有效語系代碼', () => {
    expect(validateLocaleCode('zh-TW').valid).toBe(true);
    expect(validateLocaleCode('en-US').valid).toBe(true);
    expect(validateLocaleCode('ja').valid).toBe(true);
    expect(validateLocaleCode('de').valid).toBe(true);
  });

  it('應該拒絕無效格式', () => {
    expect(validateLocaleCode('zh_TW').valid).toBe(false);
    expect(validateLocaleCode('ZH-TW').valid).toBe(false);
    expect(validateLocaleCode('chinese').valid).toBe(false);
    expect(validateLocaleCode('').valid).toBe(false);
    expect(validateLocaleCode('z').valid).toBe(false);
  });

  it('應該拒絕非字串', () => {
    expect(validateLocaleCode(123).valid).toBe(false);
    expect(validateLocaleCode(null).valid).toBe(false);
  });
});
