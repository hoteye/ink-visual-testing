# Ink Node PTY Snapshots

This repository shows how to take the real output of an [Ink](https://github.com/vadimdemedes/ink) CLI, capture it via `node-pty`, render the terminal buffer to PNG with `terminal-screenshot`, and compare the result in Vitest.

## ✨ Features

- ✅ **Perfect Emoji Support** - Correctly renders emoji with proper width calculation (includes patched xterm.js for accurate emoji handling)
- ✅ **Real Terminal Rendering** - Uses `node-pty` to capture actual ANSI output
- ✅ **Visual Regression Testing** - Pixel-perfect comparison with baselines
- ✅ **CI-Optimized** - Bundled emoji fonts for consistent cross-platform rendering
- ✅ **Flexible Configuration** - Customize terminal size, fonts, and rendering options

## Quick Start

Install via npm:

```bash
npm install ink-visual-testing

# or install both deps for the example fixture
npm install
```

Generate a snapshot of the example Ink CLI:

```bash
npx tsx examples/simple-box-snapshot.tsx --cols=120 --rows=60 --output=snapshots/simple-box.png
# request one of the bundled emoji fonts (defaults to system fonts)
npx tsx examples/simple-box-snapshot.tsx --emoji-font=mono
```

By default the script renders with the system font stack so you can see how output looks on your machine. Use `--emoji-font=system|color|mono|twemoji|unifont` to switch to the bundled fonts under `font/` when you need consistent emoji rendering.

## Programmatic API

```ts
import path from 'node:path';
import { fixedPtyRender } from 'ink-visual-testing';

await fixedPtyRender(
  path.resolve('examples/simple-box-cli.tsx'),
  'snapshots/simple-box.png',
  { cols: 120, rows: 60 }
);
```

- `fixedPtyRender` (and the underlying `createSnapshotFromPty`) runs the command inside `node-pty`, captures ANSI output, and renders a PNG.
- Override `cols`, `rows`, `margin`, `backgroundColor`, `fontFamily`, or `type` as needed.
- Supply `emojiFontPath`/`emojiFontFamily` if you want to load a local emoji-capable font. The helper defaults to the system fonts but the snapshot script exposes `--emoji-font=system|color|mono|twemoji|unifont` for convenience.

## Visual Test Example

Visual regression is handled with Vitest and PNG diffing:

- `examples/simple-box.tsx`: Ink component used for the demo.
- `examples/simple-box-cli.tsx`: CLI entry that renders the component.
- `examples/simple-box-snapshot.tsx`: Invokes `fixedPtyRender` to emit a PNG.
- `tests/simple-box.test.ts`: Runs the snapshot script, then calls `comparePng` (from `tests/utils/imageDiff.ts`) to compare the PNG against `tests/__baselines__/simple-box.png`. Diffs are written to `tests/__diff__/`.

Run the suite with:

```bash
npx vitest run
```

The diff helper relies on `pngjs` + `pixelmatch`; adjust the tolerance via the options passed to `comparePng` if necessary.

## CI Environment Setup

### Quick Start for CI

Use `getCIOptimizedConfig()` to get reliable defaults for CI environments:

```ts
import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';

await fixedPtyRender(
  'my-cli.tsx',
  'output.png',
  {
    ...getCIOptimizedConfig(), // Uses bundled mono emoji font, 60s timeout
    cols: 120,
    rows: 60
  }
);
```

### System Requirements

CI environments need these dependencies for Puppeteer (used by `terminal-screenshot`):

**Ubuntu/Debian:**
```bash
apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2 fonts-dejavu-core
```

**Alpine Linux:**
```bash
apk add --no-cache \
  chromium nss freetype freetype-dev harfbuzz \
  ca-certificates ttf-dejavu
```

### GitHub Actions Example

Create `.github/workflows/visual-test.yml`:

```yaml
name: Visual Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libnss3 libatk1.0-0 libgbm1 fonts-dejavu-core

      - run: npm ci
      - run: npm test

      - name: Upload diffs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: tests/__diff__/*.png
```

### Font Consistency

This package includes bundled emoji fonts in the `font/` directory for consistent rendering across environments:

- `mono` - NotoEmoji-Regular.ttf (monochrome, recommended for CI)
- `color` - NotoColorEmoji.ttf (color emoji)
- `twemoji` - TwemojiMozilla.ttf (Twitter emoji)
- `unifont` - Unifont.otf (monochrome bitmap)

**Emoji Width Fix:** This package includes a patched version of xterm.js that correctly calculates emoji character widths. Modern emoji (U+1F000-U+1FFFF) are now properly handled as width-2 characters, ensuring:
- ✅ Box borders align correctly with emoji content
- ✅ Cursor positioning works accurately after emoji
- ✅ Text layout remains consistent with other terminal emulators

The patch is automatically applied via `patch-package` during `npm install`.

Access bundled fonts via helpers:

```ts
import { getEmojiFontPath } from 'ink-visual-testing';

const fontPath = getEmojiFontPath('mono');
// Returns absolute path to bundled font
```

### Updating Baselines

When intentional visual changes are made:

1. Run tests locally with the same config as CI
2. Review diff images
3. If correct, copy output to baselines:
   ```bash
   cp tests/__output__/*.png tests/__baselines__/
   ```
4. Commit updated baselines

## License

Dual-licensed under MIT or CC0 1.0 Universal. Choose whichever license better fits your project. See `LICENSE`, `LICENSE-MIT`, and `LICENSE-CC0` for details.
