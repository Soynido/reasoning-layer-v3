import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from './PersistenceManager';
import { EventAggregator } from './EventAggregator';

export interface PRData {
    number: number;
    title: string;
    body: string;
    author: string;
    state: 'open' | 'closed' | 'merged';
    created_at: string;
    updated_at: string;
    merged_at?: string;
    labels: string[];
    reviewers: string[];
}

export interface IssueData {
    number: number;
    title: string;
    body: string;
    author: string;
    state: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    labels: string[];
    assignees: string[];
}

export class GitHubCaptureEngine {
    private githubToken: string | null = null;
    private repoOwner: string | null = null;
    private repoName: string | null = null;

    constructor(
        private workspaceRoot: string,
        private persistence: PersistenceManager,
        private eventAggregator: EventAggregator
    ) {
        this.persistence.logWithEmoji('🐙', 'GitHubCaptureEngine initialized');
        this.detectGitHubRepo();
        this.loadGitHubToken();
    }

    public start(): void {
        if (!this.githubToken || !this.repoOwner || !this.repoName) {
            this.persistence.logWithEmoji('⚠️', 'GitHub integration disabled - no token or repo detected');
            return;
        }

        this.persistence.logWithEmoji('🚀', 'GitHubCaptureEngine started - polling for commits');
        
        // Poll for commits every 30 seconds
        setInterval(() => {
            this.checkCommits();
        }, 30000);
        
        // Also check immediately
        this.checkCommits();
    }

