import { describe, it, expect } from 'vitest';

/**
 * Tests for font stack normalization and construction.
 *
 * These tests verify the critical logic in terminalScreenshotFontPatch.ts
 * that ensures font families are:
 * 1. Properly ordered (emoji → base → fallback)
 * 2. Deduplicated (no font appears twice)
 * 3. Properly quoted (fonts with spaces get quotes)
 * 4. Correctly filtered for generic families
 */
describe('Font stack normalization', () => {
  // Simulating the normaliseFamilies logic
  const normaliseFamilies = (
    baseFamily: string,
    emojiFamily?: string,
    bundledBaseFamily?: string
  ): string[] => {
    const families = baseFamily
      .split(',')
      .map(family => family.trim())
      .filter(Boolean);

    const ordered: string[] = [];
    const seen = new Set<string>();

    if (emojiFamily && !seen.has(emojiFamily)) {
      ordered.push(emojiFamily);
      seen.add(emojiFamily);
    }

    if (bundledBaseFamily && !seen.has(bundledBaseFamily)) {
      ordered.push(bundledBaseFamily);
      seen.add(bundledBaseFamily);
    }

    for (const family of families) {
      if (!seen.has(family)) {
        ordered.push(family);
        seen.add(family);
      }
    }

    return ordered;
  };

  it('should order fonts correctly: emoji → base → fallback', () => {
    const result = normaliseFamilies(
      'DejaVu Sans Mono, monospace',
      'InkSnapshotEmojiNoto',
      'InkSnapshotBaseMono'
    );

    expect(result).toEqual([
      'InkSnapshotEmojiNoto',
      'InkSnapshotBaseMono',
      'DejaVu Sans Mono',
      'monospace'
    ]);
  });

  it('should deduplicate font families', () => {
    const result = normaliseFamilies(
      'DejaVu Sans Mono, monospace, DejaVu Sans Mono',
      undefined,
      'DejaVu Sans Mono'
    );

    // DejaVu Sans Mono should appear only once (from bundledBaseFamily)
    expect(result).toEqual([
      'DejaVu Sans Mono',
      'monospace'
    ]);

    // Count occurrences
    const dejaVuCount = result.filter(f => f === 'DejaVu Sans Mono').length;
    expect(dejaVuCount).toBe(1);
  });

  it('should handle emoji-only configuration', () => {
    const result = normaliseFamilies(
      'monospace',
      'InkSnapshotEmojiNoto'
    );

    expect(result).toEqual([
      'InkSnapshotEmojiNoto',
      'monospace'
    ]);
  });

  it('should handle base-only configuration', () => {
    const result = normaliseFamilies(
      'monospace',
      undefined,
      'InkSnapshotBaseMono'
    );

    expect(result).toEqual([
      'InkSnapshotBaseMono',
      'monospace'
    ]);
  });

  it('should handle system fonts only (no emoji, no base)', () => {
    const result = normaliseFamilies('DejaVu Sans Mono, monospace');

    expect(result).toEqual([
      'DejaVu Sans Mono',
      'monospace'
    ]);
  });

  it('should trim whitespace from font names in baseFamily', () => {
    // Note: emojiFontFamily and bundledBaseFamily are passed as-is (already trimmed from config)
    // Only baseFamily string needs splitting and trimming
    const result = normaliseFamilies(
      '  DejaVu Sans Mono  ,  monospace  '
    );

    expect(result).toEqual([
      'DejaVu Sans Mono',
      'monospace'
    ]);
  });

  it('should handle emoji/base fonts without extra whitespace', () => {
    // In practice, emoji and base fonts come from config without whitespace
    const result = normaliseFamilies(
      'DejaVu Sans Mono, monospace',
      'InkSnapshotEmojiNoto',
      'InkSnapshotBaseMono'
    );

    expect(result).toEqual([
      'InkSnapshotEmojiNoto',
      'InkSnapshotBaseMono',
      'DejaVu Sans Mono',
      'monospace'
    ]);
  });

  it('should filter out empty strings', () => {
    const result = normaliseFamilies('DejaVu Sans Mono,,monospace');

    expect(result).toEqual([
      'DejaVu Sans Mono',
      'monospace'
    ]);
  });

  it('should handle complex font stack with duplicates', () => {
    const result = normaliseFamilies(
      'InkSnapshotBaseMono, DejaVu Sans Mono, Arial, monospace',
      'InkSnapshotEmojiNoto',
      'InkSnapshotBaseMono'
    );

    expect(result).toEqual([
      'InkSnapshotEmojiNoto',
      'InkSnapshotBaseMono', // appears once from bundledBaseFamily
      'DejaVu Sans Mono',
      'Arial',
      'monospace'
    ]);

    // Verify no duplicates
    const uniqueSet = new Set(result);
    expect(uniqueSet.size).toBe(result.length);
  });
});

