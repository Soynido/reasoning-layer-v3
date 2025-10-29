import { execSync } from 'child_process';
import { UnifiedLogger } from '../UnifiedLogger';
import { CognitiveScorer, ScoredContent } from './CognitiveScorer';

/**
 * GitHubWatcher - Monitors GitHub for cognitive signals
 * 
 * Capabilities:
 * - Search GitHub for issues/PRs with cognitive keywords
 * - Filter candidates by relevance
 * - Rate limiting and ethical constraints
 * - Integration with gh CLI
 */

export interface WatchConfig {
    topics: string[];
    maxReposPerHour: number;
    maxCommentsPerDay: number;
    observeOnly: boolean; // If true, don't comment, just observe
}

export interface WatchedIssue {
    url: string;
    repo: string;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    createdAt: string;
}

export class GitHubWatcher {
    private logger: UnifiedLogger;
    private scorer: CognitiveScorer;
    private watchedRepos: Set<string> = new Set();
    private commentsToday: number = 0;
    private lastResetDate: string = new Date().toISOString().split('T')[0];
    
    constructor(private config: WatchConfig) {
        this.logger = UnifiedLogger.getInstance();
        this.scorer = new CognitiveScorer();
    }
    
    /**
     * Search GitHub for issues matching cognitive topics
     */
    public async searchIssues(): Promise<WatchedIssue[]> {
        this.logger.log(`🔍 Searching GitHub for cognitive signals: ${this.config.topics.join(', ')}`);
        
        const issues: WatchedIssue[] = [];
        
        for (const topic of this.config.topics) {
            try {
                // Use gh CLI to search
                const query = `is:issue is:open "${topic}"`;
                const result = execSync(`gh search issues "${query}" --limit 10 --json url,repository,number,title,body,state,createdAt`, {
                    encoding: 'utf-8',
                    timeout: 30000
                });
                
                const searchResults = JSON.parse(result);
                
                for (const issue of searchResults) {
                    issues.push({
                        url: issue.url,
                        repo: issue.repository?.nameWithOwner || 'unknown',
                        number: issue.number,
                        title: issue.title || '',
                        body: issue.body || '',
                        state: issue.state,
                        createdAt: issue.createdAt
                    });
                }
                
                this.logger.log(`  ✓ Found ${searchResults.length} issues for topic: ${topic}`);
                
                // Rate limiting delay
                await this.sleep(2000);
                
            } catch (error) {
                this.logger.warn(`Failed to search for topic "${topic}": ${error}`);
            }
        }
        
        this.logger.log(`📊 Total issues found: ${issues.length}`);
        return issues;
    }
    
    /**
     * Filter issues by cognitive relevance
     */
    public filterCandidates(issues: WatchedIssue[]): ScoredContent[] {
        this.logger.log(`🎯 Filtering ${issues.length} issues by cognitive relevance...`);
        
        const scored: ScoredContent[] = [];
        
        for (const issue of issues) {
            // Check if we've already interacted with this repo today
            if (this.hasInteractedToday(issue.repo)) {
                this.logger.log(`  ⏭️  Skipping ${issue.repo}#${issue.number} (already interacted today)`);
                continue;
            }
            
            // Score the issue
            const scoredContent = this.scorer.scoreContent(issue.url, issue.title, issue.body);
            
            if (scoredContent.shouldComment) {
                scored.push(scoredContent);
            }
        }
        
        // Sort by relevance (highest first)
        scored.sort((a, b) => b.relevance - a.relevance);
        
        // Limit to maxReposPerHour
        const limited = scored.slice(0, this.config.maxReposPerHour);
        
        this.logger.log(`✅ ${limited.length} candidates selected for potential comment`);
        
        return limited;
    }
    
    /**
     * Get full context for an issue (for deeper analysis)
     */
    public async getIssueContext(url: string): Promise<string> {
        try {
            // Extract owner, repo, and issue number from URL
            const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
            if (!match) {
                throw new Error('Invalid GitHub issue URL');
            }
            
            const [, owner, repo, number] = match;
            
            // Fetch issue with comments
            const result = execSync(`gh issue view ${number} --repo ${owner}/${repo} --json title,body,comments`, {
                encoding: 'utf-8',
                timeout: 30000
            });
            
            const issue = JSON.parse(result);
            
            // Combine title, body, and comments
            const context = [
                `Title: ${issue.title}`,
                `\nBody:\n${issue.body}`,
                `\nComments (${issue.comments?.length || 0}):`
            ];
            
            if (issue.comments && issue.comments.length > 0) {
                for (const comment of issue.comments.slice(0, 5)) { // Limit to first 5 comments
                    context.push(`\n- ${comment.author?.login}: ${comment.body?.substring(0, 200)}...`);
                }
            }
            
            return context.join('\n');
            
        } catch (error) {
            this.logger.warn(`Failed to get context for ${url}: ${error}`);
            return '';
        }
    }
    
    /**
     * Check if we've already interacted with this repo today
     */
    private hasInteractedToday(repo: string): boolean {
        // Reset counter if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (today !== this.lastResetDate) {
            this.watchedRepos.clear();
            this.commentsToday = 0;
            this.lastResetDate = today;
        }
        
        return this.watchedRepos.has(repo);
    }
    
    /**
     * Mark repo as interacted
     */
    public markInteracted(repo: string): void {
        this.watchedRepos.add(repo);
        this.commentsToday++;
    }
    
    /**
     * Check if we can still comment today
     */
    public canCommentToday(): boolean {
        return this.commentsToday < this.config.maxCommentsPerDay;
    }
    
    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get watch statistics
     */
    public getStats(): {
        watchedReposToday: number;
        commentsToday: number;
        canComment: boolean;
        observeOnly: boolean;
    } {
        return {
            watchedReposToday: this.watchedRepos.size,
            commentsToday: this.commentsToday,
            canComment: this.canCommentToday(),
            observeOnly: this.config.observeOnly
        };
    }
}

