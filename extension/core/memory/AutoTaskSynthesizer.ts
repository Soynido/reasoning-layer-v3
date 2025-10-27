/**
 * Auto Task Synthesizer - Level 9.5: Auto-Contextual Task Synthesis
 * 
 * Reads entire historical memory and synthesizes tasks based on global state analysis
 * No hardcoded rules - learns from its own history
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionPattern } from './types';

interface GlobalState {
    patterns: {
        count: number;
        data: DecisionPattern[];
        avg_confidence: number;
    };
    correlations: {
        count: number;
        avg_score: number;
    };
    forecasts: {
        count: number;
        avg_confidence: number;
    };
    biases: {
        count: number;
        types: string[];
    };
    goals: {
        active: number;
        completed: number;
        recent: string[];
    };
    history: {
        cycles: number;
        avg_confidence: number;
        trend: {
            confidence: number;
            bias: number;
            efficiency: number;
        };
    };
    diversity_score: number;
    adrs: {
        total: number;
        pending: number;
        duplicated: number;
    };
}

interface CognitiveSignal {
    type: 'opportunity' | 'anomaly' | 'regression' | 'stagnation';
    description: string;
    confidence: number;
    source: string;
    metric: string;
    value: any;
    action_hint: string;
}

interface AutoTask {
    id: string;
    title: string;
    description: string;
    engine: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    success_criteria: any;
    derived_from: string[];
    created_at: string;
}

export class AutoTaskSynthesizer {
    private workspaceRoot: string;
    private tasksPath: string;
    private tasksMarkdownPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.tasksPath = path.join(workspaceRoot, '.reasoning', 'tasks_auto.json');
        this.tasksMarkdownPath = path.join(workspaceRoot, '.reasoning', 'ReasoningTasks_Auto.md');
    }

    /**
     * Main entry point: analyze historical context and synthesize tasks
     */
    public async synthesize(): Promise<AutoTask[]> {
        console.log('🧠 AutoTaskSynthesizer: Reading historical context...');

        // Step 1: Load global state
        const globalState = await this.loadHistoricalContext();
        console.log(`📊 Global State: ${globalState.patterns.count} patterns, ${globalState.correlations.count} correlations, ${globalState.biases.count} biases`);

        // Step 2: Detect cognitive signals
        const signals = this.detectCognitiveSignals(globalState);
        console.log(`🔍 Detected ${signals.length} cognitive signals`);

        // Step 3: Synthesize tasks from signals
        const tasks = this.synthesizeTasksFromSignals(signals, globalState);
        console.log(`🎯 Synthesized ${tasks.length} auto-tasks`);

        // Step 4: Save outputs
        await this.saveOutputs(tasks, signals, globalState);

        return tasks;
    }

    /**
     * Load and aggregate entire historical context
     */
    private async loadHistoricalContext(): Promise<GlobalState> {
        const reasoningDir = path.join(this.workspaceRoot, '.reasoning');

        // Load patterns
        const patternsData = await this.loadJSON(path.join(reasoningDir, 'patterns.json'));
        const patterns = patternsData?.patterns || [];
        const avgPatternConfidence = patterns.length > 0
            ? patterns.reduce((sum: number, p: DecisionPattern) => sum + p.confidence, 0) / patterns.length
            : 0;

        // Load correlations
        const correlations = await this.loadJSON(path.join(reasoningDir, 'correlations.json')) || [];
        const avgCorrelation = correlations.length > 0
            ? correlations.reduce((sum: number, c: any) => sum + (c.correlation_score || 0), 0) / correlations.length
            : 0;

        // Load forecasts
        const forecasts = await this.loadJSON(path.join(reasoningDir, 'forecasts.json')) || [];
        const avgForecastConfidence = forecasts.length > 0
            ? forecasts.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0) / forecasts.length
            : 0;

        // Load biases
        const biases: any[] = await this.loadJSON(path.join(reasoningDir, 'alerts.json')) || [];
        const biasTypes: string[] = Array.from(new Set(biases.map((b: any) => String(b.type))));

        // Load goals
        const goalsData = await this.loadJSON(path.join(reasoningDir, 'goals.json'));
        const activeGoals: any[] = goalsData?.active_goals || [];
        const completedGoals: any[] = goalsData?.completed_goals || [];
        const recentGoals: string[] = activeGoals.slice(0, 3).map((g: any) => String(g.objective));

        // Load history
        const historyData = await this.loadJSON(path.join(reasoningDir, 'history.json'));
        const cycles = historyData?.total_cycles || 0;
        const avgConfidence = historyData?.statistics?.average_confidence || 0;
        const evolution = historyData?.evolution || {
            confidence_trend: 0,
            bias_trend: 0,
            efficiency_trend: 0
        };

        // Calculate diversity score
        const diversityScore = this.calculateDiversityScore(patterns);

        // Count ADRs
        const adrsDir = path.join(reasoningDir, 'adrs');
        const adrs = this.countADRs(adrsDir);

        return {
            patterns: {
                count: patterns.length,
                data: patterns,
                avg_confidence: avgPatternConfidence
            },
            correlations: {
                count: correlations.length,
                avg_score: avgCorrelation
            },
            forecasts: {
                count: forecasts.length,
                avg_confidence: avgForecastConfidence
            },
            biases: {
                count: biases.length,
                types: biasTypes
            },
            goals: {
                active: activeGoals.length,
                completed: completedGoals.length,
                recent: recentGoals as string[]
            },
            history: {
                cycles,
                avg_confidence: avgConfidence,
                trend: evolution
            },
            diversity_score: diversityScore,
            adrs: adrs
        };
    }

    /**
     * Detect cognitive signals from global state
     */
    private detectCognitiveSignals(state: GlobalState): CognitiveSignal[] {
        const signals: CognitiveSignal[] = [];

        // Signal 1: Low pattern diversity
        if (state.diversity_score < 0.5) {
            signals.push({
                type: 'opportunity',
                description: `Low pattern diversity detected (${state.diversity_score.toFixed(2)})`,
                confidence: 0.85,
                source: 'patterns.json',
                metric: 'diversity_score',
                value: state.diversity_score,
                action_hint: 'Generate pattern mutations or reanalyze historical contexts'
            });
        }

        // Signal 2: Thematic bias
        if (state.biases.count > 0 && state.biases.types.includes('thematic_bias')) {
            signals.push({
                type: 'anomaly',
                description: 'Thematic bias detected in recent analysis',
                confidence: 0.80,
                source: 'alerts.json',
                metric: 'bias_type',
                value: 'thematic_bias',
                action_hint: 'Implement category diversity limits or historical rebalancing'
            });
        }

        // Signal 3: Confidence regression
        if (state.history.trend.confidence < -0.05) {
            signals.push({
                type: 'regression',
                description: `Pattern confidence decreased by ${(Math.abs(state.history.trend.confidence) * 100).toFixed(1)}%`,
                confidence: 0.75,
                source: 'history.json',
                metric: 'confidence_trend',
                value: state.history.trend.confidence,
                action_hint: 'Re-evaluate pattern learning logic or increase data quality'
            });
        }

        // Signal 4: Stagnation (same forecasts repeated)
        if (state.forecasts.count > 10 && state.forecasts.avg_confidence < 0.7) {
            signals.push({
                type: 'stagnation',
                description: 'Forecast stagnation: low confidence on repeated predictions',
                confidence: 0.70,
                source: 'forecasts.json',
                metric: 'avg_confidence',
                value: state.forecasts.avg_confidence,
                action_hint: 'Stimulate new pattern learning or diversify correlation sources'
            });
        }

        // Signal 5: Duplicate ADRs
        if (state.adrs.duplicated > 2) {
            signals.push({
                type: 'anomaly',
                description: `${state.adrs.duplicated} duplicate ADRs detected`,
                confidence: 0.90,
                source: 'adrs',
                metric: 'duplicate_count',
                value: state.adrs.duplicated,
                action_hint: 'Improve ADR deduplication or forecast consolidation'
            });
        }

        return signals;
    }

    /**
     * Synthesize tasks from cognitive signals
     */
    private synthesizeTasksFromSignals(signals: CognitiveSignal[], state: GlobalState): AutoTask[] {
        const tasks: AutoTask[] = [];
        let taskIndex = 1;

        for (const signal of signals) {
            // Generate 1-2 tasks per signal based on hint
            const task = this.createTaskFromSignal(signal, state, taskIndex++);
            if (task) {
                tasks.push(task);
            }

            // Add second task for high-impact signals
            if (signal.confidence > 0.8 && (signal.type === 'regression' || signal.type === 'anomaly')) {
                const followUpTask = this.createFollowUpTask(signal, state, taskIndex++);
                if (followUpTask) {
                    tasks.push(followUpTask);
                }
            }
        }

        return tasks;
    }

    /**
     * Create a task from a cognitive signal
     */
    private createTaskFromSignal(signal: CognitiveSignal, state: GlobalState, index: number): AutoTask | null {
        const timestamp = Date.now();
        const priority = signal.confidence > 0.85 ? 'high' : signal.confidence > 0.7 ? 'medium' : 'low';

        // Map hint to task
        let title = '';
        let engine = '';
        let description = signal.description;

        if (signal.action_hint.includes('pattern mutations')) {
            title = 'Generate pattern mutations';
            engine = 'PatternMutationEngine';
            description += ' - Target: generate 5+ new patterns with novelty >0.6';
        } else if (signal.action_hint.includes('category diversity')) {
            title = 'Implement category diversity limits';
            engine = 'CategoryLimiter';
            description += ' - Limit forecasts to 3 per category';
        } else if (signal.action_hint.includes('historical rebalancing')) {
            title = 'Re-analyze historical contexts';
            engine = 'HistoricalBalancer';
            description += ' - Re-balance analysis across time periods';
        } else if (signal.action_hint.includes('Pattern learning')) {
            title = 'Stimulate new pattern learning';
            engine = 'PatternStimulator';
            description += ' - Introduce new learning sources';
        } else if (signal.action_hint.includes('deduplication')) {
            title = 'Improve deduplication';
            engine = 'Deduplicator';
            description += ' - Remove duplicate forecasts/ADRs';
        } else {
            // Generic task
            title = `Address ${signal.type}: ${signal.metric}`;
            engine = 'GenericSolver';
        }

        return {
            id: `auto-${timestamp}-${index}`,
            title,
            description,
            engine,
            status: 'pending',
            priority,
            success_criteria: this.generateSuccessCriteria(signal, state),
            derived_from: [signal.source],
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create follow-up task for high-impact signals
     */
    private createFollowUpTask(signal: CognitiveSignal, state: GlobalState, index: number): AutoTask | null {
        if (signal.type === 'regression') {
            return {
                id: `auto-${Date.now()}-${index}`,
                title: 'Review pattern evaluation logic',
                description: 'Deep dive into why pattern confidence is decreasing',
                engine: 'PatternEvaluator',
                status: 'pending',
                priority: 'medium',
                success_criteria: { confidence_trend: { gte: -0.02 } },
                derived_from: [signal.source],
                created_at: new Date().toISOString()
            };
        }
        return null;
    }

    /**
     * Generate success criteria based on signal and state
     */
    private generateSuccessCriteria(signal: CognitiveSignal, state: GlobalState): any {
        if (signal.metric === 'diversity_score') {
            return { diversity_score: { gte: 0.6 } };
        }
        if (signal.metric === 'bias_type') {
            return { bias_count: { lte: state.biases.count * 0.5 } };
        }
        if (signal.metric === 'confidence_trend') {
            return { confidence_trend: { gte: -0.02 } };
        }
        return {};
    }

    /**
     * Calculate pattern diversity score
     */
    private calculateDiversityScore(patterns: DecisionPattern[]): number {
        if (patterns.length === 0) return 0;
        if (patterns.length === 1) return 0.2;

        // Calculate entropy-based diversity
        const categories = new Map<string, number>();
        for (const pattern of patterns) {
            const cat = pattern.impact || 'Other';
            categories.set(cat, (categories.get(cat) || 0) + 1);
        }

        let entropy = 0;
        for (const count of categories.values()) {
            const p = count / patterns.length;
            entropy -= p * Math.log2(p);
        }

        // Normalize to [0, 1]
        const maxEntropy = Math.log2(categories.size || 1);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
    }

    /**
     * Count ADRs
     */
    private countADRs(adrsDir: string): { total: number; pending: number; duplicated: number } {
        try {
            if (!fs.existsSync(adrsDir)) {
                return { total: 0, pending: 0, duplicated: 0 };
            }

            const indexPath = path.join(adrsDir, 'index.json');
            if (!fs.existsSync(indexPath)) {
                return { total: 0, pending: 0, duplicated: 0 };
            }

            const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            const adrs = index.adrs || [];

            return {
                total: adrs.length,
                pending: adrs.filter((a: any) => a.status === 'pending').length,
                duplicated: 0 // Would need to analyze for duplicates
            };
        } catch {
            return { total: 0, pending: 0, duplicated: 0 };
        }
    }

    /**
     * Load JSON file
     */
    private async loadJSON(filePath: string): Promise<any> {
        try {
            if (!fs.existsSync(filePath)) return null;
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch {
            return null;
        }
    }

    /**
     * Save outputs
     */
    private async saveOutputs(tasks: AutoTask[], signals: CognitiveSignal[], state: GlobalState): Promise<void> {
        // Save JSON
        const data = {
            generated_at: new Date().toISOString(),
            global_state: {
                patterns: state.patterns.count,
                diversity_score: state.diversity_score.toFixed(3),
                avg_confidence: state.history.avg_confidence.toFixed(3)
            },
            signals_detected: signals.length,
            tasks: tasks,
            total_tasks: tasks.length
        };

        fs.writeFileSync(this.tasksPath, JSON.stringify(data, null, 2), 'utf-8');

        // Save Markdown
        await this.saveMarkdownReport(tasks, signals, state);
    }

    /**
     * Generate Markdown report
     */
    private async saveMarkdownReport(tasks: AutoTask[], signals: CognitiveSignal[], state: GlobalState): Promise<void> {
        let md = `# 🧠 Reasoning Tasks (Auto-Generated)\n\n`;
        md += `**Generated:** ${new Date().toISOString()}\n\n`;

        // Global State Summary
        md += `## 📊 Global State Analysis\n\n`;
        md += `- **Patterns:** ${state.patterns.count} (avg confidence: ${state.patterns.avg_confidence.toFixed(2)})\n`;
        md += `- **Diversity Score:** ${state.diversity_score.toFixed(2)}\n`;
        md += `- **Correlations:** ${state.correlations.count}\n`;
        md += `- **Forecasts:** ${state.forecasts.count}\n`;
        md += `- **Biases Detected:** ${state.biases.count}\n`;
        md += `- **Active Goals:** ${state.goals.active}\n\n`;

        // Cognitive Signals
        md += `## 🔍 Cognitive Signals (${signals.length})\n\n`;
        for (const signal of signals) {
            const emoji = signal.type === 'opportunity' ? '💡' : signal.type === 'anomaly' ? '⚠️' : signal.type === 'regression' ? '📉' : '⏸️';
            md += `- ${emoji} **${signal.type.toUpperCase()}**: ${signal.description}\n`;
            md += `  - Confidence: ${(signal.confidence * 100).toFixed(0)}%\n`;
        }
        md += `\n`;

        // Tasks
        md += `## 🎯 Auto-Generated Tasks (${tasks.length})\n\n`;
        for (const task of tasks) {
            const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
            const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
            md += `- ${checkbox} ${priorityEmoji} **${task.title}**\n`;
            md += `  - *Engine:* ${task.engine}\n`;
            md += `  - *Source:* ${task.derived_from.join(', ')}\n`;
            md += `  - *Description:* ${task.description}\n\n`;
        }

        fs.writeFileSync(this.tasksMarkdownPath, md, 'utf-8');
    }
}
