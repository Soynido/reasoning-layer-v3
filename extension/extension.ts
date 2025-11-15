/**
 * RL4 Kernel - Ultra Minimal (Zero RL3 Dependencies)
 */

import * as vscode from 'vscode';
import { TimerRegistry } from './kernel/TimerRegistry';
import { StateRegistry } from './kernel/StateRegistry';
import { HealthMonitor } from './kernel/HealthMonitor';
import { CognitiveScheduler } from './kernel/CognitiveScheduler';
import { KernelAPI } from './kernel/KernelAPI';
import { ExecPool } from './kernel/ExecPool';
import { loadKernelConfig } from './kernel/config';
import { GitCommitListener } from './kernel/inputs/GitCommitListener';
import { FileChangeWatcher } from './kernel/inputs/FileChangeWatcher';
import { AppendOnlyWriter } from './kernel/AppendOnlyWriter';
import { KernelBootstrap } from './kernel/KernelBootstrap';
import { CognitiveLogger } from './kernel/CognitiveLogger';
import { ADRValidationCommands } from './commands/adr-validation';
import { UnifiedPromptBuilder } from './kernel/api/UnifiedPromptBuilder';
import { AdaptivePromptBuilder } from './kernel/api/AdaptivePromptBuilder';
import { ADRParser } from './kernel/api/ADRParser';
import { PlanTasksContextParser } from './kernel/api/PlanTasksContextParser';
import { FirstBootstrapEngine } from './kernel/bootstrap/FirstBootstrapEngine';
import { GitHubFineGrainedManager } from './core/integrations/GitHubFineGrainedManager';
import { CommitContextCollector } from './kernel/api/CommitContextCollector';
import { CommitPromptGenerator } from './kernel/api/CommitPromptGenerator';
import * as path from 'path';
import * as fs from 'fs';

// Cognitive Logger
let logger: CognitiveLogger | null = null;

// RL4 Kernel
let kernel: {
    timerRegistry: TimerRegistry;
    stateRegistry: StateRegistry;
    healthMonitor: HealthMonitor;
    scheduler: CognitiveScheduler;
    execPool: ExecPool;
    api: KernelAPI;
} | null = null;

// WebView Panel
let webviewPanel: vscode.WebviewPanel | null = null;

// Status Bar Item
let statusBarItem: vscode.StatusBarItem | null = null;

