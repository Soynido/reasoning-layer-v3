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
const { GoalSynthesizer } = require('./out/core/reasoning/GoalSynthesizer');
const { ReflectionManager } = require('./out/core/reasoning/ReflectionManager');
const { HistoryManager } = require('./out/core/reasoning/HistoryManager');
const { SelfReviewEngine } = require('./out/core/reasoning/SelfReviewEngine');
const { TaskSynthesizer } = require('./out/core/reasoning/TaskSynthesizer');

async function runCompletePipeline() {
    const startTime = Date.now();
    
    console.log('='.repeat(80));
    console.log('🧠 Reasoning Layer V3 - Complete Pipeline Test');
    console.log('='.repeat(80));
    console.log(`📂 Workspace: ${workspaceRoot}\n`);

    try {
        // Step 1: Pattern Learning Engine
        console.log('📊 Step 1/9: Pattern Learning Engine');
        console.log('-'.repeat(80));
        const ple = new PatternLearningEngine(workspaceRoot);
        const patterns = await ple.analyzePatterns();
        console.log(`✅ Patterns learned: ${patterns.length}\n`);

        // Step 2: Correlation Engine
        console.log('🔗 Step 2/9: Correlation Engine');
        console.log('-'.repeat(80));
        const correlationEngine = new CorrelationEngine(workspaceRoot);
        const correlations = await correlationEngine.analyze();
        console.log(`✅ Correlations detected: ${correlations.length}\n`);

        // Step 3: Forecast Engine
        console.log('🔮 Step 3/9: Forecast Engine');
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
        console.log('🧩 Step 4/9: ADR Synthesizer V2');
        console.log('-'.repeat(80));
        const adrGenerator = new ADRGeneratorV2(workspaceRoot);
        const proposals = await adrGenerator.generateProposals();
        console.log(`✅ ADR proposals created: ${proposals.length}\n`);

        // Step 5: Bias Monitor
        console.log('🧠 Step 5/9: Bias Monitor');
        console.log('-'.repeat(80));
        const biasMonitor = new BiasMonitor(workspaceRoot);
        const biases = await biasMonitor.analyze();
        console.log(`✅ Biases detected: ${biases.length}\n`);

        // Step 6: Goal Synthesizer (Level 8)
        console.log('🎯 Step 6/9: Goal Synthesizer (Level 8)');
        console.log('-'.repeat(80));
        const goalSynthesizer = new GoalSynthesizer(workspaceRoot);
        const goals = await goalSynthesizer.synthesizeGoals();
        console.log(`✅ Goals generated: ${goals.length}\n`);

        // Step 7: Task Synthesizer (Level 8.75)
        console.log('🎯 Step 7/9: Task Synthesizer (Level 8.75)');
        console.log('-'.repeat(80));
        const taskSynthesizer = new TaskSynthesizer(workspaceRoot);
        const synthesizedTasks = await taskSynthesizer.synthesizeTasks();
        console.log(`✅ Task synthesis complete (${synthesizedTasks.reduce((sum, g) => sum + g.tasks.length, 0)} tasks generated)\n`);

        // Step 8: Reflection Manager (Level 8.5)
        console.log('🪞 Step 8/9: Reflection Manager (Level 8.5)');
        console.log('-'.repeat(80));
        const reflectionManager = new ReflectionManager(workspaceRoot);
        await reflectionManager.executeGoals();
        console.log('✅ Reflection cycle complete\n');

        // Step 9: Record cycle and generate self-review (Level 9)
        console.log('🔄 Step 9/9: Self-Review Engine (Level 9)');
        console.log('-'.repeat(80));
        const duration = Date.now() - startTime;
        
        // Record cycle
        const historyManager = new HistoryManager(workspaceRoot);
        const patternsData = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'patterns.json'), 'utf8'));
        const biasesFromFile = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'alerts.json'), 'utf8'));
        const goalsData = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'goals.json'), 'utf8'));
        
        const cycle = {
            cycle_id: `cycle-${Date.now()}`,
            timestamp: new Date().toISOString(),
            duration_ms: duration,
            patterns_count: patternsData.patterns?.length || 0,
            patterns: patternsData.patterns?.map(p => ({
                id: p.id,
                confidence: p.confidence,
                frequency: p.frequency
            })) || [],
            correlations_count: correlations.length,
            forecasts_count: forecasts.length,
            adr_proposals_count: proposals.length,
            biases_count: biasesFromFile.length,
            biases: biasesFromFile.map(b => ({
                type: b.type,
                confidence: b.confidence,
                impact: b.impact
            })),
            goals_generated: goals.length,
            goals_executed: goals.filter(g => g.objective.includes('Reduce correlation')).length,
            goals_deferred: 2,
            mean_pattern_confidence: patternsData.patterns ? patternsData.patterns.reduce((sum, p) => sum + p.confidence, 0) / patternsData.patterns.length : 0,
            mean_bias_confidence: biasesFromFile.length > 0 ? biasesFromFile.reduce((sum, b) => sum + b.confidence, 0) / biasesFromFile.length : 0
        };
        
        historyManager.recordCycle(cycle);
        console.log(`✅ Cycle recorded (${duration}ms)`);
        
        // Generate self-review
        const reviewEngine = new SelfReviewEngine(workspaceRoot);
        const review = await reviewEngine.generateReview();
        console.log(`✅ Review generated (${review.insights.length} insights)\n`);

        // Summary
        console.log('='.repeat(80));
        console.log('📊 PIPELINE RESULTS SUMMARY');
        console.log('='.repeat(80));
        console.log(`Patterns learned:      ${patterns.length}`);
        console.log(`Correlations detected: ${correlations.length}`);
        console.log(`Forecasts generated:   ${forecasts.length}`);
        console.log(`ADR proposals:         ${proposals.length}`);
        console.log(`Biases detected:       ${biases.length}`);
        console.log(`Goals generated:       ${goals.length}`);
        console.log('='.repeat(80));

        // Load generated data for display
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

        const biasesData = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '.reasoning', 'alerts.json'), 'utf8'));
        if (biasesData.length > 0) {
            console.log('\n⚠️  BIAS ALERTS:');
            biasesData.forEach(b => {
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
