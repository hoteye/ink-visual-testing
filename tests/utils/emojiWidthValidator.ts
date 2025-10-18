/**
 * Emoji Width Validator
 *
 * Utility tool for validating emoji width calculations throughout the pipeline.
 * Provides methods to:
 * 1. Analyze emoji widths in strings
 * 2. Detect width calculation mismatches
 * 3. Validate ANSI output emoji width consistency
 * 4. Generate detailed width reports
 */

export interface EmojiWidthAnalysis {
  character: string;
  codepoint: number;
  hex: string;
  expectedWidth: number;
  actualWidth: number;
  isEmoji: boolean;
  hasVariationSelector: boolean;
}

export interface StringWidthReport {
  text: string;
  cleanedText: string;
  totalCharacters: number;
  totalEmoji: number;
  inklibWidth: number;  // Calculated using string-width logic
  xtermV11Width: number; // Calculated using Unicode v11 logic
  mismatch: boolean;
}

/**
 * Check if a codepoint is in the emoji range
 */
export function isEmojiCodepoint(codepoint: number): boolean {
  const EMOJI_RANGES = [
    [0x1F000, 0x1F02F],  // Mahjong Tiles
    [0x1F030, 0x1F09F],  // Domino Tiles
    [0x1F0A0, 0x1F0FF],  // Playing Cards
    [0x1F100, 0x1F64F],  // Emoticons & Symbols
    [0x1F650, 0x1F67F],  // Ornamental Dingbats
    [0x1F680, 0x1F6FF],  // Transport & Map
    [0x1F700, 0x1F77F],  // Alchemical Symbols
    [0x1F780, 0x1F7FF],  // Geometric Shapes Extended
    [0x1F800, 0x1F8FF],  // Supplemental Arrows-C
    [0x1F900, 0x1F9FF],  // Supplemental Symbols and Pictographs
    [0x1FA00, 0x1FA6F],  // Chess Symbols
    [0x1FA70, 0x1FAFF]   // Symbols and Pictographs Extended-A
  ];

  return EMOJI_RANGES.some(([start, end]) => codepoint >= start && codepoint <= end);
}

/**
 * Calculate character width using Unicode v11 (xterm.js)
 */
export function calculateWidthUnicodeV11(codepoint: number): number {
  if (codepoint < 32) return 0;           // Control characters
  if (codepoint < 127) return 1;          // ASCII
  if (codepoint === 0xFE0F) return 0;     // Variation Selector-16
  if (isEmojiCodepoint(codepoint)) return 2;  // Emoji
  return 1;                               // Default
}

/**
 * Calculate character width using string-width logic (Ink)
 * This mimics what Ink sees with VS16 included
 */
export function calculateWidthStringWidth(codepoint: number, hasVS16After: boolean = false): number {
  if (codepoint < 32) return 0;           // Control characters
  if (codepoint < 127) return 1;          // ASCII
  if (codepoint === 0xFE0F) return 1;     // VS16 is width 1 in string-width
  if (isEmojiCodepoint(codepoint)) return 2;  // Emoji
  return 1;                               // Default
}

/**
 * Analyze emoji in a string
 */
export function analyzeEmojiWidth(text: string): EmojiWidthAnalysis[] {
  const results: EmojiWidthAnalysis[] = [];

  for (let i = 0; i < text.length; i++) {
    const codepoint = text.charCodeAt(i);
    const nextCodepoint = i + 1 < text.length ? text.charCodeAt(i + 1) : undefined;
    const hasVS16 = nextCodepoint === 0xFE0F;

    const analysis: EmojiWidthAnalysis = {
      character: text[i],
      codepoint,
      hex: '0x' + codepoint.toString(16).toUpperCase().padStart(4, '0'),
      expectedWidth: calculateWidthUnicodeV11(codepoint),
      actualWidth: calculateWidthStringWidth(codepoint, hasVS16),
      isEmoji: isEmojiCodepoint(codepoint),
      hasVariationSelector: hasVS16
    };

    results.push(analysis);

    // Skip VS16 on next iteration
    if (hasVS16) i++;
  }

  return results;
}

/**
 * Validate string width consistency between Ink and xterm.js
 * After removing VS16, widths should match
 */
export function validateStringWidth(text: string): StringWidthReport {
  // Calculate Ink width (with VS16)
  let inklibWidth = 0;
  for (const char of text) {
    const codepoint = char.charCodeAt(0);
    inklibWidth += calculateWidthStringWidth(codepoint);
  }

  // Clean text (remove VS16)
  const cleanedText = text.replace(/\uFE0F/g, '');

  // Calculate xterm v11 width (without VS16)
  let xtermV11Width = 0;
  for (const char of cleanedText) {
    const codepoint = char.charCodeAt(0);
    xtermV11Width += calculateWidthUnicodeV11(codepoint);
  }

  const emojiAnalysis = analyzeEmojiWidth(cleanedText);
  const totalEmoji = emojiAnalysis.filter(a => a.isEmoji).length;

  return {
    text,
    cleanedText,
    totalCharacters: cleanedText.length,
    totalEmoji,
    inklibWidth,
    xtermV11Width,
    mismatch: inklibWidth !== xtermV11Width
  };
}

