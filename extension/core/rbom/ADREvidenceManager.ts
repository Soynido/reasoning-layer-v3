/**
 * ADREvidenceManager - Level 4: Evidence & Trace Visualization
 * 
 * Manages and visualizes evidence linked to ADRs:
 * - PRs linked (via GitHub API)
 * - Issues linked (via GitHub API)
 * - Commits cited
 * - Evidence quality scores
 */

import { ADR } from './types';
import { CaptureEvent } from '../types';

export interface EvidenceItem {
    id: string;
    type: 'pr' | 'issue' | 'commit' | 'dependency' | 'config' | 'test' | 'file_change' | 'git_branch';
    title: string;
    description?: string;
    source: string;
    timestamp: string;
    quality: number;              // 0-1
    metadata?: Record<string, any>;
}

export interface EvidenceReport {
    adrId: string;
    adrTitle: string;
    totalEvidence: number;
    highQualityEvidence: number;
    averageQuality: number;
    evidenceItems: EvidenceItem[];
    byType: Record<string, EvidenceItem[]>;
    qualityDistribution: {
        excellent: number;  // > 0.8
        good: number;       // 0.6-0.8
        fair: number;       // 0.4-0.6
        poor: number;       // < 0.4
    };
}

export class ADREvidenceManager {
    private evidenceCache: Map<string, CaptureEvent[]> = new Map();

    /**
     * Load evidence events for an ADR
     */
    public loadEvidenceForADR(adr: ADR, allEvents: CaptureEvent[]): EvidenceItem[] {
        const evidenceItems: EvidenceItem[] = [];
        
        for (const evidenceId of adr.evidenceIds) {
            const event = allEvents.find(e => e.id === evidenceId);
            if (!event) continue;

            const evidenceItem: EvidenceItem = {
                id: event.id,
                type: event.type as any,
                title: this.getEvidenceTitle(event),
                description: this.getEvidenceDescription(event),
                source: event.source,
                timestamp: event.timestamp,
                quality: this.estimateEvidenceQuality(event),
                metadata: event.metadata
            };

            evidenceItems.push(evidenceItem);
        }

        // Sort by quality (high to low)
        evidenceItems.sort((a, b) => b.quality - a.quality);

        return evidenceItems;
    }

    /**
     * Generate evidence report for an ADR
     */
    public generateEvidenceReport(adr: ADR, allEvents: CaptureEvent[]): EvidenceReport {
        const evidenceItems = this.loadEvidenceForADR(adr, allEvents);
        
        const highQualityEvidence = evidenceItems.filter(e => e.quality >= 0.6).length;
        const averageQuality = evidenceItems.length > 0
            ? evidenceItems.reduce((sum, e) => sum + e.quality, 0) / evidenceItems.length
            : 0;

        // Group by type
        const byType: Record<string, EvidenceItem[]> = {};
        for (const item of evidenceItems) {
            if (!byType[item.type]) {
                byType[item.type] = [];
            }
            byType[item.type].push(item);
        }

        // Quality distribution
        const qualityDistribution = {
            excellent: evidenceItems.filter(e => e.quality > 0.8).length,
            good: evidenceItems.filter(e => e.quality >= 0.6 && e.quality <= 0.8).length,
            fair: evidenceItems.filter(e => e.quality >= 0.4 && e.quality < 0.6).length,
            poor: evidenceItems.filter(e => e.quality < 0.4).length
        };

        return {
            adrId: adr.id,
            adrTitle: adr.title,
            totalEvidence: evidenceItems.length,
            highQualityEvidence,
            averageQuality,
            evidenceItems,
            byType,
            qualityDistribution
        };
    }

