import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * GitHub Fine-Grained Token Manager
 * Modern integration using repository-scoped tokens instead of global tokens
 */
export class GitHubFineGrainedManager {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Detect repository from local git config
     */
    private getRepositorySlug(): string | null {
        try {
            const remoteUrl = execSync('git config --get remote.origin.url', {
                cwd: this.workspaceRoot,
                encoding: 'utf-8'
            }).trim();

            // Match both HTTPS and SSH formats
            const match = remoteUrl.match(/(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+\/[^\/]+)(?:\.git)?$/);
            if (match && match[1]) {
                return match[1];
            }

            return null;
        } catch (error) {
            console.error('Failed to detect repository:', error);
            return null;
        }
    }

    /**
     * Generate fine-grained token creation URL
     */
    private generateTokenUrl(repoSlug: string): string {
        return `https://github.com/settings/personal-access-tokens/new?scopes=repo&repository=${repoSlug}`;
    }

    /**
     * Verify token with GitHub API
     */
    private async verifyToken(token: string, repoSlug: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.github.com/repos/${repoSlug}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });

            return response.status === 200;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    /**
     * Save token securely
     */
    private saveToken(token: string, repoSlug: string): void {
        const securityDir = path.join(this.workspaceRoot, '.reasoning', 'security');
        if (!fs.existsSync(securityDir)) {
            fs.mkdirSync(securityDir, { recursive: true });
        }

        const tokenData = {
            repo: repoSlug,
            token_type: 'fine-grained',
            created_at: new Date().toISOString(),
            scopes: ['repo'],
            token: token
        };

        const tokenPath = path.join(securityDir, 'github.json');
        fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
        
        console.log(`✅ GitHub token saved to ${tokenPath}`);
    }

    /**
     * Main setup flow
     */
    public async setupIntegration(): Promise<void> {
        // Step 1: Detect repository
        const repoSlug = this.getRepositorySlug();
        if (!repoSlug) {
            vscode.window.showErrorMessage(
                '❌ No GitHub repository detected. Please initialize a Git repository first.'
            );
            return;
        }

        console.log(`📁 Detected repository: ${repoSlug}`);

        // Step 2: Open fine-grained token creation URL
        const tokenUrl = this.generateTokenUrl(repoSlug);
        console.log(`🔗 Opening: ${tokenUrl}`);
        
        await vscode.env.openExternal(vscode.Uri.parse(tokenUrl));

        // Step 3: Prompt user for token
        const token = await vscode.window.showInputBox({
            prompt: `Paste your fine-grained token for ${repoSlug}`,
            placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) {
            vscode.window.showWarningMessage('GitHub integration cancelled.');
            return;
        }

        // Step 4: Verify token
        vscode.window.showInformationMessage('🔍 Verifying token...');
        
        const isValid = await this.verifyToken(token, repoSlug);
        
        if (!isValid) {
            vscode.window.showErrorMessage(
                '⚠️ Invalid or expired token. Please generate a new one.'
            );
            return;
        }

        // Step 5: Save token
        this.saveToken(token, repoSlug);

        // Step 6: Log event
        this.logEvent(repoSlug);

        // Step 7: Success notification
        vscode.window.showInformationMessage(
            `✅ Fine-grained GitHub token connected to ${repoSlug}`
        );
    }

    /**
     * Log the integration event
     */
    private logEvent(repoSlug: string): void {
        try {
            const tracesDir = path.join(this.workspaceRoot, '.reasoning', 'traces');
            if (!fs.existsSync(tracesDir)) {
                fs.mkdirSync(tracesDir, { recursive: true });
            }

            const today = new Date().toISOString().split('T')[0];
            const traceFile = path.join(tracesDir, `${today}.json`);

            const event = {
                id: `github-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'github_token_linked',
                metadata: {
                    repo: repoSlug,
                    token_type: 'fine-grained'
                }
            };

            let existing: any[] = [];
            if (fs.existsSync(traceFile)) {
                existing = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
            }

            existing.push(event);
            fs.writeFileSync(traceFile, JSON.stringify(existing, null, 2));

            console.log('✅ GitHub integration event logged');
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    /**
     * Get stored token
     */
    public getToken(): string | null {
        try {
            const tokenPath = path.join(this.workspaceRoot, '.reasoning', 'security', 'github.json');
            if (!fs.existsSync(tokenPath)) {
                return null;
            }

            const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
            return tokenData.token || null;
        } catch (error) {
            console.error('Failed to read token:', error);
            return null;
        }
    }
}

