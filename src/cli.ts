#!/usr/bin/env node
import { Command } from 'commander';
import { listTerminalPresets } from './presets.js';
import { visualTest } from './visualTest.js';
import { batchVisualTestFromFiles } from './batchTest.js';
import path from 'node:path';
import fs from 'node:fs';

const program = new Command();

program
  .name('ink-visual-testing')
  .description('Visual regression testing for Ink CLI applications')
  .version('1.0.0');

// Test command
program
  .command('test')
  .description('Run visual regression tests')
  .option('-p, --preset <name>', 'Terminal preset to use')
  .option('-c, --cols <number>', 'Terminal columns', parseInt)
  .option('-r, --rows <number>', 'Terminal rows', parseInt)
  .option('--config <file>', 'Configuration file path', './.ink-visual.config.js')
  .option('--update-baseline', 'Update baseline if it doesn\'t exist', false)
  .option('--batch', 'Run tests in batch mode for better performance', false)
  .argument('[testFiles...]', 'Test files to run (glob patterns supported)')
  .action(async (testFiles, options) => {
    console.log('🧪 Running visual regression tests...');
    
    // Load configuration file if it exists
    let config = {};
    if (fs.existsSync(options.config)) {
      try {
        const configModule = await import(path.resolve(options.config));
        config = configModule.default || configModule;
        console.log(`📄 Loaded config: ${options.config}`);
      } catch (error) {
        console.warn(`⚠️  Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Merge CLI options with config
    const testOptions = {
      ...config,
      ...(options.preset && { preset: options.preset }),
      ...(options.cols && { cols: options.cols }),
      ...(options.rows && { rows: options.rows }),
      updateBaseline: options.updateBaseline
    };
    
    if (testFiles.length === 0) {
      console.error('❌ No test files specified. Usage: ink-visual-testing test <testFiles...>');
      process.exit(1);
    }
    
    if (options.batch) {
      // Batch mode - use glob patterns and batch processing
      const results = await batchVisualTestFromFiles(testFiles, testOptions);
      const failed = results.filter(r => !r.passed).length;
      
      if (failed > 0) {
        process.exit(1);
      }
    } else {
      // Individual mode - process files one by one
      let hasFailures = false;
      
      for (const testFile of testFiles) {
        const resolvedPath = path.resolve(testFile);
        if (!fs.existsSync(resolvedPath)) {
          console.error(`❌ Test file not found: ${testFile}`);
          hasFailures = true;
          continue;
        }
        
        const testName = path.basename(testFile, path.extname(testFile));
        try {
          await visualTest(testName, resolvedPath, testOptions);
          console.log(`✅ Test passed: ${testName}`);
        } catch (error) {
          console.error(`❌ Test failed: ${testName}`);
          console.error(error instanceof Error ? error.message : String(error));
          hasFailures = true;
        }
      }
      
      if (hasFailures) {
        process.exit(1);
      }
    }
  });

// Preset command
program
  .command('presets')
  .description('List available terminal presets')
  .action(() => {
    console.log('📐 Available terminal presets:\n');
    
    const presets = listTerminalPresets();
    const grouped = {
      'Standard sizes': presets.filter(p => ['tiny', 'narrow', 'standard', 'wide', 'ultra-wide'].includes(p.name)),
      'CI/Development': presets.filter(p => ['ci', 'ci-narrow'].includes(p.name)),
      'Mobile/Embedded': presets.filter(p => ['mobile'].includes(p.name)),
      'Testing': presets.filter(p => ['test-small', 'test-large'].includes(p.name))
    };
    
    for (const [category, categoryPresets] of Object.entries(grouped)) {
      if (categoryPresets.length > 0) {
        console.log(`\x1b[1m${category}:\x1b[0m`);
        for (const { name, preset } of categoryPresets) {
          console.log(`  \x1b[36m${name.padEnd(12)}\x1b[0m ${preset.cols}×${preset.rows} - ${preset.description}`);
        }
        console.log();
      }
    }
    
    console.log('\x1b[2mUsage: ink-visual-testing test --preset <name> <testFiles...>\x1b[0m');
  });

// Init command
program
  .command('init')
  .description('Initialize ink-visual-testing configuration')
  .action(() => {
    const configPath = './.ink-visual.config.js';
    
    if (fs.existsSync(configPath)) {
      console.log('⚠️  Configuration file already exists:', configPath);
      return;
    }
    
    const configContent = `// ink-visual-testing configuration
export default {
  // Default terminal preset (optional)
  preset: 'standard',
  
  // Default terminal size (optional, overrides preset)
  // cols: 80,
  // rows: 24,
  
  // Visual comparison settings
  maxDiffPixels: 100,
  threshold: 0.1,
  
  // Terminal appearance
  backgroundColor: '#000000',
  
  // Update baseline if it doesn't exist
  updateBaseline: true
};
`;
    
    fs.writeFileSync(configPath, configContent);
    console.log(`✅ Created configuration file: ${configPath}`);
    console.log('📝 Edit the file to customize your testing setup');
  });

program.parse();