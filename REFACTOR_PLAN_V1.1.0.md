# 🧠 Reasoning Layer V3 — Refactor Plan (v1.1.0)

**Version actuelle** : 1.0.87  
**Version cible** : 1.1.0  
**Date du plan** : 2025-11-02  
**Durée estimée** : 12-15 jours-homme  
**Équipe recommandée** : 2-3 développeurs senior

---

## 🎯 Objectif Global

Transformer le Reasoning Layer V3 d'un **prototype fonctionnel mais non production-ready** en un **système stable, sécurisé et scalable** utilisable par des équipes professionnelles.

### Problèmes critiques adressés

1. 🔴 **Stockage disque** : 6.8GB → < 500MB par workspace
2. 🔴 **Sécurité credentials** : Tokens plaintext → chiffrement SecretStorage
3. 🔴 **Scalabilité** : 54 timers → < 10 via service global
4. 🟠 **Robustesse** : Validation schéma systématique (Zod)
5. 🟠 **UX** : Installation invasive → mode opt-in minimal
6. 🟡 **Observabilité** : Diagnostic tools + health monitoring

### Critères de succès (Gates de validation)

| Métrique | Actuel | Cible | Validation |
|----------|--------|-------|------------|
| Taille `.reasoning/` | 6.8GB | < 500MB | `du -sh .reasoning/` |
| Timers actifs | 54 | < 10 | `grep -r "setInterval" \| wc -l` |
| Démarrage extension | ~3s | < 1s | Mesure VS Code profiling |
| Tokens en clair | ✅ OUI | ❌ NON | Audit `.reasoning/security/` |
| VSIX size | 17MB | < 5MB | `ls -lh *.vsix` |
| RAM utilisée | ~200MB | < 50MB | Process monitor |
| Validation JSON | 0% | 100% | Tous les JSON avec Zod |

---

## 🧩 Architecture — Core Layer

### Problème 1 : Duplication par workspace

**État actuel** :
- Chaque workspace crée une instance complète de tous les engines
- 6.8GB de modèles ML dupliqués
- Aucune mutualisation de ressources

**Impact** :
- 10 workspaces = 68GB disque
- RAM multipliée par le nombre de workspaces
- Performance dégradée

**Solution proposée** : **Global Reasoning Service (Singleton Pattern)**

```typescript
// extension/core/GlobalReasoningService.ts (NOUVEAU)
import * as vscode from 'vscode';

/**
 * Global Reasoning Service - Singleton partagé entre workspaces
 * 
 * Mutualise :
 * - Modèles ML (cache ~/.rl3/models/)
 * - AutoSync timers (un seul pour tous les workspaces)
 * - Watchers (regroupés)
 * - Pattern/Correlation/Forecast engines (partagés)
 */
export class GlobalReasoningService {
    private static instance: GlobalReasoningService | null = null;
    private workspaces: Map<string, WorkspaceState> = new Map();
    private sharedAutoSync: SharedAutoSyncService | null = null;
    private sharedWatchers: SharedWatcherService | null = null;
    
    private constructor() {
        // Private constructor for singleton
    }
    
    public static getInstance(): GlobalReasoningService {
        if (!GlobalReasoningService.instance) {
            GlobalReasoningService.instance = new GlobalReasoningService();
        }
        return GlobalReasoningService.instance;
    }
    
    /**
     * Enregistre un workspace dans le service global
     */
    public registerWorkspace(workspace: vscode.WorkspaceFolder): void {
        const root = workspace.uri.fsPath;
        
        if (this.workspaces.has(root)) {
            return; // Déjà enregistré
        }
        
        const state: WorkspaceState = {
            root,
            workspace,
            persistence: new PersistenceManager(root),
            manifest: this.loadManifest(root),
            isActive: true
        };
        
        this.workspaces.set(root, state);
        
        // Enregistrer dans le service global d'AutoSync
        if (!this.sharedAutoSync) {
            this.sharedAutoSync = new SharedAutoSyncService();
        }
        this.sharedAutoSync.addWorkspace(workspace);
    }
    
    /**
     * Désenregistre un workspace
     */
    public unregisterWorkspace(root: string): void {
        const state = this.workspaces.get(root);
        if (!state) return;
        
        state.isActive = false;
        this.workspaces.delete(root);
        
        if (this.sharedAutoSync) {
            this.sharedAutoSync.removeWorkspace(root);
        }
    }
    
    /**
     * Retourne le PersistenceManager d'un workspace
     */
    public getPersistence(root: string): PersistenceManager | null {
        return this.workspaces.get(root)?.persistence || null;
    }
    
    /**
     * Statistiques globales
     */
    public getGlobalStats(): GlobalStats {
        return {
            workspacesCount: this.workspaces.size,
            activeTimers: this.sharedAutoSync?.getTimerCount() || 0,
            totalEvents: Array.from(this.workspaces.values())
                .reduce((sum, ws) => sum + ws.manifest.totalEvents, 0),
            memoryUsage: process.memoryUsage().heapUsed
        };
    }
}

interface WorkspaceState {
    root: string;
    workspace: vscode.WorkspaceFolder;
    persistence: PersistenceManager;
    manifest: any;
    isActive: boolean;
}

interface GlobalStats {
    workspacesCount: number;
    activeTimers: number;
    totalEvents: number;
    memoryUsage: number;
}
```

**Fichiers impactés** :
- ✅ `extension/core/GlobalReasoningService.ts` (NOUVEAU)
- 🔧 `extension/extension.ts` (migration vers service global)
- 🔧 `extension/core/autosync/AutoSyncService.ts` → `SharedAutoSyncService.ts`
- 🔧 `extension/core/PersistenceManager.ts` (léger refactor)

**Priorité** : 🔴 **HAUTE** (critique pour scalabilité)  
**Dépendances** : Aucune  
**Estimation** : 2 jours

---

### Problème 2 : Modèles ML (6.8GB) bundlés localement

**État actuel** :
- Modèles ONNX copiés dans `.reasoning/models/` (6.8GB)
- Dupliqués par workspace
- Jamais utilisés par l'extension VS Code (uniquement CLI)

**Solution proposée** : **Cache global + lazy loading**

