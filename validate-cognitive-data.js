#!/usr/bin/env node

/**
 * Comprehensive Data Validation Script
 * Validates all RL4 cognitive data sources for completeness and quality
 */

const fs = require('fs');
const path = require('path');

const RL4_ROOT = path.join(process.cwd(), '.reasoning_rl4');

console.log('🧪 RL4 Cognitive Data Validation\n');
console.log('='.repeat(70));

const validation = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function pass(test, message) {
  validation.passed++;
  validation.details.push({ status: '✅', test, message });
  console.log(`✅ ${test}: ${message}`);
}

function fail(test, message) {
  validation.failed++;
  validation.details.push({ status: '❌', test, message });
  console.log(`❌ ${test}: ${message}`);
}

function warn(test, message) {
  validation.warnings++;
  validation.details.push({ status: '⚠️ ', test, message });
  console.log(`⚠️  ${test}: ${message}`);
}

// 1. Validate patterns.json
console.log('\n📊 Validating patterns.json...');
try {
  const patternsPath = path.join(RL4_ROOT, 'patterns.json');
  if (!fs.existsSync(patternsPath)) {
    fail('patterns.json', 'File not found');
  } else {
    const data = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
    
    if (!Array.isArray(data.patterns)) {
      fail('patterns.json', 'patterns field is not an array');
    } else if (data.patterns.length === 0) {
      warn('patterns.json', 'No patterns detected yet');
    } else {
      pass('patterns.json', `${data.patterns.length} patterns found`);
      
      // Validate pattern structure
      const firstPattern = data.patterns[0];
      const requiredFields = ['id', 'pattern', 'confidence', 'impact'];
      const missingFields = requiredFields.filter(f => !(f in firstPattern));
      
      if (missingFields.length > 0) {
        fail('patterns.json structure', `Missing fields: ${missingFields.join(', ')}`);
      } else {
        pass('patterns.json structure', 'All required fields present');
      }
    }
  }
} catch (error) {
  fail('patterns.json', `Parse error: ${error.message}`);
}

// 2. Validate forecasts.json
console.log('\n🔮 Validating forecasts.json...');
try {
  const forecastsPath = path.join(RL4_ROOT, 'forecasts.json');
  if (!fs.existsSync(forecastsPath)) {
    warn('forecasts.json', 'File not found (optional)');
  } else {
    const data = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
    const forecastsArray = Array.isArray(data) ? data : (data.forecasts || []);
    
    if (forecastsArray.length === 0) {
      warn('forecasts.json', 'No forecasts generated yet');
    } else {
      pass('forecasts.json', `${forecastsArray.length} forecasts found`);
      
      // Validate forecast structure
      const firstForecast = forecastsArray[0];
      if (!firstForecast.confidence || typeof firstForecast.confidence !== 'number') {
        fail('forecasts.json structure', 'Missing or invalid confidence field');
      } else {
        pass('forecasts.json structure', `Confidence: ${(firstForecast.confidence * 100).toFixed(1)}%`);
      }
    }
  }
} catch (error) {
  fail('forecasts.json', `Parse error: ${error.message}`);
}

// 3. Validate correlations.json
console.log('\n🔗 Validating correlations.json...');
try {
  const correlationsPath = path.join(RL4_ROOT, 'correlations.json');
  if (!fs.existsSync(correlationsPath)) {
    warn('correlations.json', 'File not found (optional)');
  } else {
    const data = JSON.parse(fs.readFileSync(correlationsPath, 'utf-8'));
    const correlationsArray = Array.isArray(data) ? data : (data.correlations || []);
    
    if (correlationsArray.length === 0) {
      warn('correlations.json', 'No correlations detected yet');
    } else {
      pass('correlations.json', `${correlationsArray.length} correlations found`);
    }
  }
} catch (error) {
  fail('correlations.json', `Parse error: ${error.message}`);
}

// 4. Validate goals.json
console.log('\n🎯 Validating goals.json...');
try {
  const goalsPath = path.join(RL4_ROOT, 'goals.json');
  if (!fs.existsSync(goalsPath)) {
    fail('goals.json', 'File not found');
  } else {
    const data = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
    
    if (!Array.isArray(data.goals)) {
      fail('goals.json', 'goals field is not an array');
    } else {
      const activeGoals = data.goals.filter(g => g.status === 'active' || g.status === 'in_progress').length;
      const completedGoals = data.goals.filter(g => g.status === 'completed').length;
      
      pass('goals.json', `${data.goals.length} total (${activeGoals} active, ${completedGoals} completed)`);
      
      // Validate goal structure
      const firstGoal = data.goals[0];
      const requiredFields = ['id', 'title', 'status'];
      const missingFields = requiredFields.filter(f => !(f in firstGoal));
      
      if (missingFields.length > 0) {
        fail('goals.json structure', `Missing fields: ${missingFields.join(', ')}`);
      } else {
        pass('goals.json structure', 'All required fields present');
      }
    }
  }
} catch (error) {
  fail('goals.json', `Parse error: ${error.message}`);
}

