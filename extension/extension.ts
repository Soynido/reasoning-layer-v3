import * as vscode from 'vscode';
import { PersistenceManager } from './core/PersistenceManager';
import { CaptureEngine } from './core/CaptureEngine';

let persistence: PersistenceManager | null = null;
let capture: CaptureEngine | null = null;

export async function activate(context: vscode.ExtensionContext) {
    const activationStart = Date.now();
    console.log('🧠 Reasoning Layer V3 - Activation started');

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Reasoning Layer V3 requires a workspace folder');
        return;
    }

    try {
        // ✅ Phase 1: Core seulement (immédiat) - Target < 500ms
        const phase1Start = Date.now();
        persistence = new PersistenceManager(workspaceRoot);
        capture = new CaptureEngine(workspaceRoot, persistence);
        capture.start();

        // Commandes de base
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.init', () => {
                vscode.window.showInformationMessage('✅ Reasoning Layer V3 initialized!');
                persistence?.logWithEmoji('🎉', 'Manual initialization triggered');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.showOutput', () => {
                persistence?.show();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.captureNow', () => {
                vscode.window.showInformationMessage('📸 Manual capture triggered');
                persistence?.logWithEmoji('📸', 'Manual capture triggered');
            })
        );

        console.log(`✅ Phase 1 completed in ${Date.now() - phase1Start}ms`);
        console.log(`🎉 Total activation time: ${Date.now() - activationStart}ms`);

    } catch (error) {
        console.error('❌ Activation failed:', error);
        vscode.window.showErrorMessage(`Failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    console.log('🧠 Reasoning Layer V3 - Deactivating...');
    
    if (capture) {
        capture.stop();
    }
    
    if (persistence) {
        persistence.dispose();
    }
    
    console.log('✅ Extension deactivated successfully');
}
