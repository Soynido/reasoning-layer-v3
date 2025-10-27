import * as vscode from 'vscode';

export class GitHubTokenManager {
    private static readonly TOKEN_KEY = 'reasoningLayer.githubToken';

    /**
     * Get stored GitHub token from VS Code settings
     */
    public static getToken(): string | null {
        const config = vscode.workspace.getConfiguration('reasoningLayer');
        return config.get<string | null>('githubToken', null);
    }

    /**
     * Store GitHub token in VS Code settings
     */
    public static async storeToken(token: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('reasoningLayer');
        await config.update('githubToken', token, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Clear stored GitHub token
     */
    public static async clearToken(): Promise<void> {
        const config = vscode.workspace.getConfiguration('reasoningLayer');
        await config.update('githubToken', undefined, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Check if GitHub token is configured
     */
    public static hasToken(): boolean {
        return this.getToken() !== null && this.getToken() !== '';
    }

    /**
     * Show setup dialog with button
     */
    public static async showSetupDialog(): Promise<string | null> {
        const action = await vscode.window.showWarningMessage(
            'GitHub integration requires a personal access token',
            'Setup Token',
            'Get Token',
            'Skip'
        );

        if (action === 'Setup Token') {
            // Show input box for token
            const token = await vscode.window.showInputBox({
                prompt: 'Enter your GitHub Personal Access Token',
                placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                password: true,
                ignoreFocusOut: true
            });

            if (token) {
                await this.storeToken(token);
                vscode.window.showInformationMessage('✅ GitHub token configured successfully!');
                return token;
            }
        } else if (action === 'Get Token') {
            // Open GitHub token creation page
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens/new?scopes=repo&description=Reasoning%20Layer%20V3'));
            
            // After opening, ask for token again
            const token = await vscode.window.showInputBox({
                prompt: 'Paste your GitHub Personal Access Token here',
                placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                password: true,
                ignoreFocusOut: true
            });

            if (token) {
                await this.storeToken(token);
                vscode.window.showInformationMessage('✅ GitHub token configured successfully!');
                return token;
            }
        }

        return null;
    }
}

