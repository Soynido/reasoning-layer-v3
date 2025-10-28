import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Patterns commands - Analyze learned patterns
 */
export function registerPatternsCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.patterns.list', async () => {
            try {
                const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
                if (!fs.existsSync(patternsPath)) {
                    vscode.window.showInformationMessage('No patterns detected yet.');
                    return;
                }
                
                const doc = await vscode.workspace.openTextDocument(patternsPath);
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list patterns: ${error}`);
            }
        }),

        vscode.commands.registerCommand('reasoning.patterns.visualize', async () => {
            vscode.window.showInformationMessage('🧠 Pattern visualization (graph rendering pending)');
        })
    );
}

