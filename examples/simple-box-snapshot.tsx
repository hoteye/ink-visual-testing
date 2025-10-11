import path from 'node:path';
import process from 'node:process';
import { fixedPtyRender } from '../src/index.js';
import { resolveEmojiFont } from '../src/emojiFonts.js';

const outputArg = process.argv.find(arg => arg.startsWith('--output='));
const colsArg = process.argv.find(arg => arg.startsWith('--cols='));
const rowsArg = process.argv.find(arg => arg.startsWith('--rows='));
const emojiFontArg = process.argv.find(arg => arg.startsWith('--emoji-font='));

const outputPath = outputArg ? outputArg.split('=')[1] : 'tests/__output__/simple-box.png';
const cols = colsArg ? Number(colsArg.split('=')[1]) : 120;
const rows = rowsArg ? Number(rowsArg.split('=')[1]) : 60;
const emojiFontKey = emojiFontArg ? emojiFontArg.split('=')[1] : undefined;
const emojiFont = resolveEmojiFont(emojiFontKey);

const fontDisplayName = `${emojiFont.family ?? 'system default'}${emojiFont.path ? ` (${emojiFont.path})` : ''}`;
console.log(`[examples/simple-box] Rendering with emoji font: ${fontDisplayName}`);

await fixedPtyRender(
  path.resolve('examples/simple-box-cli.tsx'),
  path.resolve(outputPath),
  {
    cols,
    rows,
    emojiFontPath: emojiFont.path ? path.resolve(emojiFont.path) : undefined,
    emojiFontFamily: emojiFont.family
  }
);
