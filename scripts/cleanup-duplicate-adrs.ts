#!/usr/bin/env ts-node
/**
 * Cleanup Duplicate ADRs - Phase E2.5
 * 
 * Removes duplicate ADR proposals based on title hash
 * Run after deploying deduplication fix to clean up existing duplicates
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const WORKSPACE_ROOT = process.cwd();
const ADR_DIR = path.join(WORKSPACE_ROOT, '.reasoning_rl4', 'adrs', 'auto');

interface ADR {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    [key: string]: any;
}

/**
 * Generate stable hash for ADR deduplication
 */
function generateADRHash(title: string): string {
    const normalized = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * Clean up duplicate ADRs
 */
async function cleanupDuplicates() {
    console.log('🧹 Starting ADR duplicate cleanup...\n');

    if (!fs.existsSync(ADR_DIR)) {
        console.log('❌ ADR directory not found:', ADR_DIR);
        return;
    }

    // Load all ADRs
    const files = fs.readdirSync(ADR_DIR)
        .filter(f => f.endsWith('.json') && f !== 'proposals.index.json');

    console.log(`📊 Found ${files.length} ADR files\n`);

    const hashToFiles = new Map<string, { file: string; adr: ADR }[]>();
    const errors: string[] = [];

    // Group ADRs by hash
    for (const file of files) {
        try {
            const filePath = path.join(ADR_DIR, file);
            const data = fs.readFileSync(filePath, 'utf-8');
            const adr = JSON.parse(data) as ADR;
            
            const hash = generateADRHash(adr.title || '');
            
            if (!hashToFiles.has(hash)) {
                hashToFiles.set(hash, []);
            }
            hashToFiles.get(hash)!.push({ file, adr });
        } catch (error) {
            errors.push(`Failed to parse ${file}: ${error}`);
        }
    }

    // Find and remove duplicates
    let totalRemoved = 0;
    let uniqueADRs = 0;

    for (const [hash, entries] of hashToFiles.entries()) {
        if (entries.length === 1) {
            uniqueADRs++;
            continue;
        }

        // Keep the oldest ADR, remove the rest
        entries.sort((a, b) => 
            new Date(a.adr.createdAt).getTime() - new Date(b.adr.createdAt).getTime()
        );

        const keeper = entries[0];
        const duplicates = entries.slice(1);

        console.log(`🔍 Found ${entries.length} duplicates for: "${keeper.adr.title.substring(0, 60)}..."`);
        console.log(`   ✅ Keeping: ${keeper.file} (created: ${keeper.adr.createdAt})`);

        for (const dup of duplicates) {
            const filePath = path.join(ADR_DIR, dup.file);
            fs.unlinkSync(filePath);
            console.log(`   🗑️  Removed: ${dup.file} (created: ${dup.adr.createdAt})`);
            totalRemoved++;
        }
        console.log('');
        uniqueADRs++;
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log('═'.repeat(60));
    console.log(`Total ADR files processed: ${files.length}`);
    console.log(`Unique ADRs remaining:     ${uniqueADRs}`);
    console.log(`Duplicates removed:        ${totalRemoved}`);
    console.log(`Errors encountered:        ${errors.length}`);
    console.log('');

    if (errors.length > 0) {
        console.log('⚠️  Errors:');
        errors.forEach(err => console.log(`   - ${err}`));
        console.log('');
    }

    // Regenerate proposals index
    console.log('🔄 Regenerating proposals index...');
    const remainingADRs: ADR[] = [];
    for (const file of fs.readdirSync(ADR_DIR).filter(f => f.endsWith('.json') && f !== 'proposals.index.json')) {
        try {
            const data = fs.readFileSync(path.join(ADR_DIR, file), 'utf-8');
            remainingADRs.push(JSON.parse(data));
        } catch {}
    }

    const index = {
        generated_at: new Date().toISOString(),
        total_proposals: remainingADRs.length,
        pending: remainingADRs.filter(a => a.status === 'proposed').map(a => a.id),
        accepted: remainingADRs.filter(a => a.status === 'accepted').map(a => a.id),
        rejected: remainingADRs.filter(a => a.status === 'rejected').map(a => a.id),
        proposals: remainingADRs.map(a => ({
            id: a.id,
            title: a.title,
            confidence: (a as any).confidence || 0,
            status: a.status,
            forecast_source: (a as any).forecast_source || 'unknown',
            proposedAt: (a as any).proposedAt || a.createdAt
        }))
    };

    fs.writeFileSync(
        path.join(ADR_DIR, 'proposals.index.json'),
        JSON.stringify(index, null, 2)
    );

    console.log('✅ Proposals index regenerated');
    console.log('');
    console.log('✅ Cleanup complete!');
}

// Run cleanup
cleanupDuplicates().catch(error => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
});