export async function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('RL4 Kernel requires a workspace folder');
        return;
    }
    
    // Create Cognitive Logger
    const outputChannel = vscode.window.createOutputChannel('RL4 Kernel');
    logger = new CognitiveLogger(workspaceRoot, outputChannel);
    outputChannel.show();
    
    logger.system('=== RL4 KERNEL — Cognitive Console ===', '🧠');
    logger.system(`Workspace: ${workspaceRoot}`, '📁');
    logger.system('=====================================', '═');
    
    // Load kernel configuration
    const kernelConfig = loadKernelConfig(workspaceRoot);
    
    // Initialize RL4 Kernel
    if (kernelConfig.USE_TIMER_REGISTRY) {
        logger.system('🔧 Initializing RL4 Kernel...', '🔧');
        
        // Create components
        const timerRegistry = new TimerRegistry();
        const stateRegistry = new StateRegistry(workspaceRoot);
        const healthMonitor = new HealthMonitor(workspaceRoot, timerRegistry);
        
        // Load bootstrap artifacts first (for ForecastEngine metrics)
        const bootstrap = KernelBootstrap.initialize(workspaceRoot);
        const forecastMetrics = bootstrap.metrics;
        
        const scheduler = new CognitiveScheduler(workspaceRoot, timerRegistry, logger, forecastMetrics);
        const execPool = new ExecPool(2, 2000, workspaceRoot);
        const api = new KernelAPI(
            timerRegistry,
            stateRegistry,
            healthMonitor,
            scheduler,
            new Map(),
            execPool
        );
        
        kernel = {
            timerRegistry,
            stateRegistry,
            healthMonitor,
            scheduler,
            execPool,
            api
        };
        
        logger.system('✅ RL4 Kernel components created', '✅');
        
        // Bootstrap already loaded above (before scheduler creation)
        if (bootstrap.initialized) {
            logger.system(`✅ Bootstrap complete: ${bootstrap.universals ? Object.keys(bootstrap.universals).length : 0} universals loaded`, '✅');
            
            // Load state into StateRegistry if available
            if (bootstrap.state) {
                // StateRegistry can be extended to accept loaded state
                logger.system('📦 Kernel state restored from artifacts', '📦');
            }
            
            // Log forecast baseline (now integrated into ForecastEngine)
            if (bootstrap.metrics?.forecast_precision) {
                logger.system(`📊 Forecast precision baseline: ${bootstrap.metrics.forecast_precision.toFixed(3)} (Phase E1 active)`, '📊');
            }
        } else {
            logger.warning('No kernel artifacts found, starting with default baseline (0.73)');
        }
        
        // Start health monitoring
        if (kernelConfig.USE_HEALTH_MONITOR) {
            healthMonitor.start(timerRegistry);
            logger.system('❤️ Health Monitor started', '❤️');
        }
        
        // Start CognitiveScheduler (double-delay for Extension Host stability)
        logger.system('🧠 Starting CognitiveScheduler (delayed start in 3s)...', '🧠');
        
        // External delay: Ensure kernel is fully initialized before scheduler starts
        const channel = outputChannel; // Capture for setTimeout callback
        setTimeout(async () => {
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ⏳ Scheduler: Starting delayed initialization...`);
            await scheduler.start(kernelConfig.cognitive_cycle_interval_ms);
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ✅ Scheduler started successfully`);
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] 🛡️ Watchdog active (${kernelConfig.cognitive_cycle_interval_ms}ms cycles)`);
            
            // Start Input Layer: GitCommitListener + FileChangeWatcher
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] 📥 Starting Input Layer...`);
            
            // 1. GitCommitListener (Phase 3: Uses CognitiveLogger + commit counter callback)
            const gitTracesWriter = new AppendOnlyWriter(path.join(workspaceRoot, '.reasoning_rl4', 'traces', 'git_commits.jsonl'));
            const gitListener = new GitCommitListener(
                workspaceRoot, 
                execPool, 
                gitTracesWriter, 
                logger || undefined,
                () => scheduler.incrementCommitCount() // Callback to increment commit counter for hourly summary
            );
            
            if (gitListener.isGitRepository()) {
                await gitListener.startWatching();
                channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ✅ GitCommitListener active`);
            } else {
                channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ⚠️ Not a Git repository, GitCommitListener disabled`);
            }
            
            // 2. FileChangeWatcher
            const fileTracesWriter = new AppendOnlyWriter(path.join(workspaceRoot, '.reasoning_rl4', 'traces', 'file_changes.jsonl'));
            const fileWatcher = new FileChangeWatcher(workspaceRoot, fileTracesWriter, logger || undefined);
            await fileWatcher.startWatching();
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ✅ FileChangeWatcher active`);
        }, 3000);
        
        // Register minimal commands
            context.subscriptions.push(
                vscode.commands.registerCommand('reasoning.kernel.status', () => {
                const timers = kernel!.timerRegistry.getActiveCount();
                const memUsage = process.memoryUsage();
                const uptime = process.uptime();
                
                const message = 
                        `🧠 RL4 Kernel Status:\n` +
                    `Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB\n` +
                    `Timers: ${timers.total}\n` +
                    `Uptime: ${Math.floor(uptime / 60)}min`;
                
                vscode.window.showInformationMessage(message);
                logger!.system(message);
            }),
            
                vscode.commands.registerCommand('reasoning.kernel.reflect', async () => {
                logger!.system('🧠 Running manual cycle...', '🧠');
                const result = await kernel!.scheduler.runCycle();
                const message = `✅ Cycle ${result.cycleId}: ${result.duration}ms, ${result.phases.length} phases`;
                vscode.window.showInformationMessage(message);
                logger!.system(message);
            }),
            
                vscode.commands.registerCommand('reasoning.kernel.flush', async () => {
                    await kernel!.api.flush();
                vscode.window.showInformationMessage('✅ Flushed');
                logger!.system('💾 All queues flushed', '💾');
            }),
            
            vscode.commands.registerCommand('reasoning.kernel.whereami', async () => {
                logger!.system('🧠 Generating cognitive snapshot...', '🧠');
                
                // Ask user to select Perception Angle mode
                const choice = await vscode.window.showQuickPick([
                    {
                        label: '🔴 Strict (0%)',
                        description: 'P0 only — Generate from existing RL4 data (~1s)',
                        detail: 'Focus ONLY on critical tasks',
                        mode: 'strict'
                    },
                    {
                        label: '🟡 Flexible (25%)',
                        description: 'P0+P1 OK — Generate from existing RL4 data (~1s)',
                        detail: 'Focus on P0+P1 tasks, minor scope changes OK',
                        mode: 'flexible'
                    },
                    {
                        label: '🟢 Exploratory (50%)',
                        description: 'New ideas welcome — Include recent history (~2s)',
                        detail: 'Welcome creative solutions, new features OK',
                        mode: 'exploratory'
                    },
                    {
                        label: '⚪ Free (100%)',
                        description: 'Creative mode — Include recent history (~2s)',
                        detail: 'All ideas welcome, no constraints',
                        mode: 'free'
                    },
                    {
                        label: '🔍 First Use (Deep Analysis)',
                        description: 'Analyze project history + Git commits (~5s)',
                        detail: 'Use on first RL4 install or to refresh context',
                        mode: 'firstUse'
                    }
                ], {
                    placeHolder: 'Select Perception Angle (mode)'
                });
                
                if (!choice) {
                    return; // User cancelled
                }
                
                try {
                    logger!.system(`📋 Generating snapshot (mode: ${choice.mode})...`, '📋');
                    
                    // Generate adaptive prompt with selected mode (Phase 5: Pass CognitiveLogger)
                    const promptBuilder = new AdaptivePromptBuilder(workspaceRoot, logger || undefined);
                    const snapshot = await promptBuilder.buildPrompt({
                        mode: choice.mode as any,
                        includeHistory: choice.mode === 'exploratory' || choice.mode === 'free' || choice.mode === 'firstUse',
                        includeGoals: true,
                        includeTechStack: true
                    });
                    
                    // Show in new document
                    const doc = await vscode.workspace.openTextDocument({
                        content: snapshot,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(doc);
                    
                    vscode.window.showInformationMessage(`✅ Snapshot generated (${choice.label})! Copy-paste it into your AI agent.`);
                    logger!.system('✅ Snapshot generated successfully', '✅');
                } catch (error) {
                    const msg = `❌ Failed to generate snapshot: ${error}`;
                    vscode.window.showErrorMessage(msg);
                    logger!.system(msg, '❌');
                }
            })
        );
        
        // Phase E2 Final: Register ADR Validation Commands
        ADRValidationCommands.registerCommands(context, workspaceRoot);
        
        // Phase E2.7: Create Status Bar Item for WebView
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.text = '$(brain) RL4 Dashboard';
        statusBarItem.tooltip = 'Click to open/close RL4 Cognitive Dashboard';
        statusBarItem.command = 'rl4.toggleWebview';
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
        logger.system('✅ Status Bar item created', '✅');
        
        // Phase E2.7: Create WebView Dashboard with auto-push snapshots
        logger.system('🖥️ Creating RL4 Dashboard WebView...', '🖥️');
        
        webviewPanel = vscode.window.createWebviewPanel(
            'rl4Webview',
            '🧠 RL4 Dashboard',
            { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'extension', 'webview', 'ui', 'dist')
                ]
            }
        );
        
        // Load WebView HTML
        webviewPanel.webview.html = getWebviewHtml(context, webviewPanel);
        logger.system('✅ WebView HTML loaded', '✅');
        
        // Phase E3.3: Handle messages from WebView
        const rl4Path = path.join(workspaceRoot, '.reasoning_rl4');
        const promptBuilder = new AdaptivePromptBuilder(workspaceRoot, logger || undefined);
        const adrParser = new ADRParser(rl4Path);
        const planParser = new PlanTasksContextParser(rl4Path);
        
        // Initialize ADRs.RL4 template if it doesn't exist
        const adrsPath = path.join(rl4Path, 'ADRs.RL4');
        if (!fs.existsSync(adrsPath)) {
            try {
                // Ensure .reasoning_rl4 directory exists
                if (!fs.existsSync(rl4Path)) {
                    fs.mkdirSync(rl4Path, { recursive: true });
                }
                
                // Create template ADRs.RL4 file
                const template = `# ADRs (Architecture Decision Records)

This file contains Architecture Decision Records (ADRs) for this project.

## Format

Each ADR follows this structure:

