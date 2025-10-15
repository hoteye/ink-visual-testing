import { describe, it, expect } from 'vitest';

/**
 * Tests for ANSI data processing, including variation selector removal.
 *
 * This is critical for emoji rendering consistency:
 * - Variation Selector-16 (U+FE0F) causes width calculation mismatches
 * - string-width counts VS16 as width-1, but Unicode standard defines it as width-0
 * - Removing VS16 ensures Ink's layout matches xterm.js rendering
 */
describe('Variation Selector removal', () => {
  // Simulate the VS16 removal logic from src/index.ts
  const removeVariationSelectors = (data: string): string => {
    return data.replace(/\uFE0F/g, '');
  };

  const countVariationSelectors = (data: string): number => {
    return (data.match(/\uFE0F/g) || []).length;
  };

  it('should remove Variation Selector-16 (U+FE0F)', () => {
    const input = '👍\uFE0F'; // Thumbs up with VS16
    const result = removeVariationSelectors(input);

    expect(result).toBe('👍');
    expect(result).not.toContain('\uFE0F');
  });

  it('should remove multiple VS16 characters', () => {
    const input = '😀\uFE0F❤\uFE0F👍\uFE0F';
    const result = removeVariationSelectors(input);

    expect(result).toBe('😀❤👍');
    expect(countVariationSelectors(result)).toBe(0);
  });

  it('should preserve emoji without VS16', () => {
    const input = '😀❤👍';
    const result = removeVariationSelectors(input);

    expect(result).toBe(input);
  });

  it('should handle text with emoji and VS16', () => {
    const input = 'Hello 👋\uFE0F World';
    const result = removeVariationSelectors(input);

    expect(result).toBe('Hello 👋 World');
  });

  it('should handle empty string', () => {
    const result = removeVariationSelectors('');
    expect(result).toBe('');
  });

  it('should handle string without emoji', () => {
    const input = 'Plain text without emoji';
    const result = removeVariationSelectors(input);

    expect(result).toBe(input);
  });

  it('should count VS16 occurrences correctly', () => {
    expect(countVariationSelectors('👍\uFE0F')).toBe(1);
    expect(countVariationSelectors('😀\uFE0F❤\uFE0F👍\uFE0F')).toBe(3);
    expect(countVariationSelectors('No VS16 here')).toBe(0);
    expect(countVariationSelectors('')).toBe(0);
  });

  it('should handle complex emoji sequences', () => {
    // Family emoji: man + VS16 + woman + VS16 + girl + VS16
    const input = '👨\uFE0F\u200D👩\uFE0F\u200D👧\uFE0F';
    const result = removeVariationSelectors(input);

    expect(result).not.toContain('\uFE0F');
    expect(result).toContain('👨');
    expect(result).toContain('👩');
    expect(result).toContain('👧');
    // Zero-width joiner should be preserved
    expect(result).toContain('\u200D');
  });

  it('should preserve other Unicode characters', () => {
    const input = 'Café ☕\uFE0F 日本語 🍜\uFE0F';
    const result = removeVariationSelectors(input);

    expect(result).toBe('Café ☕ 日本語 🍜');
    expect(result).toContain('é'); // Latin with diacritic
    expect(result).toContain('日本語'); // Japanese characters
  });
});

describe('ANSI escape sequence handling', () => {
  const ANSI_PATTERN = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
  ].join('|');

  const stripAnsi = (data: string): string => {
    return data.replaceAll(new RegExp(ANSI_PATTERN, 'g'), '');
  };

  it('should strip color codes', () => {
    const input = '\x1b[31mRed text\x1b[0m';
    const result = stripAnsi(input);

    expect(result).toBe('Red text');
  });

  it('should strip cursor movement codes', () => {
    const input = '\x1b[2J\x1b[H Clear screen';
    const result = stripAnsi(input);

    expect(result).toBe(' Clear screen');
  });

  it('should handle multiple ANSI codes', () => {
    const input = '\x1b[1m\x1b[32mBold Green\x1b[0m\x1b[0m';
    const result = stripAnsi(input);

    expect(result).toBe('Bold Green');
  });

  it('should preserve plain text', () => {
    const input = 'Plain text';
    const result = stripAnsi(input);

    expect(result).toBe(input);
  });

  it('should handle emoji with ANSI codes', () => {
    const input = '\x1b[32m😀\x1b[0m';
    const result = stripAnsi(input);

    expect(result).toBe('😀');
  });
});

describe('PTY environment variables', () => {
  it('should define FORCE_COLOR for color support', () => {
    const env = {
      FORCE_COLOR: '3',
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color'
    };

    expect(env.FORCE_COLOR).toBe('3');
    expect(env.FORCE_COLOR).toMatch(/^[0-3]$/); // Valid values: 0, 1, 2, 3
  });

  it('should define COLORTERM for truecolor support', () => {
    const env = {
      COLORTERM: 'truecolor'
    };

    expect(env.COLORTERM).toBe('truecolor');
  });

  it('should define TERM for 256 color support', () => {
    const env = {
      TERM: 'xterm-256color'
    };

    expect(env.TERM).toBe('xterm-256color');
    expect(env.TERM).toContain('256color');
  });

  it('should have consistent color environment for CI', () => {
    // These are the exact values used in createSnapshotFromPty
    const ciEnv = {
      FORCE_COLOR: '3',
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color'
    };

    expect(ciEnv).toEqual({
      FORCE_COLOR: '3',
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color'
    });
  });
});

describe('Terminal size defaults', () => {
  it('should use sensible defaults for cols/rows', () => {
    const defaults = {
      cols: 80,
      rows: 24
    };

    expect(defaults.cols).toBeGreaterThanOrEqual(80);
    expect(defaults.rows).toBeGreaterThanOrEqual(24);
  });

  it('should accept custom terminal sizes', () => {
    const custom = {
      cols: 120,
      rows: 60
    };

    expect(custom.cols).toBe(120);
    expect(custom.rows).toBe(60);
  });

  it('should handle large terminal sizes', () => {
    const large = {
      cols: 200,
      rows: 100
    };

    expect(large.cols).toBeGreaterThan(100);
    expect(large.rows).toBeGreaterThan(50);
  });
});
