import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { CaptureEvent } from '../types';
import { UnifiedLogger } from '../UnifiedLogger';

const execAsync = promisify(exec);

/**
 * GitHubDiscussionListener - Input Layer Component (Phase 3)
 * 
 * Listens to GitHub issues, PRs, and discussions for cognitive signals.
 * Reuses CognitiveScorer to evaluate relevance.
 * Identifies architectural discussions and generates ADR candidates.
 * 
 * Features:
 * - Monitor repository issues/PRs
 * - Cognitive scoring (keywords: architecture, decision, reasoning, etc.)
 * - ADR candidate detection
 * - Rate limiting (respect GitHub API limits)
 * - Polling interval (configurable, default 5 minutes)
 */
export class GitHubDiscussionListener {
    private workspaceRoot: string;
    private logger: UnifiedLogger;
    private isWatching: boolean = false;
    private pollInterval: NodeJS.Timeout | null = null;
    private lastPollTime: string = '';
    private repoOwner: string = '';
    private repoName: string = '';

    // Cognitive keywords for scoring
    private readonly COGNITIVE_KEYWORDS = [
        'architecture', 'decision', 'reasoning', 'pattern', 'design',
        'approach', 'strategy', 'tradeoff', 'alternative', 'consequence',
        'why', 'because', 'rationale', 'justification', 'consideration',
        'adr', 'rfc', 'proposal', 'discussion', 'debate'
    ];

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logger = UnifiedLogger.getInstance();
    }

    /**
     * Start watching GitHub discussions
     */
    public async startWatching(intervalMinutes: number = 5): Promise<void> {
        if (this.isWatching) {
            this.logger.warn('⚠️ GitHubDiscussionListener already watching.');
            return;
        }

        // Detect repository from git remote
        const repo = await this.detectRepository();
        if (!repo) {
            this.logger.warn('⚠️ Could not detect GitHub repository. Listener disabled.');
            return;
        }

        this.repoOwner = repo.owner;
        this.repoName = repo.name;
        this.isWatching = true;

        this.logger.log(`🎧 GitHubDiscussionListener started for ${repo.owner}/${repo.name}`);
        this.logger.log(`🎧 Polling interval: ${intervalMinutes} minutes`);

        // Initial poll
        await this.poll();

        // Set up periodic polling
        this.pollInterval = setInterval(async () => {
            await this.poll();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stop watching
     */
    public stopWatching(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isWatching = false;
        this.logger.log('🎧 GitHubDiscussionListener stopped');
    }

    /**
     * Detect GitHub repository from git remote
     */
    private async detectRepository(): Promise<{ owner: string; name: string } | null> {
        try {
            const { stdout } = await execAsync('git remote get-url origin', { cwd: this.workspaceRoot });
            const remoteUrl = stdout.trim();

            // Parse GitHub URL
            // Supports: https://github.com/owner/repo.git or git@github.com:owner/repo.git
            const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
            if (match) {
                return {
                    owner: match[1],
                    name: match[2]
                };
            }
        } catch (error) {
            // Not a git repository or no remote
        }
        return null;
    }

    /**
     * Poll GitHub for new issues/PRs
     */
    private async poll(): Promise<void> {
        try {
            this.logger.log(`🔍 Polling GitHub for ${this.repoOwner}/${this.repoName}...`);

            // Fetch recent issues
            const issues = await this.fetchRecentIssues();
            
            // Fetch recent PRs
            const prs = await this.fetchRecentPRs();

            // Process all discussions
            const discussions = [...issues, ...prs];
            
            for (const discussion of discussions) {
                // Skip if already processed
                if (this.wasProcessed(discussion.updated_at)) {
                    continue;
                }

                // Score cognitive relevance
                const score = this.scoreCognitiveRelevance(discussion);

                // Only capture if score is high enough
                if (score.overall >= 0.6) {
                    this.logger.log(`🧠 High cognitive relevance: ${discussion.type} #${discussion.number} (${(score.overall * 100).toFixed(0)}%)`);
                    
                    const event = this.createCaptureEvent(discussion, score);
                    await this.saveToTraces(event);
                }
            }

            // Update last poll time
            this.lastPollTime = new Date().toISOString();

        } catch (error) {
            this.logger.warn(`⚠️ GitHub poll failed: ${error}`);
        }
    }

    /**
     * Fetch recent issues via GitHub CLI
     */
    private async fetchRecentIssues(): Promise<GitHubDiscussion[]> {
        try {
            const { stdout } = await execAsync(
                `gh issue list --repo ${this.repoOwner}/${this.repoName} --limit 10 --json number,title,body,state,createdAt,updatedAt,author,labels`,
                { cwd: this.workspaceRoot }
            );

            const issues = JSON.parse(stdout);
            return issues.map((issue: any) => ({
                type: 'issue',
                number: issue.number,
                title: issue.title,
                body: issue.body || '',
                state: issue.state,
                created_at: issue.createdAt,
                updated_at: issue.updatedAt,
                author: issue.author?.login || 'unknown',
                labels: issue.labels?.map((l: any) => l.name) || []
            }));
        } catch (error) {
            // gh CLI not available or not authenticated
            return [];
        }
    }

    /**
     * Fetch recent PRs via GitHub CLI
     */
    private async fetchRecentPRs(): Promise<GitHubDiscussion[]> {
        try {
            const { stdout } = await execAsync(
                `gh pr list --repo ${this.repoOwner}/${this.repoName} --limit 10 --json number,title,body,state,createdAt,updatedAt,author,labels`,
                { cwd: this.workspaceRoot }
            );

            const prs = JSON.parse(stdout);
            return prs.map((pr: any) => ({
                type: 'pr',
                number: pr.number,
                title: pr.title,
                body: pr.body || '',
                state: pr.state,
                created_at: pr.createdAt,
                updated_at: pr.updatedAt,
                author: pr.author?.login || 'unknown',
                labels: pr.labels?.map((l: any) => l.name) || []
            }));
        } catch (error) {
            // gh CLI not available or not authenticated
            return [];
        }
    }

    /**
     * Check if discussion was already processed
     */
    private wasProcessed(updatedAt: string): boolean {
        if (!this.lastPollTime) return false;
        return new Date(updatedAt) <= new Date(this.lastPollTime);
    }

    /**
     * Score cognitive relevance of a discussion
     */
    private scoreCognitiveRelevance(discussion: GitHubDiscussion): CognitiveScore {
        const score: CognitiveScore = {
            overall: 0,
            signals: {
                keywords: [],
                category: 'technical'
            }
        };

        const text = `${discussion.title} ${discussion.body}`.toLowerCase();

        // Count cognitive keywords
        const keywordMatches: string[] = [];
        for (const keyword of this.COGNITIVE_KEYWORDS) {
            if (text.includes(keyword)) {
                keywordMatches.push(keyword);
            }
        }

        // Base score from keyword density
        const keywordScore = Math.min(keywordMatches.length / 5, 1.0); // Max at 5 keywords
        score.signals.keywords = keywordMatches;

        // Category detection
        if (text.includes('architecture') || text.includes('design')) {
            score.signals.category = 'architecture';
            score.overall = Math.max(score.overall, 0.9);
        } else if (text.includes('decision') || text.includes('adr') || text.includes('rfc')) {
            score.signals.category = 'decision';
            score.overall = Math.max(score.overall, 0.85);
        } else if (text.includes('reasoning') || text.includes('rationale')) {
            score.signals.category = 'reasoning';
            score.overall = Math.max(score.overall, 0.8);
        } else if (text.includes('pattern') || text.includes('approach')) {
            score.signals.category = 'pattern';
            score.overall = Math.max(score.overall, 0.75);
        } else {
            score.signals.category = 'technical';
            score.overall = keywordScore * 0.7;
        }

        // Boost for labels
        if (discussion.labels.some(l => /architecture|design|decision|rfc|adr/i.test(l))) {
            score.overall = Math.min(score.overall + 0.15, 1.0);
        }

        // Boost for question format (likely discussion)
        if (discussion.title.includes('?') || discussion.body.includes('should we') || discussion.body.includes('how do we')) {
            score.overall = Math.min(score.overall + 0.1, 1.0);
        }

        return score;
    }

    /**
     * Create capture event from discussion
     */
    private createCaptureEvent(discussion: GitHubDiscussion, score: CognitiveScore): CaptureEvent {
        return {
            id: uuidv4(),
            type: discussion.type === 'issue' ? 'issue_linked' : 'pr_linked',
            timestamp: new Date().toISOString(),
            source: `github:${this.repoOwner}/${this.repoName}#${discussion.number}`,
            metadata: {
                discussion: {
                    number: discussion.number,
                    title: discussion.title,
                    body: discussion.body.substring(0, 500), // First 500 chars
                    state: discussion.state,
                    author: discussion.author,
                    labels: discussion.labels,
                    created_at: discussion.created_at,
                    updated_at: discussion.updated_at
                },
                cognitive_score: {
                    overall: score.overall,
                    keywords: score.signals.keywords,
                    category: score.signals.category
                },
                adr_candidate: score.overall >= 0.8, // High scores are ADR candidates
                cognitive_relevance: score.overall,
                auto_captured: true,
                captured_by: 'GitHubDiscussionListener'
            }
        };
    }

    /**
     * Save event to traces
     */
    private async saveToTraces(event: CaptureEvent): Promise<void> {
        const reasoningDir = path.join(this.workspaceRoot, '.reasoning');
        const tracesDir = path.join(reasoningDir, 'traces');

        // Ensure traces directory exists
        if (!fs.existsSync(tracesDir)) {
            fs.mkdirSync(tracesDir, { recursive: true });
        }

        // Get today's trace file
        const today = new Date().toISOString().split('T')[0];
        const traceFile = path.join(tracesDir, `${today}.json`);

        let events: CaptureEvent[] = [];

        // Load existing events
        if (fs.existsSync(traceFile)) {
            try {
                events = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
            } catch (error) {
                this.logger.warn(`⚠️ Could not read trace file: ${error}`);
            }
        }

        // Add new event
        events.push(event);

        // Save
        fs.writeFileSync(traceFile, JSON.stringify(events, null, 2));

        // Update manifest
        await this.updateManifest();
    }

    /**
     * Update manifest
     */
    private async updateManifest(): Promise<void> {
        const manifestPath = path.join(this.workspaceRoot, '.reasoning', 'manifest.json');

        if (!fs.existsSync(manifestPath)) return;

        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            manifest.totalEvents = (manifest.totalEvents || 0) + 1;
            manifest.lastCaptureAt = new Date().toISOString();
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        } catch (error) {
            this.logger.warn(`⚠️ Could not update manifest: ${error}`);
        }
    }

    /**
     * Get statistics
     */
    public getStats(): ListenerStats {
        return {
            isWatching: this.isWatching,
            repository: this.repoOwner && this.repoName ? `${this.repoOwner}/${this.repoName}` : null,
            lastPollTime: this.lastPollTime || null
        };
    }
}

/**
 * Types
 */
export interface GitHubDiscussion {
    type: 'issue' | 'pr';
    number: number;
    title: string;
    body: string;
    state: string;
    created_at: string;
    updated_at: string;
    author: string;
    labels: string[];
}

export interface CognitiveScore {
    overall: number;
    signals: {
        keywords: string[];
        category: 'architecture' | 'decision' | 'reasoning' | 'pattern' | 'technical';
    };
}

export interface ListenerStats {
    isWatching: boolean;
    repository: string | null;
    lastPollTime: string | null;
}

