#!/bin/bash
# GitHistorySeeder - Populate RL4 ledger with full Git history
# 
# This script:
# 1. Reads all Git commits since 2024
# 2. Converts each commit to a LedgerEntry
# 3. Writes to .reasoning_rl4/ledger/rbom_ledger.jsonl

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER_PATH="$WORKSPACE_ROOT/.reasoning_rl4/ledger/rbom_ledger.jsonl"

echo "🌱 GitHistorySeeder — Populating RL4 ledger with Git history"
echo ""

# Ensure directory exists
mkdir -p "$(dirname "$LEDGER_PATH")"

# Count existing entries
EXISTING_COUNT=0
if [ -f "$LEDGER_PATH" ]; then
    EXISTING_COUNT=$(wc -l < "$LEDGER_PATH" | tr -d ' ')
fi

echo "📚 Reading Git history since 2024..."
cd "$WORKSPACE_ROOT"

# Get all commits since 2024
COMMITS=$(git log --since="2024-01-01" --pretty=format:"%H" --no-merges)
TOTAL_COMMITS=$(echo "$COMMITS" | wc -l | tr -d ' ')

echo "✅ Found $TOTAL_COMMITS commits"
echo ""

echo "🔄 Converting commits to ledger entries..."

NEW_ENTRIES=0
SKIPPED=0

# Process each commit
while IFS= read -r HASH; do
    [ -z "$HASH" ] && continue
    
    # Check if already in ledger
    if [ -f "$LEDGER_PATH" ] && grep -q "\"hash\":\"$HASH\"" "$LEDGER_PATH"; then
        ((SKIPPED++))
        continue
    fi
    
    # Get commit metadata
    TIMESTAMP=$(git show -s --format=%aI "$HASH")
    AUTHOR=$(git show -s --format=%an "$HASH" | jq -Rs .)
    MESSAGE=$(git show -s --format=%s "$HASH" | jq -Rs .)
    
    # Get file stats
    STATS=$(git show --stat --format="" "$HASH" | tail -1)
    INSERTIONS=0
    DELETIONS=0
    
    if echo "$STATS" | grep -q "insertion"; then
        INSERTIONS=$(echo "$STATS" | grep -oP '\d+(?= insertion)' || echo "0")
    fi
    if echo "$STATS" | grep -q "deletion"; then
        DELETIONS=$(echo "$STATS" | grep -oP '\d+(?= deletion)' || echo "0")
    fi
    
    # Get changed files
    FILES=$(git show --name-only --format="" "$HASH" | jq -R . | jq -s .)
    
    # Detect intent type
    INTENT_TYPE="unknown"
    if echo "$MESSAGE" | grep -qE '^\\"(feat|feature)'; then
        INTENT_TYPE="feature"
    elif echo "$MESSAGE" | grep -qE '^\\"fix'; then
        INTENT_TYPE="fix"
    elif echo "$MESSAGE" | grep -qE '^\\"refactor'; then
        INTENT_TYPE="refactor"
    elif echo "$MESSAGE" | grep -qE '^\\"docs'; then
        INTENT_TYPE="docs"
    elif echo "$MESSAGE" | grep -qE '^\\"test'; then
        INTENT_TYPE="test"
    fi
    
    # Detect cognitive keywords
    KEYWORDS="[]"
    if echo "$MESSAGE" | grep -qiE 'kernel|engine|scheduler|ledger|pattern|cognit'; then
        KEYWORDS='["cognitive"]'
    fi
    
    # Create ledger entry
    ENTRY_ID="git-${HASH:0:8}-$(date +%s%N)"
    
    ENTRY=$(cat <<EOF
{
  "entry_id": "$ENTRY_ID",
  "type": "decision",
  "target_id": "adr-from-commit-${HASH:0:8}",
  "timestamp": "$TIMESTAMP",
  "data": {
    "hash": "$HASH",
    "message": $MESSAGE,
    "author": $AUTHOR,
    "files_changed": $FILES,
    "insertions": $INSERTIONS,
    "deletions": $DELETIONS,
    "intent": {
      "type": "$INTENT_TYPE",
      "keywords": $KEYWORDS
    }
  }
}
EOF
)
    
    # Append to ledger (minified)
    echo "$ENTRY" | jq -c . >> "$LEDGER_PATH"
    ((NEW_ENTRIES++))
    
    # Progress indicator
    if (( NEW_ENTRIES % 10 == 0 )); then
        echo "  Progress: $NEW_ENTRIES/$TOTAL_COMMITS commits processed..."
    fi
    
done <<< "$COMMITS"

echo ""
echo "✅ Converted $NEW_ENTRIES entries"
echo ""

echo "💾 Writing complete"
echo ""

# Calculate file size
LEDGER_SIZE=$(du -h "$LEDGER_PATH" | cut -f1)

echo "📊 Seeding complete!"
echo "  - Total commits: $TOTAL_COMMITS"
echo "  - New entries: $NEW_ENTRIES"
echo "  - Duplicates skipped: $SKIPPED"
echo "  - Ledger size: $LEDGER_SIZE"
echo "  - Ledger path: $LEDGER_PATH"
echo ""

echo "🎉 Seeding successful!"
echo ""
echo "🚀 Next step: Trigger a cognitive cycle to analyze patterns"
echo "   Cmd+Shift+P → Reload Window"
echo ""

