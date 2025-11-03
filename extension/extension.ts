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
    
    // Create dedicated Output Channel
    outputChannel = vscode.window.createOutputChannel('RL4 Kernel');
    outputChannel.show();
    outputChannel.appendLine('');
    outputChannel.appendLine('=== RL4 KERNEL — Minimal Mode ===');
    outputChannel.appendLine(`Workspace: ${workspaceRoot}`);
    outputChannel.appendLine('==================================');
    outputChannel.appendLine('');
    
    // Load kernel configuration
    const kernelConfig = loadKernelConfig(workspaceRoot);
    outputChannel.appendLine(`⚙️ Config: ${JSON.stringify(kernelConfig, null, 2)}`);
    
    // Initialize RL4 Kernel
    if (kernelConfig.USE_TIMER_REGISTRY) {
        outputChannel.appendLine('🔧 Initializing RL4 Kernel...');
        
        // Create components
        const timerRegistry = new TimerRegistry();
        const stateRegistry = new StateRegistry(workspaceRoot);
        const healthMonitor = new HealthMonitor(workspaceRoot, timerRegistry);
        const scheduler = new CognitiveScheduler(workspaceRoot, timerRegistry);
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
        
        outputChannel.appendLine('✅ RL4 Kernel components created');
        
        // Start health monitoring
        if (kernelConfig.USE_HEALTH_MONITOR) {
            healthMonitor.start(timerRegistry);
            outputChannel.appendLine('❤️ Health Monitor started');
        }
        
        // Start CognitiveScheduler
        outputChannel.appendLine('🧠 Starting CognitiveScheduler...');
        scheduler.start(kernelConfig.cognitive_cycle_interval_ms);
        outputChannel.appendLine(`🛡️ Watchdog active (${kernelConfig.cognitive_cycle_interval_ms}ms cycles)`);
        
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
                outputChannel?.appendLine(message);
            }),
            
            vscode.commands.registerCommand('reasoning.kernel.reflect', async () => {
                outputChannel?.appendLine('🧠 Running manual cycle...');
                const result = await kernel!.scheduler.runCycle();
                const message = `✅ Cycle ${result.cycleId}: ${result.duration}ms, ${result.phases.length} phases`;
                vscode.window.showInformationMessage(message);
                outputChannel?.appendLine(message);
            }),
            
            vscode.commands.registerCommand('reasoning.kernel.flush', async () => {
                await kernel!.api.flush();
                vscode.window.showInformationMessage('✅ Flushed');
                outputChannel?.appendLine('💾 All queues flushed');
            })
        );
        
        outputChannel.appendLine('✅ RL4 Kernel activated');
        outputChannel.appendLine('🎯 3 commands registered');
        
    } else {
        outputChannel.appendLine('⚠️ TimerRegistry disabled');
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
