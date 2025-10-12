import fs from 'node:fs';
import path from 'node:path';
import { comparePng } from './imageDiff.js';
import type { CompareOptions } from './imageDiff.js';

export interface VisualSnapshotOptions extends CompareOptions {
  /**
   * Update snapshots instead of comparing
   * Set via environment variable: UPDATE_SNAPSHOTS=1
   */
  update?: boolean;
  /**
   * Base directory for snapshots
   * @default 'tests/__baselines__'
   */
  snapshotDir?: string;
  /**
   * Base directory for diff images
   * @default 'tests/__diff__'
   */
  diffDir?: string;
}

export interface VisualSnapshotResult {
  pass: boolean;
  message: string;
  diffPixels?: number;
  totalPixels?: number;
  diffPercentage?: number;
  diffPath?: string;
}

/**
 * Visual snapshot testing helper for Vitest
 *
 * Usage:
 * ```ts
 * const result = await expectVisualSnapshot('output.png', 'my-test');
 * expect(result.pass).toBe(true);
 * ```
 *
 * Or with custom matcher (see vitest.setup.ts):
 * ```ts
 * await expect('output.png').toMatchVisualSnapshot('my-test');
 * ```
 */
export async function expectVisualSnapshot(
  actualPath: string,
  snapshotName: string,
  options: VisualSnapshotOptions = {}
): Promise<VisualSnapshotResult> {
  const {
    update = process.env.UPDATE_SNAPSHOTS === '1' || process.env.UPDATE_SNAPSHOTS === 'true',
    snapshotDir = 'tests/__baselines__',
    diffDir = 'tests/__diff__',
    ...compareOptions
  } = options;

  const baselinePath = path.resolve(snapshotDir, `${snapshotName}.png`);
  const diffPath = path.resolve(diffDir, `${snapshotName}.png`);

  // Ensure directories exist
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });

  // Check if actual output exists
  if (!fs.existsSync(actualPath)) {
    return {
      pass: false,
      message: `Actual image not found at: ${actualPath}`
    };
  }

  // Update mode: copy actual to baseline
  if (update) {
    fs.copyFileSync(actualPath, baselinePath);
    return {
      pass: true,
      message: `✅ Snapshot updated: ${snapshotName}`
    };
  }

  // First run: baseline doesn't exist
  if (!fs.existsSync(baselinePath)) {
    fs.copyFileSync(actualPath, baselinePath);
    return {
      pass: true,
      message: `✅ New snapshot created: ${snapshotName}\n` +
        `   Baseline saved to: ${baselinePath}\n` +
        `   ⚠️  Review and commit this baseline to git!`
    };
  }

  // Compare with baseline
  try {
    const result = await comparePng(actualPath, baselinePath, diffPath, compareOptions);

    return {
      pass: true,
      message: `✅ Visual snapshot matches (${result.diffPixels}/${result.totalPixels} pixels differ, ${result.diffPercentage.toFixed(4)}%)`,
      ...result
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      pass: false,
      message: `❌ Visual snapshot mismatch: ${snapshotName}\n` +
        `   ${errorMessage}\n` +
        `   Diff saved to: ${diffPath}\n\n` +
        `   To update snapshot, run: UPDATE_SNAPSHOTS=1 npm test\n` +
        `   Or manually: cp ${actualPath} ${baselinePath}`,
      diffPath
    };
  }
}

/**
 * Helper to get snapshot paths
 */
export function getSnapshotPaths(snapshotName: string) {
  return {
    baseline: path.resolve('tests/__baselines__', `${snapshotName}.png`),
    output: path.resolve('tests/__output__', `${snapshotName}.png`),
    diff: path.resolve('tests/__diff__', `${snapshotName}.png`)
  };
}
