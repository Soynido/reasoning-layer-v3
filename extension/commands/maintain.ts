import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RetroactiveTraceBuilder } from '../core/retroactive/RetroactiveTraceBuilder';

/**
 * Maintain commands - Reset memory, edit manifest, retroactive mode, export
 */
export function registerMaintainCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    // Enable Retroactive Mode (already implemented, just expose as maintain command)
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.retroactive.enable', async () => {
            try {
                const builder = new RetroactiveTraceBuilder(workspaceRoot);
                const shouldReconstruct = await builder.shouldReconstruct();
                
                if (!shouldReconstruct) {
                    vscode.window.showInformationMessage('✅ Historical memory already exists.');
                    return;
                }
                
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Reconstructing Historical Memory',
                    cancellable: false
                }, async () => {
                    const result = await builder.reconstruct();
                    vscode.window.showInformationMessage(
                        `✅ Historical memory reconstructed:\n` +
                        `📊 ${result.commitsAnalyzed} commits\n` +
                        `🎭 ${result.eventsGenerated} events\n` +
                        `🔍 ${result.patternsDetected} patterns\n` +
                        `💯 ${(result.averageConfidence * 100).toFixed(0)}% confidence`
                    );
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Reconstruction failed: ${error}`);
            }
        })
    );

    // Export Summary
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.summary.export', async () => {
            vscode.window.showInformationMessage('📁 Export summary (zip generation pending)');
        })
    );

    // Edit Manifest
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.manifest.edit', async () => {
            try {
                const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
                if (!fs.existsSync(manifestPath)) {
                    vscode.window.showErrorMessage('manifest.json not found');
                    return;
                }
                
                const doc = await vscode.workspace.openTextDocument(manifestPath);
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to edit manifest: ${error}`);
            }
        })
    );
}

