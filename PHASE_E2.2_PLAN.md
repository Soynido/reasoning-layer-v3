# 🔧 Phase E2.2 — Integration Plan

**Version** : RL4 Kernel v2.0.5 → v2.0.6  
**Status** : 📋 PLANNED  
**Prerequisites** : Phase E2.1 Complete ✅  
**Duration Estimate** : 2-3 days

---

## 🎯 Objectif Phase E2.2

**Intégrer FeedbackEvaluator dans CognitiveScheduler** pour remplacer le feedback simulé par des métriques réelles calculées à partir des données du système.

### Avant (Phase E1-E2.1)
```typescript
// Simulated feedback with noise
const simulatedFeedback = Math.random() * 0.2 + 0.7;
this.forecastEngine.updateBaseline(simulatedFeedback);
```

### Après (Phase E2.2)
```typescript
// Real feedback from FeedbackEvaluator
const evaluator = new FeedbackEvaluator(this.workspaceRoot);
const metrics = await evaluator.computeComprehensiveFeedback();
const realFeedback = metrics.forecast_accuracy; // Primary metric
this.forecastEngine.updateBaseline(realFeedback);
```

---

## 📋 Prerequisites Checklist

### Phase E2.1 Complete ✅
- [x] FeedbackEvaluator.ts created (369 lines)
- [x] extract-feedback-metrics.ts functional (292 lines)
- [x] Fail-safes implemented (lock-file + atomic write)
- [x] Documentation complete (946 lines)
- [x] Compilation: 0 errors
- [x] Tested on 4,312 real cycles

### Validation ✅
- [x] Tag v2.0.5-stable created
- [x] Snapshot archived: `rl4-kernel-baseline-v205.tar.gz`
- [ ] Endurance test: 1,000 cycles (pending)
- [ ] Drift validation: < ±0.05 (pending)

---

## 🔧 Implementation Steps

### Step 1: Import FeedbackEvaluator (5 minutes)

**File** : `extension/kernel/CognitiveScheduler.ts`

```typescript
import { FeedbackEvaluator } from './cognitive/FeedbackEvaluator';

export class CognitiveScheduler {
    private forecastEngine: ForecastEngine;
    private feedbackEvaluator: FeedbackEvaluator; // ← NEW
    
    constructor(
        workspaceRoot: string,
        private timerRegistry: TimerRegistry,
        logger?: any,
        bootstrapMetrics?: ForecastMetrics
    ) {
        this.workspaceRoot = workspaceRoot;
        this.ledger = new RBOMLedger(workspaceRoot);
        this.logger = logger;
        
        this.forecastEngine = new ForecastEngine(workspaceRoot, bootstrapMetrics);
        this.feedbackEvaluator = new FeedbackEvaluator(workspaceRoot); // ← NEW
        
        setGlobalLedger(this.ledger);
    }
}
```

### Step 2: Replace Simulated Feedback (10 minutes)

**File** : `extension/kernel/CognitiveScheduler.ts`

**Modifier `applyFeedbackLoop()`** :

```typescript
private async applyFeedbackLoop(cycleId: number): Promise<void> {
    this.log(`🔁 [Phase E2.2] Applying real feedback loop at cycle ${cycleId}`);
    
    try {
        // E2.2: Compute real metrics from FeedbackEvaluator
        const metrics = await this.feedbackEvaluator.computeComprehensiveFeedback();
        
        // Use composite feedback (weighted average of 4 metrics)
        const realFeedback = metrics.forecast_accuracy; // Primary metric
        
        this.log(`📊 [E2.2] Metrics computed:`);
        this.log(`   • Forecast Accuracy:  ${(metrics.forecast_accuracy * 100).toFixed(1)}%`);
        this.log(`   • Pattern Stability:  ${(metrics.pattern_stability * 100).toFixed(1)}%`);
        this.log(`   • ADR Adoption Rate:  ${(metrics.adr_adoption_rate * 100).toFixed(1)}%`);
        this.log(`   • Cycle Efficiency:   ${(metrics.cycle_efficiency * 100).toFixed(1)}%`);
        
        // Update baseline with real feedback
        const prevPrecision = this.forecastEngine.metrics.forecast_precision;
        this.forecastEngine.updateBaseline(realFeedback);
        const newPrecision = this.forecastEngine.metrics.forecast_precision;
        
        // Persist updated metrics + evaluation details
        const updatedMetrics = this.forecastEngine.getMetrics();
        await KernelBootstrap.saveState(
            {
                version: '2.0.6',
                cycle: cycleId,
                updated_at: new Date().toISOString(),
                forecast_metrics: updatedMetrics,
                evaluation_metrics: metrics,  // ← NEW: Full evaluation
                feedback_history: {
                    prev_precision: prevPrecision,
                    new_precision: newPrecision,
                    delta: newPrecision - prevPrecision
                }
            },
            this.workspaceRoot
        );
        
        this.log(`💾 [E2.2] Real metrics persisted: precision ${newPrecision.toFixed(3)}`);
        
    } catch (error) {
        this.log(`❌ [E2.2] Feedback loop failed: ${error}`);
    }
}
```