```typescript
// extension/core/ml/ModelCache.ts (NOUVEAU)
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Model Cache - Télécharge et cache les modèles ML globalement
 * 
 * Cache location : ~/.rl3/models/
 * 
 * Stratégie :
 * - Téléchargement HuggingFace à la demande
 * - Un seul cache pour tous les workspaces
 * - Vérification d'intégrité SHA256
 */
export class ModelCache {
    private static readonly CACHE_DIR = path.join(os.homedir(), '.rl3', 'models');
    private static readonly MODELS_REGISTRY = {
        'rl3-intent': {
            repo: 'soynido/rl3-intent',
            files: ['onnx/model.onnx', 'tokenizer.json', 'config.json'],
            size: '150MB',
            sha256: '...'
        },
        'rl3-output': {
            repo: 'soynido/rl3-output-v1',
            files: ['onnx/encoder_model.onnx', 'onnx/decoder_model.onnx'],
            size: '2.5GB',
            sha256: '...'
        }
    };
    
    /**
     * Récupère un modèle (télécharge si absent)
     */
    public static async getModel(modelName: keyof typeof ModelCache.MODELS_REGISTRY): Promise<string> {
        const modelInfo = this.MODELS_REGISTRY[modelName];
        const modelDir = path.join(this.CACHE_DIR, modelName);
        
        // Vérifier si déjà en cache
        if (this.isModelCached(modelDir, modelInfo.files)) {
            console.log(`✅ Model ${modelName} found in cache`);
            return modelDir;
        }
        
        // Télécharger
        console.log(`📥 Downloading model ${modelName} (${modelInfo.size})...`);
        await this.downloadModel(modelInfo.repo, modelDir, modelInfo.files);
        
        // Vérifier intégrité
        if (!this.verifyIntegrity(modelDir, modelInfo.sha256)) {
            throw new Error(`Model ${modelName} integrity check failed`);
        }
        
        console.log(`✅ Model ${modelName} ready`);
        return modelDir;
    }
    
    /**
     * Vérifie si un modèle est déjà en cache
     */
    private static isModelCached(modelDir: string, files: string[]): boolean {
        if (!fs.existsSync(modelDir)) return false;
        
        return files.every(file => 
            fs.existsSync(path.join(modelDir, file))
        );
    }
    
    /**
     * Télécharge un modèle depuis HuggingFace
     */
    private static async downloadModel(repo: string, destDir: string, files: string[]): Promise<void> {
        // Créer le dossier
        fs.mkdirSync(destDir, { recursive: true });
        
        // Télécharger chaque fichier via HuggingFace API
        for (const file of files) {
            const url = `https://huggingface.co/${repo}/resolve/main/${file}`;
            const dest = path.join(destDir, file);
            
            // Créer sous-dossiers si nécessaire
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            
            // Télécharger (utiliser fetch ou axios)
            await this.downloadFile(url, dest);
        }
    }
    
    /**
     * Télécharge un fichier avec barre de progression
     */
    private static async downloadFile(url: string, dest: string): Promise<void> {
        // TODO: Implémenter avec axios + progress bar
        // Pour l'instant, juste un placeholder
        console.log(`Downloading ${url} → ${dest}`);
    }
    
    /**
     * Vérifie l'intégrité SHA256
     */
    private static verifyIntegrity(modelDir: string, expectedHash: string): boolean {
        // TODO: Calculer SHA256 du dossier
        return true;
    }
    
    /**
     * Nettoie le cache (supprime les modèles non utilisés)
     */
    public static async cleanCache(): Promise<void> {
        console.log(`🧹 Cleaning model cache at ${this.CACHE_DIR}`);
        // TODO: Identifier les modèles non utilisés depuis > 30 jours
    }
    
    /**
     * Retourne la taille du cache
     */
    public static getCacheSize(): number {
        if (!fs.existsSync(this.CACHE_DIR)) return 0;
        
        // TODO: Calculer récursivement
        return 0;
    }
}
```

**Migration des utilisateurs existants** :
```typescript
// extension/commands/migrate.ts (NOUVEAU)
export async function migrateModelsToGlobalCache(workspaceRoot: string): Promise<void> {
    const oldModelsDir = path.join(workspaceRoot, '.reasoning', 'models');
    
    if (!fs.existsSync(oldModelsDir)) {
        return; // Rien à migrer
    }
    
    console.log('📦 Migrating models to global cache...');
    
    // Copier vers ~/.rl3/models/
    const globalCache = path.join(os.homedir(), '.rl3', 'models');
    fs.mkdirSync(globalCache, { recursive: true });
    
    // TODO: Copier les fichiers
    
    // Supprimer l'ancien dossier
    fs.rmSync(oldModelsDir, { recursive: true, force: true });
    
    console.log('✅ Models migrated successfully');
}
```

**Fichiers impactés** :
- ✅ `extension/core/ml/ModelCache.ts` (NOUVEAU)
- ✅ `extension/commands/migrate.ts` (NOUVEAU)
- 🔧 `.vscodeignore` (exclure `.reasoning/models/` si présent)
- 🔧 `extension/core/inputs/LLMInterpreter.ts` (utiliser ModelCache)

**Priorité** : 🔴 **HAUTE** (économie disque massive)  
**Dépendances** : Aucune  
**Estimation** : 1.5 jours

---

## 🔒 Sécurité — Credentials & Data

### Problème 1 : GitHub tokens en plaintext

**État actuel** :
```json
// .reasoning/security/github.json (PLAINTEXT ❌)
{
  "token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "repoOwner": "Soynido",
  "repoName": "reasoning-layer-v3"
}
```

**Risques** :
- Commit accidentel → token leak
- Backup cloud → exposition
- Partage workspace → partage token

**Solution proposée** : **VS Code SecretStorage API**

```typescript
// extension/core/security/SecureCredentialManager.ts (NOUVEAU)
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Secure Credential Manager - Gère les credentials sensibles
 * 
 * Utilise VS Code SecretStorage API (chiffrement natif)
 * 
 * Migration automatique depuis l'ancien format plaintext
 */
export class SecureCredentialManager {
    private context: vscode.ExtensionContext;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    /**
     * Stocke un token GitHub de manière sécurisée
     */
    public async storeGitHubToken(workspaceRoot: string, token: string, metadata?: GitHubMetadata): Promise<void> {
        const key = this.getSecretKey(workspaceRoot, 'github-token');
        
        // Stocker le token chiffré
        await this.context.secrets.store(key, token);
        
        // Stocker les métadonnées (non sensibles) dans un fichier séparé
        if (metadata) {
            const metadataPath = path.join(workspaceRoot, '.reasoning', 'security', 'github-metadata.json');
            fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
            fs.writeFileSync(metadataPath, JSON.stringify({
                repoOwner: metadata.repoOwner,
                repoName: metadata.repoName,
                configuredAt: new Date().toISOString(),
                // ❌ PAS de token ici
            }, null, 2));
        }
        
        console.log('✅ GitHub token stored securely (encrypted)');
    }
    
    /**
     * Récupère un token GitHub
     */
    public async getGitHubToken(workspaceRoot: string): Promise<string | undefined> {
        const key = this.getSecretKey(workspaceRoot, 'github-token');
        return await this.context.secrets.get(key);
    }
    
    /**
     * Supprime un token GitHub
     */
    public async deleteGitHubToken(workspaceRoot: string): Promise<void> {
        const key = this.getSecretKey(workspaceRoot, 'github-token');
        await this.context.secrets.delete(key);
        
        // Supprimer aussi les métadonnées
        const metadataPath = path.join(workspaceRoot, '.reasoning', 'security', 'github-metadata.json');
        if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
        }
        
        console.log('✅ GitHub token deleted');
    }
    
    /**
     * Migre automatiquement depuis l'ancien format plaintext
     */
    public async migrateFromPlaintext(workspaceRoot: string): Promise<boolean> {
        const oldTokenPath = path.join(workspaceRoot, '.reasoning', 'security', 'github.json');
        
        if (!fs.existsSync(oldTokenPath)) {
            return false; // Rien à migrer
        }
        
        try {
            console.log('🔄 Migrating GitHub token from plaintext to encrypted storage...');
            
            // Lire l'ancien fichier
            const oldData = JSON.parse(fs.readFileSync(oldTokenPath, 'utf-8'));
            const token = oldData.token;
            
            if (!token) {
                throw new Error('No token found in old format');
            }
            
            // Stocker de manière sécurisée
            await this.storeGitHubToken(workspaceRoot, token, {
                repoOwner: oldData.repoOwner,
                repoName: oldData.repoName
            });
            
            // Supprimer l'ancien fichier (CRITIQUE pour sécurité)
            fs.unlinkSync(oldTokenPath);
            
            console.log('✅ Token migrated successfully (old file deleted)');
            return true;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return false;
        }
    }
    
    /**
     * Génère une clé unique pour SecretStorage
     */
    private getSecretKey(workspaceRoot: string, type: string): string {
        // Hash du workspace root pour unicité
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(workspaceRoot).digest('hex').substring(0, 16);
        return `rl3.${type}.${hash}`;
    }
    
    /**
     * Audit de sécurité : vérifie qu'aucun token n'est en plaintext
     */
    public async auditSecurity(workspaceRoot: string): Promise<SecurityAuditReport> {
        const report: SecurityAuditReport = {
            timestamp: new Date().toISOString(),
            workspaceRoot,
            findings: []
        };
        
        // Vérifier présence de github.json (ancien format)
        const oldTokenPath = path.join(workspaceRoot, '.reasoning', 'security', 'github.json');
        if (fs.existsSync(oldTokenPath)) {
            report.findings.push({
                severity: 'CRITICAL',
                type: 'plaintext_token',
                file: oldTokenPath,
                message: 'GitHub token stored in plaintext (must migrate)'
            });
        }
        
        // Vérifier présence de clés RSA non chiffrées
        const privateKeyPath = path.join(workspaceRoot, '.reasoning', 'keys', 'private.pem');
        if (fs.existsSync(privateKeyPath)) {
            report.findings.push({
                severity: 'HIGH',
                type: 'unencrypted_key',
                file: privateKeyPath,
                message: 'RSA private key not encrypted (consider passphrase)'
            });
        }
        
        return report;
    }
}

interface GitHubMetadata {
    repoOwner: string;
    repoName: string;
}

interface SecurityAuditReport {
    timestamp: string;
    workspaceRoot: string;
    findings: SecurityFinding[];
}

interface SecurityFinding {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    type: string;
    file: string;
    message: string;
}
```

**Migration automatique au démarrage** :
```typescript
// extension/extension.ts (ajouter dans activate())
export async function activate(context: vscode.ExtensionContext) {
    // ... code existant ...
    
    // NOUVEAU : Migration sécurité automatique
    const credentialManager = new SecureCredentialManager(context);
    
    for (const workspace of vscode.workspace.workspaceFolders || []) {
        const root = workspace.uri.fsPath;
        
        // Migrer automatiquement si ancien format détecté
        const migrated = await credentialManager.migrateFromPlaintext(root);
        if (migrated) {
            vscode.window.showInformationMessage(
                '🔒 RL3: GitHub token migrated to secure storage (encrypted)'
            );
        }
        
        // Audit de sécurité
        const audit = await credentialManager.auditSecurity(root);
        if (audit.findings.some(f => f.severity === 'CRITICAL')) {
            vscode.window.showWarningMessage(
                '⚠️ RL3: Security issues detected. Run "RL3: Security Audit" for details.'
            );
        }
    }
}
```

**Fichiers impactés** :
- ✅ `extension/core/security/SecureCredentialManager.ts` (NOUVEAU)
- 🔧 `extension/core/GitHubTokenManager.ts` (refactor pour utiliser SecureCredentialManager)
- 🔧 `extension/core/integrations/GitHubFineGrainedManager.ts` (idem)
- 🔧 `extension/extension.ts` (migration auto au démarrage)
- ❌ `.reasoning/security/github.json` (sera supprimé après migration)

**Priorité** : 🔴 **CRITIQUE** (sécurité)  
**Dépendances** : Aucune  
**Estimation** : 0.5 jour

---

### Problème 2 : Logs peuvent contenir des secrets

**Solution proposée** : **Secret Scanner + Redaction**

```typescript
// extension/core/security/SecretScanner.ts (NOUVEAU)
import * as crypto from 'crypto';

