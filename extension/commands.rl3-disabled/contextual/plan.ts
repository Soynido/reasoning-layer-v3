import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { loadManifest } from '../../core/utils/manifestLoader';

/**
 * Plan commands - Manage cognitive strategy and cycles
 */
export function registerPlanCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.plan.showOverview', async () => {
            try {
                const manifest = loadManifest(workspaceRoot);
                if (manifest.totalEvents === 0 && !manifest.projectName) {
                    vscode.window.showInformationMessage('No plan data found yet.');
                    return;
                }
                
                vscode.window.showInformationMessage(
                    `🗺️ Plan Overview\n\n` +
                    `Total Events: ${manifest.totalEvents}\n` +
                    `Project: ${manifest.projectName || 'Unknown'}\n` +
                    `Created: ${manifest.createdAt || 'Unknown'}`
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

