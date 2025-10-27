/**
 * Goal Synthesizer - Level 8: Reflexive Layer
 * 
 * Generates internal intentions from system state (biases, patterns, confidence)
 * Replaces dependency on external task management (TASKS.md)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Goal {
    id: string;
    objective: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    expected_duration: string;
    rationale: string[];
    related_patterns?: string[];
    related_biases?: string[];
    created_at: string;
}

export interface GoalsManifest {
    generated_at: string;
    active_goals: Goal[];
    completed_goals: Goal[];
    total_goals: number;
}

export class GoalSynthesizer {
    private workspaceRoot: string;
    private goalsPath: string;
    private biasesPath: string;
    private patternsPath: string;
    private forecastsPath: string;
    private correlationsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
        this.biasesPath = path.join(workspaceRoot, '.reasoning', 'alerts.json');
        this.patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
        this.forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
        this.correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
    }

    /**
     * Generate goals based on current system state
     */
    public async synthesizeGoals(): Promise<Goal[]> {
        console.log('🎯 GoalSynthesizer: Analyzing system state...');

        const goals: Goal[] = [];

        // Load current state
        const biases = this.loadBiases();
        const patterns = this.loadPatterns();
        const correlations = this.loadCorrelations();
        const forecasts = this.loadForecasts();

        // Goal 1: Reduce correlation duplication
        const duplicateCorrelations = this.detectDuplicateCorrelations(correlations);
        if (duplicateCorrelations > 5) {
            goals.push(this.createCorrelationGoal(duplicateCorrelations));
        }

        // Goal 2: Reduce theme bias
        const themeBias = biases.find(b => b.type === 'thematic_bias');
        if (themeBias && themeBias.confidence > 0.75) {
            goals.push(this.createThemeGoal(themeBias.confidence));
        }

        // Goal 3: Build visual dashboard
        const perceptualGap = this.detectPerceptualGap(biases, correlations);
        if (perceptualGap) {
            goals.push(this.createPerceptualGoal());
        }

        // Goal 4: Improve pattern diversity
        const lowDiversity = this.detectPatternDiversity(patterns);
        if (lowDiversity) {
            goals.push(this.createDiversityGoal());
        }

        // Sort by priority (critical > high > medium > low)
        goals.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Save goals
        await this.saveGoals(goals);

        console.log(`✅ GoalSynthesizer: Generated ${goals.length} goals`);
        goals.forEach(goal => {
            console.log(`  • ${goal.priority.toUpperCase()}: ${goal.objective} (${goal.confidence.toFixed(2)} confidence)`);
        });

        return goals;
    }

    /**
     * Create goal for correlation duplication
     */
    private createCorrelationGoal(duplicateCount: number): Goal {
        return {
            id: `goal-${Date.now()}-corr`,
            objective: 'Reduce correlation duplication',
            priority: duplicateCount > 15 ? 'high' : 'medium',
            confidence: Math.min(0.9, 0.6 + (duplicateCount / 100)),
            expected_duration: '2h',
            rationale: [
                `${duplicateCount} duplicate correlations detected`,
                'Multiple correlations pointing to same pattern',
                'Affects forecast accuracy and system confidence'
            ],
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create goal for theme bias reduction
     */
    private createThemeGoal(confidence: number): Goal {
        return {
            id: `goal-${Date.now()}-theme`,
            objective: 'Reduce thematic bias',
            priority: 'medium',
            confidence: confidence,
            expected_duration: '3h',
            rationale: [
                `High thematic bias detected (${Math.round(confidence * 100)}% confidence)`,
                'Reasoning focused on single category',
                'Limits decision diversity and system robustness'
            ],
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create goal for perceptual layer
     */
    private createPerceptualGoal(): Goal {
        return {
            id: `goal-${Date.now()}-percept`,
            objective: 'Build visual dashboard (Perceptual Layer)',
            priority: 'low',
            confidence: 0.87,
            expected_duration: '2-3 weeks',
            rationale: [
                'Visualization gap detected',
                '87% correlation with bias recurrence',
                'Timeline and pattern graphs would improve reasoning transparency'
            ],
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create goal for pattern diversity
     */
    private createDiversityGoal(): Goal {
        return {
            id: `goal-${Date.now()}-diversity`,
            objective: 'Improve pattern diversity',
            priority: 'medium',
            confidence: 0.72,
            expected_duration: '4h',
            rationale: [
                'Pattern diversity decreased',
                'Same patterns generating multiple forecasts',
                'Need to stimulate new pattern learning'
            ],
            created_at: new Date().toISOString()
        };
    }

    /**
     * Detect duplicate correlations
     */
    private detectDuplicateCorrelations(correlations: any[]): number {
        const seen = new Map<string, number>();
        let duplicates = 0;

        for (const corr of correlations) {
            const key = `${corr.pattern_id}:${corr.correlation_score}`;
            if (seen.has(key)) {
                duplicates++;
            } else {
                seen.set(key, 1);
            }
        }

        return duplicates;
    }

    /**
     * Detect perceptual gap
     */
    private detectPerceptualGap(biases: any[], correlations: any[]): boolean {
        // If we have biases and correlations but no perceptual layer
        const hasBiasRecurrence = biases.length > 2;
        const hasManyCorrelations = correlations.length > 10;
        return hasBiasRecurrence && hasManyCorrelations;
    }

    /**
     * Detect low pattern diversity
     */
    private detectPatternDiversity(patterns: any[]): boolean {
        if (patterns.length < 3) return true;
        
        // Check if all forecasts come from same pattern
        const forecasts = this.loadForecasts();
        if (forecasts.length === 0) return false;
        
        const patternUsage = new Map<string, number>();
        for (const f of forecasts) {
            const patternId = f.related_patterns?.[0];
            if (patternId) {
                patternUsage.set(patternId, (patternUsage.get(patternId) || 0) + 1);
            }
        }

        // If >70% forecasts from single pattern, diversity is low
        const maxUsage = Math.max(...Array.from(patternUsage.values()));
        return maxUsage / forecasts.length > 0.7;
    }

    /**
     * Load biases
     */
    private loadBiases(): any[] {
        try {
            if (!fs.existsSync(this.biasesPath)) return [];
            return JSON.parse(fs.readFileSync(this.biasesPath, 'utf-8'));
        } catch {
            return [];
        }
    }

    /**
     * Load patterns
     */
    private loadPatterns(): any[] {
        try {
            if (!fs.existsSync(this.patternsPath)) return [];
            const data = JSON.parse(fs.readFileSync(this.patternsPath, 'utf-8'));
            return data.patterns || [];
        } catch {
            return [];
        }
    }

    /**
     * Load correlations
     */
    private loadCorrelations(): any[] {
        try {
            if (!fs.existsSync(this.correlationsPath)) return [];
            return JSON.parse(fs.readFileSync(this.correlationsPath, 'utf-8'));
        } catch {
            return [];
        }
    }

    /**
     * Load forecasts
     */
    private loadForecasts(): any[] {
        try {
            if (!fs.existsSync(this.forecastsPath)) return [];
            return JSON.parse(fs.readFileSync(this.forecastsPath, 'utf-8'));
        } catch {
            return [];
        }
    }

    /**
     * Save goals
     */
    private async saveGoals(goals: Goal[]): Promise<void> {
        const manifest: GoalsManifest = {
            generated_at: new Date().toISOString(),
            active_goals: goals,
            completed_goals: [],
            total_goals: goals.length
        };

        fs.writeFileSync(
            this.goalsPath,
            JSON.stringify(manifest, null, 2),
            'utf-8'
        );
    }
}
