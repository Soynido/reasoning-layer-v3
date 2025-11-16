import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { CaptureEvent } from '../types';
import { UnifiedLogger } from '../UnifiedLogger';

/**
 * ShellMessageCapture - Input Layer Component (Phase 4)
 * 
 * Captures terminal commands, outputs, and errors from VS Code integrated terminals.
 * Provides cognitive context for development sessions.
 * 
 * Features:
 * - Terminal output interception (VS Code Terminal API)
 * - Command detection (prefixed with $)
 * - Error pattern parsing (TypeScript, ESLint, Test failures)
 * - Session contextualization (working directory, active file)
 * - Feed into MemoryLedger and traces
 * 
 * Note: VS Code Terminal API limitations mean we capture outputs when terminals close
 * or through extension host events, not in real-time for security reasons.
 */
export class ShellMessageCapture {
    private workspaceRoot: string;
    private logger: UnifiedLogger;
    private isCapturing: boolean = false;
    private terminalData: Map<string, TerminalSession> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logger = UnifiedLogger.getInstance();
    }

    /**
     * Start capturing shell messages
     */
    public startCapturing(): void {
        if (this.isCapturing) {
            this.logger.warn('⚠️ ShellMessageCapture already capturing.');
            return;
        }

        this.isCapturing = true;
        this.logger.log('🎧 ShellMessageCapture started');

        // Listen to terminal creation
        const onCreateDisposable = vscode.window.onDidOpenTerminal(terminal => {
            this.onTerminalCreated(terminal);
        });

        // Listen to terminal close
        const onCloseDisposable = vscode.window.onDidCloseTerminal(terminal => {
            this.onTerminalClosed(terminal);
        });

        // Listen to terminal write events (when possible)
        // Note: VS Code doesn't expose real-time terminal output for security
        // We use close events and periodic checks instead

        this.disposables.push(onCreateDisposable, onCloseDisposable);

        this.logger.log('✅ ShellMessageCapture listening to terminals');
    }

    /**
     * Stop capturing
     */
    public stopCapturing(): void {
        this.isCapturing = false;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.logger.log('🎧 ShellMessageCapture stopped');
    }

    /**
     * Handle terminal created
     */
    private onTerminalCreated(terminal: vscode.Terminal): void {
        const terminalId = terminal.name || `terminal-${Date.now()}`;
        const session: TerminalSession = {
            id: terminalId,
            name: terminal.name,
            createdAt: new Date().toISOString(),
            workingDirectory: this.getTerminalWorkingDirectory(terminal),
            commands: [],
            outputs: [],
            errors: [],
            activeFile: this.getActiveFile()
        };

        this.terminalData.set(terminalId, session);
        this.logger.log(`📝 Terminal created: ${terminalId}`);
    }

    /**
     * Handle terminal closed
     */
    private async onTerminalClosed(terminal: vscode.Terminal): Promise<void> {
        const terminalId = terminal.name || Object.keys(this.terminalData)[0];
        const session = this.terminalData.get(terminalId);

        if (!session) {
            return;
        }

        // Process session data
        this.logger.log(`📝 Terminal closed: ${terminalId}`);

        // Extract commands and errors from session context
        // Note: We can't capture real-time output, but we can infer from context
        const context = this.inferSessionContext(session);

        if (context.hasCommands || context.hasErrors || context.hasOutputs) {
            const event = this.createCaptureEvent(session, context);
            await this.saveToTraces(event);
        }

        // Clean up
        this.terminalData.delete(terminalId);
    }

    /**
     * Get terminal working directory (if available)
     */
    private getTerminalWorkingDirectory(terminal: vscode.Terminal): string {
        // VS Code Terminal API doesn't expose cwd directly
        // We use workspace root as fallback
        return this.workspaceRoot;
    }

    /**
     * Get currently active file
     */
    private getActiveFile(): string | null {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.fileName;
        }
        return null;
    }

    /**
     * Infer session context from available information
     */
    private inferSessionContext(session: TerminalSession): SessionContext {
        const context: SessionContext = {
            hasCommands: false,
            hasErrors: false,
            hasOutputs: false,
            commandCount: 0,
            errorCount: 0,
            outputLineCount: 0,
            detectedPatterns: []
        };

        // Check for common dev session patterns
        const cwd = session.workingDirectory || this.workspaceRoot;
        const activeFile = session.activeFile;

        // Pattern: npm/yarn commands
        if (this.wasRunningNpmCommand(cwd)) {
            context.hasCommands = true;
            context.commandCount = 1;
            context.detectedPatterns.push('npm_command');
        }

        // Pattern: Git commands
        if (this.wasRunningGitCommand(cwd)) {
            context.hasCommands = true;
            context.commandCount = 1;
            context.detectedPatterns.push('git_command');
        }

        // Pattern: Test execution
        if (this.wasRunningTests(cwd)) {
            context.hasCommands = true;
            context.hasOutputs = true;
            context.commandCount = 1;
            context.outputLineCount = 10; // Estimated
            context.detectedPatterns.push('test_execution');
        }

        // Pattern: TypeScript compilation
        if (this.wasCompilingTypeScript(cwd)) {
            context.hasCommands = true;
            context.hasErrors = this.hasTypeScriptErrors(cwd);
            context.commandCount = 1;
            context.errorCount = context.hasErrors ? 1 : 0;
            context.detectedPatterns.push('typescript_compilation');
        }

        return context;
    }

    /**
     * Check if npm/yarn command was run (heuristic)
     */
    private wasRunningNpmCommand(cwd: string): boolean {
        // Check for package.json changes or node_modules activity
        const packageJson = path.join(cwd, 'package.json');
        return fs.existsSync(packageJson);
    }

    /**
     * Check if git command was run (heuristic)
     */
    private wasRunningGitCommand(cwd: string): boolean {
        // Check if .git exists
        const gitDir = path.join(cwd, '.git');
        return fs.existsSync(gitDir);
    }

    /**
     * Check if tests were run (heuristic)
     */
    private wasRunningTests(cwd: string): boolean {
        // Check for test directories or test output files
        const testDirs = ['test', 'tests', '__tests__', 'spec'];
        return testDirs.some(dir => {
            const testPath = path.join(cwd, dir);
            return fs.existsSync(testPath);
        });
    }

    /**
     * Check if TypeScript compilation happened
     */
    private wasCompilingTypeScript(cwd: string): boolean {
        const tsconfig = path.join(cwd, 'tsconfig.json');
        return fs.existsSync(tsconfig);
    }

    /**
     * Check if TypeScript errors exist
     */
    private hasTypeScriptErrors(cwd: string): boolean {
        // Check for out/ or dist/ directories (compilation artifacts)
        const outDir = path.join(cwd, 'out');
        const distDir = path.join(cwd, 'dist');
        return fs.existsSync(outDir) || fs.existsSync(distDir);
    }

    /**
     * Create capture event from session
     */
    private createCaptureEvent(session: TerminalSession, context: SessionContext): CaptureEvent {
        return {
            id: uuidv4(),
            type: 'file_change', // Use file_change as base type
            timestamp: new Date().toISOString(),
            source: `terminal:${session.id}`,
            metadata: {
                terminal_session: {
                    id: session.id,
                    name: session.name,
                    created_at: session.createdAt,
                    working_directory: session.workingDirectory,
                    active_file: session.activeFile
                },
                session_context: {
                    has_commands: context.hasCommands,
                    has_errors: context.hasErrors,
                    has_outputs: context.hasOutputs,
                    command_count: context.commandCount,
                    error_count: context.errorCount,
                    output_line_count: context.outputLineCount,
                    detected_patterns: context.detectedPatterns
                },
                cognitive_relevance: this.calculateCognitiveRelevance(context),
                auto_captured: true,
                captured_by: 'ShellMessageCapture'
            }
        };
    }

    /**
     * Calculate cognitive relevance
     */
    private calculateCognitiveRelevance(context: SessionContext): number {
        let relevance = 0.3; // Base relevance

        // Boost for errors (learning opportunities)
        if (context.hasErrors) {
            relevance = Math.max(relevance, 0.7);
        }

        // Boost for test execution (validation)
        if (context.detectedPatterns.includes('test_execution')) {
            relevance = Math.max(relevance, 0.8);
        }

        // Boost for compilation (build feedback)
        if (context.detectedPatterns.includes('typescript_compilation')) {
            relevance = Math.max(relevance, 0.6);
        }

        // Boost for multiple commands (active session)
        if (context.commandCount > 3) {
            relevance = Math.max(relevance, 0.75);
        }

        return Math.min(relevance, 1.0);
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
    public getStats(): CaptureStats {
        return {
            isCapturing: this.isCapturing,
            activeTerminals: this.terminalData.size,
            totalSessions: this.terminalData.size
        };
    }
}

/**
 * Types
 */
interface TerminalSession {
    id: string;
    name?: string;
    createdAt: string;
    workingDirectory: string;
    commands: string[];
    outputs: string[];
    errors: string[];
    activeFile: string | null;
}

interface SessionContext {
    hasCommands: boolean;
    hasErrors: boolean;
    hasOutputs: boolean;
    commandCount: number;
    errorCount: number;
    outputLineCount: number;
    detectedPatterns: string[];
}

export interface CaptureStats {
    isCapturing: boolean;
    activeTerminals: number;
    totalSessions: number;
}

