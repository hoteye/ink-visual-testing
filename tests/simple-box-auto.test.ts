import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { getSnapshotPaths } from './utils/visualSnapshot.js';
import './vitest.setup.js';

describe('Dashboard visual snapshot (automatic)', () => {
  const snapshotName = 'dashboard-auto';
  const paths = getSnapshotPaths(snapshotName);

  beforeAll(() => {
    // Ensure output directory exists
    fs.mkdirSync(path.dirname(paths.output), { recursive: true });

    // Generate snapshot using external command
    // (node-pty doesn't work well in vitest threads)
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(cmd, [
      'tsx',
      'examples/dashboard-snapshot.tsx',
      '--cols=100',
      '--rows=50',
      `--output=${paths.output}`
    ], {
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      throw new Error(`Snapshot command exited with code ${result.status}`);
    }
  });

  it('matches visual snapshot', async () => {
    // This automatically handles:
    // - Creating baseline on first run
    // - Comparing with baseline on subsequent runs
    // - Generating diff images on failure
    // - Update mode (UPDATE_SNAPSHOTS=1)
    await expect(paths.output).toMatchVisualSnapshot(snapshotName, {
      threshold: 0.1,
      maxDiffPercentage: 0.001
    });
  });
});
