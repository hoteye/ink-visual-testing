import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawn } from 'node-pty';
import { renderScreenshot } from 'terminal-screenshot';
import { withEmojiFontConfig } from './terminalScreenshotFontPatch.js';
import { getEmojiFontPath, EMOJI_FONT_OPTIONS } from './emojiFonts.js';
import { getBundledBaseFont } from './baseFont.js';

// Re-export emoji font utilities
export { getEmojiFontPath, EMOJI_FONT_OPTIONS };
export type { EmojiFontOption } from './emojiFonts.js';

/**
 * Clean ANSI data by removing variation selectors that can cause width calculation mismatches
 * This is automatically called by fixedPtyRender and createSnapshotFromPty
 * Export it here so users can also manually process their own captured terminal data
 */
export function cleanAnsiData(data: string): string {
  return data.replace(/\uFE0F/g, '');
}

// Export visual test helper
export { visualTest } from './visualTest.js';
export type { VisualTestOptions } from './visualTest.js';

// Export batch testing
export { batchVisualTest, batchVisualTestFromFiles, batchVisualTestParallel } from './batchTest.js';
export type { BatchTestCase, BatchTestResult } from './batchTest.js';

// Export configuration
export { loadConfig, mergeConfig } from './config.js';
export type { InkVisualConfig } from './config.js';

// Export presets
export { getTerminalPreset, listTerminalPresets, TERMINAL_PRESETS } from './presets.js';
export type { TerminalPreset } from './presets.js';

/**
 * Get CI-optimized configuration for consistent snapshot rendering.
 * Uses bundled fonts by default for cross-platform consistency.
 *
 * @param emojiFontKey - Optional emoji font key ('noto', 'color', 'twemoji', 'unifont', 'system'). Defaults to 'noto'.
 * @returns Partial configuration object to merge with your options
 *
 * @example
 * ```ts
 * import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';
 *
 * // Recommended: Use bundled fonts for consistency
 * await fixedPtyRender(
 *   'my-cli.tsx',
 *   'output.png',
 *   {
 *     ...getCIOptimizedConfig(), // Uses bundled Noto emoji + DejaVu Sans Mono
 *     cols: 120,
 *     rows: 60
 *   }
 * );
 *
 * // Alternative: Use system fonts (may differ across platforms)
 * getCIOptimizedConfig({ emojiFontKey: 'system', baseFont: 'system' });
 * ```
 */
type BaseFontMode = 'bundled' | 'system';

export interface CIOptimizedConfigOptions {
  emojiFontKey?: string;
  baseFont?: BaseFontMode;
}

export function getCIOptimizedConfig(
  optionsOrEmojiKey?: string | CIOptimizedConfigOptions
): Partial<NodePtySnapshotOptions> {
  let emojiFontKey = 'noto';
  let baseFont: BaseFontMode = 'bundled';

  if (typeof optionsOrEmojiKey === 'string') {
    emojiFontKey = optionsOrEmojiKey;
  } else if (optionsOrEmojiKey) {
    emojiFontKey = optionsOrEmojiKey.emojiFontKey ?? emojiFontKey;
    baseFont = optionsOrEmojiKey.baseFont ?? baseFont;
  }

  const emojiFontPath = emojiFontKey === 'system' ? undefined : getEmojiFontPath(emojiFontKey);
  const emojiOption = EMOJI_FONT_OPTIONS[emojiFontKey];

  const bundledBase = getBundledBaseFont();
  const useBundledBase = baseFont === 'bundled';

  return {
    emojiFontPath,
    emojiFontFamily: emojiOption?.family,
    baseFontPath: useBundledBase ? bundledBase.path : undefined,
    baseFontFamily: useBundledBase ? bundledBase.family : undefined,
    fontFamily: 'DejaVu Sans Mono, monospace',
    timeout: 60000,
    margin: 12,
    backgroundColor: '#000000'
  };
}

export interface NodePtySnapshotOptions {
  command: string;
  args?: string[];
  outputPath: string;
  cols?: number;
  rows?: number;
  env?: NodeJS.ProcessEnv;
  margin?: number;
  backgroundColor?: string;
  fontFamily?: string;
  type?: 'png' | 'jpeg';
  emojiFontPath?: string;
  emojiFontFamily?: string;
  baseFontPath?: string;
  baseFontFamily?: string;
  /** Timeout in milliseconds for the PTY process (default: 30000ms) */
  timeout?: number;
}

