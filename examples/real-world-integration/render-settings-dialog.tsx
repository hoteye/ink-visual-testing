#!/usr/bin/env tsx

/**
 * Standalone script to render SettingsDialog for visual testing
 * This script can be used with ink-visual-testing to generate PNG snapshots
 */

import React from 'react';
import { render } from 'ink';
import { SettingsDialog } from './src/ui/components/SettingsDialog.js';
import { LoadedSettings } from './src/config/settings.js';
import { KeypressProvider } from './src/ui/contexts/KeypressContext.js';
import { VimModeProvider } from './src/ui/contexts/VimModeContext.js';

// Create minimal mock settings - matching the structure from SettingsDialog.test.tsx
const createMockSettings = (
  userSettings: Record<string, unknown> = {},
  systemSettings: Record<string, unknown> = {},
  workspaceSettings: Record<string, unknown> = {},
) => {
  return new LoadedSettings(
    {
      settings: { ui: { customThemes: {} }, mcpServers: {}, ...systemSettings },
      originalSettings: {
        ui: { customThemes: {} },
        mcpServers: {},
        ...systemSettings,
      },
      path: '/system/settings.json',
    },
    {
      settings: {},
      originalSettings: {},
      path: '/system/system-defaults.json',
    },
    {
      settings: {
        ui: { customThemes: {} },
        mcpServers: {},
        ...userSettings,
      },
      originalSettings: {
        ui: { customThemes: {} },
        mcpServers: {},
        ...userSettings,
      },
      path: '/user/settings.json',
    },
    {
      settings: {
        ui: { customThemes: {} },
        mcpServers: {},
        ...workspaceSettings,
      },
      originalSettings: {
        ui: { customThemes: {} },
        mcpServers: {},
        ...workspaceSettings,
      },
      path: '/workspace/settings.json',
    },
    true,
    new Set(),
  );
};

// Get configuration from command line args or use defaults
const getTestConfig = () => {
  const args = process.argv.slice(2);
  const configIndex = args.findIndex(arg => arg === '--config');

  if (configIndex !== -1 && args[configIndex + 1]) {
    try {
      return JSON.parse(args[configIndex + 1]);
    } catch (e) {
      console.error('Invalid config JSON:', e);
    }
  }

  return { userSettings: {} };
};

const config = getTestConfig();
const settings = createMockSettings(
  config.userSettings || {},
  config.systemSettings || {},
  config.workspaceSettings || {}
);
const onSelect = () => {};

const app = React.createElement(
  VimModeProvider,
  { settings },
  React.createElement(
    KeypressProvider,
    { kittyProtocolEnabled: false },
    React.createElement(SettingsDialog, { settings, onSelect })
  )
);

const { waitUntilExit } = render(app);

// Set a longer timeout to ensure proper capture - 5 seconds should be enough
setTimeout(() => {
  process.exit(0);
}, 5000);

// Also wait for natural exit if it happens sooner
waitUntilExit().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
