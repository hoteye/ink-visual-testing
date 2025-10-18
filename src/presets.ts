/**
 * Terminal size presets for common use cases
 */
export interface TerminalPreset {
  cols: number;
  rows: number;
  description: string;
}

export const TERMINAL_PRESETS: Record<string, TerminalPreset> = {
  // Standard terminal sizes
  'tiny': {
    cols: 40,
    rows: 15,
    description: 'Very small terminal (40x15) - for minimal components'
  },
  'narrow': {
    cols: 60,
    rows: 20,
    description: 'Narrow terminal (60x20) - for constrained environments'
  },
  'standard': {
    cols: 80,
    rows: 24,
    description: 'Standard terminal (80x24) - classic default size'
  },
  'wide': {
    cols: 120,
    rows: 40,
    description: 'Wide terminal (120x40) - for modern development'
  },
  'ultra-wide': {
    cols: 160,
    rows: 50,
    description: 'Ultra-wide terminal (160x50) - for large displays'
  },
  
  // CI/Development specific
  'ci': {
    cols: 100,
    rows: 30,
    description: 'CI environment (100x30) - optimized for automation'
  },
  'ci-narrow': {
    cols: 80,
    rows: 25,
    description: 'CI narrow (80x25) - for resource-constrained CI'
  },
  
  // Mobile/embedded
  'mobile': {
    cols: 50,
    rows: 20,
    description: 'Mobile-like (50x20) - for mobile terminal apps'
  },
  
  // Testing specific
  'test-small': {
    cols: 60,
    rows: 15,
    description: 'Small test (60x15) - for focused component testing'
  },
  'test-large': {
    cols: 140,
    rows: 45,
    description: 'Large test (140x45) - for comprehensive UI testing'
  }
};

/**
 * Get a terminal preset by name
 */
export function getTerminalPreset(name: string): TerminalPreset | undefined {
  return TERMINAL_PRESETS[name];
}

/**
 * List all available presets
 */
export function listTerminalPresets(): Array<{ name: string; preset: TerminalPreset }> {
  return Object.entries(TERMINAL_PRESETS).map(([name, preset]) => ({ name, preset }));
}