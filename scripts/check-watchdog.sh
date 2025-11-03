#!/bin/bash
# Check if watchdog is active and scheduler is generating cycles

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CYCLES_FILE="$WORKSPACE_ROOT/.reasoning_rl4/ledger/cycles.jsonl"

echo "🛡️ RL4 Watchdog Status Check"
echo "============================="
echo ""

# Check current cycle count
if [ ! -f "$CYCLES_FILE" ]; then
    echo "❌ ERROR: cycles.jsonl not found"
    exit 1
fi

INITIAL_COUNT=$(wc -l < "$CYCLES_FILE" | tr -d ' ')
INITIAL_TIME=$(date '+%H:%M:%S')

echo "📊 Initial cycles: $INITIAL_COUNT"
echo "⏰ Start time: $INITIAL_TIME"
echo ""
echo "⏳ Waiting 30 seconds for cycles + watchdog check..."
echo ""

# Progress bar
for i in {1..30}; do
    echo -ne "\r   ⏳ $i/30s"
    sleep 1
done
echo ""
echo ""

# Check final state
FINAL_COUNT=$(wc -l < "$CYCLES_FILE" | tr -d ' ')
FINAL_TIME=$(date '+%H:%M:%S')
NEW_CYCLES=$(($FINAL_COUNT - $INITIAL_COUNT))

echo "📊 Final cycles: $FINAL_COUNT"
echo "⏰ End time: $FINAL_TIME"
echo "✨ New cycles: $NEW_CYCLES"
echo ""

if [ $NEW_CYCLES -ge 3 ]; then
    echo "✅ SUCCESS: Scheduler is generating cycles!"
    echo ""
    echo "📝 Last 3 cycles:"
    tail -3 "$CYCLES_FILE" | jq -c '{cycleId, timestamp: .timestamp[11:19]}'
    echo ""
    echo "🛡️ Watchdog Status: ACTIVE"
    echo "   (Check Output Channel for watchdog logs in ~60s)"
    echo ""
    echo "🎯 Next: Wait 1 minute for watchdog health check log"
    exit 0
else
    echo "❌ FAILURE: No cycles generated ($NEW_CYCLES)"
    echo ""
    echo "🔍 Possible causes:"
    echo "  1. Scheduler not started (check Output Channel)"
    echo "  2. Watchdog not installed (version mismatch)"
    echo "  3. Timer registration failed"
    echo ""
    echo "📋 Debug checklist:"
    echo "  ✓ Did you see '🛡️ RL4 Watchdog active' in Output Channel?"
    echo "  ✓ Is Kernel Status showing 5+ timers? (Run: Reasoning: Kernel Status)"
    echo "  ✓ Did you reload AFTER installing the watchdog version?"
    echo ""
    exit 1
fi

