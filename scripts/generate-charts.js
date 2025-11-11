#!/usr/bin/env node
/**
 * Chart Generator - Phase E2 Final
 * 
 * Generates CSV exports and Markdown charts for:
 * - Forecast accuracy over time
 * - ADR adoption rate trend
 * - Composite feedback evolution
 * - Baseline drift visualization
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = process.cwd();
const RL4_PATH = path.join(WORKSPACE_ROOT, '.reasoning_rl4');
const OUTPUT_DIR = path.join(WORKSPACE_ROOT, '.reasoning_rl4', 'analytics');

/**
 * Load cycles from ledger
 */
function loadCycles() {
    const cyclesPath = path.join(RL4_PATH, 'ledger', 'cycles.jsonl');
    if (!fs.existsSync(cyclesPath)) {
        return [];
    }

    const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n');
    return lines.map(line => JSON.parse(line));
}

/**
 * Load ADR validation history
 */
function loadValidations() {
    const validationsPath = path.join(RL4_PATH, 'ledger', 'adr_validations.jsonl');
    if (!fs.existsSync(validationsPath)) {
        return [];
    }

    const lines = fs.readFileSync(validationsPath, 'utf-8').trim().split('\n').filter(l => l);
    return lines.map(line => JSON.parse(line));
}

/**
 * Load all ADRs
 */
function loadADRs() {
    const adrDir = path.join(RL4_PATH, 'adrs', 'auto');
    if (!fs.existsSync(adrDir)) {
        return [];
    }

    const files = fs.readdirSync(adrDir).filter(f => f.endsWith('.json') && f !== 'proposals.index.json');
    return files.map(file => {
        try {
            return JSON.parse(fs.readFileSync(path.join(adrDir, file), 'utf-8'));
        } catch {
            return null;
        }
    }).filter(a => a);
}

/**
 * Load forecasts
 */
function loadForecasts() {
    const forecastsPath = path.join(RL4_PATH, 'forecasts.json');
    if (!fs.existsSync(forecastsPath)) {
        return [];
    }

    return JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
}

/**
 * Generate CSV: Cycles Timeline
 */
function generateCyclesCSV(cycles) {
    const csv = [
        'cycle_id,timestamp,patterns_count,correlations_count,forecasts_count,adrs_count,merkle_root'
    ];

    for (const cycle of cycles) {
        csv.push([
            cycle.cycleId,
            cycle.timestamp,
            cycle.phases?.patterns?.count || 0,
            cycle.phases?.correlations?.count || 0,
            cycle.phases?.forecasts?.count || 0,
            cycle.phases?.adrs?.count || 0,
            cycle.merkleRoot || ''
        ].join(','));
    }

    return csv.join('\n');
}

/**
 * Generate CSV: ADR Adoption Rate Over Time
 */
function generateAdoptionCSV(cycles, adrs, validations) {
    const csv = [
        'cycle_id,timestamp,total_adrs,pending,accepted,rejected,adoption_rate'
    ];

    // Build timeline of validations
    const validationsByCycle = new Map();
    validations.forEach(v => {
        const ts = new Date(v.timestamp);
        validationsByCycle.set(v.adr_id, v);
    });

    // Sample every 10 cycles for clarity
    for (let i = 0; i < cycles.length; i += 10) {
        const cycle = cycles[i];
        const timestamp = cycle.timestamp;

        // Count ADRs at this point in time
        const adrsAtTime = adrs.filter(a => new Date(a.createdAt) <= new Date(timestamp));
        const pending = adrsAtTime.filter(a => a.validationStatus === 'pending').length;
        const accepted = adrsAtTime.filter(a => a.validationStatus === 'accepted').length;
        const rejected = adrsAtTime.filter(a => a.validationStatus === 'rejected').length;
        const total = adrsAtTime.length;
        const adoptionRate = total > 0 ? (accepted / total) : 0;

        csv.push([
            cycle.cycleId,
            timestamp,
            total,
            pending,
            accepted,
            rejected,
            adoptionRate.toFixed(4)
        ].join(','));
    }

    return csv.join('\n');
}