    /**
     * Format evidence report for display
     */
    public formatEvidenceReport(report: EvidenceReport): string {
        const lines: string[] = [];

        lines.push(`📊 Evidence Report: ${report.adrTitle}`);
        lines.push('');
        lines.push(`Total Evidence: ${report.totalEvidence}`);
        lines.push(`High-Quality Evidence (≥60%): ${report.highQualityEvidence}`);
        lines.push(`Average Quality: ${(report.averageQuality * 100).toFixed(0)}%`);
        lines.push('');

        // Quality distribution
        lines.push('Quality Distribution:');
        lines.push(`  ⭐ Excellent (>80%): ${report.qualityDistribution.excellent}`);
        lines.push(`  ✅ Good (60-80%): ${report.qualityDistribution.good}`);
        lines.push(`  ⚠️  Fair (40-60%): ${report.qualityDistribution.fair}`);
        lines.push(`  ❌ Poor (<40%): ${report.qualityDistribution.poor}`);
        lines.push('');

        // By type
        const types = Object.keys(report.byType);
        if (types.length > 0) {
            lines.push('By Type:');
            for (const type of types) {
                const count = report.byType[type].length;
                lines.push(`  • ${type.toUpperCase()}: ${count}`);
            }
            lines.push('');
        }

        // Top evidence items
        if (report.evidenceItems.length > 0) {
            lines.push('Top Evidence:');
            const top5 = report.evidenceItems.slice(0, 5);
            for (const item of top5) {
                const qualityLabel = this.getQualityLabel(item.quality);
                lines.push(`  ${qualityLabel} ${item.title} (${item.type})`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Get quality label
     */
    private getQualityLabel(quality: number): string {
        if (quality > 0.8) return '⭐';
        if (quality >= 0.6) return '✅';
        if (quality >= 0.4) return '⚠️';
        return '❌';
    }

    /**
     * Get evidence title
     */
    private getEvidenceTitle(event: CaptureEvent): string {
        if (event.type === 'pr_linked') {
            return `PR #${event.metadata.pr_number || '?'}`;
        }
        if (event.type === 'issue_linked') {
            return `Issue #${event.metadata.issue_number || '?'}`;
        }
        if (event.type === 'git_commit') {
            return `Commit ${event.source.substring(0, 7)}`;
        }
        if (event.type === 'dependencies') {
            return `Dependency: ${event.metadata.package || '?'}`;
        }
        if (event.type === 'file_change') {
            return `File: ${event.source.split('/').pop()}`;
        }
        
        return `${event.type}: ${event.source}`;
    }

    /**
     * Get evidence description
     */
    private getEvidenceDescription(event: CaptureEvent): string | undefined {
        if (event.type === 'pr_linked') {
            return event.metadata.pr_title || event.metadata.description;
        }
        if (event.type === 'issue_linked') {
            return event.metadata.issue_title || event.metadata.description;
        }
        if (event.type === 'git_commit') {
            return event.metadata.message;
        }
        if (event.type === 'dependencies') {
            const pkg = event.metadata.package;
            const version = event.metadata.version;
            return pkg && version ? `${pkg}@${version}` : undefined;
        }
        
        return event.metadata.description;
    }

    /**
     * Estimate evidence quality (simplified heuristic)
     */
    private estimateEvidenceQuality(event: CaptureEvent): number {
        let score = 0.5; // Base score

        // Boost for PR/Issue linking
        if (event.type === 'pr_linked' || event.type === 'issue_linked') {
            score += 0.3;
        }

        // Boost for commits
        if (event.type === 'git_commit') {
            score += 0.2;
        }

        // Boost for dependencies
        if (event.type === 'dependencies') {
            score += 0.1;
        }

        // Boost for recent events (freshness)
        const age = Date.now() - parseInt(event.timestamp);
        const daysOld = age / (1000 * 60 * 60 * 24);
        if (daysOld < 7) {
            score += 0.2;
        } else if (daysOld < 30) {
            score += 0.1;
        }

        // Boost for rich metadata
        if (Object.keys(event.metadata).length > 3) {
            score += 0.1;
        }

        return Math.min(1, Math.max(0, score));
    }
}

