/**
 * version-utils.js 單元測試
 * 測試版本比較功能
 */
import { describe, it, expect } from 'vitest';

const { isNewerVersion } = require('../src/main/utils/version-utils.js');

describe('isNewerVersion', () => {
  it('應該正確偵測主要版本更新', () => {
    expect(isNewerVersion('2.3.0', '3.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
  });

  it('應該正確偵測次要版本更新', () => {
    expect(isNewerVersion('2.3.0', '2.4.0')).toBe(true);
    expect(isNewerVersion('2.3.0', '2.10.0')).toBe(true);
  });

  it('應該正確偵測修補版本更新', () => {
    expect(isNewerVersion('2.3.0', '2.3.1')).toBe(true);
    expect(isNewerVersion('2.3.0', '2.3.10')).toBe(true);
  });

  it('相同版本不應視為更新', () => {
    expect(isNewerVersion('2.3.0', '2.3.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });

  it('舊版本不應視為更新', () => {
    expect(isNewerVersion('2.3.0', '2.2.0')).toBe(false);
    expect(isNewerVersion('2.3.0', '1.9.9')).toBe(false);
    expect(isNewerVersion('3.0.0', '2.9.9')).toBe(false);
  });

  it('應該處理帶有 v 前綴的版本號', () => {
    expect(isNewerVersion('v2.3.0', 'v2.4.0')).toBe(true);
    expect(isNewerVersion('2.3.0', 'v2.4.0')).toBe(true);
    expect(isNewerVersion('v2.3.0', '2.4.0')).toBe(true);
  });

  it('應該處理不完整的版本號', () => {
    expect(isNewerVersion('2.3', '2.4.0')).toBe(true);
    expect(isNewerVersion('2', '3.0.0')).toBe(true);
  });
});
