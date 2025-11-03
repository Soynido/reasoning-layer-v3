/**
 * 100-Cycle Validation Test
 * 
 * Critical test for kernel extraction readiness.
 * 
 * Tests:
 * 1. Chain integrity (100/100 cycles valid)
 * 2. Hash stability (Δ=0 for same data)
 * 3. Chain linking (all prevMerkleRoot valid)
 * 4. Performance (verifyChain < 5s)
 * 5. Confidence score (≥0.999)
 * 
 * Pass Criteria:
 * - All 100 cycles valid
 * - Zero hash collisions
 * - Zero chain breaks
 * - ConfidenceScore ≥ 0.999
 * - Verification time < 5s
 */

import { RBOMLedger } from '../extension/kernel/RBOMLedger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TestResult {
    totalCycles: number;
    validCycles: number;
    hashCollisions: number;
    chainBreaks: number;
    verificationTime: number;
    confidenceScore: number;
    passed: boolean;
}

async function generateTestCycles(ledger: RBOMLedger, count: number): Promise<void> {
    console.log(`🔄 Generating ${count} test cycles...`);
    
    for (let i = 1; i <= count; i++) {
        // Simulate a cognitive cycle
        const patterns = Array.from({ length: 3 }, (_, j) => ({
            id: `pat-${i}-${j}`,
            type: 'refactoring',
            confidence: 0.8 + Math.random() * 0.2
        }));
        
        const correlations = Array.from({ length: 5 }, (_, j) => ({
            id: `corr-${i}-${j}`,
            patternA: `pat-${i}-${j % 3}`,
            patternB: `pat-${i}-${(j + 1) % 3}`
        }));
        
        const forecasts = Array.from({ length: 2 }, (_, j) => ({
            id: `fore-${i}-${j}`,
            prediction: `Prediction ${i}.${j}`
        }));
        
        const adrs = Array.from({ length: 1 }, (_, j) => ({
            id: `adr-${i}-${j}`,
            title: `Decision ${i}.${j}`,
            status: 'accepted'
        }));
        
        // Hash each phase
        const patternsHash = ledger.hashBatch(patterns);
        const correlationsHash = ledger.hashBatch(correlations);
        const forecastsHash = ledger.hashBatch(forecasts);
        const adrsHash = ledger.hashBatch(adrs);
        
        // Compute Merkle root
        const merkleRoot = ledger.computeRoot([
            patternsHash,
            correlationsHash,
            forecastsHash,
            adrsHash
        ]);
        
        // Append cycle
        await ledger.appendCycle({
            cycleId: i,
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
            phases: {
                patterns: { hash: patternsHash, count: patterns.length },
                correlations: { hash: correlationsHash, count: correlations.length },
                forecasts: { hash: forecastsHash, count: forecasts.length },
                adrs: { hash: adrsHash, count: adrs.length }
            },
            merkleRoot
        });
        
        if (i % 10 === 0) {
            console.log(`  ✓ ${i}/${count} cycles generated`);
        }
    }
    
    console.log(`✅ All ${count} cycles generated`);
    
    // Flush to disk
    await ledger.flush();
    console.log(`💾 Flushed to disk\n`);
}

function calculateConfidenceScore(
    validCycles: number,
    totalCycles: number,
    hashCollisions: number,
    totalHashes: number,
    chainBreaks: number,
    totalLinks: number
): number {
    const validRatio = validCycles / totalCycles;
    const collisionRatio = hashCollisions / totalHashes;
    const chainBreakRatio = totalLinks > 0 ? chainBreaks / totalLinks : 0;
    
    return validRatio * (1 - collisionRatio) * (1 - chainBreakRatio);
}

