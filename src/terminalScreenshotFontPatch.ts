import path from 'node:path';
import { createRequire } from 'node:module';

// Hook into terminal-screenshot's template generation so we can inject a local emoji font.
const require = createRequire(import.meta.url);
const templateModule = require('terminal-screenshot/out/src/template.js');
const fs = require('fs/promises');
const originalGenerateTemplate = templateModule.generateTemplate as (options: any) => Promise<string>;

interface SnapshotFontConfig {
  emojiFontPath?: string;
  emojiFontFamily?: string;
  baseFontPath?: string;
  baseFontFamily?: string;
  cols?: number;
  rows?: number;
}

let currentFontConfig: SnapshotFontConfig | undefined;

const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'emoji',
  'math',
  'fangsong'
]);

function normaliseFamilies(
  baseFamily: string,
  emojiFamily?: string,
  bundledBaseFamily?: string
): string[] {
  const families = baseFamily
    .split(',')
    .map(family => family.trim())
    .filter(Boolean);

  const ordered: string[] = [];
  const seen = new Set<string>();

  if (emojiFamily && !seen.has(emojiFamily)) {
    ordered.push(emojiFamily);
    seen.add(emojiFamily);
  }

  if (bundledBaseFamily && !seen.has(bundledBaseFamily)) {
    ordered.push(bundledBaseFamily);
    seen.add(bundledBaseFamily);
  }

  for (const family of families) {
    if (!seen.has(family)) {
      ordered.push(family);
      seen.add(family);
    }
  }

  return ordered;
}

function quoteFamily(family: string): string {
  return family.includes(' ') ? `"${family}"` : family;
}

function buildFontLoadPromise(families: string[]): string {
  const loaders = families
    .map(family => family.replace(/^"|"$/g, ''))
    .filter(family => !GENERIC_FONT_FAMILIES.has(family.toLowerCase()))
    .map(family => `document.fonts.load('1rem "${family.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"')`);

  if (loaders.length === 0) {
    return 'Promise.resolve()';
  }

  return `Promise.all([${loaders.join(', ')}])`;
}

export async function withEmojiFontConfig<T>(config: SnapshotFontConfig | undefined, fn: () => Promise<T>): Promise<T> {
  if (!config || (!config.emojiFontPath && !config.baseFontPath)) {
    return fn();
  }

  currentFontConfig = config;
  try {
    return await fn();
  } finally {
    currentFontConfig = undefined;
  }
}

