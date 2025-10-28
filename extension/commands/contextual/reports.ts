import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reports commands - Browse cycle reports
 */
export function registerReportsCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.reports.list', async () => {
            try {
                const reports: string[] = [];
                function findReports(dir: string) {
                    if (!fs.existsSync(dir)) return;
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const fullPath = path.join(dir, file);
                        if (fs.statSync(fullPath).isDirectory()) {
                            findReports(fullPath);
                        } else if (file.toLowerCase().includes('report') && (file.endsWith('.md') || file.endsWith('.json'))) {
                            reports.push(fullPath);
                        }
                    }
                }
                findReports(path.join(workspaceRoot, '.reasoning'));
                
                if (reports.length === 0) {
                    vscode.window.showInformationMessage('No cycle reports found.');
                    return;
                }
                
                reports.sort().reverse();
                const choice = await vscode.window.showQuickPick(
                    reports.map(r => path.basename(r)),
                    { placeHolder: 'Select a report to open' }
                );
                
                if (choice) {
                    const selected = reports.find(r => r.endsWith(choice));
                    if (selected) {
                        const doc = await vscode.workspace.openTextDocument(selected);
                        vscode.window.showTextDocument(doc);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list reports: ${error}`);
            }
        }),

        vscode.commands.registerCommand('reasoning.reports.openLast', async () => {
            await vscode.commands.executeCommand('reasoning.help.lastReport');
        })
    );
}

