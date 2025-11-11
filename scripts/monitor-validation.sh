#!/bin/bash
# Production Validation Monitoring Script
# Monitors RL4 system metrics for Phase E2 validation

WORKSPACE="/Users/valentingaludec/Reasoning Layer V3"
cd "$WORKSPACE"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       RL4 Production Validation Monitor - Phase E2            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current cycle
CURRENT_CYCLE=$(tail -1 .reasoning_rl4/ledger/cycles.jsonl 2>/dev/null | jq -r '.cycleId // 0')
NEXT_FEEDBACK=$(( ($CURRENT_CYCLE / 100 + 1) * 100 ))
CYCLES_UNTIL_FEEDBACK=$(( $NEXT_FEEDBACK - $CURRENT_CYCLE ))

echo -e "${BLUE}📊 Cycle Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Current Cycle:        $CURRENT_CYCLE"
echo "  Next Feedback Loop:   $NEXT_FEEDBACK"
echo "  Cycles Remaining:     $CYCLES_UNTIL_FEEDBACK (~$(( $CYCLES_UNTIL_FEEDBACK * 10 / 60 )) min)"
echo ""

# Check ADRs
ADR_COUNT=$(ls -1 .reasoning_rl4/adrs/auto/*.json 2>/dev/null | grep -v proposals.index.json | wc -l | tr -d ' ')
echo -e "${BLUE}📁 ADR Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total ADR files:      $ADR_COUNT"
if [ $ADR_COUNT -eq 3 ]; then
    echo -e "  Duplication Check:    ${GREEN}✅ PASS${NC} (no new duplicates)"
elif [ $ADR_COUNT -lt 6 ]; then
    echo -e "  Duplication Check:    ${YELLOW}⚠️  WATCH${NC} (slight increase)"
else
    echo -e "  Duplication Check:    ${RED}❌ FAIL${NC} (duplicates detected)"
fi
echo ""

# Check forecasts
FORECAST_COUNT=$(cat .reasoning_rl4/forecasts.json 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
FORECAST_HIGH_CONF=$(cat .reasoning_rl4/forecasts.json 2>/dev/null | jq '[.[] | select(.confidence >= 0.70)] | length' 2>/dev/null || echo "0")
echo -e "${BLUE}🔮 Forecast Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total Forecasts:      $FORECAST_COUNT"
echo "  High Confidence:      $FORECAST_HIGH_CONF (≥ 0.70)"
if [ $FORECAST_HIGH_CONF -gt 0 ]; then
    echo -e "  Threshold Check:      ${GREEN}✅ PASS${NC} (forecasts at 0.70+)"
else
    echo -e "  Threshold Check:      ${RED}❌ FAIL${NC} (no forecasts ≥ 0.70)"
fi
echo ""

# Check feedback report (if exists)
if [ -f .reasoning_rl4/feedback_report.json ]; then
    echo -e "${BLUE}📈 Feedback Metrics (Last Update)${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    GENERATED_AT=$(cat .reasoning_rl4/feedback_report.json | jq -r '.generated_at')
    CYCLES_ANALYZED=$(cat .reasoning_rl4/feedback_report.json | jq -r '.cycles_analyzed')
    FORECAST_ACC=$(cat .reasoning_rl4/feedback_report.json | jq -r '.metrics.forecast_accuracy * 100 | round')
    ADR_ADOPTION=$(cat .reasoning_rl4/feedback_report.json | jq -r '.metrics.adr_adoption_rate * 100 | round')
    COMPOSITE=$(cat .reasoning_rl4/feedback_report.json | jq -r '.composite_feedback * 100 | round')
    INTERPRETATION=$(cat .reasoning_rl4/feedback_report.json | jq -r '.interpretation')
    
    echo "  Generated At:         $GENERATED_AT"
    echo "  Cycles Analyzed:      $CYCLES_ANALYZED"
    echo "  Forecast Accuracy:    ${FORECAST_ACC}%"
    
    if [ "$ADR_ADOPTION" -ge 15 ]; then
        echo -e "  ADR Adoption Rate:    ${GREEN}${ADR_ADOPTION}%${NC} (✅ TARGET)"
    elif [ "$ADR_ADOPTION" -ge 10 ]; then
        echo -e "  ADR Adoption Rate:    ${YELLOW}${ADR_ADOPTION}%${NC} (⚠️  MINIMUM)"
    else
        echo -e "  ADR Adoption Rate:    ${RED}${ADR_ADOPTION}%${NC} (❌ BELOW TARGET)"
    fi
    
    if [ "$COMPOSITE" -ge 50 ]; then
        echo -e "  Composite Feedback:   ${GREEN}${COMPOSITE}%${NC} (✅ TARGET)"
    elif [ "$COMPOSITE" -ge 45 ]; then
        echo -e "  Composite Feedback:   ${YELLOW}${COMPOSITE}%${NC} (⚠️  MINIMUM)"
    else
        echo -e "  Composite Feedback:   ${RED}${COMPOSITE}%${NC} (❌ BELOW TARGET)"
    fi
    
    echo "  Interpretation:       $INTERPRETATION"
else
    echo -e "${YELLOW}⚠️  No feedback report available yet (wait for cycle 100)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔄 Next Steps${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $CYCLES_UNTIL_FEEDBACK -gt 0 ]; then
    echo "  Wait for cycle $NEXT_FEEDBACK to see real feedback metrics"
    echo "  Run this script again in ~$(( $CYCLES_UNTIL_FEEDBACK * 10 / 60 )) minutes"
else
    echo "  Feedback loop should run soon!"
    echo "  Check Output Channel for logs: 🔁 [Phase E2.2]"
fi

echo ""
echo "💡 Tip: Run 'bash scripts/monitor-validation.sh' to update status"
echo ""

