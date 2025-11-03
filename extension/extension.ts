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
        const scheduler = new CognitiveScheduler(workspaceRoot, timerRegistry, outputChannel);
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
            })
        );
        
        logWithTime('✅ RL4 Kernel activated');
        logWithTime('🎯 3 commands registered');
            
        } else {
        logWithTime('⚠️ TimerRegistry disabled');
    }
}

export async function deactivate() {
    outputChannel?.appendLine('🛑 RL4 Kernel deactivating...');
    
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
