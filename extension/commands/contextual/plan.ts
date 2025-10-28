import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plan commands - Manage cognitive strategy and cycles
 */
export function registerPlanCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.plan.showOverview', async () => {
            try {
                const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
                if (!fs.existsSync(manifestPath)) {
                    vscode.window.showInformationMessage('No plan data found yet.');
                    return;
                }
                
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                vscode.window.showInformationMessage(
                    `🗺️ Plan Overview\n\n` +
                    `Total Events: ${manifest.total_events}\n` +
                    `Project: ${manifest.project_name || 'Unknown'}\n` +
                    `Created: ${manifest.created_at || 'Unknown'}`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show plan: ${error}`);
            }
        }),

        vscode.commands.registerCommand('reasoning.plan.newCycle', async () => {
            vscode.window.showInformationMessage('🗺️ New reasoning cycle can be started via Run Autopilot');
        }),

        vscode.commands.registerCommand('reasoning.plan.archiveCycle', async () => {
            vscode.window.showInformationMessage('🗺️ Cycle archiving (feature pending)');
        })
    );
}

