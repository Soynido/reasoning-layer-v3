#!/bin/bash

# 🎯 WEBVIEW Data Validation Script
# Vérifie que toutes les données nécessaires sont présentes et à jour

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RL4_DIR="$WORKSPACE_ROOT/.reasoning_rl4"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🎯 WEBVIEW DATA VALIDATION                                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check_file() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo -e "${GREEN}✅${NC} $name exists ($size)"
        ((PASS++))
        return 0
    else
        echo -e "${RED}❌${NC} $name MISSING"
        ((FAIL++))
        return 1
    fi
}

check_json_valid() {
    local file=$1
    local name=$2
    
    if command -v jq &> /dev/null; then
        if jq '.' "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $name is valid JSON"
            ((PASS++))
            return 0
        else
            echo -e "${RED}❌${NC} $name is INVALID JSON"
            ((FAIL++))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️${NC}  $name - jq not installed, skipping validation"
        ((WARN++))
        return 0
    fi
}

check_freshness() {
    local file=$1
    local name=$2
    local max_minutes=$3
    
    if [ -f "$file" ]; then
        if command -v stat &> /dev/null; then
            # macOS stat
            if stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" > /dev/null 2>&1; then
                mod_time=$(stat -f "%m" "$file")
                current_time=$(date +%s)
                diff_minutes=$(( (current_time - mod_time) / 60 ))
                
                if [ $diff_minutes -lt $max_minutes ]; then
                    echo -e "${GREEN}✅${NC} $name is fresh ($diff_minutes min ago)"
                    ((PASS++))
                else
                    echo -e "${YELLOW}⚠️${NC}  $name is stale ($diff_minutes min ago, expected < $max_minutes min)"
                    ((WARN++))
                fi
            fi
        fi
    fi
}

echo "📊 Checking JSON snapshots..."
echo ""

check_file "$RL4_DIR/patterns.json" "patterns.json"
check_json_valid "$RL4_DIR/patterns.json" "patterns.json"
check_freshness "$RL4_DIR/patterns.json" "patterns.json" 60

echo ""

check_file "$RL4_DIR/correlations.json" "correlations.json"
check_json_valid "$RL4_DIR/correlations.json" "correlations.json"
check_freshness "$RL4_DIR/correlations.json" "correlations.json" 60

echo ""

check_file "$RL4_DIR/forecasts.json" "forecasts.json"
check_json_valid "$RL4_DIR/forecasts.json" "forecasts.json"
check_freshness "$RL4_DIR/forecasts.json" "forecasts.json" 60

echo ""
echo "📁 Checking ledgers..."
echo ""

check_file "$RL4_DIR/ledger/cycles.jsonl" "cycles.jsonl"
if [ -f "$RL4_DIR/ledger/cycles.jsonl" ]; then
    count=$(wc -l < "$RL4_DIR/ledger/cycles.jsonl")
    echo -e "${GREEN}✅${NC} cycles.jsonl has $count entries"
    ((PASS++))
fi

echo ""

check_file "$RL4_DIR/ledger/rbom_ledger.jsonl" "rbom_ledger.jsonl"
if [ -f "$RL4_DIR/ledger/rbom_ledger.jsonl" ]; then
    count=$(wc -l < "$RL4_DIR/ledger/rbom_ledger.jsonl")
    echo -e "${GREEN}✅${NC} rbom_ledger.jsonl has $count entries"
    ((PASS++))
fi

echo ""
echo "📋 Checking traces..."
echo ""

check_file "$RL4_DIR/traces/git_commits.jsonl" "git_commits.jsonl"
if [ -f "$RL4_DIR/traces/git_commits.jsonl" ]; then
    count=$(wc -l < "$RL4_DIR/traces/git_commits.jsonl")
    echo -e "${GREEN}✅${NC} git_commits.jsonl has $count entries"
    ((PASS++))
fi

echo ""

check_file "$RL4_DIR/traces/file_changes.jsonl" "file_changes.jsonl"
if [ -f "$RL4_DIR/traces/file_changes.jsonl" ]; then
    count=$(wc -l < "$RL4_DIR/traces/file_changes.jsonl")
    echo -e "${GREEN}✅${NC} file_changes.jsonl has $count entries"
    ((PASS++))
fi

echo ""
echo "📝 Checking ADRs..."
echo ""

check_file "$RL4_DIR/adrs/auto/proposals.index.json" "proposals.index.json"
if [ -d "$RL4_DIR/adrs/auto" ]; then
    adr_count=$(find "$RL4_DIR/adrs/auto" -name "adr-*.json" | wc -l)
    echo -e "${GREEN}✅${NC} Found $adr_count ADRs in adrs/auto/"
    ((PASS++))
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  📊 VALIDATION SUMMARY                                           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}✅ PASS:${NC} $PASS"
echo -e "  ${YELLOW}⚠️  WARN:${NC} $WARN"
echo -e "  ${RED}❌ FAIL:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - WEBVIEW DATA READY!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED - REVIEW ERRORS ABOVE${NC}"
    exit 1
fi

