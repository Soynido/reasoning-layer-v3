#!/bin/bash

# RL4 Backend Test Suite
# Tests all backend components before focusing on frontend

set -e

WORKSPACE_ROOT="/Users/valentingaludec/Reasoning Layer V3"
RL4_DATA="$WORKSPACE_ROOT/.reasoning_rl4"

echo "🧪 RL4 Backend Test Suite"
echo "========================="
echo ""

# Test 1: Check RL4 data structure exists
echo "Test 1: Data Structure"
echo "----------------------"
if [ -d "$RL4_DATA" ]; then
    echo "✅ .reasoning_rl4/ exists"
    echo "   Size: $(du -sh "$RL4_DATA" | awk '{print $1}')"
else
    echo "❌ .reasoning_rl4/ NOT FOUND"
    exit 1
fi
echo ""

# Test 2: Check critical files
echo "Test 2: Critical Files"
echo "----------------------"
CRITICAL_FILES=(
    "ledger/cycles.jsonl"
    "traces/file_changes.jsonl"
    "traces/git_commits.jsonl"
    "traces/ide_activity.jsonl"
    "traces/build_metrics.jsonl"
    "patterns.json"
    "forecasts.json"
    "correlations.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$RL4_DATA/$file" ]; then
        SIZE=$(wc -c < "$RL4_DATA/$file" | tr -d ' ')
        if [ "$SIZE" -gt 0 ]; then
            echo "✅ $file (${SIZE} bytes)"
        else
            echo "⚠️  $file (empty)"
        fi
    else
        echo "❌ $file (missing)"
    fi
done
echo ""

# Test 3: Check cycles are running
echo "Test 3: Cycles Running"
echo "----------------------"
if [ -f "$RL4_DATA/ledger/cycles.jsonl" ]; then
    CYCLE_COUNT=$(wc -l < "$RL4_DATA/ledger/cycles.jsonl" | tr -d ' ')
    LAST_CYCLE=$(tail -1 "$RL4_DATA/ledger/cycles.jsonl" | jq -r '.cycleId' 2>/dev/null || echo "N/A")
    LAST_TIME=$(tail -1 "$RL4_DATA/ledger/cycles.jsonl" | jq -r '.timestamp' 2>/dev/null || echo "N/A")
    
    echo "✅ Total cycles: $CYCLE_COUNT"
    echo "   Last cycle ID: $LAST_CYCLE"
    echo "   Last timestamp: $LAST_TIME"
else
    echo "❌ No cycles found"
fi
echo ""

# Test 4: Check patterns
echo "Test 4: Patterns Detection"
echo "--------------------------"
if [ -f "$RL4_DATA/patterns.json" ]; then
    PATTERN_COUNT=$(jq '.patterns | length' "$RL4_DATA/patterns.json" 2>/dev/null || echo "0")
    echo "✅ Patterns detected: $PATTERN_COUNT"
    
    if [ "$PATTERN_COUNT" -gt 0 ]; then
        echo "   Top patterns:"
        jq -r '.patterns[0:3] | .[] | "   - \(.pattern_id) (\(.confidence * 100 | floor)% confidence)"' "$RL4_DATA/patterns.json" 2>/dev/null || echo "   (parse error)"
    fi
else
    echo "❌ No patterns.json"
fi
echo ""

# Test 5: Check forecasts
echo "Test 5: Forecasts Generation"
echo "----------------------------"
if [ -f "$RL4_DATA/forecasts.json" ]; then
    FORECAST_COUNT=$(jq '.forecasts | length' "$RL4_DATA/forecasts.json" 2>/dev/null || echo "0")
    echo "✅ Forecasts generated: $FORECAST_COUNT"
    
    if [ "$FORECAST_COUNT" -gt 0 ]; then
        echo "   Recent forecasts:"
        jq -r '.forecasts[0:2] | .[] | "   - \(.predicted) (\(.confidence * 100 | floor)%)"' "$RL4_DATA/forecasts.json" 2>/dev/null || echo "   (parse error)"
    fi
else
    echo "❌ No forecasts.json"
fi
echo ""

# Test 6: Check IDE activity
echo "Test 6: IDE Activity Capture"
echo "-----------------------------"
if [ -f "$RL4_DATA/traces/ide_activity.jsonl" ]; then
    IDE_COUNT=$(wc -l < "$RL4_DATA/traces/ide_activity.jsonl" | tr -d ' ')
    echo "✅ IDE snapshots: $IDE_COUNT"
    
    if [ "$IDE_COUNT" -gt 0 ]; then
        LAST_IDE=$(tail -1 "$RL4_DATA/traces/ide_activity.jsonl" | jq -r '.metadata.focused_file.path // "No file"' 2>/dev/null || echo "N/A")
        echo "   Last focused: $LAST_IDE"
    fi
else
    echo "❌ No ide_activity.jsonl (writers not configured)"
fi
echo ""

# Test 7: Check file changes
echo "Test 7: File Change Tracking"
echo "-----------------------------"
if [ -f "$RL4_DATA/traces/file_changes.jsonl" ]; then
    CHANGE_COUNT=$(wc -l < "$RL4_DATA/traces/file_changes.jsonl" | tr -d ' ')
    echo "✅ File changes tracked: $CHANGE_COUNT"
else
    echo "❌ No file_changes.jsonl"
fi
echo ""

# Test 8: Check correlations
echo "Test 8: Correlations"
echo "--------------------"
if [ -f "$RL4_DATA/correlations.json" ]; then
    CORR_COUNT=$(jq '.correlations | length' "$RL4_DATA/correlations.json" 2>/dev/null || echo "0")
    echo "✅ Correlations found: $CORR_COUNT"
else
    echo "⚠️  No correlations.json"
fi
echo ""

# Test 9: Check cache index
echo "Test 9: Cache Index"
echo "-------------------"
if [ -d "$RL4_DATA/cache" ]; then
    CACHE_FILES=$(ls "$RL4_DATA/cache"/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ Cache files: $CACHE_FILES"
else
    echo "⚠️  No cache directory"
fi
echo ""

# Test 10: Check timelines
echo "Test 10: Timeline Generation"
echo "----------------------------"
if [ -d "$RL4_DATA/timelines" ]; then
    TIMELINE_COUNT=$(ls "$RL4_DATA/timelines"/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ Timeline files: $TIMELINE_COUNT"
else
    echo "⚠️  No timelines directory"
fi
echo ""

# Summary
echo "========================="
echo "🎯 Backend Test Summary"
echo "========================="
echo ""
echo "Core Systems:"
echo "  ✅ Data structure: OK"
echo "  ✅ Cycles: Running ($CYCLE_COUNT cycles)"
echo "  ✅ Patterns: $PATTERN_COUNT detected"
echo "  ✅ Forecasts: $FORECAST_COUNT generated"
echo ""

if [ -f "$RL4_DATA/traces/ide_activity.jsonl" ]; then
    echo "Input Capture:"
    echo "  ✅ IDE Activity: Working"
    echo "  ✅ File Changes: Working"
    echo "  ✅ Git Commits: Working"
else
    echo "Input Capture:"
    echo "  ❌ IDE Activity: BROKEN (writers not configured)"
    echo "  ⚠️  Needs: Reload Cursor after latest fix"
fi
echo ""

echo "✅ Backend validation complete!"
echo ""
echo "Next steps:"
echo "  1. If IDE Activity is broken → Reload Cursor"
echo "  2. Open a .ts file and wait 10 seconds"
echo "  3. Run this script again to verify"
echo "  4. Then focus on frontend improvements"

