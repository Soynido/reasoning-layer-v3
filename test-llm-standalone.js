#!/usr/bin/env node
/**
 * Test standalone du LLMBridge (sans VS Code)
 */

// Mock minimal pour compiler LLMBridge standalone
const fs = require('fs');
const path = require('path');

// Lire et évaluer directement le code TypeScript compilé du LLMBridge
// Pour un test réel, on va juste vérifier la structure

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 TEST LLMBRIDGE - VÉRIFICATION STRUCTURE');
console.log('═══════════════════════════════════════════════════════════════\n');

const bridgePath = path.join(__dirname, 'extension/core/inputs/LLMBridge.ts');
const content = fs.readFileSync(bridgePath, 'utf-8');

// Vérifier les éléments clés
const checks = [
    { name: 'Classe LLMBridge', pattern: /export class LLMBridge/, found: false },
    { name: 'Méthode interpret()', pattern: /public async interpret/, found: false },
    { name: 'Anthropic API', pattern: /queryAnthropic/, found: false },
    { name: 'OpenAI API', pattern: /queryOpenAI/, found: false },
    { name: 'Logging avec timestamp', pattern: /new Date\(\)\.toISOString\(\)/, found: false },
    { name: 'Gestion d\'erreurs', pattern: /catch.*err/, found: false },
    { name: 'Métriques de performance', pattern: /Date\.now\(\)/, found: false }
];

checks.forEach(check => {
    check.found = check.pattern.test(content);
    const status = check.found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
});

const allPassed = checks.every(c => c.found);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(allPassed ? '✅ Tous les tests passent' : '❌ Certains tests échouent');
console.log('═══════════════════════════════════════════════════════════════\n');

// Afficher un exemple de log attendu
console.log('📋 Exemple de flux de logs attendu :\n');
console.log('[2025-10-29T16:45:07.123Z] 🎧 Input capturé: "Peux-tu m\'expliquer où on en est ?"');
console.log('[2025-10-29T16:45:07.124Z] 🧠 Offline match: unknown (0.41)');
console.log('[2025-10-29T16:45:07.125Z] 🌐 LLMBridge: Sending prompt → anthropic');
console.log('[2025-10-29T16:45:07.126Z] 📝 Prompt: "Peux-tu m\'expliquer où on en est ?"');
console.log('[2025-10-29T16:45:08.345Z] 🤖 LLMBridge (anthropic) responded in 1219ms');
console.log('[2025-10-29T16:45:08.346Z] → Parsed intent: status (93.0% confidence)');
console.log('[2025-10-29T16:45:08.347Z] 🧠 RL3: Exécution de la commande "status"');
console.log('[2025-10-29T16:45:09.456Z] ✅ Synthèse cognitive générée avec succès\n');

process.exit(allPassed ? 0 : 1);