### Step 3: Add Validation Logs (5 minutes)

**Add detailed logging for monitoring** :

```typescript
// In runCycle(), after feedback loop
if (result.cycleId % 100 === 0 && result.cycleId > 0) {
    this.log('');
    this.log('═══════════════════════════════════════');
    this.log(`🔍 Checkpoint: Cycle ${result.cycleId}`);
    this.log(`📊 Baseline: ${this.forecastEngine.metrics.forecast_precision.toFixed(3)}`);
    this.log(`📈 Improvement Rate: ${this.forecastEngine.metrics.improvement_rate.toFixed(4)}`);
    this.log(`📦 Total Forecasts: ${this.forecastEngine.metrics.total_forecasts}`);
    this.log('═══════════════════════════════════════');
    this.log('');
}
```

### Step 4: Test Integration (30 minutes)

```bash
# 1. Rebuild extension
npm run compile

# 2. Reload VS Code
# Cmd+Shift+P → Developer: Reload Window

# 3. Wait for cycle 100
# Check Output Channel for new logs:
#   [HH:MM:SS] 🔁 [Phase E2.2] Applying real feedback loop at cycle 100
#   [HH:MM:SS] 📊 [E2.2] Metrics computed:
#   [HH:MM:SS]    • Forecast Accuracy:  50.0%
#   [HH:MM:SS]    • Pattern Stability:  100.0%
#   [HH:MM:SS]    • ADR Adoption Rate:  50.0%
#   [HH:MM:SS]    • Cycle Efficiency:   100.0%
#   [HH:MM:SS] 📈 Feedback applied: precision 0.730 → 0.715 (Δ -0.015)
#   [HH:MM:SS] 💾 [E2.2] Real metrics persisted: precision 0.715

# 4. Verify state saved
gunzip -c .reasoning_rl4/kernel/state.json.gz | jq '.feedback_history'
```

### Step 5: Run Endurance Test (2.8 hours)

```bash
# Start test (runs in background)
./scripts/endurance-test-1000.sh

# Monitor progress
tail -f .reasoning_rl4/diagnostics/endurance_test.log
```

**Expected output** :
```
[2025-11-10 12:30:00] Cycles: 100/1,000 | Composite: 0.70 | Baseline: 0.715 | Δ: -0.015
[2025-11-10 12:46:40] Cycles: 200/1,000 | Composite: 0.70 | Baseline: 0.713 | Δ: -0.017
[2025-11-10 13:03:20] Cycles: 300/1,000 | Composite: 0.70 | Baseline: 0.714 | Δ: -0.016
...
[2025-11-10 15:10:00] Cycles: 1,000/1,000 | Composite: 0.70 | Baseline: 0.716 | Δ: -0.014

✅ Target reached: 1,000 cycles completed
```

---

## 🧪 Validation Criteria

### Baseline Drift ✅
- **Target** : < ±0.05 over 1,000 cycles
- **Formula** : `|final_baseline - initial_baseline| < 0.05`
- **Expected** : ~0.01-0.02 variance (EMA smoothing)

