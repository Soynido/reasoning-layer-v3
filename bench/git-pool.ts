/**
 * Benchmark: Git Exec Pool
 * 
 * Measures ExecPool latency (p99 should be <2100ms)
 */

import { ExecPool } from '../extension/kernel/ExecPool';
import * as fs from 'fs';
import * as path from 'path';

async function benchmark() {
    const pool = new ExecPool(2, 2000); // pool=2, timeout=2s
    
    console.log('🧪 Running Git Exec Pool benchmark (50 commands)...');
    
    const start = Date.now();
    
    // Run 50 git commands
    const promises = [];
    for (let i = 0; i < 50; i++) {
        promises.push(
            pool.run('git rev-parse HEAD', { cwd: process.cwd() })
        );
    }
    
    await Promise.all(promises);
    
    const duration = Date.now() - start;
    const metrics = pool.getMetrics();
    
    console.log(`
📊 Git Pool Benchmark Results:
  - Total commands: ${metrics.total}
  - Successful: ${metrics.successful}
  - Failed: ${metrics.failed}
  - Timed out: ${metrics.timedOut}
  - Duration: ${duration}ms
  - Latency p50: ${metrics.latency.p50}ms
  - Latency p90: ${metrics.latency.p90}ms
  - Latency p99: ${metrics.latency.p99}ms
  - Latency max: ${metrics.latency.max}ms
  - Status: ${metrics.latency.p99 < 2100 ? '✅ PASS' : '❌ FAIL'} (target: p99 <2100ms)
    `);
    
    // Save results
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(resultsDir, 'git-pool.json'),
        JSON.stringify({
            benchmark: 'git-pool',
            timestamp: new Date().toISOString(),
            total_commands: 50,
            duration_ms: duration,
            metrics,
            pass: metrics.latency.p99 < 2100
        }, null, 2)
    );
}

benchmark().catch(console.error);

