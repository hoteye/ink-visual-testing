/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Visual regression tests for SettingsDialog component using ink-visual-testing.
 *
 * These tests generate PNG snapshots of the SettingsDialog component in various states
 * to catch visual regressions and ensure UI consistency across changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { createSnapshotFromPty, getCIOptimizedConfig } from 'ink-visual-testing';

const resolveSnapshotOutput = (testName: string) => {
  const baselineDir = path.join(
    'tests',
    '__screenshots__',
    'SettingsDialog.visual.test.tsx',
  );
  const actualDir = path.join('tests', '__visual_output__');
  const baselinePath = path.join(baselineDir, `${testName}.png`);

  const vitestState = (globalThis as any).__vitest_worker__;
  const updateMode = vitestState?.config?.snapshotOptions?.updateSnapshot ?? 'new';
  const updateEnv = process.env.UPDATE_BASELINES ?? process.env.UPDATE_SNAPSHOT;
  const updateFlag = updateEnv === '1' || updateEnv === 'true';
  const baselineExists = fs.existsSync(baselinePath);

  const shouldWriteBaseline =
    updateFlag ||
    updateMode === 'all' ||
    (!baselineExists && updateMode !== 'none');

  const outputDir = shouldWriteBaseline ? baselineDir : actualDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return { outputDir };
};

/**
 * Helper function to create a visual test using the standalone render script
 */
const visualTest = async (
  testName: string,
  userSettings: Record<string, unknown> = {},
  options: {
    cols?: number;
    rows?: number;
    emojiFontKey?: string;
    baseFont?: 'bundled' | 'system';
  } = {}
) => {
  const {
    cols = 120,
    rows = 40,
    emojiFontKey = 'system',
    baseFont = 'bundled'
  } = options;

  // Get optimized configuration for WSL environment
  const config = {
    ...getCIOptimizedConfig({
      emojiFontKey,
      baseFont,
    }),
    backgroundColor: '#000000', // Use black background to match terminal
    margin: 20, // Increase margin for better visibility
  };

  // Use the standalone render script
  const scriptPath = 'render-settings-dialog.tsx';
  const configArg = JSON.stringify({ userSettings });

  const { outputDir } = resolveSnapshotOutput(testName);
  const outputPath = path.join(outputDir, `${testName}.png`);

  await createSnapshotFromPty({
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsx', scriptPath, '--config', configArg],
    outputPath,
    ...config,
    cols,
    rows,
    timeout: 60000,
    env: {
      ...process.env,
      FORCE_COLOR: '3',
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color'
    }
  });

  console.log(`Generated visual snapshot: ${outputPath}`);
  return outputPath;
};

describe('SettingsDialog Visual Tests', () => {
  it('should render default settings dialog', async () => {
    await visualTest('settings-dialog-default', {}, {
      cols: 120,
      rows: 40,
    });
  }, 60000); // 60 second timeout

  it('should render settings dialog with vim mode enabled', async () => {
    await visualTest('settings-dialog-vim-enabled', {
      general: {
        vimMode: true
      }
    }, {
      cols: 120,
      rows: 40,
    });
  }, 60000);

  it('should render settings dialog with multiple boolean settings enabled', async () => {
    await visualTest('settings-dialog-multiple-enabled', {
      general: {
        vimMode: true,
        disableAutoUpdate: true,
        debugKeystrokeLogging: true,
      },
      ui: {
        hideWindowTitle: true,
        hideTips: true,
        showMemoryUsage: true,
      }
    }, {
      cols: 120,
      rows: 40,
    });
  }, 60000);

  it('should render settings dialog with accessibility settings', async () => {
    await visualTest('settings-dialog-accessibility', {
      ui: {
        accessibility: {
          disableLoadingPhrases: true,
          screenReader: true,
        },
        showMemoryUsage: true,
        showLineNumbers: true,
      },
      general: {
        vimMode: true,
      },
    }, {
      cols: 120,
      rows: 40,
    });
  }, 60000);

  it('should render settings dialog in small terminal size', async () => {
    await visualTest('settings-dialog-small-terminal', {}, {
      cols: 80,
      rows: 24,
    });
  }, 60000);

  it('should render settings dialog in large terminal size', async () => {
    await visualTest('settings-dialog-large-terminal', {}, {
      cols: 160,
      rows: 60,
    });
  }, 60000);
});
