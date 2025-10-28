import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Forecasts commands - Explore predictions
 */
export function registerForecastsCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.forecasts.show', async () => {
            try {
                const forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
                if (!fs.existsSync(forecastsPath)) {
                    vscode.window.showInformationMessage('No forecasts generated yet.');
                    return;
                }
                
                const doc = await vscode.workspace.openTextDocument(forecastsPath);
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show forecasts: ${error}`);
            }
        }),

        vscode.commands.registerCommand('reasoning.forecasts.analyze', async () => {
            vscode.window.showInformationMessage('🔮 Forecast analysis (comparison feature pending)');
        })
    );
}

