import React from 'react';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

export interface VisualTestOptions {
  /** Terminal columns (default: 80) */
  cols?: number;
  /** Terminal rows (default: 24) */
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
 * 开箱即用的视觉回归测试
 *
 * 支持两种模式：
 * 1. 简单模式：传入 React 元素（仅支持内置 HTML 元素，如 <Text>、<Box>）
 * 2. 文件模式：传入渲染文件路径（支持复杂组件和 Context Provider）
 *
 * @example
 * // 模式 1: 简单组件（直接传入 JSX）
 * ```typescript
 * import { visualTest } from 'ink-visual-testing';
 * import { Text, Box } from 'ink';
 *
 * await visualTest('simple', <Box><Text>Hello</Text></Box>);
 * ```
 *
 * @example
 * // 模式 2: 复杂组件（传入文件路径）
 * ```typescript
 * // 创建文件：tests/fixtures/settings-dialog.tsx
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
 * // 测试文件
 * await visualTest('settings', './tests/fixtures/settings-dialog.tsx');
 * ```
 */
export async function visualTest(
  name: string,
  componentOrPath: React.ReactElement | string,
  options: VisualTestOptions = {}
): Promise<void> {
  const {
    cols = 80,
    rows = 24,
    maxDiffPixels = 100,
    threshold = 0.1,
    backgroundColor = '#000000',
    updateBaseline = true
  } = options;

  // 文件路径
  const outputPath = path.resolve(`tests/__output__/${name}.png`);
  const baselinePath = path.resolve(`tests/__baselines__/${name}.png`);
  const diffPath = path.resolve(`tests/__diff__/${name}.png`);

  // 创建目录
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });

  let tempCliPath: string | null = null;
  let tempRenderScript: string | null = null;

  try {
    // 模式检测：字符串 = 文件路径模式，React 元素 = 组件模式
    if (typeof componentOrPath === 'string') {
      // 文件路径模式 - 直接使用提供的渲染文件
      const renderFilePath = path.resolve(componentOrPath);

      if (!fs.existsSync(renderFilePath)) {
        throw new Error(
          `渲染文件不存在: ${renderFilePath}\n` +
          `请创建该文件并导出要渲染的组件`
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

      console.log(`📸 生成快照: ${name} (文件模式)`);
      execSync(`npx tsx ${tempRenderScript}`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

    } else {
      // 组件模式 - 序列化组件为临时文件
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

      console.log(`📸 生成快照: ${name} (组件模式)`);
      console.log(`⚠️  注意: 组件模式仅支持内置元素 (Text, Box 等)`);
      console.log(`   如需使用自定义组件或 Context Provider，请使用文件路径模式`);

      execSync(`npx tsx ${tempRenderScript}`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
    }

    // 检查 baseline 是否存在
    if (!fs.existsSync(baselinePath)) {
      if (updateBaseline) {
        console.log(`📝 创建 baseline: ${name}`);
        fs.copyFileSync(outputPath, baselinePath);
        console.log(`✅ Baseline 已创建: ${baselinePath}`);
        return;
      } else {
        throw new Error(
          `Baseline 不存在: ${baselinePath}\n` +
          `提示: 设置 updateBaseline: true 来自动创建`
        );
      }
    }

    // 对比快照
    console.log(`🔍 对比快照: ${name}`);
    const { comparePng } = await import('./imageDiff.js');
    const result = await comparePng(outputPath, baselinePath, diffPath, {
      threshold,
      maxDiffPixels
    });

    console.log(`✅ 差异像素: ${result.diffPixels} (允许 ${maxDiffPixels})`);

    if (result.diffPixels > maxDiffPixels) {
      throw new Error(
        `视觉回归测试失败: ${name}\n` +
        `差异像素: ${result.diffPixels} (允许 ${maxDiffPixels})\n` +
        `差异图片: ${diffPath}`
      );
    }

  } finally {
    // 清理临时文件
    if (tempCliPath && fs.existsSync(tempCliPath)) {
      fs.unlinkSync(tempCliPath);
    }
    if (tempRenderScript && fs.existsSync(tempRenderScript)) {
      fs.unlinkSync(tempRenderScript);
    }
    // 清理临时目录（如果为空）
    try {
      const tempDir = path.resolve('tests/__temp__');
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch (e) {
      // 目录不为空，忽略
    }
  }
}

/**
 * 将 React 元素序列化为字符串
 *
 * ⚠️ 限制：仅支持内置字符串类型元素（如 'Text', 'Box'）
 * 对于函数组件，将只输出组件名称字符串，这会导致渲染失败
 */
function componentToString(element: React.ReactElement): string {
  const { type, props } = element;

  // 获取组件名称
  let componentName: string;
  if (typeof type === 'string') {
    componentName = type;
  } else if (typeof type === 'function') {
    componentName = type.name || 'Anonymous';
    console.warn(
      `⚠️  警告: 检测到函数组件 "${componentName}"，组件模式仅支持内置元素\n` +
      `   建议使用文件路径模式来渲染自定义组件`
    );
  } else {
    throw new Error('不支持的组件类型');
  }

  // 处理 children
  const { children } = props;
  if (!children) {
    return `React.createElement('${componentName}', ${JSON.stringify(props || {})})`;
  }

  return `React.createElement('${componentName}', ${JSON.stringify(props || {})}, ${JSON.stringify(children)})`;
}
