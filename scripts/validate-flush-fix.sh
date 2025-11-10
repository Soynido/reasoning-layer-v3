#!/bin/bash

##############################################################################
# Validation Script: AppendOnlyWriter Flush Fix (RL4 v2.0.1)
#
# Fix applied: Auto-flush buffer every 10 lines (previously 1000)
# Expected: cycles.jsonl updated every 10 cycles during active session
##############################################################################

WORKSPACE_ROOT="/Users/valentingaludec/Reasoning Layer V3"
CYCLES_FILE="$WORKSPACE_ROOT/.reasoning_rl4/ledger/cycles.jsonl"

echo "=== RL4 FLUSH FIX VALIDATION ==="
echo ""
echo "📍 Cycles file: $CYCLES_FILE"
echo ""

if [ ! -f "$CYCLES_FILE" ]; then
    echo "❌ cycles.jsonl not found! Extension may not be running."
    exit 1
fi

echo "1️⃣  Initial state:"
INITIAL_COUNT=$(wc -l < "$CYCLES_FILE" | xargs)
LAST_CYCLE=$(tail -1 "$CYCLES_FILE" | jq -r '.cycleId')
LAST_TIME=$(tail -1 "$CYCLES_FILE" | jq -r '.timestamp')

echo "   Total cycles: $INITIAL_COUNT"
echo "   Last cycle: #$LAST_CYCLE at $LAST_TIME"
echo ""

echo "2️⃣  Waiting 2 minutes for new cycles..."
echo "   (Expecting at least 12 new cycles with 10s interval)"
echo ""
sleep 120

echo "3️⃣  New state:"
NEW_COUNT=$(wc -l < "$CYCLES_FILE" | xargs)
NEW_LAST_CYCLE=$(tail -1 "$CYCLES_FILE" | jq -r '.cycleId')
NEW_LAST_TIME=$(tail -1 "$CYCLES_FILE" | jq -r '.timestamp')

ADDED=$(($NEW_COUNT - $INITIAL_COUNT))

echo "   Total cycles: $NEW_COUNT"
echo "   Last cycle: #$NEW_LAST_CYCLE at $NEW_LAST_TIME"
echo "   New cycles added: $ADDED"
echo ""

echo "4️⃣  Validation:"
if [ "$ADDED" -ge 10 ]; then
    echo "   ✅ SUCCESS: $ADDED cycles added (flush working!)"
    echo ""
    echo "   Last 3 cycles:"
    tail -3 "$CYCLES_FILE" | jq -c '{cycleId, timestamp: .timestamp[11:23]}'
    echo ""
    echo "🎉 FIX VALIDATED: Auto-flush every 10 lines is working!"
    exit 0
elif [ "$ADDED" -gt 0 ]; then
    echo "   ⚠️  PARTIAL: Only $ADDED cycles added (expected 10+)"
    echo "   Possible causes:"
    echo "   - Extension paused/crashed"
    echo "   - Watchdog not firing"
    exit 1
else
    echo "   ❌ FAILURE: No new cycles added"
    echo "   Possible causes:"
    echo "   - Extension not running"
    echo "   - Scheduler stopped"
    echo "   - File write permission issue"
    exit 1
fi

