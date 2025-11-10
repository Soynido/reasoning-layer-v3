#!/bin/bash

##############################################################################
# Validation Script: PatternLearningEngine Integration (RL4 v2.0.1)
#
# Validates that PatternLearningEngine is executing and detecting patterns
##############################################################################

WORKSPACE_ROOT="/Users/valentingaludec/Reasoning Layer V3"
PATTERNS_FILE="$WORKSPACE_ROOT/.reasoning_rl4/patterns.json"
CYCLES_FILE="$WORKSPACE_ROOT/.reasoning_rl4/ledger/cycles.jsonl"

echo "╔════════════════════════════════════════════════════╗"
echo "║  PatternLearningEngine Validation (RL4 v2.0.1)    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

echo "1️⃣  Checking cycles.jsonl for pattern counts..."
echo ""

if [ ! -f "$CYCLES_FILE" ]; then
    echo "❌ cycles.jsonl not found! Extension may not be running."
    exit 1
fi

# Get last 5 cycles and check pattern counts
echo "   Last 5 cycles:"
tail -5 "$CYCLES_FILE" | jq -c '{cycleId, patterns: .phases.patterns.count, time: .timestamp[11:19]}'
echo ""

LAST_PATTERN_COUNT=$(tail -1 "$CYCLES_FILE" | jq -r '.phases.patterns.count')
echo "   Last cycle pattern count: $LAST_PATTERN_COUNT"
echo ""

if [ "$LAST_PATTERN_COUNT" == "null" ] || [ -z "$LAST_PATTERN_COUNT" ]; then
    echo "⚠️  WARNING: Pattern count is null/empty"
    echo "   This means PatternLearningEngine may not be integrated yet."
elif [ "$LAST_PATTERN_COUNT" -eq 0 ]; then
    echo "ℹ️  Pattern count is 0 (no patterns detected yet)"
    echo "   This is normal if:"
    echo "   - No ledger data exists (.reasoning_rl4/ledger/rbom_ledger.jsonl)"
    echo "   - No external evidence exists (.reasoning_rl4/external/ledger.jsonl)"
else
    echo "✅ SUCCESS: $LAST_PATTERN_COUNT patterns detected!"
fi

echo ""
echo "2️⃣  Checking if patterns.json was generated..."
echo ""

if [ -f "$PATTERNS_FILE" ]; then
    PATTERN_COUNT=$(jq '.patterns | length' "$PATTERNS_FILE")
    GENERATED_AT=$(jq -r '.generated_at' "$PATTERNS_FILE")
    echo "   ✅ patterns.json exists"
    echo "   📊 Patterns stored: $PATTERN_COUNT"
    echo "   🕐 Generated at: $GENERATED_AT"
    echo ""
    echo "   Top 3 patterns:"
    jq -c '.patterns[0:3] | .[] | {id, pattern: .pattern[0:50], confidence}' "$PATTERNS_FILE" 2>/dev/null || echo "   (Unable to parse patterns)"
else
    echo "   ℹ️  patterns.json not found yet"
    echo "   Wait for first cycle to complete (check Output Channel)"
fi

echo ""
echo "3️⃣  Validation summary:"
echo ""

if [ -f "$PATTERNS_FILE" ] && [ "$LAST_PATTERN_COUNT" -gt 0 ]; then
    echo "   🎉 FULL SUCCESS: PatternLearningEngine operational!"
    echo ""
    echo "   Next steps:"
    echo "   - Migrate CorrelationEngine"
    echo "   - Migrate ForecastEngine"
    echo "   - Migrate ADRSynthesizer"
    exit 0
elif [ "$LAST_PATTERN_COUNT" -eq 0 ]; then
    echo "   ⚠️  PARTIAL: Engine integrated but no patterns detected"
    echo ""
    echo "   Possible causes:"
    echo "   - No data in ledgers (rbom_ledger.jsonl, external/ledger.jsonl)"
    echo "   - Pattern detection criteria not met"
    echo ""
    echo "   Next steps:"
    echo "   - Create test data in .reasoning_rl4/ledger/rbom_ledger.jsonl"
    echo "   - Or wait for real events to be captured"
    exit 0
else
    echo "   ❌ FAILURE: PatternLearningEngine not integrated"
    echo ""
    echo "   Check:"
    echo "   - Extension installed? (reasoning-layer-rl4@2.0.1)"
    echo "   - Extension activated? (Output Channel exists)"
    echo "   - Compilation errors? (npm run compile)"
    exit 1
fi