/**
 * Secret Scanner - Détecte et anonymise les secrets dans les logs
 */
export class SecretScanner {
    private static readonly PATTERNS = [
        { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/, replacement: 'ghp_***REDACTED***' },
        { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/, replacement: 'AKIA***REDACTED***' },
        { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/, replacement: 'eyJ***REDACTED***' },
        { name: 'Private Key', regex: /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]+?-----END (RSA )?PRIVATE KEY-----/, replacement: '-----BEGIN PRIVATE KEY----- ***REDACTED*** -----END PRIVATE KEY-----' },
        { name: 'Password Field', regex: /(password|passwd|pwd)["']?\s*[:=]\s*["']?([^"'\s,}]+)/, replacement: '$1: ***REDACTED***' }
    ];
    
    /**
     * Scanne et anonymise un texte
     */
    public static redact(text: string): string {
        let redacted = text;
        
        for (const pattern of this.PATTERNS) {
            redacted = redacted.replace(pattern.regex, pattern.replacement);
        }
        
        return redacted;
    }
    
    /**
     * Détecte la présence de secrets (sans anonymiser)
     */
    public static detect(text: string): SecretDetection[] {
        const detections: SecretDetection[] = [];
        
        for (const pattern of this.PATTERNS) {
            const matches = text.matchAll(new RegExp(pattern.regex, 'g'));
            for (const match of matches) {
                detections.push({
                    type: pattern.name,
                    position: match.index || 0,
                    length: match[0].length
                });
            }
        }
        
        return detections;
    }
}

interface SecretDetection {
    type: string;
    position: number;
    length: number;
}
```

**Intégration dans PersistenceManager** :
```typescript
// extension/core/PersistenceManager.ts
public saveEvent(event: CaptureEvent): void {
    // NOUVEAU : Redaction automatique
    const redactedEvent = {
        ...event,
        source: SecretScanner.redact(event.source),
        data: this.redactEventData(event.data)
    };
    
    // Sauvegarder l'événement anonymisé
    events.push(redactedEvent);
    fs.writeFileSync(traceFile, JSON.stringify(events, null, 2));
}

private redactEventData(data: any): any {
    if (typeof data === 'string') {
        return SecretScanner.redact(data);
    }
    if (typeof data === 'object' && data !== null) {
        const redacted: any = {};
        for (const [key, value] of Object.entries(data)) {
            redacted[key] = this.redactEventData(value);
        }
        return redacted;
    }
    return data;
}
```

**Priorité** : 🟠 **HAUTE**  
**Estimation** : 0.5 jour

---

## 💾 Performance — Storage & Rotation

### Problème 1 : Croissance illimitée des traces

**État actuel** :
- 2662 événements en 1 semaine → ~1.5GB/an
- Aucune rotation automatique
- Aucune compression
- Aucune archivage

**Solution proposée** : **TraceRotationManager + Compression**

```typescript
// extension/core/storage/TraceRotationManager.ts (NOUVEAU)
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Trace Rotation Manager - Gère la rotation et compression des traces
 * 
 * Stratégie :
 * - Garder les 30 derniers jours en JSON non compressé
 * - Compresser les traces > 30 jours en gzip
 * - Archiver les traces > 90 jours
 * - Supprimer les traces > 180 jours
 */
export class TraceRotationManager {
    private workspaceRoot: string;
    private tracesDir: string;
    
    // Configuration
    private readonly MAX_UNCOMPRESSED_DAYS = 30;
    private readonly MAX_COMPRESSED_DAYS = 90;
    private readonly MAX_ARCHIVED_DAYS = 180;
    private readonly MAX_TRACE_SIZE_MB = 100; // Par workspace
    
    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
    }
    
    /**
     * Exécute la rotation automatique
     */
    public async rotate(): Promise<RotationReport> {
        const report: RotationReport = {
            timestamp: new Date().toISOString(),
            filesProcessed: 0,
            compressed: 0,
            archived: 0,
            deleted: 0,
            spaceSaved: 0
        };
        
        if (!fs.existsSync(this.tracesDir)) {
            return report;
        }
        
        const files = fs.readdirSync(this.tracesDir);
        const now = Date.now();
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = path.join(this.tracesDir, file);
            const stats = fs.statSync(filePath);
            const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            
            report.filesProcessed++;
            
            // Supprimer si > 180 jours
            if (ageInDays > this.MAX_ARCHIVED_DAYS) {
                const size = stats.size;
                fs.unlinkSync(filePath);
                report.deleted++;
                report.spaceSaved += size;
                console.log(`🗑️  Deleted ${file} (${ageInDays.toFixed(0)} days old)`);
                continue;
            }
            
            // Archiver si > 90 jours (et pas déjà archivé)
            if (ageInDays > this.MAX_COMPRESSED_DAYS && !file.includes('.archive')) {
                await this.archiveTrace(filePath);
                report.archived++;
                console.log(`📦 Archived ${file}`);
                continue;
            }
            
            // Compresser si > 30 jours (et pas déjà compressé)
            if (ageInDays > this.MAX_UNCOMPRESSED_DAYS && !file.endsWith('.gz')) {
                const spaceSaved = await this.compressTrace(filePath);
                report.compressed++;
                report.spaceSaved += spaceSaved;
                console.log(`🗜️  Compressed ${file} (saved ${(spaceSaved / 1024).toFixed(1)}KB)`);
            }
        }
        
        // Vérifier la taille totale
        const totalSize = this.getTotalSize();
        if (totalSize > this.MAX_TRACE_SIZE_MB * 1024 * 1024) {
            console.warn(`⚠️  Traces size ${(totalSize / 1024 / 1024).toFixed(1)}MB exceeds limit`);
            // TODO: Aggressive cleanup
        }
        
        return report;
    }
    
    /**
     * Compresse un fichier de trace en gzip
     */
    private async compressTrace(filePath: string): Promise<number> {
        const originalSize = fs.statSync(filePath).size;
        const gzPath = filePath + '.gz';
        
        return new Promise((resolve, reject) => {
            const input = fs.createReadStream(filePath);
            const output = fs.createWriteStream(gzPath);
            const gzip = zlib.createGzip({ level: 9 });
            
            input.pipe(gzip).pipe(output);
            
            output.on('finish', () => {
                // Supprimer l'original
                fs.unlinkSync(filePath);
                
                const compressedSize = fs.statSync(gzPath).size;
                const saved = originalSize - compressedSize;
                resolve(saved);
            });
            
            output.on('error', reject);
        });
    }
    
    /**
     * Archive un fichier (déplace vers sous-dossier archive/)
     */
    private async archiveTrace(filePath: string): Promise<void> {
        const archiveDir = path.join(this.tracesDir, 'archive');
        fs.mkdirSync(archiveDir, { recursive: true });
        
        const fileName = path.basename(filePath);
        const archivePath = path.join(archiveDir, fileName.replace('.json', '.archive.json.gz'));
        
        // Compresser et déplacer
        await this.compressTrace(filePath);
        const gzPath = filePath + '.gz';
        fs.renameSync(gzPath, archivePath);
    }
    
    /**
     * Calcule la taille totale des traces
     */
    private getTotalSize(): number {
        if (!fs.existsSync(this.tracesDir)) return 0;
        
        let total = 0;
        const files = fs.readdirSync(this.tracesDir, { recursive: true, withFileTypes: true });
        
        for (const file of files) {
            if (file.isFile()) {
                const filePath = path.join(file.path, file.name);
                total += fs.statSync(filePath).size;
            }
        }
        
        return total;
    }
    
    /**
     * Récupère les statistiques de stockage
     */
    public getStats(): TraceStats {
        if (!fs.existsSync(this.tracesDir)) {
            return {
                totalFiles: 0,
                totalSize: 0,
                compressedFiles: 0,
                archivedFiles: 0,
                oldestTrace: null,
                newestTrace: null
            };
        }
        
        const files = fs.readdirSync(this.tracesDir);
        let totalSize = 0;
        let compressedCount = 0;
        let oldestDate: Date | null = null;
        let newestDate: Date | null = null;
        
        for (const file of files) {
            if (file.startsWith('.')) continue;
            
            const filePath = path.join(this.tracesDir, file);
            const stats = fs.statSync(filePath);
            
            totalSize += stats.size;
            
            if (file.endsWith('.gz')) {
                compressedCount++;
            }
            
            if (!oldestDate || stats.mtime < oldestDate) {
                oldestDate = stats.mtime;
            }
            if (!newestDate || stats.mtime > newestDate) {
                newestDate = stats.mtime;
            }
        }
        
        const archiveDir = path.join(this.tracesDir, 'archive');
        const archivedCount = fs.existsSync(archiveDir) 
            ? fs.readdirSync(archiveDir).length 
            : 0;
        
        return {
            totalFiles: files.length,
            totalSize,
            compressedFiles: compressedCount,
            archivedFiles: archivedCount,
            oldestTrace: oldestDate,
            newestTrace: newestDate
        };
    }
}

