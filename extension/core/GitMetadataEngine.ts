import { exec } from 'child_process';
import { promisify } from 'util';
import { PersistenceManager } from './PersistenceManager';
import { EventAggregator } from './EventAggregator';
import { getGitDiffSummary, GitDiffSummary } from './gitUtils';
import { Logger } from './Logger';

const execAsync = promisify(exec);

export interface GitCommit {
    hash: string;
    author: string;
    email: string;
    timestamp: string;
    message: string;
    files: string[];
    insertions: number;
    deletions: number;
    branch: string;
}

export interface GitDiff {
    file: string;
    changes: string[];
    insertions: number;
    deletions: number;
    type: 'added' | 'modified' | 'deleted' | 'renamed';
}

export interface GitBranch {
    name: string;
    isCurrent: boolean;
    lastCommit: string;
    ahead: number;
    behind: number;
}

export class GitMetadataEngine {
    private lastCommitHash: string | null = null;
    private lastBranchHash: string | null = null;
    private watchers: NodeJS.Timeout[] = [];
    private logger: Logger;

    constructor(
        private workspaceRoot: string,
        private persistence: PersistenceManager,
        private eventAggregator: EventAggregator
    ) {
        this.logger = new Logger(workspaceRoot, 'Reasoning Layer V3 - Git');
        this.logger.info('GitMetadataEngine initialized', 'GitMetadataEngine');
        this.persistence.logWithEmoji('🌿', 'GitMetadataEngine initialized');
    }

    public async start(): Promise<void> {
        // Check if Git repository exists
        const isGitRepo = await this.checkGitRepository();
        if (!isGitRepo) {
            this.persistence.logWithEmoji('⚠️', 'No Git repository detected - GitMetadataEngine disabled');
            return;
        }

        this.startCommitWatcher();
        this.startBranchWatcher();
        
        // Capture initial
        await this.captureInitialGitData();
        
        this.persistence.logWithEmoji('🚀', 'GitMetadataEngine started');
    }

    private async checkGitRepository(): Promise<boolean> {
        try {
            await execAsync('git rev-parse --git-dir', { cwd: this.workspaceRoot });
            return true;
        } catch (error) {
            return false;
        }
    }

    // ✅ Priorité 4: Git commits monitoring
    private startCommitWatcher(): void {
        const watcher = setInterval(async () => {
            try {
                const currentCommit = await this.getCurrentCommitHash();
                if (currentCommit && currentCommit !== this.lastCommitHash) {
                    await this.captureCommitData(currentCommit);
                    this.lastCommitHash = currentCommit;
                }
            } catch (error) {
                this.persistence.logWithEmoji('❌', `Failed to watch commits: ${error}`);
            }
        }, 5000); // Check every 5 seconds

        this.watchers.push(watcher);
        this.persistence.logWithEmoji('🌿', 'Git commit watcher started');
    }

    private startBranchWatcher(): void {
        const watcher = setInterval(async () => {
            try {
                const currentBranch = await this.getCurrentBranch();
                const branchHash = await this.generateBranchHash();
                
                if (branchHash !== this.lastBranchHash) {
                    await this.captureBranchData();
                    this.lastBranchHash = branchHash;
                }
            } catch (error) {
                this.persistence.logWithEmoji('❌', `Failed to watch branches: ${error}`);
            }
        }, 10000); // Check every 10 seconds

        this.watchers.push(watcher);
        this.persistence.logWithEmoji('🌿', 'Git branch watcher started');
    }