### Lock-File Mechanism ✅
- **Target** : 0 lock-file errors
- **Check** : No "write in progress" warnings in logs
- **Verify** : No `.state.lock` files left after cycles

### Feedback Evolution ✅
- **Target** : Composite feedback stable around 70%
- **Check** : feedback_report.json updates every 100 cycles
- **Verify** : Delta remains within ±5%

### Zero Crashes ✅
- **Target** : 0 crashes over 1,000 cycles
- **Check** : health.jsonl has 0 alerts
- **Verify** : Extension remains active for full duration

---

## 📊 Expected Outcomes

### If Successful (Target)
```
✅ 1,000 cycles completed
✅ Baseline drift: < ±0.05
✅ Lock-file: 0 errors
✅ Composite feedback: 70% ± 5%
✅ Zero crashes
✅ Auto-persistence: 10 state saves
```

### If Drift Detected (> ±0.05)
```
⚠️ Baseline drifting: Adjust α
   Current α: 0.1
   Recommended: 0.05 (more conservative)
   
Action: Lower α to reduce sensitivity to noise
```

### If Crashes Occur
```
🔴 System unstable: Debug required
   Check: health.jsonl for alerts
   Check: Output Channel for errors
   
Action: Fix crash before proceeding to E2.3
```

---

## 🚀 Post-E2.2 Actions

### If Validation Successful
1. **Tag v2.0.6-stable** :
   ```bash
   git tag -a v2.0.6-stable -m "Phase E2.2: Real metrics integration"
   ```

2. **Create PHASE_E2.2_COMPLETE.md** with:
   - Endurance test results
   - Baseline drift analysis
   - Lock-file validation
   - Crash report (should be 0)

3. **Update TASKS_RL4.md** :
   - Mark E2.2 as complete
   - Add E2.3 tasks (α dynamique)

### If Issues Found
1. **Debug and fix** issues
2. **Rerun endurance test**
3. **Document in ISSUES_E2.2.md**

---

## 📈 Metrics to Track

| Metric | Formula | Target | Purpose |
|--------|---------|--------|---------|
| **Baseline Drift** | `\|final - initial\|` | < 0.05 | Stability validation |
| **Avg Cycle Time** | `elapsed / cycles` | ~10s | Efficiency check |
| **Lock Errors** | Count warnings | 0 | Concurrency safety |
| **Crash Rate** | Alerts / cycles | 0% | Reliability check |
| **Composite Delta** | `composite - baseline` | ±5% | Feedback quality |

---

## 🔗 Related Files

### Implementation
- `extension/kernel/CognitiveScheduler.ts` — To modify
- `extension/kernel/cognitive/FeedbackEvaluator.ts` — Already created ✅
- `extension/kernel/cognitive/ForecastEngine.ts` — Already updated ✅

### Scripts
- `scripts/endurance-test-1000.sh` — Test automation
- `scripts/extract-feedback-metrics.ts` — Metrics extraction

### Documentation
- `PHASE_E2.1_COMPLETE.md` — Fondations
- `PHASE_E2.2_PLAN.md` — Ce document
- `PHASE_E2_ROADMAP.md` — Vue d'ensemble

---

## 💡 Success Indicators

### Code Integration
- [ ] FeedbackEvaluator imported in CognitiveScheduler
- [ ] applyFeedbackLoop() uses real metrics
- [ ] Detailed logs added for 4 metrics
- [ ] Compilation: 0 errors

### Testing
- [ ] Endurance test: 1,000 cycles
- [ ] Baseline drift: < ±0.05
- [ ] Lock-file: 0 errors
- [ ] Crashes: 0

### Documentation
- [ ] PHASE_E2.2_COMPLETE.md created
- [ ] TASKS_RL4.md updated
- [ ] Endurance test results documented

---

## 🎯 Timeline

### Day 1 (2025-11-11)
- **Morning** : Integrate FeedbackEvaluator (Steps 1-3)
- **Afternoon** : Test integration (Step 4)
- **Evening** : Start endurance test (Step 5)

### Day 2 (2025-11-12)
- **Morning** : Endurance test completes (~10:00)
- **Afternoon** : Analyze results, document findings
- **Evening** : Tag v2.0.6-stable if successful