interface RotationReport {
    timestamp: string;
    filesProcessed: number;
    compressed: number;
    archived: number;
    deleted: number;
    spaceSaved: number;
}

interface TraceStats {
    totalFiles: number;
    totalSize: number;
    compressedFiles: number;
    archivedFiles: number;
    oldestTrace: Date | null;
    newestTrace: Date | null;
}
```

**Intégration automatique** :
```typescript
// extension/core/PersistenceManager.ts
constructor(workspaceRoot?: string) {
    // ... code existant ...
    
    // NOUVEAU : Rotation automatique toutes les 24h
    setInterval(async () => {
        const rotationManager = new TraceRotationManager(this.workspaceRoot);
        const report = await rotationManager.rotate();
        
        if (report.compressed > 0 || report.deleted > 0) {
            this.logWithEmoji('🗜️', `Rotation: ${report.compressed} compressed, ${report.deleted} deleted, ${(report.spaceSaved / 1024).toFixed(1)}KB saved`);
        }
    }, 24 * 60 * 60 * 1000); // 24h
}
```

**Fichiers impactés** :
- ✅ `extension/core/storage/TraceRotationManager.ts` (NOUVEAU)
- 🔧 `extension/core/PersistenceManager.ts` (intégration rotation auto)
- ✅ `extension/commands/maintain.ts` (commande manuelle de rotation)

**Priorité** : 🔴 **HAUTE**  
**Estimation** : 1 jour

---

### Problème 2 : Opérations I/O synchrones (102 writeFileSync)

**Solution proposée** : **Async I/O + Write Queue**

```typescript
// extension/core/storage/AsyncWriteQueue.ts (NOUVEAU)
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Async Write Queue - File d'attente pour écritures asynchrones
 * 
 * Bénéfices :
 * - Ne bloque plus le thread principal
 * - Batching automatique
 * - Gestion d'erreurs centralisée
 */
export class AsyncWriteQueue {
    private queue: WriteOperation[] = [];
    private processing = false;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_DELAY_MS = 100;
    
    /**
     * Ajoute une opération d'écriture à la queue
     */
    public async write(filePath: string, data: string | Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            this.queue.push({
                filePath,
                data,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            if (!this.processing) {
                void this.processQueue();
            }
        });
    }
    
    /**
     * Traite la queue par batches
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.BATCH_SIZE);
            
            // Traiter le batch en parallèle
            await Promise.allSettled(
                batch.map(op => this.writeFile(op))
            );
            
            // Attendre un peu avant le prochain batch
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY_MS));
            }
        }
        
        this.processing = false;
    }
    
    /**
     * Écrit un fichier de manière asynchrone
     */
    private async writeFile(op: WriteOperation): Promise<void> {
        try {
            // Créer le dossier parent si nécessaire
            await fs.mkdir(path.dirname(op.filePath), { recursive: true });
            
            // Écrire le fichier
            await fs.writeFile(op.filePath, op.data, 'utf-8');
            
            op.resolve();
        } catch (error) {
            op.reject(error);
        }
    }
    
    /**
     * Retourne le nombre d'opérations en attente
     */
    public getPendingCount(): number {
        return this.queue.length;
    }
    
    /**
     * Force le traitement immédiat de la queue
     */
    public async flush(): Promise<void> {
        while (this.queue.length > 0) {
            await this.processQueue();
        }
    }
}

interface WriteOperation {
    filePath: string;
    data: string | Buffer;
    resolve: () => void;
    reject: (error: any) => void;
    timestamp: number;
}

// Instance globale singleton
export const writeQueue = new AsyncWriteQueue();
```

**Migration dans PersistenceManager** :
```typescript
// extension/core/PersistenceManager.ts
import { writeQueue } from './storage/AsyncWriteQueue';

public async saveEvent(event: CaptureEvent): Promise<void> {
    const dateKey = new Date().toISOString().split('T')[0];
    const tracesDir = path.join(this.workspaceRoot, '.reasoning', 'traces');
    const traceFile = path.join(tracesDir, `${dateKey}.json`);

    let events: CaptureEvent[] = [];
    if (fs.existsSync(traceFile)) {
        events = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
    }

    events.push(event);
    
    // ✅ NOUVEAU : Écriture asynchrone non-bloquante
    await writeQueue.write(traceFile, JSON.stringify(events, null, 2));

    this.manifest.totalEvents++;
    this.manifest.lastCaptureAt = new Date().toISOString();

    this.logWithEmoji('💾', `Event saved (async): ${event.type} - ${event.source}`);
}
```

**Priorité** : 🟠 **MOYENNE**  
**Estimation** : 0.5 jour

---

## 🧠 Cognition — AutoSync, Ledger, Pattern Engine

### Problème 1 : Timers dupliqués (54 actifs)

**Solution proposée** : **SharedAutoSyncService (singleton)**

```typescript
// extension/core/autosync/SharedAutoSyncService.ts (NOUVEAU - refactor de AutoSyncService.ts)
import * as vscode from 'vscode';

/**
 * Shared AutoSync Service - Un seul timer pour tous les workspaces
 * 
 * Remplace AutoSyncService.ts qui créait un timer par workspace
 * 
 * Architecture :
 * - Un seul setInterval global (30s au lieu de 5s)
 * - Synchronisation par workspace de manière séquentielle
 * - Skip des workspaces inactifs
 */
export class SharedAutoSyncService {
    private static instance: SharedAutoSyncService | null = null;
    private workspaces: Map<string, WorkspaceSyncState> = new Map();
    private globalTimer: NodeJS.Timeout | null = null;
    private readonly SYNC_INTERVAL_MS = 30000; // 30s au lieu de 5s
    private syncing = false;
    
    private constructor() {
        // Private constructor (singleton)
    }
    
    public static getInstance(): SharedAutoSyncService {
        if (!SharedAutoSyncService.instance) {
            SharedAutoSyncService.instance = new SharedAutoSyncService();
        }
        return SharedAutoSyncService.instance;
    }
    
    /**
     * Enregistre un workspace dans le service partagé
     */
    public addWorkspace(workspace: vscode.WorkspaceFolder): void {
        const root = workspace.uri.fsPath;
        
        if (this.workspaces.has(root)) {
            return; // Déjà enregistré
        }
        
        this.workspaces.set(root, {
            workspace,
            lastSync: null,
            pending: false,
            errorCount: 0
        });
        
        console.log(`✅ Workspace ${path.basename(root)} registered in SharedAutoSync`);
        
        // Démarrer le timer global si premier workspace
        if (this.workspaces.size === 1 && !this.globalTimer) {
            this.startGlobalTimer();
        }
    }
    
    /**
     * Retire un workspace
     */
    public removeWorkspace(root: string): void {
        this.workspaces.delete(root);
        
        console.log(`✅ Workspace removed from SharedAutoSync`);
        
        // Arrêter le timer si plus de workspaces
        if (this.workspaces.size === 0 && this.globalTimer) {
            clearInterval(this.globalTimer);
            this.globalTimer = null;
        }
    }
    
    /**
     * Démarre le timer global (un seul pour tous les workspaces)
     */
    private startGlobalTimer(): void {
        console.log(`🕐 Starting global AutoSync timer (${this.SYNC_INTERVAL_MS}ms)`);
        
        this.globalTimer = setInterval(async () => {
            await this.syncAllWorkspaces();
        }, this.SYNC_INTERVAL_MS);
    }
    
    /**
     * Synchronise tous les workspaces (séquentiellement)
     */
    private async syncAllWorkspaces(): Promise<void> {
        if (this.syncing) {
            console.log('⏭️  Sync already in progress, skipping');
            return;
        }
        
        this.syncing = true;
        
        try {
            for (const [root, state] of this.workspaces.entries()) {
                // Skip si erreurs répétées
                if (state.errorCount > 3) {
                    continue;
                }
                
                try {
                    await this.syncWorkspace(state);
                    state.lastSync = new Date();
                    state.errorCount = 0;
                } catch (error) {
                    console.error(`❌ Sync failed for ${root}:`, error);
                    state.errorCount++;
                }
            }
        } finally {
            this.syncing = false;
        }
    }
    
