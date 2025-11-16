/**
 * History Manager - Level 9: Self-Review Engine
 * 
 * Tracks execution cycles and maintains historical record for evolution analysis
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ExecutionCycle {
    cycle_id: string;
    timestamp: string;
    duration_ms: number;
    patterns_count: number;
    patterns: {
        id: string;
        confidence: number;
        frequency: number;
    }[];
    correlations_count: number;
    forecasts_count: number;
    adr_proposals_count: number;
    biases_count: number;
    biases: {
        type: string;
        confidence: number;
        impact: string;
    }[];
    goals_generated: number;
    goals_executed: number;
    goals_deferred: number;
    mean_pattern_confidence: number;
    mean_bias_confidence: number;
}

export interface CycleHistory {
    cycles: ExecutionCycle[];
    total_cycles: number;
    first_cycle: string | null;
    last_cycle: string | null;
}

export class HistoryManager {
    private workspaceRoot: string;
    private historyPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.historyPath = path.join(workspaceRoot, '.reasoning', 'history.json');
    }

    /**
     * Record a new execution cycle
     */
    public recordCycle(cycle: ExecutionCycle): void {
        const history = this.loadHistory();
        
        history.cycles.push(cycle);
        history.total_cycles = history.cycles.length;
        history.last_cycle = cycle.timestamp;
        
        if (history.first_cycle === null || history.cycles.length === 1) {
            history.first_cycle = cycle.timestamp;
        }

        this.saveHistory(history);
    }

    /**
     * Get all cycles
     */
    public getCycles(): ExecutionCycle[] {
        const history = this.loadHistory();
        return history.cycles;
    }

    /**
     * Get last N cycles
     */
    public getRecentCycles(n: number = 10): ExecutionCycle[] {
        const cycles = this.getCycles();
        return cycles.slice(-n);
    }

    /**
     * Get cycle statistics
     */
    public getStatistics(): {
        total_cycles: number;
        average_duration_ms: number;
        average_patterns: number;
        average_biases: number;
        average_confidence: number;
    } {
        const cycles = this.getCycles();
        
        if (cycles.length === 0) {
            return {
                total_cycles: 0,
                average_duration_ms: 0,
                average_patterns: 0,
                average_biases: 0,
                average_confidence: 0
            };
        }

        const durations = cycles.map(c => c.duration_ms);
        const patterns = cycles.map(c => c.patterns_count);
        const biases = cycles.map(c => c.biases_count);
        const confidence = cycles.map(c => c.mean_pattern_confidence);

        return {
            total_cycles: cycles.length,
            average_duration_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
            average_patterns: patterns.reduce((a, b) => a + b, 0) / patterns.length,
            average_biases: biases.reduce((a, b) => a + b, 0) / biases.length,
            average_confidence: confidence.reduce((a, b) => a + b, 0) / confidence.length
        };
    }

    /**
     * Calculate evolution metrics
     */
    public calculateEvolution(): {
        confidence_trend: number;
        bias_trend: number;
        efficiency_trend: number;
    } {
        const cycles = this.getCycles();
        
        if (cycles.length < 2) {
            return {
                confidence_trend: 0,
                bias_trend: 0,
                efficiency_trend: 0
            };
        }

        const recent = cycles.slice(-5); // Last 5 cycles
        const older = cycles.slice(0, Math.max(1, cycles.length - 5));

        const recentConf = recent.map(c => c.mean_pattern_confidence).reduce((a, b) => a + b, 0) / recent.length;
        const olderConf = older.map(c => c.mean_pattern_confidence).reduce((a, b) => a + b, 0) / older.length;

        const recentBias = recent.map(c => c.biases_count).reduce((a, b) => a + b, 0) / recent.length;
        const olderBias = older.map(c => c.biases_count).reduce((a, b) => a + b, 0) / older.length;

        const recentDuration = recent.map(c => c.duration_ms).reduce((a, b) => a + b, 0) / recent.length;
        const olderDuration = older.map(c => c.duration_ms).reduce((a, b) => a + b, 0) / older.length;

        return {
            confidence_trend: recentConf - olderConf,
            bias_trend: olderBias - recentBias, // Negative is good
            efficiency_trend: (olderDuration - recentDuration) / olderDuration // Negative is bad
        };
    }

    /**
     * Load history
     */
    private loadHistory(): CycleHistory {
        try {
            if (!fs.existsSync(this.historyPath)) {
                return {
                    cycles: [],
                    total_cycles: 0,
                    first_cycle: null,
                    last_cycle: null
                };
            }
            return JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
        } catch {
            return {
                cycles: [],
                total_cycles: 0,
                first_cycle: null,
                last_cycle: null
            };
        }
    }

    /**
     * Save history
     */
    private saveHistory(history: CycleHistory): void {
        fs.writeFileSync(
            this.historyPath,
            JSON.stringify(history, null, 2),
            'utf-8'
        );
    }
}
