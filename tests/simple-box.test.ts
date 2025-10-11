import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { comparePng } from './utils/imageDiff';
import { spawnSync } from 'node:child_process';

const OUTPUT_DIR = path.resolve('tests/__output__');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'simple-box.png');
const BASELINE_PATH = path.resolve('tests/__baselines__/simple-box.png');
const DIFF_PATH = path.resolve('tests/__diff__/simple-box.png');
const SNAPSHOT_COLS = 32;
const SNAPSHOT_ROWS = 24;

describe('SimpleBox snapshot', () => {
  beforeAll(async () => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(path.dirname(DIFF_PATH), { recursive: true });
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(cmd, [
      'tsx',
      'examples/simple-box-snapshot.tsx',
      `--cols=${SNAPSHOT_COLS}`,
      `--rows=${SNAPSHOT_ROWS}`,
      `--output=${OUTPUT_PATH}`
    ], {
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      throw new Error(`Snapshot command exited with code ${result.status}`);
    }
  });

  afterAll(() => {
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
    }
  });

  it('matches baseline simple box', async () => {
    await comparePng(OUTPUT_PATH, BASELINE_PATH, DIFF_PATH, {
      threshold: 0.1,
      maxDiffPixels: 0
    });
    expect(fs.existsSync(DIFF_PATH)).toBe(true);
  });
});
