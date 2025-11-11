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
import { ADRValidationCommands } from './commands/adr-validation';
import { generateWhereAmI, generateSnapshotJSON } from './kernel/api/WhereAmISnapshot';
import * as path from 'path';

// Output Channel
let outputChannel: vscode.OutputChannel | null = null;

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

// Snapshot Push Interval
let snapshotInterval: NodeJS.Timeout | null = null;

export async function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('RL4 Kernel requires a workspace folder');
        return;
    }
    
    // Create dedicated Output Channel with timestamps
    outputChannel = vscode.window.createOutputChannel('RL4 Kernel');
    outputChannel.show();
    
    const logWithTime = (msg: string) => {
        const timestamp = new Date().toISOString();
        const timeDisplay = timestamp.substring(11, 23); // HH:MM:SS.mmm
        outputChannel!.appendLine(`[${timeDisplay}] ${msg}`);
    };
    
    outputChannel.appendLine('');
    logWithTime('=== RL4 KERNEL — Minimal Mode ===');
    logWithTime(`Workspace: ${workspaceRoot}`);
    logWithTime('==================================');
    outputChannel.appendLine('');
    
    // Load kernel configuration
    const kernelConfig = loadKernelConfig(workspaceRoot);
    logWithTime(`⚙️ Config: ${JSON.stringify(kernelConfig, null, 2)}`);
    
    // Initialize RL4 Kernel
    if (kernelConfig.USE_TIMER_REGISTRY) {
        logWithTime('🔧 Initializing RL4 Kernel...');
        
        // Create components
        const timerRegistry = new TimerRegistry();
        const stateRegistry = new StateRegistry(workspaceRoot);
        const healthMonitor = new HealthMonitor(workspaceRoot, timerRegistry);
        
        // Load bootstrap artifacts first (for ForecastEngine metrics)
        const bootstrap = KernelBootstrap.initialize(workspaceRoot);
        const forecastMetrics = bootstrap.metrics;
        
        const scheduler = new CognitiveScheduler(workspaceRoot, timerRegistry, outputChannel, forecastMetrics);
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
        
        logWithTime('✅ RL4 Kernel components created');
        
        // Bootstrap already loaded above (before scheduler creation)
        if (bootstrap.initialized) {
            logWithTime(`✅ Bootstrap complete: ${bootstrap.universals ? Object.keys(bootstrap.universals).length : 0} universals loaded`);
            
            // Load state into StateRegistry if available
            if (bootstrap.state) {
                // StateRegistry can be extended to accept loaded state
                logWithTime('📦 Kernel state restored from artifacts');
            }
            
            // Log forecast baseline (now integrated into ForecastEngine)
            if (bootstrap.metrics?.forecast_precision) {
                logWithTime(`📊 Forecast precision baseline: ${bootstrap.metrics.forecast_precision.toFixed(3)} (Phase E1 active)`);
            }
        } else {
            logWithTime('⚠️  No kernel artifacts found, starting with default baseline (0.73)');
        }
        
        // Start health monitoring
        if (kernelConfig.USE_HEALTH_MONITOR) {
            healthMonitor.start(timerRegistry);
            logWithTime('❤️ Health Monitor started');
        }
        
        // Start CognitiveScheduler (double-delay for Extension Host stability)
        logWithTime('🧠 Starting CognitiveScheduler (delayed start in 3s)...');
        
        // External delay: Ensure kernel is fully initialized before scheduler starts
        const channel = outputChannel; // Capture for setTimeout callback
        setTimeout(async () => {
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ⏳ Scheduler: Starting delayed initialization...`);
            await scheduler.start(kernelConfig.cognitive_cycle_interval_ms);
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ✅ Scheduler started successfully`);
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] 🛡️ Watchdog active (${kernelConfig.cognitive_cycle_interval_ms}ms cycles)`);
            
            // Start Input Layer: GitCommitListener + FileChangeWatcher
            channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] 📥 Starting Input Layer...`);
            
            // 1. GitCommitListener
            const gitTracesWriter = new AppendOnlyWriter(path.join(workspaceRoot, '.reasoning_rl4', 'traces', 'git_commits.jsonl'));
            const gitListener = new GitCommitListener(workspaceRoot, execPool, gitTracesWriter, channel);
            
            if (gitListener.isGitRepository()) {
                await gitListener.startWatching();
                channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ✅ GitCommitListener active`);
            } else {
                channel.appendLine(`[${new Date().toISOString().substring(11, 23)}] ⚠️ Not a Git repository, GitCommitListener disabled`);
            }
            
            // 2. FileChangeWatcher
            const fileTracesWriter = new AppendOnlyWriter(path.join(workspaceRoot, '.reasoning_rl4', 'traces', 'file_changes.jsonl'));
            const fileWatcher = new FileChangeWatcher(workspaceRoot, fileTracesWriter, channel);
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
                logWithTime(message);
            }),
            
                vscode.commands.registerCommand('reasoning.kernel.reflect', async () => {
                logWithTime('🧠 Running manual cycle...');
                const result = await kernel!.scheduler.runCycle();
                const message = `✅ Cycle ${result.cycleId}: ${result.duration}ms, ${result.phases.length} phases`;
                vscode.window.showInformationMessage(message);
                logWithTime(message);
            }),
            
                vscode.commands.registerCommand('reasoning.kernel.flush', async () => {
                    await kernel!.api.flush();
                vscode.window.showInformationMessage('✅ Flushed');
                logWithTime('💾 All queues flushed');
            }),
            
                vscode.commands.registerCommand('reasoning.kernel.whereami', async () => {
                logWithTime('🧠 Generating cognitive snapshot...');
                try {
                    const snapshot = await generateWhereAmI(path.join(workspaceRoot, '.reasoning_rl4'));
                    
                    // Display in new editor
                    const doc = await vscode.workspace.openTextDocument({
                        content: snapshot,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(doc);
                    
                    logWithTime('✅ Cognitive snapshot generated');
                    vscode.window.showInformationMessage('🧠 Where Am I? — Snapshot ready');
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    logWithTime(`❌ Snapshot error: ${errorMsg}`);
                    vscode.window.showErrorMessage(`Failed to generate snapshot: ${errorMsg}`);
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
        logWithTime('✅ Status Bar item created');
        
        // Phase E2.7: Create WebView Dashboard with auto-push snapshots
        logWithTime('🖥️ Creating RL4 Dashboard WebView...');
        
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
        logWithTime('✅ WebView HTML loaded');
        
        // Setup snapshot push interval (every 10 seconds)
        snapshotInterval = setInterval(async () => {
            if (webviewPanel) {
                try {
                    const snapshot = await generateSnapshotJSON(path.join(workspaceRoot, '.reasoning_rl4'));
                    webviewPanel.webview.postMessage({ 
                        type: 'updateStore', 
                        payload: snapshot
                    });
                    logWithTime(`📤 JSON snapshot pushed (cycle ${snapshot.cycleId})`);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    logWithTime(`⚠️ Snapshot push error: ${errorMsg}`);
                }
            }
        }, 10_000);
        
        // Clean up on panel dispose
        webviewPanel.onDidDispose(() => {
            if (snapshotInterval) {
                clearInterval(snapshotInterval);
                snapshotInterval = null;
            }
            webviewPanel = null;
            if (statusBarItem) {
                statusBarItem.text = '$(brain) RL4 Dashboard';
                statusBarItem.tooltip = 'Click to open RL4 Cognitive Dashboard';
            }
            logWithTime('🖥️ WebView disposed');
        }, null, context.subscriptions);
        
        context.subscriptions.push({ 
            dispose: () => {
                if (snapshotInterval) {
                    clearInterval(snapshotInterval);
                    snapshotInterval = null;
                }
            }
        });
        
        // Add command to toggle WebView
        context.subscriptions.push(
            vscode.commands.registerCommand('rl4.toggleWebview', () => {
                if (webviewPanel) {
                    webviewPanel.reveal(vscode.ViewColumn.Two);
                    if (statusBarItem) {
                        statusBarItem.text = '$(brain) RL4 Dashboard $(check)';
                        statusBarItem.tooltip = 'RL4 Dashboard is open';
                    }
                    logWithTime('🖥️ WebView revealed');
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
                    
                    // Recreate snapshot interval
                    const newInterval = setInterval(async () => {
                        if (webviewPanel) {
                            try {
                                const snapshot = await generateSnapshotJSON(path.join(workspaceRoot, '.reasoning_rl4'));
                                webviewPanel.webview.postMessage({ 
                                    type: 'updateStore', 
                                    payload: snapshot
                                });
                                logWithTime(`📤 JSON snapshot pushed (cycle ${snapshot.cycleId})`);
                            } catch (error) {
                                const errorMsg = error instanceof Error ? error.message : String(error);
                                logWithTime(`⚠️ Snapshot push error: ${errorMsg}`);
                            }
                        }
                    }, 10_000);
                    
                    webviewPanel.onDidDispose(() => {
                        clearInterval(newInterval);
                        webviewPanel = null;
                        if (statusBarItem) {
                            statusBarItem.text = '$(brain) RL4 Dashboard';
                            statusBarItem.tooltip = 'Click to open RL4 Cognitive Dashboard';
                        }
                        logWithTime('🖥️ WebView disposed');
                    }, null, context.subscriptions);
                    
                    if (statusBarItem) {
                        statusBarItem.text = '$(brain) RL4 Dashboard $(check)';
                        statusBarItem.tooltip = 'RL4 Dashboard is open';
                    }
                    
                    logWithTime('🖥️ WebView recreated');
                }
            })
        );
        
        logWithTime('✅ RL4 Kernel activated');
        logWithTime('🎯 8 commands registered (4 kernel + 3 ADR validation + 1 webview)');
        logWithTime('🖥️ Dashboard auto-opened in column 2');
            
        } else {
        logWithTime('⚠️ TimerRegistry disabled');
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
    const scriptMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
    const styleMatch = indexHtml.match(/href="\/assets\/(index-[^"]+\.css)"/);
    
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
                <script type="module" src="${scriptUri}"></script>
            </body>
        </html>
    `;
}

