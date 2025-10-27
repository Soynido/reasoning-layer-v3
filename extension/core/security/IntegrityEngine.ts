/**
 * IntegrityEngine - Level 5: Integrity & Persistence Layer
 * 
 * Provides hash-based integrity and basic signature capabilities
 * using Node.js native crypto (SHA256) for compatibility
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface IntegrityHash {
    hash: string;
    algorithm: string;
    timestamp: string;
    dataLength: number;
}

export interface IntegritySignature {
    signature: string;
    signer: string;
    timestamp: string;
    publicKey: string;
}

export interface SignedArtifact {
    artifactId: string;
    artifactType: string;
    data: any;
    hash: IntegrityHash;
    signature?: IntegritySignature;
}

export interface LedgerEntry {
    entry_id: string;
    type: 'ADR' | 'SNAPSHOT' | 'EVIDENCE' | 'MANIFEST';
    target_id: string;
    previous_hash: string | null;
    current_hash: string;
    signature?: string;
    timestamp: string;
}

export class IntegrityEngine {
    private workspaceRoot: string;
    private ledgerPath: string;
    private keysPath: string;
    private publicKey: string | null = null;
    private privateKey: string | null = null;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.ledgerPath = path.join(workspaceRoot, '.reasoning', 'ledger');
        this.keysPath = path.join(workspaceRoot, '.reasoning', 'keys');
        
        // Ensure directories exist
        if (!fs.existsSync(this.ledgerPath)) {
            fs.mkdirSync(this.ledgerPath, { recursive: true });
        }
        if (!fs.existsSync(this.keysPath)) {
            fs.mkdirSync(this.keysPath, { recursive: true });
        }
        
        this.loadOrGenerateKeys();
    }

    /**
     * Load or generate RSA key pair for signing
     */
    private loadOrGenerateKeys(): void {
        const privateKeyPath = path.join(this.keysPath, 'private.pem');
        const publicKeyPath = path.join(this.keysPath, 'public.pem');

        if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
            this.privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
            this.publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
        } else {
            // Generate new RSA key pair
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });
            
            this.publicKey = publicKey;
            this.privateKey = privateKey;
            
            fs.writeFileSync(publicKeyPath, publicKey);
            fs.writeFileSync(privateKeyPath, privateKey);
        }
    }

    /**
     * Generate SHA256 hash for any data
     */
    public generateHash(data: any): IntegrityHash {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const hash = crypto.createHash('sha256').update(dataString, 'utf8').digest('hex');
        
        return {
            hash,
            algorithm: 'SHA256',
            timestamp: new Date().toISOString(),
            dataLength: dataString.length
        };
    }

    /**
     * Sign data with RSA private key
     */
    public sign(data: string): string {
        if (!this.privateKey) {
            throw new Error('Private key not available');
        }
        
        const signature = crypto.sign('sha256', Buffer.from(data), {
            key: this.privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        });
        
        return signature.toString('hex');
    }

    /**
     * Verify signature with RSA public key
     */
    public verify(data: string, signature: string): boolean {
        if (!this.publicKey) {
            throw new Error('Public key not available');
        }
        
        try {
            const isVerified = crypto.verify(
                'sha256',
                Buffer.from(data),
                {
                    key: this.publicKey,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(signature, 'hex')
            );
            
            return isVerified;
        } catch (error) {
            return false;
        }
    }

    /**
     * Sign an artifact (ADR, Evidence, etc.)
     */
    public signArtifact(artifactId: string, artifactType: string, data: any): SignedArtifact {
        const dataString = JSON.stringify(data);
        const hash = this.generateHash(data);
        const signatureHex = this.sign(dataString);
        
        const signature: IntegritySignature = {
            signature: signatureHex,
            signer: 'system',
            timestamp: new Date().toISOString(),
            publicKey: this.publicKey || ''
        };

        return {
            artifactId,
            artifactType,
            data,
            hash,
            signature
        };
    }

    /**
     * Append entry to integrity ledger
     */
    public appendToLedger(entry: Omit<LedgerEntry, 'entry_id' | 'previous_hash' | 'timestamp'>): void {
        const ledgerFile = path.join(this.ledgerPath, 'ledger.jsonl');
        
        // Get previous hash from last entry
        let previousHash: string | null = null;
        if (fs.existsSync(ledgerFile)) {
            const lines = fs.readFileSync(ledgerFile, 'utf-8').split('\n').filter(l => l.trim());
            if (lines.length > 0) {
                const lastEntry = JSON.parse(lines[lines.length - 1]) as LedgerEntry;
                previousHash = lastEntry.current_hash;
            }
        }

        const ledgerEntry: LedgerEntry = {
            entry_id: `LEDGER-${Date.now()}`,
            ...entry,
            previous_hash: previousHash,
            current_hash: this.generateHash(entry.target_id + previousHash).hash,
            timestamp: new Date().toISOString()
        };

        // Append to ledger (JSONL format)
        fs.appendFileSync(ledgerFile, JSON.stringify(ledgerEntry) + '\n');
    }

    /**
     * Verify integrity of ledger
     */
    public verifyLedgerIntegrity(): { valid: boolean; errors: string[] } {
        const ledgerFile = path.join(this.ledgerPath, 'ledger.jsonl');
        
        if (!fs.existsSync(ledgerFile)) {
            return { valid: true, errors: [] };
        }

        const lines = fs.readFileSync(ledgerFile, 'utf-8').split('\n').filter(l => l.trim());
        const errors: string[] = [];
        let previousHash: string | null = null;

        for (let i = 0; i < lines.length; i++) {
            try {
                const entry = JSON.parse(lines[i]) as LedgerEntry;
                
                // Verify hash chain
                if (i > 0 && entry.previous_hash !== previousHash) {
                    errors.push(`Entry ${entry.entry_id}: Hash chain broken`);
                }
                
                previousHash = entry.current_hash;
            } catch (error) {
                errors.push(`Line ${i + 1}: Invalid JSON`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get public key for verification by others
     */
    public getPublicKey(): string {
        return this.publicKey || '';
    }
}