templateModule.generateTemplate = async function patchedGenerateTemplate(options: any) {
    if (!currentFontConfig) {
    return originalGenerateTemplate(options);
  }

  const { emojiFontPath, emojiFontFamily, baseFontPath, baseFontFamily, cols: configCols, rows: configRows } = currentFontConfig;
  const absoluteEmojiPath = emojiFontPath ? path.resolve(emojiFontPath) : undefined;
  const absoluteBaseFontPath = baseFontPath ? path.resolve(baseFontPath) : undefined;

  // Use cols/rows from PTY if available (better for emoji layout), otherwise calculate from data
  let terminalColumns: number;
  let terminalRows: number;

  if (configCols !== undefined && configRows !== undefined) {
    // Use the PTY dimensions - these match what Ink used for layout
    terminalColumns = configCols;
    terminalRows = configRows;
  } else {
    // Fallback: calculate from ANSI output (less reliable)
    const lines = options.data.split(/\r?\n/);
    terminalRows = lines.length;

    const pattern = [
      '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
      '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
    ].join('|');
    terminalColumns = Math.max(...lines.map((line: string) => {
      return line.replaceAll(new RegExp(pattern, 'g'), '').length;
    }));
  }

  console.log(`[terminalScreenshotFontPatch] Using terminal size: ${terminalColumns} cols × ${terminalRows} rows`);

  const fontFamilies = normaliseFamilies(options.fontFamily, emojiFontFamily, baseFontFamily);
  const fontStack = fontFamilies.map(quoteFamily).join(', ');
  const fontStackEscaped = fontStack.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const emojiFamilyEscaped = emojiFontFamily?.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const baseFamilyEscaped = baseFontFamily?.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const loadFonts = buildFontLoadPromise(fontFamilies);

  // Convert local file paths to file:// URLs for Puppeteer
  const url = require('url');
  const xtermCssUrl = url.pathToFileURL(require.resolve('xterm/css/xterm.css')).href;
  const xtermJsUrl = url.pathToFileURL(require.resolve('xterm/lib/xterm.js')).href;

  // Read Unicode11Addon source code to inline it (more reliable than external script in Puppeteer)
  const unicode11AddonPath = require.resolve('@xterm/addon-unicode11/lib/addon-unicode11.js');
  const unicode11AddonSource = await fs.readFile(unicode11AddonPath, 'utf-8');

  const template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>
            ${emojiFontPath ? `@font-face {
                font-family: "${emojiFamilyEscaped}";
                src: url('${url.pathToFileURL(absoluteEmojiPath!).href}');
            }` : ''}
            ${baseFontPath ? `@font-face {
                font-family: "${baseFamilyEscaped}";
                src: url('${url.pathToFileURL(absoluteBaseFontPath!).href}');
            }` : ''}
            body {
                margin: ${options.margin}px;
                background-color: ${options.backgroundColor};
            }
            #terminal {
                font-smooth: never;
            }
            .xterm-rows {
                line-height: 1;
            }
        </style>

        <link rel="stylesheet" href="${xtermCssUrl}" />

        <script src="${xtermJsUrl}"></script>
        <script>
            // Inline Unicode11Addon to ensure it's available in Puppeteer
            ${unicode11AddonSource}

            // Force export to window if not already there
            if (typeof window !== 'undefined' && typeof Unicode11Addon !== 'undefined' && !window.Unicode11Addon) {
                window.Unicode11Addon = Unicode11Addon;
            }
        </script>
    </head>

    <body>
        <div id="terminal"></div>

        <script>
            const resolveUnicode11Ctor = () => {
                // Check multiple possible export patterns
                if (typeof Unicode11Addon !== 'undefined') {
                    return typeof Unicode11Addon === 'function'
                        ? Unicode11Addon
                        : (Unicode11Addon.Unicode11Addon || Unicode11Addon);
                }
                if (typeof window !== 'undefined' && window.Unicode11Addon) {
                    return typeof window.Unicode11Addon === 'function'
                        ? window.Unicode11Addon
                        : (window.Unicode11Addon.Unicode11Addon || window.Unicode11Addon);
                }
                return undefined;
            };

            const startTerminal = () => {
                const terminal = new Terminal({
                    theme: { background: "${options.backgroundColor}" },
                    fontFamily: "${fontStackEscaped}",
                    rows: ${terminalRows},
                    cols: ${terminalColumns},
                    cursorInactiveStyle: "none",
                    allowProposedApi: true
                });

                terminal.open(document.getElementById('terminal'));

                const Unicode11Ctor = resolveUnicode11Ctor();

                if (Unicode11Ctor) {
                    try {
                        console.log('[ink-visual-testing] Loading Unicode 11 addon');
                        const unicode11 = new Unicode11Ctor();
                        terminal.loadAddon(unicode11);
                        terminal.unicode.activeVersion = '11';
                        console.log('[ink-visual-testing] Active Unicode version:', terminal.unicode.activeVersion);
                    } catch (error) {
                        console.error('[ink-visual-testing] Failed to initialize Unicode11 addon:', error);
                    }
                } else {
                    console.error('[ink-visual-testing] Unicode11 addon not available; emoji rendering may be incorrect');
                }

                terminal.write(${JSON.stringify(options.data)});
            };

            Promise.resolve(${loadFonts})
                .catch(() => undefined)
                .then(startTerminal);
        </script>
    </body>
    </html>
`;

  const os = require('os');
  const templateDir = path.join(os.tmpdir(), 'terminal-screenshot-template');
  await fs.mkdir(templateDir, { recursive: true });

  const templatePath = path.join(templateDir, `${Math.floor(Math.random() * 1_000_000)}.html`);
  await fs.writeFile(templatePath, template);

  return templatePath;
};
