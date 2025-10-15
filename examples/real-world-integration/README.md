# Real-World Integration Example

This directory contains a real-world example of integrating `ink-visual-testing` into an existing project - specifically, visual tests for a complex Settings Dialog component from the [Gemini CLI](https://github.com/google-gemini/gemini-cli) project.

## 📸 Example Output

Here's what the generated visual snapshots look like:

**Small Terminal (80×24):**

![Settings Dialog - Small Terminal](example-small-terminal.png)

These snapshots are automatically generated and compared against baselines to catch visual regressions.

## 📁 Files

- **`SettingsDialog.visual.test.tsx`** - Complete visual test suite with 6 test cases
- **`render-settings-dialog.tsx`** - Standalone render script that wraps the component for visual testing

## 🎯 What This Example Demonstrates

### 1. Testing Strategy for Complex Components

The Settings Dialog component includes:
- Multiple nested settings with different types (boolean, number, string, enum)
- Keyboard navigation and focus management
- Scope selection (User/System/Workspace settings)
- Dynamic layout adjustments based on terminal size
- Color themes and semantic colors

This example shows how to test all these aspects visually.

### 2. Test Cases Covered

```typescript
✓ Default settings dialog (120×40)
✓ Settings dialog with vim mode enabled
✓ Settings dialog with multiple boolean settings enabled
✓ Settings dialog with accessibility settings
✓ Settings dialog in small terminal size (80×24)
✓ Settings dialog in large terminal size (160×60)
```

### 3. Key Patterns

#### Pattern 1: Standalone Render Script

Instead of trying to render components directly in tests, create a separate script:

```typescript
// render-settings-dialog.tsx
#!/usr/bin/env tsx

import React from 'react';
import { render } from 'ink';
import { MyComponent } from './src/ui/components/MyComponent.js';

// Parse config from command line args
const config = getTestConfig();
const settings = createMockSettings(config.userSettings);

const app = React.createElement(
  VimModeProvider,
  { settings },
  React.createElement(
    KeypressProvider,
    { kittyProtocolEnabled: false },
    React.createElement(MyComponent, { settings, onSelect: () => {} })
  )
);

const { waitUntilExit } = render(app);

// Set timeout to ensure proper capture
setTimeout(() => {
  process.exit(0);
}, 5000);

waitUntilExit().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
```

**Why this approach?**
- Separates rendering concerns from test assertions
- Makes the render script reusable (can be run manually for debugging)
- Allows passing different configurations via command-line args
- Handles provider setup and cleanup properly

#### Pattern 2: Reusable Test Helper

Create a helper function to reduce boilerplate:

```typescript
const visualTest = async (
  testName: string,
  userSettings: any = {},
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
    baseFont = 'bundled'     // Keep snapshots stable across machines
  } = options;

  // Get optimized configuration
  const config = {
    ...getCIOptimizedConfig({
      emojiFontKey,
      baseFont,
    }),
    backgroundColor: '#000000',
    margin: 20,
  };

  // Use the standalone render script
  const scriptPath = 'render-my-component.tsx';
  const configArg = JSON.stringify({ userSettings });

  // Generate the visual snapshot
  const outputPath = `tests/__visual_output__/${testName}.png`;

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
```

#### Pattern 3: Testing Different States

Test the same component in different states by passing different configurations:

```typescript
// Default state
await visualTest('component-default', {});

// With specific settings enabled
await visualTest('component-enabled', {
  general: {
    vimMode: true,
    disableAutoUpdate: true,
  },
  ui: {
    showMemoryUsage: true,
  }
});

// Different terminal sizes
await visualTest('component-small', {}, {
  cols: 80,
  rows: 24,
});
```

## 🔧 Integration Steps for Your Project

### Step 1: Install Dependencies

```bash
npm install --save-dev ink-visual-testing vitest
```

### Step 2: Create Standalone Render Script

Create `render-my-component.tsx` (or `.jsx`) in your project root:

```typescript
#!/usr/bin/env tsx

import React from 'react';
import { render } from 'ink';
import { MyComponent } from './src/components/MyComponent.js';

// Parse config from CLI args
const args = process.argv.slice(2);
const configIndex = args.findIndex(arg => arg === '--config');
const config = configIndex !== -1 && args[configIndex + 1]
  ? JSON.parse(args[configIndex + 1])
  : {};

// Create mock data
const mockData = createMockData(config);

// Render component
const app = <MyComponent {...mockData} />;
const { waitUntilExit } = render(app);

// Timeout for snapshot capture
setTimeout(() => process.exit(0), 5000);
waitUntilExit().then(() => process.exit(0)).catch(() => process.exit(1));
```

### Step 3: Create Visual Test File

Create `MyComponent.visual.test.tsx`:

```typescript
import { describe, it } from 'vitest';
import { createSnapshotFromPty, getCIOptimizedConfig } from 'ink-visual-testing';

describe('MyComponent Visual Tests', () => {
  it('should render default state', async () => {
    await createSnapshotFromPty({
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ['tsx', 'render-my-component.tsx'],
      outputPath: 'tests/__visual_output__/my-component-default.png',
      ...getCIOptimizedConfig({
        emojiFontKey: 'system',
        baseFont: 'bundled',
      }),
      cols: 120,
      rows: 40,
      timeout: 60000,
    });
  }, 60000);
});
```

### Step 4: Run Tests

```bash
npm test -- MyComponent.visual.test.tsx
```

## 📝 Best Practices

### 1. Control Base Fonts Explicitly

```typescript
// ✅ Default: bundled DejaVu keeps CI/local identical
getCIOptimizedConfig();

// 🔁 Opt-in: rely on runner fonts (pre-v0.1.19 behaviour)
getCIOptimizedConfig({ baseFont: 'system' });

// 🎨 Pick a different emoji font while retaining the bundled base
getCIOptimizedConfig({ emojiFontKey: 'mono' });
```

### 2. Set Appropriate Timeouts

```typescript
// Test timeout (should be longer than PTY timeout)
it('should render', async () => {
  await createSnapshotFromPty({
    timeout: 60000,  // PTY process timeout
  });
}, 120000);  // Test timeout (2x PTY timeout)
```

### 3. Mock Data Structure

For components that need complex state, create proper mock data:

```typescript
const createMockSettings = (
  userSettings = {},
  systemSettings = {},
  workspaceSettings = {},
) => {
  return new LoadedSettings(
    {
      settings: { ui: { customThemes: {} }, mcpServers: {}, ...systemSettings },
      originalSettings: { ui: { customThemes: {} }, mcpServers: {}, ...systemSettings },
      path: '/system/settings.json',
    },
    {
      settings: {},
      originalSettings: {},
      path: '/system/system-defaults.json',
    },
    {
      settings: { ui: { customThemes: {} }, mcpServers: {}, ...userSettings },
      originalSettings: { ui: { customThemes: {} }, mcpServers: {}, ...userSettings },
      path: '/user/settings.json',
    },
    {
      settings: { ui: { customThemes: {} }, mcpServers: {}, ...workspaceSettings },
      originalSettings: { ui: { customThemes: {} }, mcpServers: {}, ...workspaceSettings },
      path: '/workspace/settings.json',
    },
    true,
    new Set(),
  );
};
```

**Important**: Each scope must have its own independent settings object. Don't reuse the same object reference across scopes!

### 4. Environment Variables

Ensure proper terminal emulation:

```typescript
env: {
  ...process.env,
  FORCE_COLOR: '3',        // Enable 24-bit color
  COLORTERM: 'truecolor',  // Signal truecolor support
  TERM: 'xterm-256color'   // Terminal type
}
```

### 5. Terminal Size Testing

Test responsive layouts with different terminal sizes:

```typescript
// Small terminal (typical minimal size)
cols: 80, rows: 24

// Standard terminal
cols: 120, rows: 40

// Large terminal
cols: 160, rows: 60
```

### Baseline Management

- Run Vitest with `--update` when intentionally refreshing reference images. The helper reads Vitest’s snapshot mode so `vitest --update --run SettingsDialog.visual.test.tsx` writes to `tests/__screenshots__/SettingsDialog.visual.test.tsx/`.
- Regular test runs keep writing into `tests/__visual_output__` so you can diff against the committed baselines without overwriting them.
- As a fallback for standalone scripts you can set `UPDATE_BASELINES=1` to force baseline writes, mirroring the behavior of Vitest’s `--update` flag.

## 🐛 Troubleshooting

### Problem: Black/Empty Screenshots

**Possible causes:**
1. Missing base fonts (when using `baseFont: 'system'`) or bundled emoji fonts failing to load
2. Component crashing during render
3. PTY timeout too short

**Solutions:**
1. Stick with the default `baseFont: 'bundled'` or install an extra monospace font when opting into `baseFont: 'system'`
2. Switch to `emojiFontKey: 'system'` if emoji fonts fail to load in your environment
3. Test your render script manually: `npx tsx render-my-component.tsx`
4. Increase timeout: `timeout: 60000` or higher
5. Check console output for errors in PTY capture

### Problem: Layout Mismatch

**Possible causes:**
1. Mock data structure incorrect
2. Terminal size not matching between PTY spawn and xterm.js rendering

**Solutions:**
1. Ensure each scope has independent settings objects (no shared references)
2. Use consistent cols/rows values
3. Test render script manually to verify output

### Problem: Slow Tests

**Solutions:**
1. Run tests in parallel: `vitest run --pool=threads`
2. Reduce timeout for faster components
3. Use `--reporter=dot` for cleaner output
4. Consider splitting large test files

## 📚 Learn More

- [ink-visual-testing Documentation](../../README.md)
- [Gemini CLI Source](https://github.com/google-gemini/gemini-cli)
- [Vitest Documentation](https://vitest.dev/)
- [Ink Documentation](https://github.com/vadimdemedes/ink)

## 📄 License

This example code is provided as-is for educational purposes. The original component is from the Gemini CLI project (Apache 2.0 license).
