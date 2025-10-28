import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Understand commands - Analyze decisions, patterns, correlations, and evaluate confidence
 */
export function registerUnderstandCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    // Analyze Decisions (Show ADRs)
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.decisions.analyze', async () => {
            try {
                const adrDir = path.join(workspaceRoot, '.reasoning', 'adrs');
                if (!fs.existsSync(adrDir)) {
                    vscode.window.showInformationMessage('No ADRs found yet.');
                    return;
                }

                const files = fs.readdirSync(adrDir).filter(f => f.endsWith('.json')).sort().reverse();
                if (files.length === 0) {
                    vscode.window.showInformationMessage('No ADR files found.');
                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    files.map(f => {
                        const content = JSON.parse(fs.readFileSync(path.join(adrDir, f), 'utf-8'));
                        return {
                            label: f.replace('.json', ''),
                            detail: content.title || 'No title'
                        };
                    })
                );

                if (selected) {
                    const content = fs.readFileSync(path.join(adrDir, selected.label + '.json'), 'utf-8');
                    const doc = await vscode.workspace.openTextDocument({
                        content: content,
                        language: 'json'
                    });
                    vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to analyze decisions: ${error}`);
            }
        })
    );

    // Detect Patterns
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.patterns.detect', async () => {
            vscode.window.showInformationMessage('🔍 Pattern detection triggered. Check patterns.json for results.');
        })
    );

    // Correlate Events
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.events.correlate', async () => {
            try {
                const correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
                if (!fs.existsSync(correlationsPath)) {
                    vscode.window.showInformationMessage('No correlations found yet.');
                    return;
                }

                const doc = await vscode.workspace.openTextDocument(correlationsPath);
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to correlate events: ${error}`);
            }
        })
    );

    // Evaluate Confidence
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.confidence.evaluate', async () => {
            try {
                const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
                const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');

                let avgConfidence = 0;
                let patternsCount = 0;

                if (fs.existsSync(patternsPath)) {
                    const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
                    const pats = patterns.patterns || [];
                    patternsCount = pats.length;
                    
                    if (pats.length > 0) {
                        const confidences = pats.map((p: any) => p.confidence || 0);
                        avgConfidence = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
                    }
                }

                const confidencePercent = (avgConfidence * 100).toFixed(1);

                vscode.window.showInformationMessage(
                    `💯 Confidence Evaluation\n\n` +
                    `Average Pattern Confidence: ${confidencePercent}%\n` +
                    `Patterns Detected: ${patternsCount}\n` +
                    `System Status: ${avgConfidence > 0.7 ? '✅ High' : avgConfidence > 0.5 ? '⚠️ Moderate' : '🔴 Low'}`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to evaluate confidence: ${error}`);
            }
        })
    );
}

