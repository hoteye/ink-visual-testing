import React from 'react';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { getTerminalPreset, TERMINAL_PRESETS } from './presets.js';
import { loadConfig, mergeConfig } from './config.js';

export interface VisualTestOptions {
  /** Terminal preset name (e.g., 'standard', 'wide', 'ci') */
  preset?: string;
  /** Terminal columns (default: 80, overrides preset) */
  cols?: number;
  /** Terminal rows (default: 24, overrides preset) */
  rows?: number;
  /** Maximum allowed diff pixels (default: 100) */
  maxDiffPixels?: number;
  /** Pixel difference threshold 0-1 (default: 0.1) */
  threshold?: number;
  /** Background color (default: '#000000') */
  backgroundColor?: string;
  /** Update baseline if it doesn't exist (default: true) */
  updateBaseline?: boolean;
}

/**
 * Out-of-the-box visual regression testing
 *
 * Supports two modes:
 * 1. Simple mode: Pass a React element (supports built-in HTML elements like <Text>, <Box>)
 * 2. File mode: Pass a render file path (supports complex components and Context Provider)
 *
 * @example
 * // Mode 1: Simple component (pass JSX directly)
 * ```typescript
 * import { visualTest } from 'ink-visual-testing';
 * import { Text, Box } from 'ink';
 *
 * await visualTest('simple', <Box><Text>Hello</Text></Box>);
 * ```
 *
 * @example
 * // Mode 2: Complex component (pass file path)
 * ```typescript
 * // Create file: tests/fixtures/settings-dialog.tsx
 * import React from 'react';
 * import { render } from 'ink';
 * import { VimModeProvider } from './contexts/VimModeProvider.js';
 * import { SettingsDialog } from './components/SettingsDialog.js';
 *
 * const settings = createMockSettings();
 * render(
 *   <VimModeProvider>
 *     <SettingsDialog settings={settings} onSelect={() => {}} />
 *   </VimModeProvider>
 * );
 *
 * // Test file
 * await visualTest('settings', './tests/fixtures/settings-dialog.tsx');
 * ```
 */
