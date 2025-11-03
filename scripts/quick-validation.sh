#!/bin/bash
# Quick validation script - Check if scheduler is generating cycles

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CYCLES_FILE="$WORKSPACE_ROOT/.reasoning_rl4/ledger/cycles.jsonl"

echo "🧪 RL4 Quick Validation - Scheduler Active Check"
echo "================================================="
echo ""

# Check initial state
if [ ! -f "$CYCLES_FILE" ]; then
    echo "❌ ERROR: cycles.jsonl not found"
    echo "   Extension may not be activated"
    exit 1
fi

INITIAL_COUNT=$(wc -l < "$CYCLES_FILE" | tr -d ' ')
echo "📊 Initial cycles count: $INITIAL_COUNT"
echo "⏳ Waiting 30 seconds for new cycles..."
echo ""

# Wait 30 seconds
for i in {1..30}; do
    echo -ne "\r   Progress: $i/30s"
    sleep 1
done
echo ""
echo ""

# Check final state
FINAL_COUNT=$(wc -l < "$CYCLES_FILE" | tr -d ' ')
NEW_CYCLES=$(($FINAL_COUNT - $INITIAL_COUNT))

echo "📊 Final cycles count: $FINAL_COUNT"
echo "✨ New cycles generated: $NEW_CYCLES"
echo ""

if [ $NEW_CYCLES -ge 3 ]; then
    echo "✅ SUCCESS: Scheduler is active!"
    echo "   $NEW_CYCLES cycles generated in 30 seconds"
    echo ""
    echo "📝 Last 3 cycles:"
    tail -3 "$CYCLES_FILE" | jq -c '{cycleId, timestamp: .timestamp[11:19], merkleRoot: .merkleRoot[:16]}'
    echo ""
    echo "🎯 Next step: Run full 10-cycle test"
    echo "   ./scripts/test-10-cycles.sh"
    exit 0
elif [ $NEW_CYCLES -gt 0 ]; then
    echo "⚠️  WARNING: Only $NEW_CYCLES cycles generated"
    echo "   Expected: 3+ cycles (1 per 10s)"
    echo ""
    echo "Possible causes:"
    echo "  - Scheduler started late (normal)"
    echo "  - Cycle interval is longer than expected"
    echo ""
    echo "🔍 Recommendation: Wait another 30s and check again"
    exit 1
else
    echo "❌ FAILURE: No cycles generated"
    echo ""
    echo "Possible causes:"
    echo "  1. Extension not activated (check Output Channel)"
    echo "  2. Scheduler not started (check for startup errors)"
    echo "  3. Timer not registered (check TimerRegistry)"
    echo ""
    echo "🔧 Debug steps:"
    echo "  1. Reload Cursor: Cmd+Shift+P > Developer: Reload Window"
    echo "  2. Check Output Channel: Reasoning Layer"
    echo "  3. Look for: '🧠 RL4 CognitiveScheduler created'"
    echo "  4. Run this test again after confirming scheduler started"
    exit 1
fi

