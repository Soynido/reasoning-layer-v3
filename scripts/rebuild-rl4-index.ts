/**
 * Rebuild RL4 Index from existing cycles.jsonl
 * Utilise les vraies données pour peupler le cache
 */

import { RL4CacheIndexer } from '../extension/kernel/indexer/CacheIndex';
import { ContextSnapshotGenerator } from '../extension/kernel/indexer/ContextSnapshot';
import { TimelineAggregator } from '../extension/kernel/indexer/TimelineAggregator';
import { DataNormalizer } from '../extension/kernel/indexer/DataNormalizer';
import * as path from 'path';

const workspaceRoot = path.resolve('.');

console.log('🔧 Rebuilding RL4 cache from existing data...\n');

(async () => {
  // 1. Rebuild cache index
  console.log('1️⃣ Rebuilding cache index...');
  const indexer = new RL4CacheIndexer(workspaceRoot);
  const index = await indexer.rebuild();
  console.log(`✅ Index rebuilt: ${index.total_cycles} cycles, ${Object.keys(index.by_day).length} days\n`);
  
  // 2. Generate context snapshot
  console.log('2️⃣ Generating context snapshot...');
  const contextSnapshot = new ContextSnapshotGenerator(workspaceRoot);
  const context = await contextSnapshot.generate(index.total_cycles || 0);
  console.log(`✅ Context generated: cycle #${context.current_cycle}`);
  console.log(`   • Pattern: ${context.pattern.substring(0, 60)}...`);
  console.log(`   • Confidence: ${(context.pattern_confidence * 100).toFixed(0)}%\n`);
  
  // 3. Generate timelines for all days
  console.log('3️⃣ Generating timelines for all days...');
  const aggregator = new TimelineAggregator(workspaceRoot);
  const days = Object.keys(index.by_day).sort();
  
  for (const day of days) {
    try {
      const timeline = await aggregator.generateTimeline(day);
      console.log(`✅ Timeline ${day}: ${timeline.total_cycles} cycles, load avg ${(timeline.cognitive_load_avg * 100).toFixed(0)}%`);
    } catch (e) {
      console.warn(`⚠️  Failed to generate timeline for ${day}:`, e);
    }
  }
  
  console.log('');
  
  // 4. Run data normalization
  console.log('4️⃣ Running data normalization...');
  const normalizer = new DataNormalizer(workspaceRoot);
  const report = await normalizer.normalize();
  
  if (report.actions_performed.length > 0) {
    console.log(`✅ Normalization complete: ${report.actions_performed.length} actions`);
    for (const action of report.actions_performed) {
      console.log(`   • ${action}`);
    }
  } else {
    console.log(`✅ Data already normalized`);
  }
  
  if (report.warnings.length > 0) {
    console.log(`⚠️  ${report.warnings.length} warnings:`);
    for (const warning of report.warnings) {
      console.log(`   • ${warning}`);
    }
  }
  
  console.log('\n🎉 RL4 cache fully rebuilt from real data!\n');
  console.log('📊 Summary:');
  console.log(`   • Total cycles: ${index.total_cycles}`);
  console.log(`   • Days covered: ${days.length}`);
  console.log(`   • Timelines generated: ${days.length}`);
  console.log(`   • Files tracked: ${Object.keys(index.by_file).length}`);
  console.log('\n✅ Ready for runtime validation\n');
  
})();

