import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface GitDiffSummary {
    files: string[];
    insertions: number;
    deletions: number;
}

export interface GitCommitDetails {
    hash: string;
    author: string;
    email: string;
    timestamp: string;
    message: string;
    files: string[];
    insertions: number;
    deletions: number;
}

export interface GitBranchInfo {
    name: string;
    isCurrent: boolean;
    lastCommit: string;
}

/**
 * Get the current Git branch name with proper handling of detached HEAD state
 */
export async function getCurrentBranch(workspaceRoot: string): Promise<string> {
    try {
        // Try git branch --show-current first
        const { stdout: branchOut } = await execAsync(`git branch --show-current`, { cwd: workspaceRoot, timeout: 5000 });
        const branch1 = branchOut.trim();
        if (branch1) {
            return branch1;
        }

        // Fallback to rev-parse for detached HEAD handling
        const { stdout: revOut } = await execAsync(`git rev-parse --abbrev-ref HEAD`, { cwd: workspaceRoot, timeout: 5000 });
        let branch2 = revOut.trim();

        // Handle detached HEAD state
        if (branch2 === 'HEAD') {
            branch2 = 'detached';
        }

        return branch2 || 'detached';
    } catch (error) {
        console.error(`[GitUtils] Failed to get current branch:`, error);
        return 'unknown';
    }
}

/**
 * Get Git diff summary for a specific commit using proven working commands
 */
export async function getGitDiffSummary(commitHash: string, workspaceRoot: string): Promise<GitDiffSummary> {
    try {
        console.log(`[GitUtils] Getting diff for ${commitHash.substring(0, 8)}`);

        // Use the exact command that we tested and confirmed works
        const { stdout: statOutput } = await execAsync(
            `git show --numstat ${commitHash}`,
            { cwd: workspaceRoot, timeout: 10000 }
        );

        console.log(`[GitUtils] Raw numstat output: ${JSON.stringify(statOutput)}`);

        // Parse insertions/deletions from numstat
        let insertions = 0;
        let deletions = 0;
        const files: string[] = [];
        const statLines = statOutput.split('\n');

        for (const line of statLines) {
            const trimmed = line.trim();
            // Look for lines that start with numbers (numstat format)
            if (trimmed && /^[0-9]/.test(trimmed) && line.includes('\t')) {
                const parts = line.split('\t');
                if (parts.length >= 3) {
                    const ins = parseInt(parts[0]) || 0;
                    const del = parseInt(parts[1]) || 0;
                    const file = parts[2];

                    insertions += ins;
                    deletions += del;
                    files.push(file);

                    console.log(`[GitUtils] Parsed: +${ins} -${del} for ${file}`);
                }
            }
        }

        console.log(`[GitUtils] Final result: ${files.length} files, +${insertions} -${deletions}`);

        return { files, insertions, deletions };
    } catch (error) {
        console.error(`[GitUtils] Failed to get diff summary for ${commitHash}:`, error);
        return { files: [], insertions: 0, deletions: 0 };
    }
}

/**
 * Get detailed commit information
 */
export async function getGitCommitDetails(commitHash: string, workspaceRoot: string): Promise<GitCommitDetails | null> {
    try {
        // Get commit metadata
        const { stdout: commitInfo } = await execAsync(
            `git show --pretty=format:"%H|%an|%ae|%ad|%s" --name-status ${commitHash}`,
            { cwd: workspaceRoot, timeout: 10000 }
        );

        const lines = commitInfo.split('\n');
        const [hash, author, email, date, message] = lines[0].split('|');

        // Parse files from name-status output
        const files: string[] = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes('\t')) {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    files.push(parts[1]);
                }
            }
        }

        // Get insertions/deletions
        const diffSummary = await getGitDiffSummary(commitHash, workspaceRoot);

        return {
            hash: hash || commitHash,
            author: author || 'unknown',
            email: email || 'unknown',
            timestamp: date || new Date().toISOString(),
            message: message || 'no message',
            files,
            insertions: diffSummary.insertions,
            deletions: diffSummary.deletions
        };

    } catch (error) {
        console.error(`[GitUtils] Failed to get commit details for ${commitHash}:`, error);
        return null;
    }
}

/**
 * Get all Git branches with current branch indication
 */
export async function getGitBranches(workspaceRoot: string): Promise<GitBranchInfo[]> {
    try {
        const { stdout } = await execAsync('git branch -v', { cwd: workspaceRoot, timeout: 5000 });

        const branches: GitBranchInfo[] = [];
        const lines = stdout.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('*')) {
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 3) {
                    branches.push({
                        name: parts[0],
                        isCurrent: false,
                        lastCommit: parts[1]
                    });
                }
            } else if (trimmed.startsWith('*')) {
                const parts = trimmed.substring(1).trim().split(/\s+/);
                if (parts.length >= 3) {
                    branches.push({
                        name: parts[0],
                        isCurrent: true,
                        lastCommit: parts[1]
                    });
                }
            }
        }

        return branches;

    } catch (error) {
        console.error(`[GitUtils] Failed to get branches:`, error);
        return [];
    }
}

/**
 * Get current commit hash
 */
export async function getCurrentCommitHash(workspaceRoot: string): Promise<string | null> {
    try {
        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workspaceRoot, timeout: 5000 });
        return stdout.trim();
    } catch (error) {
        console.error(`[GitUtils] Failed to get current commit hash:`, error);
        return null;
    }
}

/**
 * Check if the current directory is a Git repository
 */
export async function isGitRepository(workspaceRoot: string): Promise<boolean> {
    try {
        await execAsync('git rev-parse --git-dir', { cwd: workspaceRoot, timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}