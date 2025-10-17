/**
 * Auto-patch initialization for ink-visual-testing
 * This file is imported first to automatically apply xterm patches
 * Users don't need to configure anything - patches are applied automatically!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  // Look for patches directory relative to this file
  const patchesDir = path.join(__dirname, '..', 'patches');

  if (fs.existsSync(patchesDir)) {
    // Try to find patch-package in multiple locations
    const possibleLocations = [
      // 1. In ink-visual-testing's own node_modules
      path.join(__dirname, '..', 'node_modules', '.bin', 'patch-package'),
      // 2. In the parent project's node_modules (if ink-visual-testing is a dependency)
      path.join(__dirname, '..', '..', '.bin', 'patch-package'),
      // 3. Further up the tree
      path.join(__dirname, '..', '..', '..', '.bin', 'patch-package'),
    ];

    let patchPackageBin: string | null = null;
    for (const location of possibleLocations) {
      if (fs.existsSync(location)) {
        patchPackageBin = location;
        break;
      }
    }

    // If patch-package is found, apply patches
    if (patchPackageBin) {
      execSync(`node "${patchPackageBin}" --patch-dir="${patchesDir}"`, {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000
      });
    }
    // If patch-package is not found, silently continue
    // Patches are optional and require patch-package to be installed
  }
} catch (error) {
  // Silently fail - patches are optional and may not apply successfully in all environments
}
