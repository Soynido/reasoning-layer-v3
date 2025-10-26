import * as chokidar from 'chokidar';
import simpleGit, { SimpleGit } from 'simple-git';
import { v4 as uuidv4 } from 'uuid';
import { PersistenceManager } from './PersistenceManager';
import { CaptureEvent } from './types';

export class CaptureEngine {
    private fileWatcher: chokidar.FSWatcher | null = null;
    private debounceMap = new Map<string, NodeJS.Timeout>();
    private git: SimpleGit;
    private lastCommitHash: string | null = null;
    private gitPollingInterval: NodeJS.Timeout | null = null;

    constructor(
        private workspaceRoot: string,
        private persistence: PersistenceManager
    ) {
        this.git = simpleGit(workspaceRoot);
    }

    public start(): void {
        this.startFileWatcher();
        this.startGitWatcher();
        this.persistence.logWithEmoji('🚀', 'CaptureEngine started');
    }

    // ✅ COPIÉ V2 - File watcher avec debouncing
    private startFileWatcher(): void {
        this.fileWatcher = chokidar.watch(this.workspaceRoot, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true
        });

        this.fileWatcher.on('change', (path) => {
            this.debounceFileChange(path, 'modify');
        });

        this.fileWatcher.on('add', (path) => {
            this.debounceFileChange(path, 'create');
        });

        this.fileWatcher.on('unlink', (path) => {
            this.debounceFileChange(path, 'delete');
        });
    }

    // ✅ COPIÉ V2 - Debouncing par fichier (2s au lieu de 1s)
    private debounceFileChange(filePath: string, changeType: 'create' | 'modify' | 'delete'): void {
        if (!this.shouldTrackFile(filePath)) {
            return;
        }

        const existingTimeout = this.debounceMap.get(filePath);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
            this.captureFileChange(filePath, changeType);
            this.debounceMap.delete(filePath);
        }, 2000); // 2 secondes (au lieu de 1s V2)

        this.debounceMap.set(filePath, timeout);
    }

    // ✅ COPIÉ V2 - Filtrage robuste
    private shouldTrackFile(filePath: string): boolean {
        const excludedPatterns = [
            /\.git\//,
            /node_modules\//,
            /\.vscode\//,
            /out\//,
            /dist\//,
            /build\//,
            /\.map$/,
            /\.tmp$/,
            /\.cache\//,
            /\.log$/
        ];

        return !excludedPatterns.some(pattern => pattern.test(filePath));
    }

    private captureFileChange(filePath: string, changeType: string): void {
        const event: CaptureEvent = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: 'file_change',
            source: filePath,
            metadata: { changeType }
        };

        this.persistence.saveEvent(event);
    }

    // ✅ NOUVEAU - Git watcher avec polling (5s)
    private startGitWatcher(): void {
        this.gitPollingInterval = setInterval(async () => {
            try {
                const log = await this.git.log({ n: 1 });
                const latestCommit = log.latest;

                if (latestCommit && latestCommit.hash !== this.lastCommitHash) {
                    this.captureGitCommit(latestCommit);
                    this.lastCommitHash = latestCommit.hash;
                }
            } catch (error) {
                // Git not initialized or error
            }
        }, 5000); // Poll every 5 seconds
    }

    private captureGitCommit(commit: any): void {
        const event: CaptureEvent = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: 'git_commit',
            source: commit.hash,
            metadata: {
                author: commit.author_name,
                message: commit.message,
                date: commit.date
            }
        };

        this.persistence.saveEvent(event);
        this.persistence.logWithEmoji('📝', `Git commit captured: ${commit.message.substring(0, 50)}`);
    }

    public stop(): void {
        if (this.fileWatcher) {
            this.fileWatcher.close();
        }
        if (this.gitPollingInterval) {
            clearInterval(this.gitPollingInterval);
        }
        this.debounceMap.forEach(timeout => clearTimeout(timeout));
        this.debounceMap.clear();
        this.persistence.logWithEmoji('🛑', 'CaptureEngine stopped');
    }
}
