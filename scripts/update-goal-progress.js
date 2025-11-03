#!/usr/bin/env node

/**
 * Update Goal Progress - Cognitive Progress Tracker
 * 
 * Met à jour la progression d'un goal dans goals.json
 * Enregistre l'événement dans les traces
 * 
 * Usage:
 *   node scripts/update-goal-progress.js <goal-id> <progress> [sprint-number]
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const workspaceRoot = process.cwd();
const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');

const goalId = process.argv[2] || 'goal-1762158000000-refactor-v1.1.0';
const progress = parseFloat(process.argv[3] || '0.20'); // 20% = Sprint 1 complete
const sprintNumber = parseInt(process.argv[4] || '1');

console.log('\n🔄 Updating Goal Progress\n');
console.log(`Goal ID: ${goalId}`);
console.log(`Progress: ${(progress * 100).toFixed(0)}%`);
console.log(`Sprint: ${sprintNumber}/5`);
console.log('');

// Charger goals.json
if (!fs.existsSync(goalsPath)) {
    console.error('❌ goals.json not found');
    process.exit(1);
}

const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));

// Trouver le goal
const goal = goalsData.active_goals.find(g => g.id === goalId);

if (!goal) {
    console.error(`❌ Goal ${goalId} not found`);
    process.exit(1);
}

console.log(`Found goal: ${goal.objective.substring(0, 60)}...`);
console.log(`Current progress: ${((goal.progress || 0) * 100).toFixed(0)}%`);
console.log('');

// Mettre à jour la progression
const oldProgress = goal.progress || 0;
goal.progress = progress;
goal.updated_at = new Date().toISOString();

// Mettre à jour le sprint si fourni
if (goal.sprints && sprintNumber <= goal.sprints.length) {
    goal.sprints[sprintNumber - 1].status = 'completed';
    
    if (sprintNumber < goal.sprints.length) {
        goal.sprints[sprintNumber].status = 'in_progress';
    }
}

// Marquer comme completed si progress >= 1.0
if (progress >= 1.0) {
    goal.status = 'completed';
    
    // Déplacer vers completed_goals
    const index = goalsData.active_goals.indexOf(goal);
    goalsData.active_goals.splice(index, 1);
    goalsData.completed_goals.push(goal);
}

// Sauvegarder
goalsData.last_evaluated = new Date().toISOString();
fs.writeFileSync(goalsPath, JSON.stringify(goalsData, null, 2), 'utf-8');

console.log('✅ Goal updated');
console.log(`   Progress: ${(oldProgress * 100).toFixed(0)}% → ${(progress * 100).toFixed(0)}%`);
console.log(`   Status: ${goal.status || 'active'}`);
console.log('');

// Enregistrer l'événement dans les traces
const dateKey = new Date().toISOString().split('T')[0];
const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
const traceFile = path.join(tracesDir, `${dateKey}.json`);

let events = [];
if (fs.existsSync(traceFile)) {
    events = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
}

const progressEvent = {
    id: uuidv4(),
    type: 'goal_progress_updated',
    source: `goal-${goalId}`,
    timestamp: new Date().toISOString(),
    data: {
        goal_id: goalId,
        objective: goal.objective,
        old_progress: oldProgress,
        new_progress: progress,
        sprint_completed: sprintNumber,
        modules_created: [
            'SecureCredentialManager.ts',
            'SecretScanner.ts',
            'Schemas.ts',
            'TraceRotationManager.ts',
            'AsyncWriteQueue.ts'
        ],
        lines_of_code: 1506,
        impact: 'Sprint 1 completed: Security & Foundations ready'
    },
    cognitive_relevance: 0.95,
    impact: 'high',
    category: 'project_execution'
};

events.push(progressEvent);
fs.writeFileSync(traceFile, JSON.stringify(events, null, 2), 'utf-8');

console.log('✅ Progress event recorded in traces');
console.log(`   Event ID: ${progressEvent.id}`);
console.log('');

// Mettre à jour le manifest
const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.totalEvents = (manifest.totalEvents || 0) + 1;
    manifest.total_events = manifest.totalEvents;
    manifest.lastCaptureAt = new Date().toISOString();
    manifest.last_capture_at = manifest.lastCaptureAt;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

console.log('📊 Summary:');
console.log(`   Goal: ${goal.objective.substring(0, 70)}...`);
console.log(`   Progress: ${(progress * 100).toFixed(0)}%`);
console.log(`   Sprint ${sprintNumber}/5: COMPLETED`);
console.log(`   Next: Sprint ${sprintNumber + 1} - Performance & Storage`);
console.log('');

console.log('📁 Files updated:');
console.log(`   ✅ .reasoning/goals.json`);
console.log(`   ✅ .reasoning/traces/${dateKey}.json`);
console.log(`   ✅ .reasoning/manifest.json`);
console.log('');

