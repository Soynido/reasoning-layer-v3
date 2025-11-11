#!/bin/bash
# 🔄 Après reload VS Code, lancer ce script

echo "⏳ Attente 30s pour laisser 3 cycles s'exécuter..."
sleep 30

echo ""
echo "📊 Cycle actuel :"
cat .reasoning_rl4/ledger/cycles.jsonl | tail -1 | jq '{cycleId, timestamp}'

echo ""
echo "📁 Fichiers créés :"
ls -lh .reasoning_rl4/history/ .reasoning_rl4/context_history/ 2>/dev/null

echo ""
echo "🧪 Test Pattern Evolution :"
cat .reasoning_rl4/history/patterns_evolution.jsonl 2>/dev/null | head -2 | jq -c '{cycle, pattern, confidence}'

echo ""
echo "🧪 Test IDE Activity :"
cat .reasoning_rl4/history/ide_activity.jsonl 2>/dev/null | head -2 | jq -c '{timestamp, event_type, focused_file}'

echo ""
echo "🧪 Test Snapshots :"
ls -1 .reasoning_rl4/context_history/snapshot-*.json 2>/dev/null | wc -l

