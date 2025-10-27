/**
 * Bias Monitor - Level 7
 * 
 * Detects reasoning biases and cognitive errors in decision patterns
 * Monitors for repetition, contradiction, divergence, and thematic/temporal biases
 */

import * as fs from 'fs';
import * as path from 'path';

interface BiasAlert {
    id: string;
    type: 'pattern_repetition' | 'contradiction' | 'correlation_divergence' | 'temporal_focus' | 'thematic_bias';
    description: string;
    evidence: string[];
    confidence: number;
    impact: 'low' | 'medium' | 'high';
    suggestion: string;
    timestamp: string;
}

interface Pattern {
    id: string;
    pattern: string;
    frequency: number;
    confidence: number;
    impact: string;
    category: string;
}

interface Forecast {
    forecast_id: string;
    predicted_decision: string;
    decision_type: string;
    confidence: number;
    related_patterns: string[];
}

interface ADR {
    id: string;
    title: string;
    decision: string;
    tags: string[];
    createdAt: string;
    confidence?: number;
}

interface Correlation {
    id: string;
    pattern_id: string;
    correlation_score: number;
    timestamp: string;
}

export class BiasMonitor {
    private workspaceRoot: string;
    private patternsPath: string;
    private forecastsPath: string;
    private correlationsPath: string;
    private adrDir: string;
    private autoAdrDir: string;
    private alertsPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
        this.forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
        this.correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
        this.adrDir = path.join(workspaceRoot, '.reasoning', 'adrs');
        this.autoAdrDir = path.join(this.adrDir, 'auto');
        this.alertsPath = path.join(workspaceRoot, '.reasoning', 'alerts.json');
    }

    /**
     * Analyze all biases and generate alerts
     */
    public async analyze(): Promise<BiasAlert[]> {
        console.log('🧠 BiasMonitor: Starting bias analysis...');

        const alerts: BiasAlert[] = [];

        // Load data
        const patterns = await this.loadPatterns();
        const forecasts = await this.loadForecasts();
        const correlations = await this.loadCorrelations();
        const adrs = await this.loadADRs();
        const proposedAdrs = await this.loadProposedADRs();

        console.log(`📊 Loaded: ${patterns.length} patterns, ${forecasts.length} forecasts, ${correlations.length} correlations, ${adrs.length} ADRs, ${proposedAdrs.length} proposed ADRs`);

        // Detect pattern repetition
        const patternRepetition = this.detectPatternRepetition(patterns, proposedAdrs);
        if (patternRepetition) alerts.push(patternRepetition);

        // Detect contradictions
        const contradictions = this.detectContradictions(adrs, proposedAdrs);
        alerts.push(...contradictions);

        // Detect correlation divergence
        const correlationDivergence = this.detectCorrelationDivergence(correlations);
        if (correlationDivergence) alerts.push(correlationDivergence);

        // Detect temporal bias
        const temporalBias = this.detectTemporalBias(proposedAdrs);
        if (temporalBias) alerts.push(temporalBias);

        // Detect thematic bias
        const thematicBias = this.detectThematicBias(proposedAdrs, patterns);
        if (thematicBias) alerts.push(thematicBias);

        // Save alerts
        await this.saveAlerts(alerts);

        // Log summary
        const avgConfidence = alerts.length > 0
            ? alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length
            : 0;

        console.log(`🧠 Bias Monitor: Analysis complete (${alerts.length} biases detected, avg confidence ${avgConfidence.toFixed(2)})`);

        if (alerts.length > 0) {
            console.log('\n📋 Detected Biases:');
            alerts.forEach(alert => {
                console.log(`  • ${alert.type}: ${alert.description} (${Math.round(alert.confidence * 100)}% confidence, ${alert.impact} impact)`);
            });
        }

        return alerts;
    }

    /**
     * Detect pattern repetition (same pattern generating too many ADRs)
     */
    private detectPatternRepetition(patterns: Pattern[], proposedAdrs: ADR[]): BiasAlert | null {
        // Count ADRs per pattern
        const patternCounts = new Map<string, number>();

        for (const adr of proposedAdrs) {
            for (const tag of adr.tags) {
                patternCounts.set(tag, (patternCounts.get(tag) || 0) + 1);
            }
        }

        // Find patterns with >3 ADRs in last 10
        for (const [patternId, count] of patternCounts) {
            if (count > 3 && proposedAdrs.length <= 10) {
                const pattern = patterns.find(p => p.id === patternId);
                if (pattern) {
                    const confidence = Math.min(0.9, 0.5 + (count / 10) * 0.4);
                    return this.createAlert(
                        'pattern_repetition',
                        `Recurrent ${pattern.impact} ADRs detected (${count} in last ${proposedAdrs.length})`,
                        [patternId, ...proposedAdrs.filter(a => a.tags.includes(patternId)).slice(0, 3).map(a => a.id)],
                        confidence,
                        'medium',
                        'Review recent ADRs for redundancy'
                    );
                }
            }
        }

        return null;
    }

    /**
     * Detect contradictory ADRs
     */
    private detectContradictions(adrs: ADR[], proposedAdrs: ADR[]): BiasAlert[] {
        const alerts: BiasAlert[] = [];
        const allADRs = [...adrs, ...proposedAdrs];

        // Simple contradiction detection based on decision content
        // Look for opposing keywords in decisions
        const oppositionPairs = [
            ['adopt', 'remove'],
            ['add', 'remove'],
            ['enable', 'disable'],
            ['implement', 'deprecate'],
            ['use', 'avoid'],
        ];

        for (let i = 0; i < allADRs.length; i++) {
            for (let j = i + 1; j < allADRs.length; j++) {
                const adr1 = allADRs[i];
                const adr2 = allADRs[j];

                // Check if they share similar context
                const sharedTags = adr1.tags.filter(t => adr2.tags.includes(t));
                if (sharedTags.length === 0) continue;

                // Check for opposing decisions
                const decision1 = adr1.decision.toLowerCase();
                const decision2 = adr2.decision.toLowerCase();

                for (const [positive, negative] of oppositionPairs) {
                    if ((decision1.includes(positive) && decision2.includes(negative)) ||
                        (decision1.includes(negative) && decision2.includes(positive))) {
                        const confidence = 0.8;
                        alerts.push(this.createAlert(
                            'contradiction',
                            `Opposing ADRs detected: "${adr1.title}" vs "${adr2.title}"`,
                            [adr1.id, adr2.id],
                            confidence,
                            'high',
                            'Review both ADRs for logical consistency'
                        ));
                        break;
                    }
                }
            }
        }

        return alerts;
    }

    /**
     * Detect declining correlation scores
     */
    private detectCorrelationDivergence(correlations: Correlation[]): BiasAlert | null {
        if (correlations.length < 3) return null;

        // Group by pattern
        const patternCorrelations = new Map<string, Correlation[]>();
        for (const corr of correlations) {
            const existing = patternCorrelations.get(corr.pattern_id) || [];
            existing.push(corr);
            patternCorrelations.set(corr.pattern_id, existing);
        }

        // Find patterns with declining correlations
        for (const [patternId, patternCorrs] of patternCorrelations) {
            if (patternCorrs.length >= 3) {
                const scores = patternCorrs.map(c => c.correlation_score);
                const recent = scores.slice(-3);
                const avgRecent = recent.reduce((sum, s) => sum + s, 0) / recent.length;

                if (avgRecent < 0.4) {
                    const confidence = 0.7;
                    return this.createAlert(
                        'correlation_divergence',
                        `Pattern ${patternId} shows declining correlation (avg: ${avgRecent.toFixed(2)})`,
                        [patternId, ...recent.map((_, i) => correlations[correlations.length - 3 + i].id)],
                        confidence,
                        'medium',
                        'Review pattern validity or update evidence sources'
                    );
                }
            }
        }

        return null;
    }

    /**
     * Detect temporal bias (too many recent ADRs)
     */
    private detectTemporalBias(proposedAdrs: ADR[]): BiasAlert | null {
        if (proposedAdrs.length < 3) return null;

        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        const recentADRs = proposedAdrs.filter(adr => {
            const createdAt = new Date(adr.createdAt).getTime();
            return createdAt > thirtyDaysAgo;
        }).length;

        const recentPercentage = recentADRs / proposedAdrs.length;

        if (recentPercentage > 0.6) {
            const confidence = 0.64;
            return this.createAlert(
                'temporal_focus',
                `${Math.round(recentPercentage * 100)}% of ADRs generated in last 30 days`,
                proposedAdrs.slice(0, 3).map(a => a.id),
                confidence,
                'low',
                'Balance reasoning across historical data'
            );
        }

        return null;
    }

    /**
     * Detect thematic bias (too focused on one category)
     */
    private detectThematicBias(proposedAdrs: ADR[], patterns: Pattern[]): BiasAlert | null {
        if (proposedAdrs.length < 2) return null;

        // Count ADRs by impact category
        const categoryCounts = new Map<string, number>();
        for (const adr of proposedAdrs) {
            const category = this.extractCategory(adr, patterns);
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }

        // Find dominant category
        for (const [category, count] of categoryCounts) {
            const percentage = count / proposedAdrs.length;
            if (percentage > 0.6 && proposedAdrs.length >= 3) {
                const confidence = Math.min(0.9, 0.5 + percentage * 0.4);
                return this.createAlert(
                    'thematic_bias',
                    `ADR generation focused only on '${category}' category (${Math.round(percentage * 100)}%)`,
                    proposedAdrs.map(a => a.id).slice(0, 3),
                    confidence,
                    category === 'Performance' ? 'high' : 'medium',
                    `Expand reasoning coverage to include other categories`
                );
            }
        }

        return null;
    }

    /**
     * Extract category from ADR
     */
    private extractCategory(adr: ADR, patterns: Pattern[]): string {
        // Try to find pattern for this ADR
        for (const tag of adr.tags) {
            const pattern = patterns.find(p => p.id === tag);
            if (pattern) {
                return pattern.impact || 'Unknown';
            }
        }

        // Fallback to title analysis
        const title = adr.title.toLowerCase();
        if (title.includes('performance') || title.includes('cache') || title.includes('latency')) {
            return 'Performance';
        } else if (title.includes('security') || title.includes('compliance')) {
            return 'Security';
        } else if (title.includes('scalability') || title.includes('migration')) {
            return 'Scalability';
        }

        return 'Other';
    }

    /**
     * Create a bias alert
     */
    private createAlert(
        type: BiasAlert['type'],
        description: string,
        evidence: string[],
        confidence: number,
        impact: BiasAlert['impact'],
        suggestion: string
    ): BiasAlert {
        return {
            id: `bias-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type,
            description,
            evidence,
            confidence,
            impact,
            suggestion,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Save alerts to JSON
     */
    private async saveAlerts(alerts: BiasAlert[]): Promise<void> {
        // Load existing alerts
        let allAlerts: BiasAlert[] = [];
        if (fs.existsSync(this.alertsPath)) {
            const data = fs.readFileSync(this.alertsPath, 'utf8');
            allAlerts = JSON.parse(data);
        }

        // Append new alerts
        allAlerts.push(...alerts);

        // Save
        fs.writeFileSync(this.alertsPath, JSON.stringify(allAlerts, null, 2));
    }

    /**
     * Load patterns
     */
    private async loadPatterns(): Promise<Pattern[]> {
        try {
            if (!fs.existsSync(this.patternsPath)) return [];
            const data = fs.readFileSync(this.patternsPath, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.patterns || [];
        } catch (error) {
            console.error('Error loading patterns:', error);
            return [];
        }
    }

    /**
     * Load forecasts
     */
    private async loadForecasts(): Promise<Forecast[]> {
        try {
            if (!fs.existsSync(this.forecastsPath)) return [];
            const data = fs.readFileSync(this.forecastsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading forecasts:', error);
            return [];
        }
    }

    /**
     * Load correlations
     */
    private async loadCorrelations(): Promise<Correlation[]> {
        try {
            if (!fs.existsSync(this.correlationsPath)) return [];
            const data = fs.readFileSync(this.correlationsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading correlations:', error);
            return [];
        }
    }

    /**
     * Load ADRs
     */
    private async loadADRs(): Promise<ADR[]> {
        try {
            if (!fs.existsSync(this.adrDir)) return [];
            const files = fs.readdirSync(this.adrDir)
                .filter(f => f.endsWith('.json') && f !== 'index.json');

            const adrs: ADR[] = [];
            for (const file of files) {
                try {
                    const filePath = path.join(this.adrDir, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const parsed = JSON.parse(data);
                    // Only extract fields we need
                    adrs.push({
                        id: parsed.id,
                        title: parsed.title,
                        decision: parsed.decision,
                        tags: parsed.tags || [],
                        createdAt: parsed.createdAt,
                        confidence: parsed.confidence
                    });
                } catch (parseError) {
                    // Skip invalid files
                    continue;
                }
            }
            return adrs;
        } catch (error) {
            console.error('Error loading ADRs:', error);
            return [];
        }
    }

    /**
     * Load proposed ADRs
     */
    private async loadProposedADRs(): Promise<ADR[]> {
        try {
            if (!fs.existsSync(this.autoAdrDir)) return [];
            const files = fs.readdirSync(this.autoAdrDir)
                .filter(f => f.endsWith('.json') && f !== 'proposals.index.json');

            const adrs: ADR[] = [];
            for (const file of files) {
                try {
                    const filePath = path.join(this.autoAdrDir, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const parsed = JSON.parse(data);
                    // Only extract fields we need
                    adrs.push({
                        id: parsed.id,
                        title: parsed.title,
                        decision: parsed.decision,
                        tags: parsed.tags || [],
                        createdAt: parsed.createdAt,
                        confidence: parsed.confidence
                    });
                } catch (parseError) {
                    // Skip invalid files
                    continue;
                }
            }
            return adrs;
        } catch (error) {
            console.error('Error loading proposed ADRs:', error);
            return [];
        }
    }
}
