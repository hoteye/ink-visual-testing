# Ink Node PTY Snapshots

This repository shows how to take the real output of an [Ink](https://github.com/vadimdemedes/ink) CLI, capture it via `node-pty`, render the terminal buffer to PNG with `terminal-screenshot`, and compare the result in Vitest.

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

## License

Dual-licensed under MIT or CC0 1.0 Universal. Choose whichever license better fits your project. See `LICENSE`, `LICENSE-MIT`, and `LICENSE-CC0` for details.
