#!/usr/bin/env node

/**
 * Test script to verify WebView data availability
 * Simulates what generateCognitiveState() does
 */

const fs = require('fs');
const path = require('path');

const RL4_ROOT = path.join(process.cwd(), '.reasoning_rl4');

console.log('🧪 Testing WebView Data Availability\n');
console.log('RL4 Root:', RL4_ROOT);
console.log('='.repeat(60));

const results = {
  patterns: false,
  forecasts: false,
  correlations: false,
  goals: false,
  adrs: false,
  biases: false,
  cycles: false,
  ideActivity: false
};

// 1. Check patterns.json
try {
  const patternsPath = path.join(RL4_ROOT, 'patterns.json');
  if (fs.existsSync(patternsPath)) {
    const data = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
    results.patterns = true;
    console.log('✅ Patterns:', data.patterns?.length || 0, 'items');
  } else {
    console.log('❌ Patterns: File not found');
  }
} catch (error) {
  console.log('❌ Patterns: Error -', error.message);
}

// 2. Check forecasts.json
try {
  const forecastsPath = path.join(RL4_ROOT, 'forecasts.json');
  if (fs.existsSync(forecastsPath)) {
    const data = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
    results.forecasts = true;
    console.log('✅ Forecasts:', data.forecasts?.length || 0, 'items');
  } else {
    console.log('❌ Forecasts: File not found');
  }
} catch (error) {
  console.log('❌ Forecasts: Error -', error.message);
}

// 3. Check correlations.json
try {
  const correlationsPath = path.join(RL4_ROOT, 'correlations.json');
  if (fs.existsSync(correlationsPath)) {
    const data = JSON.parse(fs.readFileSync(correlationsPath, 'utf-8'));
    results.correlations = true;
    console.log('✅ Correlations:', data.correlations?.length || 0, 'items');
  } else {
    console.log('❌ Correlations: File not found');
  }
} catch (error) {
  console.log('❌ Correlations: Error -', error.message);
}

// 4. Check goals.json
try {
  const goalsPath = path.join(RL4_ROOT, 'goals.json');
  if (fs.existsSync(goalsPath)) {
    const data = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
    results.goals = true;
    const active = data.goals?.filter(g => g.status === 'active' || g.status === 'in_progress').length || 0;
    console.log('✅ Goals:', data.goals?.length || 0, 'items (', active, 'active)');
  } else {
    console.log('❌ Goals: File not found');
  }
} catch (error) {
  console.log('❌ Goals: Error -', error.message);
}

// 5. Check ADRs ledger
try {
  const adrsPath = path.join(RL4_ROOT, 'ledger', 'adrs.jsonl');
  if (fs.existsSync(adrsPath)) {
    const lines = fs.readFileSync(adrsPath, 'utf-8').trim().split('\n').filter(Boolean);
    results.adrs = true;
    console.log('✅ ADRs:', lines.length, 'items');
  } else {
    console.log('❌ ADRs: File not found');
  }
} catch (error) {
  console.log('❌ ADRs: Error -', error.message);
}

// 6. Check biases.json
try {
  const biasesPath = path.join(RL4_ROOT, 'biases.json');
  if (fs.existsSync(biasesPath)) {
    const data = JSON.parse(fs.readFileSync(biasesPath, 'utf-8'));
    results.biases = true;
    console.log('✅ Biases:', data.biases?.length || 0, 'items');
  } else {
    console.log('⚠️  Biases: File not found (optional)');
  }
} catch (error) {
  console.log('⚠️  Biases: Error -', error.message);
}

// 7. Check cycles ledger
try {
  const cyclesPath = path.join(RL4_ROOT, 'ledger', 'cycles.jsonl');
  if (fs.existsSync(cyclesPath)) {
    const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n').filter(Boolean);
    const latest = JSON.parse(lines[lines.length - 1]);
    results.cycles = true;
    console.log('✅ Cycles:', lines.length, 'items (latest:', latest.cycleId || 'N/A', ')');
  } else {
    console.log('❌ Cycles: File not found');
  }
} catch (error) {
  console.log('❌ Cycles: Error -', error.message);
}

// 8. Check IDE activity
try {
  const ideActivityPath = path.join(RL4_ROOT, 'traces', 'ide_activity.jsonl');
  if (fs.existsSync(ideActivityPath)) {
    const lines = fs.readFileSync(ideActivityPath, 'utf-8').trim().split('\n').filter(Boolean);
    results.ideActivity = true;
    console.log('✅ IDE Activity:', lines.length, 'events');
  } else {
    console.log('⚠️  IDE Activity: File not found (optional)');
  }
} catch (error) {
  console.log('⚠️  IDE Activity: Error -', error.message);
}

console.log('='.repeat(60));

// Summary
const totalChecks = Object.keys(results).length;
const passedChecks = Object.values(results).filter(Boolean).length;
const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log('\n📊 Summary:');
console.log(`   ${passedChecks}/${totalChecks} data sources available (${percentage}%)`);

if (percentage === 100) {
  console.log('   ✅ All data sources ready for WebView!');
} else if (percentage >= 75) {
  console.log('   ⚠️  Most data sources available - WebView will work with limited features');
} else if (percentage >= 50) {
  console.log('   ⚠️  Some data sources missing - WebView may show incomplete data');
} else {
  console.log('   ❌ Critical data sources missing - WebView may not work properly');
  console.log('   💡 Run the RL4 kernel for a few minutes to generate data');
}

console.log('');
process.exit(percentage < 50 ? 1 : 0);

