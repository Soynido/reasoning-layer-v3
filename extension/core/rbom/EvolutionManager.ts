/**
 * EvolutionManager - Manages ADR evolution and superseding relationships
 * 
 * Handles:
 * - Tracking which ADRs supersede others
 * - Auto-marking deprecated ADRs
 * - Visualizing decision evolution
 */

import { ADR } from './types';
import { RBOMEngine } from './RBOMEngine';

export interface EvolutionLink {
    from: string;         // ADR being superseded
    to: string;          // ADR that supersedes it
    reason?: string;     // Why this evolution occurred
    timestamp: string;   // When the relationship was established
}

export class EvolutionManager {
    private rbomEngine: RBOMEngine;
    private log?: (msg: string) => void;

    constructor(rbomEngine: RBOMEngine, logFn?: (msg: string) => void) {
        this.rbomEngine = rbomEngine;
        this.log = logFn;
    }

    /**
     * Check if an ADR should be marked as superseded
     * Called when creating/updating ADRs with supersedes field
     */
    public async checkAndMarkSuperseded(adrId: string): Promise<void> {
        try {
            const adr = this.rbomEngine.getADR(adrId);
            if (!adr) {
                this.log?.('❌ Cannot find ADR to check superseding');
                return;
            }

            // If this ADR supersedes others, mark them as superseded
            if (adr.supersedes && adr.supersedes.length > 0) {
                for (const supersededId of adr.supersedes) {
                    const supersededAdr = this.rbomEngine.getADR(supersededId);
                    if (supersededAdr && supersededAdr.status !== 'superseded') {
                        // Update the old ADR
                        const updated = {
                            ...supersededAdr,
                            status: 'superseded' as const,
                            modifiedAt: new Date().toISOString(),
                            supersededBy: adrId
                        };
                        
                        this.rbomEngine.updateADR(supersededId, updated);
                        this.log?.(`🔄 Marked ADR ${supersededId} as superseded by ${adrId}`);
                    }
                }
            }

            // If this ADR is superseded by another, check the reverse link
            if (adr.supersededBy) {
                const supersedingAdr = this.rbomEngine.getADR(adr.supersededBy);
                if (supersedingAdr && !supersedingAdr.supersedes?.includes(adrId)) {
                    // Add reverse link
                    const updated = {
                        ...supersedingAdr,
                        supersedes: [...(supersedingAdr.supersedes || []), adrId]
                    };
                    this.rbomEngine.updateADR(adr.supersededBy, updated);
                    this.log?.(`🔗 Added reverse link from ${adr.supersededBy} to ${adrId}`);
                }
            }

        } catch (error) {
            this.log?.(`❌ Error checking superseding: ${error}`);
        }
    }

    /**
     * Get evolution timeline for a specific ADR
     */
    public getEvolutionTimeline(adrId: string): EvolutionLink[] {
        const timeline: EvolutionLink[] = [];
        const adr = this.rbomEngine.getADR(adrId);
        
        if (!adr) return timeline;

        // Get all ADRs this one supersedes
        if (adr.supersedes && adr.supersedes.length > 0) {
            for (const supersededId of adr.supersedes) {
                timeline.push({
                    from: supersededId,
                    to: adrId,
                    timestamp: adr.modifiedAt
                });
            }
        }

        // Get what supersedes this ADR
        if (adr.supersededBy) {
            timeline.push({
                from: adrId,
                to: adr.supersededBy,
                timestamp: adr.modifiedAt
            });
        }

        return timeline;
    }

    /**
     * Find all deprecated ADRs
     */
    public getDeprecatedADRs(): ADR[] {
        const allADRs = this.rbomEngine.listADRs();
        return allADRs.filter(adr => adr.status === 'superseded');
    }

    /**
     * Suggest possible superseding relationships based on content similarity
     * This is a simple heuristic - can be improved with ML
     */
    public suggestSuperseding(): Array<{ adr1: string; adr2: string; similarity: number }> {
        const suggestions: Array<{ adr1: string; adr2: string; similarity: number }> = [];
        const allADRs = this.rbomEngine.listADRs();
        
        for (let i = 0; i < allADRs.length; i++) {
            for (let j = i + 1; j < allADRs.length; j++) {
                const adr1 = allADRs[i];
                const adr2 = allADRs[j];
                
                // Skip if already linked
                if (adr1.supersedes?.includes(adr2.id) || adr2.supersedes?.includes(adr1.id)) {
                    continue;
                }

                // Calculate similarity (simple keyword matching)
                const similarity = this.calculateSimilarity(adr1, adr2);
                
                if (similarity > 0.5) { // Threshold
                    suggestions.push({
                        adr1: adr1.id,
                        adr2: adr2.id,
                        similarity
                    });
                }
            }
        }

        return suggestions.sort((a, b) => b.similarity - a.similarity);
    }

    private calculateSimilarity(adr1: ADR, adr2: ADR): number {
        // Simple keyword-based similarity
        const text1 = `${adr1.title} ${adr1.context} ${adr1.decision}`.toLowerCase();
        const text2 = `${adr2.title} ${adr2.context} ${adr2.decision}`.toLowerCase();
        
        const words1 = text1.split(/\s+/);
        const words2 = text2.split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word) && word.length > 3);
        const allUniqueWords = [...new Set([...words1, ...words2])].filter(w => w.length > 3);
        
        return commonWords.length / allUniqueWords.length;
    }

    /**
     * Create a new ADR that supersedes another
     */
    public createSupersedingADR(
        supersedingADR: Partial<ADR>,
        supersededIds: string[]
    ): ADR | null {
        // Create the new ADR with supersedes field
        const newADR = this.rbomEngine.createADR({
            ...supersedingADR,
            supersedes: supersededIds,
            status: 'accepted' // New ADRs replacing old ones are typically accepted
        });

        if (newADR) {
            // Mark the old ADRs as superseded
            this.checkAndMarkSuperseded(newADR.id);
            this.log?.(`✅ Created new ADR ${newADR.id} that supersedes ${supersededIds.join(', ')}`);
        }

        return newADR;
    }
}

