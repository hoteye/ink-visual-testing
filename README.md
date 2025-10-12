# Ink Visual Testing

[![npm version](https://img.shields.io/npm/v/ink-visual-testing.svg)](https://www.npmjs.com/package/ink-visual-testing)
[![npm downloads](https://img.shields.io/npm/dm/ink-visual-testing.svg)](https://www.npmjs.com/package/ink-visual-testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

为 [Ink](https://github.com/vadimdemedes/ink) CLI 应用提供开箱即用的视觉回归测试。

## 用途

视觉回归测试用于检测 UI 界面的意外变化：

- ✅ **防止布局错乱** - 自动检测边框、对齐、间距等布局问题
- ✅ **验证动态数据渲染** - 确保不同数据下的界面正确显示
- ✅ **捕获样式变化** - 检测颜色、字体等样式的意外改变
- ✅ **多状态测试** - 测试加载、错误、空状态等各种场景
- ✅ **CI/CD 集成** - 在合并代码前自动发现视觉问题

## 安装

```bash
npm install ink-visual-testing --save-dev
```

## 用法

### 1. 基础用法

```tsx
import { describe, it } from 'vitest';
import React from 'react';
import { Box, Text } from 'ink';
import { visualTest } from 'ink-visual-testing';

// 你的 Ink 组件
const Greeting = ({ name, message }) => (
  <Box borderStyle="round" borderColor="cyan" padding={1}>
    <Text>Hello, <Text bold color="green">{name}</Text>!</Text>
    <Text dimColor>{message}</Text>
  </Box>
);

describe('Greeting', () => {
  it('应该正确渲染', async () => {
    // 用 Mock 数据填充组件
    const mockData = {
      name: 'Alice',
      message: 'Welcome to Ink Visual Testing'
    };

    // 一行代码完成视觉测试
    await visualTest('greeting', <Greeting {...mockData} />);
  });
});
```

**首次运行**：自动生成基线图片 `tests/__baselines__/greeting.png`
**后续运行**：自动对比当前输出与基线，发现差异则测试失败

### 2. 配置选项

```tsx
await visualTest(
  'component-name',      // 快照名称
  <MyComponent />,       // React 组件
  {
    cols: 80,                  // 终端宽度（默认 80）
    rows: 24,                  // 终端高度（默认 24）
    maxDiffPixels: 100,        // 允许的最大差异像素（默认 100）
    threshold: 0.1,            // 像素差异阈值 0-1（默认 0.1）
    backgroundColor: '#000000' // 背景色（默认黑色）
  }
);
```

### 3. 测试不同状态

```tsx
describe('Dashboard', () => {
  it('加载中状态', async () => {
    await visualTest('dashboard-loading', <Dashboard loading={true} />);
  });

  it('正常状态', async () => {
    const mockData = { users: 100, sales: 5000 };
    await visualTest('dashboard-loaded', <Dashboard data={mockData} />);
  });

  it('错误状态', async () => {
    await visualTest('dashboard-error', <Dashboard error="网络错误" />);
  });
});
```

### 4. 测试响应式布局

```tsx
it('不同终端尺寸', async () => {
  const mockData = { /* ... */ };

  // 小终端
  await visualTest('small', <MyApp data={mockData} />, {
    cols: 60,
    rows: 20
  });

  // 大终端
  await visualTest('large', <MyApp data={mockData} />, {
    cols: 120,
    rows: 40
  });
});
```

### 5. 更新基线

当界面有**预期的**变更时，需要更新基线：

```bash
# 运行测试
npm test

# 检查生成的新图片
open tests/__output__/*.png

# 确认正确后，更新基线
cp tests/__output__/*.png tests/__baselines__/

# 提交更新
git add tests/__baselines__/
git commit -m "Update visual baselines"
```

或者使用 npm script：

```json
{
  "scripts": {
    "test": "vitest",
    "baseline:update": "cp tests/__output__/*.png tests/__baselines__/"
  }
}
```

## 注意事项

### ⚠️ 关键要点

1. **使用固定的 Mock 数据**
   ```tsx
   // ✅ 好：固定数据
   const mockData = {
     timestamp: '2024-01-15 10:30:00',
     count: 42
   };

   // ❌ 坏：动态数据（每次都不同）
   const mockData = {
     timestamp: new Date().toISOString(),
     count: Math.random()
   };
   ```

2. **为每个状态创建独立测试**
   ```tsx
   // ✅ 好：分开测试
   it('空状态', () => visualTest('empty', <List items={[]} />));
   it('有数据', () => visualTest('with-data', <List items={mock} />));

   // ❌ 坏：复用名称
   it('列表', () => {
     visualTest('list', <List items={[]} />);
     visualTest('list', <List items={mock} />); // 名称冲突！
   });
   ```

3. **合理设置差异容差**
   - 静态内容（logo、图标）：`maxDiffPixels: 0`（严格）
   - 简单布局：`maxDiffPixels: 100`（默认）
   - 复杂布局：`maxDiffPixels: 500`（宽松）

4. **忽略生成的文件**
   ```gitignore
   # .gitignore
   tests/__output__/    # 测试输出
   tests/__diff__/      # 差异图片
   tests/__temp__/      # 临时文件

   # 基线图片需要提交
   !tests/__baselines__/
   ```

### 🔧 CI/CD 配置

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

### 📊 目录结构

推荐的项目结构：

```
your-project/
├── src/
│   └── components/
│       └── MyComponent.tsx     # 你的 Ink 组件
├── tests/
│   ├── MyComponent.test.ts     # 测试文件（包含 Mock 数据）
│   ├── __baselines__/          # 基线图片（提交到 Git）
│   │   ├── my-component.png
│   │   └── my-component-loading.png
│   ├── __output__/             # 测试输出（Git ignore）
│   └── __diff__/               # 差异图片（Git ignore）
└── package.json
```

### 🐛 故障排除

**问题 1：图片全黑**
- 原因：组件渲染超时或错误
- 解决：检查组件是否有运行时错误，增加 `timeout` 配置

**问题 2：首次运行提示基线不存在**
- 这是正常的！首次运行会自动创建基线
- 确认生成的基线图片正确后提交到 Git

**问题 3：差异太大**
- 查看 `tests/__diff__/` 中的差异图片
- 如果是预期变更，运行 `npm run baseline:update`
- 如果不是预期变更，检查代码改动

**问题 4：CI 中测试不稳定**
- 确保使用固定的 Mock 数据（不要用当前时间、随机数）
- 确保安装了必要的系统依赖（见上面 CI 配置）

## 高级用法

### 低级 API

如果需要更多控制，可以使用底层 API：

```tsx
import { fixedPtyRender, getCIOptimizedConfig } from 'ink-visual-testing';
import path from 'node:path';

// 渲染 CLI 应用到 PNG
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

### 字体配置

默认使用系统字体（推荐），如需使用 bundled emoji 字体：

```tsx
import { getCIOptimizedConfig } from 'ink-visual-testing';

getCIOptimizedConfig('mono')   // NotoEmoji-Regular.ttf（单色）
getCIOptimizedConfig('color')  // NotoColorEmoji.ttf（彩色）
getCIOptimizedConfig()         // 系统字体（默认）
```

## 示例项目

查看 `examples/` 目录获取完整示例：

- `examples/dashboard.tsx` - 复杂 Dashboard 布局示例（包含多种 emoji 和布局）
- `examples/dashboard-cli.tsx` - CLI 入口
- `examples/dashboard-snapshot.tsx` - 快照生成脚本

运行示例：
```bash
# 查看实时渲染
npx tsx examples/dashboard-cli.tsx

# 生成快照
npx tsx examples/dashboard-snapshot.tsx
```

## License

MIT License. See [LICENSE](LICENSE) for details.

## 贡献

欢迎贡献！请查看 [GitHub Issues](https://github.com/hoteye/ink-visual-testing/issues)。
