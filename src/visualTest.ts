import React from 'react';
import path from 'node:path';
import fs from 'node:fs';
import { render } from 'ink';
import { execSync } from 'node:child_process';
import type { CompareOptions } from './types.js';

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
 * @example
 * ```typescript
 * import { visualTest } from 'ink-visual-testing';
 * import { MyComponent } from './MyComponent';
 *
 * describe('MyComponent', () => {
 *   it('should match baseline', async () => {
 *     const mockData = { name: 'Test', count: 42 };
 *
 *     await visualTest('my-component', <MyComponent data={mockData} />, {
 *       cols: 80,
 *       rows: 24,
 *       maxDiffPixels: 100
 *     });
 *   });
 * });
 * ```
 */
export async function visualTest(
  name: string,
  component: React.ReactElement,
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
  const tempCliPath = path.resolve(`tests/__temp__/${name}-cli.tsx`);

  // 创建目录
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });
  fs.mkdirSync(path.dirname(tempCliPath), { recursive: true });

  // 生成临时 CLI 文件
  const cliContent = `
import React from 'react';
import { render } from 'ink';

const component = ${componentToString(component)};
render(component);
`.trim();

  fs.writeFileSync(tempCliPath, cliContent);

  try {
    // 生成快照
    console.log(`📸 生成快照: ${name}`);
    execSync(
      `npx tsx -e "
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
      "`,
      { cwd: process.cwd(), stdio: 'inherit' }
    );

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
    if (fs.existsSync(tempCliPath)) {
      fs.unlinkSync(tempCliPath);
    }
    // 清理临时目录（如果为空）
    try {
      fs.rmdirSync(path.dirname(tempCliPath));
    } catch (e) {
      // 目录不为空，忽略
    }
  }
}

/**
 * 将 React 元素序列化为字符串
 */
function componentToString(element: React.ReactElement): string {
  const { type, props } = element;

  // 获取组件名称
  let componentName: string;
  if (typeof type === 'string') {
    componentName = type;
  } else if (typeof type === 'function') {
    componentName = type.name || 'Anonymous';
  } else {
    throw new Error('不支持的组件类型');
  }

  // 序列化 props
  const propsString = Object.entries(props || {})
    .filter(([key]) => key !== 'children')
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}="${value}"`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return `${key}={${value}}`;
      } else {
        return `${key}={${JSON.stringify(value)}}`;
      }
    })
    .join(' ');

  // 处理 children
  const { children } = props;
  if (!children) {
    return `React.createElement('${componentName}', ${JSON.stringify(props || {})})`;
  }

  return `React.createElement('${componentName}', ${JSON.stringify(props || {})}, ${JSON.stringify(children)})`;
}
