#!/bin/bash
# Test Script - RL4 History Enrichment v2.0.9
# Valide que les Quick Wins #1 + #3 fonctionnent correctement

set -e

echo "🧪 RL4 History Enrichment — Test Suite"
echo "======================================"
echo ""

WORKSPACE="/Users/valentingaludec/Reasoning Layer V3"
cd "$WORKSPACE"

echo "📋 Test 1: Pré-requis"
echo "---"
echo -n "✓ Dossiers history créés: "
if [ -d ".reasoning_rl4/history" ] && [ -d ".reasoning_rl4/context_history" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

echo -n "✓ Patterns.json existe: "
if [ -f ".reasoning_rl4/patterns.json" ]; then
  PATTERN_COUNT=$(cat .reasoning_rl4/patterns.json | jq '.patterns | length')
  echo "✅ PASS ($PATTERN_COUNT patterns)"
else
  echo "❌ FAIL"
  exit 1
fi

echo ""
echo "📋 Test 2: Attente Premier Cycle"
echo "---"
echo "⏳ Attendre 15 secondes pour permettre au moins 1 cycle..."
sleep 15

echo ""
echo "📋 Test 3: Pattern Evolution"
echo "---"
if [ -f ".reasoning_rl4/history/patterns_evolution.jsonl" ]; then
  LINES=$(cat .reasoning_rl4/history/patterns_evolution.jsonl | wc -l | tr -d ' ')
  if [ "$LINES" -gt 0 ]; then
    echo "✅ PASS: patterns_evolution.jsonl créé ($LINES lignes)"
    echo ""
    echo "Aperçu (3 premières lignes):"
    cat .reasoning_rl4/history/patterns_evolution.jsonl | head -3 | jq -c '{cycle: .cycle_id, pattern: .pattern_id, conf: .confidence, trend: .trend}'
  else
    echo "⚠️  WARN: Fichier vide (attendre plus de cycles)"
  fi
else
  echo "⚠️  WARN: Fichier pas encore créé (normal si <10 cycles)"
fi

echo ""
echo "📋 Test 4: IDE Activity (Quick Wins #1)"
echo "---"
if [ -f ".reasoning_rl4/traces/ide_activity.jsonl" ]; then
  LINES=$(cat .reasoning_rl4/traces/ide_activity.jsonl | wc -l | tr -d ' ')
  echo "✅ PASS: ide_activity.jsonl créé ($LINES snapshots)"
  
  if [ "$LINES" -gt 0 ]; then
    echo ""
    echo "Dernier snapshot:"
    cat .reasoning_rl4/traces/ide_activity.jsonl | tail -1 | jq '{open_files: .metadata.open_files, linter_errors: .metadata.linter_errors.total}'
  fi
else
  echo "⚠️  WARN: Pas encore créé (attendre cycle 10)"
fi

echo ""
echo "📋 Test 5: Cognitive Snapshots"
echo "---"
SNAPSHOT_COUNT=$(ls -1 .reasoning_rl4/context_history/snapshot-*.json 2>/dev/null | wc -l | tr -d ' ')
echo "Snapshots trouvés: $SNAPSHOT_COUNT"

if [ "$SNAPSHOT_COUNT" -gt 0 ]; then
  echo "✅ PASS: Snapshots créés"
  echo ""
  echo "Liste:"
  ls -lh .reasoning_rl4/context_history/snapshot-*.json
  
  # Test premier snapshot
  FIRST_SNAPSHOT=$(ls -1 .reasoning_rl4/context_history/snapshot-*.json | head -1)
  echo ""
  echo "Contenu $FIRST_SNAPSHOT:"
  cat "$FIRST_SNAPSHOT" | jq '{snapshot_id, patterns_count: (.patterns | length), cognitive_load}'
else
  echo "⚠️  WARN: Aucun snapshot (attendre cycle 10)"
fi

echo ""
echo "📋 Test 6: Index Global"
echo "---"
if [ -f ".reasoning_rl4/context_history/index.json" ]; then
  INDEX_SIZE=$(cat .reasoning_rl4/context_history/index.json | jq 'length')
  echo "✅ PASS: Index créé ($INDEX_SIZE entries)"
  echo ""
  echo "Contenu:"
  cat .reasoning_rl4/context_history/index.json | jq '.'
else
  echo "⚠️  WARN: Index pas encore créé"
fi

echo ""
echo "======================================"
echo "🎯 Résumé Tests"
echo "======================================"
echo ""
echo "Pour validation complète:"
echo "1. Attendre 10 cycles (~100s)"
echo "2. Relancer ce script"
echo "3. Tous tests doivent être ✅ PASS"
echo ""
echo "Monitoring continu:"
echo "  watch -n 2 'ls -lh .reasoning_rl4/history && ls -lh .reasoning_rl4/context_history | tail -5'"
echo ""

