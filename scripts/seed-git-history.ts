#!/usr/bin/env ts-node
/**
 * GitHistorySeeder - Populate RL4 ledger with full Git history
 * 
 * This script:
 * 1. Reads all Git commits since 2024
 * 2. Converts each commit to a LedgerEntry
 * 3. Writes to .reasoning_rl4/ledger/rbom_ledger.jsonl
 * 
 * Usage: npm run seed:history
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CommitData {
    hash: string;
    message: string;
    author: string;
    timestamp: string;
    filesChanged: string[];
    insertions: number;
    deletions: number;
}

interface LedgerEntry {
    entry_id: string;
    type: string;
    target_id: string;
    timestamp: string;
    data: {
        hash: string;
        message: string;
        author: string;
        files_changed: string[];
        insertions: number;
        deletions: number;
        intent: {
            type: string;
            keywords: string[];
        };
    };
}

class GitHistorySeeder {
    private workspaceRoot: string;
    private ledgerPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.ledgerPath = path.join(workspaceRoot, '.reasoning_rl4', 'ledger', 'rbom_ledger.jsonl');
    }

    /**
     * Main seeding process
     */
    async seed(): Promise<void> {
        console.log('🌱 GitHistorySeeder — Populating RL4 ledger with Git history\n');

        // 1. Get all commits since 2024
        console.log('📚 Reading Git history since 2024...');
        const commits = this.getGitHistory();
        console.log(`✅ Found ${commits.length} commits\n`);

        // 2. Convert to ledger entries
        console.log('🔄 Converting commits to ledger entries...');
        const entries: LedgerEntry[] = commits.map(commit => this.convertToLedgerEntry(commit));
        console.log(`✅ Converted ${entries.length} entries\n`);

        // 3. Write to ledger
        console.log('💾 Writing to ledger...');
        await this.writeToLedger(entries);
        console.log(`✅ Written to ${this.ledgerPath}\n`);

        // 4. Stats
        console.log('📊 Seeding complete!');
        console.log(`  - Total commits: ${commits.length}`);
        console.log(`  - Ledger entries: ${entries.length}`);
        console.log(`  - Ledger size: ${this.getFileSize(this.ledgerPath)}\n`);
    }

    /**
     * Get all Git commits since 2024
     */
    private getGitHistory(): CommitData[] {
        const commits: CommitData[] = [];

        try {
            // Get commit hashes and timestamps
            const logOutput = execSync(
                'git log --since="2024-01-01" --pretty=format:"%H|%aI|%an|%s" --no-merges',
                { cwd: this.workspaceRoot, encoding: 'utf-8' }
            );

            const lines = logOutput.trim().split('\n');

            for (const line of lines) {
                if (!line) continue;

                const [hash, timestamp, author, ...messageParts] = line.split('|');
                const message = messageParts.join('|'); // Rejoin in case message contains |

                // Get file stats for this commit
                const statsOutput = execSync(
                    `git show --stat --format="" ${hash}`,
                    { cwd: this.workspaceRoot, encoding: 'utf-8' }
                ).trim();

                const filesChanged: string[] = [];
                let insertions = 0;
                let deletions = 0;

                // Parse stats
                const statsLines = statsOutput.split('\n');
                for (const statLine of statsLines) {
                    if (!statLine.trim()) continue;

                    // File line: " path/to/file.ts | 10 ++++------"
                    const fileMatch = statLine.match(/^\s*(.+?)\s*\|\s*(\d+)/);
                    if (fileMatch) {
                        filesChanged.push(fileMatch[1].trim());
                    }

                    // Summary line: " 3 files changed, 15 insertions(+), 5 deletions(-)"
                    const summaryMatch = statLine.match(/(\d+) insertion.*?(\d+) deletion/);
                    if (summaryMatch) {
                        insertions = parseInt(summaryMatch[1], 10);
                        deletions = parseInt(summaryMatch[2], 10);
                    }
                }

                commits.push({
                    hash,
                    message,
                    author,
                    timestamp,
                    filesChanged,
                    insertions,
                    deletions
                });
            }
        } catch (error) {
            console.error('❌ Error reading Git history:', error);
            throw error;
        }

        return commits;
    }

    /**
     * Convert commit to ledger entry
     */
    private convertToLedgerEntry(commit: CommitData): LedgerEntry {
        const intent = this.detectIntent(commit.message);

        return {
            entry_id: `git-${commit.hash.substring(0, 8)}-${Date.now()}`,
            type: 'decision', // Or 'adr', 'pattern', 'external'
            target_id: `adr-from-commit-${commit.hash.substring(0, 8)}`,
            timestamp: commit.timestamp,
            data: {
                hash: commit.hash,
                message: commit.message,
                author: commit.author,
                files_changed: commit.filesChanged,
                insertions: commit.insertions,
                deletions: commit.deletions,
                intent
            }
        };
    }

    /**
     * Detect intent from commit message (conventional commits)
     */
    private detectIntent(message: string): { type: string; keywords: string[] } {
        const messageLower = message.toLowerCase();
        let type = 'unknown';
        const keywords: string[] = [];

        // Conventional commit prefix
        const prefixMatch = message.match(/^(feat|fix|refactor|docs|test|chore|style|perf)(\(.+?\))?:/);
        if (prefixMatch) {
            const commitType = prefixMatch[1];
            switch (commitType) {
                case 'feat': type = 'feature'; break;
                case 'fix': type = 'fix'; break;
                case 'refactor': type = 'refactor'; break;
                case 'docs': type = 'docs'; break;
                case 'test': type = 'test'; break;
                default: type = 'chore'; break;
            }
        }

        // Detect cognitive keywords
        const cognitiveMarkers = [
            'architecture', 'decision', 'reasoning', 'pattern', 'cognit',
            'kernel', 'engine', 'listener', 'scheduler', 'ledger'
        ];

        for (const marker of cognitiveMarkers) {
            if (messageLower.includes(marker)) {
                keywords.push(marker);
            }
        }

        return { type, keywords };
    }

    /**
     * Write entries to ledger (append-only JSONL)
     */
    private async writeToLedger(entries: LedgerEntry[]): Promise<void> {
        // Ensure directory exists
        const ledgerDir = path.dirname(this.ledgerPath);
        if (!fs.existsSync(ledgerDir)) {
            fs.mkdirSync(ledgerDir, { recursive: true });
        }

        // Read existing entries to avoid duplicates
        const existingHashes = new Set<string>();
        if (fs.existsSync(this.ledgerPath)) {
            const existing = fs.readFileSync(this.ledgerPath, 'utf-8').trim().split('\n');
            for (const line of existing) {
                if (!line) continue;
                try {
                    const entry = JSON.parse(line);
                    if (entry.data?.hash) {
                        existingHashes.add(entry.data.hash);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        // Filter out duplicates
        const newEntries = entries.filter(entry => !existingHashes.has(entry.data.hash));

        // Append new entries
        const stream = fs.createWriteStream(this.ledgerPath, { flags: 'a' });
        for (const entry of newEntries) {
            stream.write(JSON.stringify(entry) + '\n');
        }
        stream.end();

        console.log(`  - New entries: ${newEntries.length}`);
        console.log(`  - Duplicates skipped: ${entries.length - newEntries.length}`);
    }

    /**
     * Get human-readable file size
     */
    private getFileSize(filePath: string): string {
        if (!fs.existsSync(filePath)) return '0 B';
        const stats = fs.statSync(filePath);
        const bytes = stats.size;
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        let size = bytes;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}

// Main execution
(async () => {
    const workspaceRoot = process.cwd();
    const seeder = new GitHistorySeeder(workspaceRoot);
    
    try {
        await seeder.seed();
        console.log('🎉 Seeding successful!');
        console.log('\n🚀 Next step: Trigger a cognitive cycle to analyze patterns');
        console.log('   Cmd+Shift+P → Reload Window\n');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
})();

