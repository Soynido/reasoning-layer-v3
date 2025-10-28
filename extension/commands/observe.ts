import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Observe commands - Display and inspect current cognitive state
 */
export function registerObserveCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    // Dashboard
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.dashboard.show', async () => {
            try {
                const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
                const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
                const correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
                const forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
                const adrDir = path.join(workspaceRoot, '.reasoning', 'adrs');

                let adrCount = 0;
                if (fs.existsSync(adrDir)) {
                    adrCount = fs.readdirSync(adrDir).filter(f => f.endsWith('.json')).length;
                }

                let patternsCount = 0, correlationsCount = 0, forecastsCount = 0;
                
                if (fs.existsSync(patternsPath)) {
                    const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
                    patternsCount = patterns.patterns?.length || 0;
                }
                
                if (fs.existsSync(correlationsPath)) {
                    const correlations = JSON.parse(fs.readFileSync(correlationsPath, 'utf-8'));
                    correlationsCount = correlations.correlations?.length || 0;
                }
                
                if (fs.existsSync(forecastsPath)) {
                    const forecasts = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
                    forecastsCount = forecasts.forecasts?.length || 0;
                }

                const manifest = fs.existsSync(manifestPath) 
                    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
                    : { total_events: 0 };

                vscode.window.showInformationMessage(
                    `🧭 Cognitive Dashboard\n\n` +
                    `📊 Events: ${manifest.total_events}\n` +
                    `🔍 Patterns: ${patternsCount}\n` +
                    `🔗 Correlations: ${correlationsCount}\n` +
                    `🔮 Forecasts: ${forecastsCount}\n` +
                    `📋 ADRs: ${adrCount}`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load dashboard: ${error}`);
            }
        })
    );

    // Show Traces
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.traces.show', async () => {
            try {
                const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
                if (!fs.existsSync(tracesDir)) {
                    vscode.window.showInformationMessage('No traces found yet.');
                    return;
                }

                const files = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json')).sort().reverse();
                if (files.length === 0) {
                    vscode.window.showInformationMessage('No trace files found.');
                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    files.map(f => ({
                        label: f.replace('.json', ''),
                        detail: `Contains trace events`
                    }))
                );

                if (selected) {
                    const content = fs.readFileSync(path.join(tracesDir, selected.label + '.json'), 'utf-8');
                    const doc = await vscode.workspace.openTextDocument({
                        content: content,
                        language: 'json'
                    });
                    vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show traces: ${error}`);
            }
        })
    );

    // Show Patterns
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.patterns.show', async () => {
            try {
                const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
                if (!fs.existsSync(patternsPath)) {
                    vscode.window.showInformationMessage('No patterns detected yet.');
                    return;
                }

                const doc = await vscode.workspace.openTextDocument(patternsPath);
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show patterns: ${error}`);
            }
        })
    );

    // Inspect Forecasts
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.forecasts.inspect', async () => {
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
        })
    );
}