/**
 * Generate CSV: Forecast Accuracy Over Time
 */
function generateForecastAccuracyCSV(cycles) {
    const csv = [
        'cycle_id,timestamp,forecast_count,high_confidence_count,avg_confidence'
    ];

    // Sample every 10 cycles
    for (let i = 0; i < cycles.length; i += 10) {
        const cycle = cycles[i];
        const forecastCount = cycle.phases?.forecasts?.count || 0;
        
        // Note: We don't have historical forecast confidence in cycles
        // This would require storing forecast snapshots at each cycle
        csv.push([
            cycle.cycleId,
            cycle.timestamp,
            forecastCount,
            'N/A', // high_confidence_count
            'N/A'  // avg_confidence
        ].join(','));
    }

    return csv.join('\n');
}

/**
 * Generate Markdown Report with ASCII Charts
 */
function generateMarkdownReport(cycles, adrs, forecasts, validations) {
    const report = [];

    report.push('# RL4 Analytics Report\n');
    report.push(`**Generated**: ${new Date().toISOString()}\n`);
    report.push(`**Total Cycles**: ${cycles.length}\n`);
    report.push(`**Total ADRs**: ${adrs.length}\n`);
    report.push(`**Total Forecasts**: ${forecasts.length}\n`);
    report.push(`**Total Validations**: ${validations.length}\n`);
    report.push('---\n\n');

    // ADR Adoption Summary
    report.push('## 📊 ADR Adoption Summary\n\n');
    const pending = adrs.filter(a => a.validationStatus === 'pending').length;
    const accepted = adrs.filter(a => a.validationStatus === 'accepted').length;
    const rejected = adrs.filter(a => a.validationStatus === 'rejected').length;
    const adoptionRate = adrs.length > 0 ? (accepted / adrs.length * 100) : 0;

    report.push(`- **Total ADRs**: ${adrs.length}\n`);
    report.push(`- **Pending**: ${pending}\n`);
    report.push(`- **Accepted**: ${accepted} ✅\n`);
    report.push(`- **Rejected**: ${rejected} ❌\n`);
    report.push(`- **Adoption Rate**: ${adoptionRate.toFixed(1)}%\n\n`);

    // Adoption rate bar chart (ASCII)
    const adoptionBar = '█'.repeat(Math.round(adoptionRate / 2));
    const targetBar = '░'.repeat(Math.max(0, 50 - Math.round(adoptionRate / 2)));
    report.push('```\n');
    report.push(`Adoption: ${adoptionBar}${targetBar} ${adoptionRate.toFixed(1)}%\n`);
    report.push(`Target:   ${'█'.repeat(7)}${'░'.repeat(43)} 15%\n`);
    report.push('```\n\n');

    // Forecast Confidence Distribution
    report.push('## 🔮 Forecast Confidence Distribution\n\n');
    const confBuckets = [
        { label: '0.90-1.00', min: 0.90, max: 1.00, count: 0 },
        { label: '0.80-0.89', min: 0.80, max: 0.90, count: 0 },
        { label: '0.70-0.79', min: 0.70, max: 0.80, count: 0 },
        { label: '0.60-0.69', min: 0.60, max: 0.70, count: 0 },
        { label: '< 0.60', min: 0.00, max: 0.60, count: 0 }
    ];

    forecasts.forEach(f => {
        for (const bucket of confBuckets) {
            if (f.confidence >= bucket.min && f.confidence < bucket.max) {
                bucket.count++;
                break;
            }
        }
    });

    report.push('```\n');
    confBuckets.forEach(b => {
        const bar = '█'.repeat(b.count);
        report.push(`${b.label}: ${bar} (${b.count})\n`);
    });
    report.push('```\n\n');

    // Cycle Performance
    report.push('## ⚡ Cycle Performance\n\n');
    const avgPatterns = cycles.reduce((sum, c) => sum + (c.phases?.patterns?.count || 0), 0) / cycles.length;
    const avgCorrelations = cycles.reduce((sum, c) => sum + (c.phases?.correlations?.count || 0), 0) / cycles.length;
    const avgForecasts = cycles.reduce((sum, c) => sum + (c.phases?.forecasts?.count || 0), 0) / cycles.length;
    const avgADRs = cycles.reduce((sum, c) => sum + (c.phases?.adrs?.count || 0), 0) / cycles.length;

    report.push(`- **Avg Patterns/Cycle**: ${avgPatterns.toFixed(2)}\n`);
    report.push(`- **Avg Correlations/Cycle**: ${avgCorrelations.toFixed(2)}\n`);
    report.push(`- **Avg Forecasts/Cycle**: ${avgForecasts.toFixed(2)}\n`);
    report.push(`- **Avg ADRs/Cycle**: ${avgADRs.toFixed(2)}\n\n`);

    // Validation Timeline
    if (validations.length > 0) {
        report.push('## ✅ Validation Timeline\n\n');
        report.push('| Timestamp | Action | Confidence | Notes |\n');
        report.push('|-----------|--------|------------|-------|\n');

        validations.slice(-10).forEach(v => {
            const time = new Date(v.timestamp).toLocaleString();
            const action = v.action === 'accepted' ? '✅ Accepted' : '❌ Rejected';
            const conf = `${(v.confidence * 100).toFixed(0)}%`;
            const notes = (v.notes || '—').substring(0, 40);
            report.push(`| ${time} | ${action} | ${conf} | ${notes} |\n`);
        });
        report.push('\n');
    }

    return report.join('');
}

