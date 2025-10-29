#!/usr/bin/env node
/**
 * Test LLMBridge avec logging réel
 */

const path = require('path');

// Simulate workspace
const workspaceRoot = __dirname;

// Load LLMInterpreter
const { LLMInterpreter } = require('./out/extension');

async function testLLMBridge() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 TEST LLMBRIDGE - LOGGING RÉEL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const interpreter = new LLMInterpreter(workspaceRoot);

    const testPhrases = [
        'Identifie les prochaines étapes',
        'Peux-tu me dire où on en est avec le projet ?',
        'Fais une synthèse des tâches en attente',
        'Analyse l\'état global'
    ];

    for (const phrase of testPhrases) {
        console.log(`\n━━━ Testing: "${phrase}" ━━━`);
        
        const start = Date.now();
        const result = await interpreter.interpret(phrase);
        const duration = Date.now() - start;

        console.log(`[${new Date().toISOString()}] → Action détectée: ${result.intent} (confidence: ${(result.confidence * 100).toFixed(1)}%) [${result.provider || 'offline'}]`);
        console.log(`[${new Date().toISOString()}] ⏱️  Total time: ${duration}ms\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Test complete');
    console.log('═══════════════════════════════════════════════════════════════');
}

testLLMBridge().catch(err => {
    console.error('[ERROR]', err);
    process.exit(1);
});