\`\`\`markdown
## ADR-XXX: [Title]

**Status**: proposed | accepted | rejected | deprecated | superseded
**Date**: YYYY-MM-DD
**Author**: [Author name]

### Context

[Describe the context and problem that led to this decision]

### Decision

[Describe the decision made]

### Consequences

**Positive:**
- [List positive consequences]

**Negative:**
- [List negative consequences]

**Risks:**
- [List potential risks]

**Alternatives Considered:**
- [List alternatives that were considered]
\`\`\`

## How to Use

1. When the LLM (agent) proposes an ADR, add it to this file
2. RL4 will automatically detect the change and parse it
3. The ADR will be added to the ledger (\`.reasoning_rl4/ledger/adrs.jsonl\`)
4. Future prompts will include this ADR in the context

---

_This file is managed by RL4. Add ADRs here as they are proposed by the agent._
`;
                
                fs.writeFileSync(adrsPath, template, 'utf-8');
                logger.system('📜 Created ADRs.RL4 template', '📜');
            } catch (error) {
                logger.warning(`Failed to create ADRs.RL4 template: ${error}`);
            }
        }
        
        // Helper: Send Context.RL4 to WebView for initial KPI load
        const sendContextToWebView = async () => {
            if (webviewPanel) {
                try {
                    const fs = await import('fs/promises');
                    const contextPath = path.join(rl4Path, 'Context.RL4');
                    const contextContent = await fs.readFile(contextPath, 'utf-8');
                    
                    webviewPanel.webview.postMessage({
                        type: 'kpisUpdated',
                        payload: contextContent
                    });
                    
                    logger!.system('✅ Initial Context.RL4 sent to WebView', '✅');
                } catch (error) {
                    logger!.system(`⚠️ Context.RL4 not found yet (will use mock data)`, '⚠️');
                }
            }
        };
        
        // Wait 500ms for WebView to be ready, then send initial Context.RL4
        setTimeout(sendContextToWebView, 500);
        
        // Send initial GitHub status to WebView
        setTimeout(async () => {
            if (!webviewPanel) return;
            try {
                const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                const status = await ghManager.checkConnection();
                
                webviewPanel.webview.postMessage({
                    type: 'githubStatus',
                    payload: {
                        connected: status.ok,
                        repo: status.repo,
                        reason: status.reason
                    }
                });
            } catch (error) {
                logger!.warning(`Failed to check initial GitHub status: ${error}`);
            }
        }, 600);

        // Initialize default Plan/Tasks/Context files if needed
        await promptBuilder.initializeDefaults();
        
        // Initialize Cursor rules for RL4 strict mode enforcement
        ensureCursorRuleExists(workspaceRoot, logger);

        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('[RL4 Extension] Received message from WebView:', message.type);
                
                switch (message.type) {
                    case 'generateSnapshot':
                        try {
                            const deviationMode = message.deviationMode || 'flexible';
                            logger!.system(`📋 Generating snapshot (mode: ${deviationMode})...`, '📋');
                            const snapshot = await promptBuilder.generate(deviationMode);
                            
                            webviewPanel!.webview.postMessage({
                                type: 'snapshotGenerated',
                                payload: snapshot
                            });
                            
                            logger!.system(`✅ Snapshot generated (${snapshot.length} chars)`, '✅');
                        } catch (error) {
                            logger!.error(`Failed to generate snapshot: ${error}`);
                            webviewPanel!.webview.postMessage({
                                type: 'error',
                                payload: 'Failed to generate snapshot'
                            });
                        }
                        break;
                    
                    case 'openFile':
                        try {
                            const fileName = message.fileName;
                            if (!fileName) {
                                logger!.warning('openFile: fileName missing');
                                break;
                            }

                            const filePath = path.join(rl4Path, fileName);
                            const fileUri = vscode.Uri.file(filePath);

                            // Open file in editor
                            const document = await vscode.workspace.openTextDocument(fileUri);
                            await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

                            logger!.system(`📂 Opened ${fileName} in editor`, '📂');
                        } catch (error) {
                            logger!.error(`Failed to open file: ${error}`);
                            vscode.window.showErrorMessage(`Failed to open ${message.fileName}: ${error}`);
                        }
                        break;
                    
                    case 'connectGitHub':
                        try {
                            logger!.system('🔗 Starting GitHub integration setup...', '🔗');
                            const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                            await ghManager.setupIntegration();
                            
                            // Check status after setup
                            const status = await ghManager.checkConnection();
                            webviewPanel!.webview.postMessage({
                                type: 'githubConnected',
                                payload: status
                            });
                            
                            // Also send updated status
                            webviewPanel!.webview.postMessage({
                                type: 'githubStatus',
                                payload: {
                                    connected: status.ok,
                                    repo: status.repo,
                                    reason: status.reason
                                }
                            });
                            
                            logger!.system(`✅ GitHub integration setup completed`, '✅');
                        } catch (error) {
                            logger!.error(`Failed to setup GitHub integration: ${error}`);
                            webviewPanel!.webview.postMessage({
                                type: 'githubError',
                                payload: error instanceof Error ? error.message : 'Unknown error'
                            });
                        }
                        break;
                    
                    case 'checkGitHubStatus':
                        try {
                            const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                            const status = await ghManager.checkConnection();
                            
                            webviewPanel!.webview.postMessage({
                                type: 'githubStatus',
                                payload: {
                                    connected: status.ok,
                                    repo: status.repo,
                                    reason: status.reason
                                }
                            });
                        } catch (error) {
                            logger!.error(`Failed to check GitHub status: ${error}`);
                            webviewPanel!.webview.postMessage({
                                type: 'githubStatus',
                                payload: {
                                    connected: false,
                                    reason: 'error'
                                }
                            });
                        }
                        break;
                    
                    case 'generateCommitPrompt':
                        try {
                            logger!.system('📝 Collecting commit context...', '📝');
                            
                            const collector = new CommitContextCollector(workspaceRoot, kernel?.execPool);
                            const context = await collector.collectContext();
                            
                            const promptGenerator = new CommitPromptGenerator();
                            const prompt = promptGenerator.generatePrompt(context);
                            
                            // Copy to clipboard
                            await vscode.env.clipboard.writeText(prompt);
                            
                            webviewPanel!.webview.postMessage({
                                type: 'commitPromptGenerated',
                                payload: prompt
                            });
                            
                            logger!.system(`✅ Commit prompt generated (${prompt.length} chars) and copied to clipboard`, '✅');
                        } catch (error) {
                            logger!.error(`Failed to generate commit prompt: ${error}`);
                            webviewPanel!.webview.postMessage({
                                type: 'commitError',
                                payload: error instanceof Error ? error.message : 'Failed to generate prompt'
                            });
                        }
                        break;
                    
                    case 'submitCommitCommand':
                        // User pasted command from LLM - show it for validation
                        try {
                            const command = message.command;
                            if (!command) {
                                logger!.warning('submitCommitCommand: command missing');
                                break;
                            }
                            
                            webviewPanel!.webview.postMessage({
                                type: 'commitCommandReceived',
                                payload: command
                            });
                            
                            logger!.system('📋 Commit command received from LLM, waiting for validation', '📋');
                        } catch (error) {
                            logger!.error(`Failed to submit commit command: ${error}`);
                            webviewPanel!.webview.postMessage({
                                type: 'commitError',
                                payload: error instanceof Error ? error.message : 'Failed to submit command'
                            });
                        }
                        break;
                    
                    case 'executeCommitCommand':
                        try {
                            const command = message.command;
                            if (!command) {
                                logger!.warning('executeCommitCommand: command missing');
                                break;
                            }
                            
                            logger!.system('🚀 Executing Git workflow...', '🚀');
                            logger!.system(`Command: ${command.substring(0, 150)}...`, '📋');
                            
                            // Execute via ExecPool
                            if (kernel?.execPool) {
                                // Split commands by && and execute separately for better error handling
                                const commands = command.split(' && ').map((c: string) => c.trim()).filter((c: string) => c);
                                
                                logger!.system(`📋 Executing ${commands.length} workflow steps...`, '📋');
                                
                                let lastOutput = '';
                                let lastError = '';
                                
                                // Helper function to extract step name from command
                                const getStepName = (cmd: string): string => {
                                    if (cmd.includes('git checkout -b')) return 'Create branch';
                                    if (cmd.includes('git add')) return 'Stage changes';
                                    if (cmd.includes('git commit')) return 'Commit changes';
                                    if (cmd.includes('git push')) return 'Push branch';
                                    if (cmd.includes('gh pr create')) return 'Create PR';
                                    return 'Unknown step';
                                };
                                
                                for (let i = 0; i < commands.length; i++) {
                                    const cmd = commands[i];
                                    const stepName = getStepName(cmd);
                                    
                                    logger!.system(`📋 Step ${i + 1}/${commands.length}: ${stepName}...`, '📋');
                                    
                                    const shellCommand = process.platform === 'win32' 
                                        ? `cmd /c "${cmd.replace(/"/g, '\\"')}"`
                                        : `/bin/sh -c ${JSON.stringify(cmd)}`;
                                    
                                    const result = await kernel.execPool.run(shellCommand, { 
                                        cwd: workspaceRoot,
                                        timeout: 30000 // 30s timeout per step
                                    });
                                    
                                    lastOutput = result.stdout;
                                    lastError = result.stderr || '';
                                    
                                    // Check if step failed (excluding warnings and info messages)
                                    // Git/RL3/RL4 may output info messages to stderr that are not errors
                                    const isInfoMessage = lastError && (
                                        lastError.includes('Warning:') || 
                                        lastError.includes('warning:') ||
                                        lastError.includes('Switched to') ||
                                        lastError.includes('remote:') ||
                                        lastError.includes('Already on') ||
                                        lastError.includes('branch') ||
                                        lastError.includes('RL3:') ||
                                        lastError.includes('RL4:') ||
                                        lastError.includes('Capturing') ||
                                        lastError.includes('🎧') ||
                                        lastError.includes('✅') ||
                                        lastError.includes('📋') ||
                                        lastError.includes('🚀')
                                    );
                                    
                                    const hasError = result.timedOut || (
                                        lastError && 
                                        !isInfoMessage &&
                                        lastError.trim().length > 0 &&
                                        // Real errors usually contain words like "error", "fatal", "failed"
                                        (lastError.toLowerCase().includes('error') ||
                                         lastError.toLowerCase().includes('fatal') ||
                                         lastError.toLowerCase().includes('failed') ||
                                         lastError.toLowerCase().includes('denied') ||
                                         lastError.toLowerCase().includes('permission'))
                                    );
                                    
                                    if (hasError) {
                                        const errorMsg = result.timedOut 
                                            ? `Step ${i + 1} (${stepName}) timed out after 30s` 
                                            : `Step ${i + 1} (${stepName}) failed: ${lastError}`;
                                        logger!.error(`❌ ${errorMsg}`);
                                        throw new Error(errorMsg);
                                    }
                                    
                                    logger!.system(`✅ Step ${i + 1}/${commands.length} completed: ${stepName}`, '✅');
                                }
                                
                                // All steps completed successfully
                                webviewPanel!.webview.postMessage({
                                    type: 'commitExecuted',
                                    payload: lastOutput || 'Workflow completed successfully'
                                });
                                
                                logger!.system('✅ Git workflow completed successfully!', '✅');
                                
                                // Refresh GitHub status
                                const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                                const status = await ghManager.checkConnection();
                                webviewPanel!.webview.postMessage({
                                    type: 'githubStatus',
                                    payload: {
                                        connected: status.ok,
                                        repo: status.repo,
                                        reason: status.reason
                                    }
                                });
                            } else {
                                throw new Error('ExecPool not available');
                            }
                        } catch (error) {
                            logger!.error(`Failed to execute commit command: ${error}`);
                            webviewPanel!.webview.postMessage({
                                type: 'commitError',
                                payload: error instanceof Error ? error.message : 'Failed to execute command'
                            });
                        }
                        break;
                    
                    default:
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
        
        // Phase 6: Helper function to detect and log RL4 file changes
        const logRL4FileChange = async (fileType: 'Plan' | 'Tasks' | 'Context' | 'ADR', filePath: string) => {
            if (!logger) return;
            
            try {
                const fs = await import('fs/promises');
                const content = await fs.readFile(filePath, 'utf-8');
                
                // Extract version and updated from frontmatter (between --- markers)
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                let versionNew = 'unknown';
                let timestamp = new Date().toISOString();
                
                if (frontmatterMatch) {
                    const frontmatter = frontmatterMatch[1];
                    const versionMatch = frontmatter.match(/^version:\s*([^\n]+)/m);
                    const updatedMatch = frontmatter.match(/^updated:\s*([^\n]+)/m);
                    
                    if (versionMatch) versionNew = versionMatch[1].trim();
                    if (updatedMatch) timestamp = updatedMatch[1].trim();
                }
                
                // Detect who made the change (try to get Git author from last commit, fallback to "User")
                let updatedBy = 'User';
                try {
                    const { exec } = require('child_process');
                    const { promisify } = require('util');
                    const execAsync = promisify(exec);
                    
                    // Get last commit author for this file
                    const result = await execAsync(`git log -1 --pretty=format:"%an" -- "${filePath}"`, {
                        cwd: workspaceRoot,
                        timeout: 2000
                    });
                    if (result.stdout && result.stdout.trim()) {
                        updatedBy = result.stdout.trim();
                    }
                } catch (gitError) {
                    // Fallback to "User" if Git fails
                }
                
                // Extract a summary of changes (detect key sections modified)
                let changes = 'Content updated';
                if (fileType === 'Plan' && content.includes('Phase:')) {
                    const phaseMatch = content.match(/Phase:\s*([^\n]+)/);
                    if (phaseMatch) changes = `Phase updated: ${phaseMatch[1].trim()}`;
                } else if (fileType === 'Tasks' && content.includes('Tasks:')) {
                    const taskCount = (content.match(/- \[/g) || []).length;
                    changes = `${taskCount} task(s) in file`;
                } else if (fileType === 'Context' && content.includes('KPIs')) {
                    changes = 'KPIs updated';
                } else if (fileType === 'ADR' && content.includes('## ADR-')) {
                    const adrCount = (content.match(/## ADR-/g) || []).length;
                    changes = `${adrCount} ADR(s) in file`;
                }
                
                // Get old version from cache (if available) or use "unknown"
                const versionOld = 'unknown'; // TODO: Cache previous versions for comparison
                
                // Log via CognitiveLogger
                logger.logRL4FileUpdate(fileType, {
                    file: fileType,
                    updated_by: updatedBy,
                    changes: changes,
                    version_old: versionOld,
                    version_new: versionNew,
                    timestamp: timestamp
                });
            } catch (error) {
                logger.warning(`Failed to log ${fileType}.RL4 change: ${error}`);
            }
        };

        // Phase E3.3: Setup FileWatchers for Plan/Tasks/Context/ADRs.RL4
        const planWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(rl4Path, 'Plan.RL4')
        );
        const tasksWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(rl4Path, 'Tasks.RL4')
        );
        const contextWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(rl4Path, 'Context.RL4')
        );
        const adrWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(rl4Path, 'ADRs.RL4')
        );

        // Handle Plan.RL4 changes (Phase 6: Log via CognitiveLogger)
        planWatcher.onDidChange(async () => {
            const planPath = path.join(rl4Path, 'Plan.RL4');
            await logRL4FileChange('Plan', planPath);
            logger!.system('📋 Plan.RL4 changed, recalculating metrics...', '📋');
            // Confidence/bias will be recalculated on next snapshot generation
        });

        // Handle Tasks.RL4 changes (Phase 6: Log via CognitiveLogger)
        tasksWatcher.onDidChange(async () => {
            const tasksPath = path.join(rl4Path, 'Tasks.RL4');
            await logRL4FileChange('Tasks', tasksPath);
            logger!.system('✅ Tasks.RL4 changed, updating state...', '✅');
        });

        // Handle Context.RL4 changes → Send to WebView for KPI update (Phase 6: Log via CognitiveLogger)
        contextWatcher.onDidChange(async () => {
            const contextPath = path.join(rl4Path, 'Context.RL4');
            await logRL4FileChange('Context', contextPath);
            logger!.system('🔍 Context.RL4 changed, refreshing...', '🔍');
            
            // Read Context.RL4 and send to WebView for KPI parsing
            if (webviewPanel) {
                try {
                    const fs = await import('fs/promises');
                    const contextContent = await fs.readFile(contextPath, 'utf-8');
                    
                    webviewPanel.webview.postMessage({
                        type: 'kpisUpdated',
                        payload: contextContent
                    });
                    
                    logger!.system('✅ Context.RL4 sent to WebView for KPI update', '✅');
                } catch (error) {
                    logger!.error(`Failed to read Context.RL4: ${error}`);
                }
            }
        });

        // Handle ADRs.RL4 changes (parse and append to ledger) (Phase 6: Log via CognitiveLogger)
        adrWatcher.onDidChange(async () => {
            const adrsPath = path.join(rl4Path, 'ADRs.RL4');
            await logRL4FileChange('ADR', adrsPath);
            logger!.system('📜 ADRs.RL4 changed, processing...', '📜');
            const result = adrParser.processADRsFile();
            
            if (result.added > 0) {
                vscode.window.showInformationMessage(
                    `✅ RL4: ${result.added} new ADR(s) added to ledger`
                );
                logger!.system(`✅ ${result.added} ADR(s) appended to ledger`, '✅');
            }
        });

        adrWatcher.onDidCreate(async () => {
            const adrsPath = path.join(rl4Path, 'ADRs.RL4');
            await logRL4FileChange('ADR', adrsPath);
            logger!.system('📜 ADRs.RL4 created, processing...', '📜');
            const result = adrParser.processADRsFile();
            
            if (result.added > 0) {
                vscode.window.showInformationMessage(
                    `✅ RL4: Processed ${result.added} ADR(s)`
                );
            }
        });

        context.subscriptions.push(planWatcher, tasksWatcher, contextWatcher, adrWatcher);
        logger.system('✅ FileWatchers registered for Plan/Tasks/Context/ADRs.RL4', '✅');
        
        // Phase E3.3: No auto-push, WebView requests snapshot on demand via 'generateSnapshot' message
        
        // Clean up on panel dispose
        webviewPanel.onDidDispose(() => {
            webviewPanel = null;
            if (statusBarItem) {
                statusBarItem.text = '$(brain) RL4 Dashboard';
                statusBarItem.tooltip = 'Click to open RL4 Cognitive Dashboard';
            }
            logger!.system('🖥️ WebView disposed', '🖥️');
        }, null, context.subscriptions);
        
        // Add command to toggle WebView
        context.subscriptions.push(
            vscode.commands.registerCommand('rl4.toggleWebview', () => {
                if (webviewPanel) {
                    webviewPanel.reveal(vscode.ViewColumn.Two);
                    if (statusBarItem) {
                        statusBarItem.text = '$(brain) RL4 Dashboard $(check)';
                        statusBarItem.tooltip = 'RL4 Dashboard is open';
                    }
                    logger!.system('🖥️ WebView revealed', '🖥️');
                } else {
                    // Recreate WebView if disposed
                    webviewPanel = vscode.window.createWebviewPanel(
                        'rl4Webview',
                        '🧠 RL4 Dashboard',
                        { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
                        {
                            enableScripts: true,
                            retainContextWhenHidden: true,
                            localResourceRoots: [
                                vscode.Uri.joinPath(context.extensionUri, 'extension', 'webview', 'ui', 'dist')
                            ]
                        }
                    );
                    
                    webviewPanel.webview.html = getWebviewHtml(context, webviewPanel);
                    
                    // Phase E3.3: WebView requests snapshot on demand, no auto-push
                    const rl4PathRecreated = path.join(workspaceRoot, '.reasoning_rl4');
                    const promptBuilderRecreated = new AdaptivePromptBuilder(workspaceRoot, logger || undefined);
                    
                    // Helper: Send Context.RL4 to WebView for initial KPI load (recreated)
                    const sendContextToWebViewRecreated = async () => {
                        if (webviewPanel) {
                            try {
                                const fs = await import('fs/promises');
                                const contextPath = path.join(rl4PathRecreated, 'Context.RL4');
                                const contextContent = await fs.readFile(contextPath, 'utf-8');
                                
                                webviewPanel.webview.postMessage({
                                    type: 'kpisUpdated',
                                    payload: contextContent
                                });
                                
                                logger!.system('✅ Initial Context.RL4 sent to WebView', '✅');
                            } catch (error) {
                                logger!.system(`⚠️ Context.RL4 not found yet (will use mock data)`, '⚠️');
                            }
                        }
                    };
                    
                    // Send initial Context.RL4 to WebView after a delay
                    setTimeout(sendContextToWebViewRecreated, 500);
                    
                    // Send initial GitHub status to WebView
                    setTimeout(async () => {
                        if (!webviewPanel) return;
                        try {
                            const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                            const status = await ghManager.checkConnection();
                            
                            webviewPanel.webview.postMessage({
                                type: 'githubStatus',
                                payload: {
                                    connected: status.ok,
                                    repo: status.repo,
                                    reason: status.reason
                                }
                            });
                        } catch (error) {
                            logger!.warning(`Failed to check initial GitHub status: ${error}`);
                        }
                    }, 600);
                    
                    webviewPanel.webview.onDidReceiveMessage(
                        async (message) => {
                            console.log('[RL4 Extension] Received message from WebView:', message.type);
                            
                            switch (message.type) {
                                case 'generateSnapshot':
                                    try {
                                        logger!.system('📋 Generating unified context snapshot...', '📋');
                                        const snapshot = await promptBuilderRecreated.generate();
                                        
                                        webviewPanel!.webview.postMessage({
                                            type: 'snapshotGenerated',
                                            payload: snapshot
                                        });
                                        
                                        logger!.system(`✅ Snapshot generated (${snapshot.length} chars)`, '✅');
                                    } catch (error) {
                                        logger!.error(`Failed to generate snapshot: ${error}`);
                                        webviewPanel!.webview.postMessage({
                                            type: 'error',
                                            payload: 'Failed to generate snapshot'
                                        });
                                    }
                                    break;
                                
                                case 'openFile':
                                    try {
                                        const fileName = message.fileName;
                                        if (!fileName) {
                                            logger!.warning('openFile: fileName missing');
                                            break;
                                        }
                                        
                                        const filePath = path.join(rl4PathRecreated, fileName);
                                        const fileUri = vscode.Uri.file(filePath);
                                        
                                        // Open file in editor
                                        const document = await vscode.workspace.openTextDocument(fileUri);
                                        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
                                        
                                        logger!.system(`📂 Opened ${fileName} in editor`, '📂');
                                    } catch (error) {
                                        logger!.error(`Failed to open file: ${error}`);
                                        vscode.window.showErrorMessage(`Failed to open ${message.fileName}: ${error}`);
                                    }
                                    break;
                                
                                case 'connectGitHub':
                                    try {
                                        logger!.system('🔗 Starting GitHub integration setup...', '🔗');
                                        const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                                        await ghManager.setupIntegration();
                                        
                                        // Check status after setup
                                        const status = await ghManager.checkConnection();
                                        webviewPanel!.webview.postMessage({
                                            type: 'githubConnected',
                                            payload: status
                                        });
                                        
                                        // Also send updated status
                                        webviewPanel!.webview.postMessage({
                                            type: 'githubStatus',
                                            payload: {
                                                connected: status.ok,
                                                repo: status.repo,
                                                reason: status.reason
                                            }
                                        });
                                        
                                        logger!.system(`✅ GitHub integration setup completed`, '✅');
                                    } catch (error) {
                                        logger!.error(`Failed to setup GitHub integration: ${error}`);
                                        webviewPanel!.webview.postMessage({
                                            type: 'githubError',
                                            payload: error instanceof Error ? error.message : 'Unknown error'
                                        });
                                    }
                                    break;
                                
                                case 'checkGitHubStatus':
                                    try {
                                        const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                                        const status = await ghManager.checkConnection();
                                        
                                        webviewPanel!.webview.postMessage({
                                            type: 'githubStatus',
                                            payload: {
                                                connected: status.ok,
                                                repo: status.repo,
                                                reason: status.reason
                                            }
                                        });
                                    } catch (error) {
                                        logger!.error(`Failed to check GitHub status: ${error}`);
                                        webviewPanel!.webview.postMessage({
                                            type: 'githubStatus',
                                            payload: {
                                                connected: false,
                                                reason: 'error'
                                            }
                                        });
                                    }
                                    break;
                                
                                case 'generateCommitPrompt':
                                    try {
                                        logger!.system('📝 Collecting commit context...', '📝');
                                        
                                        const collector = new CommitContextCollector(workspaceRoot, kernel?.execPool);
                                        const context = await collector.collectContext();
                                        
                                        const promptGenerator = new CommitPromptGenerator();
                                        const prompt = promptGenerator.generatePrompt(context);
                                        
                                        // Copy to clipboard
                                        await vscode.env.clipboard.writeText(prompt);
                                        
                                        webviewPanel!.webview.postMessage({
                                            type: 'commitPromptGenerated',
                                            payload: prompt
                                        });
                                        
                                        logger!.system(`✅ Commit prompt generated (${prompt.length} chars) and copied to clipboard`, '✅');
                                    } catch (error) {
                                        logger!.error(`Failed to generate commit prompt: ${error}`);
                                        webviewPanel!.webview.postMessage({
                                            type: 'commitError',
                                            payload: error instanceof Error ? error.message : 'Failed to generate prompt'
                                        });
                                    }
                                    break;
                                
                                case 'submitCommitCommand':
                                    // User pasted command from LLM - show it for validation
                                    try {
                                        const command = message.command;
                                        if (!command) {
                                            logger!.warning('submitCommitCommand: command missing');
                                            break;
                                        }
                                        
                                        webviewPanel!.webview.postMessage({
                                            type: 'commitCommandReceived',
                                            payload: command
                                        });
                                        
                                        logger!.system('📋 Commit command received from LLM, waiting for validation', '📋');
                                    } catch (error) {
                                        logger!.error(`Failed to submit commit command: ${error}`);
                                        webviewPanel!.webview.postMessage({
                                            type: 'commitError',
                                            payload: error instanceof Error ? error.message : 'Failed to submit command'
                                        });
                                    }
                                    break;
                                
                                case 'executeCommitCommand':
                                    try {
                                        const command = message.command;
                                        if (!command) {
                                            logger!.warning('executeCommitCommand: command missing');
                                            break;
                                        }
                                        
                                        logger!.system('🚀 Executing GH CLI command...', '🚀');
                                        logger!.system(`Command: ${command.substring(0, 100)}...`, '📋');
                                        
                                        // Execute via ExecPool
                                        if (kernel?.execPool) {
                                            // For shell commands with pipes/redirects, use shell execution
                                            const shellCommand = process.platform === 'win32' 
                                                ? `cmd /c "${command}"`
                                                : `/bin/sh -c "${command.replace(/"/g, '\\"')}"`;
                                            
                                            const result = await kernel.execPool.run(shellCommand, { 
                                                cwd: workspaceRoot
                                            });
                                            
                                            // Check success: no stderr (or only warnings) and not timed out
                                            if (!result.timedOut && (!result.stderr || result.stderr.trim().length === 0)) {
                                                webviewPanel!.webview.postMessage({
                                                    type: 'commitExecuted',
                                                    payload: result.stdout
                                                });
                                                
                                                logger!.system('✅ Commit created successfully!', '✅');
                                                
                                                // Refresh GitHub status
                                                const ghManager = new GitHubFineGrainedManager(workspaceRoot);
                                                const status = await ghManager.checkConnection();
                                                webviewPanel!.webview.postMessage({
                                                    type: 'githubStatus',
                                                    payload: {
                                                        connected: status.ok,
                                                        repo: status.repo,
                                                        reason: status.reason
                                                    }
                                                });
                                            } else {
                                                throw new Error(result.stderr || (result.timedOut ? 'Command timed out' : 'Command failed'));
                                            }
                                        } else {
                                            throw new Error('ExecPool not available');
                                        }
                                    } catch (error) {
                                        logger!.error(`Failed to execute commit command: ${error}`);
                                        webviewPanel!.webview.postMessage({
                                            type: 'commitError',
                                            payload: error instanceof Error ? error.message : 'Failed to execute command'
                                        });
                                    }
                                    break;
                            }
                        },
                        null,
                        context.subscriptions
                    );
                    
                    webviewPanel.onDidDispose(() => {
                        webviewPanel = null;
                        if (statusBarItem) {
                            statusBarItem.text = '$(brain) RL4 Dashboard';
                            statusBarItem.tooltip = 'Click to open RL4 Cognitive Dashboard';
                        }
                        logger!.system('🖥️ WebView disposed', '🖥️');
                    }, null, context.subscriptions);
                    
                    if (statusBarItem) {
                        statusBarItem.text = '$(brain) RL4 Dashboard $(check)';
                        statusBarItem.tooltip = 'RL4 Dashboard is open';
                    }
                    
                    logger!.system('🖥️ WebView recreated', '🖥️');
                }
            })
        );
        
        logger.system('✅ RL4 Kernel activated', '✅');
        logger.system('🎯 8 commands registered (4 kernel + 3 ADR validation + 1 webview)', '🎯');
        logger.system('🖥️ Dashboard auto-opened in column 2', '🖥️');
            
        } else {
        logger.warning('TimerRegistry disabled');
    }
}