async function runValidationTest(): Promise<TestResult> {
    // Create temporary test directory
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbom-100cycle-'));
    const ledgerPath = path.join(testDir, 'rbom_ledger.jsonl');
    
    console.log('🧪 Starting 100-Cycle Validation Test\n');
    console.log(`Test Directory: ${testDir}\n`);
    
    try {
        const ledger = new RBOMLedger(ledgerPath);
        
        // Generate 100 test cycles
        const startGeneration = Date.now();
        await generateTestCycles(ledger, 100);
        const generationTime = Date.now() - startGeneration;
        console.log(`⏱️  Generation time: ${generationTime}ms\n`);
        
        // Verify chain
        console.log('🔍 Verifying chain integrity...');
        const startVerification = Date.now();
        const chainValid = await ledger.verifyChain({ deep: true });
        const verificationTime = Date.now() - startVerification;
        console.log(`⏱️  Verification time: ${verificationTime}ms`);
        console.log(`📊 Chain valid: ${chainValid ? '✅' : '❌'}\n`);
        
        // Analyze cycles
        console.log('📊 Analyzing cycles...');
        const cycles = await ledger.getAllCycles();
        const totalCycles = cycles.length;
        
        // Count valid cycles
        let validCycles = 0;
        for (const cycle of cycles) {
            const phaseHashes = [
                cycle.phases.patterns.hash,
                cycle.phases.correlations.hash,
                cycle.phases.forecasts.hash,
                cycle.phases.adrs.hash
            ];
            const recomputedRoot = ledger.computeRoot(phaseHashes);
            if (recomputedRoot === cycle.merkleRoot) {
                validCycles++;
            }
        }
        console.log(`  Valid cycles: ${validCycles}/${totalCycles}`);
        
        // Count hash collisions
        const allHashes = cycles.flatMap(c => [
            c.phases.patterns.hash,
            c.phases.correlations.hash,
            c.phases.forecasts.hash,
            c.phases.adrs.hash,
            c.merkleRoot
        ]);
        const uniqueHashes = new Set(allHashes).size;
        const hashCollisions = allHashes.length - uniqueHashes;
        console.log(`  Hash collisions: ${hashCollisions}/${allHashes.length}`);
        
        // Count chain breaks
        let chainBreaks = 0;
        for (let i = 1; i < cycles.length; i++) {
            if (cycles[i].prevMerkleRoot !== cycles[i - 1].merkleRoot) {
                chainBreaks++;
                console.log(`  ⚠️  Chain break at cycle ${i}: expected ${cycles[i - 1].merkleRoot}, got ${cycles[i].prevMerkleRoot}`);
            }
        }
        console.log(`  Chain breaks: ${chainBreaks}/${cycles.length - 1}\n`);
        
        // Calculate confidence score
        const confidenceScore = calculateConfidenceScore(
            validCycles,
            totalCycles,
            hashCollisions,
            allHashes.length,
            chainBreaks,
            cycles.length - 1
        );
        console.log(`🎯 Confidence Score: ${confidenceScore.toFixed(6)} (threshold: 0.999)\n`);
        
        // Test hash stability
        console.log('🔒 Testing hash stability...');
        const testData1 = { b: 2, a: 1, c: 3 };
        const testData2 = { a: 1, c: 3, b: 2 };
        const hash1 = ledger.hashBatch([testData1]);
        const hash2 = ledger.hashBatch([testData2]);
        const hashStable = hash1 === hash2;
        console.log(`  Same data, different order: ${hashStable ? '✅ Identical' : '❌ Different'}`);
        console.log(`  Hash 1: ${hash1.slice(0, 16)}...`);
        console.log(`  Hash 2: ${hash2.slice(0, 16)}...\n`);
        
        // Determine if test passed
        const passed = 
            chainValid &&
            validCycles === totalCycles &&
            hashCollisions === 0 &&
            chainBreaks === 0 &&
            confidenceScore >= 0.999 &&
            verificationTime < 5000 &&
            hashStable;
        
        const result: TestResult = {
            totalCycles,
            validCycles,
            hashCollisions,
            chainBreaks,
            verificationTime,
            confidenceScore,
            passed
        };
        
        // Print summary
        console.log('═══════════════════════════════════════════════════');
        console.log('📋 TEST SUMMARY');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Total Cycles:       ${totalCycles}`);
        console.log(`Valid Cycles:       ${validCycles} ${validCycles === totalCycles ? '✅' : '❌'}`);
        console.log(`Hash Collisions:    ${hashCollisions} ${hashCollisions === 0 ? '✅' : '❌'}`);
        console.log(`Chain Breaks:       ${chainBreaks} ${chainBreaks === 0 ? '✅' : '❌'}`);
        console.log(`Verification Time:  ${verificationTime}ms ${verificationTime < 5000 ? '✅' : '❌'}`);
        console.log(`Confidence Score:   ${confidenceScore.toFixed(6)} ${confidenceScore >= 0.999 ? '✅' : '❌'}`);
        console.log(`Hash Stability:     ${hashStable ? '✅' : '❌'}`);
        console.log('═══════════════════════════════════════════════════');
        console.log(`\n${passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}\n`);
        
        if (passed) {
            console.log('🎉 Kernel is ready for extraction!');
            console.log('   ConfidenceScore ≥ 0.999 ✅');
            console.log('   All integrity checks passed ✅');
        } else {
            console.log('⚠️  Kernel is NOT ready for extraction');
            console.log('   Fix issues before proceeding with I4-B');
        }
        
        return result;
        
    } finally {
        // Cleanup
        console.log(`\n🧹 Cleaning up test directory: ${testDir}`);
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

// Run test
runValidationTest()
    .then(result => {
        process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    });

