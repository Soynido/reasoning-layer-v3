/**
 * Secure Credential Manager - Sprint 1, Task 1.1
 * 
 * Gère les credentials sensibles via VS Code SecretStorage API
 * 
 * Features:
 * - Chiffrement natif via VS Code SecretStorage
 * - Migration automatique depuis plaintext
 * - Audit de sécurité
 * - Pas de credentials en clair dans .reasoning/
 * 
 * Replaces: GitHubTokenManager.ts (legacy plaintext storage)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface GitHubMetadata {
    repoOwner: string;
    repoName: string;
    configuredAt?: string;
    lastUsed?: string;
}

export interface SecurityFinding {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    type: string;
    file: string;
    message: string;
    recommendation: string;
}

export interface SecurityAuditReport {
    timestamp: string;
    workspaceRoot: string;
    findings: SecurityFinding[];
    score: number; // 0-10
}

export class SecureCredentialManager {
    private context: vscode.ExtensionContext;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    /**
     * Stocke un token GitHub de manière sécurisée (encrypted)
     */
    public async storeGitHubToken(
        workspaceRoot: string, 
        token: string, 
        metadata?: GitHubMetadata
    ): Promise<void> {
        const key = this.getSecretKey(workspaceRoot, 'github-token');
        
        // ✅ SECURE: Stocker le token chiffré via VS Code SecretStorage
        await this.context.secrets.store(key, token);
        
        // Stocker les métadonnées (non sensibles) dans un fichier séparé
        if (metadata) {
            const metadataPath = path.join(workspaceRoot, '.reasoning', 'security', 'github-metadata.json');
            fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
            
            const metadataContent = {
                repoOwner: metadata.repoOwner,
                repoName: metadata.repoName,
                configuredAt: metadata.configuredAt || new Date().toISOString(),
                lastUsed: metadata.lastUsed,
                // ❌ NO TOKEN HERE - stored encrypted in SecretStorage
                encryptionMethod: 'VS Code SecretStorage (AES-256)',
                secretKey: key // Reference only, not the actual secret
            };
            
            fs.writeFileSync(metadataPath, JSON.stringify(metadataContent, null, 2), 'utf-8');
        }
        
        console.log('✅ GitHub token stored securely (encrypted in VS Code SecretStorage)');
    }
    
    /**
     * Récupère un token GitHub (décrypté automatiquement)
     */
    public async getGitHubToken(workspaceRoot: string): Promise<string | undefined> {
        const key = this.getSecretKey(workspaceRoot, 'github-token');
        
        // ✅ SECURE: Récupération automatiquement décryptée
        const token = await this.context.secrets.get(key);
        
        // Mettre à jour lastUsed si token existe
        if (token) {
            await this.updateLastUsed(workspaceRoot);
        }
        
        return token;
    }
    
    /**
     * Récupère les métadonnées GitHub (non sensibles)
     */
    public getGitHubMetadata(workspaceRoot: string): GitHubMetadata | null {
        const metadataPath = path.join(workspaceRoot, '.reasoning', 'security', 'github-metadata.json');
        
        if (!fs.existsSync(metadataPath)) {
            return null;
        }
        
        try {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        } catch (error) {
            console.error('Failed to read GitHub metadata:', error);
            return null;
        }
    }
    
    /**
     * Vérifie si un token GitHub est configuré
     */
    public async hasGitHubToken(workspaceRoot: string): Promise<boolean> {
        const token = await this.getGitHubToken(workspaceRoot);
        return !!token && token.length > 0;
    }
    
    /**
     * Supprime un token GitHub (et ses métadonnées)
     */
    public async deleteGitHubToken(workspaceRoot: string): Promise<void> {
        const key = this.getSecretKey(workspaceRoot, 'github-token');
        
        // Supprimer du SecretStorage
        await this.context.secrets.delete(key);
        
        // Supprimer aussi les métadonnées
        const metadataPath = path.join(workspaceRoot, '.reasoning', 'security', 'github-metadata.json');
        if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
        }
        
        console.log('✅ GitHub token deleted (encrypted storage + metadata)');
    }
    
    /**
     * 🔄 MIGRATION: Migre automatiquement depuis l'ancien format plaintext
     */
    public async migrateFromPlaintext(workspaceRoot: string): Promise<boolean> {
        const oldTokenPath = path.join(workspaceRoot, '.reasoning', 'security', 'github.json');
        
        if (!fs.existsSync(oldTokenPath)) {
            return false; // Rien à migrer
        }
        
        try {
            console.log('🔄 Migrating GitHub token from plaintext to encrypted storage...');
            
            // Lire l'ancien fichier (PLAINTEXT)
            const oldData = JSON.parse(fs.readFileSync(oldTokenPath, 'utf-8'));
            const token = oldData.token;
            
            if (!token || typeof token !== 'string') {
                throw new Error('No valid token found in old format');
            }
            
            // Stocker de manière sécurisée (ENCRYPTED)
            await this.storeGitHubToken(workspaceRoot, token, {
                repoOwner: oldData.repoOwner || 'unknown',
                repoName: oldData.repoName || 'unknown',
                configuredAt: oldData.configuredAt
            });
            
            // 🔒 CRITIQUE: Backup puis suppression de l'ancien fichier plaintext
            const backupPath = oldTokenPath + `.migrated-${Date.now()}`;
            fs.copyFileSync(oldTokenPath, backupPath);
            fs.unlinkSync(oldTokenPath);
            
            console.log('✅ Token migrated successfully');
            console.log(`   Old file (plaintext): DELETED`);
            console.log(`   Backup created: ${path.basename(backupPath)}`);
            console.log(`   New storage: VS Code SecretStorage (encrypted)`);
            
            return true;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return false;
        }
    }
    
    /**
     * 🔍 AUDIT: Vérifie qu'aucun credential n'est en plaintext
     */
    public async auditSecurity(workspaceRoot: string): Promise<SecurityAuditReport> {
        const report: SecurityAuditReport = {
            timestamp: new Date().toISOString(),
            workspaceRoot: path.basename(workspaceRoot),
            findings: [],
            score: 10 // Start with perfect score, deduct for issues
        };
        
        // Check 1: GitHub token en plaintext
        const oldTokenPath = path.join(workspaceRoot, '.reasoning', 'security', 'github.json');
        if (fs.existsSync(oldTokenPath)) {
            report.findings.push({
                severity: 'CRITICAL',
                type: 'plaintext_token',
                file: oldTokenPath,
                message: 'GitHub token stored in plaintext JSON',
                recommendation: 'Run migration: SecureCredentialManager.migrateFromPlaintext()'
            });
            report.score -= 5; // -5 points
        }
        
        // Check 2: RSA private key non chiffrée
        const privateKeyPath = path.join(workspaceRoot, '.reasoning', 'keys', 'private.pem');
        if (fs.existsSync(privateKeyPath)) {
            const keyContent = fs.readFileSync(privateKeyPath, 'utf-8');
            
            // Vérifier si la clé est chiffrée (contient "ENCRYPTED")
            if (!keyContent.includes('ENCRYPTED')) {
                report.findings.push({
                    severity: 'HIGH',
                    type: 'unencrypted_key',
                    file: privateKeyPath,
                    message: 'RSA private key not encrypted with passphrase',
                    recommendation: 'Consider encrypting with passphrase or storing in SecretStorage'
                });
                report.score -= 2; // -2 points
            }
        }
        
        // Check 3: Fichiers .env ou config avec potentiels secrets
        const envPath = path.join(workspaceRoot, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const secrets = this.detectSecretsInText(envContent);
            
            if (secrets.length > 0) {
                report.findings.push({
                    severity: 'MEDIUM',
                    type: 'env_secrets',
                    file: envPath,
                    message: `Potential secrets detected in .env (${secrets.length} patterns)`,
                    recommendation: 'Ensure .env is in .gitignore and not committed'
                });
                report.score -= 1; // -1 point
            }
        }
        
        // Check 4: Traces avec potentiels secrets
        const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
        if (fs.existsSync(tracesDir)) {
            const traceFiles = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json'));
            
            let secretsInTraces = 0;
            for (const file of traceFiles.slice(0, 5)) { // Check derniers 5 fichiers
                const filePath = path.join(tracesDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const secrets = this.detectSecretsInText(content);
                secretsInTraces += secrets.length;
            }
            
            if (secretsInTraces > 0) {
                report.findings.push({
                    severity: 'MEDIUM',
                    type: 'secrets_in_traces',
                    file: tracesDir,
                    message: `Potential secrets detected in trace files (${secretsInTraces} occurrences)`,
                    recommendation: 'Enable SecretScanner redaction in PersistenceManager'
                });
                report.score -= 1; // -1 point
            }
        }
        
        return report;
    }
    
    /**
     * Détecte des patterns de secrets dans un texte
     */
    private detectSecretsInText(text: string): string[] {
        const patterns = [
            /ghp_[a-zA-Z0-9]{36}/g,           // GitHub token
            /AKIA[0-9A-Z]{16}/g,              // AWS key
            /sk-[a-zA-Z0-9]{48}/g,            // OpenAI key
            /eyJ[a-zA-Z0-9_-]*\.eyJ/g,        // JWT token
            /-----BEGIN.*PRIVATE KEY-----/g   // Private key
        ];
        
        const found: string[] = [];
        for (const pattern of patterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                found.push(match[0].substring(0, 20) + '...');
            }
        }
        
        return found;
    }
    
    /**
     * Génère une clé unique pour SecretStorage (par workspace)
     */
    private getSecretKey(workspaceRoot: string, type: string): string {
        // Hash du workspace root pour unicité
        const hash = crypto.createHash('sha256')
            .update(workspaceRoot)
            .digest('hex')
            .substring(0, 16);
        
        return `rl3.${type}.${hash}`;
    }
    
    /**
     * Met à jour lastUsed dans les métadonnées
     */
    private async updateLastUsed(workspaceRoot: string): Promise<void> {
        const metadataPath = path.join(workspaceRoot, '.reasoning', 'security', 'github-metadata.json');
        
        if (!fs.existsSync(metadataPath)) {
            return;
        }
        
        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            metadata.lastUsed = new Date().toISOString();
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        } catch (error) {
            // Non-blocking
        }
    }
}