/**
 * Generate WebView HTML with Vite build assets
 */
function getWebviewHtml(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    // Read index.html to extract actual Vite asset filenames (they change on each build)
    const indexHtmlPath = vscode.Uri.joinPath(context.extensionUri, 'extension', 'webview', 'ui', 'dist', 'index.html');
    const indexHtml = require('fs').readFileSync(indexHtmlPath.fsPath, 'utf-8');
    
    // Extract script and style paths from index.html
    const scriptMatch = indexHtml.match(/src="\.\/assets\/(index-[^"]+\.js)"/);
    const styleMatch = indexHtml.match(/href="\.\/assets\/(index-[^"]+\.css)"/);
    
    if (!scriptMatch || !styleMatch) {
        throw new Error('Failed to parse Vite build assets from index.html');
    }
    
    // Resolve webview-safe URIs for Vite assets
    const distPath = vscode.Uri.joinPath(context.extensionUri, 'extension', 'webview', 'ui', 'dist', 'assets');
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(distPath, scriptMatch[1]));
    const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(distPath, styleMatch[1]));
    
    return /* html */ `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${panel.webview.cspSource} blob: data:;
                             script-src ${panel.webview.cspSource} 'unsafe-inline'; style-src ${panel.webview.cspSource} 'unsafe-inline';
                             font-src ${panel.webview.cspSource}; connect-src ${panel.webview.cspSource};"
                />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <link rel="stylesheet" href="${styleUri}">
                <title>RL4 Dashboard</title>
            </head>
            <body>
                <div id="root"></div>
                <script>
                    // Acquire VS Code API BEFORE React loads
                    // This can only be called once per webview lifetime
                    (function() {
                        if (typeof acquireVsCodeApi === 'function') {
                            try {
                                window.vscode = acquireVsCodeApi();
                                console.log('[RL4 WebView] VS Code API acquired in inline script');
                            } catch (e) {
                                console.warn('[RL4 WebView] Could not acquire API (may already be acquired):', e.message);
                                // API already acquired somewhere else - try to find it
                                if (!window.vscode) {
                                    console.error('[RL4 WebView] CRITICAL: API acquired elsewhere but not available in window.vscode');
                                }
                            }
                        } else {
                            console.error('[RL4 WebView] acquireVsCodeApi function not found');
                        }
                    })();
                </script>
                <script type="module" src="${scriptUri}"></script>
            </body>
        </html>
    `;
}

