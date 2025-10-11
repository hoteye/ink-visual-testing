import path from 'path';
import { fileURLToPath } from 'url';

export interface EmojiFontOption {
  key: string;
  description: string;
  path?: string;
  family?: string;
}

export const EMOJI_FONT_OPTIONS: Record<string, EmojiFontOption> = {
  system: {
    key: 'system',
    description: 'Use system font stack (no local font override)'
  },
  color: {
    key: 'color',
    description: 'Use bundled NotoColorEmoji.ttf (color)',
    path: 'font/NotoColorEmoji.ttf',
    family: 'InkSnapshotEmoji'
  },
  mono: {
    key: 'mono',
    description: 'Use bundled NotoEmoji-Regular.ttf (monochrome)',
    path: 'font/NotoEmoji-Regular.ttf',
    family: 'InkSnapshotEmojiMono'
  },
  twemoji: {
    key: 'twemoji',
    description: 'Use bundled TwemojiMozilla.ttf (color)',
    path: 'font/TwemojiMozilla.ttf',
    family: 'InkSnapshotTwemoji'
  },
  unifont: {
    key: 'unifont',
    description: 'Use bundled Unifont.otf (monochrome bitmap)',
    path: 'font/Unifont.otf',
    family: 'InkSnapshotUnifont'
  }
};

export function resolveEmojiFont(key?: string) {
  if (!key) {
    return EMOJI_FONT_OPTIONS.system;
  }
  const option = EMOJI_FONT_OPTIONS[key];
  return option ?? EMOJI_FONT_OPTIONS.system;
}

/**
 * Get the absolute path to a bundled emoji font.
 * Useful for CI environments where you need consistent emoji rendering.
 *
 * @param key - Font key: 'color', 'mono', 'twemoji', or 'unifont'
 * @returns Absolute path to the font file, or undefined if using system fonts
 *
 * @example
 * ```ts
 * import { getEmojiFontPath } from 'ink-visual-testing';
 *
 * const emojiPath = getEmojiFontPath('mono');
 * // Returns: '/path/to/node_modules/ink-visual-testing/font/NotoEmoji-Regular.ttf'
 * ```
 */
export function getEmojiFontPath(key: string): string | undefined {
  const option = EMOJI_FONT_OPTIONS[key];
  if (!option || !option.path) {
    return undefined;
  }

  // Resolve relative to this module's location
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Go up from dist/ to package root, then into font/
  return path.resolve(__dirname, '..', option.path);
}
