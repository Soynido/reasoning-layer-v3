/**
 * Benchmark: 10,000 Events Append
 * 
 * Measures throughput of AppendOnlyWriter
 */

import { AppendOnlyWriter } from '../extension/kernel/AppendOnlyWriter';
import * as fs from 'fs';
import * as path from 'path';

async function benchmark() {
    const testFile = '/tmp/rl4-bench-events.jsonl';
    
    // Clean up previous run
    if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
    }
    
    const writer = new AppendOnlyWriter(testFile);
    
    const start = Date.now();
    
    // Append 10,000 events
    for (let i = 0; i < 10000; i++) {
        await writer.append({
            id: `event-${i}`,
            type: 'test',
            data: { index: i, payload: 'x'.repeat(100) }
        });
    }
    
    // Flush
    await writer.flush(true);
    
    const duration = Date.now() - start;
    const throughput = 10000 / (duration / 1000); // events/s
    
    const fileSize = fs.statSync(testFile).size / 1024; // KB
    
    console.log(`
📊 Events-10k Benchmark Results:
  - Duration: ${duration}ms
  - Throughput: ${throughput.toFixed(0)} events/s
  - File size: ${fileSize.toFixed(0)} KB
  - Average: ${(duration / 10000).toFixed(2)}ms per event
  - Status: ${throughput > 100 ? '✅ PASS' : '❌ FAIL'} (target: >100 events/s)
    `);
    
    // Save results
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(resultsDir, 'events-10k.json'),
        JSON.stringify({
            benchmark: 'events-10k',
            timestamp: new Date().toISOString(),
            duration_ms: duration,
            throughput_per_s: throughput,
            file_size_kb: fileSize,
            pass: throughput > 100
        }, null, 2)
    );
    
    // Cleanup
    fs.unlinkSync(testFile);
}

benchmark().catch(console.error);