/**
 * Ensure Cursor rule file exists for RL4 strict mode enforcement
 * This is called automatically on extension activation to ensure users don't need to manually add the rule
 */
function ensureCursorRuleExists(workspaceRoot: string, logger: CognitiveLogger | null): void {
    try {
        const cursorRulesDir = path.join(workspaceRoot, '.cursor', 'rules');
        const ruleFilePath = path.join(cursorRulesDir, 'RL4_STRICT_MODE_ENFORCEMENT.mdc');
        
        // Check if rule file already exists
        if (fs.existsSync(ruleFilePath)) {
            if (logger) {
                logger.system('✅ Cursor rule already exists', '✅');
            }
            return;
        }
        
        // Create .cursor/rules directory if it doesn't exist
        if (!fs.existsSync(cursorRulesDir)) {
            fs.mkdirSync(cursorRulesDir, { recursive: true });
            if (logger) {
                logger.system(`📁 Created .cursor/rules directory`, '📁');
            }
        }
        
        // Write the rule file
        const ruleContent = `---
description: [RL4] Enforcement strict du mode deviation - OBLIGATOIRE avant toute modification
globs: **/*
alwaysApply: true
manual: false
---

# 🛡️ RL4 STRICT MODE ENFORCEMENT — RÈGLE ABSOLUE

## ⚠️ RÈGLE #1 : TOUJOURS VÉRIFIER LE MODE AVANT TOUTE ACTION

**AVANT de créer, modifier ou supprimer un fichier TypeScript :**

1. **Lire \`.reasoning_rl4/Plan.RL4\`** → Vérifier \`deviation_mode: strict|flexible|exploratory|free\`
2. **Lire \`.reasoning_rl4/Tasks.RL4\`** → Lister les tâches P0 actives
3. **Lire \`.reasoning_rl4/Context.RL4\`** → Vérifier le bias actuel

## 🚫 MODE STRICT (0% threshold) — RÈGLES ABSOLUES

**Si \`deviation_mode: strict\` dans Plan.RL4 :**

### ❌ INTERDICTIONS ABSOLUES :
- ❌ **NE PAS créer de nouveau fichier \`.ts\`** sauf si c'est explicitement une tâche P0
- ❌ **NE PAS modifier un fichier** sauf si c'est pour compléter une tâche P0
- ❌ **NE PAS ajouter de nouvelles fonctionnalités** même si "c'est une bonne idée"

### ✅ AUTORISATIONS UNIQUES :
- ✅ **Modifier uniquement les fichiers nécessaires pour compléter une tâche P0**
- ✅ **Corriger des bugs critiques** (si c'est une tâche P0)
- ✅ **Répondre aux questions** sans modifier de code

### 📋 PROCESSUS OBLIGATOIRE EN MODE STRICT :

**Avant TOUTE modification de code :**

\`\`\`
1. Lire Tasks.RL4 → Identifier les tâches P0
2. Vérifier : "Cette modification correspond-elle à une tâche P0 ?"
   - OUI → Continuer
   - NON → STOP. Répondre :
     "⛔ STRICT MODE: Cette modification n'est pas dans les tâches P0.
     
     Options:
     a) ❌ Rejeter (recommandé)
     b) 📋 Ajouter à Future Backlog (bias reste inchangé)
     c) 🔄 Passer en mode Flexible (25% threshold)"
\`\`\`

## ⚖️ MODE FLEXIBLE (25% threshold) — RÈGLES RELATIVES

**Si \`deviation_mode: flexible\` dans Plan.RL4 :**

- ✅ Autoriser modifications P0 + P1
- ✅ Autoriser petites améliorations si bias < 25%
- ❌ Demander confirmation avant P2/P3

## 🔍 MODE EXPLORATORY (50% threshold) — RÈGLES PERMISSIVES

**Si \`deviation_mode: exploratory\` dans Plan.RL4 :**

- ✅ Autoriser explorations et améliorations
- ✅ Proposer des optimisations
- ⚠️ Calculer bias impact avant d'implémenter

## 🔥 MODE FREE (100% threshold) — AUCUNE RESTRICTION

**Si \`deviation_mode: free\` dans Plan.RL4 :**

- ✅ Toute modification autorisée
- ✅ Création de fichiers libre
- ⚠️ Toujours informer l'utilisateur des changements

---

## 🎯 CHECKLIST AVANT TOUTE MODIFICATION

**Copier-coller cette checklist avant chaque modification :**

\`\`\`
[ ] 1. J'ai lu Plan.RL4 → Mode détecté: [strict/flexible/exploratory/free]
[ ] 2. J'ai lu Tasks.RL4 → Tâches P0: [liste]
[ ] 3. J'ai lu Context.RL4 → Bias actuel: [X]%
[ ] 4. Cette modification correspond à une tâche P0 ? [OUI/NON]
[ ] 5. Si NON, j'ai demandé confirmation à l'utilisateur ? [OUI/NON]
[ ] 6. J'ai calculé le bias impact ? [OUI/NON]
[ ] 7. Le bias total reste sous le threshold ? [OUI/NON]
\`\`\`

**Si une case est NON → STOP. Demander confirmation.**

---

## 📝 EXEMPLE DE VIOLATION (À NE PAS REPRODUIRE)

**❌ MAUVAIS COMPORTEMENT :**
\`\`\`
Utilisateur: "Le snapshot est trop générique"
Agent: [Crée immédiatement CodeStateAnalyzer.ts sans vérifier]
→ VIOLATION : Fichier créé sans vérifier Tasks.RL4
\`\`\`

**✅ BON COMPORTEMENT :**
\`\`\`
Utilisateur: "Le snapshot est trop générique"
Agent: 
1. Lit Plan.RL4 → Mode: strict
2. Lit Tasks.RL4 → P0: "Commit 102 fichiers"
3. Répond: "⛔ STRICT MODE: Enrichir le snapshot n'est pas dans les tâches P0.
   
   Options:
   a) ❌ Rejeter (recommandé en mode strict)
   b) 📋 Ajouter à backlog
   c) 🔄 Passer en mode Flexible"
\`\`\`

---

## 🚨 RAPPEL CONSTANT

**Cette règle doit être appliquée AVANT chaque modification de code, pas après.**

**Si vous oubliez cette règle, vous violez le contrat RL4.**
`;
        
        fs.writeFileSync(ruleFilePath, ruleContent, 'utf-8');
        
        if (logger) {
            logger.system('✅ Cursor rule file created automatically', '✅');
            logger.system('   → .cursor/rules/RL4_STRICT_MODE_ENFORCEMENT.mdc', '📄');
        }
    } catch (error) {
        if (logger) {
            logger.warning(`Failed to create Cursor rule file: ${error}`);
        }
        // Non-blocking: if rule file creation fails, extension still works
    }
}

