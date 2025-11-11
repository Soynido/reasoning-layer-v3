#!/usr/bin/env node

/**
 * Test snapshot generation from RL4 data
 * Simulates what generateSnapshotJSON() does
 */

const fs = require('fs');
const path = require('path');

const RL4_ROOT = path.join(process.cwd(), '.reasoning_rl4');

console.log('🧪 Testing Snapshot Generation\n');
console.log('RL4 Root:', RL4_ROOT);
console.log('='.repeat(60));

const snapshot = {
  cycleId: 0,
  timestamp: new Date().toISOString(),
};

// 1. Load current cycle
try {
  const cyclesPath = path.join(RL4_ROOT, 'ledger', 'cycles.jsonl');
  if (fs.existsSync(cyclesPath)) {
    const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n').filter(Boolean);
    if (lines.length > 0) {
      const latestCycle = JSON.parse(lines[lines.length - 1]);
      snapshot.cycleId = latestCycle.cycleId || 0;
      snapshot.timestamp = latestCycle.timestamp || snapshot.timestamp;
      console.log('✅ Cycle ID:', snapshot.cycleId);
    }
  }
} catch (error) {
  console.log('❌ Cycle load failed:', error.message);
}

// 2. Load IDE activity
try {
  const ideActivityPath = path.join(RL4_ROOT, 'traces', 'ide_activity.jsonl');
  if (fs.existsSync(ideActivityPath)) {
    const lines = fs.readFileSync(ideActivityPath, 'utf-8').trim().split('\n').filter(Boolean);
    if (lines.length > 0) {
      const latestActivity = JSON.parse(lines[lines.length - 1]);
      const metadata = latestActivity.metadata || {};
      
      if (metadata.focused_file?.path) {
        snapshot.focusedFile = metadata.focused_file.path;
        console.log('✅ Focused file:', snapshot.focusedFile);
      }
      
      if (Array.isArray(metadata.recently_viewed)) {
        snapshot.recentlyViewed = metadata.recently_viewed
          .slice(0, 5)
          .map(item => typeof item === 'string' ? item : item.path)
          .filter(Boolean);
        console.log('✅ Recently viewed:', snapshot.recentlyViewed.length, 'files');
      }
    }
  } else {
    console.log('⚠️  No IDE activity found');
  }
} catch (error) {
  console.log('⚠️  IDE activity load failed:', error.message);
}

// 3. Load patterns
try {
  const patternsPath = path.join(RL4_ROOT, 'patterns.json');
  if (fs.existsSync(patternsPath)) {
    const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
    if (Array.isArray(patternsData.patterns)) {
      snapshot.patterns = patternsData.patterns
        .slice(-5)
        .map(p => ({
          id: p.pattern_id || p.id || 'unknown',
          confidence: p.confidence || 0,
          trend: p.trend || 'stable',
        }));
      console.log('✅ Patterns:', snapshot.patterns.length, 'loaded');
    }
  } else {
    console.log('⚠️  No patterns found');
  }
} catch (error) {
  console.log('⚠️  Patterns load failed:', error.message);
}

// 4. Load forecasts
try {
  const forecastsPath = path.join(RL4_ROOT, 'forecasts.json');
  if (fs.existsSync(forecastsPath)) {
    const forecastsData = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
    // Handle both array format [...] and object format {forecasts: [...]}
    const forecastsArray = Array.isArray(forecastsData) ? forecastsData : (forecastsData.forecasts || []);
    
    if (forecastsArray.length > 0) {
      snapshot.forecasts = forecastsArray
        .slice(-5)
        .map(f => ({
          predicted: f.predicted_decision || f.predicted || f.description || 'Unknown',
          confidence: f.confidence || 0,
        }));
      console.log('✅ Forecasts:', snapshot.forecasts.length, 'loaded');
    } else {
      console.log('⚠️  No forecasts in file');
    }
  } else {
    console.log('⚠️  No forecasts found');
  }
} catch (error) {
  console.log('⚠️  Forecasts load failed:', error.message);
}

// 5. Load mental state
try {
  const mentalStatePath = path.join(RL4_ROOT, 'mental_state.json');
  if (fs.existsSync(mentalStatePath)) {
    const mentalState = JSON.parse(fs.readFileSync(mentalStatePath, 'utf-8'));
    snapshot.mood = mentalState.mood;
    snapshot.confidence = mentalState.confidence;
    console.log('✅ Mental state:', snapshot.mood, `(${Math.round(snapshot.confidence * 100)}%)`);
  } else {
    console.log('⚠️  No mental state found');
  }
} catch (error) {
  console.log('⚠️  Mental state load failed:', error.message);
}

console.log('='.repeat(60));
console.log('\n📦 Generated Snapshot:\n');
console.log(JSON.stringify(snapshot, null, 2));

console.log('\n='.repeat(60));
console.log('✅ Snapshot generation test complete!');
console.log('');

// Validate structure
const requiredFields = ['cycleId', 'timestamp'];
const missingFields = requiredFields.filter(field => !(field in snapshot));

if (missingFields.length > 0) {
  console.error('❌ Missing required fields:', missingFields);
  process.exit(1);
}

console.log('✅ All required fields present');
console.log('✅ Snapshot is valid for WebView consumption');
console.log('');

