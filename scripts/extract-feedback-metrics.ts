/**
 * Extract Feedback Metrics Script
 * 
 * Analyzes existing RL4 data to compute real feedback metrics:
 * - Forecast accuracy
 * - Pattern stability
 * - ADR adoption rate
 * - Cycle efficiency
 * 
 * Outputs: feedback_report.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const workspaceRoot = process.cwd();
const cyclesPath = path.join(workspaceRoot, '.reasoning_rl4', 'ledger', 'cycles.jsonl');
const adrsPath = path.join(workspaceRoot, '.reasoning_rl4', 'adrs', 'auto');
const forecastsPath = path.join(workspaceRoot, '.reasoning_rl4', 'forecasts.json');
const metricsArtifactPath = path.join(workspaceRoot, '.reasoning_rl4', 'kernel', 'forecast_metrics.json.gz');
const reportPath = path.join(workspaceRoot, '.reasoning_rl4', 'feedback_report.json');

interface CycleEntry {
    cycleId: number;
    timestamp: string;
    duration?: number;
    phases: {
        patterns: { count: number; hash: string };
        correlations: { count: number; hash: string };
        forecasts: { count: number; hash: string };
        adrs: { count: number; hash: string };
    };
}

interface Forecast {
    id: string;
    category: string;
    timestamp?: string;
    created_at?: string;
}

interface ADR {
    id: string;
    title: string;
    category?: string;
    createdAt?: string;
    timestamp?: string;
}

// Load cycles
function loadCycles(): CycleEntry[] {
    if (!fs.existsSync(cyclesPath)) {
        console.log('⚠️ No cycles.jsonl found');
        return [];
    }

    const content = fs.readFileSync(cyclesPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    
    return lines
        .map(line => {
            try {
                return JSON.parse(line) as CycleEntry;
            } catch {
                return null;
            }
        })
        .filter((c): c is CycleEntry => c !== null);
}

// Load forecasts
function loadForecasts(): Forecast[] {
    if (!fs.existsSync(forecastsPath)) {
        console.log('⚠️ No forecasts.json found');
        return [];
    }

    try {
        const content = fs.readFileSync(forecastsPath, 'utf-8');
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

// Load ADRs
function loadADRs(): ADR[] {
    if (!fs.existsSync(adrsPath)) {
        console.log('⚠️ No ADRs directory found');
        return [];
    }

    const files = fs.readdirSync(adrsPath).filter(f => f.endsWith('.json'));
    const adrs: ADR[] = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(adrsPath, file), 'utf-8');
            const adr = JSON.parse(content) as ADR;
            adrs.push(adr);
        } catch {
            // Skip invalid files
        }
    }

    return adrs;
}

// Load baseline from artifacts
function loadBaselineMetrics(): any {
    if (!fs.existsSync(metricsArtifactPath)) {
        console.log('⚠️ No forecast_metrics.json.gz found');
        return null;
    }

    try {
        const compressed = fs.readFileSync(metricsArtifactPath);
        const decompressed = zlib.gunzipSync(compressed).toString();
        return JSON.parse(decompressed);
    } catch {
        return null;
    }
}

// Compute forecast accuracy
function computeForecastAccuracy(forecasts: Forecast[], adrs: ADR[]): number {
    if (forecasts.length === 0 || adrs.length === 0) {
        return 0.5; // Neutral baseline
    }

    let matches = 0;
    let total = 0;

    for (const forecast of forecasts.slice(-100)) {
        total++;
        
        const forecastTime = new Date(forecast.timestamp || forecast.created_at || Date.now()).getTime();
        
        const matchingADR = adrs.find(adr => {
            const adrTime = new Date(adr.createdAt || adr.timestamp || Date.now()).getTime();
            const timeDelta = adrTime - forecastTime;
            
            if (timeDelta > 0 && timeDelta < 86400000) { // 24h window
                const forecastCat = forecast.category?.toLowerCase() || '';
                const adrCat = adr.category?.toLowerCase() || adr.title?.toLowerCase() || '';
                
                return adrCat.includes(forecastCat) || forecastCat.includes(adrCat);
            }
            return false;
        });

        if (matchingADR) {
            matches++;
        }
    }

    return total > 0 ? matches / total : 0.5;
}

// Compute pattern stability
function computePatternStability(cycles: CycleEntry[]): number {
    if (cycles.length < 2) {
        return 0.5;
    }

    const recentCycles = cycles.slice(-500);
    const avgCount = recentCycles.reduce((sum, c) => sum + c.phases.patterns.count, 0) / recentCycles.length;
    
    const variance = recentCycles.reduce((sum, c) => {
        const diff = c.phases.patterns.count - avgCount;
        return sum + (diff * diff);
    }, 0) / recentCycles.length;

    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - (stdDev / 5));
}

// Compute ADR adoption rate
function computeADRAdoptionRate(adrs: ADR[]): number {
    if (adrs.length < 2) {
        return 0.5;
    }

    const uniqueTitles = new Set<string>();
    let duplicates = 0;

    for (const adr of adrs) {
        if (!adr.title) continue; // Skip ADRs without title
        const normalized = adr.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (uniqueTitles.has(normalized)) {
            duplicates++;
        } else {
            uniqueTitles.add(normalized);
        }
    }

    return (adrs.length - duplicates) / adrs.length;
}

// Compute cycle efficiency
function computeCycleEfficiency(cycles: CycleEntry[]): number {
    if (cycles.length < 2) {
        return 0.5;
    }

    const recentCycles = cycles.slice(-100);
    const timestamps = recentCycles.map(c => new Date(c.timestamp).getTime());
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const targetInterval = 10000; // 10s
    
    return Math.min(1, targetInterval / avgInterval);
}

// Main execution
console.log('📊 Extracting Feedback Metrics from RL4 Data...\n');

const cycles = loadCycles();
const forecasts = loadForecasts();
const adrs = loadADRs();
const baseline = loadBaselineMetrics();

console.log(`📈 Data loaded:`);
console.log(`   - Cycles: ${cycles.length}`);
console.log(`   - Forecasts: ${forecasts.length}`);
console.log(`   - ADRs: ${adrs.length}`);
console.log(`   - Baseline: ${baseline?.forecast_precision || 'N/A'}\n`);

// Compute metrics
const accuracy = computeForecastAccuracy(forecasts, adrs);
const stability = computePatternStability(cycles);
const adoption = computeADRAdoptionRate(adrs);
const efficiency = computeCycleEfficiency(cycles);

// Weighted composite
const weights = { accuracy: 0.4, stability: 0.2, adoption: 0.2, efficiency: 0.2 };
const composite = 
    (accuracy * weights.accuracy) +
    (stability * weights.stability) +
    (adoption * weights.adoption) +
    (efficiency * weights.efficiency);

// Delta from baseline
const baselinePrecision = baseline?.forecast_precision || 0.73;
const delta = composite - baselinePrecision;

// Generate report
const report = {
    generated_at: new Date().toISOString(),
    cycles_analyzed: cycles.length,
    data_sources: {
        cycles: cycles.length,
        forecasts: forecasts.length,
        adrs: adrs.length
    },
    metrics: {
        forecast_accuracy: accuracy,
        pattern_stability: stability,
        adr_adoption_rate: adoption,
        cycle_efficiency: efficiency
    },
    composite_feedback: composite,
    baseline_precision: baselinePrecision,
    delta: delta,
    interpretation: delta > 0 ? 'Improvement detected' : delta < -0.05 ? 'Regression detected' : 'Stable',
    recommendation: delta > 0.05 ? 'Increase α for faster learning' : delta < -0.05 ? 'Decrease α for stability' : 'Maintain current α=0.1'
};

// Save report
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

// Display results
console.log('✅ Metrics computed:\n');
console.log(`   📊 Forecast Accuracy:    ${(accuracy * 100).toFixed(1)}%`);
console.log(`   🧠 Pattern Stability:    ${(stability * 100).toFixed(1)}%`);
console.log(`   📝 ADR Adoption Rate:    ${(adoption * 100).toFixed(1)}%`);
console.log(`   ⚡ Cycle Efficiency:     ${(efficiency * 100).toFixed(1)}%`);
console.log(`\n   🎯 Composite Feedback:   ${(composite * 100).toFixed(1)}%`);
console.log(`   📈 Baseline:             ${(baselinePrecision * 100).toFixed(1)}%`);
console.log(`   Δ  Delta:                ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`);
console.log(`\n   💡 Interpretation: ${report.interpretation}`);
console.log(`   🔧 Recommendation: ${report.recommendation}`);
console.log(`\n📦 Report saved: ${reportPath}`);

