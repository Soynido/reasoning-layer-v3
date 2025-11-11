#!/bin/bash
# Export RL4 Snapshot - Essential Logs for External Tools
# Creates a compact JSON with all key cognitive data

WORKSPACE="/Users/valentingaludec/Reasoning Layer V3"
OUTPUT="$WORKSPACE/rl4-snapshot.json"

cd "$WORKSPACE/.reasoning_rl4"

echo "📊 Exporting RL4 Snapshot..."
echo ""

# Build JSON snapshot
cat > "$OUTPUT" << 'EOF'
{
  "snapshot_metadata": {
    "generated_at": "TIMESTAMP",
    "version": "2.0.7",
    "purpose": "Complete RL4 cognitive state for external analysis"
  },
EOF

# Add timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s/TIMESTAMP/$TIMESTAMP/" "$OUTPUT"

# Add patterns
echo '  "patterns": ' >> "$OUTPUT"
cat patterns.json | jq '.patterns' >> "$OUTPUT"
echo ',' >> "$OUTPUT"

# Add correlations
echo '  "correlations": ' >> "$OUTPUT"
cat correlations.json >> "$OUTPUT"
echo ',' >> "$OUTPUT"

# Add forecasts
echo '  "forecasts": ' >> "$OUTPUT"
cat forecasts.json >> "$OUTPUT"
echo ',' >> "$OUTPUT"

# Add ADR index
echo '  "adr_proposals": ' >> "$OUTPUT"
cat adrs/auto/proposals.index.json >> "$OUTPUT"
echo ',' >> "$OUTPUT"

# Add kernel state (decompressed)
echo '  "kernel_state": ' >> "$OUTPUT"
gunzip -c kernel/state.json.gz >> "$OUTPUT"
echo ',' >> "$OUTPUT"

# Add validation history
echo '  "validation_history": [' >> "$OUTPUT"
cat ledger/adr_validations.jsonl | jq -s '.' | jq '.[]' | paste -sd ',' - >> "$OUTPUT"
echo '  ],' >> "$OUTPUT"

# Add last 10 cycles
echo '  "recent_cycles": [' >> "$OUTPUT"
tail -10 ledger/cycles.jsonl | jq -s '.' | jq '.[]' | paste -sd ',' - >> "$OUTPUT"
echo '  ],' >> "$OUTPUT"

# Add last 5 git commits
echo '  "recent_commits": [' >> "$OUTPUT"
tail -5 traces/git_commits.jsonl 2>/dev/null | jq -s '.' | jq '.[]' | paste -sd ',' - >> "$OUTPUT"
echo '  ],' >> "$OUTPUT"

# Add summary stats
echo '  "summary_stats": {' >> "$OUTPUT"
TOTAL_CYCLES=$(wc -l ledger/cycles.jsonl | awk '{print $1}')
TOTAL_COMMITS=$(wc -l traces/git_commits.jsonl 2>/dev/null | awk '{print $1}')
TOTAL_FILES=$(wc -l traces/file_changes.jsonl 2>/dev/null | awk '{print $1}')
PATTERNS_COUNT=$(cat patterns.json | jq '.patterns | length')
FORECASTS_COUNT=$(cat forecasts.json | jq '. | length')
CORRELATIONS_COUNT=$(cat correlations.json | jq '. | length')

cat >> "$OUTPUT" << STATS
    "total_cycles": $TOTAL_CYCLES,
    "total_commits_captured": $TOTAL_COMMITS,
    "total_file_changes": $TOTAL_FILES,
    "active_patterns": $PATTERNS_COUNT,
    "active_forecasts": $FORECASTS_COUNT,
    "active_correlations": $CORRELATIONS_COUNT
  }
}
STATS

echo ""
echo "✅ Snapshot exported!"
echo ""
echo "📁 Output: $OUTPUT"
echo "📊 Size: $(du -h "$OUTPUT" | awk '{print $1}')"
echo ""
echo "📋 Contents:"
echo "   - Patterns ($PATTERNS_COUNT)"
echo "   - Correlations ($CORRELATIONS_COUNT)"
echo "   - Forecasts ($FORECASTS_COUNT)"
echo "   - ADR Proposals (from index)"
echo "   - Kernel State (current)"
echo "   - Validation History (all)"
echo "   - Recent Cycles (last 10)"
echo "   - Recent Commits (last 5)"
echo "   - Summary Stats"
echo ""
echo "💡 Use this file for:"
echo "   - LLM context injection"
echo "   - External analytics tools"
echo "   - API integration"
echo "   - Cognitive state backup"
echo ""

