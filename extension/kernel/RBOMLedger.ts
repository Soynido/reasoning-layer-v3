/**
 * RBOMLedger - Append-Only RBOM Ledger with Merkle Verification
 * 
 * Replaces array-based ADR storage with append-only JSONL + Merkle root
 * 
 * Features:
 * - Append-only (immutable)
 * - Merkle tree for integrity
 * - Snapshot verification
 * - Fast head() lookup
 * 
 * RL4 Kernel Component #6
 */

import { AppendOnlyWriter } from './AppendOnlyWriter';
import * as crypto from 'crypto';
import * as path from 'path';

export interface RBOMEntry {
    id: string;
    type: 'adr' | 'pattern' | 'correlation' | 'forecast';
    data: any;
    timestamp: string;
    hash: string;
}

export interface MerkleRoot {
    root: string;
    entryCount: number;
    timestamp: string;
}

export class RBOMLedger {
    private writer: AppendOnlyWriter;
    private entries: RBOMEntry[] = [];
    private merkleRoots: MerkleRoot[] = [];
    
    constructor(workspaceRoot: string) {
        this.writer = new AppendOnlyWriter(
            path.join(workspaceRoot, '.reasoning', 'rbom_ledger.jsonl')
        );
    }
    
    /**
     * Append entry to ledger
     * @param type - Entry type
     * @param data - Entry data
     * @returns Entry ID
     */
    async append(type: RBOMEntry['type'], data: any): Promise<string> {
        const id = this.generateId();
        const hash = this.calculateHash(data);
        
        const entry: RBOMEntry = {
            id,
            type,
            data,
            timestamp: new Date().toISOString(),
            hash
        };
        
        await this.writer.append(entry);
        this.entries.push(entry);
        
        return id;
    }
    
    /**
     * Get latest entry (head)
     */
    async head(): Promise<RBOMEntry | null> {
        if (this.entries.length > 0) {
            return this.entries[this.entries.length - 1];
        }
        
        // Load from disk if not in memory
        const allEntries = await this.writer.readAll();
        if (allEntries.length > 0) {
            return allEntries[allEntries.length - 1];
        }
        
        return null;
    }
    
    /**
     * Verify ledger integrity
     * @returns Verification result
     */
    async verify(): Promise<{ valid: boolean; errors: string[] }> {
        const entries = await this.writer.readAll();
        const errors: string[] = [];
        
        // Verify hashes
        for (const entry of entries) {
            const expectedHash = this.calculateHash(entry.data);
            if (entry.hash !== expectedHash) {
                errors.push(`Hash mismatch for entry ${entry.id}`);
            }
        }
        
        // Verify merkle roots
        for (const root of this.merkleRoots) {
            const calculatedRoot = this.calculateMerkleRoot(
                entries.slice(0, root.entryCount)
            );
            
            if (root.root !== calculatedRoot) {
                errors.push(`Merkle root mismatch at ${root.timestamp}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Create merkle snapshot
     */
    async createMerkleSnapshot(): Promise<MerkleRoot> {
        const entries = await this.writer.readAll();
        const root = this.calculateMerkleRoot(entries);
        
        const snapshot: MerkleRoot = {
            root,
            entryCount: entries.length,
            timestamp: new Date().toISOString()
        };
        
        this.merkleRoots.push(snapshot);
        
        return snapshot;
    }
    
    /**
     * Calculate Merkle root from entries
     */
    private calculateMerkleRoot(entries: RBOMEntry[]): string {
        if (entries.length === 0) {
            return '';
        }
        
        const hashes = entries.map(e => e.hash);
        return this.merkleTreeRoot(hashes);
    }
    
    /**
     * Build Merkle tree and return root
     */
    private merkleTreeRoot(hashes: string[]): string {
        if (hashes.length === 0) return '';
        if (hashes.length === 1) return hashes[0];
        
        const nextLevel: string[] = [];
        
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left; // Duplicate if odd
            const combined = crypto.createHash('sha256')
                .update(left + right)
                .digest('hex');
            nextLevel.push(combined);
        }
        
        return this.merkleTreeRoot(nextLevel);
    }
    
    /**
     * Calculate hash of data
     */
    private calculateHash(data: any): string {
        const json = JSON.stringify(data);
        return crypto.createHash('sha256').update(json).digest('hex');
    }
    
    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `rbom-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }
    
    /**
     * Flush writer
     */
    async flush(): Promise<void> {
        await this.writer.flush(true); // fsync
    }
}