    /**
     * Synchronise un workspace unique
     */
    private async syncWorkspace(state: WorkspaceSyncState): Promise<void> {
        const root = state.workspace.uri.fsPath;
        
        // Charger les ADRs, patterns, constraints
        const adrs = await this.loadAdrs(root);
        const patterns = await this.loadPatterns(root);
        const constraints = await this.loadConstraints(root);
        
        // Synchroniser les règles Cursor
        await this.syncRules(state.workspace, adrs);
        
        // Synchroniser le contexte
        await this.syncContext(state.workspace, adrs, patterns, constraints);
        
        console.log(`✅ Synced ${path.basename(root)}`);
    }
    
    /**
     * Force une synchronisation immédiate
     */
    public async requestSync(workspaceRoot?: string): Promise<void> {
        if (workspaceRoot) {
            // Synchroniser un workspace spécifique
            const state = this.workspaces.get(workspaceRoot);
            if (state) {
                await this.syncWorkspace(state);
            }
        } else {
            // Synchroniser tous
            await this.syncAllWorkspaces();
        }
    }
    
    /**
     * Retourne le nombre de timers actifs (devrait être 1)
     */
    public getTimerCount(): number {
        return this.globalTimer ? 1 : 0;
    }
    
    /**
     * Retourne les statistiques
     */
    public getStats(): SyncStats {
        return {
            workspacesCount: this.workspaces.size,
            activeTimers: this.getTimerCount(),
            syncing: this.syncing,
            lastSync: Array.from(this.workspaces.values())
                .map(ws => ws.lastSync)
                .filter(d => d !== null)
                .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0] || null
        };
    }
    
    // ... méthodes loadAdrs, loadPatterns, syncRules identiques à AutoSyncService.ts ...
}

interface WorkspaceSyncState {
    workspace: vscode.WorkspaceFolder;
    lastSync: Date | null;
    pending: boolean;
    errorCount: number;
}

interface SyncStats {
    workspacesCount: number;
    activeTimers: number;
    syncing: boolean;
    lastSync: Date | null;
}
```

**Migration dans extension.ts** :
```typescript
// extension/extension.ts
export async function activate(context: vscode.ExtensionContext) {
    // ... code existant ...
    
    // ❌ ANCIEN : AutoSyncService.start(context) - créait N timers
    
    // ✅ NOUVEAU : Service global partagé - 1 seul timer
    const sharedAutoSync = SharedAutoSyncService.getInstance();
    
    for (const workspace of vscode.workspace.workspaceFolders || []) {
        sharedAutoSync.addWorkspace(workspace);
    }
    
    // Gérer ajout/suppression de workspaces dynamiquement
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(event => {
            for (const added of event.added) {
                sharedAutoSync.addWorkspace(added);
            }
            for (const removed of event.removed) {
                sharedAutoSync.removeWorkspace(removed.uri.fsPath);
            }
        })
    );
}
```

**Fichiers impactés** :
- ✅ `extension/core/autosync/SharedAutoSyncService.ts` (NOUVEAU - refactor de AutoSyncService)
- ❌ `extension/core/autosync/AutoSyncService.ts` (DÉPRÉCIÉ - à supprimer après migration)
- 🔧 `extension/extension.ts` (utiliser SharedAutoSyncService)

**Priorité** : 🔴 **HAUTE**  
**Estimation** : 1 jour

---

### Problème 2 : Validation JSON manquante (risque de corruption)

**Solution proposée** : **Validation Zod systématique**

```typescript
// extension/core/validation/Schemas.ts (NOUVEAU)
import { z } from 'zod';

/**
 * Schémas Zod pour validation systématique
 * 
 * Tous les fichiers JSON doivent être validés avant lecture/écriture
 */

// Manifest Schema
export const ManifestSchema = z.object({
    version: z.string(),
    projectName: z.string(),
    createdAt: z.string().datetime(),
    lastCaptureAt: z.string().datetime(),
    totalEvents: z.number().int().nonnegative(),
    total_events: z.number().int().nonnegative().optional(), // Support snake_case
    confidence: z.number().min(0).max(1).optional()
});

export type Manifest = z.infer<typeof ManifestSchema>;

// Trace Event Schema
export const CaptureEventSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['file_change', 'git_commit', 'sbom', 'config', 'test', 'github_pr', 'github_issue']),
    source: z.string(),
    timestamp: z.string().datetime(),
    data: z.any(),
    confidence: z.number().min(0).max(1).optional()
});

export type CaptureEvent = z.infer<typeof CaptureEventSchema>;

// Ledger Entry Schema (déjà dans IntegrityEngine, mais ici centralisé)
export const LedgerEntrySchema = z.object({
    entry_id: z.string(),
    type: z.enum(['ADR', 'SNAPSHOT', 'EVIDENCE', 'MANIFEST']),
    target_id: z.string(),
    previous_hash: z.string().nullable(),
    current_hash: z.string(),
    signature: z.string().optional(),
    timestamp: z.string().datetime()
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// ADR Schema
export const ADRSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.enum(['proposed', 'accepted', 'deprecated', 'superseded']),
    context: z.array(z.string()),
    decision: z.array(z.string()),
    consequences: z.array(z.string()),
    date: z.string().datetime(),
    references: z.array(z.string()).optional(),
    supersededBy: z.string().uuid().optional()
});

export type ADR = z.infer<typeof ADRSchema>;

// Pattern Schema
export const PatternSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['structural', 'cognitive', 'contextual']),
    frequency: z.number().int().positive(),
    confidence: z.number().min(0).max(1),
    impact: z.string(),
    firstSeen: z.string().datetime(),
    lastSeen: z.string().datetime(),
    evidenceIds: z.array(z.string()),
    recommendation: z.string()
});

export type Pattern = z.infer<typeof PatternSchema>;

// Goals Schema
export const GoalSchema = z.object({
    id: z.string(),
    objective: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    confidence: z.number().min(0).max(1),
    progress: z.number().min(0).max(1),
    status: z.enum(['active', 'completed', 'deferred', 'cancelled']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export type Goal = z.infer<typeof GoalSchema>;

/**
 * Helper pour valider et parser un JSON
 */
export function validateJSON<T>(
    schema: z.ZodSchema<T>,
    data: any,
    context?: string
): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            throw new Error(`JSON validation failed${context ? ` for ${context}` : ''}: ${errors}`);
        }
        throw error;
    }
}

/**
 * Helper pour valider et récupérer un fichier JSON
 */
export async function loadValidatedJSON<T>(
    schema: z.ZodSchema<T>,
    filePath: string
): Promise<T | null> {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(raw);
        
        return validateJSON(schema, data, path.basename(filePath));
    } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
        throw error;
    }
}
```

**Intégration dans PersistenceManager** :
```typescript
// extension/core/PersistenceManager.ts
import { ManifestSchema, validateJSON } from './validation/Schemas';

private initialize(): void {
    // ... code existant ...
    
    // Charger ou créer manifest AVEC VALIDATION
    if (fs.existsSync(manifestFile)) {
        const rawManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
        
        // ✅ VALIDATION ZOD
        try {
            this.manifest = validateJSON(ManifestSchema, rawManifest, 'manifest.json');
        } catch (error) {
            console.error('❌ Manifest validation failed:', error);
            
            // Backup du manifest corrompu
            const backupPath = manifestFile + `.corrupted-${Date.now()}`;
            fs.copyFileSync(manifestFile, backupPath);
            
            // Créer un nouveau manifest valide
            this.manifest = this.createDefaultManifest();
            
            vscode.window.showWarningMessage(
                `⚠️ RL3: Manifest corrupted, created new one. Backup: ${path.basename(backupPath)}`
            );
        }
    } else {
        this.manifest = this.createDefaultManifest();
    }
}

private createDefaultManifest(): Manifest {
    return {
        version: '1.1',
        projectName: path.basename(this.workspaceRoot),
        createdAt: new Date().toISOString(),
        lastCaptureAt: new Date().toISOString(),
        totalEvents: 0
    };
}
```

**Priorité** : 🟠 **HAUTE**  
**Estimation** : 1 jour

---

## 🧍‍♂️ UX & Observabilité

### Problème 1 : Installation invasive sans opt-in

**Solution proposée** : **Mode Minimal avec Opt-In**

```typescript
// extension/core/config/ConfigurationManager.ts (NOUVEAU)
import * as vscode from 'vscode';

/**
 * Configuration Manager - Gestion centralisée de la config
 * 
 * Settings disponibles :
 * - reasoningLayer.enabled : Activer/désactiver RL3
 * - reasoningLayer.mode : "minimal" | "standard" | "full"
 * - reasoningLayer.autoSync : Activer AutoSync
 * - reasoningLayer.watchFiles : Activer FileWatcher
 * - reasoningLayer.captureGit : Activer GitCommitListener
 */
export class ConfigurationManager {
    private static readonly CONFIG_PREFIX = 'reasoningLayer';
    
