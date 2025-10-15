# Test Suite Documentation

This directory contains the test suite for ink-visual-testing, including both unit tests and visual regression tests.

## Test Summary

**Total: 124 tests across 8 test files**
- ✅ **123 unit tests** covering configuration, font handling, ANSI processing, and error handling
- ✅ **1 visual regression test** ensuring end-to-end rendering works correctly

## Test Files

### Configuration Tests (8 tests)

#### `config.test.ts`
Tests for the `getCIOptimizedConfig()` function to ensure:
- Bundled base font configuration is correct
- Font family names are not duplicated (regression test)
- System vs bundled font modes work correctly
- Emoji font configuration works properly
- CI-optimized defaults are set correctly

**Key Regression Prevention:**
- Prevents duplication of bundled base font name in `fontFamily` string
- Ensures `baseFontFamily` and `fontFamily` are kept separate

### Font Handling Tests (61 tests)

#### `font-patch.test.ts` (8 tests)
Tests for the font patching mechanism (`terminalScreenshotFontPatch.ts`):
- Verifies `withEmojiFontConfig()` correctly wraps functions
- Tests error handling and config cleanup
- Validates font configuration structure
- Ensures cols/rows can be passed through font config

#### `font-stack.test.ts` (22 tests)
Tests for font stack normalization and construction:
- **Font ordering**: emoji → base → fallback
- **Deduplication**: no font appears twice in stack
- **Quoting**: fonts with spaces get quotes
- **Generic family filtering**: system fonts (monospace, sans-serif) excluded from loading

**Critical Logic Tested:**
- `normaliseFamilies()`: Order and deduplicate fonts
- `quoteFamily()`: Add quotes to multi-word font names
- `buildFontLoadPromise()`: Generate browser font loading code
- `GENERIC_FONT_FAMILIES`: Recognize CSS generic families

#### `font-paths.test.ts` (23 tests)
Tests for font path resolution and validation:
- **Emoji fonts**: mono, color, twemoji, unifont
- **Base font**: DejaVuSansMono bundled font
- **Path resolution**: Absolute paths from compiled module
- **File existence**: All bundled fonts exist
- **Metadata validation**: Font family names, file formats

#### `parameter-passing.test.ts` (8 tests)
Tests for parameter passing through the call chain:
- Verifies `NodePtySnapshotOptions` interface includes all required fields
- Tests that font parameters (emoji and base) can be passed together
- Ensures cols/rows are part of the configuration

**Key Regression Prevention:**
- Documents the bug where `terminalScreenshotFontPatch` was recalculating cols using `.length`
- Ensures cols/rows from PTY are preserved and not recalculated
- Prevents width calculation mismatches that cause broken box borders with emoji

### ANSI Processing Tests (21 tests)

#### `ansi-processing.test.ts`
Tests for ANSI escape sequence handling and variation selector removal:
- **Variation Selector-16 (U+FE0F) removal**: Critical for emoji width consistency
- **ANSI escape code stripping**: Color codes, cursor movement
- **PTY environment variables**: FORCE_COLOR, COLORTERM, TERM
- **Terminal size defaults**: cols/rows fallback values

**Why Variation Selector Removal Matters:**
- `string-width` counts VS16 as width-1
- Unicode standard defines VS16 as width-0
- Removing VS16 prevents width calculation mismatches
- Ensures Ink's layout matches xterm.js rendering

### Error Handling Tests (33 tests)

#### `error-handling.test.ts`
Tests for error handling and edge cases:
- **Timeout configuration**: Default (30s), CI (60s), custom
- **Output path validation**: PNG, JPEG, nested directories
- **Command validation**: Platform-specific commands, arguments
- **Terminal size validation**: Negative, zero, standard, large
- **Margin and background**: Values, color codes
- **PTY exit codes**: Success (0), errors, undefined/null
- **Font configuration edge cases**: Missing paths/families, empty strings
- **Environment variable edge cases**: Undefined, merging, overriding

### Visual Regression Tests (1 test)

#### `simple-box-auto.test.ts`
End-to-end visual regression test:
- Generates a PNG snapshot of the dashboard example
- Compares against baseline image
- Automatically creates baseline on first run
- Supports update mode via `UPDATE_SNAPSHOTS=1`

## Running Tests

```bash
# Run all tests
npm test

# Run tests without watch mode
npm run test:visual

# Run specific test file
npm test config.test.ts

# Run tests with coverage
npm run test:coverage

# Update visual snapshots
UPDATE_SNAPSHOTS=1 npm test
```

## Test Utilities

### `tests/utils/`
- `imageDiff.ts` - PNG comparison using pixelmatch
- `visualSnapshot.ts` - Visual snapshot helper functions

### `tests/vitest.setup.ts`
Custom Vitest matchers for visual snapshot testing.

## Regression Tests

The test suite includes specific tests to prevent known regressions:

### 1. Font Name Duplication (Fixed in commit XXXX)

**Problem:** The bundled base font name (e.g., `InkSnapshotBaseMono`) was appearing twice in the final font stack.

**Root Cause:** `getCIOptimizedConfig()` was including the bundled font name in both `baseFontFamily` and `fontFamily`.

**Test Coverage:** `config.test.ts` > "should not duplicate bundled base font name in fontFamily"

### 2. Terminal Size Recalculation (Fixed in commit XXXX)

**Problem:** Emoji characters caused box borders to break because terminal columns were recalculated from ANSI output using `.length`.

**Root Cause:**
- Ink uses `string-width` for layout (considers emoji width)
- `terminalScreenshotFontPatch` was using `.length` to recalculate cols (doesn't consider emoji width)
- xterm.js uses Unicode 11 for rendering (different emoji width calculation)
- These three different width calculations caused misalignment

**Solution:** Pass PTY's actual `cols` and `rows` to template generation instead of recalculating.

**Test Coverage:**
- `parameter-passing.test.ts` > "should prevent regression: cols and rows must be passed to template generation"
- `font-patch.test.ts` > Tests that verify cols/rows are part of font config

## Adding New Tests

When adding new tests:

1. **Unit tests** should go in separate files by feature area
2. **Visual tests** should follow the pattern in `simple-box-auto.test.ts`
3. **Regression tests** should include:
   - A comment explaining what bug they prevent
   - A reference to the commit that fixed the bug (if applicable)
   - Clear assertions about the expected behavior

## Test Infrastructure

- **Test Runner:** Vitest
- **Visual Comparison:** pixelmatch + pngjs
- **PTY Emulation:** node-pty
- **Snapshot Generation:** terminal-screenshot + xterm.js

## CI Considerations

Tests run in CI environments with:
- Bundled fonts for consistency
- 60-second timeout for slower environments
- No interactive terminal required (uses PTY)
