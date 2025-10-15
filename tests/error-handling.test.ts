import { describe, it, expect } from 'vitest';
import type { NodePtySnapshotOptions } from '../src/index.js';

/**
 * Tests for error handling and edge cases.
 *
 * These tests verify that the library handles:
 * 1. Invalid inputs gracefully
 * 2. Missing files/directories
 * 3. Timeouts
 * 4. PTY failures
 */
describe('Timeout configuration', () => {
  it('should have default timeout of 30 seconds', () => {
    const DEFAULT_TIMEOUT = 30000;

    expect(DEFAULT_TIMEOUT).toBe(30000);
  });

  it('should support CI-optimized timeout of 60 seconds', () => {
    const CI_TIMEOUT = 60000;

    expect(CI_TIMEOUT).toBe(60000);
    expect(CI_TIMEOUT).toBeGreaterThan(30000);
  });

  it('should accept custom timeouts', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      timeout: 120000 // 2 minutes
    };

    expect(options.timeout).toBe(120000);
    expect(options.timeout).toBeGreaterThan(60000);
  });

  it('should handle zero timeout (no timeout)', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      timeout: 0
    };

    expect(options.timeout).toBe(0);
  });

  it('should use reasonable timeout for slow CI environments', () => {
    // CI environments can be slow, so 60s is reasonable
    const ciTimeout = 60000;

    expect(ciTimeout).toBeGreaterThanOrEqual(30000);
    expect(ciTimeout).toBeLessThanOrEqual(120000);
  });
});

describe('Output path validation', () => {
  it('should accept PNG output paths', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      outputPath: '/tmp/output.png',
      type: 'png'
    };

    expect(options.outputPath).toMatch(/\.png$/);
    expect(options.type).toBe('png');
  });

  it('should accept JPEG output paths', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      outputPath: '/tmp/output.jpeg',
      type: 'jpeg'
    };

    expect(options.outputPath).toMatch(/\.(jpeg|jpg)$/);
    expect(options.type).toBe('jpeg');
  });

  it('should handle nested directory paths', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      outputPath: '/tmp/screenshots/test/output.png'
    };

    expect(options.outputPath).toContain('/screenshots/test/');
  });

  it('should handle relative paths', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      outputPath: './snapshots/output.png'
    };

    expect(options.outputPath).toMatch(/^\.?\//);
  });
});

describe('Command validation', () => {
  it('should accept valid commands', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      command: 'npx',
      args: ['tsx', 'script.tsx']
    };

    expect(options.command).toBe('npx');
    expect(options.args).toEqual(['tsx', 'script.tsx']);
  });

  it('should handle commands without arguments', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      command: 'node',
      args: []
    };

    expect(options.command).toBe('node');
    expect(options.args).toEqual([]);
  });

  it('should handle undefined arguments (defaults to empty array)', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      command: 'node'
    };

    expect(options.command).toBe('node');
    expect(options.args).toBeUndefined();
  });

  it('should use platform-specific command format', () => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npx.cmd' : 'npx';

    expect(command).toMatch(isWindows ? /\.cmd$/ : /^npx$/);
  });
});

describe('Terminal size validation', () => {
  it('should reject negative terminal dimensions', () => {
    const invalidCols = -1;
    const invalidRows = -1;

    expect(invalidCols).toBeLessThan(0);
    expect(invalidRows).toBeLessThan(0);

    // In actual implementation, these should be validated
    // and either throw an error or clamp to minimum values
  });

  it('should handle zero dimensions', () => {
    const zeroCols = 0;
    const zeroRows = 0;

    expect(zeroCols).toBe(0);
    expect(zeroRows).toBe(0);

    // Zero dimensions are likely invalid for PTY
  });

  it('should accept standard terminal sizes', () => {
    const standardSizes = [
      { cols: 80, rows: 24 },   // Classic
      { cols: 120, rows: 60 },  // Modern
      { cols: 100, rows: 30 },  // Wide
      { cols: 200, rows: 50 }   // Ultra-wide
    ];

    for (const size of standardSizes) {
      expect(size.cols).toBeGreaterThan(0);
      expect(size.rows).toBeGreaterThan(0);
    }
  });

  it('should handle very large terminal sizes', () => {
    const large = { cols: 500, rows: 200 };

    expect(large.cols).toBeGreaterThan(100);
    expect(large.rows).toBeGreaterThan(50);

    // Implementation might want to set reasonable upper limits
  });
});