/**
 * Main execution
 */
async function generateCharts() {
    console.log('📊 RL4 Analytics Chart Generator\n');
    console.log('═'.repeat(60));

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Load data
    console.log('📂 Loading data...');
    const cycles = loadCycles();
    const adrs = loadADRs();
    const forecasts = loadForecasts();
    const validations = loadValidations();

    console.log(`   ✅ Loaded ${cycles.length} cycles`);
    console.log(`   ✅ Loaded ${adrs.length} ADRs`);
    console.log(`   ✅ Loaded ${forecasts.length} forecasts`);
    console.log(`   ✅ Loaded ${validations.length} validations`);
    console.log('');

    // Generate CSV exports
    console.log('📊 Generating CSV exports...');
    
    const cyclesCSV = generateCyclesCSV(cycles);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'cycles_timeline.csv'), cyclesCSV);
    console.log('   ✅ cycles_timeline.csv');

    const adoptionCSV = generateAdoptionCSV(cycles, adrs, validations);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'adr_adoption.csv'), adoptionCSV);
    console.log('   ✅ adr_adoption.csv');

    const forecastCSV = generateForecastAccuracyCSV(cycles);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'forecast_accuracy.csv'), forecastCSV);
    console.log('   ✅ forecast_accuracy.csv');

    console.log('');

    // Generate Markdown report
    console.log('📝 Generating Markdown report...');
    const report = generateMarkdownReport(cycles, adrs, forecasts, validations);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'ANALYTICS_REPORT.md'), report);
    console.log('   ✅ ANALYTICS_REPORT.md');

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ Charts generated successfully!');
    console.log('');
    console.log('📁 Output directory:', OUTPUT_DIR);
    console.log('');
    console.log('Files created:');
    console.log('   - cycles_timeline.csv');
    console.log('   - adr_adoption.csv');
    console.log('   - forecast_accuracy.csv');
    console.log('   - ANALYTICS_REPORT.md');
    console.log('');
    console.log('💡 Tip: Import CSV files into Excel/Google Sheets for visualization');
}

// Run generator
generateCharts().catch(error => {
    console.error('❌ Chart generation failed:', error);
    process.exit(1);
});

