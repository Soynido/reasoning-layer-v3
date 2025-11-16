/**
 * Correlation Deduplicator - Level 10.2
 * 
 * Dedicated module for correlation deduplication management
 * Provides advanced deduplication strategies and merge logic
 */

import * as fs from 'fs';
import * as path from 'path';
import { Correlation } from './types';

export class CorrelationDeduplicator {
    private workspaceRoot: string;
    private correlationsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
    }

    /**
     * Apply deduplication to correlations
     */
    public async applyDeduplication(): Promise<Correlation[]> {
        console.log('🔍 CorrelationDeduplicator: Starting deduplication...');

        // Load existing correlations
        const correlations = await this.loadCorrelations();
        console.log(`📊 Loaded ${correlations.length} correlations`);

        // Find duplicates
        const duplicates = this.findDuplicates(correlations);
        console.log(`🔍 Found ${duplicates.size} duplicate groups`);

        // Merge similar correlations
        const merged = this.mergeSimilarCorrelations(correlations);
        console.log(`🔗 Merged to ${merged.length} unique correlations`);

        // Save deduplicated correlations
        await this.saveCorrelations(merged);

        console.log(`✅ Deduplication complete: ${correlations.length} → ${merged.length} correlations`);
        return merged;
    }

    /**
     * Find duplicate correlations
     */
    public findDuplicates(correlations: Correlation[]): Map<string, Correlation[]> {
        const groups = new Map<string, Correlation[]>();

        for (const corr of correlations) {
            const key = this.getCorrelationKey(corr);
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            
            groups.get(key)!.push(corr);
        }

        // Filter to only groups with duplicates
        const duplicates = new Map<string, Correlation[]>();
        for (const [key, group] of groups) {
            if (group.length > 1) {
                duplicates.set(key, group);
            }
        }

        return duplicates;
    }

    /**
     * Merge similar correlations
     */
    public mergeSimilarCorrelations(correlations: Correlation[]): Correlation[] {
        const seen = new Map<string, Correlation>();

        for (const corr of correlations) {
            const key = this.getCorrelationKey(corr);

            if (!seen.has(key)) {
                // First occurrence, keep it
                seen.set(key, corr);
            } else {
                // Duplicate found, merge metadata
                const existing = seen.get(key)!;
                const merged = this.mergeCorrelationMetadata(existing, corr);
                seen.set(key, merged);
            }
        }

        return Array.from(seen.values());
    }

    /**
     * Get correlation key for deduplication
     */
    private getCorrelationKey(corr: Correlation): string {
        // Key based on pattern_id, event_id, and direction
        return `${corr.pattern_id}:${corr.event_id}:${corr.direction}`;
    }

    /**
     * Merge correlation metadata
     */
    private mergeCorrelationMetadata(existing: Correlation, duplicate: Correlation): Correlation {
        // Keep the correlation with higher score
        const best = existing.correlation_score >= duplicate.correlation_score ? existing : duplicate;

        // Merge tags
        const mergedTags = [...new Set([...existing.tags, ...duplicate.tags])];

        return {
            ...best,
            tags: mergedTags,
            // Keep the earliest timestamp
            timestamp: existing.timestamp < duplicate.timestamp ? existing.timestamp : duplicate.timestamp
        };
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
     * Save correlations to file
     */
    private async saveCorrelations(correlations: Correlation[]): Promise<void> {
        try {
            fs.writeFileSync(
                this.correlationsPath,
                JSON.stringify(correlations, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('Failed to save correlations:', error);
        }
    }

    /**
     * Main entry point
     */
    public async run(): Promise<void> {
        const deduplicated = await this.applyDeduplication();
        console.log(`✅ CorrelationDeduplicator complete: ${deduplicated.length} unique correlations`);
    }
}

/**
 * Standalone runner
 */
export async function runCorrelationDeduplicator(workspacePath: string): Promise<void> {
    const deduplicator = new CorrelationDeduplicator(workspacePath);
    await deduplicator.run();
}

// If run directly
if (require.main === module) {
    runCorrelationDeduplicator(process.cwd());
}
