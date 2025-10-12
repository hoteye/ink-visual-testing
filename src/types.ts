export interface CompareOptions {
  threshold?: number;
  maxDiffPixels?: number;
}

export interface CompareResult {
  diffPixels: number;
  diffPath: string;
}
