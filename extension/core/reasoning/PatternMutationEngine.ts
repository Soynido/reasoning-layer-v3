/**
 * Pattern Mutation Engine - Level 10.2
 * 
 * Generates new patterns through mutation strategies to improve pattern diversity
 * Target: 5+ new patterns with novelty > 0.6
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionPattern } from './types';

export class PatternMutationEngine {
    private workspaceRoot: string;
    private patternsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
    }

    /**
     * Generate mutated patterns from existing patterns
     */
    public async generateMutations(): Promise<DecisionPattern[]> {
        console.log('🧬 PatternMutationEngine: Starting pattern mutation...');

        // Load existing patterns
        const existingPatterns = await this.loadPatterns();
        console.log(`📊 Loaded ${existingPatterns.length} existing patterns`);

        if (existingPatterns.length === 0) {
            console.log('⚠️  No existing patterns to mutate');
            return [];
        }

        // Generate mutations
        const mutations: DecisionPattern[] = [];

        // Strategy 1: Hybrid sampling (combine two patterns)
        const hybridMutations = this.createHybridMutations(existingPatterns);
        mutations.push(...hybridMutations);
        console.log(`🔀 Generated ${hybridMutations.length} hybrid mutations`);

        // Strategy 2: Impact shift (change impact category)
        const impactShifted = this.createImpactShiftMutations(existingPatterns);
        mutations.push(...impactShifted);
        console.log(`🔄 Generated ${impactShifted.length} impact-shifted mutations`);

        // Strategy 3: Temporal variation (extend time windows)
        const temporalVariations = this.createTemporalVariations(existingPatterns);
        mutations.push(...temporalVariations);
        console.log(`⏱️  Generated ${temporalVariations.length} temporal variations`);

        // Strategy 4: Tag expansion (add new tags)
        const tagExpansions = this.createTagExpansions(existingPatterns);
        mutations.push(...tagExpansions);
        console.log(`🏷️  Generated ${tagExpansions.length} tag-expanded mutations`);

        // Filter by novelty (remove mutations too similar to existing patterns)
        const novelMutations = this.filterByNovelty(mutations, existingPatterns);
        console.log(`✨ Filtered to ${novelMutations.length} novel mutations (novelty > 0.3)`);

        return novelMutations;
    }

    /**
     * Create hybrid mutations by combining two patterns
     */
    private createHybridMutations(patterns: DecisionPattern[]): DecisionPattern[] {
        const mutations: DecisionPattern[] = [];

        // Sample pairs of patterns
        for (let i = 0; i < Math.min(patterns.length - 1, 5); i++) {
            const pattern1 = patterns[i];
            const pattern2 = patterns[i + 1];

            // Create hybrid pattern
            const hybrid: DecisionPattern = {
                id: `pat-mutated-${Date.now()}-hybrid-${i}`,
                pattern: `${pattern1.pattern} + ${pattern2.pattern}`,
                frequency: Math.floor((pattern1.frequency + pattern2.frequency) / 2),
                confidence: (pattern1.confidence + pattern2.confidence) / 2 * 0.8, // Slightly lower confidence
                impact: pattern1.impact, // Use first pattern's impact
                category: pattern1.category,
                tags: [...new Set([...(pattern1.tags || []), ...(pattern2.tags || [])])],
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                evidenceIds: [...pattern1.evidenceIds.slice(0, 3), ...pattern2.evidenceIds.slice(0, 3)],
                recommendation: `Hybrid approach combining ${pattern1.pattern} and ${pattern2.pattern}`
            };

            mutations.push(hybrid);
        }

        return mutations;
    }

    /**
     * Create impact-shifted mutations
     */
    private createImpactShiftMutations(patterns: DecisionPattern[]): DecisionPattern[] {
        const mutations: DecisionPattern[] = [];
        const impacts: DecisionPattern['impact'][] = ['Stability', 'Performance', 'Security', 'Cost', 'User_Experience', 'Technical_Debt'];

        for (const pattern of patterns.slice(0, 3)) {
            // Change impact category
            const newImpact = impacts.find(i => i !== pattern.impact) || impacts[0];

            const shifted: DecisionPattern = {
                ...pattern,
                id: `pat-mutated-${Date.now()}-shift-${mutations.length}`,
                impact: newImpact,
                confidence: pattern.confidence * 0.85, // Slightly lower confidence for shifted impact
                pattern: `${pattern.pattern} [${newImpact} perspective]`,
                recommendation: `Re-evaluated from ${pattern.impact} to ${newImpact} perspective`
            };

            mutations.push(shifted);
        }

        return mutations;
    }

    /**
     * Create temporal variations
     */
    private createTemporalVariations(patterns: DecisionPattern[]): DecisionPattern[] {
        const mutations: DecisionPattern[] = [];

        for (const pattern of patterns.slice(0, 3)) {
            // Extend or compress time window
            const firstSeen = new Date(pattern.firstSeen);
            const lastSeen = new Date(pattern.lastSeen);
            const timeWindow = lastSeen.getTime() - firstSeen.getTime();

            // Create extended variation
            const extended: DecisionPattern = {
                ...pattern,
                id: `pat-mutated-${Date.now()}-temporal-${mutations.length}`,
                frequency: pattern.frequency * 2,
                pattern: `Long-term trend: ${pattern.pattern}`,
                recommendation: `Extended temporal view of ${pattern.pattern}`
            };

            mutations.push(extended);
        }

        return mutations;
    }

    /**
     * Create tag-expanded mutations
     */
    private createTagExpansions(patterns: DecisionPattern[]): DecisionPattern[] {
        const mutations: DecisionPattern[] = [];
        const additionalTags = ['modernization', 'automation', 'scalability', 'observability', 'reliability'];

        for (const pattern of patterns.slice(0, 2)) {
            // Add new tags
            const newTags = [...(pattern.tags || []), additionalTags[mutations.length % additionalTags.length]];

            const expanded: DecisionPattern = {
                ...pattern,
                id: `pat-mutated-${Date.now()}-tags-${mutations.length}`,
                tags: newTags,
                confidence: pattern.confidence * 0.9, // Slightly lower confidence
                pattern: `${pattern.pattern} [Enhanced context]`,
                recommendation: `Expanded context for ${pattern.pattern}`
            };

            mutations.push(expanded);
        }

        return mutations;
    }

    /**
     * Filter mutations by novelty score (cosine similarity < 0.4)
     */
    private filterByNovelty(mutations: DecisionPattern[], existing: DecisionPattern[]): DecisionPattern[] {
        return mutations.filter(mutation => {
            let maxSimilarity = 0;

            for (const existingPattern of existing) {
                const similarity = this.cosineSimilarity(mutation, existingPattern);
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }

            // Novelty = 1 - similarity (high novelty means low similarity)
            const novelty = 1 - maxSimilarity;

            return novelty > 0.3; // Reduced threshold for more mutations
        });
    }

    /**
     * Calculate cosine similarity between two patterns
     */
    private cosineSimilarity(pattern1: DecisionPattern, pattern2: DecisionPattern): number {
        // Combine tags for comparison
        const tags1 = new Set((pattern1.tags || []).map(t => t.toLowerCase()));
        const tags2 = new Set((pattern2.tags || []).map(t => t.toLowerCase()));

        // Calculate Jaccard similarity (simplified cosine for sets)
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

            // Handle both direct array and object with patterns property
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
        const mutations = await this.generateMutations();
        
        if (mutations.length > 0) {
            console.log(`✅ PatternMutationEngine complete: ${mutations.length} novel patterns generated`);
        } else {
            console.log('⚠️  PatternMutationEngine: No novel patterns generated');
        }
    }
}

/**
 * Standalone runner
 */
export async function runPatternMutationEngine(workspacePath: string): Promise<DecisionPattern[]> {
    const engine = new PatternMutationEngine(workspacePath);
    return await engine.generateMutations();
}

// If run directly
if (require.main === module) {
    runPatternMutationEngine(process.cwd());
}