export async function deactivate() {
    logger?.system('🛑 RL4 Kernel deactivating...', '🛑');
    
    // Dispose Status Bar Item
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = null;
        logger?.system('✅ Status Bar disposed', '✅');
    }
    
    // Dispose WebView
    if (webviewPanel) {
        webviewPanel.dispose();
        webviewPanel = null;
        logger?.system('✅ WebView disposed', '✅');
    }
    
    // Flush ledger
    try {
        const ledger = (globalThis as any).RBOM_LEDGER;
        if (ledger?.flush) {
                    await ledger.flush();
            logger?.system('✅ Ledger flushed', '✅');
        }
    } catch (error) {
        logger?.error(`Flush error: ${error}`);
    }
    
    // Clear timers
    if (kernel?.timerRegistry) {
        kernel.timerRegistry.clear('kernel:cognitive-cycle');
        kernel.timerRegistry.clear('kernel:cognitive-watchdog');
        logger?.system('✅ Timers cleared', '✅');
    }
    
    // Shutdown kernel
    if (kernel?.api) {
        try {
            await kernel.api.shutdown();
            logger?.system('✅ Kernel shutdown complete', '✅');
        } catch (error) {
            logger?.error(`Shutdown error: ${error}`);
        }
    }
    
    logger?.system('🧠 RL4 Kernel deactivated cleanly', '🧠');
}
// test flush fix
// test flush fix
