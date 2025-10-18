import { visualTest, VisualTestOptions } from './visualTest.js';
import { glob } from 'glob';
import path from 'node:path';

export interface BatchTestCase {
  name: string;
  componentOrPath: React.ReactElement | string;
  options?: VisualTestOptions;
}

export interface BatchTestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Run multiple visual tests in batch
 */
export async function batchVisualTest(
  testCases: BatchTestCase[]
): Promise<BatchTestResult[]> {
  console.log(`🧪 Running ${testCases.length} visual tests in batch...`);
  
  const results: BatchTestResult[] = [];
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    
    try {
      await visualTest(testCase.name, testCase.componentOrPath, testCase.options);
      const duration = Date.now() - startTime;
      
      results.push({
        name: testCase.name,
        passed: true,
        duration
      });
      
      console.log(`✅ ${testCase.name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      results.push({
        name: testCase.name,
        passed: false,
        error: errorMessage,
        duration
      });
      
      console.error(`❌ ${testCase.name} (${duration}ms): ${errorMessage}`);
    }
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n📊 Batch test summary:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏱️  Total time: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log(`\n❌ Failed tests:`);
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  • ${result.name}: ${result.error}`);
    });
  }
  
  return results;
}

/**
 * Run visual tests from file patterns
 */
export async function batchVisualTestFromFiles(
  patterns: string[],
  baseOptions?: VisualTestOptions
): Promise<BatchTestResult[]> {
  const testCases: BatchTestCase[] = [];
  
  // Collect files from all patterns
  for (const pattern of patterns) {
    try {
      const files = await glob(pattern);
      
      for (const file of files) {
        const name = path.basename(file, path.extname(file));
        testCases.push({
          name,
          componentOrPath: file,
          options: baseOptions
        });
      }
    } catch (error) {
      console.warn(`⚠️  Failed to process pattern "${pattern}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  if (testCases.length === 0) {
    console.warn('⚠️  No test files found matching the patterns');
    return [];
  }
  
  return batchVisualTest(testCases);
}

/**
 * Parallel batch testing (experimental)
 */
export async function batchVisualTestParallel(
  testCases: BatchTestCase[],
  concurrency: number = 3
): Promise<BatchTestResult[]> {
  console.log(`🧪 Running ${testCases.length} visual tests with concurrency=${concurrency}...`);
  
  const results: BatchTestResult[] = [];
  
  // Process tests in chunks
  for (let i = 0; i < testCases.length; i += concurrency) {
    const chunk = testCases.slice(i, i + concurrency);
    
    const chunkPromises = chunk.map(async (testCase) => {
      const startTime = Date.now();
      
      try {
        await visualTest(testCase.name, testCase.componentOrPath, testCase.options);
        const duration = Date.now() - startTime;
        
        return {
          name: testCase.name,
          passed: true,
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          name: testCase.name,
          passed: false,
          error: errorMessage,
          duration
        };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    // Log chunk results
    for (const result of chunkResults) {
      if (result.passed) {
        console.log(`✅ ${result.name} (${result.duration}ms)`);
      } else {
        console.error(`❌ ${result.name} (${result.duration}ms): ${result.error}`);
      }
    }
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n📊 Parallel batch test summary:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏱️  Total time: ${totalDuration}ms`);
  console.log(`  🔧 Concurrency: ${concurrency}`);
  
  return results;
}