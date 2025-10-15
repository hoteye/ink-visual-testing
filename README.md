# Ink Visual Testing

[![npm version](https://img.shields.io/npm/v/ink-visual-testing.svg)](https://www.npmjs.com/package/ink-visual-testing)
[![npm downloads](https://img.shields.io/npm/dm/ink-visual-testing.svg)](https://www.npmjs.com/package/ink-visual-testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Visual regression testing for [Ink](https://github.com/vadimdemedes/ink) CLI applications with perfect emoji support.

## Features

Visual regression testing helps detect unexpected changes in your UI:

- **Prevent Layout Issues** - Automatically detect border, alignment, and spacing problems
- **Validate Dynamic Rendering** - Ensure UI displays correctly with different data
- **Catch Style Changes** - Detect unexpected color, font, and style modifications
- **Multi-State Testing** - Test loading, error, empty states, and more
- **CI/CD Integration** - Automatically catch visual bugs before merging

## Installation

```bash
npm install ink-visual-testing --save-dev
```

## Usage

### 1. Basic Usage

```tsx
import { describe, it } from 'vitest';
import React from 'react';
import { Box, Text } from 'ink';
import { visualTest } from 'ink-visual-testing';

// Your Ink component
const Greeting = ({ name, message }) => (
  <Box borderStyle="round" borderColor="cyan" padding={1}>
    <Text>Hello, <Text bold color="green">{name}</Text>!</Text>
    <Text dimColor>{message}</Text>
  </Box>
);

describe('Greeting', () => {
  it('should render correctly', async () => {
    // Mock data for the component
    const mockData = {
      name: 'Alice',
      message: 'Welcome to Ink Visual Testing'
    };

    // One line to create a visual test
    await visualTest('greeting', <Greeting {...mockData} />);
  });
});
```

**First run**: Automatically generates baseline image at `tests/__baselines__/greeting.png`
**Subsequent runs**: Compares current output with baseline, failing if differences detected

### 2. Configuration Options

```tsx
await visualTest(
  'component-name',      // Snapshot name
  <MyComponent />,       // React component
  {
    cols: 80,                  // Terminal width (default: 80)
    rows: 24,                  // Terminal height (default: 24)
    maxDiffPixels: 100,        // Max allowed pixel difference (default: 100)
    threshold: 0.1,            // Pixel diff threshold 0-1 (default: 0.1)
    backgroundColor: '#000000' // Background color (default: black)
  }
);
```

### 3. Testing Different States

```tsx
describe('Dashboard', () => {
  it('loading state', async () => {
    await visualTest('dashboard-loading', <Dashboard loading={true} />);
  });

  it('loaded state', async () => {
    const mockData = { users: 100, sales: 5000 };
    await visualTest('dashboard-loaded', <Dashboard data={mockData} />);
  });

  it('error state', async () => {
    await visualTest('dashboard-error', <Dashboard error="Network Error" />);
  });
});
```

### 4. Testing Responsive Layouts

```tsx
it('different terminal sizes', async () => {
  const mockData = { /* ... */ };

  // Small terminal
  await visualTest('small', <MyApp data={mockData} />, {
    cols: 60,
    rows: 20
  });

  // Large terminal
  await visualTest('large', <MyApp data={mockData} />, {
    cols: 120,
    rows: 40
  });
});
```

### 5. Updating Baselines

When you have **intentional** UI changes, update baselines:

```bash
# Run tests
npm test

# Review the new generated images
open tests/__output__/*.png

# If correct, update baselines
cp tests/__output__/*.png tests/__baselines__/

# Commit the updates
git add tests/__baselines__/
git commit -m "Update visual baselines"
```

Or use an npm script:

```json
{
  "scripts": {
    "test": "vitest",
    "baseline:update": "cp tests/__output__/*.png tests/__baselines__/"
  }
}
```

### 6. Understanding Test Failures

When visual tests fail, it means the UI output differs from the baseline. This catches both intentional and unintentional changes.

#### Example: Detecting Unintended Changes

Consider a SettingsDialog where someone accidentally modified settings values:

```tsx
// Original fixture (created baseline)
const mockSettings = {
  general: { vimMode: true }
};

// Modified fixture (someone changed vimMode to false and added settings)
const mockSettings = {
  general: {
    vimMode: false,          // ← Changed!
    disableAutoUpdate: true,  // ← Added!
    debugKeystrokeLogging: true // ← Added!
  }
};
```

**Test output:**
```bash
$ npm test

 FAIL  tests/SettingsDialog.visual.test.tsx
   × should render default settings dialog
     → PNG diff exceeded tolerance: 777 pixels differ (allowed 500).
        Diff saved to tests/__diff__/settings-dialog-default.png

 Test Files  1 failed (1)
```

**What happens:**

1. **Baseline image**: Shows original UI with `vimMode: true`
2. **Current output**: Shows modified UI with `vimMode: false` and extra settings
3. **Diff image**: Highlights the differences in yellow/orange:
   - "Disable Auto Update (Modified in System)" - highlighted
   - "Debug Keystroke Logging (Modified in System)" - highlighted

The test fails with a clear message: `777 pixels differ (allowed 500)`, pinpointing exactly how many pixels changed.

**How to resolve:**

1. **If change was unintentional (bug):**
   ```bash
   # Fix the code to match the baseline
   git diff src/components/SettingsDialog.tsx
   # Revert the changes
   ```

2. **If change was intentional (feature):**
   ```bash
   # Review the diff image
   open tests/__diff__/settings-dialog-default.png

   # If correct, update baseline
   cp tests/__output__/settings-dialog-default.png tests/__baselines__/

   # Commit the new baseline
   git add tests/__baselines__/
   git commit -m "Update baseline after adding new settings"
   ```

**Key insight:** The diff image makes it obvious what changed, helping you decide if it's a bug or an intentional improvement!

#### Real Failure Examples

Let's examine two concrete scenarios where visual tests catch problems:

**Example 1: Content Difference - Text Changed**

Someone modified the file count in a success message:

```tsx
// Baseline fixture
<Text dimColor>
  Files processed: 10
</Text>

// Modified fixture (accidentally changed)
<Text dimColor>
  Files processed: 25 (DIFFERENT!)
</Text>
```

**Test output:**
```bash
$ npm test

 FAIL  tests/VisualFailure.demo.test.tsx
   × should detect content difference (extra text)
     → PNG diff exceeded tolerance: 299 pixels differ (allowed 100).
        Diff saved to tests/__diff__/message-box-content.png
```

**Visual comparison:**
- **Baseline**: Shows "Files processed: 10"
- **Output**: Shows "Files processed: 25 (DIFFERENT!)"
- **Diff**: Highlights "25 (DIFFERENT!)" in red/yellow - clearly showing the text change

**299 pixels changed** because the characters "25 (DIFFERENT!)" replaced "10", affecting approximately that many pixels.

---

**Example 2: Color Difference - Styling Changed**

Someone changed the color of a status indicator from yellow to cyan:

```tsx
// Baseline fixture
<Text bold color="yellow">
  Active
</Text>

// Modified fixture (color accidentally changed)
<Text bold color="cyan">
  Active
</Text>
```

**Test output:**
```bash
$ npm test

 FAIL  tests/VisualFailure.demo.test.tsx
   × should detect color difference (cyan vs yellow)
     → PNG diff exceeded tolerance: 178 pixels differ (allowed 50).
        Diff saved to tests/__diff__/status-box-color.png
```

**Visual comparison:**
- **Baseline**: "Active" rendered in yellow color
- **Output**: "Active" rendered in cyan color
- **Diff**: Highlights the entire word "Active" in red - showing every pixel of the word changed color

**178 pixels changed** because each character pixel in "Active" has a different RGB value (yellow vs cyan).

---

#### Understanding Diff Colors

The diff image uses these colors:
- **Gray background**: Identical pixels (darkened for contrast)
- **Yellow/Orange**: Small differences (anti-aliasing, slight shifts)
- **Red**: Significant differences (different text, different colors)

**More red/yellow = more pixels changed = larger visual difference**

## Best Practices

### Key Points

1. **Use Fixed Mock Data**
   ```tsx
   // Good: Fixed data
   const mockData = {
     timestamp: '2024-01-15 10:30:00',
     count: 42
   };

   // Bad: Dynamic data (different every time)
   const mockData = {
     timestamp: new Date().toISOString(),
     count: Math.random()
   };
   ```

2. **Create Separate Tests for Each State**
   ```tsx
   // Good: Separate tests
   it('empty state', () => visualTest('empty', <List items={[]} />));
   it('with data', () => visualTest('with-data', <List items={mock} />));

   // Bad: Reusing names
   it('list', () => {
     visualTest('list', <List items={[]} />);
     visualTest('list', <List items={mock} />); // Name conflict!
   });
   ```

3. **Set Appropriate Tolerance**
   - Static content (logos, icons): `maxDiffPixels: 0` (strict)
   - Simple layouts: `maxDiffPixels: 100` (default)
   - Complex layouts: `maxDiffPixels: 500` (lenient)

4. **Ignore Generated Files**
   ```gitignore
   # .gitignore
   tests/__output__/    # Test output
   tests/__diff__/      # Diff images
   tests/__temp__/      # Temporary files

   # Baseline images should be committed
   !tests/__baselines__/
   ```

### CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: Visual Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libnss3 libatk1.0-0 libgbm1 fonts-dejavu-core

      - run: npm ci
      - run: npm test

      - name: Upload diff images on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: tests/__diff__/*.png
```

### Keep Snapshot Dimensions Stable

- **Measure once, reuse everywhere** – Run your render script manually and capture the PTY output to learn the exact character size of the UI. For example:
  ```bash
  npx tsx render-settings-dialog.tsx > captured-pty-data.txt
  node -e "import fs from 'fs'; import strip from 'strip-ansi'; const lines = strip(fs.readFileSync('captured-pty-data.txt','utf8')).split('\\n'); console.log({ cols: Math.max(...lines.map(l => l.length)), rows: lines.length });"
  ```
  Use the reported `cols`/`rows` as your minimum terminal size.
- **Share a snapshot config** – Define a single object that freezes every dimension-sensitive option (`cols`, `rows`, `margin`, `fontFamily`, `emojiFontKey`) and reuse it in all tests and in CI:
  ```ts
  const sharedSnapshotConfig = {
    ...getCIOptimizedConfig(),
    cols: 80,
    rows: 24,
    margin: 12,
    fontFamily: 'DejaVu Sans Mono, Consolas, monospace',
  } satisfies Partial<NodePtySnapshotOptions>;
  ```
  Then spread `sharedSnapshotConfig` into every `createSnapshotFromPty` call.
- **Controlled baseline updates** – Mirror Vitest’s snapshot flow: respect the `--update` flag (or `process.env.UPDATE_SNAPSHOT`) to decide when to write into `tests/__screenshots__/<test-file>/`, and otherwise emit fresh renders into `tests/__visual_output__` for diffing. Provide a manual override env (e.g. `UPDATE_BASELINES=1`) only as a fallback for local scripts.
- **Document overrides** – If a test needs a different size (e.g. small vs. large terminal), record the reasoning in code comments and keep those values constant between baseline generation and CI runs.
- **Optional trims** – If you want to remove surrounding padding, pass `trimTransparentBorder: true`; otherwise keep the same margin everywhere so that the bitmap remains identical across runs.

### Project Structure

Recommended directory structure:

```
your-project/
├── src/
│   └── components/
│       └── MyComponent.tsx     # Your Ink component
├── tests/
│   ├── simple-box-auto.test.ts # Visual test entry
│   ├── utils/                  # Shared helpers (diffing, snapshots, etc.)
│   │   ├── imageDiff.ts
│   │   └── visualSnapshot.ts
│   ├── vitest.setup.ts         # Test environment setup
│   ├── __baselines__/          # Baseline images (commit to Git)
│   │   ├── my-component.png
│   │   └── my-component-loading.png
│   ├── __output__/             # Test output (Git ignore)
│   └── __diff__/               # Diff images (Git ignore)
└── package.json
```

## Maintenance & Long-term Benefits

### Initial Setup Effort

The effort required depends on component complexity:

#### Simple Components (No Context Dependencies)

**Example:** Basic message box without Context Providers

```tsx
// tests/fixtures/simple-message.tsx
import React from 'react';
import { render, Box, Text } from 'ink';

render(
  <Box borderStyle="round" padding={1}>
    <Text>Success!</Text>
  </Box>
);
```

```tsx
// tests/SimpleMessage.visual.test.tsx
import { visualTest } from 'ink-visual-testing';

it('renders simple message', async () => {
  await visualTest('simple-message', './tests/fixtures/simple-message.tsx', {
    cols: 80, rows: 20
  });
});
```

**Effort:** ~33 lines of code

#### Complex Components (With Context Providers)

**Example:** Settings dialog with VimModeProvider and KeypressProvider

```tsx
// tests/fixtures/settings-dialog-default.tsx
import { useEffect } from 'react';
import { render } from 'ink';
import { SettingsDialog } from '../../src/components/SettingsDialog.js';
import { VimModeProvider } from '../../src/contexts/VimModeContext.js';
import { KeypressProvider } from '../../src/contexts/KeypressContext.js';

const mockSettings = createMockSettings({
  general: { vimMode: true }
});

const SettingsDialogWrapper = () => {
  useEffect(() => {
    const timer = setTimeout(() => process.exit(0), 1000);
    return () => clearTimeout(timer);
  }, []);

  return <SettingsDialog settings={mockSettings} onSelect={() => {}} />;
};

const { unmount } = render(
  <VimModeProvider settings={mockSettings}>
    <KeypressProvider kittyProtocolEnabled={false}>
      <SettingsDialogWrapper />
    </KeypressProvider>
  </VimModeProvider>
);

process.on('SIGINT', () => {
  unmount();
  process.exit(0);
});
```

**Effort for 7 test scenarios:** ~483 lines of code

But this is a **one-time investment** with continuous benefits!

### Maintenance Cost When Components Change

| Change Type | What to Update | Frequency |
|------------|----------------|-----------|
| **Add new option/feature** | Only baseline images | Common (80%) |
| **Style/layout changes** | Only baseline images | Common |
| **Add new test scenario** | 1 new fixture file | Occasional |
| **Modify component props** | Batch find-replace in fixtures | Rare |
| **Change Context structure** | All fixture files | Very rare |

**Key insight:** Most changes (80%) only require updating baseline images—typically just a quick review before approving visual changes!

### Why "One-time Setup, Continuous Benefits"?

#### 1. Test Files Never Change
The test logic remains stable:
```tsx
await visualTest('component-name', './fixtures/component.tsx', options);
```
You only add new tests when adding new scenarios.

#### 2. Fixtures Rarely Change
Most UI changes don't require fixture modifications:
- Adding new UI elements: No fixture changes needed
- Changing colors/styles: No fixture changes needed
- Modifying layout: No fixture changes needed
- Changing component API: Quick batch find-replace
- Adding Context Providers: One-time update to all fixtures

#### 3. Baseline Updates Are Fast
```bash
# Run tests to see what changed
npm test

# If changes look correct, update baselines
cp tests/__output__/*.png tests/__baselines__/

# Commit the updates
git add tests/__baselines__/
git commit -m "Update baselines after adding dark mode"
```

This takes **1-2 minutes** vs. 15+ minutes of manual testing!

#### 4. Automated Regression Detection
Once set up, every PR automatically checks for visual regressions:
- Catches unintended UI changes
- Prevents layout bugs
- Ensures consistent rendering across environments
- No manual testing needed

### Tips for Minimizing Maintenance

**1. Reuse Mock Data**
```tsx
// tests/mocks/settings.ts
export const defaultSettings = createMockSettings({ ... });
export const vimEnabledSettings = createMockSettings({ general: { vimMode: true } });

// In fixtures, just import and use
import { defaultSettings } from '../mocks/settings';
```

**2. Use a Fixture Template**
Create a base fixture and copy/modify for new scenarios:
```tsx
// tests/fixtures/_template.tsx
import { useEffect } from 'react';
import { render } from 'ink';
import { MyComponent } from '../../src/MyComponent';
import { AllNecessaryProviders } from './providers';

const FixtureWrapper = () => {
  useEffect(() => {
    const timer = setTimeout(() => process.exit(0), 1000);
    return () => clearTimeout(timer);
  }, []);

  return <MyComponent {...mockProps} />;
};

render(
  <AllNecessaryProviders>
    <FixtureWrapper />
  </AllNecessaryProviders>
);
```

**3. Automate Baseline Updates**
```json
{
  "scripts": {
    "test:visual": "vitest --run tests/*.visual.test.tsx",
    "baseline:update": "cp tests/__output__/*.png tests/__baselines__/",
    "baseline:review": "open tests/__output__/*.png"
  }
}
```

## Advanced Usage

### Lower-Level API

If you need more control, use the lower-level API:

```tsx
import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';
import path from 'node:path';

// Render CLI app to PNG
await fixedPtyRender(
  path.resolve('examples/my-cli.tsx'),
  'output.png',
  {
    ...getCIOptimizedConfig(),
    cols: 120,
    rows: 60
  }
);
```

### Font Configuration

Uses bundled DejaVu Sans Mono by default so snapshots look the same locally and in CI. To adjust emoji or base fonts:

```tsx
import { getCIOptimizedConfig } from 'ink-visual-testing';

getCIOptimizedConfig('mono'); // Use bundled monochrome emoji font
getCIOptimizedConfig('color'); // Use bundled color emoji font

// Fall back to the system's monospace font stack (matching pre-v0.1.19 behaviour)
getCIOptimizedConfig({ baseFont: 'system' });
```

> **Tip:** `getCIOptimizedConfig()` now returns `{ baseFont: 'bundled' }` by default, which loads the included DejaVu Sans Mono (`font/DejaVuSansMono.ttf`). This avoids "baseline vs CI" font mismatches while still letting you opt into system fonts when needed.

**Bundled fonts**
- DejaVu Sans Mono (Bitstream Vera License)
- NotoColorEmoji (SIL Open Font License)
- NotoEmoji-Regular (SIL Open Font License)
- TwemojiMozilla (Mozilla Public License)
- GNU Unifont (GNU GPLv2 with font embedding exception)

## Examples

### Quick Start Examples

See `examples/` directory for basic examples:

- `examples/dashboard.tsx` - Complex dashboard layout with emoji and various layouts
- `examples/dashboard-cli.tsx` - CLI entry point
- `examples/dashboard-snapshot.tsx` - Snapshot generation script

Run examples:
```bash
# View live rendering
npx tsx examples/dashboard-cli.tsx

# Generate snapshot
npx tsx examples/dashboard-snapshot.tsx
```

### Real-World Integration Example

For a complete, production-ready example showing how to integrate `ink-visual-testing` into an existing project with complex components, see:

**[Real-World Integration Guide](examples/real-world-integration/README.md)**

This example demonstrates:
- ✅ Testing a complex Settings Dialog component with 6 test cases
- ✅ Handling Context Providers (VimModeProvider, KeypressProvider)
- ✅ Creating reusable test helpers
- ✅ Proper mock data structure for stateful components
- ✅ Testing different terminal sizes and states
- ✅ WSL/CI compatibility best practices
- ✅ Complete troubleshooting guide

Perfect for understanding how to use `ink-visual-testing` in real projects!

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please check [GitHub Issues](https://github.com/hoteye/ink-visual-testing/issues).
