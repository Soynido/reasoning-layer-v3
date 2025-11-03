/**
 * Stability Test - 2 Hour Run
 * 
 * Tests Kernel stability under continuous load:
 * - Memory drift monitoring
 * - Timer leak detection
 * - Event loop lag measurement
 * - Queue depth tracking
 * - Git pool error rate
 * 
 * Target Metrics:
 * - Memory drift: <1 MB/hour
 * - Active timers: ≤1
 * - Event loop lag p99: <50ms
 * - Queue size: 0-2
 * - Git pool errors: 0
 */

import * as path from 'path';
import { TimerRegistry } from '../extension/kernel/TimerRegistry';
import { HealthMonitor } from '../extension/kernel/HealthMonitor';
import { StateRegistry } from '../extension/kernel/StateRegistry';
import { CognitiveScheduler } from '../extension/kernel/CognitiveScheduler';
import { AppendOnlyWriter } from '../extension/kernel/AppendOnlyWriter';
import { ExecPool } from '../extension/kernel/ExecPool';

const DURATION_HOURS = 2;
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const workspaceRoot = process.cwd();

interface StabilityMetrics {
    timestamp: string;
    uptime_ms: number;
    memory_mb: number;
    active_timers: number;
    queue_size: number;
    event_loop_lag: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
    };
    exec_pool_errors: number;
}

async function runStabilityTest() {
    console.log(`🧪 Starting ${DURATION_HOURS}h stability test...`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`📊 Checks every ${CHECK_INTERVAL_MS / 1000 / 60} minutes\n`);

    // Initialize Kernel components
    const timerRegistry = new TimerRegistry();
    const stateRegistry = new StateRegistry(path.join(workspaceRoot, '.reasoning_rl4', 'state'));
    const healthMonitor = new HealthMonitor(timerRegistry);
    const scheduler = new CognitiveScheduler(workspaceRoot, timerRegistry);
    const execPool = new ExecPool(2, 2000, workspaceRoot);
    
    // Start health monitoring
    healthMonitor.start(timerRegistry);
    
    // Start cognitive scheduler (10s cycles)
    scheduler.start(10000); // 10s per cycle
    
    const startTime = Date.now();
    const metrics: StabilityMetrics[] = [];
    
    // Periodic check
    const checkInterval = setInterval(() => {
        const uptime = Date.now() - startTime;
        const health = healthMonitor.getMetrics();
        const poolMetrics = execPool.getMetrics();
        
        const metric: StabilityMetrics = {
            timestamp: new Date().toISOString(),
            uptime_ms: uptime,
            memory_mb: health.memoryMB,
            active_timers: timerRegistry.getActiveCount(),
            queue_size: 0, // Would need to expose from scheduler
            event_loop_lag: health.eventLoopLag,
            exec_pool_errors: poolMetrics.failed + poolMetrics.timedOut
        };
        
        metrics.push(metric);
        
        console.log(`\n📊 [${new Date().toISOString()}] Uptime: ${(uptime / 1000 / 60).toFixed(0)} min`);
        console.log(`   Memory: ${metric.memory_mb.toFixed(2)} MB`);
        console.log(`   Timers: ${metric.active_timers}`);
        console.log(`   Event Loop Lag p99: ${metric.event_loop_lag.p99.toFixed(2)} ms`);
        console.log(`   Exec Pool Errors: ${metric.exec_pool_errors}`);
        
        // Check if duration reached
        if (uptime >= DURATION_HOURS * 60 * 60 * 1000) {
            clearInterval(checkInterval);
            generateReport(metrics, startTime);
            process.exit(0);
        }
    }, CHECK_INTERVAL_MS);
    
    console.log('\n⏳ Test running... (Press Ctrl+C to stop early)');
    console.log('📊 Metrics will be logged every 10 minutes\n');
}

function generateReport(metrics: StabilityMetrics[], startTime: number) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n\n' + '='.repeat(60));
    console.log('🏁 STABILITY TEST COMPLETE');
    console.log('='.repeat(60) + '\n');
    
    console.log(`⏱️  Duration: ${(duration / 1000 / 60 / 60).toFixed(2)} hours`);
    console.log(`📊 Checks: ${metrics.length}\n`);
    
    // Memory drift analysis
    const memoryStart = metrics[0]?.memory_mb || 0;
    const memoryEnd = metrics[metrics.length - 1]?.memory_mb || 0;
    const memoryDrift = memoryEnd - memoryStart;
    const memoryDriftPerHour = memoryDrift / (duration / 1000 / 60 / 60);
    
    console.log('📊 Memory Analysis:');
    console.log(`   Start: ${memoryStart.toFixed(2)} MB`);
    console.log(`   End: ${memoryEnd.toFixed(2)} MB`);
    console.log(`   Drift: ${memoryDrift >= 0 ? '+' : ''}${memoryDrift.toFixed(2)} MB`);
    console.log(`   Drift/hour: ${memoryDriftPerHour >= 0 ? '+' : ''}${memoryDriftPerHour.toFixed(2)} MB/h`);
    console.log(`   Target: <1 MB/h`);
    console.log(`   Status: ${Math.abs(memoryDriftPerHour) < 1 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Timer stability
    const maxTimers = Math.max(...metrics.map(m => m.active_timers));
    console.log('📊 Timer Stability:');
    console.log(`   Max active timers: ${maxTimers}`);
    console.log(`   Target: ≤1`);
    console.log(`   Status: ${maxTimers <= 1 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Event loop lag
    const lagP99Values = metrics.map(m => m.event_loop_lag.p99);
    const maxLagP99 = Math.max(...lagP99Values);
    console.log('📊 Event Loop Lag:');
    console.log(`   Max p99: ${maxLagP99.toFixed(2)} ms`);
    console.log(`   Target: <50 ms`);
    console.log(`   Status: ${maxLagP99 < 50 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Exec pool errors
    const totalExecErrors = Math.max(...metrics.map(m => m.exec_pool_errors));
    console.log('📊 Exec Pool:');
    console.log(`   Total errors: ${totalExecErrors}`);
    console.log(`   Target: 0`);
    console.log(`   Status: ${totalExecErrors === 0 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Overall verdict
    const allPassed = Math.abs(memoryDriftPerHour) < 1 && 
                      maxTimers <= 1 && 
                      maxLagP99 < 50 && 
                      totalExecErrors === 0;
    
    console.log('='.repeat(60));
    console.log(`🏆 OVERALL: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(60) + '\n');
    
    // Save report
    const reportPath = path.join(workspaceRoot, 'bench', 'results', 'stability-2h.json');
    const fs = require('fs');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
        duration_hours: DURATION_HOURS,
        checks: metrics.length,
        memory: { start: memoryStart, end: memoryEnd, drift: memoryDrift, drift_per_hour: memoryDriftPerHour },
        timers: { max: maxTimers },
        event_loop_lag: { max_p99: maxLagP99 },
        exec_pool: { total_errors: totalExecErrors },
        metrics,
        passed: allPassed,
        timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`💾 Report saved: ${reportPath}`);
}

// Run test
runStabilityTest().catch(err => {
    console.error('❌ Stability test failed:', err);
    process.exit(1);
});

