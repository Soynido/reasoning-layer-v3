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
const { PatternLearningEngine } = require('./out/core/base/PatternLearningEngine');
const { CorrelationEngine } = require('./out/core/base/CorrelationEngine');
const { ForecastEngine } = require('./out/core/base/ForecastEngine');
const { ADRGeneratorV2 } = require('./out/core/base/ADRGeneratorV2');
const { BiasMonitor } = require('./out/core/base/BiasMonitor');
const { GoalSynthesizer } = require('./out/core/cognition/GoalSynthesizer');
const { ReflectionManager } = require('./out/core/cognition/ReflectionManager');
const { HistoryManager } = require('./out/core/memory/HistoryManager');
const { SelfReviewEngine } = require('./out/core/memory/SelfReviewEngine');
const { TaskSynthesizer } = require('./out/core/cognition/TaskSynthesizer');
const { AutoTaskSynthesizer } = require('./out/core/memory/AutoTaskSynthesizer');
const { runGoalToActionCompiler } = require('./out/core/operational/GoalToActionCompiler');
const { PatternMutationEngine } = require('./out/core/base/PatternMutationEngine');
const { PatternEvaluator } = require('./out/core/base/PatternEvaluator');
const { PatternPruner } = require('./out/core/base/PatternPruner');
const { HistoricalBalancer } = require('./out/core/base/HistoricalBalancer');
const { CorrelationDeduplicator } = require('./out/core/base/CorrelationDeduplicator');

async function runCompletePipeline() {
    const startTime = Date.now();
    
    console.log('='.repeat(80));
    console.log('🧠 Reasoning Layer V3 - Complete Pipeline Test');
    console.log('='.repeat(80));
    console.log(`📂 Workspace: ${workspaceRoot}\n`);

    try {
        // Step 1: Pattern Learning Engine
        console.log('📊 Step 1/11: Pattern Learning Engine');
        console.log('-'.repeat(80));
        const ple = new PatternLearningEngine(workspaceRoot);
        const patterns = await ple.analyzePatterns();
        console.log(`✅ Patterns learned: ${patterns.length}\n`);

        // Step 2: Correlation Engine
        console.log('🔗 Step 2/11: Correlation Engine');
        console.log('-'.repeat(80));
        const correlationEngine = new CorrelationEngine(workspaceRoot);
        const correlations = await correlationEngine.analyze();
        console.log(`✅ Correlations detected: ${correlations.length}\n`);

        // Step 2.5: Correlation Deduplicator
        console.log('🔍 Step 2.5: Correlation Deduplicator');
        console.log('-'.repeat(80));
        const correlationDeduplicator = new CorrelationDeduplicator(workspaceRoot);
        await correlationDeduplicator.run();
        console.log('✅ Correlation deduplication applied.\n');

        // Step 3: Forecast Engine
        console.log('🔮 Step 3/11: Forecast Engine');
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
        console.log('🧩 Step 4/11: ADR Synthesizer V2');
        console.log('-'.repeat(80));
        const adrGenerator = new ADRGeneratorV2(workspaceRoot);
        const proposals = await adrGenerator.generateProposals();
        console.log(`✅ ADR proposals created: ${proposals.length}\n`);

        // Step 5: Bias Monitor
        console.log('🧠 Step 5/11: Bias Monitor');
        console.log('-'.repeat(80));
        const biasMonitor = new BiasMonitor(workspaceRoot);
        const biases = await biasMonitor.analyze();
        console.log(`✅ Biases detected: ${biases.length}\n`);

        // Step 5.5: Historical Balancer
        console.log('⚖️ Step 5.5: Historical Balancer');
        console.log('-'.repeat(80));
        const historicalBalancer = new HistoricalBalancer(workspaceRoot);
        await historicalBalancer.run();
        console.log('✅ Historical balance checked.\n');

        // Step 5.75: Pattern Mutation Engine
        console.log('🧬 Step 5.75: Pattern Mutation Engine');
        console.log('-'.repeat(80));
        const patternMutationEngine = new PatternMutationEngine(workspaceRoot);
        const mutations = await patternMutationEngine.generateMutations();
        console.log(`✅ Generated ${mutations.length} pattern mutations\n`);

        // Step 5.8: Pattern Evaluator
        console.log('🔍 Step 5.8: Pattern Evaluator');
        console.log('-'.repeat(80));
        const patternEvaluator = new PatternEvaluator(workspaceRoot);
        await patternEvaluator.run();
        console.log('✅ Pattern evaluation complete.\n');

        // Step 5.9: Pattern Pruner
        console.log('✂️ Step 5.9: Pattern Pruner');
        console.log('-'.repeat(80));
        const patternPruner = new PatternPruner(workspaceRoot);
        await patternPruner.run();
        console.log('✅ Pattern pruning complete.\n');

        // Step 6: Goal Synthesizer (Level 8)
        console.log('🎯 Step 6/11: Goal Synthesizer (Level 8)');
        console.log('-'.repeat(80));
        const goalSynthesizer = new GoalSynthesizer(workspaceRoot);
        const goals = await goalSynthesizer.synthesizeGoals();
        console.log(`✅ Goals generated: ${goals.length}\n`);

        // Step 7: Task Synthesizer (Level 8.75)
        console.log('🎯 Step 7/11: Task Synthesizer (Level 8.75)');
        console.log('-'.repeat(80));
        const taskSynthesizer = new TaskSynthesizer(workspaceRoot);
        const synthesizedTasks = await taskSynthesizer.synthesizeTasks();
        console.log(`✅ Task synthesis complete (${synthesizedTasks.reduce((sum, g) => sum + g.tasks.length, 0)} tasks generated)\n`);

        // Step 8: Auto Task Synthesizer (Level 9.5)
        console.log('🧠 Step 8/11: Auto Task Synthesizer (Level 9.5)');
        console.log('-'.repeat(80));
        const autoTaskSynthesizer = new AutoTaskSynthesizer(workspaceRoot);
        const autoTasks = await autoTaskSynthesizer.synthesize();
        console.log(`✅ Auto task synthesis complete (${autoTasks.length} tasks from historical context)\n`);

        // Step 8.5: Goal-to-Action Compiler (Level 10)
        console.log('🛠️ Step 8.5/11: Goal-to-Action Compiler (Level 10)');
        console.log('-'.repeat(80));
        const actionPlan = await runGoalToActionCompiler(workspaceRoot);
        console.log(`✅ Action plan generated (${actionPlan.length} file-level actions)\n`);

        // Step 9: Reflection Manager (Level 8.5)
        console.log('🪞 Step 9/11: Reflection Manager (Level 8.5)');
        console.log('-'.repeat(80));
        const reflectionManager = new ReflectionManager(workspaceRoot);
        await reflectionManager.executeGoals();
        console.log('✅ Reflection cycle complete\n');

        // Step 11: Record cycle and generate self-review (Level 9)
        console.log('🔄 Step 11/11: Self-Review Engine (Level 9)');
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
