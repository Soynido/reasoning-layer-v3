import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { CaptureEvent } from '../types';
import { UnifiedLogger } from '../UnifiedLogger';

const execAsync = promisify(exec);

/**
 * GitCommitListener - Input Layer Component
 * 
 * Listens to git commits and captures intent, context, and architectural decisions.
 * Part of the Tri-Layer Architecture (Input → Core → Output)
 * 
 * Features:
 * - Automatic commit detection (via git hooks or polling)
 * - Intent parsing from commit messages
 * - Context capture (files, author, stats)
 * - Feed into CaptureEngine for cognitive processing
 */
export class GitCommitListener {
    private workspaceRoot: string;
    private gitDir: string;
    private logger: UnifiedLogger;
    private isWatching: boolean = false;
    private lastCommitHash: string = '';

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.gitDir = path.join(workspaceRoot, '.git');
        this.logger = UnifiedLogger.getInstance();
    }

    /**
     * Check if this is a git repository
     */
    public isGitRepository(): boolean {
        return fs.existsSync(this.gitDir);
    }

    /**
     * Start watching for commits
     * Uses polling of .git/logs/HEAD for changes
     */
    public async startWatching(): Promise<void> {
        if (!this.isGitRepository()) {
            this.logger.warn('⚠️ Not a git repository. GitCommitListener disabled.');
            return;
        }

        if (this.isWatching) {
            this.logger.warn('⚠️ GitCommitListener already watching.');
            return;
        }

        this.isWatching = true;
        this.logger.log('🎧 GitCommitListener started');

        // Get current HEAD to avoid re-processing on start
        try {
            const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.workspaceRoot });
            this.lastCommitHash = stdout.trim();
        } catch (error) {
            // No commits yet, that's ok
            this.lastCommitHash = '';
        }

        // Install post-commit hook
        await this.installGitHook();

        // Also poll for commits (backup if hook fails)
        this.pollForCommits();
    }

    /**
     * Stop watching for commits
     */
    public stopWatching(): void {
        this.isWatching = false;
        this.logger.log('🎧 GitCommitListener stopped');
    }

    /**
     * Install git post-commit hook
     */
    private async installGitHook(): Promise<void> {
        const hookPath = path.join(this.gitDir, 'hooks', 'post-commit');
        const hookContent = `#!/bin/sh
# Reasoning Layer V3 - Commit Listener Hook
# Auto-installed by GitCommitListener

# Trigger RL3 commit capture
echo "🎧 RL3: Capturing commit..."

# Touch a marker file to trigger polling
touch "${this.gitDir}/.rl3-commit-marker"

exit 0
`;

        try {
            // Create hooks directory if it doesn't exist
            const hooksDir = path.join(this.gitDir, 'hooks');
            if (!fs.existsSync(hooksDir)) {
                fs.mkdirSync(hooksDir, { recursive: true });
            }

            // Check if hook already exists
            if (fs.existsSync(hookPath)) {
                const existing = fs.readFileSync(hookPath, 'utf-8');
                if (existing.includes('Reasoning Layer V3')) {
                    this.logger.log('✅ Git hook already installed');
                    return;
                }
            }

            // Write hook
            fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
            this.logger.log('✅ Git post-commit hook installed');
        } catch (error) {
            this.logger.warn(`⚠️ Could not install git hook: ${error}`);
        }
    }

    /**
     * Poll for new commits (fallback method)
     */
    private async pollForCommits(): Promise<void> {
        if (!this.isWatching) return;

        try {
            // Check for marker file from hook
            const markerPath = path.join(this.gitDir, '.rl3-commit-marker');
            if (fs.existsSync(markerPath)) {
                fs.unlinkSync(markerPath);
                await this.onCommitDetected();
            }

            // Also check HEAD directly
            const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.workspaceRoot });
            const currentHash = stdout.trim();

            if (currentHash && currentHash !== this.lastCommitHash) {
                this.lastCommitHash = currentHash;
                await this.onCommitDetected();
            }
        } catch (error) {
            // Ignore errors (might be no commits yet)
        }

        // Poll every 5 seconds
        if (this.isWatching) {
            setTimeout(() => this.pollForCommits(), 5000);
        }
    }

    /**
     * Handle commit detection
     */
    private async onCommitDetected(): Promise<void> {
        try {
            const context = await this.captureContext(this.lastCommitHash);
            
            this.logger.log(`🎧 Commit detected: ${context.message.substring(0, 50)}...`);
            
            // Create capture event
            const event = this.createCaptureEvent(context);
            
            // Save to traces
            await this.saveToTraces(event);
            
            this.logger.log(`✅ Commit captured: ${context.hash.substring(0, 7)}`);
        } catch (error) {
            this.logger.warn(`⚠️ Failed to capture commit: ${error}`);
        }
    }

    /**
     * Capture full commit context
     */
    private async captureContext(commitHash: string): Promise<CommitContext> {
        const context: CommitContext = {
            hash: commitHash,
            message: '',
            author: '',
            timestamp: new Date().toISOString(),
            filesChanged: [],
            insertions: 0,
            deletions: 0,
            intent: { type: 'unknown', keywords: [] }
        };

        try {
            // Get commit message
            const { stdout: message } = await execAsync(
                `git log -1 --pretty=format:%s ${commitHash}`,
                { cwd: this.workspaceRoot }
            );
            context.message = message.trim();

            // Get author
            const { stdout: author } = await execAsync(
                `git log -1 --pretty=format:%an ${commitHash}`,
                { cwd: this.workspaceRoot }
            );
            context.author = author.trim();

            // Get timestamp
            const { stdout: timestamp } = await execAsync(
                `git log -1 --pretty=format:%aI ${commitHash}`,
                { cwd: this.workspaceRoot }
            );
            context.timestamp = timestamp.trim();

            // Get files changed
            const { stdout: files } = await execAsync(
                `git diff-tree --no-commit-id --name-only -r ${commitHash}`,
                { cwd: this.workspaceRoot }
            );
            context.filesChanged = files.trim().split('\n').filter(f => f);

            // Get stats (insertions/deletions)
            const { stdout: stats } = await execAsync(
                `git show --stat --format="" ${commitHash}`,
                { cwd: this.workspaceRoot }
            );
            const statMatch = stats.match(/(\d+) insertion.*?(\d+) deletion/);
            if (statMatch) {
                context.insertions = parseInt(statMatch[1]) || 0;
                context.deletions = parseInt(statMatch[2]) || 0;
            }

            // Parse intent
            context.intent = this.parseIntent(context.message);

        } catch (error) {
            this.logger.warn(`⚠️ Error capturing commit context: ${error}`);
        }

        return context;
    }

    /**
     * Parse intent from commit message
     * Detects: feat, fix, refactor, docs, test, chore, style, perf
     */
    public parseIntent(message: string): CommitIntent {
        const messageLower = message.toLowerCase();
        
        // Detect conventional commit type
        const conventionalMatch = message.match(/^(feat|fix|refactor|docs|test|chore|style|perf|build|ci|revert)(\(.+?\))?:/i);
        
        let type: CommitIntent['type'] = 'unknown';
        
        if (conventionalMatch) {
            const commitType = conventionalMatch[1].toLowerCase();
            switch (commitType) {
                case 'feat': type = 'feature'; break;
                case 'fix': type = 'fix'; break;
                case 'refactor': type = 'refactor'; break;
                case 'docs': type = 'docs'; break;
                case 'test': type = 'test'; break;
                default: type = 'chore'; break;
            }
        } else {
            // Fallback: detect from keywords
            if (messageLower.includes('add') || messageLower.includes('implement') || messageLower.includes('create')) {
                type = 'feature';
            } else if (messageLower.includes('fix') || messageLower.includes('bug') || messageLower.includes('issue')) {
                type = 'fix';
            } else if (messageLower.includes('refactor') || messageLower.includes('restructur') || messageLower.includes('clean')) {
                type = 'refactor';
            } else if (messageLower.includes('doc') || messageLower.includes('readme')) {
                type = 'docs';
            } else if (messageLower.includes('test') || messageLower.includes('spec')) {
                type = 'test';
            }
        }

        // Extract keywords (cognitive markers)
        const keywords: string[] = [];
        const cognitiveMarkers = [
            'architecture', 'decision', 'reasoning', 'pattern', 'cognit',
            'audit', 'review', 'synthesis', 'forecast', 'learn',
            'input', 'output', 'layer', 'engine', 'listener',
            'autonomous', 'self', 'bootstrap', 'init'
        ];

        for (const marker of cognitiveMarkers) {
            if (messageLower.includes(marker)) {
                keywords.push(marker);
            }
        }

        // Detect if this is an architectural decision
        let decision: string | undefined;
        if (messageLower.includes('decision') || messageLower.includes('architecture') || 
            messageLower.includes('approach') || messageLower.includes('strategy')) {
            decision = message;
        }

        return { type, keywords, decision };
    }

    /**
     * Create a CaptureEvent from commit context
     */
    private createCaptureEvent(context: CommitContext): CaptureEvent {
        return {
            id: uuidv4(),
            type: 'git_commit',
            timestamp: context.timestamp,
            source: `git:${context.hash}`,
            metadata: {
                commit: {
                    hash: context.hash,
                    message: context.message,
                    author: context.author,
                    timestamp: context.timestamp,
                    files_changed: context.filesChanged,
                    insertions: context.insertions,
                    deletions: context.deletions
                },
                intent: context.intent,
                cognitive_relevance: context.intent.keywords.length > 0 ? 0.8 : 0.5,
                auto_captured: true,
                captured_by: 'GitCommitListener'
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
     * Update manifest with new event count
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
     * Get recent commits (for manual capture)
     */
    public async getRecentCommits(count: number = 10): Promise<CommitContext[]> {
        try {
            const { stdout } = await execAsync(
                `git log -${count} --pretty=format:%H`,
                { cwd: this.workspaceRoot }
            );
            
            const hashes = stdout.trim().split('\n');
            const commits: CommitContext[] = [];

            for (const hash of hashes) {
                if (hash) {
                    commits.push(await this.captureContext(hash));
                }
            }

            return commits;
        } catch (error) {
            this.logger.warn(`⚠️ Could not get recent commits: ${error}`);
            return [];
        }
    }
}

/**
 * Types
 */
export interface CommitContext {
    hash: string;
    message: string;
    author: string;
    timestamp: string;
    filesChanged: string[];
    insertions: number;
    deletions: number;
    intent: CommitIntent;
}

export interface CommitIntent {
    type: 'feature' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore' | 'unknown';
    keywords: string[];
    decision?: string;
}