/**
 * Check if ANSI data has emoji width issues
 */
export function validateAnsiEmojiWidth(ansiData: string): {
  hasEmoji: boolean;
  emojiCount: number;
  hasVariationSelectors: boolean;
  vs16Count: number;
  analysis: StringWidthReport;
} {
  // Remove ANSI escape sequences
  const cleanedAnsi = ansiData.replace(/\x1b\[[0-9;]*m/g, '');

  const vs16Count = (ansiData.match(/\uFE0F/g) || []).length;
  const hasEmoji = analyzeEmojiWidth(cleanedAnsi).some(a => a.isEmoji);
  const emojiCount = analyzeEmojiWidth(cleanedAnsi).filter(a => a.isEmoji).length;

  return {
    hasEmoji,
    emojiCount,
    hasVariationSelectors: vs16Count > 0,
    vs16Count,
    analysis: validateStringWidth(cleanedAnsi)
  };
}

/**
 * Generate detailed width report
 */
export function generateWidthReport(text: string): string {
  const report = validateStringWidth(text);
  const analysis = analyzeEmojiWidth(text);

  let output = '';
  output += `\n========== Emoji Width Analysis Report ==========\n`;
  output += `Text: "${text}"\n`;
  output += `Cleaned: "${report.cleanedText}"\n\n`;

  output += `Summary:\n`;
  output += `- Total characters: ${report.totalCharacters}\n`;
  output += `- Total emoji: ${report.totalEmoji}\n`;
  output += `- Ink width (with VS16): ${report.inklibWidth}\n`;
  output += `- xterm v11 width (cleaned): ${report.xtermV11Width}\n`;
  output += `- Mismatch: ${report.mismatch ? '❌ YES' : '✅ NO'}\n\n`;

  output += `Character Breakdown:\n`;
  output += `Char     Code     Width V11 Width IW  Type\n`;
  output += `${'-'.repeat(60)}\n`;

  for (const item of analysis) {
    const type = item.isEmoji ? 'Emoji' : item.character === '\uFE0F' ? 'VS16' : 'Char';
    const charStr = (item.character || '?').padEnd(8);
    const codeStr = item.hex.padEnd(8);
    const v11Str = String(item.expectedWidth).padEnd(10);
    const iwStr = String(item.actualWidth).padEnd(10);
    output += `${charStr}${codeStr}${v11Str}${iwStr}${type}\n`;
  }

  output += `\n${'='.repeat(50)}\n`;

  return output;
}

/**
 * Detect emoji rendering issues
 */
export function detectRenderingIssues(text: string): string[] {
  const issues: string[] = [];
  const report = validateStringWidth(text);

  if (report.mismatch) {
    issues.push(`Width mismatch: Ink=${report.inklibWidth}, xterm=${report.xtermV11Width}`);
  }

  const analysis = analyzeEmojiWidth(text);
  for (let i = 0; i < analysis.length; i++) {
    const item = analysis[i];

    if (item.isEmoji && item.expectedWidth !== 2) {
      issues.push(`Emoji "${item.character}" has unexpected width: ${item.expectedWidth}`);
    }

    if (item.hasVariationSelector) {
      issues.push(`Emoji "${item.character}" has VS16 - should be cleaned`);
    }
  }

  return issues;
}

/**
 * Create test cases for emoji width validation
 */
export function createEmojiWidthTestCases(): Array<{
  name: string;
  input: string;
  expectedClean: string;
  expectedEmoji: number;
  expectedMismatch: boolean;
}> {
  return [
    {
      name: 'Simple emoji line',
      input: '😀 😃 😄',
      expectedClean: '😀 😃 😄',
      expectedEmoji: 3,
      expectedMismatch: false
    },
    {
      name: 'Emoji with variation selector',
      input: '❤️ 💔 💕',
      expectedClean: '❤ 💔 💕',
      expectedEmoji: 3,
      expectedMismatch: false
    },
    {
      name: 'Mixed ASCII and emoji',
      input: 'test😀end',
      expectedClean: 'test😀end',
      expectedEmoji: 1,
      expectedMismatch: false
    },
    {
      name: 'Multiple variation selectors',
      input: '❤️❤️❤️',
      expectedClean: '❤❤❤',
      expectedEmoji: 3,
      expectedMismatch: false
    },
    {
      name: 'Complex emoji mix',
      input: '😀 test 🚀 end 💻',
      expectedClean: '😀 test 🚀 end 💻',
      expectedEmoji: 3,
      expectedMismatch: false
    }
  ];
}
