# Ink Visual Testing

[![npm version](https://img.shields.io/npm/v/ink-visual-testing.svg)](https://www.npmjs.com/package/ink-visual-testing)
[![npm downloads](https://img.shields.io/npm/dm/ink-visual-testing.svg)](https://www.npmjs.com/package/ink-visual-testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Visual regression testing for [Ink](https://github.com/vadimdemedes/ink) CLI applications with perfect emoji support.

## Features

Visual regression testing helps detect unexpected changes in your UI:

- ✅ **Prevent Layout Issues** - Automatically detect border, alignment, and spacing problems
- ✅ **Validate Dynamic Rendering** - Ensure UI displays correctly with different data
- ✅ **Catch Style Changes** - Detect unexpected color, font, and style modifications
- ✅ **Multi-State Testing** - Test loading, error, empty states, and more
- ✅ **CI/CD Integration** - Automatically catch visual bugs before merging

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

## Best Practices

### ⚠️ Key Points

1. **Use Fixed Mock Data**
   ```tsx
   // ✅ Good: Fixed data
   const mockData = {
     timestamp: '2024-01-15 10:30:00',
     count: 42
   };

   // ❌ Bad: Dynamic data (different every time)
   const mockData = {
     timestamp: new Date().toISOString(),
     count: Math.random()
   };
   ```

2. **Create Separate Tests for Each State**
   ```tsx
   // ✅ Good: Separate tests
   it('empty state', () => visualTest('empty', <List items={[]} />));
   it('with data', () => visualTest('with-data', <List items={mock} />));

   // ❌ Bad: Reusing names
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

### 🔧 CI/CD Configuration

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

### 📊 Project Structure

Recommended directory structure:

```
your-project/
├── src/
│   └── components/
│       └── MyComponent.tsx     # Your Ink component
├── tests/
│   ├── MyComponent.test.ts     # Test file (with mock data)
│   ├── __baselines__/          # Baseline images (commit to Git)
│   │   ├── my-component.png
│   │   └── my-component-loading.png
│   ├── __output__/             # Test output (Git ignore)
│   └── __diff__/               # Diff images (Git ignore)
└── package.json
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

Uses system fonts by default (recommended). To use bundled emoji fonts:

```tsx
import { getCIOptimizedConfig } from 'ink-visual-testing';

getCIOptimizedConfig('mono')   // NotoEmoji-Regular.ttf (monochrome)
getCIOptimizedConfig('color')  // NotoColorEmoji.ttf (color)
getCIOptimizedConfig()         // System fonts (default)
```

## Examples

See `examples/` directory for complete examples:

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

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please check [GitHub Issues](https://github.com/hoteye/ink-visual-testing/issues).
