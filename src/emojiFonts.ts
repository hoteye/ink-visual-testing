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
