import path from 'node:path';
import { createRequire } from 'node:module';

// Hook into terminal-screenshot's template generation so we can inject a local emoji font.
const require = createRequire(import.meta.url);
const templateModule = require('terminal-screenshot/out/src/template.js');
const fs = require('fs/promises');
const originalGenerateTemplate = templateModule.generateTemplate as (options: any) => Promise<string>;

interface EmojiFontConfig {
  emojiFontPath: string;
  emojiFontFamily: string;
}

let currentEmojiFont: EmojiFontConfig | undefined;

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

function measureLength(data: string): number {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
  ].join('|');

  return data.replaceAll(new RegExp(pattern, 'g'), '').length;
}

function normaliseFamilies(baseFamily: string, emojiFamily?: string): string[] {
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

export async function withEmojiFontConfig<T>(config: EmojiFontConfig | undefined, fn: () => Promise<T>): Promise<T> {
  if (!config) {
    return fn();
  }

  currentEmojiFont = config;
  try {
    return await fn();
  } finally {
    currentEmojiFont = undefined;
  }
}

templateModule.generateTemplate = async function patchedGenerateTemplate(options: any) {
  if (!currentEmojiFont) {
    return originalGenerateTemplate(options);
  }

  const { emojiFontPath, emojiFontFamily } = currentEmojiFont;
  const absoluteEmojiPath = path.resolve(emojiFontPath);

  const lines = options.data.split(/\r?\n/);
  const terminalRows = lines.length;
  const terminalColumns = Math.max(...lines.map(measureLength));

  const fontFamilies = normaliseFamilies(options.fontFamily, emojiFontFamily);
  const fontStack = fontFamilies.map(quoteFamily).join(', ');
  const fontStackEscaped = fontStack.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const emojiFamilyEscaped = emojiFontFamily.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const loadFonts = buildFontLoadPromise(fontFamilies);

  const template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>
            @font-face {
                font-family: "${emojiFamilyEscaped}";
                src: url('${require('url').pathToFileURL(absoluteEmojiPath).href}');
            }
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

        <link rel="stylesheet" href="${require.resolve('xterm/css/xterm.css')}" />

        <script src="${require.resolve('xterm/lib/xterm.js')}"></script>
    </head>

    <body>
        <div id="terminal"></div>

        <script>
            const startTerminal = () => {
                const terminal = new Terminal({
                    theme: { background: "${options.backgroundColor}" },
                    fontFamily: "${fontStackEscaped}",
                    rows: ${terminalRows},
                    cols: ${terminalColumns},
                    cursorInactiveStyle: "none"
                });

                terminal.open(document.getElementById('terminal'));
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
