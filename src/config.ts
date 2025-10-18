import fs from 'node:fs';
import path from 'node:path';

export interface InkVisualConfig {
  preset?: string;
  cols?: number;
  rows?: number;
  maxDiffPixels?: number;
  threshold?: number;
  backgroundColor?: string;
  updateBaseline?: boolean;
}

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<InkVisualConfig> {
  const defaultPaths = [
    './.ink-visual.config.js',
    './.ink-visual.config.mjs',
    './.lokirc',
    './.lokirc.json'
  ];
  
  const searchPaths = configPath ? [configPath] : defaultPaths;
  
  for (const filePath of searchPaths) {
    if (fs.existsSync(filePath)) {
      try {
        if (filePath.endsWith('.json')) {
          const configContent = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(configContent);
        } else {
          const configModule = await import(path.resolve(filePath));
          return configModule.default || configModule;
        }
      } catch (error) {
        if (configPath) {
          throw new Error(`Failed to load config from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Continue searching if no specific path was provided
        continue;
      }
    }
  }
  
  return {}; // Return empty config if no file found
}

/**
 * Merge configuration with options (options take precedence)
 */
export function mergeConfig(config: InkVisualConfig, options: InkVisualConfig): InkVisualConfig {
  return { ...config, ...options };
}