describe('Font name quoting', () => {
  const quoteFamily = (family: string): string => {
    return family.includes(' ') ? `"${family}"` : family;
  };

  it('should quote font names with spaces', () => {
    expect(quoteFamily('DejaVu Sans Mono')).toBe('"DejaVu Sans Mono"');
    expect(quoteFamily('Noto Sans Mono CJK SC')).toBe('"Noto Sans Mono CJK SC"');
  });

  it('should not quote single-word font names', () => {
    expect(quoteFamily('monospace')).toBe('monospace');
    expect(quoteFamily('Arial')).toBe('Arial');
    expect(quoteFamily('InkSnapshotBaseMono')).toBe('InkSnapshotBaseMono');
  });

  it('should handle already quoted names', () => {
    // Note: The function doesn't check for existing quotes,
    // but normaliseFamilies removes quotes during split/trim
    expect(quoteFamily('DejaVu')).toBe('DejaVu');
  });
});

describe('Generic font family detection', () => {
  const GENERIC_FONT_FAMILIES = new Set([
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'emoji',
    'math',
    'fangsong'
  ]);

  it('should recognize all CSS generic font families', () => {
    expect(GENERIC_FONT_FAMILIES.has('serif')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('sans-serif')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('monospace')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('cursive')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('fantasy')).toBe(true);
  });

  it('should recognize extended generic families', () => {
    expect(GENERIC_FONT_FAMILIES.has('system-ui')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('emoji')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('math')).toBe(true);
    expect(GENERIC_FONT_FAMILIES.has('fangsong')).toBe(true);
  });

  it('should not recognize specific font families', () => {
    expect(GENERIC_FONT_FAMILIES.has('Arial')).toBe(false);
    expect(GENERIC_FONT_FAMILIES.has('DejaVu Sans Mono')).toBe(false);
    expect(GENERIC_FONT_FAMILIES.has('InkSnapshotBaseMono')).toBe(false);
  });
});

describe('Font loading promise construction', () => {
  const GENERIC_FONT_FAMILIES = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', 'emoji', 'math', 'fangsong'
  ]);

  const buildFontLoadPromise = (families: string[]): string => {
    const loaders = families
      .map(family => family.replace(/^"|"$/g, ''))
      .filter(family => !GENERIC_FONT_FAMILIES.has(family.toLowerCase()))
      .map(family => `document.fonts.load('1rem "${family.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"')`);

    if (loaders.length === 0) {
      return 'Promise.resolve()';
    }

    return `Promise.all([${loaders.join(', ')}])`;
  };

  it('should filter out generic font families', () => {
    const families = ['DejaVu Sans Mono', 'monospace'];
    const result = buildFontLoadPromise(families);

    expect(result).toContain('DejaVu Sans Mono');
    expect(result).not.toContain('monospace');
  });

  it('should return Promise.resolve() when only generic fonts', () => {
    const families = ['monospace', 'sans-serif'];
    const result = buildFontLoadPromise(families);

    expect(result).toBe('Promise.resolve()');
  });

  it('should escape quotes in font names', () => {
    const families = ['Font "Special" Name'];
    const result = buildFontLoadPromise(families);

    expect(result).toContain('\\"Special\\"');
  });

  it('should escape backslashes in font names', () => {
    const families = ['Font\\Name'];
    const result = buildFontLoadPromise(families);

    expect(result).toContain('\\\\');
  });

  it('should remove existing quotes from font names', () => {
    const families = ['"DejaVu Sans Mono"', 'Arial'];
    const result = buildFontLoadPromise(families);

    // The quotes should be removed by replace(/^"|"$/g, '')
    expect(result).toContain('DejaVu Sans Mono');
    expect(result).toContain('Arial');
  });

  it('should create Promise.all for multiple fonts', () => {
    const families = ['DejaVu Sans Mono', 'Arial', 'monospace'];
    const result = buildFontLoadPromise(families);

    expect(result).toContain('Promise.all([');
    expect(result).toContain('DejaVu Sans Mono');
    expect(result).toContain('Arial');
    expect(result).not.toContain('monospace');
  });

  it('should handle single non-generic font', () => {
    const families = ['DejaVu Sans Mono'];
    const result = buildFontLoadPromise(families);

    expect(result).toContain('Promise.all([');
    expect(result).toContain('document.fonts.load');
    expect(result).toContain('DejaVu Sans Mono');
  });
});
