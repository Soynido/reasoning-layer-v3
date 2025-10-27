/**
 * Reflection Manager - Level 8.5: Reflexive Layer
 * 
 * Transforms internal intentions (goals) into executable actions
 * Decides: immediate execution, deferred, or skip
 */

import * as fs from 'fs';
import * as path from 'path';
import { Goal } from './GoalSynthesizer';

export class ReflectionManager {
    private workspaceRoot: string;
    private goalsPath: string;
    private pendingActionsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
        this.pendingActionsPath = path.join(workspaceRoot, '.reasoning', 'pending_actions.json');
    }

    /**
     * Execute goals with decision tree
     */
    public async executeGoals(): Promise<void> {
        console.log('🪞 ReflectionManager: Executing internal goals...\n');

        const goals = this.loadGoals();
        if (!goals || goals.active_goals.length === 0) {
            console.log('No active goals to execute.');
            return;
        }

        const results = {
            executed: 0,
            deferred: 0,
            skipped: 0
        };

        for (const goal of goals.active_goals) {
            const decision = this.makeDecision(goal);

            console.log(`🎯 [${goal.priority.toUpperCase()}] ${goal.objective} (${Math.round(goal.confidence * 100)}%) → ${decision}`);

            switch (decision) {
                case 'execute':
                    await this.runImmediateAction(goal);
                    results.executed++;
                    break;
                case 'defer':
                    await this.scheduleAction(goal);
                    results.deferred++;
                    break;
                case 'skip':
                    console.log(`⏸ Skipped: ${goal.objective}`);
                    results.skipped++;
                    break;
            }
        }

        console.log(`\n✅ ReflectionManager complete. Executed: ${results.executed}, Deferred: ${results.deferred}, Skipped: ${results.skipped}`);
    }

    /**
     * Decision tree: execute, defer, or skip
     */
    private makeDecision(goal: Goal): 'execute' | 'defer' | 'skip' {
        // High priority + high confidence → Execute
        if (goal.priority === 'high' && goal.confidence > 0.8) {
            return 'execute';
        }

        // Critical priority → Execute
        if (goal.priority === 'critical') {
            return 'execute';
        }

        // Medium priority → Defer
        if (goal.priority === 'medium') {
            return 'defer';
        }

        // Low priority → Skip (log only)
        return 'skip';
    }

    /**
     * Run immediate action based on goal objective
     */
    private async runImmediateAction(goal: Goal): Promise<void> {
        console.log(`🚀 Executing: ${goal.objective}`);

        switch (goal.objective) {
            case 'Reduce correlation duplication':
                await this.executeCorrelationDedup();
                break;

            case 'Reduce thematic bias':
                await this.executeBiasRebalancing();
                break;

            case 'Improve pattern diversity':
                await this.executePatternStimulation();
                break;

            case 'Build visual dashboard (Perceptual Layer)':
                await this.deferPerceptualLayer();
                break;

            default:
                console.log(`⚠️ No direct action mapped for: ${goal.objective}`);
        }
    }

    /**
     * Execute correlation deduplication
     */
    private async executeCorrelationDedup(): Promise<void> {
        try {
            const { CorrelationEngine } = await import('./CorrelationEngine');
            const engine = new CorrelationEngine(this.workspaceRoot);
            
            // Re-analyze correlations (this will deduplicate)
            await engine.analyze();
            
            console.log('✅ Correlation deduplication applied.');
        } catch (error) {
            console.error('❌ Error in correlation dedup:', error);
        }
    }

    /**
     * Execute bias rebalancing
     */
    private async executeBiasRebalancing(): Promise<void> {
        try {
            const { BiasMonitor } = await import('./BiasMonitor');
            const monitor = new BiasMonitor(this.workspaceRoot);
            
            // Re-analyze biases
            await monitor.analyze();
            
            console.log('✅ Bias rebalancing triggered.');
        } catch (error) {
            console.error('❌ Error in bias rebalancing:', error);
        }
    }

    /**
     * Execute pattern stimulation
     */
    private async executePatternStimulation(): Promise<void> {
        try {
            const { PatternLearningEngine } = await import('./PatternLearningEngine');
            const engine = new PatternLearningEngine(this.workspaceRoot);
            
            // Re-learn patterns with wider time window
            await engine.analyzePatterns();
            
            console.log('✅ Pattern diversity stimulation triggered.');
        } catch (error) {
            console.error('❌ Error in pattern stimulation:', error);
        }
    }

    /**
     * Defer perceptual layer (requires human input)
     */
    private async deferPerceptualLayer(): Promise<void> {
        console.log('📆 Perceptual Layer requires implementation, deferring...');
        await this.scheduleAction({
            id: 'goal-perceptual-deferred',
            objective: 'Build visual dashboard (Perceptual Layer)',
            priority: 'low',
            confidence: 0.87,
            expected_duration: '2-3 weeks',
            rationale: ['Requires WebView implementation'],
            created_at: new Date().toISOString()
        });
    }

    /**
     * Schedule action for later execution
     */
    private async scheduleAction(goal: Goal): Promise<void> {
        console.log(`📆 Scheduling deferred goal: ${goal.objective}`);

        let queue: any[] = [];
        if (fs.existsSync(this.pendingActionsPath)) {
            const data = fs.readFileSync(this.pendingActionsPath, 'utf-8');
            try {
                queue = JSON.parse(data);
            } catch {
                queue = [];
            }
        }

        queue.push({
            ...goal,
            scheduled_at: new Date().toISOString(),
            status: 'pending'
        });

        fs.writeFileSync(
            this.pendingActionsPath,
            JSON.stringify(queue, null, 2),
            'utf-8'
        );
    }

    /**
     * Load goals
     */
    private loadGoals(): any {
        try {
            if (!fs.existsSync(this.goalsPath)) return { active_goals: [] };
            return JSON.parse(fs.readFileSync(this.goalsPath, 'utf-8'));
        } catch {
            return { active_goals: [] };
        }
    }
}
