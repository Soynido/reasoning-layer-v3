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
        
        // ✅ ROBUSTNESS: Validate input type
        const validTypes = ['ADR', 'SNAPSHOT', 'EVIDENCE', 'MANIFEST'];
        if (!validTypes.includes(entry.type)) {
            throw new Error(`Invalid ledger entry type: ${entry.type}. Must be one of: ${validTypes.join(', ')}`);
        }
        
        // Get previous hash from last VALID entry
        let previousHash: string | null = null;
        if (fs.existsSync(ledgerFile)) {
            const lines = fs.readFileSync(ledgerFile, 'utf-8').split('\n').filter(l => l.trim());
            
            // ✅ ROBUSTNESS: Find last valid entry (skip corrupted ones)
            for (let i = lines.length - 1; i >= 0; i--) {
                try {
                    const lastEntry = JSON.parse(lines[i]) as LedgerEntry;
                    if (this.isValidLedgerEntry(lastEntry)) {
                        previousHash = lastEntry.current_hash;
                        break;
                    }
                } catch (error) {
                    // Skip invalid line, continue searching
                    continue;
                }
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
        const warnings: string[] = [];
        let previousHash: string | null = null;
        let validEntryCount = 0;

        for (let i = 0; i < lines.length; i++) {
            try {
                const entry = JSON.parse(lines[i]) as LedgerEntry;
                
                // ✅ ROBUSTNESS: Validate schema before processing
                if (!this.isValidLedgerEntry(entry)) {
                    warnings.push(`Line ${i + 1}: Invalid schema (entry_id: ${entry.entry_id || 'undefined'})`);
                    continue; // Skip invalid entries
                }
                
                // Verify hash chain
                if (validEntryCount > 0 && entry.previous_hash !== previousHash) {
                    errors.push(`Entry ${entry.entry_id || 'undefined'}: Hash chain broken (expected: ${previousHash}, got: ${entry.previous_hash})`);
                }
                
                previousHash = entry.current_hash;
                validEntryCount++;
            } catch (error) {
                errors.push(`Line ${i + 1}: Invalid JSON - ${(error as Error).message}`);
            }
        }
        
        // Add warnings to errors if any invalid entries found
        if (warnings.length > 0) {
            errors.push(`⚠️  Found ${warnings.length} invalid entries (use 'node scripts/repair-integrity-ledger.js' to fix)`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate ledger entry schema
     * @private
     */
    private isValidLedgerEntry(entry: any): boolean {
        const validTypes = ['ADR', 'SNAPSHOT', 'EVIDENCE', 'MANIFEST'];
        
        // Check required fields
        if (!entry.entry_id || typeof entry.entry_id !== 'string') return false;
        if (!entry.type || !validTypes.includes(entry.type)) return false;
        if (!entry.target_id || typeof entry.target_id !== 'string') return false;
        if (!entry.current_hash || typeof entry.current_hash !== 'string') return false;
        if (!('previous_hash' in entry)) return false; // Can be null
        if (!entry.timestamp || typeof entry.timestamp !== 'string') return false;
        
        return true;
    }

    /**
     * Get public key for verification by others
     */
    public getPublicKey(): string {
        return this.publicKey || '';
    }
}

