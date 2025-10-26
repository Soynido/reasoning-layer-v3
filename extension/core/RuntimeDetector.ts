import { Logger } from './Logger.js';

/**
 * Runtime detection for multi-environment support
 * Detects VS Code, Cursor, Claude Code and adapts capture strategy
 */

export type RuntimeEnvironment = 'vscode' | 'cursor' | 'claude' | 'unknown';

export interface RuntimeCapabilities {
    hasWorkspace: boolean;
    hasOnDidSaveTextDocument: boolean;
    hasOnDidChangeTextDocument: boolean;
    hasFileSystemWatcher: boolean;
    supportsCommands: boolean;
    name: string;
}

export class RuntimeDetector {
    private logger: Logger;
    private runtime: RuntimeEnvironment;
    private capabilities: RuntimeCapabilities;

    constructor(workspaceRoot: string) {
        this.logger = new Logger(workspaceRoot, 'RuntimeDetector');
        this.runtime = this.detectRuntime();
        this.capabilities = this.getRuntimeCapabilities();

        this.logger.info(`Runtime detected: ${this.runtime} (${this.capabilities.name})`);
    }

    /**
     * Detect current runtime environment
     */
    private detectRuntime(): RuntimeEnvironment {
        // Check if we're in VS Code extension context
        try {
            // Check for VS Code extension context indicators
            if (process?.env?.VSCODE_PID || process?.env?.VSCODE_IPC_HOOK) {
                // Additional check for Cursor-specific environment
                if (this.isCursorEnvironment()) {
                    return 'cursor';
                }
                return 'vscode';
            }
        } catch (error) {
            // Environment variables not available
        }

        // Check for Claude Code environment
        if (this.isClaudeEnvironment()) {
            return 'claude';
        }

        return 'unknown';
    }

    /**
     * Detect Cursor-specific environment indicators
     */
    private isCursorEnvironment(): boolean {
        try {
            // Cursor-specific environment variables or patterns
            return !!(
                process?.env?.CURSOR_WORKSPACE ||
                process?.env?.CURSOR_VERSION ||
                (process?.env?.VSCODE_IPC_HOOK && process?.env?.VSCODE_IPC_HOOK.includes('cursor'))
            );
        } catch {
            return false;
        }
    }

    /**
     * Detect Claude Code environment
     */
    private isClaudeEnvironment(): boolean {
        try {
            return !!(
                process?.env?.CLAUDE_CODE ||
                process?.env?.CLAUDE_SESSION ||
                process?.env?.CLAUDE_API_KEY ||
                process?.cwd()?.includes('claude')
            );
        } catch {
            return false;
        }
    }

    /**
     * Get capabilities for current runtime
     */
    private getRuntimeCapabilities(): RuntimeCapabilities {
        switch (this.runtime) {
            case 'vscode':
                return {
                    hasWorkspace: true,
                    hasOnDidSaveTextDocument: true,
                    hasOnDidChangeTextDocument: true,
                    hasFileSystemWatcher: true,
                    supportsCommands: true,
                    name: 'Visual Studio Code'
                };

            case 'cursor':
                return {
                    hasWorkspace: true,
                    hasOnDidSaveTextDocument: true,
                    hasOnDidChangeTextDocument: true,
                    hasFileSystemWatcher: true,
                    supportsCommands: true,
                    name: 'Cursor Editor'
                };

            case 'claude':
                return {
                    hasWorkspace: false, // Claude Code works differently
                    hasOnDidSaveTextDocument: false,
                    hasOnDidChangeTextDocument: false,
                    hasFileSystemWatcher: false,
                    supportsCommands: false,
                    name: 'Claude Code'
                };

            default:
                return {
                    hasWorkspace: false,
                    hasOnDidSaveTextDocument: false,
                    hasOnDidChangeTextDocument: false,
                    hasFileSystemWatcher: false,
                    supportsCommands: false,
                    name: 'Unknown Environment'
                };
        }
    }

    /**
     * Get current runtime
     */
    public getRuntime(): RuntimeEnvironment {
        return this.runtime;
    }

    /**
     * Get current runtime capabilities
     */
    public getCapabilities(): RuntimeCapabilities {
        return this.capabilities;
    }

    /**
     * Check if runtime supports VS Code API
     */
    public supportsVSCodeAPI(): boolean {
        return this.runtime === 'vscode' || this.runtime === 'cursor';
    }

    /**
     * Check if runtime requires FileSystemPoller
     */
    public requiresFileSystemPoller(): boolean {
        return this.runtime === 'claude' || this.runtime === 'unknown';
    }

    /**
     * Check if runtime supports commands
     */
    public supportsCommands(): boolean {
        return this.capabilities.supportsCommands;
    }

    /**
     * Get optimal capture strategy for this runtime
     */
    public getOptimalCaptureStrategy(): {
        useOnDidSaveTextDocument: boolean;
        useOnDidChangeTextDocument: boolean;
        useFileSystemWatcher: boolean;
        useFileSystemPoller: boolean;
        pollInterval?: number;
    } {
        if (this.requiresFileSystemPoller()) {
            return {
                useOnDidSaveTextDocument: false,
                useOnDidChangeTextDocument: false,
                useFileSystemWatcher: false,
                useFileSystemPoller: true,
                pollInterval: 3000 // 3 seconds for Claude compatibility
            };
        }

        return {
            useOnDidSaveTextDocument: this.capabilities.hasOnDidSaveTextDocument,
            useOnDidChangeTextDocument: this.capabilities.hasOnDidChangeTextDocument,
            useFileSystemWatcher: this.capabilities.hasFileSystemWatcher,
            useFileSystemPoller: false
        };
    }

    /**
     * Log runtime information for debugging
     */
    public logRuntimeInfo(): void {
        this.logger.info('=== Runtime Detection Complete ===');
        this.logger.info(`Runtime: ${this.runtime}`);
        this.logger.info(`Name: ${this.capabilities.name}`);
        this.logger.info(`VS Code API: ${this.supportsVSCodeAPI()}`);
        this.logger.info(`Commands: ${this.supportsCommands()}`);
        this.logger.info(`FileSystem Poller: ${this.requiresFileSystemPoller()}`);

        const strategy = this.getOptimalCaptureStrategy();
        this.logger.info('Optimal Capture Strategy:');
        this.logger.info(`  - OnDidSave: ${strategy.useOnDidSaveTextDocument}`);
        this.logger.info(`  - OnDidChange: ${strategy.useOnDidChangeTextDocument}`);
        this.logger.info(`  - FileSystemWatcher: ${strategy.useFileSystemWatcher}`);
        this.logger.info(`  - FileSystemPoller: ${strategy.useFileSystemPoller}`);
        if (strategy.pollInterval) {
            this.logger.info(`  - Poll Interval: ${strategy.pollInterval}ms`);
        }
        this.logger.info('================================');
    }
}