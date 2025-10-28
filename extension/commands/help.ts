import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// import * as glob from 'glob'; // Note: using fs-based search

/**
 * Help commands - Show documentation and reports
 */
export function registerHelpCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    // Show Last Report
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.help.lastReport', async () => {
            try {
                // Find all .md files in .reasoning
                const reports: string[] = [];
                function findMarkdown(dir: string) {
                    if (!fs.existsSync(dir)) return;
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const fullPath = path.join(dir, file);
                        if (fs.statSync(fullPath).isDirectory()) {
                            findMarkdown(fullPath);
                        } else if (file.endsWith('.md')) {
                            reports.push(fullPath);
                        }
                    }
                }
                findMarkdown(path.join(workspaceRoot, '.reasoning'));
                reports.sort().reverse();
                if (reports.length === 0) {
                    vscode.window.showInformationMessage('No reports found yet.');
                    return;
                }
                
                const doc = await vscode.workspace.openTextDocument(reports[0]);
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show last report: ${error}`);
            }
        })
    );

    // Show Docs
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.help.docs', async () => {
            vscode.window.showInformationMessage(
                '📘 Reasoning Layer V3 Documentation\n\n' +
                '• Architecture: 12 layers of intelligence\n' +
                '• Observe: Dashboard, Traces, Patterns, Forecasts\n' +
                '• Understand: Analyze, Detect, Correlate, Evaluate\n' +
                '• Decide: Generate ADRs, Recommend Tasks\n' +
                '• Execute: Autopilot, Sync, Integrity\n' +
                '• Maintain: Retroactive, Export, Edit'
            );
        })
    );
}

