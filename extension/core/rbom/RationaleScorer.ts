/**
 * RationaleScorer - Calculate ADR Decision Quality Score
 * 
 * Evaluates the depth and quality of ADR reasoning based on:
 * - Evidence completeness
 * - Trade-offs documented
 * - Rejected options discussed
 * - Assumptions stated
 * - Risks identified
 * - Mitigations planned
 */

import { ADR } from './types';

export interface RationaleScore {
    overall: number;              // 0-1 overall quality score
    evidence: number;             // Evidence quality (0-1)
    tradeoffs: number;            // Trade-offs documented (0-1)
    alternatives: number;         // Rejected options discussed (0-1)
    assumptions: number;          // Assumptions stated (0-1)
    risks: number;                // Risks identified (0-1)
    mitigations: number;          // Mitigations planned (0-1)
    completeness: number;         // Overall completeness (0-1)
}

export class RationaleScorer {
    /**
     * Calculate comprehensive rationale depth score for an ADR
     */
    public calculateScore(adr: ADR): RationaleScore {
        const scores = {
            evidence: this.scoreEvidence(adr),
            tradeoffs: this.scoreTradeoffs(adr),
            alternatives: this.scoreAlternatives(adr),
            assumptions: this.scoreAssumptions(adr),
            risks: this.scoreRisks(adr),
            mitigations: this.scoreMitigations(adr),
            completeness: this.scoreCompleteness(adr)
        };

        // Overall score is weighted average
        const overall = (
            scores.evidence * 0.25 +
            scores.tradeoffs * 0.20 +
            scores.alternatives * 0.15 +
            scores.assumptions * 0.10 +
            scores.risks * 0.15 +
            scores.mitigations * 0.10 +
            scores.completeness * 0.05
        );

        return {
            ...scores,
            overall
        };
    }

    /**
     * Score evidence quality (0-1)
     */
    private scoreEvidence(adr: ADR): number {
        if (!adr.evidenceIds || adr.evidenceIds.length === 0) {
            return 0;
        }
        
        // More evidence = better score (capped at 5)
        const count = Math.min(adr.evidenceIds.length, 5);
        return count / 5;
    }

    /**
     * Score trade-offs documentation (0-1)
     */
    private scoreTradeoffs(adr: ADR): number {
        if (!adr.tradeoffs) {
            return 0;
        }

        const hasPros = adr.tradeoffs.pros && adr.tradeoffs.pros.length > 0;
        const hasCons = adr.tradeoffs.cons && adr.tradeoffs.cons.length > 0;

        if (hasPros && hasCons) {
            return 1.0; // Both documented
        } else if (hasPros || hasCons) {
            return 0.5; // Only one documented
        }

        return 0;
    }

    /**
     * Score rejected alternatives (0-1)
     */
    private scoreAlternatives(adr: ADR): number {
        if (!adr.rejectedOptions || adr.rejectedOptions.length === 0) {
            return 0;
        }

        // Score based on number of alternatives discussed
        const count = adr.rejectedOptions.length;
        if (count >= 3) {
            return 1.0;
        } else if (count === 2) {
            return 0.75;
        } else {
            return 0.5;
        }
    }

    /**
     * Score assumptions documentation (0-1)
     */
    private scoreAssumptions(adr: ADR): number {
        if (!adr.assumptions || adr.assumptions.length === 0) {
            return 0;
        }

        // More assumptions documented = better
        const count = adr.assumptions.length;
        return Math.min(count / 3, 1.0);
    }

    /**
     * Score risks identification (0-1)
     */
    private scoreRisks(adr: ADR): number {
        if (!adr.risks || adr.risks.length === 0) {
            return 0;
        }

        // Score based on number of risks and their quality
        const count = adr.risks.length;
        let qualityBonus = 0;

        // Bonus if risks have impact/probability
        for (const risk of adr.risks) {
            if (risk.probability && risk.impact && risk.mitigation) {
                qualityBonus += 0.1;
            }
        }

        return Math.min((count / 2) + qualityBonus, 1.0);
    }

    /**
     * Score mitigations planned (0-1)
     */
    private scoreMitigations(adr: ADR): number {
        if (!adr.mitigations || adr.mitigations.length === 0) {
            return 0;
        }

        // More mitigations = better score
        const count = adr.mitigations.length;
        return Math.min(count / 3, 1.0);
    }

    /**
     * Score overall completeness (0-1)
     */
    private scoreCompleteness(adr: ADR): number {
        let score = 0;
        let maxScore = 7;

        // Context
        if (adr.context && adr.context.trim().length > 50) score++;
        
        // Decision
        if (adr.decision && adr.decision.trim().length > 50) score++;
        
        // Consequences
        if (adr.consequences && adr.consequences.trim().length > 50) score++;
        
        // Tags
        if (adr.tags && adr.tags.length > 0) score++;
        
        // Components
        if (adr.components && adr.components.length > 0) score++;
        
        // Status
        if (adr.status) score++;
        
        // Author
        if (adr.author && adr.author !== 'unknown') score++;

        return score / maxScore;
    }

    /**
     * Get quality label (Poor, Fair, Good, Excellent)
     */
    public getQualityLabel(score: number): string {
        if (score >= 0.8) return 'Excellent';
        if (score >= 0.6) return 'Good';
        if (score >= 0.4) return 'Fair';
        return 'Poor';
    }

    /**
     * Suggest improvements for an ADR
     */
    public suggestImprovements(adr: ADR): string[] {
        const suggestions: string[] = [];
        const score = this.calculateScore(adr);

        if (score.evidence < 0.5) {
            suggestions.push('Add more evidence (commits, PRs, issues)');
        }
        if (score.tradeoffs < 0.5) {
            suggestions.push('Document trade-offs (pros and cons)');
        }
        if (score.alternatives < 0.5) {
            suggestions.push('Discuss rejected alternatives');
        }
        if (score.assumptions < 0.5) {
            suggestions.push('List underlying assumptions');
        }
        if (score.risks < 0.5) {
            suggestions.push('Identify potential risks');
        }
        if (score.mitigations < 0.5) {
            suggestions.push('Define risk mitigation strategies');
        }
        if (score.completeness < 0.5) {
            suggestions.push('Expand context, decision, and consequences');
        }

        return suggestions;
    }
}

