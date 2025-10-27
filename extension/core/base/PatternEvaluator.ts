/**
 * Pattern Evaluator - Level 10.2
 * 
 * Evaluates pattern novelty and quality metrics
 * Target: novelty > 0.6, quality > 0.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionPattern } from './types';

export class PatternEvaluator {
    private workspaceRoot: string;
    private patternsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
    }

    /**
     * Evaluate patterns and return quality scores
     */
    public async evaluatePatterns(): Promise<Map<string, { novelty: number; quality: number; score: number }>> {
        console.log('🔍 PatternEvaluator: Starting pattern evaluation...');

        const patterns = await this.loadPatterns();
        console.log(`📊 Loaded ${patterns.length} patterns for evaluation`);

        const scores = new Map<string, { novelty: number; quality: number; score: number }>();

        for (const pattern of patterns) {
            const novelty = this.calculateNovelty(pattern, patterns);
            const quality = this.calculateQuality(pattern);
            const score = (novelty * 0.6) + (quality * 0.4); // Weighted score

            scores.set(pattern.id, { novelty, quality, score });

            console.log(`📈 Pattern ${pattern.id}: novelty=${novelty.toFixed(2)}, quality=${quality.toFixed(2)}, score=${score.toFixed(2)}`);
        }

        console.log(`✅ Pattern evaluation complete: ${scores.size} patterns evaluated`);
        return scores;
    }

    /**
     * Calculate novelty score for a pattern
     */
    private calculateNovelty(pattern: DecisionPattern, allPatterns: DecisionPattern[]): number {
        let maxSimilarity = 0;

        for (const otherPattern of allPatterns) {
            if (otherPattern.id === pattern.id) continue; // Skip self

            const similarity = this.cosineSimilarity(pattern, otherPattern);
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }

        // Novelty = 1 - similarity (high novelty means low similarity)
        return 1 - maxSimilarity;
    }

    /**
     * Calculate quality score for a pattern
     */
    private calculateQuality(pattern: DecisionPattern): number {
        // Quality factors:
        // 1. Confidence (0-1)
        // 2. Frequency (normalized)
        // 3. Evidence count (normalized)
        // 4. Tags count (normalized)

        const confidenceScore = pattern.confidence || 0;
        const frequencyScore = Math.min(pattern.frequency / 10, 1); // Max at 10
        const evidenceScore = Math.min((pattern.evidenceIds?.length || 0) / 5, 1); // Max at 5
        const tagsScore = Math.min((pattern.tags?.length || 0) / 10, 1); // Max at 10

        // Weighted average
        const quality = (confidenceScore * 0.4) + (frequencyScore * 0.2) + (evidenceScore * 0.2) + (tagsScore * 0.2);

        return quality;
    }

    /**
     * Calculate cosine similarity between two patterns
     */
    private cosineSimilarity(pattern1: DecisionPattern, pattern2: DecisionPattern): number {
        // Combine tags for comparison
        const tags1 = new Set((pattern1.tags || []).map(t => t.toLowerCase()));
        const tags2 = new Set((pattern2.tags || []).map(t => t.toLowerCase()));

        // Calculate Jaccard similarity
        const intersection = new Set([...tags1].filter(t => tags2.has(t)));
        const union = new Set([...tags1, ...tags2]);

        return union.size > 0 ? intersection.size / union.size : 0;
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
     * Main entry point
     */
    public async run(): Promise<void> {
        const scores = await this.evaluatePatterns();
        console.log(`✅ PatternEvaluator complete: ${scores.size} patterns evaluated`);
    }
}

/**
 * Standalone runner
 */
export async function runPatternEvaluator(workspacePath: string): Promise<void> {
    const evaluator = new PatternEvaluator(workspacePath);
    await evaluator.run();
}

// If run directly
if (require.main === module) {
    runPatternEvaluator(process.cwd());
}