    private async checkCommits(): Promise<void> {
        if (!this.githubToken || !this.repoOwner || !this.repoName) {
            return;
        }

        try {
            // Fetch recent commits from GitHub API
            const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits?per_page=10&page=1`;
            const commits = await this.apiRequest(url);
            
            if (!Array.isArray(commits)) {
                return;
            }

            // Parse each commit for PR/Issue references
            for (const commit of commits) {
                const message = commit.commit.message;
                const refs = this.parseCommitReferences(message);
                
                if (refs.prs.length > 0 || refs.issues.length > 0) {
                    this.persistence.logWithEmoji('🔗', `Commit #${commit.sha.substring(0, 7)}: ${refs.prs.length} PRs, ${refs.issues.length} Issues`);
                    
                    // Fetch and link PRs
                    for (const prNumber of refs.prs) {
                        await this.fetchPR(prNumber);
                    }
                    
                    // Fetch and link Issues
                    for (const issueNumber of refs.issues) {
                        await this.fetchIssue(issueNumber);
                    }
                }
            }
        } catch (error) {
            // Silent error - don't spam logs
        }
    }

    /**
     * Parse PR and Issue references from commit message
     */
    public parseCommitReferences(message: string): { prs: number[]; issues: number[] } {
        const prs: number[] = [];
        const issues: number[] = [];
        
        // Only match well-formed closing patterns, ignore standalone #numbers
        const closePatterns = [
            /(?:fix|fixes|fixed|resolve|resolves|resolved|close|closes|closed)\s+#(\d+)/gi,
            /(?:referenc|relat|see)\s*to\s+#(\d+)/gi
        ];
        
        for (const pattern of closePatterns) {
            const matches = message.matchAll(pattern);
            for (const match of matches) {
                const num = parseInt(match[1]);
                if (!prs.includes(num) && !issues.includes(num)) {
                    issues.push(num);
                }
            }
        }
        
        // Also check for explicit PR references (rare but possible)
        const prPattern = /PR\s*#?(\d+)/gi;
        const prMatches = message.matchAll(prPattern);
        for (const match of prMatches) {
            const num = parseInt(match[1]);
            if (!prs.includes(num)) {
                prs.push(num);
            }
        }
        
        return { prs, issues };
    }

    /**
     * Detect GitHub repository from .git/config
     */
    private detectGitHubRepo(): void {
        try {
            const gitConfigPath = path.join(this.workspaceRoot, '.git', 'config');
            
            if (!fs.existsSync(gitConfigPath)) {
                return;
            }

            const config = fs.readFileSync(gitConfigPath, 'utf-8');
            const match = config.match(/url\s*=\s*(?:https?:\/\/)?github\.com[\/:]([\w\-\.]+)\/([\w\-\.]+)(?:\.git)?/);
            
            if (match) {
                this.repoOwner = match[1];
                this.repoName = match[2].replace('.git', '');
                this.persistence.logWithEmoji('✅', `GitHub repo detected: ${this.repoOwner}/${this.repoName}`);
            }
        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to detect GitHub repo: ${error}`);
        }
    }

    /**
     * Load GitHub token from environment or config
     */
    private loadGitHubToken(): void {
        // Load from VS Code settings
        const vscode = require('vscode');
        const config = vscode.workspace.getConfiguration('reasoningLayer');
        this.githubToken = config.get('githubToken', null);
        
        if (!this.githubToken) {
            this.persistence.logWithEmoji('⚠️', 'GitHub token not found in settings - please configure via command');
        } else {
            this.persistence.logWithEmoji('🔑', 'GitHub token loaded from settings');
        }
    }

    /**
     * Fetch PR data from GitHub API
     */
    public async fetchPR(prNumber: number): Promise<PRData | null> {
        if (!this.githubToken || !this.repoOwner || !this.repoName) {
            return null;
        }

        try {
            const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/pulls/${prNumber}`;
            const response = await this.apiRequest(url);
            
            const prData: PRData = {
                number: response.number,
                title: response.title,
                body: response.body || '',
                author: response.user.login,
                state: response.state as 'open' | 'closed' | 'merged',
                created_at: response.created_at,
                updated_at: response.updated_at,
                merged_at: response.merged_at || undefined,
                labels: response.labels.map((label: any) => label.name),
                reviewers: []
            };

            // Fetch reviewers
            const reviewsUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/pulls/${prNumber}/reviews`;
            const reviewsResponse = await this.apiRequest(reviewsUrl);
            
            if (Array.isArray(reviewsResponse)) {
                prData.reviewers = [...new Set(reviewsResponse.map((review: any) => review.user.login))];
            }

            this.persistence.logWithEmoji('📝', `PR #${prNumber} fetched: ${prData.title}`);
            
            // Capture as event
            this.eventAggregator.captureEvent(
                'pr_linked',
                `pr-${prNumber}`,
                {
                    pr_data: prData,
                    level: '4 - Evidence & Trace',
                    category: 'PR Linked'
                }
            );

            return prData;
        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to fetch PR #${prNumber}: ${error}`);
            return null;
        }
    }

    /**
     * Fetch Issue data from GitHub API
     */
    public async fetchIssue(issueNumber: number): Promise<IssueData | null> {
        if (!this.githubToken || !this.repoOwner || !this.repoName) {
            return null;
        }

        try {
            const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues/${issueNumber}`;
            const response = await this.apiRequest(url);
            
            const issueData: IssueData = {
                number: response.number,
                title: response.title,
                body: response.body || '',
                author: response.user.login,
                state: response.state as 'open' | 'closed',
                created_at: response.created_at,
                updated_at: response.updated_at,
                labels: response.labels.map((label: any) => label.name),
                assignees: response.assignees.map((assignee: any) => assignee.login)
            };

            this.persistence.logWithEmoji('📋', `Issue #${issueNumber} fetched: ${issueData.title}`);
            
            // Capture as event
            this.eventAggregator.captureEvent(
                'issue_linked',
                `issue-${issueNumber}`,
                {
                    issue_data: issueData,
                    level: '4 - Evidence & Trace',
                    category: 'Issue Linked'
                }
            );

            return issueData;
        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to fetch Issue #${issueNumber}: ${error}`);
            return null;
        }
    }


    /**
     * Generic API request helper
     */
    private apiRequest(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Reasoning-Layer-V3',
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`GitHub API error: ${res.statusCode} ${res.statusMessage}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    public stop(): void {
        this.persistence.logWithEmoji('🛑', 'GitHubCaptureEngine stopped');
    }
}

