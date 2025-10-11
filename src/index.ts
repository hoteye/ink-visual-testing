import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawn } from 'node-pty';
import { renderScreenshot } from 'terminal-screenshot';
import { withEmojiFontConfig } from './terminalScreenshotFontPatch.js';

// Re-export emoji font utilities
export { getEmojiFontPath, EMOJI_FONT_OPTIONS } from './emojiFonts.js';
export type { EmojiFontOption } from './emojiFonts.js';

/**
 * Get CI-optimized configuration for consistent snapshot rendering.
 * This configuration uses bundled monochrome emoji fonts and standard settings
 * that work reliably across different CI environments.
 *
 * @param emojiFontKey - Optional emoji font key ('mono', 'color', 'twemoji', 'unifont'). Defaults to 'mono' for CI.
 * @returns Partial configuration object to merge with your options
 *
 * @example
 * ```ts
 * import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';
 *
 * await fixedPtyRender(
 *   'my-cli.tsx',
 *   'output.png',
 *   {
 *     ...getCIOptimizedConfig(),
 *     cols: 120,
 *     rows: 60
 *   }
 * );
 * ```
 */
export function getCIOptimizedConfig(emojiFontKey: string = 'mono'): Partial<NodePtySnapshotOptions> {
  const { getEmojiFontPath, EMOJI_FONT_OPTIONS } = require('./emojiFonts.js');
  const emojiFontPath = getEmojiFontPath(emojiFontKey);
  const option = EMOJI_FONT_OPTIONS[emojiFontKey];

  return {
    // Use bundled emoji font for consistency
    emojiFontPath,
    emojiFontFamily: option?.family,
    // Standard font family available in most CI environments
    fontFamily: 'DejaVu Sans Mono, monospace',
    // Longer timeout for CI (which can be slower)
    timeout: 60000,
    // Standard margin
    margin: 12,
    // Black background (most common)
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

  const emojiConfig = emojiFontPath
    ? { emojiFontPath, emojiFontFamily: emojiFontFamily ?? 'InkSnapshotEmoji' }
    : undefined;

  const fontStackForLog = emojiConfig
    ? `${emojiConfig.emojiFontFamily}, ${fontFamily}`
    : fontFamily;
  console.log(`[ink-visual-testing] Rendering snapshot with fonts: ${fontStackForLog}`);

  const buffer = await withEmojiFontConfig(emojiConfig, () =>
    renderScreenshot({
      data: captured,
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
    emojiFontFamily
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
    emojiFontFamily
  });
}
