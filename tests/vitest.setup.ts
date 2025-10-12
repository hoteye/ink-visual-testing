import { expect } from 'vitest';
import { expectVisualSnapshot, type VisualSnapshotOptions } from './utils/visualSnapshot.js';

/**
 * Custom Vitest matcher for visual snapshot testing
 *
 * Usage:
 * ```ts
 * await expect('output.png').toMatchVisualSnapshot('my-test');
 * ```
 */
expect.extend({
  async toMatchVisualSnapshot(
    actualPath: string,
    snapshotName: string,
    options?: VisualSnapshotOptions
  ) {
    const result = await expectVisualSnapshot(actualPath, snapshotName, options);

    return {
      pass: result.pass,
      message: () => result.message,
      actual: result.diffPixels,
      expected: 0
    };
  }
});

// Extend Vitest types
declare module 'vitest' {
  interface Assertion<T = any> {
    toMatchVisualSnapshot(snapshotName: string, options?: VisualSnapshotOptions): Promise<void>;
  }
  interface AsymmetricMatchersContaining {
    toMatchVisualSnapshot(snapshotName: string, options?: VisualSnapshotOptions): Promise<void>;
  }
}
