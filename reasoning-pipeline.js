#!/usr/bin/env node

/**
 * Reasoning Pipeline - Task-Based Execution
 * 
 * Execute specific tasks from the Reasoning Layer V3
 * Usage: node reasoning-pipeline.js --task "Task Name"
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();

// Parse command line arguments
const args = process.argv.slice(2);
const taskArg = args.find(arg => arg.startsWith('--task='));
const taskName = taskArg ? taskArg.split('=')[1] : args.find(arg => arg.startsWith('--task')) ? args[args.indexOf('--task') + 1] : null;

if (!taskName) {
    console.error('❌ Error: --task argument required');
    console.log('Usage: node reasoning-pipeline.js --task "Task Name"');
    process.exit(1);
}

console.log('='.repeat(80));
console.log('🧠 Reasoning Layer V3 - Task Execution');
console.log('='.repeat(80));
console.log(`📋 Task: ${taskName}`);
console.log('='.repeat(80));

// Dynamic require for modules
function requireModule(modulePath) {
    try {
        return require(modulePath);
    } catch (error) {
        console.error(`❌ Failed to load module: ${modulePath}`);
        throw error;
    }
}

async function generateCognitiveManifest() {
    console.log('\n📄 Generating Cognitive Manifest v1.0...\n');

    try {
        // Load all reasoning data
        const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
        const correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
        const forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
        const adrsIndexPath = path.join(workspaceRoot, '.reasoning', 'adrs', 'index.json');
        const alertsPath = path.join(workspaceRoot, '.reasoning', 'alerts.json');
        const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
        const tasksPath = path.join(workspaceRoot, '.reasoning', 'tasks.json');
        const roadmapPath = path.join(workspaceRoot, '.reasoning', 'CognitiveRoadmap.md');

        const manifest = {
            version: '1.0',
            generated_at: new Date().toISOString(),
            reasoning_layer: {
                version: 'V3',
                status: 'FULLY OPERATIONAL',
                modules: [
                    'PatternLearningEngine',
                    'CorrelationEngine',
                    'CorrelationDeduplicator',
                    'ForecastEngine',
                    'HistoricalBalancer',
                    'PatternMutationEngine',
                    'PatternEvaluator',
                    'PatternPruner',
                    'ADRGeneratorV2',
                    'BiasMonitor',
                    'GoalSynthesizer',
                    'ReflectionManager',
                    'TaskSynthesizer',
                    'AutoTaskSynthesizer',
                    'GoalToActionCompiler',
                    'SelfReviewEngine'
                ]
            },
            cognitive_state: {
                patterns: {
                    total: 0,
                    impacts: {},
                    categories: {}
                },
                correlations: {
                    total: 0,
                    directions: {}
                },
                forecasts: {
                    total: 0,
                    types: {}
                },
                adrs: {
                    total: 0,
                    status: {}
                },
                biases: {
                    total: 0,
                    types: {}
                },
                goals: {
                    active: 0,
                    completed: 0,
                    deferred: 0
                },
                tasks: {
                    total: 0,
                    by_goal: {}
                }
            },
            cognitive_evolution: {
                pattern_diversity: 0,
                bias_count: 0,
                correlation_quality: 0,
                execution_metrics: {
                    success_rate: 0,
                    dependencies_resolved: 0
                }
            }
        };

        // Load and analyze patterns
        if (fs.existsSync(patternsPath)) {
            const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
            const patterns = patternsData.patterns || patternsData;
            manifest.cognitive_state.patterns.total = patterns.length;

            patterns.forEach(p => {
                manifest.cognitive_state.patterns.impacts[p.impact] = (manifest.cognitive_state.patterns.impacts[p.impact] || 0) + 1;
                manifest.cognitive_state.patterns.categories[p.category] = (manifest.cognitive_state.patterns.categories[p.category] || 0) + 1;
            });
        }

        // Load and analyze correlations
        if (fs.existsSync(correlationsPath)) {
            const correlations = JSON.parse(fs.readFileSync(correlationsPath, 'utf-8'));
            manifest.cognitive_state.correlations.total = correlations.length;

            correlations.forEach(c => {
                manifest.cognitive_state.correlations.directions[c.direction] = (manifest.cognitive_state.correlations.directions[c.direction] || 0) + 1;
            });
        }

        // Load and analyze forecasts
        if (fs.existsSync(forecastsPath)) {
            const forecasts = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
            manifest.cognitive_state.forecasts.total = forecasts.length;

            forecasts.forEach(f => {
                manifest.cognitive_state.forecasts.types[f.decision_type] = (manifest.cognitive_state.forecasts.types[f.decision_type] || 0) + 1;
            });
        }

        // Load and analyze ADRs
        if (fs.existsSync(adrsIndexPath)) {
            const adrsIndex = JSON.parse(fs.readFileSync(adrsIndexPath, 'utf-8'));
            manifest.cognitive_state.adrs.total = adrsIndex.adrIds ? adrsIndex.adrIds.length : 0;
        }

        // Load and analyze biases
        if (fs.existsSync(alertsPath)) {
            const alerts = JSON.parse(fs.readFileSync(alertsPath, 'utf-8'));
            manifest.cognitive_state.biases.total = alerts.length;

            alerts.forEach(a => {
                manifest.cognitive_state.biases.types[a.type] = (manifest.cognitive_state.biases.types[a.type] || 0) + 1;
            });
        }

        // Load and analyze goals
        if (fs.existsSync(goalsPath)) {
            const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
            const goals = goalsData.active_goals || [];
            manifest.cognitive_state.goals.active = goals.length;
            manifest.cognitive_state.goals.completed = goals.filter(g => g.status === 'completed').length;
            manifest.cognitive_state.goals.deferred = goals.filter(g => g.status === 'deferred').length;
        }

        // Load and analyze tasks
        if (fs.existsSync(tasksPath)) {
            const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
            manifest.cognitive_state.tasks.total = tasksData.tasks ? tasksData.tasks.length : 0;
        }

        // Load cognitive evolution from roadmap
        if (fs.existsSync(roadmapPath)) {
            const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
            const patternDiversityMatch = roadmapContent.match(/Pattern Diversity:\s*(\d+\.?\d*)/);
            const biasCountMatch = roadmapContent.match(/Bias Count:\s*(\d+)/);
            const correlationQualityMatch = roadmapContent.match(/Correlation Quality:\s*(\d+\.?\d*)/);
            const successRateMatch = roadmapContent.match(/Success Rate:\s*(\d+\.?\d*)%/);

            manifest.cognitive_evolution.pattern_diversity = patternDiversityMatch ? parseFloat(patternDiversityMatch[1]) : 0;
            manifest.cognitive_evolution.bias_count = biasCountMatch ? parseInt(biasCountMatch[1]) : 0;
            manifest.cognitive_evolution.correlation_quality = correlationQualityMatch ? parseFloat(correlationQualityMatch[1]) : 0;
            manifest.cognitive_evolution.execution_metrics.success_rate = successRateMatch ? parseFloat(successRateMatch[1]) : 0;
        }

        // Save manifest
        const manifestPath = path.join(workspaceRoot, '.reasoning', 'CognitiveManifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        console.log('✅ Cognitive Manifest generated successfully!');
        console.log(`📄 Saved to: ${manifestPath}\n`);
        console.log('📊 Manifest Summary:');
        console.log(`  Patterns: ${manifest.cognitive_state.patterns.total}`);
        console.log(`  Correlations: ${manifest.cognitive_state.correlations.total}`);
        console.log(`  Forecasts: ${manifest.cognitive_state.forecasts.total}`);
        console.log(`  ADRs: ${manifest.cognitive_state.adrs.total}`);
        console.log(`  Biases: ${manifest.cognitive_state.biases.total}`);
        console.log(`  Goals: ${manifest.cognitive_state.goals.active} active`);
        console.log(`  Tasks: ${manifest.cognitive_state.tasks.total}`);

    } catch (error) {
        console.error('❌ Error generating Cognitive Manifest:', error);
        throw error;
    }
}

// Task router
async function executeTask() {
    try {
        switch (taskName) {
            case 'Generate Cognitive Manifest v1.0':
            case 'Generate Cognitive Manifest':
                await generateCognitiveManifest();
                break;

            default:
                console.error(`❌ Unknown task: "${taskName}"`);
                console.log('Available tasks:');
                console.log('  - Generate Cognitive Manifest v1.0');
                process.exit(1);
        }

        console.log('\n✅ Task completed successfully!');
    } catch (error) {
        console.error('❌ Task failed:', error);
        process.exit(1);
    }
}

// Execute
executeTask();
