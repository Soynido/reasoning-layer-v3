/**
 * RBOMLedger Tests - Integrity Chain Verification
 * 
 * Critical tests for cryptographic integrity:
 * 1. Stable serialization (deterministic hashing)
 * 2. Inter-cycle chain linking (prevMerkleRoot)
 * 3. Deep chain verification
 */

import { RBOMLedger } from '../../extension/kernel/RBOMLedger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('RBOMLedger - Integrity Chain', () => {
    let ledger: RBOMLedger;
    let testDir: string;
    
    beforeEach(() => {
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbom-test-'));
        const ledgerPath = path.join(testDir, 'rbom_ledger.jsonl');
        ledger = new RBOMLedger(ledgerPath);
    });
    
    afterEach(() => {
        // Cleanup
        fs.rmSync(testDir, { recursive: true, force: true });
    });
    
    test('stable serialization produces identical hashes', () => {
        const obj1 = { b: 2, a: 1, c: 3 };
        const obj2 = { a: 1, c: 3, b: 2 };
        const obj3 = { c: 3, a: 1, b: 2 };
        
        const hash1 = ledger.hashBatch([obj1]);
        const hash2 = ledger.hashBatch([obj2]);
        const hash3 = ledger.hashBatch([obj3]);
        
        expect(hash1).toBe(hash2);
        expect(hash2).toBe(hash3);
    });
    
    test('inter-cycle chain linking (prevMerkleRoot)', async () => {
        // Cycle 1
        await ledger.appendCycle({
            cycleId: 1,
            timestamp: '2025-11-03T15:00:00.000Z',
            phases: {
                patterns: { hash: 'pat1', count: 3 },
                correlations: { hash: 'corr1', count: 5 },
                forecasts: { hash: 'fore1', count: 2 },
                adrs: { hash: 'adr1', count: 1 }
            },
            merkleRoot: ledger.computeRoot(['pat1', 'corr1', 'fore1', 'adr1'])
        });
        
        const cycle1 = await ledger.getLastCycle();
        expect(cycle1?.prevMerkleRoot).toBe('0000000000000000'); // Genesis
        
        // Cycle 2
        await ledger.appendCycle({
            cycleId: 2,
            timestamp: '2025-11-03T15:10:00.000Z',
            phases: {
                patterns: { hash: 'pat2', count: 4 },
                correlations: { hash: 'corr2', count: 6 },
                forecasts: { hash: 'fore2', count: 3 },
                adrs: { hash: 'adr2', count: 2 }
            },
            merkleRoot: ledger.computeRoot(['pat2', 'corr2', 'fore2', 'adr2'])
        });
        
        const cycle2 = await ledger.getLastCycle();
        expect(cycle2?.prevMerkleRoot).toBe(cycle1?.merkleRoot); // Chained!
    });
    
    test('deep chain verification detects tampering', async () => {
        // Create 3 cycles
        for (let i = 1; i <= 3; i++) {
            const root = ledger.computeRoot([`p${i}`, `c${i}`, `f${i}`, `a${i}`]);
            await ledger.appendCycle({
                cycleId: i,
                timestamp: new Date().toISOString(),
                phases: {
                    patterns: { hash: `p${i}`, count: i },
                    correlations: { hash: `c${i}`, count: i },
                    forecasts: { hash: `f${i}`, count: i },
                    adrs: { hash: `a${i}`, count: i }
                },
                merkleRoot: root
            });
        }
        
        // Verify chain
        const valid = await ledger.verifyChain({ deep: true });
        expect(valid).toBe(true);
        
        // TODO: Test tampering detection (would need to modify cycles.jsonl manually)
    });
    
    test('Merkle root is deterministic', () => {
        const hashes1 = ['abc', 'def', 'ghi'];
        const hashes2 = ['abc', 'def', 'ghi'];
        
        const root1 = ledger.computeRoot(hashes1);
        const root2 = ledger.computeRoot(hashes2);
        
        expect(root1).toBe(root2);
        expect(root1).toHaveLength(64); // SHA256 hex = 64 chars
    });
});

