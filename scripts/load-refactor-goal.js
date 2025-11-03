#!/usr/bin/env node

/**
 * Load Refactor Goal v1.1.0 into RL3 Cognitive System
 * 
 * Utilise les modules cognitifs existants :
 * - GoalSynthesizer pour charger le goal
 * - TaskSynthesizer pour générer les tâches
 * - ReflectionManager pour planifier l'exécution
 * 
 * Usage:
 *   node scripts/load-refactor-goal.js
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');

console.log('\n🧠 RL3 Goal Loader - Refactor Plan v1.1.0\n');

// Créer le goal suivant l'interface Goal du GoalSynthesizer
const refactorGoal = {
    id: `goal-${Date.now()}-refactor-v1.1.0`,
    objective: 'Execute Refactor Plan v1.1.0 - Production-Ready Transformation',
    priority: 'critical',
    confidence: 0.95,
    expected_duration: '15 days (5 sprints)',
    rationale: [
        'Beta Tester Objections Report identified 6 critical risks (score 7.5/10)',
        'Storage: 6.8GB → < 500MB (compression + rotation + global cache)',
        'Security: Tokens plaintext → SecretStorage encrypted',
        'Scalability: 54 timers → < 10 (global service)',
        'UX: Invasive install → opt-in minimal mode',
        'Validation: 0% → 100% Zod schema validation',
        'Target: v1.0.87 → v1.1.0 stable release'
    ],
    created_at: new Date().toISOString(),
    progress: 0.0,
    status: 'active',
    plan_reference: 'REFACTOR_PLAN_V1.1.0.md',
    audit_reference: 'RL3_BETA_TESTER_OBJECTIONS_REPORT.md',
    sprints: [
        {
            sprint: 1,
            name: 'Security & Foundations',
            duration: '2.25 days',
            priority: 'critical',
            tasks: [
                'SecureCredentialManager - Token migration',
                'SecretScanner - Log redaction',
                'Zod validation schemas',
                'IntegrityEngine schema validation'
            ],
            status: 'pending'
        },
        {
            sprint: 2,
            name: 'Performance & Storage',
            duration: '2.5 days',
            priority: 'high',
            tasks: [
                'TraceRotationManager - Compression gzip',
                'AsyncWriteQueue - Non-blocking I/O',
                'ModelCache - Global ~/.rl3/models/',
                'PersistenceManager integration'
            ],
            status: 'pending'
        },
        {
            sprint: 3,
            name: 'Scalability & Architecture',
            duration: '4.5 days',
            priority: 'high',
            tasks: [
                'GlobalReasoningService singleton',
                'SharedAutoSyncService (1 timer)',
                'Extension.ts migration',
                'Multi-workspace tests'
            ],
            status: 'pending'
        },
        {
            sprint: 4,
            name: 'UX & Observability',
            duration: '2.25 days',
            priority: 'high',
            tasks: [
                'ConfigurationManager - Opt-in mode',
                'Package.json settings',
                'Diagnostic report command',
                'Conditional activation'
            ],
            status: 'pending'
        },
        {
            sprint: 5,
            name: 'Testing & Release',
            duration: '2.5 days',
            priority: 'high',
            tasks: [
                'Unit tests all critical modules',
                'QA checklist automation',
                'VSIX optimization < 5MB',
                'Documentation & migration guide'
            ],
            status: 'pending'
        }
    ],
    success_criteria: {
        storage_size_mb: { current: 6800, target: 500, metric: 'du -sh .reasoning/' },
        active_timers: { current: 54, target: 10, metric: 'grep -r setInterval | wc -l' },
        boot_time_ms: { current: 3000, target: 1000, metric: 'VS Code profiling' },
        plaintext_tokens: { current: true, target: false, metric: 'Audit .reasoning/security/' },
        vsix_size_mb: { current: 17, target: 5, metric: 'ls -lh *.vsix' },
        ram_usage_mb: { current: 200, target: 50, metric: 'Process monitor' },
        json_validation: { current: 0, target: 100, metric: 'Zod schema coverage %' }
    }
};

// Charger les goals existants
let goalsData;
if (fs.existsSync(goalsPath)) {
    goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
} else {
    goalsData = {
        generated_at: new Date().toISOString(),
        active_goals: [],
        completed_goals: [],
        total_goals: 0
    };
}

// Vérifier si le goal existe déjà
const existingRefactorGoal = goalsData.active_goals.find(g => 
    g.objective.includes('Refactor Plan v1.1.0')
);

if (existingRefactorGoal) {
    console.log('⚠️  Refactor goal already exists:');
    console.log(`   ID: ${existingRefactorGoal.id}`);
    console.log(`   Progress: ${(existingRefactorGoal.progress * 100).toFixed(0)}%`);
    console.log(`   Status: ${existingRefactorGoal.status}`);
    console.log('');
    console.log('❓ Update existing goal? (Ctrl+C to cancel)');
    
    // Mettre à jour le goal existant
    const index = goalsData.active_goals.indexOf(existingRefactorGoal);
    goalsData.active_goals[index] = {
        ...existingRefactorGoal,
        ...refactorGoal,
        id: existingRefactorGoal.id, // Garder l'ID original
        created_at: existingRefactorGoal.created_at, // Garder la date de création
        updated_at: new Date().toISOString()
    };
    
    console.log('✅ Goal updated');
} else {
    // Ajouter le nouveau goal en priorité (au début de la liste)
    goalsData.active_goals.unshift(refactorGoal);
    goalsData.total_goals = goalsData.active_goals.length + goalsData.completed_goals.length;
    goalsData.generated_at = new Date().toISOString();
    
    console.log('✅ New goal added');
}

// Marquer le goal Perceptual Layer comme "deferred" (basse priorité vs refactor)
const perceptualGoal = goalsData.active_goals.find(g => 
    g.objective.includes('visual dashboard')
);
if (perceptualGoal && !perceptualGoal.status) {
    perceptualGoal.status = 'deferred';
}

// Sauvegarder
fs.writeFileSync(goalsPath, JSON.stringify(goalsData, null, 2), 'utf-8');

console.log('');
console.log('📊 Goals Summary:');
console.log(`   Total active goals: ${goalsData.active_goals.length}`);
console.log(`   Total completed goals: ${goalsData.completed_goals.length}`);
console.log('');

console.log('🎯 Active Goals (priority order):');
const sortedGoals = [...goalsData.active_goals].sort((a, b) => {
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
});

sortedGoals.forEach((goal, index) => {
    const progress = goal.progress !== undefined ? `${(goal.progress * 100).toFixed(0)}%` : '0%';
    const status = goal.status ? `[${goal.status.toUpperCase()}]` : '';
    console.log(`   ${index + 1}. ${goal.priority.toUpperCase().padEnd(8)} ${goal.objective.substring(0, 60)} ${status}`);
    console.log(`      Progress: ${progress} | Confidence: ${(goal.confidence * 100).toFixed(0)}% | Duration: ${goal.expected_duration}`);
});

console.log('');
console.log('✅ Refactor Plan v1.1.0 loaded into RL3 cognitive system');
console.log('');
console.log('📝 Next steps:');
console.log('   1. View goal details: cat .reasoning/goals.json');
console.log('   2. Generate tasks: Use TaskSynthesizer (via VS Code command or CLI)');
console.log('   3. Execute plan: Use ReflectionManager autonomous execution');
console.log('   4. Track progress: Monitor .reasoning/task_memory.jsonl');
console.log('');
console.log('🚀 To execute the plan:');
console.log('   VS Code Command Palette → "Reasoning › Execute › Run Autopilot"');
console.log('   OR');
console.log('   CLI: ./rl3');
console.log('        🧠 RL3 > execute refactor plan v1.1.0');
console.log('');

