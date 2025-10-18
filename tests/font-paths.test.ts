import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getEmojiFontPath, EMOJI_FONT_OPTIONS } from '../src/emojiFonts.js';
import { getBundledBaseFont } from '../src/baseFont.js';

/**
 * Tests for font path resolution.
 *
 * These tests ensure that bundled fonts are:
 * 1. Correctly located relative to the compiled module
 * 2. Actually exist on the filesystem
 * 3. Have the correct font family names
 */
describe('Emoji font path resolution', () => {
  it('should resolve noto emoji font path', () => {
    const fontPath = getEmojiFontPath('noto');

    expect(fontPath).toBeDefined();
    expect(fontPath).toContain('NotoEmoji-Regular.ttf');
  });

  it('should resolve color emoji font path', () => {
    const fontPath = getEmojiFontPath('color');

    expect(fontPath).toBeDefined();
    expect(fontPath).toContain('NotoColorEmoji.ttf');
  });

  it('should resolve twemoji font path', () => {
    const fontPath = getEmojiFontPath('twemoji');

    expect(fontPath).toBeDefined();
    expect(fontPath).toContain('TwemojiMozilla.ttf');
  });

  it('should resolve unifont path', () => {
    const fontPath = getEmojiFontPath('unifont');

    expect(fontPath).toBeDefined();
    expect(fontPath).toContain('Unifont.otf');
  });

  it('should return undefined for system fonts', () => {
    const fontPath = getEmojiFontPath('system');

    expect(fontPath).toBeUndefined();
  });

  it('should return undefined for unknown font keys', () => {
    const fontPath = getEmojiFontPath('nonexistent');

    expect(fontPath).toBeUndefined();
  });

  it('should resolve to absolute paths', () => {
    const fontPath = getEmojiFontPath('noto');

    expect(fontPath).toBeDefined();
    if (fontPath) {
      expect(path.isAbsolute(fontPath)).toBe(true);
    }
  });

  it('should verify bundled emoji fonts exist', () => {
    const fontsToCheck = ['noto', 'color', 'twemoji', 'unifont'];

    for (const key of fontsToCheck) {
      const fontPath = getEmojiFontPath(key);
      expect(fontPath).toBeDefined();

      if (fontPath) {
        const exists = fs.existsSync(fontPath);
        expect(exists).toBe(true);
      }
    }
  });
});

describe('Emoji font options metadata', () => {
  it('should have consistent structure for all font options', () => {
    for (const [key, option] of Object.entries(EMOJI_FONT_OPTIONS)) {
      expect(option.key).toBe(key);
      expect(option.description).toBeDefined();
      expect(typeof option.description).toBe('string');
    }
  });

  it('should define font families for bundled fonts', () => {
    expect(EMOJI_FONT_OPTIONS.noto.family).toBe('InkSnapshotEmojiNoto');
    expect(EMOJI_FONT_OPTIONS.color.family).toBe('InkSnapshotEmoji');
    expect(EMOJI_FONT_OPTIONS.twemoji.family).toBe('InkSnapshotTwemoji');
    expect(EMOJI_FONT_OPTIONS.unifont.family).toBe('InkSnapshotUnifont');
  });

  it('should not define font family for system fonts', () => {
    expect(EMOJI_FONT_OPTIONS.system.family).toBeUndefined();
    expect(EMOJI_FONT_OPTIONS.system.path).toBeUndefined();
  });

  it('should define font paths for bundled fonts', () => {
    expect(EMOJI_FONT_OPTIONS.noto.path).toBeDefined();
    expect(EMOJI_FONT_OPTIONS.color.path).toBeDefined();
    expect(EMOJI_FONT_OPTIONS.twemoji.path).toBeDefined();
    expect(EMOJI_FONT_OPTIONS.unifont.path).toBeDefined();
  });

  it('should use consistent font naming convention', () => {
    const bundledFonts = Object.values(EMOJI_FONT_OPTIONS).filter(opt => opt.family);

    for (const font of bundledFonts) {
      expect(font.family).toMatch(/^InkSnapshot/);
    }
  });
});

describe('Base font path resolution', () => {
  it('should resolve bundled base font path', () => {
    const baseFont = getBundledBaseFont();

    expect(baseFont.path).toBeDefined();
    expect(baseFont.family).toBeDefined();
  });

  it('should have correct base font family name', () => {
    const baseFont = getBundledBaseFont();

    expect(baseFont.family).toBe('InkSnapshotBaseMono');
  });

  it('should resolve to absolute path', () => {
    const baseFont = getBundledBaseFont();

    expect(path.isAbsolute(baseFont.path)).toBe(true);
  });

  it('should verify bundled base font exists', () => {
    const baseFont = getBundledBaseFont();
    const exists = fs.existsSync(baseFont.path);

    expect(exists).toBe(true);
  });

  it('should point to DejaVuSansMono font file', () => {
    const baseFont = getBundledBaseFont();

    expect(baseFont.path).toContain('DejaVuSansMono');
    expect(baseFont.path).toMatch(/\.ttf$/);
  });
});

describe('Font directory structure', () => {
  it('should have font directory at package root', () => {
    const fontPath = getEmojiFontPath('noto');

    expect(fontPath).toBeDefined();
    if (fontPath) {
      const fontDir = path.dirname(fontPath);
      expect(fontDir).toContain('font');
    }
  });

  it('should locate fonts relative to dist directory', () => {
    // After compilation, fonts should be accessible from ../font
    const baseFont = getBundledBaseFont();
    const fontPath = getEmojiFontPath('noto');

    expect(baseFont.path).toBeDefined();
    expect(fontPath).toBeDefined();

    if (baseFont.path && fontPath) {
      // Both should be in the same font directory
      expect(path.dirname(baseFont.path)).toBe(path.dirname(fontPath));
    }
  });
});

describe('Font file format validation', () => {
  it('should use TTF format for most fonts', () => {
    const notoPath = getEmojiFontPath('noto');
    const colorPath = getEmojiFontPath('color');
    const twemojiPath = getEmojiFontPath('twemoji');

    expect(notoPath).toMatch(/\.ttf$/);
    expect(colorPath).toMatch(/\.ttf$/);
    expect(twemojiPath).toMatch(/\.ttf$/);
  });

  it('should use OTF format for Unifont', () => {
    const unifontPath = getEmojiFontPath('unifont');

    expect(unifontPath).toMatch(/\.otf$/);
  });

  it('should have valid font file extensions', () => {
    const allFonts = ['noto', 'color', 'twemoji', 'unifont'];

    for (const key of allFonts) {
      const fontPath = getEmojiFontPath(key);
      expect(fontPath).toBeDefined();

      if (fontPath) {
        const ext = path.extname(fontPath);
        expect(['.ttf', '.otf', '.woff', '.woff2']).toContain(ext);
      }
    }
  });
});
