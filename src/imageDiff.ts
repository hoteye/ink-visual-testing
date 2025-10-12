import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import type { CompareOptions, CompareResult } from './types.js';

export async function comparePng(
  actualPath: string,
  baselinePath: string,
  diffPath: string,
  { threshold = 0.1, maxDiffPixels = 0 }: CompareOptions = {}
): Promise<CompareResult> {
  const actual = PNG.sync.read(fs.readFileSync(actualPath));
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    throw new Error('Image dimensions differ between actual and baseline.');
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const diffPixels = pixelmatch(
    actual.data,
    baseline.data,
    diff.data,
    actual.width,
    actual.height,
    { threshold }
  );

  fs.mkdirSync(path.dirname(diffPath), { recursive: true });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  if (diffPixels > maxDiffPixels) {
    throw new Error(
      `PNG diff exceeded tolerance: ${diffPixels} pixels differ (allowed ${maxDiffPixels}). Diff saved to ${diffPath}`
    );
  }

  return { diffPixels, diffPath };
}
