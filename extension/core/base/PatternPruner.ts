/**
 * Pattern Pruner - Level 10.2
 * 
 * Removes redundant patterns based on cosine similarity
 * Target: remove patterns with similarity < 0.4
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionPattern } from './types';

export class PatternPruner {
    private workspaceRoot: string;
    private patternsPath: string;
    private similarityThreshold = 0.4; // Remove patterns with similarity > 0.4

    constructor(workspaceRoot: string, similarityThreshold: number = 0.4) {
        this.workspaceRoot = workspaceRoot;
        this.patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
        this.similarityThreshold = similarityThreshold;
    }

    /**
     * Prune redundant patterns
     */
    public async prunePatterns(): Promise<DecisionPattern[]> {
        console.log('✂️  PatternPruner: Starting pattern pruning...');

        const patterns = await this.loadPatterns();
        console.log(`📊 Loaded ${patterns.length} patterns`);

        if (patterns.length === 0) {
            console.log('⚠️  No patterns to prune');
            return [];
        }

        // Find redundant patterns
        const redundantIds = this.findRedundantPatterns(patterns);
        console.log(`🔍 Found ${redundantIds.size} redundant patterns to remove`);

        // Keep non-redundant patterns
        const pruned = patterns.filter(p => !redundantIds.has(p.id));
        console.log(`✂️  Pruned to ${pruned.length} patterns (removed ${patterns.length - pruned.length})`);

        return pruned;
    }

    /**
     * Find redundant patterns based on similarity
     */
    private findRedundantPatterns(patterns: DecisionPattern[]): Set<string> {
        const redundant = new Set<string>();

        for (let i = 0; i < patterns.length; i++) {
            const pattern1 = patterns[i];
            
            // Skip if already marked as redundant
            if (redundant.has(pattern1.id)) continue;

            for (let j = i + 1; j < patterns.length; j++) {
                const pattern2 = patterns[j];

                // Skip if already marked as redundant
                if (redundant.has(pattern2.id)) continue;

                // Calculate similarity
                const similarity = this.cosineSimilarity(pattern1, pattern2);

                if (similarity > this.similarityThreshold) {
                    // Keep the pattern with higher confidence, mark the other as redundant
                    const keepPattern = pattern1.confidence >= pattern2.confidence ? pattern1 : pattern2;
                    const removePattern = pattern1.confidence >= pattern2.confidence ? pattern2 : pattern1;

                    console.log(`🔍 Patterns similar (${similarity.toFixed(2)}): keeping "${keepPattern.pattern}", removing "${removePattern.pattern}"`);
                    
                    redundant.add(removePattern.id);
                }
            }
        }

        return redundant;
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
     * Save pruned patterns
     */
    public async savePrunedPatterns(patterns: DecisionPattern[]): Promise<void> {
        try {
            // Load original to preserve structure
            const original = await this.loadPatterns();
            const originalData = original.length > 0 ? fs.readFileSync(this.patternsPath, 'utf-8') : '{}';
            const originalParsed = JSON.parse(originalData);

            // Save in same format as original
            if (Array.isArray(originalParsed)) {
                fs.writeFileSync(this.patternsPath, JSON.stringify(patterns, null, 2), 'utf-8');
            } else if (originalParsed.patterns) {
                const output = { ...originalParsed, patterns };
                fs.writeFileSync(this.patternsPath, JSON.stringify(output, null, 2), 'utf-8');
            } else {
                fs.writeFileSync(this.patternsPath, JSON.stringify(patterns, null, 2), 'utf-8');
            }

            console.log(`💾 Saved ${patterns.length} pruned patterns to ${this.patternsPath}`);
        } catch (error) {
            console.error('Failed to save pruned patterns:', error);
        }
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
        const pruned = await this.prunePatterns();
        
        if (pruned.length > 0) {
            await this.savePrunedPatterns(pruned);
        }

        console.log(`✅ PatternPruner complete: ${pruned.length} patterns remaining`);
    }
}

/**
 * Standalone runner
 */
export async function runPatternPruner(workspacePath: string, similarityThreshold?: number): Promise<void> {
    const pruner = new PatternPruner(workspacePath, similarityThreshold);
    await pruner.run();
}

// If run directly
if (require.main === module) {
    runPatternPruner(process.cwd());
}
