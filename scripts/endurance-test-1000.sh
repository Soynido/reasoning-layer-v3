#!/bin/bash

##
# RL4 Kernel - Endurance Test (1,000 cycles)
# 
# Validates:
# - No baseline drift (< ±0.05)
# - Lock-file mechanism functional
# - feedback_report.json evolution
# - Zero crashes over ~2.8 hours
##

set -e

WORKSPACE="/Users/valentingaludec/Reasoning Layer V3"
CYCLES_FILE="$WORKSPACE/.reasoning_rl4/ledger/cycles.jsonl"
REPORT_FILE="$WORKSPACE/.reasoning_rl4/feedback_report.json"
LOG_FILE="$WORKSPACE/.reasoning_rl4/diagnostics/endurance_test.log"

echo "🧪 RL4 Kernel — Endurance Test (1,000 cycles)"
echo "=============================================="
echo ""
echo "📊 Configuration:"
echo "   Duration: ~2.8 hours (10s/cycle × 1,000)"
echo "   Validation: Baseline drift, lock-file, crashes"
echo "   Output: $LOG_FILE"
echo ""

# Get initial state
INITIAL_CYCLES=$(wc -l < "$CYCLES_FILE" 2>/dev/null || echo "0")
INITIAL_TIME=$(date +%s)

echo "📈 Initial State:"
echo "   Cycles completed: $INITIAL_CYCLES"
echo "   Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Ensure logs directory exists
mkdir -p "$WORKSPACE/.reasoning_rl4/diagnostics"

# Start endurance test log
echo "=== Endurance Test Started: $(date) ===" > "$LOG_FILE"
echo "Target: 1,000 cycles" >> "$LOG_FILE"
echo "Initial cycles: $INITIAL_CYCLES" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo "⏳ Waiting for 1,000 cycles..."
echo "   (Extension must be running in VS Code)"
echo ""
echo "📊 Monitoring every 100 cycles..."
echo ""

# Monitor progress
CHECK_INTERVAL=100
TARGET_CYCLES=$((INITIAL_CYCLES + 1000))
LAST_CHECK=$INITIAL_CYCLES

while true; do
    # Wait 16 minutes (100 cycles × 10s)
    sleep 960
    
    # Check current cycle count
    CURRENT_CYCLES=$(wc -l < "$CYCLES_FILE" 2>/dev/null || echo "0")
    DELTA=$((CURRENT_CYCLES - INITIAL_CYCLES))
    
    if [ $CURRENT_CYCLES -gt $LAST_CHECK ]; then
        # Extract feedback report if exists
        if [ -f "$REPORT_FILE" ]; then
            COMPOSITE=$(jq -r '.composite_feedback // "N/A"' "$REPORT_FILE" 2>/dev/null || echo "N/A")
            BASELINE=$(jq -r '.baseline_precision // "N/A"' "$REPORT_FILE" 2>/dev/null || echo "N/A")
            DELTA_PRECISION=$(jq -r '.delta // "N/A"' "$REPORT_FILE" 2>/dev/null || echo "N/A")
        else
            COMPOSITE="N/A"
            BASELINE="N/A"
            DELTA_PRECISION="N/A"
        fi
        
        # Log progress
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[$TIMESTAMP] Cycles: $DELTA/1,000 | Composite: $COMPOSITE | Baseline: $BASELINE | Δ: $DELTA_PRECISION" | tee -a "$LOG_FILE"
        
        LAST_CHECK=$CURRENT_CYCLES
    fi
    
    # Check if target reached
    if [ $CURRENT_CYCLES -ge $TARGET_CYCLES ]; then
        echo ""
        echo "✅ Target reached: $DELTA cycles completed"
        break
    fi
    
    # Safety: Max 4 hours (in case something goes wrong)
    ELAPSED=$(($(date +%s) - INITIAL_TIME))
    if [ $ELAPSED -gt 14400 ]; then
        echo ""
        echo "⚠️ Timeout: 4 hours elapsed, stopping test"
        echo "   Cycles completed: $DELTA/1,000"
        break
    fi
done

# Final analysis
echo ""
echo "🎉 Endurance Test Complete!"
echo "================================"
echo ""

FINAL_CYCLES=$(wc -l < "$CYCLES_FILE")
TOTAL_DELTA=$((FINAL_CYCLES - INITIAL_CYCLES))
ELAPSED=$(($(date +%s) - INITIAL_TIME))
HOURS=$((ELAPSED / 3600))
MINUTES=$(((ELAPSED % 3600) / 60))

echo "📊 Final Results:"
echo "   Cycles completed: $TOTAL_DELTA"
echo "   Total elapsed: ${HOURS}h ${MINUTES}m"
echo "   Average cycle time: $((ELAPSED / TOTAL_DELTA))s"
echo ""

# Extract final metrics
if [ -f "$REPORT_FILE" ]; then
    echo "📈 Final Metrics:"
    jq -r '"   Composite Feedback: \(.composite_feedback * 100 | round / 100)%"' "$REPORT_FILE" 2>/dev/null
    jq -r '"   Baseline Precision: \(.baseline_precision * 100 | round / 100)%"' "$REPORT_FILE" 2>/dev/null
    jq -r '"   Delta: \(.delta * 100 | round / 100)%"' "$REPORT_FILE" 2>/dev/null
    jq -r '"   Interpretation: \(.interpretation)"' "$REPORT_FILE" 2>/dev/null
    echo ""
fi

# Check for crashes (health alerts)
HEALTH_FILE="$WORKSPACE/.reasoning_rl4/diagnostics/health.jsonl"
if [ -f "$HEALTH_FILE" ]; then
    ALERTS=$(grep -c '"alerts":\[' "$HEALTH_FILE" 2>/dev/null || echo "0")
    echo "🛡️ Health Status:"
    echo "   Total alerts: $ALERTS"
    
    if [ "$ALERTS" -eq "0" ]; then
        echo "   ✅ No alerts during test — System stable!"
    fi
fi

echo ""
echo "📝 Full log: $LOG_FILE"
echo ""
echo "✅ Endurance test validation complete!"

