#!/usr/bin/env node
import path from 'node:path';
import { fixedPtyRender, getCIOptimizedConfig } from '../dist/index.js';

// Parse command line arguments
const args = process.argv.slice(2);
const colsArg = args.find(arg => arg.startsWith('--cols='));
const rowsArg = args.find(arg => arg.startsWith('--rows='));
const outputArg = args.find(arg => arg.startsWith('--output='));
const emojiFontArg = args.find(arg => arg.startsWith('--emoji-font='));

const cols = colsArg ? parseInt(colsArg.split('=')[1], 10) : 100;
const rows = rowsArg ? parseInt(rowsArg.split('=')[1], 10) : 35;
const output = outputArg ? outputArg.split('=')[1] : 'snapshots/dashboard.png';
const baseFontArg = args.find(arg => arg.startsWith('--base-font='));
const emojiFontKey = emojiFontArg ? emojiFontArg.split('=')[1] : 'noto';
const baseFont = baseFontArg ? (baseFontArg.split('=')[1] as 'bundled' | 'system') : 'bundled';

console.log(`[examples/dashboard] Rendering with emoji font: ${emojiFontKey}, base font: ${baseFont}`);

const snapshotConfig = getCIOptimizedConfig({
  emojiFontKey,
  baseFont,
});

// Render the dashboard
(async () => {
  try {
    await fixedPtyRender(
      path.resolve('examples/dashboard-cli.tsx'),
      output,
      {
        cols,
        rows,
        ...snapshotConfig,
        margin: 16,
        backgroundColor: '#000000',
        type: 'png',
        timeout: 30000
      }
    );

    console.log(`✅ Dashboard snapshot saved to: ${output}`);
  } catch (error) {
    console.error('❌ Failed to generate dashboard snapshot:', error);
    process.exit(1);
  }
})();