export async function deactivate() {
    outputChannel?.appendLine('🛑 RL4 Kernel deactivating...');
    
    // Clear snapshot interval
    if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
        outputChannel?.appendLine('✅ Snapshot interval cleared');
    }
    
    // Dispose Status Bar Item
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = null;
        outputChannel?.appendLine('✅ Status Bar disposed');
    }
    
    // Dispose WebView
    if (webviewPanel) {
        webviewPanel.dispose();
        webviewPanel = null;
        outputChannel?.appendLine('✅ WebView disposed');
    }
    
    // Flush ledger
    try {
        const ledger = (globalThis as any).RBOM_LEDGER;
        if (ledger?.flush) {
                    await ledger.flush();
            outputChannel?.appendLine('✅ Ledger flushed');
        }
    } catch (error) {
        outputChannel?.appendLine(`❌ Flush error: ${error}`);
    }
    
    // Clear timers
    if (kernel?.timerRegistry) {
        kernel.timerRegistry.clear('kernel:cognitive-cycle');
        kernel.timerRegistry.clear('kernel:cognitive-watchdog');
        outputChannel?.appendLine('✅ Timers cleared');
    }
    
    // Shutdown kernel
    if (kernel?.api) {
        try {
            await kernel.api.shutdown();
            outputChannel?.appendLine('✅ Kernel shutdown complete');
        } catch (error) {
            outputChannel?.appendLine(`❌ Shutdown error: ${error}`);
        }
    }
    
    outputChannel?.appendLine('🧠 RL4 Kernel deactivated cleanly');
}
// test flush fix
// test flush fix