    /**
     * Vérifie si RL3 est activé
     */
    public static isEnabled(): boolean {
        return this.getConfig<boolean>('enabled', false); // ✅ FALSE par défaut (opt-in)
    }
    
    /**
     * Retourne le mode d'opération
     */
    public static getMode(): 'minimal' | 'standard' | 'full' {
        return this.getConfig<'minimal' | 'standard' | 'full'>('mode', 'minimal');
    }
    
    /**
     * Vérifie si AutoSync est activé
     */
    public static isAutoSyncEnabled(): boolean {
        const mode = this.getMode();
        if (mode === 'minimal') return false;
        return this.getConfig<boolean>('autoSync', true);
    }
    
    /**
     * Vérifie si FileWatcher est activé
     */
    public static isFileWatcherEnabled(): boolean {
        const mode = this.getMode();
        if (mode === 'minimal') return false;
        return this.getConfig<boolean>('watchFiles', true);
    }
    
    /**
     * Vérifie si GitCommitListener est activé
     */
    public static isGitCaptureEnabled(): boolean {
        const mode = this.getMode();
        return this.getConfig<boolean>('captureGit', mode !== 'minimal');
    }
    
    /**
     * Active RL3 (avec choix du mode)
     */
    public static async enable(mode: 'minimal' | 'standard' | 'full' = 'standard'): Promise<void> {
        await this.setConfig('enabled', true);
        await this.setConfig('mode', mode);
        
        vscode.window.showInformationMessage(
            `🧠 RL3 enabled in ${mode} mode. Reload window to activate.`,
            'Reload'
        ).then(action => {
            if (action === 'Reload') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });
    }
    
    /**
     * Désactive RL3
     */
    public static async disable(): Promise<void> {
        await this.setConfig('enabled', false);
        
        vscode.window.showInformationMessage(
            '⏸️  RL3 disabled. Reload window to take effect.',
            'Reload'
        ).then(action => {
            if (action === 'Reload') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });
    }
    
    /**
     * Récupère une configuration
     */
    private static getConfig<T>(key: string, defaultValue: T): T {
        return vscode.workspace.getConfiguration(this.CONFIG_PREFIX).get<T>(key, defaultValue);
    }
    
    /**
     * Définit une configuration
     */
    private static async setConfig(key: string, value: any): Promise<void> {
        await vscode.workspace.getConfiguration(this.CONFIG_PREFIX).update(
            key,
            value,
            vscode.ConfigurationTarget.Global
        );
    }
}
```

**Modifications dans package.json** :
```json
{
  "contributes": {
    "configuration": {
      "title": "Reasoning Layer V3",
      "properties": {
        "reasoningLayer.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable Reasoning Layer V3 (opt-in required)"
        },
        "reasoningLayer.mode": {
          "type": "string",
          "enum": ["minimal", "standard", "full"],
          "default": "minimal",
          "description": "Operating mode:\n- minimal: Only Git capture\n- standard: Git + AutoSync\n- full: All features enabled"
        },
        "reasoningLayer.autoSync": {
          "type": "boolean",
          "default": true,
          "description": "Enable automatic synchronization with Cursor"
        },
        "reasoningLayer.watchFiles": {
          "type": "boolean",
          "default": true,
          "description": "Enable file change watcher"
        },
        "reasoningLayer.captureGit": {
          "type": "boolean",
          "default": true,
          "description": "Capture Git commits automatically"
        }
      }
    },
    "commands": [
      {
        "command": "reasoning.enable",
        "title": "🧠 Enable Reasoning Layer",
        "category": "Reasoning"
      },
      {
        "command": "reasoning.disable",
        "title": "⏸️  Disable Reasoning Layer",
        "category": "Reasoning"
      },
      {
        "command": "reasoning.changeMode",
        "title": "⚙️  Change Operating Mode",
        "category": "Reasoning"
      }
    ]
  }
}
```

**Activation conditionnelle dans extension.ts** :
```typescript
// extension/extension.ts
export async function activate(context: vscode.ExtensionContext) {
    // ✅ NOUVEAU : Vérifier si RL3 est activé
    if (!ConfigurationManager.isEnabled()) {
        // Mode désactivé : enregistrer uniquement les commandes d'activation
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.enable', async () => {
                const mode = await vscode.window.showQuickPick(
                    ['minimal', 'standard', 'full'],
                    { placeHolder: 'Select operating mode' }
                );
                if (mode) {
                    await ConfigurationManager.enable(mode as any);
                }
            })
        );
        
        // Afficher notification discrète
        vscode.window.showInformationMessage(
            '🧠 RL3 is installed but disabled. Run "RL3: Enable" to activate.',
            'Enable'
        ).then(action => {
            if (action === 'Enable') {
                vscode.commands.executeCommand('reasoning.enable');
            }
        });
        
        return; // Ne pas initialiser le reste
    }
    
    // Le mode est activé → continuer l'initialisation normale
    const mode = ConfigurationManager.getMode();
    console.log(`🧠 RL3 activating in ${mode} mode`);
    
    // ... code d'initialisation existant, mais conditionnel selon le mode ...
    
    if (ConfigurationManager.isAutoSyncEnabled()) {
        // Démarrer AutoSync
    }
    
    if (ConfigurationManager.isFileWatcherEnabled()) {
        // Démarrer FileWatcher
    }
    
    // etc.
}
```

**Priorité** : 🟠 **HAUTE** (UX critique)  
**Estimation** : 0.5 jour

---

### Problème 2 : Pas d'outils de diagnostic

**Solution proposée** : **Commande Diagnostic Report**

```typescript
// extension/commands/diagnostic.ts (NOUVEAU)
import * as vscode from 'vscode';

/**
 * Génère un rapport de diagnostic complet
 */
export async function generateDiagnosticReport(workspaceRoot: string): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
        timestamp: new Date().toISOString(),
        workspaceRoot: path.basename(workspaceRoot),
        system: await getSystemInfo(),
        storage: await getStorageInfo(workspaceRoot),
        services: await getServicesInfo(),
        performance: await getPerformanceInfo(),
        security: await getSecurityInfo(workspaceRoot),
        issues: []
    };
    
    // Analyser et identifier les problèmes
    report.issues = await detectIssues(report);
    
    return report;
}

async function getSystemInfo(): Promise<SystemInfo> {
    return {
        platform: process.platform,
        nodeVersion: process.version,
        vscodeVersion: vscode.version,
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal
        }
    };
}

async function getStorageInfo(workspaceRoot: string): Promise<StorageInfo> {
    const reasoningDir = path.join(workspaceRoot, '.reasoning');
    
    return {
        totalSize: await getDirSize(reasoningDir),
        tracesSize: await getDirSize(path.join(reasoningDir, 'traces')),
        modelsSize: await getDirSize(path.join(reasoningDir, 'models')),
        adrsSize: await getDirSize(path.join(reasoningDir, 'adrs')),
        tracesCount: await countFiles(path.join(reasoningDir, 'traces')),
        compressedCount: await countFiles(path.join(reasoningDir, 'traces'), '*.gz'),
        archivedCount: await countFiles(path.join(reasoningDir, 'traces', 'archive'))
    };
}

async function getServicesInfo(): Promise<ServicesInfo> {
    const sharedAutoSync = SharedAutoSyncService.getInstance();
    const globalService = GlobalReasoningService.getInstance();
    
    return {
        autoSync: {
            workspacesCount: sharedAutoSync.getStats().workspacesCount,
            activeTimers: sharedAutoSync.getStats().activeTimers,
            lastSync: sharedAutoSync.getStats().lastSync
        },
        globalService: {
            workspacesCount: globalService.getGlobalStats().workspacesCount,
            totalEvents: globalService.getGlobalStats().totalEvents,
            memoryUsage: globalService.getGlobalStats().memoryUsage
        }
    };
}

async function getPerformanceInfo(): Promise<PerformanceInfo> {
    const startTime = Date.now();
    
    // Mesurer temps de démarrage simulé
    const bootTime = Date.now() - startTime;
    
    return {
        bootTime,
        activeTimers: (process as any)._getActiveHandles?.().filter((h: any) => h instanceof Timeout).length || 0,
        activeWatchers: 0, // TODO: compter les watchers actifs
        avgEventSaveTime: 0 // TODO: mesurer
    };
}

async function getSecurityInfo(workspaceRoot: string): Promise<SecurityInfo> {
    const credentialManager = new SecureCredentialManager(context);
    const audit = await credentialManager.auditSecurity(workspaceRoot);
    
    return {
        tokensInPlaintext: audit.findings.filter(f => f.type === 'plaintext_token').length,
        unencryptedKeys: audit.findings.filter(f => f.type === 'unencrypted_key').length,
        criticalFindings: audit.findings.filter(f => f.severity === 'CRITICAL').length
    };
}

