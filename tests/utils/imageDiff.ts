import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export type CompareOptions = {
  threshold?: number;
  maxDiffPixels?: number;
};

export type CompareResult = {
  diffPixels: number;
  totalPixels: number;
  diffPercentage: number;
  diffPath: string;
};

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

  const totalPixels = actual.width * actual.height;
  const diffPercentage = (diffPixels / totalPixels) * 100;

  fs.mkdirSync(path.dirname(diffPath), { recursive: true });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  if (diffPixels > maxDiffPixels) {
    throw new Error(
      `PNG diff exceeded tolerance: ${diffPixels} pixels differ (${diffPercentage.toFixed(2)}% of ${totalPixels} total, allowed ${maxDiffPixels}). Diff saved to ${diffPath}`
    );
  }

  return { diffPixels, totalPixels, diffPercentage, diffPath };
}
