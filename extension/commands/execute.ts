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

    // Create Snapshot
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.snapshot.create', async () => {
            // Already exists in package.json, just trigger it
            await vscode.commands.executeCommand('reasoning.snapshot.create');
        })
    );

    // Verify Integrity
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.integrity.verify', async () => {
            // Already exists in package.json
            await vscode.commands.executeCommand('reasoning.verify.integrity');
        })
    );
}

