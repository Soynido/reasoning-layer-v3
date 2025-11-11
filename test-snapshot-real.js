#!/usr/bin/env node

/**
 * Test the REAL generateSnapshotJSON() from compiled TypeScript
 */

const path = require('path');

async function testSnapshot() {
  try {
    // Load the compiled extension code
    const { generateSnapshotJSON } = require('./out/extension/kernel/api/WhereAmISnapshot');
    
    console.log('🧪 Testing REAL generateSnapshotJSON() from compiled code\n');
    console.log('='.repeat(70));
    
    const rl4Root = path.join(__dirname, '.reasoning_rl4');
    console.log('RL4 Root:', rl4Root);
    console.log('');
    
    const snapshot = await generateSnapshotJSON(rl4Root);
    
    console.log('📦 Generated Snapshot:\n');
    console.log(JSON.stringify(snapshot, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 Snapshot Fields:\n');
    
    const fields = {
      cycleId: snapshot.cycleId !== undefined,
      timestamp: snapshot.timestamp !== undefined,
      focusedFile: snapshot.focusedFile !== undefined,
      recentlyViewed: snapshot.recentlyViewed && snapshot.recentlyViewed.length > 0,
      patterns: snapshot.patterns && snapshot.patterns.length > 0,
      forecasts: snapshot.forecasts && snapshot.forecasts.length > 0,
      mood: snapshot.mood !== undefined,
      confidence: snapshot.confidence !== undefined
    };
    
    Object.entries(fields).forEach(([field, present]) => {
      if (present) {
        const value = snapshot[field];
        const display = Array.isArray(value) ? `${value.length} items` : value;
        console.log(`   ✅ ${field}: ${display}`);
      } else {
        console.log(`   ❌ ${field}: missing`);
      }
    });
    
    const allPresent = Object.values(fields).every(Boolean);
    
    console.log('\n' + '='.repeat(70));
    
    if (allPresent) {
      console.log('\n🎉 Snapshot is COMPLETE! All fields populated.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some fields are missing (this may be normal if data not yet generated)');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error testing snapshot:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSnapshot();

