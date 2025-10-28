import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tasks commands - List and manage reasoning tasks
 */
export function registerTasksCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.tasks.list', async () => {
            try {
                const tasksPath = path.join(workspaceRoot, '.reasoning', 'next_tasks.json');
                if (!fs.existsSync(tasksPath)) {
                    vscode.window.showInformationMessage('No tasks found.');
                    return;
                }
                
                const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
                const taskList = Array.isArray(tasks) ? tasks : tasks.tasks || [];
                
                if (taskList.length === 0) {
                    vscode.window.showInformationMessage('No tasks available.');
                    return;
                }
                
                const choice = await vscode.window.showQuickPick(
                    taskList.map((t: any) => `${t.priority?.toUpperCase() || 'MEDIUM'} → ${t.title || 'Untitled'}`),
                    { placeHolder: 'Select a task to view details' }
                );
                
                if (choice) {
                    vscode.window.showInformationMessage(`Selected: ${choice}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list tasks: ${error}`);
            }
        }),

        vscode.commands.registerCommand('reasoning.tasks.complete', async () => {
            vscode.window.showInformationMessage('✅ Task completion tracking (feature pending)');
        }),

        vscode.commands.registerCommand('reasoning.tasks.refresh', async () => {
            const tasksPath = path.join(workspaceRoot, '.reasoning', 'next_tasks.json');
            if (fs.existsSync(tasksPath)) {
                const doc = await vscode.workspace.openTextDocument(tasksPath);
                vscode.window.showTextDocument(doc);
            } else {
                vscode.window.showInformationMessage('No tasks file to refresh.');
            }
        })
    );
}