export async function visualTest(
  name: string,
  componentOrPath: React.ReactElement | string,
  options: VisualTestOptions = {}
): Promise<void> {
  // Load configuration file
  const config = await loadConfig();
  
  // Merge config with provided options (options take precedence)
  const mergedOptions = mergeConfig(config, options);
  
  // Apply preset if specified
  let presetConfig = {};
  if (mergedOptions.preset) {
    const preset = getTerminalPreset(mergedOptions.preset);
    if (!preset) {
      const availablePresets = Object.keys(TERMINAL_PRESETS).join(', ');
      throw new Error(
        `Unknown preset "${mergedOptions.preset}". Available presets: ${availablePresets}`
      );
    }
    presetConfig = { cols: preset.cols, rows: preset.rows };
    console.log(`📐 Using terminal preset: ${mergedOptions.preset} (${preset.description})`);
  }

  // Merge preset with explicit options (explicit options override preset)
  const finalOptions = { ...presetConfig, ...mergedOptions };
  
  const {
    cols = 80,
    rows = 24,
    maxDiffPixels = 100,
    threshold = 0.1,
    backgroundColor = '#000000',
    updateBaseline = true
  } = finalOptions;

  // File paths
  const outputPath = path.resolve(`tests/__output__/${name}.png`);
  const baselinePath = path.resolve(`tests/__baselines__/${name}.png`);
  const diffPath = path.resolve(`tests/__diff__/${name}.png`);

  // Create directories
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });

  let tempCliPath: string | null = null;
  let tempRenderScript: string | null = null;

  try {
    // Mode detection: string = file path mode, React element = component mode
    if (typeof componentOrPath === 'string') {
      // File path mode - use the provided render file directly
      const renderFilePath = path.resolve(componentOrPath);

      if (!fs.existsSync(renderFilePath)) {
        throw new Error(
          `Render file not found: ${renderFilePath}\n` +
          `Please create the file and export the component to render`
        );
      }

      tempRenderScript = path.resolve(`tests/__temp__/${name}-render.mjs`);
      fs.mkdirSync(path.dirname(tempRenderScript), { recursive: true });

      const renderScriptContent = `
import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';

await fixedPtyRender(
  '${renderFilePath}',
  '${outputPath}',
  {
    ...getCIOptimizedConfig(),
    cols: ${cols},
    rows: ${rows},
    backgroundColor: '${backgroundColor}'
  }
);
`.trim();

      fs.writeFileSync(tempRenderScript, renderScriptContent);

      console.log(`📸 Generating snapshot: ${name} (file mode)`);
      execSync(`npx tsx ${tempRenderScript}`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

    } else {
      // Component mode - serialize component to temporary file
      tempCliPath = path.resolve(`tests/__temp__/${name}-cli.tsx`);
      fs.mkdirSync(path.dirname(tempCliPath), { recursive: true });

      const cliContent = `
import React from 'react';
import { render } from 'ink';

const component = ${componentToString(componentOrPath)};
render(component);
`.trim();

      fs.writeFileSync(tempCliPath, cliContent);

      tempRenderScript = path.resolve(`tests/__temp__/${name}-render.mjs`);
      const renderScriptContent = `
import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';

await fixedPtyRender(
  '${tempCliPath}',
  '${outputPath}',
  {
    ...getCIOptimizedConfig(),
    cols: ${cols},
    rows: ${rows},
    backgroundColor: '${backgroundColor}'
  }
);
`.trim();

      fs.writeFileSync(tempRenderScript, renderScriptContent);

      console.log(`📸 Generating snapshot: ${name} (component mode)`);
      console.log(`⚠️  Note: Component mode only supports built-in elements (Text, Box, etc.)`);
      console.log(`   To use custom components or Context Provider, use file path mode`);

      execSync(`npx tsx ${tempRenderScript}`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
    }

    // Check if baseline exists
    if (!fs.existsSync(baselinePath)) {
      if (updateBaseline) {
        console.log(`📝 Creating baseline: ${name}`);
        fs.copyFileSync(outputPath, baselinePath);
        console.log(`✅ Baseline created: ${baselinePath}`);
        return;
      } else {
        throw new Error(
          `Baseline not found: ${baselinePath}\n` +
          `Tip: Set updateBaseline: true to create it automatically`
        );
      }
    }

    // Compare snapshots
    console.log(`🔍 Comparing snapshot: ${name}`);
    const { comparePng } = await import('./imageDiff.js');
    const result = await comparePng(outputPath, baselinePath, diffPath, {
      threshold,
      maxDiffPixels
    });

    console.log(`✅ Diff pixels: ${result.diffPixels} (allowed: ${maxDiffPixels})`);

    if (result.diffPixels > maxDiffPixels) {
      throw new Error(
        `Visual regression test failed: ${name}\n` +
        `Diff pixels: ${result.diffPixels} (allowed: ${maxDiffPixels})\n` +
        `Diff image: ${diffPath}`
      );
    }

  } finally {
    // Clean up temporary files
    if (tempCliPath && fs.existsSync(tempCliPath)) {
      fs.unlinkSync(tempCliPath);
    }
    if (tempRenderScript && fs.existsSync(tempRenderScript)) {
      fs.unlinkSync(tempRenderScript);
    }
    // Clean up temporary directory (if empty)
    try {
      const tempDir = path.resolve('tests/__temp__');
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch (e) {
      // Directory not empty, ignore
    }
  }
}

/**
 * Serialize React element to string
 *
 * ⚠️ Limitation: Only supports built-in string-type elements (like 'Text', 'Box')
 * For functional components, only the component name string will be output, which causes rendering to fail
 */
function componentToString(element: React.ReactElement): string {
  const { type, props } = element;

  // Get component name
  let componentName: string;
  if (typeof type === 'string') {
    componentName = type;
  } else if (typeof type === 'function') {
    componentName = type.name || 'Anonymous';
    console.warn(
      `⚠️  Warning: Detected functional component "${componentName}", component mode only supports built-in elements\n` +
      `   Recommended: Use file path mode to render custom components`
    );
  } else {
    throw new Error('Unsupported component type');
  }

  // Handle children
  const { children } = props as { children?: unknown };
  if (!children) {
    return `React.createElement('${componentName}', ${JSON.stringify(props || {})})`;
  }

  return `React.createElement('${componentName}', ${JSON.stringify(props || {})}, ${JSON.stringify(children)})`;
}
