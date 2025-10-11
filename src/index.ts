import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawn } from 'node-pty';
import { renderScreenshot } from 'terminal-screenshot';
import { withEmojiFontConfig } from './terminalScreenshotFontPatch.js';

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
    emojiFontFamily
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
    pty.onExit(({ exitCode }) => {
      if (exitCode && exitCode !== 0) {
        reject(new Error(`PTY exited with code ${exitCode}`));
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