export async function createSnapshotFromPty(options: NodePtySnapshotOptions): Promise<void> {
  const {
    command,
    args = [],
    outputPath,
    cols = process.stdout.columns ?? 80,
    rows = process.stdout.rows ?? 24,
    env = process.env,
    margin = 12,
    backgroundColor = '#000000',
    fontFamily = 'DejaVu Sans Mono, Noto Sans Mono CJK SC, monospace',
    type = 'png',
    emojiFontPath,
    emojiFontFamily,
    baseFontPath,
    baseFontFamily,
    timeout = 30000
  } = options;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let captured = '';

  const pty = spawn(command, args, {
    name: 'xterm-color',
    cols,
    rows,
    cwd: process.cwd(),
    env: {
      ...env,
      FORCE_COLOR: env?.FORCE_COLOR ?? '3',
      COLORTERM: env?.COLORTERM ?? 'truecolor',
      TERM: env?.TERM ?? 'xterm-256color'
    }
  });

  pty.onData(data => {
    captured += data;
  });

  await new Promise<void>((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | undefined;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        pty.kill();
        reject(new Error(
          `PTY process timed out after ${timeout}ms. ` +
          `Command: ${command} ${args.join(' ')}`
        ));
      }, timeout);
    }

    pty.onExit(({ exitCode }) => {
      if (timeoutId) clearTimeout(timeoutId);

      if (exitCode && exitCode !== 0) {
        reject(new Error(
          `PTY exited with code ${exitCode}. ` +
          `Command: ${command} ${args.join(' ')}`
        ));
      } else {
        resolve();
      }
    });
  });

  const fontConfig = {
    emojiFontPath,
    emojiFontFamily,
    baseFontPath,
    baseFontFamily,
    cols,
    rows
  };

  const fontStackForLogParts = [];
  if (fontConfig.emojiFontFamily) {
    fontStackForLogParts.push(fontConfig.emojiFontFamily);
  }
  if (fontConfig.baseFontFamily) {
    fontStackForLogParts.push(fontConfig.baseFontFamily);
  }
  fontStackForLogParts.push(fontFamily);

  console.log(`[ink-visual-testing] Rendering snapshot with fonts: ${fontStackForLogParts.join(', ')}`);
  console.log(`[ink-visual-testing] Captured data length: ${captured.length} bytes`);
  if (captured.length < 100) {
    console.log(`[ink-visual-testing] WARNING: Captured data seems too short!`);
    console.log(`[ink-visual-testing] Data preview: ${JSON.stringify(captured.substring(0, 200))}`);
  }

  // Remove variation selectors to avoid width calculation mismatches
  // Variation Selector-16 (U+FE0F) causes issues between Ink's string-width and xterm.js rendering
  const cleanedData = captured.replace(/\uFE0F/g, '');
  const vsCount = (captured.match(/\uFE0F/g) || []).length;
  if (vsCount > 0) {
    console.log(`[ink-visual-testing] Removed ${vsCount} variation selectors for consistent rendering`);
  }

  const buffer = await withEmojiFontConfig(fontConfig, () =>
    renderScreenshot({
      data: cleanedData,
      margin,
      backgroundColor,
      fontFamily,
      type
    })
  );

  fs.writeFileSync(outputPath, buffer);
}

export interface FixedPtyRenderOptions extends Omit<Partial<NodePtySnapshotOptions>, 'command' | 'args' | 'outputPath'> {
  command?: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
}

export async function fixedPtyRender(
  cliPath: string,
  outputPath: string,
  options: FixedPtyRenderOptions = {}
): Promise<void> {
  const {
    command = process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args = ['tsx', cliPath],
    cols = 120,
    rows = 60,
    env,
    margin,
    backgroundColor,
    fontFamily,
    type,
    emojiFontPath,
    emojiFontFamily,
    baseFontPath,
    baseFontFamily
  } = options;

  await createSnapshotFromPty({
    command,
    args,
    outputPath,
    cols,
    rows,
    env,
    margin,
    backgroundColor,
    fontFamily,
    type,
    emojiFontPath,
    emojiFontFamily,
    baseFontPath,
    baseFontFamily
  });
}