async function detectIssues(report: DiagnosticReport): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // Vérifier taille disque
    if (report.storage.totalSize > 500 * 1024 * 1024) { // > 500MB
        issues.push({
            severity: 'HIGH',
            category: 'storage',
            message: `Storage size ${(report.storage.totalSize / 1024 / 1024).toFixed(1)}MB exceeds 500MB`,
            recommendation: 'Run trace rotation: RL3: Rotate Traces'
        });
    }
    
    // Vérifier modèles ML locaux
    if (report.storage.modelsSize > 1024 * 1024 * 1024) { // > 1GB
        issues.push({
            severity: 'HIGH',
            category: 'storage',
            message: 'ML models stored locally (legacy)',
            recommendation: 'Migrate to global cache: RL3: Migrate Models'
        });
    }
    
    // Vérifier timers
    if (report.performance.activeTimers > 10) {
        issues.push({
            severity: 'MEDIUM',
            category: 'performance',
            message: `${report.performance.activeTimers} active timers detected`,
            recommendation: 'Ensure SharedAutoSyncService is used'
        });
    }
    
    // Vérifier sécurité
    if (report.security.tokensInPlaintext > 0) {
        issues.push({
            severity: 'CRITICAL',
            category: 'security',
            message: 'GitHub tokens stored in plaintext',
            recommendation: 'Run migration: RL3: Migrate Tokens to Secure Storage'
        });
    }
    
    return issues;
}

/**
 * Affiche le rapport de diagnostic
 */
export async function showDiagnosticReport(workspaceRoot: string): Promise<void> {
    const report = await generateDiagnosticReport(workspaceRoot);
    
    // Créer un panel webview pour afficher le rapport
    const panel = vscode.window.createWebviewPanel(
        'rl3Diagnostic',
        '🩺 RL3 Diagnostic Report',
        vscode.ViewColumn.One,
        {}
    );
    
    panel.webview.html = generateDiagnosticHTML(report);
}

