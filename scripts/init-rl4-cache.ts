/**
 * Initialize RL4 Cache Structure
 * Crée la structure de base pour validation (avant premier runtime)
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve('.reasoning_rl4');

// Create directories
const dirs = [
  'cache',
  'cache/hooks',
  'timelines',
  'adrs/auto'
];

console.log('🔧 Initializing RL4 cache structure...\n');

for (const dir of dirs) {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}/`);
  } else {
    console.log(`⏭️  Exists: ${dir}/`);
  }
}

// Create empty cache/index.json if not exists
const indexPath = path.join(ROOT, 'cache', 'index.json');
if (!fs.existsSync(indexPath)) {
  const emptyIndex = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    total_cycles: 0,
    date_range: { first: '', last: '' },
    by_day: {},
    by_file: {},
    by_hour: {},
    entries: []
  };
  
  fs.writeFileSync(indexPath, JSON.stringify(emptyIndex, null, 2));
  console.log('✅ Created: cache/index.json (empty)');
} else {
  console.log('⏭️  Exists: cache/index.json');
}

// Create empty adrs/active.json if not exists
const activePath = path.join(ROOT, 'adrs', 'active.json');
if (!fs.existsSync(activePath)) {
  const emptyActive = {
    generated_at: new Date().toISOString(),
    total: 0,
    accepted: [],
    pending: [],
    rejected: []
  };
  
  fs.writeFileSync(activePath, JSON.stringify(emptyActive, null, 2));
  console.log('✅ Created: adrs/active.json (empty)');
} else {
  console.log('⏭️  Exists: adrs/active.json');
}

console.log('\n🎉 RL4 cache structure initialized!\n');
console.log('ℹ️  Note: Cache will be populated at first runtime by CognitiveScheduler');

