#!/usr/bin/env node

/**
 * Test Script - Reasoning Layer V3 Complete Pipeline
 * 
 * Runs the complete reasoning pipeline on all historical data:
 * 1. Pattern Learning Engine
 * 2. Correlation Engine
 * 3. Forecast Engine
 * 4. ADR Synthesizer
 * 5. Bias Monitor
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const { PatternLearningEngine } = require('./out/core/reasoning/PatternLearningEngine');
const { CorrelationEngine } = require('./out/core/reasoning/CorrelationEngine');
const { ForecastEngine } = require('./out/core/reasoning/ForecastEngine');
const { ADRGeneratorV2 } = require('./out/core/reasoning/ADRGeneratorV2');
const { BiasMonitor } = require('./out/core/reasoning/BiasMonitor');

async function runCompletePipeline() {
    console.log('='.repeat(80));
    console.log('🧠 Reasoning Layer V3 - Complete Pipeline Test');
    console.log('='.repeat(80));
    console.log(`📂 Workspace: ${workspaceRoot}\n`);

    try {
        // Step 1: Pattern Learning Engine
        console.log('📊 Step 1/5: Pattern Learning Engine');
        console.log('-'.repeat(80));
        const ple = new PatternLearningEngine(workspaceRoot);
        const patterns = await ple.analyzePatterns();
        console.log(`✅ Patterns learned: ${patterns.length}\n`);

        // Step 2: Correlation Engine
        console.log('🔗 Step 2/5: Correlation Engine');
        console.log('-'.repeat(80));
        const correlationEngine = new CorrelationEngine(workspaceRoot);
        const correlations = await correlationEngine.analyze();
        console.log(`✅ Correlations detected: ${correlations.length}\n`);

        // Step 3: Forecast Engine
        console.log('🔮 Step 3/5: Forecast Engine');
        console.log('-'.repeat(80));
        const forecastEngine = new ForecastEngine(workspaceRoot);
        const forecasts = await forecastEngine.generate();
        console.log(`✅ Forecasts generated: ${forecasts.length}\n`);

        // Step 3.5: Adaptive Regulation
        console.log('🧠 Step 3.5: Adaptive Regulation');
        console.log('-'.repeat(80));
        await ple.applyAdaptiveRegulationToPatterns();
        console.log(`✅ Adaptive regulation applied\n`);

        // Step 4: ADR Synthesizer
        console.log('🧩 Step 4/5: ADR Synthesizer V2');
        console.log('-'.repeat(80));
        const adrGenerator = new ADRGeneratorV2(workspaceRoot);
        const proposals = await adrGenerator.generateProposals();
        console.log(`✅ ADR proposals created: ${proposals.length}\n`);

        // Step 5: Bias Monitor
        console.log('🧠 Step 5/5: Bias Monitor');
        console.log('-'.repeat(80));
        const biasMonitor = new BiasMonitor(workspaceRoot);
        const biases = await biasMonitor.analyze();
        console.log(`✅ Biases detected: ${biases.length}\n`);

        // Summary
        console.log('='.repeat(80));
        console.log('📊 PIPELINE RESULTS SUMMARY');
        console.log('='.repeat(80));
        console.log(`Patterns learned:      ${patterns.length}`);
        console.log(`Correlations detected: ${correlations.length}`);
        console.log(`Forecasts generated:   ${forecasts.length}`);
        console.log(`ADR proposals:         ${proposals.length}`);
        console.log(`Biases detected:       ${biases.length}`);
        console.log('='.repeat(80));

        // Load generated data
        const patternsData = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'patterns.json'), 'utf8'));
        const correlationsData = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'correlations.json'), 'utf8'));
        const forecastsData = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'forecasts.json'), 'utf8'));
        
        console.log('\n📈 PATTERN ANALYSIS:');
        patternsData.patterns?.forEach(p => {
            console.log(`  ${p.id}: ${p.pattern}`);
            console.log(`    Confidence: ${Math.round(p.confidence * 100)}%, Frequency: ${p.frequency}, Impact: ${p.impact}`);
        });

        console.log('\n🔗 CORRELATIONS:');
        correlationsData.forEach(c => {
            console.log(`  ${c.id}: Pattern ${c.pattern_id} → Score ${c.correlation_score.toFixed(2)} (${c.direction})`);
        });

        console.log('\n🔮 FORECASTS:');
        forecastsData.forEach(f => {
            console.log(`  ${f.forecast_id}: ${f.predicted_decision}`);
            console.log(`    Confidence: ${Math.round(f.confidence * 100)}%, Timeframe: ${f.suggested_timeframe}`);
        });

        if (biases.length > 0) {
            console.log('\n⚠️  BIAS ALERTS:');
            biases.forEach(b => {
                console.log(`  ${b.type}: ${b.description}`);
                console.log(`    Impact: ${b.impact}, Confidence: ${Math.round(b.confidence * 100)}%`);
                console.log(`    Suggestion: ${b.suggestion}`);
            });
        }

        console.log('\n✅ Pipeline test complete!');
        console.log(`📁 Check .reasoning/ for all generated data`);

    } catch (error) {
        console.error('\n❌ Error running pipeline:', error);
        process.exit(1);
    }
}

runCompletePipeline();