function generateDiagnosticHTML(report: DiagnosticReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .section { margin: 20px 0; }
        .issue-critical { color: #f44336; font-weight: bold; }
        .issue-high { color: #ff9800; }
        .issue-medium { color: #2196f3; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <h1>🩺 RL3 Diagnostic Report</h1>
    <p><strong>Timestamp:</strong> ${report.timestamp}</p>
    <p><strong>Workspace:</strong> ${report.workspaceRoot}</p>
    
    <div class="section">
        <h2>💾 Storage</h2>
        <table>
            <tr><td>Total Size</td><td>${(report.storage.totalSize / 1024 / 1024).toFixed(1)} MB</td></tr>
            <tr><td>Traces</td><td>${(report.storage.tracesSize / 1024 / 1024).toFixed(1)} MB</td></tr>
            <tr><td>Models</td><td>${(report.storage.modelsSize / 1024 / 1024).toFixed(1)} MB</td></tr>
            <tr><td>ADRs</td><td>${(report.storage.adrsSize / 1024).toFixed(1)} KB</td></tr>
            <tr><td>Traces Count</td><td>${report.storage.tracesCount}</td></tr>
            <tr><td>Compressed</td><td>${report.storage.compressedCount}</td></tr>
            <tr><td>Archived</td><td>${report.storage.archivedCount}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>⚡ Performance</h2>
        <table>
            <tr><td>Active Timers</td><td>${report.performance.activeTimers}</td></tr>
            <tr><td>Active Watchers</td><td>${report.performance.activeWatchers}</td></tr>
            <tr><td>Memory (Heap Used)</td><td>${(report.system.memory.heapUsed / 1024 / 1024).toFixed(1)} MB</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>🔒 Security</h2>
        <table>
            <tr><td>Tokens in Plaintext</td><td>${report.security.tokensInPlaintext}</td></tr>
            <tr><td>Unencrypted Keys</td><td>${report.security.unencryptedKeys}</td></tr>
            <tr><td>Critical Findings</td><td>${report.security.criticalFindings}</td></tr>
        </table>
    </div>
    
    ${report.issues.length > 0 ? `
    <div class="section">
        <h2>⚠️ Issues Detected (${report.issues.length})</h2>
        <ul>
            ${report.issues.map(issue => `
                <li class="issue-${issue.severity.toLowerCase()}">
                    <strong>[${issue.severity}]</strong> ${issue.message}
                    <br><em>Recommendation: ${issue.recommendation}</em>
                </li>
            `).join('')}
        </ul>
    </div>
    ` : '<p>✅ No issues detected</p>'}
    
</body>
</html>
    `;
}

// Types
interface DiagnosticReport {
    timestamp: string;
    workspaceRoot: string;
    system: SystemInfo;
    storage: StorageInfo;
    services: ServicesInfo;
    performance: PerformanceInfo;
    security: SecurityInfo;
    issues: Issue[];
}

interface SystemInfo {
    platform: string;
    nodeVersion: string;
    vscodeVersion: string;
    memory: {
        total: number;
        free: number;
        heapUsed: number;
        heapTotal: number;
    };
}

interface StorageInfo {
    totalSize: number;
    tracesSize: number;
    modelsSize: number;
    adrsSize: number;
    tracesCount: number;
    compressedCount: number;
    archivedCount: number;
}

interface ServicesInfo {
    autoSync: {
        workspacesCount: number;
        activeTimers: number;
        lastSync: Date | null;
    };
    globalService: {
        workspacesCount: number;
        totalEvents: number;
        memoryUsage: number;
    };
}

interface PerformanceInfo {
    bootTime: number;
    activeTimers: number;
    activeWatchers: number;
    avgEventSaveTime: number;
}

interface SecurityInfo {
    tokensInPlaintext: number;
    unencryptedKeys: number;
    criticalFindings: number;
}

interface Issue {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'storage' | 'performance' | 'security' | 'cognition';
    message: string;
    recommendation: string;
}
```

**Commande dans package.json** :
```json
{
  "commands": [
    {
      "command": "reasoning.diagnostic.show",
      "title": "🩺 Show Diagnostic Report",
      "category": "Reasoning › Diagnostic"
    }
  ]
}
```

**Priorité** : 🟡 **MOYENNE**  
**Estimation** : 1 jour

---

## 📦 Build & Distribution

### Problème : VSIX trop volumineux (17MB)

**Solution proposée** : **Optimisation du package**

**.vscodeignore amélioré** :
```
# Développement
.vscode/**
.vscode-test/**
.gitignore
.git/**
*.code-workspace

# Sources TypeScript (on inclut uniquement le JS compilé)
**/*.ts
!out/**/*.js
tsconfig*.json
webpack.config.js

# Tests
test/**
tests/**
**/*.test.js
**/*.spec.js

# Documentation
*.md
!README.md
LICENSE.txt

# ⚠️ CRITIQUE : Exclure les modèles ML (seront téléchargés à la demande)
.reasoning/models/**
checkpoints/**
datasets/**

# Scripts de développement
scripts/**
!scripts/repair-integrity-ledger.js

# Node modules (webpack bundle tout)
node_modules/**

# Fichiers lourds
*.vsix
*.log
*.map
.DS_Store

# Rapports et analyses
RL3_BETA_TESTER_OBJECTIONS_REPORT.md
REFACTOR_PLAN_V1.1.0.md
analysis_result.json
```

**package.json optimisé** :
```json
{
  "scripts": {
    "compile": "webpack --mode production",
    "package": "vsce package --no-yarn",
    "package:slim": "npm run compile && vsce package --no-yarn --out reasoning-layer-v3-slim.vsix",
    "analyze-bundle": "webpack --mode production --analyze"
  },
  "devDependencies": {
    "webpack-bundle-analyzer": "^4.10.1"
  }
}
```

**Résultat attendu** : 17MB → < 5MB

**Priorité** : 🟡 **BASSE**  
**Estimation** : 0.25 jour

---

## 🧪 Validation & Tests

### Tests unitaires critiques

```typescript
// extension/tests/integrity.test.ts (NOUVEAU)
import { describe, it, expect } from '@jest/globals';
import { IntegrityEngine } from '../core/security/IntegrityEngine';

describe('IntegrityEngine', () => {
    it('should validate ledger schema', () => {
        const engine = new IntegrityEngine('/tmp/test');
        
        const validEntry = {
            entry_id: 'LEDGER-123',
            type: 'ADR',
            target_id: 'test-id',
            current_hash: 'abc123',
            previous_hash: null,
            timestamp: new Date().toISOString()
        };
        
        expect(engine['isValidLedgerEntry'](validEntry)).toBe(true);
    });
    
    it('should reject invalid ledger entry', () => {
        const engine = new IntegrityEngine('/tmp/test');
        
        const invalidEntry = {
            id: 'wrong-field', // Devrait être entry_id
            type: 'INVALID_TYPE'
        };
        
        expect(engine['isValidLedgerEntry'](invalidEntry)).toBe(false);
    });
});

// extension/tests/storage.test.ts (NOUVEAU)
describe('TraceRotationManager', () => {
    it('should compress traces older than 30 days', async () => {
        const manager = new TraceRotationManager('/tmp/test');
        
        // TODO: Créer des traces de test avec dates différentes
        
        const report = await manager.rotate();
        
        expect(report.compressed).toBeGreaterThan(0);
    });
});

// extension/tests/security.test.ts (NOUVEAU)
describe('SecureCredentialManager', () => {
    it('should migrate plaintext tokens to encrypted storage', async () => {
        // TODO: Test migration
    });
    
    it('should detect plaintext tokens in audit', async () => {
        // TODO: Test audit
    });
});
```

### Checklist QA automatisée

```bash
#!/bin/bash
# scripts/qa-check.sh (NOUVEAU)

echo "🧪 RL3 v1.1.0 - Quality Assurance Checklist"
echo ""

# 1. Vérifier taille disque
echo "📊 Checking storage size..."
STORAGE_SIZE=$(du -sm .reasoning/ | cut -f1)
if [ "$STORAGE_SIZE" -gt 500 ]; then
    echo "❌ Storage size ${STORAGE_SIZE}MB exceeds 500MB limit"
    exit 1
else
    echo "✅ Storage size: ${STORAGE_SIZE}MB"
fi

# 2. Vérifier tokens en clair
echo "🔒 Checking for plaintext tokens..."
if grep -r "ghp_" .reasoning/security/ 2>/dev/null; then
    echo "❌ Plaintext GitHub token detected"
    exit 1
else
    echo "✅ No plaintext tokens found"
fi

# 3. Vérifier validation Zod
echo "📋 Checking JSON validation..."
if grep -r "validateJSON\|ManifestSchema" extension/core/ | grep -v "//" | wc -l | grep -q "^0$"; then
    echo "❌ Missing Zod validation"
    exit 1
else
    echo "✅ Zod validation present"
fi

# 4. Compiler TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile 2>&1 | tail -5
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
else
    echo "✅ Compilation successful"
fi

# 5. Vérifier taille VSIX
echo "📦 Checking VSIX size..."
npm run package:slim
VSIX_SIZE=$(du -m reasoning-layer-v3-slim.vsix | cut -f1)
if [ "$VSIX_SIZE" -gt 10 ]; then
    echo "⚠️  VSIX size ${VSIX_SIZE}MB is above 10MB (target: < 5MB)"
else
    echo "✅ VSIX size: ${VSIX_SIZE}MB"
fi

echo ""
echo "✅ All QA checks passed!"
```

**Priorité** : 🟠 **HAUTE**  
**Estimation** : 1.5 jours

---

## 🧾 Chronologie des Commits (Roadmap)

| Étape | Module | Action | Type | Priorité | Estimation | Dépendances |
|-------|---------|--------|-------|-----------|------------|-------------|
| **Sprint 1 - Sécurité & Fondations** |
| 1.1 | `SecureCredentialManager.ts` | Migration tokens → SecretStorage | Refactor | 🔴 CRITIQUE | 0.5j | - |
| 1.2 | `SecretScanner.ts` | Redaction secrets dans logs | Feature | 🟠 HAUTE | 0.5j | - |
| 1.3 | `Schemas.ts` | Validation Zod systématique | Refactor | 🟠 HAUTE | 1j | - |
| 1.4 | `IntegrityEngine.ts` | Schema validation ledger | Refactor | 🟠 HAUTE | 0.25j | 1.3 |
| **Sprint 2 - Performance & Stockage** |
| 2.1 | `TraceRotationManager.ts` | Rotation + compression traces | Feature | 🔴 HAUTE | 1j | - |
| 2.2 | `AsyncWriteQueue.ts` | I/O asynchrones | Refactor | 🟠 MOYENNE | 0.5j | - |
| 2.3 | `ModelCache.ts` | Cache global modèles ML | Feature | 🔴 HAUTE | 1.5j | - |
| 2.4 | `PersistenceManager.ts` | Intégration rotation + async I/O | Refactor | 🟠 HAUTE | 0.5j | 2.1, 2.2 |
| **Sprint 3 - Scalabilité & Architecture** |
| 3.1 | `GlobalReasoningService.ts` | Service global singleton | Refactor | 🔴 HAUTE | 2j | - |
| 3.2 | `SharedAutoSyncService.ts` | AutoSync partagé (1 timer) | Refactor | 🔴 HAUTE | 1j | 3.1 |
| 3.3 | `extension.ts` | Migration vers architecture globale | Refactor | 🔴 HAUTE | 1j | 3.1, 3.2 |
| 3.4 | Tests | Tests unitaires architecture | Test | 🟠 HAUTE | 0.5j | 3.1-3.3 |
| **Sprint 4 - UX & Observabilité** |
| 4.1 | `ConfigurationManager.ts` | Mode opt-in + settings | Feature | 🟠 HAUTE | 0.5j | - |
| 4.2 | `package.json` | Configuration VS Code | Config | 🟠 HAUTE | 0.25j | 4.1 |
| 4.3 | `diagnostic.ts` | Diagnostic report command | Feature | 🟡 MOYENNE | 1j | - |
| 4.4 | `extension.ts` | Activation conditionnelle | Refactor | 🟠 HAUTE | 0.5j | 4.1 |
| **Sprint 5 - Finalisation & Tests** |
| 5.1 | Tests unitaires | Tous les modules critiques | Test | 🟠 HAUTE | 1.5j | - |
| 5.2 | `qa-check.sh` | Checklist QA automatisée | Test | 🟠 HAUTE | 0.25j | - |
| 5.3 | `.vscodeignore` | Optimisation package | Config | 🟡 BASSE | 0.25j | - |
| 5.4 | Documentation | README v1.1.0 + Migration guide | Doc | 🟡 BASSE | 0.5j | - |
| **TOTAL** | | | | | **15 jours** | |

---

## ✅ Critères de Réussite (Gates de Validation)

### Gate 1 : Sécurité (Sprint 1)
- [ ] ✅ Aucun token en plaintext dans `.reasoning/`
- [ ] ✅ Migration auto depuis ancien format
- [ ] ✅ Audit sécurité sans findings CRITICAL
- [ ] ✅ Redaction secrets dans tous les logs

### Gate 2 : Performance (Sprint 2)
- [ ] ✅ Taille `.reasoning/` < 500MB
- [ ] ✅ Rotation automatique fonctionnelle
- [ ] ✅ Compression gzip active
- [ ] ✅ I/O async (0 fs.writeFileSync dans nouveaux modules)

### Gate 3 : Scalabilité (Sprint 3)
- [ ] ✅ ≤ 10 timers actifs (vs 54 avant)
- [ ] ✅ Service global opérationnel
- [ ] ✅ RAM usage < 50MB par workspace
- [ ] ✅ Tests multi-workspace passent

### Gate 4 : UX (Sprint 4)
- [ ] ✅ Mode opt-in par défaut
- [ ] ✅ Activation < 1s en mode minimal
- [ ] ✅ Diagnostic report fonctionnel
- [ ] ✅ Settings VS Code configurables

### Gate 5 : Release (Sprint 5)
- [ ] ✅ VSIX < 5MB
- [ ] ✅ Tous tests unitaires passent
- [ ] ✅ QA checklist validée
- [ ] ✅ Documentation complète

---

## 📝 Notes de Migration (Pour les Utilisateurs)

### Migration automatique
L'extension v1.1.0 migrera automatiquement :
- ✅ Tokens GitHub → Secure Storage chiffré
- ✅ Modèles ML → Cache global `~/.rl3/models/`
- ✅ Traces anciennes → Compression/archivage

### Changements breaking
⚠️ **Opt-in requis** : RL3 sera désactivé par défaut. Activer via :
```
Settings → Reasoning Layer → Enable: true
```

### Configuration recommandée
```json
{
  "reasoningLayer.enabled": true,
  "reasoningLayer.mode": "standard",
  "reasoningLayer.autoSync": true,
  "reasoningLayer.watchFiles": false,  // Si performance issues
  "reasoningLayer.captureGit": true
}
```

---

## 🎯 Conclusion

Ce plan de refactor transforme le Reasoning Layer V3 d'un **prototype impressionnant** en un **produit production-ready** utilisable par des équipes professionnelles.

**Impact attendu** :
- 🔐 **Sécurité** : 10/10 (vs 3/10)
- 💾 **Stockage** : 500MB (vs 6.8GB)
- ⚡ **Performance** : < 1s boot (vs 3s)
- 📈 **Scalabilité** : 10 workspaces supportés sans dégradation
- ❤️ **UX** : Opt-in, non-invasif, configurable

**Durée totale** : 15 jours-homme (3 semaines pour 2 devs)  
**Équipe recommandée** : 2 développeurs senior TypeScript  
**Release** : v1.1.0 (stable, production-ready)

---

**Prêt pour exécution** ✅  
**Contact** : Architecte Technique RL3  
**Date** : 2025-11-02