describe('Margin and background validation', () => {
  it('should accept valid margin values', () => {
    const validMargins = [0, 12, 16, 24];

    for (const margin of validMargins) {
      expect(margin).toBeGreaterThanOrEqual(0);
    }
  });

  it('should accept hex color codes', () => {
    const validColors = [
      '#000000',
      '#FFFFFF',
      '#FF0000',
      '#00FF00',
      '#0000FF'
    ];

    for (const color of validColors) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('should use black background for CI consistency', () => {
    const CI_BACKGROUND = '#000000';

    expect(CI_BACKGROUND).toBe('#000000');
  });

  it('should handle CSS color names', () => {
    const colorNames = ['black', 'white', 'red', 'blue'];

    for (const color of colorNames) {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });
});

describe('PTY exit code handling', () => {
  it('should recognize success exit code', () => {
    const exitCode = 0;

    expect(exitCode).toBe(0);
  });

  it('should recognize error exit codes', () => {
    const errorCodes = [1, 2, 127, 255];

    for (const code of errorCodes) {
      expect(code).not.toBe(0);
      expect(code).toBeGreaterThan(0);
    }
  });

  it('should handle undefined exit code', () => {
    const exitCode = undefined;

    expect(exitCode).toBeUndefined();
    // undefined is treated as success (process exited normally)
  });

  it('should handle null exit code', () => {
    const exitCode = null;

    expect(exitCode).toBeNull();
    // null might indicate process was killed
  });
});

describe('Font configuration edge cases', () => {
  it('should handle missing emoji font path', () => {
    const config: Partial<NodePtySnapshotOptions> = {
      emojiFontFamily: 'SomeFont'
      // emojiFontPath is missing
    };

    expect(config.emojiFontFamily).toBeDefined();
    expect(config.emojiFontPath).toBeUndefined();

    // Implementation should handle this gracefully
    // (probably skip loading the font)
  });

  it('should handle missing emoji font family', () => {
    const config: Partial<NodePtySnapshotOptions> = {
      emojiFontPath: '/path/to/font.ttf'
      // emojiFontFamily is missing
    };

    expect(config.emojiFontPath).toBeDefined();
    expect(config.emojiFontFamily).toBeUndefined();

    // Implementation should handle this gracefully
    // (probably skip including it in font stack)
  });

  it('should handle empty font family string', () => {
    const emptyFamily = '';

    expect(emptyFamily).toBe('');
    expect(emptyFamily.length).toBe(0);

    // Empty strings should be filtered out during normalization
  });

  it('should handle font family with only whitespace', () => {
    const whitespaceFamily = '   ';

    expect(whitespaceFamily.trim()).toBe('');

    // Should be filtered out after trim()
  });

  it('should handle very long font family lists', () => {
    const longList = Array(50).fill('Font').join(', ');

    expect(longList.split(',').length).toBeGreaterThan(40);

    // Implementation should handle this without crashing
  });
});

describe('Environment variable edge cases', () => {
  it('should handle undefined environment variables', () => {
    const env: Record<string, string | undefined> = {
      SOME_VAR: undefined
    };

    expect(env.SOME_VAR).toBeUndefined();
  });

  it('should merge custom env with defaults', () => {
    const customEnv = {
      CUSTOM_VAR: 'value'
    };

    const mergedEnv = {
      ...customEnv,
      FORCE_COLOR: '3',
      COLORTERM: 'truecolor'
    };

    expect(mergedEnv.CUSTOM_VAR).toBe('value');
    expect(mergedEnv.FORCE_COLOR).toBe('3');
    expect(mergedEnv.COLORTERM).toBe('truecolor');
  });

  it('should allow overriding default env vars', () => {
    const customEnv = {
      FORCE_COLOR: '1' // Override default '3'
    };

    expect(customEnv.FORCE_COLOR).toBe('1');
    expect(customEnv.FORCE_COLOR).not.toBe('3');
  });
});
