/**
 * Self-Review Engine - Level 9: Self-Review Engine
 * 
 * Analyzes execution cycles and generates insights about system evolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { HistoryManager, ExecutionCycle } from './HistoryManager';

export interface ReviewInsight {
    type: 'improvement' | 'regression' | 'stability' | 'warning';
    metric: string;
    description: string;
    confidence: number;
    recommendation?: string;
}

export interface ReviewReport {
    generated_at: string;
    total_cycles: number;
    statistics: {
        average_duration_ms: number;
        average_patterns: number;
        average_biases: number;
        average_confidence: number;
    };
    evolution: {
        confidence_trend: number;
        bias_trend: number;
        efficiency_trend: number;
    };
    insights: ReviewInsight[];
    summary: string;
}

export class SelfReviewEngine {
    private workspaceRoot: string;
    private historyManager: HistoryManager;
    private reportPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.historyManager = new HistoryManager(workspaceRoot);
        this.reportPath = path.join(workspaceRoot, '.reasoning', 'review_report.md');
    }

    /**
     * Generate self-review report
     */
    public async generateReview(): Promise<ReviewReport> {
        console.log('🔄 SelfReviewEngine: Analyzing execution cycles...');

        const cycles = this.historyManager.getCycles();
        
        if (cycles.length === 0) {
            console.log('⚠️ No cycles to review yet.');
            return this.createEmptyReport();
        }

        const stats = this.historyManager.getStatistics();
        const evolution = this.historyManager.calculateEvolution();
        const insights = this.analyzeInsights(cycles, evolution);

        const report: ReviewReport = {
            generated_at: new Date().toISOString(),
            total_cycles: cycles.length,
            statistics: stats,
            evolution: evolution,
            insights: insights,
            summary: this.generateSummary(stats, evolution, insights)
        };

        // Save report
        await this.saveReport(report);

        console.log(`✅ SelfReviewEngine: Generated review (${insights.length} insights)`);
        return report;
    }

    /**
     * Analyze insights from cycles and evolution
     */
    private analyzeInsights(cycles: ExecutionCycle[], evolution: any): ReviewInsight[] {
        const insights: ReviewInsight[] = [];

        // Insight 1: Confidence trend
        if (evolution.confidence_trend > 0.01) {
            insights.push({
                type: 'improvement',
                metric: 'Pattern Confidence',
                description: `Confidence increased by ${(evolution.confidence_trend * 100).toFixed(1)}%`,
                confidence: 0.85,
                recommendation: 'System is learning better patterns'
            });
        } else if (evolution.confidence_trend < -0.01) {
            insights.push({
                type: 'regression',
                metric: 'Pattern Confidence',
                description: `Confidence decreased by ${Math.abs(evolution.confidence_trend * 100).toFixed(1)}%`,
                confidence: 0.80,
                recommendation: 'Review pattern detection logic, may need more data'
            });
        }

        // Insight 2: Bias reduction
        if (evolution.bias_trend > 0) {
            insights.push({
                type: 'improvement',
                metric: 'Bias Detection',
                description: `Biases reduced by ${(evolution.bias_trend * 100).toFixed(0)}%`,
                confidence: 0.90,
                recommendation: 'System is becoming less biased over time'
            });
        }

        // Insight 3: Efficiency
        if (evolution.efficiency_trend > 0.05) {
            insights.push({
                type: 'improvement',
                metric: 'Efficiency',
                description: `Execution time improved by ${(evolution.efficiency_trend * 100).toFixed(1)}%`,
                confidence: 0.75,
                recommendation: 'Pipeline optimization is working'
            });
        } else if (evolution.efficiency_trend < -0.05) {
            insights.push({
                type: 'warning',
                metric: 'Efficiency',
                description: `Execution time increased by ${Math.abs(evolution.efficiency_trend * 100).toFixed(1)}%`,
                confidence: 0.70,
                recommendation: 'Consider optimizing pipeline or reducing data scope'
            });
        }

        // Insight 4: Pattern diversity
        const recentCycles = cycles.slice(-5);
        if (recentCycles.length >= 3) {
            const uniquePatterns = new Set(recentCycles.flatMap(c => c.patterns.map(p => p.id))).size;
            if (uniquePatterns < 3) {
                insights.push({
                    type: 'warning',
                    metric: 'Pattern Diversity',
                    description: `Low pattern diversity (${uniquePatterns} unique patterns)`,
                    confidence: 0.80,
                    recommendation: 'Consider stimulating new pattern learning'
                });
            }
        }

        return insights;
    }

    /**
     * Generate summary
     */
    private generateSummary(stats: any, evolution: any, insights: ReviewInsight[]): string {
        const improvements = insights.filter(i => i.type === 'improvement').length;
        const regressions = insights.filter(i => i.type === 'regression').length;
        const warnings = insights.filter(i => i.type === 'warning').length;

        let summary = `System has completed ${stats.total_cycles} execution cycles.\n\n`;
        
        if (improvements > 0) {
            summary += `✅ ${improvements} improvements detected\n`;
        }
        
        if (regressions > 0) {
            summary += `❌ ${regressions} regressions detected\n`;
        }
        
        if (warnings > 0) {
            summary += `⚠️ ${warnings} warnings detected\n`;
        }

        summary += `\nAverage confidence: ${(stats.average_confidence * 100).toFixed(1)}%\n`;
        summary += `Average execution time: ${stats.average_duration_ms.toFixed(0)}ms\n`;

        return summary;
    }

    /**
     * Create empty report
     */
    private createEmptyReport(): ReviewReport {
        return {
            generated_at: new Date().toISOString(),
            total_cycles: 0,
            statistics: {
                average_duration_ms: 0,
                average_patterns: 0,
                average_biases: 0,
                average_confidence: 0
            },
            evolution: {
                confidence_trend: 0,
                bias_trend: 0,
                efficiency_trend: 0
            },
            insights: [],
            summary: 'No execution cycles recorded yet.'
        };
    }

    /**
     * Save report as Markdown
     */
    private async saveReport(report: ReviewReport): Promise<void> {
        let markdown = `# 🔄 Self-Review Report\n\n`;
        markdown += `**Generated:** ${report.generated_at}\n\n`;
        markdown += `## 📊 Statistics\n\n`;
        markdown += `- **Total Cycles:** ${report.total_cycles}\n`;
        markdown += `- **Average Duration:** ${report.statistics.average_duration_ms.toFixed(0)}ms\n`;
        markdown += `- **Average Patterns:** ${report.statistics.average_patterns.toFixed(1)}\n`;
        markdown += `- **Average Biases:** ${report.statistics.average_biases.toFixed(1)}\n`;
        markdown += `- **Average Confidence:** ${(report.statistics.average_confidence * 100).toFixed(1)}%\n\n`;

        markdown += `## 📈 Evolution Trends\n\n`;
        markdown += `- **Confidence Trend:** ${(report.evolution.confidence_trend * 100).toFixed(2)}%\n`;
        markdown += `- **Bias Trend:** ${(report.evolution.bias_trend * 100).toFixed(2)}%\n`;
        markdown += `- **Efficiency Trend:** ${(report.evolution.efficiency_trend * 100).toFixed(2)}%\n\n`;

        if (report.insights.length > 0) {
            markdown += `## 🔍 Insights\n\n`;
            for (const insight of report.insights) {
                const icon = insight.type === 'improvement' ? '✅' : insight.type === 'regression' ? '❌' : '⚠️';
                markdown += `### ${icon} ${insight.metric}\n\n`;
                markdown += `${insight.description}\n\n`;
                if (insight.recommendation) {
                    markdown += `**Recommendation:** ${insight.recommendation}\n\n`;
                }
            }
        }

        markdown += `## 📝 Summary\n\n${report.summary}\n`;

        fs.writeFileSync(this.reportPath, markdown, 'utf-8');
    }
}