### Day 3 (2025-11-13) — Buffer
- **If issues** : Debug and retest
- **If success** : Start Phase E2.3 (α dynamique)

---

## 📞 User Actions Required

### Before Starting E2.2

1. ✅ **Tag created** : `v2.0.5-stable`
2. ✅ **Snapshot archived** : `rl4-kernel-baseline-v205.tar.gz`
3. ⏳ **Endurance test** : Launch when ready
4. ⏳ **Integration** : Implement Steps 1-4

### To Launch Endurance Test

```bash
# Ensure VS Code extension is running
# Then in terminal:
cd "/Users/valentingaludec/Reasoning Layer V3"
./scripts/endurance-test-1000.sh

# Monitor in another terminal:
tail -f .reasoning_rl4/diagnostics/endurance_test.log
```

**Duration** : ~2.8 hours (10s/cycle × 1,000 cycles)

### To Check Results

```bash
# After test completes:
cat .reasoning_rl4/diagnostics/endurance_test.log | tail -20

# Check final baseline:
gunzip -c .reasoning_rl4/kernel/state.json.gz | jq '.forecast_metrics.forecast_precision'

# Check drift:
# Compare with initial: 0.730
# Acceptable range: 0.680 - 0.780
```

---

## 🎯 Success Criteria

### Must Have ✅
- [ ] FeedbackEvaluator integrated in scheduler
- [ ] Real metrics replace simulated feedback
- [ ] Compilation: 0 errors
- [ ] Endurance test: 1,000 cycles complete
- [ ] Baseline drift: < ±0.05
- [ ] Zero crashes

### Nice to Have ⭐
- [ ] Detailed logs showing 4 metrics
- [ ] feedback_report.json updated every 100 cycles
- [ ] Charts generated (precision over time)
- [ ] PHASE_E2.2_COMPLETE.md documented

---

## 🔮 What Comes After E2.2

### Phase E2.3 : α Dynamique (2-3 days)
```typescript
// Adapt α based on feedback variance
const recentFeedbacks = this.getRecentFeedbacks(10);
const variance = this.calculateVariance(recentFeedbacks);
const α = variance > 0.05 ? 0.05 : 0.1;
```

### Phase E2.4 : Forecast Validation (3-5 days)
```typescript
// Compare predictions with reality
const validator = new ForecastValidator(this.workspaceRoot);
const accuracy = await validator.validateForecasts(100);
```

### Phase E2.5 : Longitudinal Charts (2-3 days)
```bash
# Generate precision evolution chart
node scripts/generate-charts.ts --cycles 1000 --output precision_evolution.png
```

---

## 📚 Documentation to Create

### During E2.2
1. **PHASE_E2.2_IMPLEMENTATION.md** — Technical details
2. **ENDURANCE_TEST_RESULTS.md** — Test validation report

### After E2.2 Success
3. **PHASE_E2.2_COMPLETE.md** — Completion report
4. **Update CHANGELOG.md** — v2.0.6 entry
5. **Update TASKS_RL4.md** — Mark E2.2 complete

---

## ⚠️ Risk Mitigation

### Risk 1: Insufficient Data
**Problem** : 0 forecasts/ADRs currently  
**Mitigation** : Metrics use cycles data (pattern stability, efficiency) which are already at 100%  
**Action** : Continue accumulating data, full feedback accuracy will improve over time

### Risk 2: Baseline Drift
**Problem** : Real feedback might cause unstable baseline  
**Mitigation** : EMA smoothing (α=0.1) prevents abrupt changes  
**Action** : Monitor drift during endurance test, adjust α if needed

### Risk 3: Lock-File Issues
**Problem** : Concurrent writes could corrupt state  
**Mitigation** : Lock-file + atomic write already implemented  
**Action** : Verify 0 lock errors during endurance test

---

**✅ Phase E2.2 Plan Complete!**

*Ready to integrate FeedbackEvaluator and launch endurance test.*

---

**Author** : Valentin Galudec  
**Date** : 2025-11-10  
**Version** : RL4 Kernel v2.0.5 → v2.0.6 (Phase E2.2 Planned)