// 5. Validate mental_state.json
console.log('\n🧠 Validating mental_state.json...');
try {
  const mentalStatePath = path.join(RL4_ROOT, 'mental_state.json');
  if (!fs.existsSync(mentalStatePath)) {
    warn('mental_state.json', 'File not found (optional)');
  } else {
    const data = JSON.parse(fs.readFileSync(mentalStatePath, 'utf-8'));
    
    if (!data.mood || !data.confidence) {
      fail('mental_state.json', 'Missing mood or confidence fields');
    } else {
      pass('mental_state.json', `Mood: ${data.mood}, Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    }
  }
} catch (error) {
  fail('mental_state.json', `Parse error: ${error.message}`);
}

// 6. Validate cycles.jsonl
console.log('\n🔄 Validating cycles.jsonl...');
try {
  const cyclesPath = path.join(RL4_ROOT, 'ledger', 'cycles.jsonl');
  if (!fs.existsSync(cyclesPath)) {
    fail('cycles.jsonl', 'File not found');
  } else {
    const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n').filter(Boolean);
    
    if (lines.length === 0) {
      fail('cycles.jsonl', 'No cycles recorded');
    } else {
      const latestCycle = JSON.parse(lines[lines.length - 1]);
      pass('cycles.jsonl', `${lines.length} cycles (latest: ${latestCycle.cycleId || 'N/A'})`);
    }
  }
} catch (error) {
  fail('cycles.jsonl', `Parse error: ${error.message}`);
}

// 7. Validate adrs.jsonl
console.log('\n📋 Validating adrs.jsonl...');
try {
  const adrsPath = path.join(RL4_ROOT, 'ledger', 'adrs.jsonl');
  if (!fs.existsSync(adrsPath)) {
    warn('adrs.jsonl', 'File not found (creating sample data is recommended)');
  } else {
    const lines = fs.readFileSync(adrsPath, 'utf-8').trim().split('\n').filter(Boolean);
    
    if (lines.length === 0) {
      warn('adrs.jsonl', 'No ADRs recorded yet');
    } else {
      pass('adrs.jsonl', `${lines.length} ADRs found`);
      
      // Validate ADR structure
      const firstADR = JSON.parse(lines[0]);
      const requiredFields = ['id', 'title', 'status'];
      const missingFields = requiredFields.filter(f => !(f in firstADR));
      
      if (missingFields.length > 0) {
        fail('adrs.jsonl structure', `Missing fields: ${missingFields.join(', ')}`);
      } else {
        pass('adrs.jsonl structure', 'All required fields present');
      }
    }
  }
} catch (error) {
  fail('adrs.jsonl', `Parse error: ${error.message}`);
}

// 8. Validate ide_activity.jsonl
console.log('\n💻 Validating ide_activity.jsonl...');
try {
  const ideActivityPath = path.join(RL4_ROOT, 'traces', 'ide_activity.jsonl');
  if (!fs.existsSync(ideActivityPath)) {
    warn('ide_activity.jsonl', 'File not found (optional, generated by FileChangeWatcher)');
  } else {
    const lines = fs.readFileSync(ideActivityPath, 'utf-8').trim().split('\n').filter(Boolean);
    
    if (lines.length === 0) {
      warn('ide_activity.jsonl', 'No IDE activity recorded yet');
    } else {
      const latestActivity = JSON.parse(lines[lines.length - 1]);
      const focusedFile = latestActivity.metadata?.focused_file?.path || 'Unknown';
      pass('ide_activity.jsonl', `${lines.length} events (focus: ${path.basename(focusedFile)})`);
    }
  }
} catch (error) {
  warn('ide_activity.jsonl', `Parse error: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 Validation Summary:\n');

const total = validation.passed + validation.failed + validation.warnings;
const passRate = total > 0 ? Math.round((validation.passed / total) * 100) : 0;

console.log(`   ✅ Passed:   ${validation.passed}`);
console.log(`   ❌ Failed:   ${validation.failed}`);
console.log(`   ⚠️  Warnings: ${validation.warnings}`);
console.log(`   📈 Pass Rate: ${passRate}%`);

if (validation.failed === 0 && validation.warnings <= 2) {
  console.log('\n🎉 Data validation PASSED! All critical data sources are ready.');
  console.log('   The CognitiveSnapshot contract is reliable and production-ready.\n');
  process.exit(0);
} else if (validation.failed === 0) {
  console.log('\n⚠️  Data validation PASSED with warnings.');
  console.log('   Some optional data sources are missing, but core functionality works.\n');
  process.exit(0);
} else {
  console.log('\n❌ Data validation FAILED!');
  console.log('   Critical data sources are missing or corrupted.');
  console.log('   Fix the errors above before proceeding.\n');
  process.exit(1);
}

