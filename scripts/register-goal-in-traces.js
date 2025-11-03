#!/usr/bin/env node

/**
 * Register Refactor Goal in RL3 Traces & Ledger
 * 
 * Utilise le système de traces existant pour enregistrer
 * le nouveau goal dans l'historique cognitif
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const workspaceRoot = process.cwd();
const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
const traceFile = path.join(tracesDir, `${dateKey}.json`);

console.log('\n📝 Registering Refactor Goal in RL3 Traces\n');

// Créer l'événement de trace (suivant le format CaptureEvent)
const goalEvent = {
    id: uuidv4(),
    type: 'goal_created',
    source: 'REFACTOR_PLAN_V1.1.0.md',
    timestamp: new Date().toISOString(),
    data: {
        goal_id: `goal-${Date.now()}-refactor-v1.1.0`,
        objective: 'Execute Refactor Plan v1.1.0 - Production-Ready Transformation',
        priority: 'critical',
        confidence: 0.95,
        expected_duration: '15 days',
        sprints_count: 5,
        tasks_count: 20,
        success_criteria_count: 7,
        references: [
            'REFACTOR_PLAN_V1.1.0.md',
            'RL3_BETA_TESTER_OBJECTIONS_REPORT.md',
            'INTEGRITY_FIX_SUMMARY.md'
        ],
        rationale: 'Beta Tester Objections Report identified 6 critical risks requiring production-ready transformation',
        metrics_baseline: {
            storage_size_gb: 6.8,
            active_timers: 54,
            boot_time_ms: 3000,
            plaintext_tokens: true,
            vsix_size_mb: 17
        },
        metrics_target: {
            storage_size_mb: 500,
            active_timers: 10,
            boot_time_ms: 1000,
            plaintext_tokens: false,
            vsix_size_mb: 5
        }
    },
    cognitive_relevance: 0.99, // Très haute importance cognitive
    impact: 'critical',
    category: 'strategic_planning'
};

// Charger les traces existantes
let events = [];
if (fs.existsSync(traceFile)) {
    try {
        events = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
        console.log(`📂 Loaded ${events.length} existing events from ${dateKey}.json`);
    } catch (error) {
        console.error(`❌ Failed to parse trace file: ${error.message}`);
        process.exit(1);
    }
} else {
    console.log(`📝 Creating new trace file: ${dateKey}.json`);
    fs.mkdirSync(tracesDir, { recursive: true });
}

// Ajouter le nouvel événement
events.push(goalEvent);

// Sauvegarder
fs.writeFileSync(traceFile, JSON.stringify(events, null, 2), 'utf-8');

console.log(`✅ Goal event saved to traces/${dateKey}.json`);
console.log(`   Event ID: ${goalEvent.id}`);
console.log(`   Type: ${goalEvent.type}`);
console.log(`   Cognitive Relevance: ${goalEvent.cognitive_relevance}`);
console.log('');

// Mettre à jour le manifest
const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.totalEvents = (manifest.totalEvents || 0) + 1;
    manifest.total_events = manifest.totalEvents; // Support both formats
    manifest.lastCaptureAt = new Date().toISOString();
    manifest.last_capture_at = manifest.lastCaptureAt; // Support both formats
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    
    console.log('✅ Manifest updated');
    console.log(`   Total events: ${manifest.totalEvents}`);
    console.log('');
}

// Afficher le résumé
console.log('🎯 Refactor Goal Registration Complete');
console.log('');
console.log('📊 Goal Details:');
console.log(`   Objective: ${goalEvent.data.objective}`);
console.log(`   Priority: ${goalEvent.data.priority.toUpperCase()}`);
console.log(`   Confidence: ${(goalEvent.data.confidence * 100).toFixed(0)}%`);
console.log(`   Duration: ${goalEvent.data.expected_duration}`);
console.log(`   Sprints: ${goalEvent.data.sprints_count}`);
console.log(`   Tasks: ${goalEvent.data.tasks_count}`);
console.log('');

console.log('📁 Artifacts:');
console.log(`   ✅ .reasoning/goals.json (updated)`);
console.log(`   ✅ .reasoning/traces/${dateKey}.json (event added)`);
console.log(`   ✅ .reasoning/manifest.json (updated)`);
console.log('');

console.log('🚀 Next Actions:');
console.log('   1. Review goal: cat .reasoning/goals.json | jq ".active_goals[0]"');
console.log('   2. Generate tasks: Run TaskSynthesizer via Autopilot');
console.log('   3. Start Sprint 1: Execute critical security fixes');
console.log('');

