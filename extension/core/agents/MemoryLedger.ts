import * as fs from 'fs';
import * as path from 'path';
import { UnifiedLogger } from '../UnifiedLogger';
import { ScoredContent } from './CognitiveScorer';
import { CommentInsight } from './CognitiveCommentEngine';

/**
 * MemoryLedger - Records all cognitive interactions with GitHub
 * 
 * Capabilities:
 * - Track all repos, issues, and comments
 * - Build cognitive graph of OSS ecosystem
 * - Detect patterns in interactions
 * - Prevent duplicate comments
 */

export interface InteractionRecord {
    id: string;
    timestamp: string;
    repo: string;
    issueUrl: string;
    issueTitle: string;
    action: 'observed' | 'commented' | 'scored';
    score?: number;
    comment?: string;
    keywords?: string[];
    category?: string;
}

export interface RepoHistory {
    repo: string;
    firstInteraction: string;
    lastInteraction: string;
    totalInteractions: number;
    comments: number;
    observations: number;
    avgScore: number;
    keywords: string[];
}

export interface CognitiveGraph {
    repos: Map<string, RepoHistory>;
    totalInteractions: number;
    totalComments: number;
    topKeywords: { keyword: string; count: number }[];
    topRepos: { repo: string; score: number }[];
}

export class MemoryLedger {
    private logger: UnifiedLogger;
    private ledgerPath: string;
    private interactions: InteractionRecord[] = [];
    
    constructor(private workspaceRoot: string) {
        this.logger = UnifiedLogger.getInstance();
        this.ledgerPath = path.join(workspaceRoot, '.reasoning', 'memory_ledger.json');
        this.loadLedger();
    }
    
    /**
     * Load existing ledger from disk
     */
    private loadLedger(): void {
        try {
            if (fs.existsSync(this.ledgerPath)) {
                const data = fs.readFileSync(this.ledgerPath, 'utf-8');
                this.interactions = JSON.parse(data);
                this.logger.log(`💾 Loaded ${this.interactions.length} interactions from memory ledger`);
            } else {
                this.logger.log(`📝 Creating new memory ledger at ${this.ledgerPath}`);
            }
        } catch (error) {
            this.logger.warn(`Failed to load memory ledger: ${error}`);
            this.interactions = [];
        }
    }
    
