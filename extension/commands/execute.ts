import * as vscode from 'vscode';

/**
 * Execute commands - Run autopilot, sync GitHub, handle integrity
 */
export function registerExecuteCommands(context: vscode.ExtensionContext) {
    // Run Autopilot
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.autopilot.run', async () => {
            vscode.window.showInformationMessage('🚀 Autopilot cycle would run here (implement CycleController)');
        })
    );

    // Sync GitHub
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.sync', async () => {
            vscode.window.showInformationMessage('⚙️ GitHub sync triggered (integration pending)');
        })
    );

    // These commands already exist in package.json, no need to re-register
    // Create Snapshot and Verify Integrity are handled by existing handlers
}

