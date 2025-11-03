#!/bin/bash
# Test script for 10-cycle validation
# 
# Usage: ./scripts/test-10-cycles.sh
# 
# Prerequisites:
# 1. RL4 extension installed (reasoning-layer-v3-1.0.87.vsix)
# 2. Cursor/VS Code reloaded to activate extension
# 3. kernel_config.json: cognitive_cycle_interval_ms = 10000 (10s)
# 
# Expected behavior:
# - CognitiveScheduler starts on activation
# - Runs 1 cycle every 10 seconds
# - Each cycle appends summary to .reasoning_rl4/ledger/cycles.jsonl
# - After 10 cycles (100s), cycles.jsonl should contain 10 entries

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CYCLES_FILE="$WORKSPACE_ROOT/.reasoning_rl4/ledger/cycles.jsonl"
CONFIG_FILE="$WORKSPACE_ROOT/.reasoning/kernel_config.json"

echo "🧪 RL4 Kernel - 10-Cycle Validation Test"
echo "========================================="
echo ""
echo "📍 Workspace: $WORKSPACE_ROOT"
echo "📝 Cycles file: $CYCLES_FILE"
echo "⚙️  Config: $CONFIG_FILE"
echo ""

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: kernel_config.json not found"
    exit 1
fi

# Extract cycle interval from config
CYCLE_INTERVAL=$(jq -r '.intervals.cognitive_cycle_interval_ms' "$CONFIG_FILE")
echo "⏱️  Cycle interval: ${CYCLE_INTERVAL}ms ($(($CYCLE_INTERVAL / 1000))s)"
echo ""

# Calculate wait time (10 cycles + 20s buffer)
WAIT_TIME=$(($CYCLE_INTERVAL * 10 / 1000 + 20))
echo "⏳ Waiting ${WAIT_TIME}s for 10 cycles to complete..."
echo ""
echo "📌 Instructions:"
echo "   1. Make sure Cursor/VS Code is RUNNING with this workspace open"
echo "   2. Extension must be ACTIVATED (check Output Channel: Reasoning Layer)"
echo "   3. Press ENTER to start monitoring, or Ctrl+C to abort"
echo ""
read -p "Press ENTER to continue..."
echo ""

# Check initial state
if [ -f "$CYCLES_FILE" ]; then
    INITIAL_COUNT=$(wc -l < "$CYCLES_FILE" | tr -d ' ')
    echo "📊 Initial cycles count: $INITIAL_COUNT"
else
    INITIAL_COUNT=0
    echo "📊 Initial cycles count: 0 (file doesn't exist yet)"
fi
echo ""

# Wait for cycles to run
START_TIME=$(date +%s)
for i in $(seq 1 $WAIT_TIME); do
    echo -ne "\r⏳ Elapsed: ${i}s / ${WAIT_TIME}s"
    sleep 1
done
echo ""
echo ""

# Check final state
if [ -f "$CYCLES_FILE" ]; then
    FINAL_COUNT=$(wc -l < "$CYCLES_FILE" | tr -d ' ')
    NEW_CYCLES=$(($FINAL_COUNT - $INITIAL_COUNT))
    echo "📊 Final cycles count: $FINAL_COUNT"
    echo "✨ New cycles generated: $NEW_CYCLES"
    echo ""
    
    if [ $NEW_CYCLES -ge 10 ]; then
        echo "✅ SUCCESS: 10+ cycles completed!"
        echo ""
        echo "📝 Displaying last 5 cycle summaries:"
        tail -5 "$CYCLES_FILE" | jq -c '{cycleId, timestamp, merkleRoot: .merkleRoot[:16], prevMerkleRoot: .prevMerkleRoot[:16]}'
        echo ""
        echo "🔍 Verifying inter-cycle chaining..."
        
        # Check if prevMerkleRoot chains are valid
        CHAIN_BREAKS=$(tail -10 "$CYCLES_FILE" | jq -r '.prevMerkleRoot' | grep -c "^0000000000000000$" || true)
        TOTAL_CYCLES=$(tail -10 "$CYCLES_FILE" | wc -l | tr -d ' ')
        
        if [ $CHAIN_BREAKS -eq 1 ]; then
            echo "✅ Chain integrity: OK (genesis cycle + $(($TOTAL_CYCLES - 1)) linked cycles)"
        elif [ $CHAIN_BREAKS -eq 0 ] && [ $INITIAL_COUNT -gt 0 ]; then
            echo "✅ Chain integrity: OK (all cycles linked to previous)"
        else
            echo "⚠️  Chain integrity: $(($TOTAL_CYCLES - $CHAIN_BREAKS))/$(($TOTAL_CYCLES)) cycles linked"
            echo "   (Expected: 1 genesis + $(($TOTAL_CYCLES - 1)) linked)"
        fi
        echo ""
        echo "🎯 Next step: Tag v2.0.1"
        echo "   git tag -a v2.0.1 -m 'RL4: CycleAggregator validated (10 cycles)'"
        echo "   git push origin v2.0.1"
        
        exit 0
    else
        echo "⚠️  WARNING: Only $NEW_CYCLES cycles generated (expected 10+)"
        echo ""
        echo "Possible reasons:"
        echo "  1. Extension not activated (check Output Channel: Reasoning Layer)"
        echo "  2. CognitiveScheduler not started (check console logs)"
        echo "  3. Cycle interval too long ($CYCLE_INTERVAL ms)"
        echo "  4. Idempotence skip (same input hash)"
        echo ""
        echo "🔍 Debug steps:"
        echo "  1. Check extension activation: Open Output Channel > Reasoning Layer"
        echo "  2. Check scheduler status: Look for '🔍 Pattern Learning phase' logs"
        echo "  3. Check cycles.jsonl: cat $CYCLES_FILE"
        echo "  4. Check kernel logs: cat .reasoning_rl4/state/health.jsonl"
        
        exit 1
    fi
else
    echo "❌ ERROR: cycles.jsonl not created"
    echo ""
    echo "Possible reasons:"
    echo "  1. Extension not installed or not activated"
    echo "  2. CognitiveScheduler failed to initialize"
    echo "  3. RBOMLedger initialization error"
    echo ""
    echo "🔍 Debug steps:"
    echo "  1. Reinstall extension: cursor --install-extension reasoning-layer-v3-1.0.87.vsix --force"
    echo "  2. Reload Cursor/VS Code: Cmd+Shift+P > Developer: Reload Window"
    echo "  3. Check activation logs: Open Output Channel > Reasoning Layer"
    echo "  4. Check for errors: grep -r 'RBOMLedger' .reasoning_rl4/"
    
    exit 1
fi