    /**
     * Save ledger to disk
     */
    private saveLedger(): void {
        try {
            const dir = path.dirname(this.ledgerPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(this.ledgerPath, JSON.stringify(this.interactions, null, 2), 'utf-8');
            this.logger.log(`💾 Saved ${this.interactions.length} interactions to memory ledger`);
        } catch (error) {
            this.logger.warn(`Failed to save memory ledger: ${error}`);
        }
    }
    
    /**
     * Record an observation (scored but not commented)
     */
    public recordObservation(scored: ScoredContent): void {
        const record: InteractionRecord = {
            id: `obs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            repo: this.extractRepo(scored.url),
            issueUrl: scored.url,
            issueTitle: scored.title,
            action: 'observed',
            score: scored.relevance,
            keywords: scored.signals.keywords,
            category: scored.signals.category
        };
        
        this.interactions.push(record);
        this.saveLedger();
        
        this.logger.log(`👁️  Recorded observation: ${record.repo} (score: ${scored.relevance.toFixed(2)})`);
    }
    
    /**
     * Record a comment
     */
    public recordComment(scored: ScoredContent, insight: CommentInsight): void {
        const record: InteractionRecord = {
            id: `com-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            repo: this.extractRepo(scored.url),
            issueUrl: scored.url,
            issueTitle: scored.title,
            action: 'commented',
            score: scored.relevance,
            comment: insight.content,
            keywords: insight.metadata.keywords,
            category: insight.metadata.category
        };
        
        this.interactions.push(record);
        this.saveLedger();
        
        this.logger.log(`💬 Recorded comment: ${record.repo} (${insight.metadata.category})`);
    }
    
    /**
     * Get history for a specific repo
     */
    public getRepoHistory(repo: string): RepoHistory | null {
        const repoInteractions = this.interactions.filter(i => i.repo === repo);
        
        if (repoInteractions.length === 0) {
            return null;
        }
        
        const comments = repoInteractions.filter(i => i.action === 'commented').length;
        const observations = repoInteractions.filter(i => i.action === 'observed').length;
        const scores = repoInteractions.filter(i => i.score).map(i => i.score!);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Collect all keywords
        const allKeywords = new Set<string>();
        repoInteractions.forEach(i => {
            i.keywords?.forEach(k => allKeywords.add(k));
        });
        
        return {
            repo,
            firstInteraction: repoInteractions[0].timestamp,
            lastInteraction: repoInteractions[repoInteractions.length - 1].timestamp,
            totalInteractions: repoInteractions.length,
            comments,
            observations,
            avgScore,
            keywords: Array.from(allKeywords)
        };
    }
    
    /**
     * Check if we've interacted with this issue before
     */
    public hasInteractedWith(issueUrl: string): boolean {
        return this.interactions.some(i => i.issueUrl === issueUrl);
    }
    
    /**
     * Build cognitive graph of all interactions
     */
    public buildCognitiveGraph(): CognitiveGraph {
        const repos = new Map<string, RepoHistory>();
        
        // Group by repo
        const repoNames = new Set(this.interactions.map(i => i.repo));
        
        for (const repo of repoNames) {
            const history = this.getRepoHistory(repo);
            if (history) {
                repos.set(repo, history);
            }
        }
        
        // Count keywords
        const keywordCounts = new Map<string, number>();
        this.interactions.forEach(i => {
            i.keywords?.forEach(k => {
                keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
            });
        });
        
        const topKeywords = Array.from(keywordCounts.entries())
            .map(([keyword, count]) => ({ keyword, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        // Rank repos by score
        const topRepos = Array.from(repos.values())
            .map(h => ({ repo: h.repo, score: h.avgScore }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
        
        const totalComments = this.interactions.filter(i => i.action === 'commented').length;
        
        return {
            repos,
            totalInteractions: this.interactions.length,
            totalComments,
            topKeywords,
            topRepos
        };
    }
    
    /**
     * Generate report
     */
    public generateReport(): string {
        const graph = this.buildCognitiveGraph();
        
        const lines = [
            `# 🧠 Cognitive Memory Ledger Report`,
            ``,
            `Generated: ${new Date().toISOString()}`,
            ``,
            `## 📊 Statistics`,
            ``,
            `- Total interactions: ${graph.totalInteractions}`,
            `- Total comments: ${graph.totalComments}`,
            `- Repos observed: ${graph.repos.size}`,
            ``,
            `## 🔝 Top Keywords`,
            ``,
            graph.topKeywords.map(k => `- **${k.keyword}**: ${k.count} mentions`).join('\n'),
            ``,
            `## 🏆 Top Repos (by cognitive score)`,
            ``,
            graph.topRepos.slice(0, 10).map((r, i) => 
                `${i + 1}. **${r.repo}** (score: ${r.score.toFixed(2)})`
            ).join('\n'),
            ``,
            `## 📈 Recent Interactions (last 10)`,
            ``,
            this.interactions.slice(-10).reverse().map(i => 
                `- [${i.action}] ${i.repo} - ${i.issueTitle.substring(0, 50)}... (${i.timestamp.split('T')[0]})`
            ).join('\n')
        ];
        
        return lines.join('\n');
    }
    
    /**
     * Extract repo name from GitHub URL
     */
    private extractRepo(url: string): string {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : 'unknown';
    }
    
    /**
     * Export ledger for analysis
     */
    public exportLedger(): InteractionRecord[] {
        return [...this.interactions];
    }
    
    /**
     * Clear ledger (use with caution)
     */
    public clearLedger(): void {
        this.interactions = [];
        this.saveLedger();
        this.logger.log(`🗑️  Memory ledger cleared`);
    }
}

