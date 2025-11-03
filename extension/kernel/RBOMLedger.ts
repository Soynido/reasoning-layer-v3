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

export interface CycleSummary {
    cycleId: number;
    timestamp: string;
    phases: {
        patterns: { hash: string; count: number };
        correlations: { hash: string; count: number };
        forecasts: { hash: string; count: number };
        adrs: { hash: string; count: number };
    };
    merkleRoot: string;
}

export class RBOMLedger {
    private writer: AppendOnlyWriter;
    private cyclesWriter: AppendOnlyWriter;
    private entries: RBOMEntry[] = [];
    private merkleRoots: MerkleRoot[] = [];
    
    constructor(ledgerPath: string) {
        this.writer = new AppendOnlyWriter(ledgerPath);
        // Cycles writer in same directory
        const cyclesPath = ledgerPath.replace('rbom_ledger.jsonl', 'cycles.jsonl');
        this.cyclesWriter = new AppendOnlyWriter(cyclesPath);
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
     * Hash a batch of items (for phase-level integrity)
     */
    hashBatch(items: any[]): string {
        if (items.length === 0) return '';
        const combined = JSON.stringify(items);
        return crypto.createHash('sha256').update(combined).digest('hex');
    }
    
    /**
     * Compute Merkle root from multiple hashes
     */
    computeRoot(hashes: string[]): string {
        return this.merkleTreeRoot(hashes);
    }
    
    /**
     * Append cycle summary to cycles.jsonl
     */
    async appendCycle(cycle: CycleSummary): Promise<void> {
        await this.cyclesWriter.append(cycle);
        
        // Update merkle roots cache
        this.merkleRoots.push({
            root: cycle.merkleRoot,
            entryCount: this.entries.length,
            timestamp: cycle.timestamp
        });
    }
    
    /**
     * Get last cycle summary
     */
    async getLastCycle(): Promise<CycleSummary | null> {
        const cycles = await this.cyclesWriter.readAll();
        return cycles.length > 0 ? cycles[cycles.length - 1] : null;
    }
    
    /**
     * Verify entire chain (expensive - use sparingly)
     */
    async verifyChain(): Promise<boolean> {
        const result = await this.verify();
        
        // Also verify cycles
        const cycles = await this.cyclesWriter.readAll();
        for (const cycle of cycles) {
            // Recompute phase hashes and verify
            const phaseHashes = [
                cycle.phases.patterns.hash,
                cycle.phases.correlations.hash,
                cycle.phases.forecasts.hash,
                cycle.phases.adrs.hash
            ];
            const recomputedRoot = this.computeRoot(phaseHashes);
            if (recomputedRoot !== cycle.merkleRoot) {
                return false;
            }
        }
        
        return result.valid;
    }
    
    /**
     * Flush writers
     */
    async flush(): Promise<void> {
        await this.writer.flush(true); // fsync
        await this.cyclesWriter.flush(true); // fsync
    }
}

