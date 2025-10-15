import { describe, it, expect } from 'vitest';
import { getCIOptimizedConfig } from '../src/index.js';
import { getBundledBaseFont } from '../src/baseFont.js';

describe('getCIOptimizedConfig', () => {
  it('should return bundled base font configuration by default', () => {
    const config = getCIOptimizedConfig();
    const bundledBase = getBundledBaseFont();

    expect(config.baseFontPath).toBe(bundledBase.path);
    expect(config.baseFontFamily).toBe(bundledBase.family);
    expect(config.fontFamily).toBe('DejaVu Sans Mono, monospace');
  });

  it('should not duplicate bundled base font name in fontFamily', () => {
    const config = getCIOptimizedConfig({ baseFont: 'bundled' });
    const bundledBase = getBundledBaseFont();

    // fontFamily should NOT contain the bundled base font name
    // because it will be injected via baseFontFamily
    expect(config.fontFamily).not.toContain(bundledBase.family);
    expect(config.fontFamily).toBe('DejaVu Sans Mono, monospace');
  });

  it('should use system fonts when baseFont is system', () => {
    const config = getCIOptimizedConfig({ baseFont: 'system' });

    expect(config.baseFontPath).toBeUndefined();
    expect(config.baseFontFamily).toBeUndefined();
    expect(config.fontFamily).toBe('DejaVu Sans Mono, monospace');
  });

  it('should configure emoji font when specified', () => {
    const config = getCIOptimizedConfig({ emojiFontKey: 'mono' });

    expect(config.emojiFontPath).toBeDefined();
    expect(config.emojiFontFamily).toBe('InkSnapshotEmojiMono');
  });

  it('should use system emoji when emojiFontKey is system', () => {
    const config = getCIOptimizedConfig({ emojiFontKey: 'system' });

    expect(config.emojiFontPath).toBeUndefined();
    expect(config.emojiFontFamily).toBeUndefined();
  });

  it('should set CI-optimized defaults', () => {
    const config = getCIOptimizedConfig();

    expect(config.timeout).toBe(60000);
    expect(config.margin).toBe(12);
    expect(config.backgroundColor).toBe('#000000');
  });

  it('should support legacy string parameter for emoji font', () => {
    const config = getCIOptimizedConfig('mono');

    expect(config.emojiFontPath).toBeDefined();
    expect(config.emojiFontFamily).toBe('InkSnapshotEmojiMono');
  });
});

describe('Font stack construction', () => {
  it('should construct proper font stack order: emoji → base → fallback', () => {
    const config = getCIOptimizedConfig({
      emojiFontKey: 'mono',
      baseFont: 'bundled'
    });

    const bundledBase = getBundledBaseFont();

    // The final font stack will be constructed as:
    // emojiFontFamily, baseFontFamily, fontFamily
    // which should result in: InkSnapshotEmojiMono, InkSnapshotBaseMono, DejaVu Sans Mono, monospace

    expect(config.emojiFontFamily).toBe('InkSnapshotEmojiMono');
    expect(config.baseFontFamily).toBe(bundledBase.family);
    expect(config.fontFamily).toBe('DejaVu Sans Mono, monospace');

    // Verify no duplication
    const allParts = [
      config.emojiFontFamily,
      config.baseFontFamily,
      config.fontFamily
    ].filter(Boolean);

    // Check that bundledBase.family appears only once
    const fontStackString = allParts.join(', ');
    const occurrences = (fontStackString.match(new RegExp(bundledBase.family, 'g')) || []).length;
    expect(occurrences).toBe(1);
  });
});
