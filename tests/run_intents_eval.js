#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const INTENTS_PATH = path.join(WORKSPACE_ROOT, 'tests', 'intents_full.json');
const REPORT_PATH = path.join(WORKSPACE_ROOT, '.reasoning', 'reports', 'rl3_full_eval.json');

function runCommand(command, args, options = {}) {
    const start = Date.now();
    const result = spawnSync(command, args, {
        cwd: WORKSPACE_ROOT,
        encoding: 'utf-8',
        maxBuffer: 20 * 1024 * 1024,
        ...options
    });
    const duration = Date.now() - start;
    return { ...result, duration };
}

function detectLanguage(prompt) {
    const detection = runCommand('node', ['.cursor/detect-lang.js', prompt]);
    const output = detection.stdout ? detection.stdout.trim() : '';
    return output || 'en';
}

function ensureReportDir() {
    const dir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function summarizeOutput(output, maxLines = 6) {
    if (!output) return '';
    const lines = output.split(/\r?\n/).filter(Boolean);
    return lines.slice(0, maxLines).join('\n');
}

function main() {
    if (!fs.existsSync(INTENTS_PATH)) {
        console.error(`❌ Missing intents file at ${INTENTS_PATH}`);
        process.exit(1);
    }

    const intents = JSON.parse(fs.readFileSync(INTENTS_PATH, 'utf-8'));
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    intents.forEach((intent) => {
        const { id, category, prompt } = intent;
        const lang = detectLanguage(prompt);

        const execution = runCommand('node', ['.reasoning/cli.js', 'synthesize', `--goal=${prompt}`, `--lang=${lang}`]);
        const stdout = execution.stdout || '';
        const stderr = execution.stderr || '';
        const combined = stderr ? `${stdout}\n[stderr]\n${stderr}` : stdout;

        const success = /✅\s*\[[^\]]+\]\s*Command completed successfully/.test(stdout);
        const semanticMatch = stdout.match(/Semantic intent:\s*(.*)/);

        let status = 'incomplete';
        if (success) {
            status = 'ok';
            successCount += 1;
        } else if (execution.status !== 0 || execution.error) {
            status = 'error';
            errorCount += 1;
        } else {
            errorCount += 1;
        }

        const markers = {
            brain: stdout.includes('🧠'),
            target: stdout.includes('🎯'),
            stats: stdout.includes('📊'),
            check: stdout.includes('✅')
        };

        results.push({
            id,
            category,
            prompt,
            status,
            semantic_intent: semanticMatch ? semanticMatch[1].trim() : null,
            duration_ms: execution.duration,
            markers,
            output_summary: summarizeOutput(stdout)
        });
    });

    const total = intents.length;
    const successRate = total > 0 ? (successCount / total) : 0;
    const errorRate = total > 0 ? (errorCount / total) : 0;
    const incompletePrompts = results
        .filter((item) => item.status !== 'ok')
        .map((item) => ({ id: item.id, prompt: item.prompt }));

    const report = {
        generated_at: new Date().toISOString(),
        total,
        success: successCount,
        success_rate: Number(successRate.toFixed(2)),
        errors: errorCount,
        error_rate: Number(errorRate.toFixed(2)),
        incomplete_prompts: incompletePrompts,
        results
    };

    ensureReportDir();
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

    console.log(`📄 Report written to ${REPORT_PATH}`);
    console.log(`✅ Success rate: ${(successRate * 100).toFixed(1)}%`);
}

main();

