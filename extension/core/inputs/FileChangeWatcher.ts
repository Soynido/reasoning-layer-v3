import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { v4 as uuidv4 } from 'uuid';
import { CaptureEvent } from '../types';
import { UnifiedLogger } from '../UnifiedLogger';

/**
 * FileChangeWatcher - Input Layer Component (Phase 2)
 * 
 * Watches file system changes and detects modification patterns.
 * Correlates changes with Git commits and identifies refactoring patterns.
 * 
 * Features:
 * - Real-time file watching (via chokidar)
 * - Pattern detection (refactor, feature, fix, test, docs)
 * - Change correlation (related files modified together)
 * - Feed into PatternLearningEngine
 * - Burst detection (multiple files changed rapidly)
 */
export class FileChangeWatcher {
    private workspaceRoot: string;
    private logger: UnifiedLogger;
    private watcher: chokidar.FSWatcher | null = null;
    private isWatching: boolean = false;
    private changeBuffer: Map<string, FileChange> = new Map();
    private burstTimeout: NodeJS.Timeout | null = null;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logger = UnifiedLogger.getInstance();
    }

    /**
     * Start watching for file changes
     */
    public async startWatching(): Promise<void> {
        if (this.isWatching) {
            this.logger.warn('⚠️ FileChangeWatcher already watching.');
            return;
        }

        this.isWatching = true;
        this.logger.log('🎧 FileChangeWatcher started');

        // Configure chokidar
        this.watcher = chokidar.watch('.', {
            cwd: this.workspaceRoot,
            ignored: this.getIgnorePatterns(),
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            },
            depth: 10
        });

        // Listen to events
        this.watcher
            .on('add', (filePath) => this.onFileAdded(filePath))
            .on('change', (filePath) => this.onFileChanged(filePath))
            .on('unlink', (filePath) => this.onFileDeleted(filePath))
            .on('error', (error) => this.onError(error));

        this.logger.log('✅ FileChangeWatcher watching workspace');
    }

    /**
     * Stop watching
     */
    public async stopWatching(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        this.isWatching = false;
        this.logger.log('🎧 FileChangeWatcher stopped');
    }

    /**
     * Get patterns to ignore
     */
    private getIgnorePatterns(): RegExp[] {
        return [
            /(^|[\/\\])\../,  // Hidden files
            /node_modules/,
            /\.git\//,
            /\.vscode\//,
            /out\//,
            /dist\//,
            /build\//,
            /\.reasoning\//,
            /\.cache\//,
            /coverage\//,
            /\.map$/,
            /\.tmp$/,
            /\.log$/,
            /\.lock$/
        ];
    }

    /**
     * Handle file added
     */
    private async onFileAdded(filePath: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, filePath);
        
        this.logger.log(`📝 File added: ${filePath}`);
        
        const change: FileChange = {
            type: 'add',
            path: filePath,
            timestamp: new Date().toISOString(),
            size: this.getFileSize(fullPath),
            extension: path.extname(filePath)
        };

        this.bufferChange(filePath, change);
    }

    /**
     * Handle file changed
     */
    private async onFileChanged(filePath: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, filePath);
        
        this.logger.log(`📝 File changed: ${filePath}`);
        
        const change: FileChange = {
            type: 'change',
            path: filePath,
            timestamp: new Date().toISOString(),
            size: this.getFileSize(fullPath),
            extension: path.extname(filePath)
        };

        this.bufferChange(filePath, change);
    }

    /**
     * Handle file deleted
     */
    private async onFileDeleted(filePath: string): Promise<void> {
        this.logger.log(`📝 File deleted: ${filePath}`);
        
        const change: FileChange = {
            type: 'delete',
            path: filePath,
            timestamp: new Date().toISOString(),
            size: 0,
            extension: path.extname(filePath)
        };

        this.bufferChange(filePath, change);
    }

    /**
     * Handle errors
     */
    private onError(error: Error): void {
        this.logger.warn(`⚠️ FileChangeWatcher error: ${error.message}`);
    }

    /**
     * Buffer changes to detect bursts
     */
    private bufferChange(filePath: string, change: FileChange): void {
        this.changeBuffer.set(filePath, change);

        // Clear existing timeout
        if (this.burstTimeout) {
            clearTimeout(this.burstTimeout);
        }

        // Wait for burst to complete (1 second of inactivity)
        this.burstTimeout = setTimeout(() => {
            this.processBurst();
        }, 1000);
    }

    /**
     * Process burst of changes
     */
    private async processBurst(): Promise<void> {
        if (this.changeBuffer.size === 0) return;

        const changes = Array.from(this.changeBuffer.values());
        const pattern = this.detectPattern(changes);

        this.logger.log(`🔍 Detected pattern: ${pattern.type} (${changes.length} files)`);

        // Create capture event
        const event = this.createCaptureEvent(changes, pattern);

        // Save to traces
        await this.saveToTraces(event);

        // Clear buffer
        this.changeBuffer.clear();
    }

    /**
     * Detect modification pattern
     */
    private detectPattern(changes: FileChange[]): ChangePattern {
        const pattern: ChangePattern = {
            type: 'unknown',
            confidence: 0,
            indicators: []
        };

        // Analyze file paths
        const paths = changes.map(c => c.path);
        const extensions = [...new Set(changes.map(c => c.extension))];

        // Test pattern: many files in same directory
        if (this.areFilesInSameDirectory(paths)) {
            pattern.indicators.push('same_directory');
        }

        // Refactor pattern: multiple files with similar changes
        if (changes.length >= 3) {
            pattern.type = 'refactor';
            pattern.confidence = 0.7;
            pattern.indicators.push('multi_file_change');
        }

        // Feature pattern: new files added
        if (changes.some(c => c.type === 'add')) {
            pattern.type = 'feature';
            pattern.confidence = 0.8;
            pattern.indicators.push('new_files');
        }

        // Fix pattern: single file modified
        if (changes.length === 1 && changes[0].type === 'change') {
            pattern.type = 'fix';
            pattern.confidence = 0.6;
            pattern.indicators.push('single_file');
        }

        // Test pattern: test files modified
        if (paths.some(p => /test|spec|__tests__/.test(p))) {
            pattern.type = 'test';
            pattern.confidence = 0.9;
            pattern.indicators.push('test_files');
        }

        // Docs pattern: markdown files
        if (extensions.includes('.md') || extensions.includes('.txt')) {
            pattern.type = 'docs';
            pattern.confidence = 0.85;
            pattern.indicators.push('documentation');
        }

        // Config pattern: config files
        if (paths.some(p => /config|\.json|\.yaml|\.yml|\.env/.test(p))) {
            pattern.type = 'config';
            pattern.confidence = 0.8;
            pattern.indicators.push('config_files');
        }

        // Refactor boost: TypeScript/JavaScript files with shared imports
        if (extensions.includes('.ts') || extensions.includes('.js')) {
            if (this.likelySharedRefactor(paths)) {
                pattern.type = 'refactor';
                pattern.confidence = Math.max(pattern.confidence, 0.85);
                pattern.indicators.push('shared_refactor');
            }
        }

        return pattern;
    }

    /**
     * Check if files are in same directory
     */
    private areFilesInSameDirectory(paths: string[]): boolean {
        if (paths.length < 2) return false;
        const dirs = paths.map(p => path.dirname(p));
        return dirs.every(d => d === dirs[0]);
    }

    /**
     * Check if likely a shared refactor
     */
    private likelySharedRefactor(paths: string[]): boolean {
        // Check if files share a common prefix (same module)
        const commonPrefix = this.getCommonPrefix(paths);
        return commonPrefix.length > 10; // At least 10 chars common path
    }

    /**
     * Get common prefix of paths
     */
    private getCommonPrefix(paths: string[]): string {
        if (paths.length === 0) return '';
        if (paths.length === 1) return paths[0];

        let prefix = paths[0];
        for (let i = 1; i < paths.length; i++) {
            while (!paths[i].startsWith(prefix)) {
                prefix = prefix.slice(0, -1);
                if (prefix === '') return '';
            }
        }
        return prefix;
    }

    /**
     * Get file size safely
     */
    private getFileSize(filePath: string): number {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Create capture event from changes
     */
    private createCaptureEvent(changes: FileChange[], pattern: ChangePattern): CaptureEvent {
        return {
            id: uuidv4(),
            type: 'file_change',
            timestamp: new Date().toISOString(),
            source: 'FileChangeWatcher',
            metadata: {
                burst: true,  // Indicates this is a burst of changes, not a single file
                changes: changes.map(c => ({
                    type: c.type,
                    path: c.path,
                    extension: c.extension,
                    size: c.size
                })),
                pattern: {
                    type: pattern.type,
                    confidence: pattern.confidence,
                    indicators: pattern.indicators
                },
                file_count: changes.length,
                total_size: changes.reduce((sum, c) => sum + c.size, 0),
                extensions: [...new Set(changes.map(c => c.extension))],
                cognitive_relevance: this.calculateCognitiveRelevance(pattern),
                auto_captured: true,
                captured_by: 'FileChangeWatcher'
            }
        };
    }

    /**
     * Calculate cognitive relevance
     */
    private calculateCognitiveRelevance(pattern: ChangePattern): number {
        // Higher relevance for patterns indicating architectural changes
        const relevanceMap: Record<string, number> = {
            refactor: 0.9,
            feature: 0.8,
            config: 0.7,
            test: 0.6,
            docs: 0.5,
            fix: 0.4,
            unknown: 0.3
        };

        return relevanceMap[pattern.type] || 0.3;
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
    public getStats(): WatcherStats {
        return {
            isWatching: this.isWatching,
            bufferedChanges: this.changeBuffer.size
        };
    }
}

/**
 * Types
 */
export interface FileChange {
    type: 'add' | 'change' | 'delete';
    path: string;
    timestamp: string;
    size: number;
    extension: string;
}

export interface ChangePattern {
    type: 'refactor' | 'feature' | 'fix' | 'test' | 'docs' | 'config' | 'unknown';
    confidence: number;
    indicators: string[];
}

export interface WatcherStats {
    isWatching: boolean;
    bufferedChanges: number;
}

