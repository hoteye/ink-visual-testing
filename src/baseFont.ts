import path from 'path';
import { fileURLToPath } from 'url';

export interface BaseFontOption {
  path: string;
  family: string;
}

const BASE_FONT_RELATIVE_PATH = '../font/DejaVuSansMono.ttf';
const BASE_FONT_FAMILY = 'InkSnapshotBaseMono';

export function getBundledBaseFont(): BaseFontOption {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return {
    path: path.resolve(__dirname, BASE_FONT_RELATIVE_PATH),
    family: BASE_FONT_FAMILY
  };
}
