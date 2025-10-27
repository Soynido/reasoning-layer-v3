/**
 * Historical Balancer - Level 10.2
 * 
 * Re-samples historical data to balance themes and reduce thematic bias
 * Target: balanced distribution across impact categories
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionPattern, Correlation } from './types';

export class HistoricalBalancer {
    private workspaceRoot: string;
    private patternsPath: string;
    private correlationsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
        this.correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
    }

    /**
     * Balance historical data for theme diversity
     */
    public async balanceHistoricalData(): Promise<void> {
        console.log('⚖️  HistoricalBalancer: Starting historical data balancing...');

        // Load data
        const patterns = await this.loadPatterns();
        const correlations = await this.loadCorrelations();

        console.log(`📊 Loaded ${patterns.length} patterns, ${correlations.length} correlations`);

        // Analyze distribution
        const distribution = this.analyzeDistribution(patterns, correlations);
        console.log('📈 Current distribution:');
        for (const [impact, count] of distribution.entries()) {
            console.log(`  - ${impact}: ${count} patterns`);
        }

        // Check if balance is needed
        const needsBalance = this.needsBalancing(distribution);
        
        if (!needsBalance) {
            console.log('✅ Historical data is well-balanced');
            return;
        }

        // Suggest balance adjustments
        const suggestions = this.generateBalanceSuggestions(distribution);
        console.log('💡 Balance suggestions:');
        for (const suggestion of suggestions) {
            console.log(`  - ${suggestion}`);
        }

        console.log('✅ HistoricalBalancer complete');
    }

    /**
     * Analyze distribution of patterns by impact
     */
    private analyzeDistribution(patterns: DecisionPattern[], correlations: Correlation[]): Map<string, number> {
        const distribution = new Map<string, number>();

        for (const pattern of patterns) {
            const impact = pattern.impact || 'Other';
            distribution.set(impact, (distribution.get(impact) || 0) + 1);
        }

        return distribution;
    }

    /**
     * Check if balancing is needed
     */
    private needsBalancing(distribution: Map<string, number>): boolean {
        if (distribution.size === 0) return false;

        const counts = Array.from(distribution.values());
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

        // Imbalance if max is more than 2x the average
        return max > avg * 2;
    }

    /**
     * Generate balance suggestions
     */
    private generateBalanceSuggestions(distribution: Map<string, number>): string[] {
        const suggestions: string[] = [];
        const counts = Array.from(distribution.values());
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

        for (const [impact, count] of distribution.entries()) {
            if (count > avg * 1.5) {
                suggestions.push(`Reduce focus on ${impact} (${count} patterns, should be ~${Math.round(avg)})`);
            } else if (count < avg * 0.5) {
                suggestions.push(`Increase focus on ${impact} (${count} patterns, should be ~${Math.round(avg)})`);
            }
        }

        return suggestions;
    }

    /**
     * Load patterns from file
     */
    private async loadPatterns(): Promise<DecisionPattern[]> {
        try {
            if (!fs.existsSync(this.patternsPath)) {
                return [];
            }

            const data = fs.readFileSync(this.patternsPath, 'utf-8');
            const parsed = JSON.parse(data);

            if (Array.isArray(parsed)) {
                return parsed;
            } else if (parsed.patterns && Array.isArray(parsed.patterns)) {
                return parsed.patterns;
            }

            return [];
        } catch (error) {
            console.error('Failed to load patterns:', error);
            return [];
        }
    }

    /**
     * Load correlations from file
     */
    private async loadCorrelations(): Promise<Correlation[]> {
        try {
            if (!fs.existsSync(this.correlationsPath)) {
                return [];
            }

            const data = fs.readFileSync(this.correlationsPath, 'utf-8');
            const correlations = JSON.parse(data);

            return Array.isArray(correlations) ? correlations : [];
        } catch (error) {
            console.error('Failed to load correlations:', error);
            return [];
        }
    }

    /**
     * Main entry point
     */
    public async run(): Promise<void> {
        await this.balanceHistoricalData();
    }
}

/**
 * Standalone runner
 */
export async function runHistoricalBalancer(workspacePath: string): Promise<void> {
    const balancer = new HistoricalBalancer(workspacePath);
    await balancer.run();
}

// If run directly
if (require.main === module) {
    runHistoricalBalancer(process.cwd());
}
