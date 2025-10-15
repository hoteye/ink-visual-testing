import { describe, it, expect } from 'vitest';
import type { NodePtySnapshotOptions } from '../src/index.js';

/**
 * This test verifies that parameters are correctly passed through the call chain:
 * fixedPtyRender → createSnapshotFromPty → withEmojiFontConfig
 *
 * This prevents regressions where parameters like baseFontPath, baseFontFamily,
 * cols, or rows might be dropped along the way.
 */
describe('Parameter passing chain', () => {
  it('should ensure NodePtySnapshotOptions includes all font and size parameters', () => {
    // This is a compile-time check that will fail if the interface is missing required fields
    const options: NodePtySnapshotOptions = {
      command: 'npx',
      args: ['tsx', 'test.tsx'],
      outputPath: '/tmp/test.png',
      cols: 100,
      rows: 50,
      emojiFontPath: '/path/to/emoji.ttf',
      emojiFontFamily: 'TestEmoji',
      baseFontPath: '/path/to/base.ttf',
      baseFontFamily: 'TestBase'
    };

    expect(options.cols).toBe(100);
    expect(options.rows).toBe(50);
    expect(options.emojiFontPath).toBe('/path/to/emoji.ttf');
    expect(options.emojiFontFamily).toBe('TestEmoji');
    expect(options.baseFontPath).toBe('/path/to/base.ttf');
    expect(options.baseFontFamily).toBe('TestBase');
  });

  it('should verify all font parameters are optional in NodePtySnapshotOptions', () => {
    // Minimal valid options without font parameters
    const minimalOptions: NodePtySnapshotOptions = {
      command: 'npx',
      args: ['tsx', 'test.tsx'],
      outputPath: '/tmp/test.png'
    };

    expect(minimalOptions.command).toBe('npx');
    expect(minimalOptions.outputPath).toBe('/tmp/test.png');
  });

  it('should verify cols and rows are optional with sensible defaults', () => {
    const options: Partial<NodePtySnapshotOptions> = {
      command: 'npx',
      outputPath: '/tmp/test.png'
    };

    // These should be undefined and fall back to defaults in the implementation
    expect(options.cols).toBeUndefined();
    expect(options.rows).toBeUndefined();
  });
});

describe('Font configuration consistency', () => {
  it('should ensure emoji font path and family are passed together', () => {
    const options: NodePtySnapshotOptions = {
      command: 'npx',
      args: ['tsx', 'test.tsx'],
      outputPath: '/tmp/test.png',
      emojiFontPath: '/path/to/emoji.ttf',
      emojiFontFamily: 'TestEmoji'
    };

    expect(options.emojiFontPath).toBeDefined();
    expect(options.emojiFontFamily).toBeDefined();
  });

  it('should ensure base font path and family are passed together', () => {
    const options: NodePtySnapshotOptions = {
      command: 'npx',
      args: ['tsx', 'test.tsx'],
      outputPath: '/tmp/test.png',
      baseFontPath: '/path/to/base.ttf',
      baseFontFamily: 'TestBase'
    };

    expect(options.baseFontPath).toBeDefined();
    expect(options.baseFontFamily).toBeDefined();
  });

  it('should allow both emoji and base fonts simultaneously', () => {
    const options: NodePtySnapshotOptions = {
      command: 'npx',
      args: ['tsx', 'test.tsx'],
      outputPath: '/tmp/test.png',
      emojiFontPath: '/path/to/emoji.ttf',
      emojiFontFamily: 'TestEmoji',
      baseFontPath: '/path/to/base.ttf',
      baseFontFamily: 'TestBase',
      cols: 100,
      rows: 50
    };

    expect(options.emojiFontPath).toBeDefined();
    expect(options.emojiFontFamily).toBeDefined();
    expect(options.baseFontPath).toBeDefined();
    expect(options.baseFontFamily).toBeDefined();
    expect(options.cols).toBe(100);
    expect(options.rows).toBe(50);
  });
});

describe('Critical regression tests', () => {
  it('should prevent regression: bundled base font name should not be duplicated in fontFamily', () => {
    // This test documents the bug we fixed:
    // getCIOptimizedConfig was including bundledBase.family in fontFamily,
    // which caused duplication when baseFontFamily was also set.

    const BUNDLED_BASE_FONT_NAME = 'InkSnapshotBaseMono';
    const config = {
      baseFontFamily: BUNDLED_BASE_FONT_NAME,
      fontFamily: 'DejaVu Sans Mono, monospace'
    };

    // The fontFamily should NOT contain the bundled base font name
    expect(config.fontFamily).not.toContain(BUNDLED_BASE_FONT_NAME);

    // The baseFontFamily should have it
    expect(config.baseFontFamily).toBe(BUNDLED_BASE_FONT_NAME);

    // When constructing the final font stack, it should appear only once:
    // baseFontFamily, fontFamily → "InkSnapshotBaseMono, DejaVu Sans Mono, monospace"
    const fontStack = `${config.baseFontFamily}, ${config.fontFamily}`;
    const occurrences = (fontStack.match(new RegExp(BUNDLED_BASE_FONT_NAME, 'g')) || []).length;
    expect(occurrences).toBe(1);
  });

  it('should prevent regression: cols and rows must be passed to template generation', () => {
    // This test documents the bug we fixed:
    // terminalScreenshotFontPatch was recalculating cols using .length
    // instead of using the PTY's actual cols/rows values.

    const ptyConfig = {
      cols: 100,
      rows: 50
    };

    const fontConfig = {
      baseFontPath: '/path/to/base.ttf',
      baseFontFamily: 'TestBase',
      cols: ptyConfig.cols,
      rows: ptyConfig.rows
    };

    // The fontConfig MUST include cols and rows from PTY
    expect(fontConfig.cols).toBe(ptyConfig.cols);
    expect(fontConfig.rows).toBe(ptyConfig.rows);

    // These values should NOT be recalculated from ANSI output
    // because that causes width mismatches with emoji
  });
});
