#!/usr/bin/env node
/**
 * Export RL4 Snapshot - Essential Logs for External Tools
 * Creates a compact JSON with all key cognitive data
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WORKSPACE_ROOT = process.cwd();
const RL4_PATH = path.join(WORKSPACE_ROOT, '.reasoning_rl4');
const OUTPUT_PATH = path.join(WORKSPACE_ROOT, 'rl4-snapshot.json');

console.log('📊 Exporting RL4 Snapshot...\n');

// Helper: Safe JSON read
function safeRead(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }
}

// Helper: Read JSONL (all lines)
function readJSONL(filePath) {
    try {
        const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
        return lines.map(line => JSON.parse(line));
    } catch {
        return [];
    }
}

// Helper: Read compressed JSON
function readCompressed(filePath) {
    try {
        const compressed = fs.readFileSync(filePath);
        const decompressed = zlib.gunzipSync(compressed);
        return JSON.parse(decompressed.toString());
    } catch {
        return null;
    }
}

// Build snapshot
const snapshot = {
    snapshot_metadata: {
        generated_at: new Date().toISOString(),
        version: '2.0.7',
        purpose: 'Complete RL4 cognitive state for external analysis',
        workspace: path.basename(WORKSPACE_ROOT)
    },
    
    // Cognitive Output
    patterns: safeRead(path.join(RL4_PATH, 'patterns.json'))?.patterns || [],
    correlations: safeRead(path.join(RL4_PATH, 'correlations.json')) || [],
    forecasts: safeRead(path.join(RL4_PATH, 'forecasts.json')) || [],
    
    // ADR Proposals
    adr_proposals: safeRead(path.join(RL4_PATH, 'adrs/auto/proposals.index.json')) || {},
    
    // Kernel State (most important)
    kernel_state: readCompressed(path.join(RL4_PATH, 'kernel/state.json.gz')) || {},
    
    // Validation History
    validation_history: readJSONL(path.join(RL4_PATH, 'ledger/adr_validations.jsonl')),
    
    // Recent Activity
    recent_cycles: readJSONL(path.join(RL4_PATH, 'ledger/cycles.jsonl')).slice(-10),
    recent_commits: readJSONL(path.join(RL4_PATH, 'traces/git_commits.jsonl')).slice(-5),
    recent_file_changes: readJSONL(path.join(RL4_PATH, 'traces/file_changes.jsonl')).slice(-10),
    
    // Summary Stats
    summary_stats: {
        total_cycles: readJSONL(path.join(RL4_PATH, 'ledger/cycles.jsonl')).length,
        total_commits_captured: readJSONL(path.join(RL4_PATH, 'traces/git_commits.jsonl')).length,
        total_file_changes: readJSONL(path.join(RL4_PATH, 'traces/file_changes.jsonl')).length,
        active_patterns: (safeRead(path.join(RL4_PATH, 'patterns.json'))?.patterns || []).length,
        active_forecasts: (safeRead(path.join(RL4_PATH, 'forecasts.json')) || []).length,
        active_correlations: (safeRead(path.join(RL4_PATH, 'correlations.json')) || []).length,
        adr_adoption_rate: (() => {
            const index = safeRead(path.join(RL4_PATH, 'adrs/auto/proposals.index.json'));
            if (!index || index.total_proposals === 0) return 0;
            return index.accepted.length / index.total_proposals;
        })(),
        pattern_stability: readCompressed(path.join(RL4_PATH, 'kernel/state.json.gz'))?.evaluation_metrics?.pattern_stability || 0,
        cycle_efficiency: readCompressed(path.join(RL4_PATH, 'kernel/state.json.gz'))?.evaluation_metrics?.cycle_efficiency || 0
    }
};

// Write snapshot
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));

console.log('✅ Snapshot exported!\n');
console.log('📁 Output:', OUTPUT_PATH);
console.log('📊 Size:', (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1), 'KB\n');

console.log('📋 Contents:');
console.log(`   - Patterns (${snapshot.patterns.length})`);
console.log(`   - Correlations (${snapshot.correlations.length})`);
console.log(`   - Forecasts (${snapshot.forecasts.length})`);
console.log(`   - ADR Proposals (${snapshot.adr_proposals.total_proposals || 0})`);
console.log(`   - Validation History (${snapshot.validation_history.length})`);
console.log(`   - Recent Cycles (${snapshot.recent_cycles.length})`);
console.log(`   - Recent Commits (${snapshot.recent_commits.length})`);
console.log(`   - Summary Stats (${Object.keys(snapshot.summary_stats).length} metrics)\n`);

console.log('📊 Key Metrics:');
console.log(`   - ADR Adoption Rate: ${(snapshot.summary_stats.adr_adoption_rate * 100).toFixed(1)}%`);
console.log(`   - Pattern Stability: ${(snapshot.summary_stats.pattern_stability * 100).toFixed(1)}%`);
console.log(`   - Cycle Efficiency: ${(snapshot.summary_stats.cycle_efficiency * 100).toFixed(2)}%`);
console.log(`   - Total Cycles: ${snapshot.summary_stats.total_cycles}\n`);

console.log('💡 Use this file for:');
console.log('   - LLM context injection');
console.log('   - External analytics tools');
console.log('   - API integration');
console.log('   - Cognitive state backup\n');