    private async getCurrentCommitHash(): Promise<string | null> {
        try {
            const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.workspaceRoot });
            return stdout.trim();
        } catch (error) {
            return null;
        }
    }

    private async getCurrentBranch(): Promise<string | null> {
        try {
            const { stdout } = await execAsync('git branch --show-current', { cwd: this.workspaceRoot });
            return stdout.trim();
        } catch (error) {
            return null;
        }
    }

    private async generateBranchHash(): Promise<string> {
        try {
            const { stdout } = await execAsync('git branch -v', { cwd: this.workspaceRoot });
            return this.generateHash(stdout);
        } catch (error) {
            return 'unknown';
        }
    }

    private async captureCommitData(commitHash: string): Promise<void> {
        try {
            const commit = await this.getCommitDetails(commitHash);
            const diffs = await this.getCommitDiffs(commitHash);
            
            // ✅ Enrichir avec diff summary via gitUtils (proven working)
            let diffSummary: GitDiffSummary | null = null;
            try {
                this.logger.debug(`Getting diff stats for ${commitHash.substring(0, 8)}`, 'GitCapture', { commitHash });

                diffSummary = await getGitDiffSummary(commitHash, this.workspaceRoot);

                this.logger.info(`Diff summary: ${diffSummary.insertions} insertions, ${diffSummary.deletions} deletions`, 'GitCapture', {
                    commitHash: commitHash.substring(0, 8),
                    files: diffSummary.files.length
                });

                this.persistence.logWithEmoji('🔍', `Diff summary: ${diffSummary.insertions} insertions, ${diffSummary.deletions} deletions`);

                // Appliquer les résultats au commit
                if (diffSummary) {
                    commit.insertions = diffSummary.insertions;
                    commit.deletions = diffSummary.deletions;

                    // Appliquer les résultats aux diffs individuels
                    if (diffSummary!.files.length > 0) {
                        diffs.forEach(diff => {
                            const fileInSummary = diffSummary!.files.includes(diff.file);
                            if (fileInSummary) {
                                // Pour l'instant, nous distribuons les chiffres uniformément
                                // TODO: améliorer avec parsing détaillé par fichier
                                const avgInsertions = Math.floor(diffSummary!.insertions / diffSummary!.files.length);
                                const avgDeletions = Math.floor(diffSummary!.deletions / diffSummary!.files.length);
                                diff.insertions = avgInsertions;
                                diff.deletions = avgDeletions;
                            }
                        });
                    }
                }

            } catch (diffError) {
                this.persistence.logWithEmoji('⚠️', `Could not get diff summary for ${commitHash}: ${diffError}`);
            }
            
            this.eventAggregator.captureEvent(
                'file_change',
                `git:${commitHash}`,
                {
                    type: 'git_commit',
                    commit,
                    diffs,
                    level: '1 - Code & Structure Technique',
                    category: 'Git Metadata',
                    totalFiles: commit.files.length,
                    totalChanges: commit.insertions + commit.deletions,
                    diffSummary: diffSummary ? {
                        insertions: diffSummary.insertions,
                        deletions: diffSummary.deletions,
                        files: diffSummary.files.length
                    } : null
                }
            );

            this.persistence.logWithEmoji('🌿', `Captured Git commit: ${commitHash.substring(0, 8)} - ${commit.files.length} files, ${commit.insertions + commit.deletions} changes`);

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to capture commit ${commitHash}: ${error}`);
        }
    }

    private async captureBranchData(): Promise<void> {
        try {
            const branches = await this.getBranchInfo();
            const currentBranch = await this.getCurrentBranch();
            
            this.eventAggregator.captureEvent(
                'file_change',
                `git:branches`,
                {
                    type: 'git_branches',
                    branches,
                    currentBranch,
                    level: '1 - Code & Structure Technique',
                    category: 'Git Metadata',
                    totalBranches: branches.length
                }
            );

            this.persistence.logWithEmoji('🌿', `Captured Git branches: ${branches.length} total, current: ${currentBranch}`);

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to capture branches: ${error}`);
        }
    }

    private async getCommitDetails(commitHash: string): Promise<GitCommit> {
        try {
            // Get commit details
            const { stdout: commitInfo } = await execAsync(`git show --pretty=format:"%H|%an|%ae|%ad|%s" --name-only --numstat ${commitHash}`, { cwd: this.workspaceRoot });
            
            const lines = commitInfo.split('\n');
            const [hash, author, email, date, message] = lines[0].split('|');
            
            // Parse files and stats
            const files: string[] = [];
            let insertions = 0;
            let deletions = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line && !line.includes('|')) {
                    files.push(line);
                } else if (line.includes('\t')) {
                    const parts = line.split('\t');
                    if (parts.length >= 3) {
                        const ins = parseInt(parts[0]) || 0;
                        const del = parseInt(parts[1]) || 0;
                        insertions += ins;
                        deletions += del;
                    }
                }
            }

            const currentBranch = await this.getCurrentBranch();

            return {
                hash: hash || commitHash,
                author: author || 'unknown',
                email: email || 'unknown',
                timestamp: date || new Date().toISOString(),
                message: message || 'no message',
                files,
                insertions,
                deletions,
                branch: currentBranch || 'unknown'
            };

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to get commit details: ${error}`);
            return {
                hash: commitHash,
                author: 'unknown',
                email: 'unknown',
                timestamp: new Date().toISOString(),
                message: 'error parsing commit',
                files: [],
                insertions: 0,
                deletions: 0,
                branch: 'unknown'
            };
        }
    }

    private async getCommitDiffs(commitHash: string): Promise<GitDiff[]> {
        try {
            const { stdout } = await execAsync(`git show --name-status ${commitHash}`, { cwd: this.workspaceRoot });
            
            const diffs: GitDiff[] = [];
            const lines = stdout.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.length > 0) {
                    const parts = trimmed.split('\t');
                    if (parts.length >= 2) {
                        const status = parts[0];
                        const file = parts[1];
                        
                        let type: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
                        if (status.includes('A')) type = 'added';
                        else if (status.includes('D')) type = 'deleted';
                        else if (status.includes('R')) type = 'renamed';
                        
                        diffs.push({
                            file,
                            changes: [],
                            insertions: 0,
                            deletions: 0,
                            type
                        });
                    }
                }
            }
            
            return diffs;

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to get commit diffs: ${error}`);
            return [];
        }
    }

    private async getBranchInfo(): Promise<GitBranch[]> {
        try {
            const { stdout } = await execAsync('git branch -v', { cwd: this.workspaceRoot });
            
            const branches: GitBranch[] = [];
            const lines = stdout.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('*')) {
                    const parts = trimmed.split(/\s+/);
                    if (parts.length >= 3) {
                        branches.push({
                            name: parts[0],
                            isCurrent: false,
                            lastCommit: parts[1],
                            ahead: 0,
                            behind: 0
                        });
                    }
                } else if (trimmed.startsWith('*')) {
                    const parts = trimmed.substring(1).trim().split(/\s+/);
                    if (parts.length >= 3) {
                        branches.push({
                            name: parts[0],
                            isCurrent: true,
                            lastCommit: parts[1],
                            ahead: 0,
                            behind: 0
                        });
                    }
                }
            }
            
            return branches;

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to get branch info: ${error}`);
            return [];
        }
    }

    private async captureInitialGitData(): Promise<void> {
        try {
            const currentCommit = await this.getCurrentCommitHash();
            if (currentCommit) {
                await this.captureCommitData(currentCommit);
                this.lastCommitHash = currentCommit;
            }
            
            await this.captureBranchData();
            this.lastBranchHash = await this.generateBranchHash();

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to capture initial Git data: ${error}`);
        }
    }

    private generateHash(content: string): string {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    public stop(): void {
        this.watchers.forEach(watcher => clearInterval(watcher));
        this.watchers = [];
        this.persistence.logWithEmoji('🛑', 'GitMetadataEngine stopped');
    }
}
