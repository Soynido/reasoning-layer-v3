/**
 * WhereAmI Snapshot API - Tests
 * 
 * Validates snapshot generation, data extraction, and Markdown formatting.
 */

import { generateWhereAmI, generateSnapshotJSON } from '../extension/kernel/api/WhereAmISnapshot';
import * as fs from 'fs';
import * as path from 'path';

// Mock RL4 data directory
const MOCK_RL4_ROOT = path.join(__dirname, '.test_reasoning_rl4');

async function setupMockData() {
  // Create mock directory structure
  const dirs = [
    path.join(MOCK_RL4_ROOT, 'ledger'),
    path.join(MOCK_RL4_ROOT, 'traces'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create mock cycles.jsonl
  const cyclesPath = path.join(MOCK_RL4_ROOT, 'ledger', 'cycles.jsonl');
  fs.writeFileSync(cyclesPath, JSON.stringify({
    cycleId: 42,
    timestamp: new Date().toISOString(),
    duration_ms: 150,
    phases: ['reflect', 'learn', 'forecast']
  }) + '\n', 'utf-8');

  // Create mock ide_activity.jsonl
  const idePath = path.join(MOCK_RL4_ROOT, 'traces', 'ide_activity.jsonl');
  fs.writeFileSync(idePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    metadata: {
      focused_file: { path: 'extension/kernel/api/WhereAmISnapshot.ts' },
      recently_viewed: [
        'extension/extension.ts',
        'package.json',
        'extension/kernel/CognitiveScheduler.ts'
      ]
    }
  }) + '\n', 'utf-8');

  // Create mock patterns.json
  const patternsPath = path.join(MOCK_RL4_ROOT, 'patterns.json');
  fs.writeFileSync(patternsPath, JSON.stringify({
    patterns: [
      {
        pattern_id: 'pattern-test-1',
        confidence: 0.85,
        trend: 'increasing'
      },
      {
        pattern_id: 'pattern-test-2',
        confidence: 0.72,
        trend: 'stable'
      }
    ]
  }), 'utf-8');

  // Create mock forecasts.json
  const forecastsPath = path.join(MOCK_RL4_ROOT, 'forecasts.json');
  fs.writeFileSync(forecastsPath, JSON.stringify({
    forecasts: [
      {
        predicted: 'New API expansion expected',
        confidence: 0.78
      },
      {
        predicted: 'Test coverage will increase',
        confidence: 0.65
      }
    ]
  }), 'utf-8');

  // Create mock mental_state.json
  const mentalPath = path.join(MOCK_RL4_ROOT, 'mental_state.json');
  fs.writeFileSync(mentalPath, JSON.stringify({
    mood: 'focused',
    confidence: 0.88
  }), 'utf-8');
}

async function cleanupMockData() {
  if (fs.existsSync(MOCK_RL4_ROOT)) {
    fs.rmSync(MOCK_RL4_ROOT, { recursive: true, force: true });
  }
}

async function testSnapshotGeneration() {
  console.log('🧪 Test 1: Snapshot Generation');
  
  await setupMockData();
  
  try {
    const markdown = await generateWhereAmI(MOCK_RL4_ROOT);
    
    // Validate Markdown structure
    if (!markdown.includes('# 🧠 Where Am I?')) {
      throw new Error('Missing header');
    }
    
    if (!markdown.includes('Cycle**: 42')) {
      throw new Error('Missing cycle ID');
    }
    
    if (!markdown.includes('WhereAmISnapshot.ts')) {
      throw new Error('Missing focused file');
    }
    
    if (!markdown.includes('pattern-test-1')) {
      throw new Error('Missing pattern');
    }
    
    if (!markdown.includes('New API expansion expected')) {
      throw new Error('Missing forecast');
    }
    
    if (!markdown.includes('focused')) {
      throw new Error('Missing mood');
    }
    
    console.log('✅ Test 1 passed: Markdown snapshot generated successfully');
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    throw error;
  } finally {
    await cleanupMockData();
  }
}

async function testSnapshotJSON() {
  console.log('🧪 Test 2: JSON Snapshot Generation');
  
  await setupMockData();
  
  try {
    const snapshot = await generateSnapshotJSON(MOCK_RL4_ROOT);
    
    // Validate JSON structure
    if (snapshot.cycleId !== 42) {
      throw new Error(`Expected cycleId 42, got ${snapshot.cycleId}`);
    }
    
    if (!snapshot.timestamp) {
      throw new Error('Missing timestamp');
    }
    
    if (typeof snapshot.timestamp !== 'string') {
      throw new Error('Timestamp should be a string');
    }
    
    console.log('✅ Test 2 passed: JSON snapshot generated successfully');
    console.log('📊 Snapshot data:', JSON.stringify(snapshot, null, 2));
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    throw error;
  } finally {
    await cleanupMockData();
  }
}

async function testEmptyData() {
  console.log('🧪 Test 3: Empty Data Handling');
  
  const emptyDir = path.join(__dirname, '.test_empty_rl4');
  fs.mkdirSync(emptyDir, { recursive: true });
  
  try {
    const markdown = await generateWhereAmI(emptyDir);
    
    // Should not crash, should return default values
    if (!markdown.includes('# 🧠 Where Am I?')) {
      throw new Error('Missing header in empty data');
    }
    
    if (!markdown.includes('No active file')) {
      throw new Error('Should indicate no active file');
    }
    
    if (!markdown.includes('No recent patterns detected')) {
      throw new Error('Should indicate no patterns');
    }
    
    console.log('✅ Test 3 passed: Empty data handled gracefully');
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    throw error;
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
}

async function runAllTests() {
  console.log('🚀 Running WhereAmI Snapshot Tests...\n');
  
  try {
    await testSnapshotGeneration();
    await testSnapshotJSON();
    await testEmptyData();
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

export { testSnapshotGeneration, testSnapshotJSON, testEmptyData };

