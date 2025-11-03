#!/usr/bin/env node

/**
 * Repair Integrity Ledger Script
 * 
 * Fixes broken integrity chain in .reasoning/ledger/ledger.jsonl
 * 
 * Problems fixed:
 * 1. Invalid entries (wrong schema)
 * 2. Broken hash chains
 * 3. Missing fields
 * 
 * Usage:
 *   node scripts/repair-integrity-ledger.js
 *   node scripts/repair-integrity-ledger.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VALID_TYPES = ['ADR', 'SNAPSHOT', 'EVIDENCE', 'MANIFEST'];

function generateHash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString, 'utf8').digest('hex');
}

function isValidLedgerEntry(entry) {
    // Check required fields
    if (!entry.entry_id || !entry.type || !entry.target_id || !entry.current_hash) {
        return false;
    }
    
    // Check valid type
    if (!VALID_TYPES.includes(entry.type)) {
        return false;
    }
    
    // previous_hash can be null for first entry
    if (!('previous_hash' in entry)) {
        return false;
    }
    
    return true;
}

function repairLedger(workspaceRoot, dryRun = false) {
    const ledgerFile = path.join(workspaceRoot, '.reasoning', 'ledger', 'ledger.jsonl');
    
    if (!fs.existsSync(ledgerFile)) {
        console.log('✅ No ledger file found (nothing to repair)');
        return;
    }
    
    console.log('🔍 Reading ledger file...');
    const lines = fs.readFileSync(ledgerFile, 'utf-8').split('\n').filter(l => l.trim());
    
    console.log(`📊 Total entries: ${lines.length}`);
    
    const validEntries = [];
    const invalidEntries = [];
    let repairedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        try {
            const entry = JSON.parse(lines[i]);
            
            if (isValidLedgerEntry(entry)) {
                validEntries.push(entry);
            } else {
                invalidEntries.push({ line: i + 1, entry });
                console.log(`❌ Invalid entry at line ${i + 1}:`, JSON.stringify(entry).substring(0, 100) + '...');
            }
        } catch (error) {
            invalidEntries.push({ line: i + 1, error: error.message });
            console.log(`❌ Parse error at line ${i + 1}: ${error.message}`);
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Valid entries: ${validEntries.length}`);
    console.log(`   Invalid entries: ${invalidEntries.length}`);
    
    if (invalidEntries.length === 0 && validEntries.length > 0) {
        // Check hash chain
        console.log(`\n🔗 Verifying hash chain...`);
        let previousHash = null;
        const errors = [];
        
        for (let i = 0; i < validEntries.length; i++) {
            const entry = validEntries[i];
            
            if (i > 0 && entry.previous_hash !== previousHash) {
                errors.push(`Entry ${entry.entry_id}: expected previous_hash ${previousHash}, got ${entry.previous_hash}`);
            }
            
            previousHash = entry.current_hash;
        }
        
        if (errors.length === 0) {
            console.log(`✅ Hash chain is valid!`);
            return;
        } else {
            console.log(`⚠️  Hash chain errors found: ${errors.length}`);
            errors.forEach(e => console.log(`   - ${e}`));
        }
    }
    
    // Rebuild hash chain
    console.log(`\n🔧 Rebuilding hash chain...`);
    let previousHash = null;
    const repairedEntries = [];
    
    for (const entry of validEntries) {
        const repairedEntry = { ...entry };
        
        // Fix previous_hash
        if (repairedEntry.previous_hash !== previousHash) {
            console.log(`   Fixing ${entry.entry_id}: previous_hash ${entry.previous_hash} → ${previousHash}`);
            repairedEntry.previous_hash = previousHash;
            repairedCount++;
        }
        
        // Recalculate current_hash if needed
        const expectedHash = generateHash(entry.target_id + previousHash);
        if (repairedEntry.current_hash !== expectedHash) {
            console.log(`   Recalculating current_hash for ${entry.entry_id}`);
            repairedEntry.current_hash = expectedHash;
            repairedCount++;
        }
        
        previousHash = repairedEntry.current_hash;
        repairedEntries.push(repairedEntry);
    }
    
    console.log(`\n📊 Repair summary:`);
    console.log(`   Entries repaired: ${repairedCount}`);
    console.log(`   Entries removed: ${invalidEntries.length}`);
    console.log(`   Final entries: ${repairedEntries.length}`);
    
    if (dryRun) {
        console.log(`\n🔍 DRY RUN - No changes made`);
        console.log(`   Run without --dry-run to apply changes`);
        return;
    }
    
    // Backup original
    const backupFile = ledgerFile + `.backup-${Date.now()}`;
    console.log(`\n💾 Creating backup: ${path.basename(backupFile)}`);
    fs.copyFileSync(ledgerFile, backupFile);
    
    // Write repaired ledger
    console.log(`📝 Writing repaired ledger...`);
    const repairedContent = repairedEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(ledgerFile, repairedContent, 'utf-8');
    
    console.log(`\n✅ Ledger repaired successfully!`);
    console.log(`   Original backed up to: ${path.basename(backupFile)}`);
    console.log(`   ${repairedEntries.length} valid entries in chain`);
}

// Main
const workspaceRoot = process.cwd();
const dryRun = process.argv.includes('--dry-run');

console.log(`\n🔧 RL3 Integrity Ledger Repair Tool\n`);
console.log(`Workspace: ${workspaceRoot}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'REPAIR'}\n`);

try {
    repairLedger(workspaceRoot, dryRun);
} catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
}

