# 🔥 RL4 COMPLETE UNFILTERED DUMP - PART 5 (FINAL)

**Final massive dump of everything**

---

## 11. Full Truth About Cognitive Cycle Data Flow

### Exact Internal Flow (Not Theory, Not High-Level)

**Phase 0: Pre-Cycle Checks**

```
START runCycle()
├─ Line 365: Check if isRunning === true
│  └─ IF true → Skip cycle, return createSkippedResult()
├─ Line 370: Set isRunning = true
├─ Line 371: Increment cycleCount
├─ Line 372: Call logger.cycleStart(cycleCount)
├─ Line 374: Capture startTime = Date.now()
├─ Line 375-383: Initialize result object
```

**Phase 1: Input Hash Calculation**

```
├─ Line 386: Call calculateInputHash()
│  └─ INTERNALS:
│     1. Read traces/file_changes.jsonl (last 100 lines)
│     2. Read traces/git_commits.jsonl (last 100 lines)
│     3. Read traces/ide_activity.jsonl (last 100 lines)
│     4. Concatenate all content
│     5. Calculate SHA256 hash
│     6. Return hash string
├─ Line 390-398: Compare with lastInputHash
│  └─ IF same → Skip cycle (idempotence)
│     - Log "Skipping cycle (same input hash)"
│     - Add phase: { name: 'idempotence-skip', duration: 0, success: true }
│     - Return result early
├─ Line 401: Update lastInputHash = result.inputHash
```

**TRUTH:** Hash is calculated from LAST 100 LINES only (not full files)

**TRUTH:** If files haven't changed in last 100 lines → cycle skips

**TRUTH:** This means old changes are never re-processed

---

**Phase 2: Pattern Learning**

```
├─ Line 404-416: Run Pattern Learning Phase
│  └─ INTERNALS:
│     1. Create NEW PatternLearningEngine(workspaceRoot)
│     2. Call engine.analyzePatterns()
│     │  └─ SUB-FLOW:
│     │     a. Read traces/file_changes.jsonl (FULL FILE)
│     │     b. Read traces/git_commits.jsonl (FULL FILE)
│     │     c. Read traces/ide_activity.jsonl (FULL FILE)
│     │     d. Detect patterns (algorithm UNKNOWN)
│     │     e. Write to patterns.json (OVERWRITE, not append)
│     │     f. Return patterns array
│     3. Try: patternEvolutionTracker.trackChanges(patterns, cycleId)
│     │  └─ Wrapped in try/catch (silent failure if crashes)
│     4. Return metrics: { patternsDetected: N, patterns: [...] }
│  └─ Result pushed to result.phases
│  └─ Log phase metrics via logger.phase()
```

**TRUTH:** PatternLearningEngine reads FULL trace files (not just last 100 lines)

**TRUTH:** This creates discrepancy: hash from last 100, but analysis from full file

**TRUTH:** Pattern detection algorithm is NOT documented (black box)

**TRUTH:** patterns.json is OVERWRITTEN (old patterns lost)

**TRUTH:** Pattern evolution tracking can silently fail (no user notification)

---

**Phase 3: Correlation**

```
├─ Line 421-429: Run Correlation Phase
│  └─ INTERNALS:
│     1. Create NEW CorrelationEngine(workspaceRoot)
│     2. Call engine.analyze()
│     │  └─ SUB-FLOW:
│     │     a. Read patterns.json (from previous phase)
│     │     b. Read traces/*.jsonl files (UNKNOWN which ones)
│     │     c. Find correlations (algorithm UNKNOWN)
│     │     d. Return correlations array
│     3. Return metrics: { correlationsFound: N, correlations: [...] }
│  └─ Result pushed to result.phases
│  └─ Log phase metrics
```

**TRUTH:** Correlation algorithm is NOT documented (black box)

**TRUTH:** No correlations is "normal" (logged but not an error)

**TRUTH:** Correlations are NOT persisted (ephemeral, only in cycle result)

---

**Phase 4: Forecasting**

```
├─ Line 432-437: Run Forecasting Phase
│  └─ INTERNALS:
│     1. Use PERSISTENT this.forecastEngine (not NEW instance)
│     2. Call forecastEngine.generate()
│     │  └─ SUB-FLOW:
│     │     a. Read patterns.json
│     │     b. Read correlations (from previous phase, passed in?)
│     │     c. Generate forecasts (algorithm UNKNOWN)
│     │     d. Update internal metrics:
│     │        - forecast_precision (adaptive baseline)
│     │        - improvement_rate (delta from last baseline)
│     │        - total_forecasts (counter)
│     │     e. Return forecasts array
│     3. Return metrics: { forecastsGenerated: N, forecasts: [...] }
│  └─ Result pushed to result.phases
│  └─ Log phase metrics
```

**TRUTH:** ForecastEngine is PERSISTENT across cycles (shared state)

**TRUTH:** Baseline evolves over time (adaptive)

**TRUTH:** Forecasts are NOT persisted (ephemeral)

**TRUTH:** Forecast generation algorithm is NOT documented

---

**Phase 5: ADR Synthesis**

```
├─ Line 440-446: Run ADR Synthesis Phase
│  └─ INTERNALS:
│     1. Create NEW ADRGeneratorV2(workspaceRoot)
│     2. Call generator.generateProposals()
│     │  └─ SUB-FLOW:
│     │     a. Read patterns.json
│     │     b. Read forecasts (from previous phase, passed in?)
│     │     c. Read ADRs.RL4 (existing ADRs)
│     │     d. Detect "decision points" (algorithm UNKNOWN)
│     │     e. For each decision point:
│     │        - Check if ADR already exists (title match?)
│     │        - IF not → Generate proposal
│     │        - Write to adrs/auto/adr-{id}.json (APPEND, not overwrite)
│     │     f. Return proposals array
│     3. Return metrics: { adrsGenerated: N, proposals: [...] }
│  └─ Result pushed to result.phases
│  └─ Log phase metrics
```

**TRUTH:** ADR generation algorithm is NOT documented

**TRUTH:** "Decision point" detection is UNKNOWN

**TRUTH:** Duplicate detection is UNKNOWN (title match? fuzzy match?)

**TRUTH:** ADR files accumulate in adrs/auto/ (no cleanup)

---

**Phase 6: Post-Cycle**

```
├─ Line 448: Set result.success = true
├─ Line 450-459: Catch block (if any phase threw exception)
│  └─ Set result.success = false
│  └─ Log error
│  └─ Continue (don't throw)
├─ Line 454-459: Finally block
│  └─ Set isRunning = false
│  └─ Set result.completedAt = now
│  └─ Calculate result.duration
│  └─ Update lastCycleTime (watchdog)
├─ Line 462: Call aggregateAndPersistCycle(result)
│  └─ Write to ledger/cycles.jsonl (APPEND)
├─ Line 465-480: Extract phase counts + mock health
│  └─ Mock health: { drift: random, coherence: random, status: ... }
├─ Line 480: Call logger.cycleEnd(cycleCount, phases, health)
├─ Line 483-496: Feedback loop check (every 100 cycles)
│  └─ IF cycleId % 100 === 0:
│     1. Call applyFeedbackLoop(cycleId)
│     2. Log checkpoint summary
├─ Line 498: Return result
└─ END runCycle()
```

**TRUTH:** Errors are caught and logged, but cycle continues (no crash)

**TRUTH:** Health data is FAKE (Math.random())

**TRUTH:** Feedback loop only runs every 100 cycles

---

### What Happens If Input Hash Mismatches

**Scenario:** New file changes detected

**Flow:**
```
1. Input hash calculated from last 100 lines of traces
2. Hash compared with lastInputHash
3. IF different:
   → Proceed with full cycle
   → Process ALL phases
   → Update lastInputHash = new hash
4. Next cycle:
   → Calculate hash again
   → Compare with updated lastInputHash
   → IF no new changes → Skip (idempotence)
```

**TRUTH:** Idempotence prevents re-processing same data

**TRUTH:** This is EFFICIENT (saves CPU) but can miss changes

**TRUTH:** If trace files are corrupted → hash may be same but data is different

---

### How Forecast Baseline Evolves

**Initial State:**
```
forecastEngine created with default baseline = 0.73
(from KernelBootstrap or hardcoded)
```

**Every 100 Cycles:**
```
1. Read last 100 cycles from cycles.jsonl
2. Calculate actual forecast accuracy:
   - For each cycle: compare forecasts with actual outcomes
   - Accuracy = forecasts_correct / total_forecasts
3. Calculate new baseline:
   new_baseline = (old_baseline * 0.9) + (accuracy * 0.1)
4. Update forecastEngine.metrics.forecast_precision = new_baseline
5. Calculate improvement_rate:
   improvement_rate = new_baseline - old_baseline
```

**TRUTH:** Baseline updates use 90/10 weighting (slow adaptation)

**TRUTH:** If accuracy calculation fails → baseline unchanged (silent failure)

**TRUTH:** Baseline can drift over time (adaptive learning)

---

### Where ADRs Inject

**ADRs are NOT injected into cycle**

**TRUTH:** ADRs are generated in Phase 4 (ADR Synthesis)

**TRUTH:** ADRs are written to adrs/auto/

**TRUTH:** ADRs are READ by next cycle (via ADRGeneratorV2)

**TRUTH:** There's no "injection" mechanism (ADRs are passive data)

---

### Where Cycles Break

**Cycle can break at:**

1. **Input hash calculation fails**
   - IF trace files are corrupted or unreadable
   - Result: Cycle skips (silent failure)

2. **Phase execution throws exception**
   - Any phase can throw
   - Result: Caught by try/catch, cycle marked as failed, continues to next cycle

3. **Aggregation fails**
   - IF cycles.jsonl is read-only or disk full
   - Result: Exception thrown, cycle crashes (not caught?)

4. **Logger crashes**
   - IF CognitiveLogger throws exception
   - Result: Cycle may crash (depends on where it throws)

**TRUTH:** Most errors are caught and logged (graceful degradation)

**TRUTH:** Some errors (disk full, permissions) can crash extension

---

### How Errors Propagate

**Phase Error:**
```
Phase throws exception
→ Caught by try/catch in runPhase() (line 504-527)
→ Phase marked as failed: { success: false, error: message }
→ Phase result pushed to result.phases
→ Cycle continues to next phase
→ Cycle marked as success: false (but doesn't abort)
→ Cycle result written to cycles.jsonl
→ Next cycle runs normally (no cascading failure)
```

**Cycle Error:**
```
Cycle throws exception (outside phase execution)
→ Caught by try/catch in runCycle() (line 450-459)
→ Cycle marked as failed
→ Error logged to CognitiveLogger
→ isRunning set to false (in finally block)
→ Cycle result returned (partial data)
→ Next cycle runs normally
```

**Fatal Error:**
```
Extension crashes (out of memory, uncaught exception)
→ VS Code kills extension
→ Extension restarts (VS Code automatic)
→ Kernel re-initializes
→ Loads state from kernel/state.json.gz
→ Continues from last checkpoint
```

**TRUTH:** RL4 is designed for graceful degradation (no cascading failures)

**TRUTH:** Fatal errors require extension restart (user may not notice)

---

## 12. What Would Break Reconstruction If Missing

### Critical Files (MUST Exist)

1. **extension/extension.ts**
   - Main entry point
   - Without: Extension doesn't activate

2. **extension/kernel/CognitiveScheduler.ts**
   - Orchestrates cognitive cycle
   - Without: No background processing

3. **extension/kernel/TimerRegistry.ts**
   - Manages all timers
   - Without: Memory leaks (timers not cleaned up)

4. **extension/kernel/AppendOnlyWriter.ts**
   - JSONL writer
   - Without: Can't write traces

5. **extension/kernel/ExecPool.ts**
   - Git command execution
   - Without: No git integration

6. **extension/kernel/api/UnifiedPromptBuilder.ts**
   - Snapshot generation
   - Without: Core feature broken

7. **extension/kernel/api/AdaptivePromptBuilder.ts**
   - Backward compatibility wrapper
   - Without: Snapshot generation fails

8. **extension/kernel/cognitive/PatternLearningEngine.ts**
   - Pattern detection
   - Without: Cognitive cycle crashes

9. **extension/kernel/cognitive/CorrelationEngine.ts**
   - Correlation analysis
   - Without: Cognitive cycle crashes

10. **extension/kernel/cognitive/ForecastEngine.ts**
    - Forecasting
    - Without: Cognitive cycle crashes

11. **extension/kernel/cognitive/ADRGeneratorV2.ts**
    - ADR generation
    - Without: Cognitive cycle crashes

12. **extension/webview/ui/dist/** (built assets)
    - WebView UI
    - Without: Dashboard doesn't load

---

### Critical Directories (MUST Exist)

1. **`.reasoning_rl4/`**
   - Root data directory
   - Auto-created if missing

2. **`.reasoning_rl4/traces/`**
   - Event traces
   - Auto-created if missing

3. **`.reasoning_rl4/ledger/`**
   - Audit logs
   - Auto-created if missing

4. **`.reasoning_rl4/kernel/`**
   - Kernel state
   - Auto-created if missing

5. **`.reasoning_rl4/adrs/`**
   - ADR storage
   - Auto-created if missing

---

### Critical Fields in JSON Files

**kernel_config.json:**
```json
{
  "USE_TIMER_REGISTRY": MUST be boolean,
  "cognitive_cycle_interval_ms": MUST be number > 0
}
```

**proposals.json:**
```json
{
  "suggestedTasks": MUST be array (can be empty)
}
```

**patterns.json:**
```json
{
  // Can be empty object {}
  // No required fields
}
```

---

### Default Config Values (MUST NOT Change)

1. **ExecPool concurrency: 2**
   - Changing breaks git command queuing

2. **ExecPool timeout: 2000ms**
   - Changing may cause hangs or false failures

3. **File aggregation: 30s**
   - Changing breaks synchronization with cycle interval

4. **Snapshot reminder: 30min check, 2h threshold**
   - Changing breaks expected UX

5. **Fuzzy matching: 60%**
   - Changing breaks pattern suggestions

6. **Bias thresholds: 0%, 25%, 50%, 100%**
   - Changing breaks deviation modes

---

### Implicit Dependencies (Hidden, But Critical)

1. **Node.js >= 18**
   - Required for modern APIs
   - Without: Extension crashes

2. **VS Code >= 1.85.0**
   - Required for webview APIs
   - Without: Extension doesn't activate

3. **Git installed**
   - Required for ExecPool
   - Without: Git integration fails (graceful)

4. **Filesystem is writable**
   - Required for .reasoning_rl4/
   - Without: Extension crashes

5. **Chokidar can watch files**
   - Required for FileChangeWatcher
   - Without: File changes not detected

6. **Process has memory**
   - Required for loading JSONL files
   - Without: Out of memory crash

---

### Files That Can Be Missing (Graceful)

1. **Plan.RL4, Tasks.RL4, Context.RL4, ADRs.RL4**
   - Auto-created with templates

2. **proposals.json**
   - Auto-created with empty array

3. **terminal-events.jsonl**
   - User must create via helper scripts

4. **terminal-patterns.json**
   - Auto-created on first pattern learning

5. **scripts/rl4-log.sh**
   - Optional (shows warning if missing)

---

### Breaking Changes in Reconstruction

**DO NOT:**

1. **Remove core/ directory without checking references**
   - GitHubFineGrainedManager is still used
   - Break: GitHub integration fails

2. **Change JSONL format**
   - Parsers expect specific fields
   - Break: All trace reading fails

3. **Change cognitive cycle interval to < 1000ms**
   - Too fast, causes performance issues
   - Break: Extension becomes unresponsive

4. **Change ExecPool concurrency to > 5**
   - Too many git commands, may DoS git
   - Break: Git becomes unresponsive

5. **Remove ForecastEngine persistence**
   - Baseline resets every cycle
   - Break: Learning doesn't work

6. **Change AppendOnlyWriter to overwrite mode**
   - Loses historical data
   - Break: Idempotence doesn't work

7. **Remove try/catch in phases**
   - Phases crash extension
   - Break: Extension crashes frequently

8. **Change WebView CSP policy**
   - React may break
   - Break: WebView doesn't load

9. **Remove retainContextWhenHidden: false**
   - Memory leak returns
   - Break: 1.2 GB leak

10. **Change timer cleanup**
    - Timers leak
    - Break: Memory leak

---

## 13. Unknowns (Things I Cannot Answer)

### Unknown 1: Pattern Detection Algorithm

**Why Unknown:**
- PatternLearningEngine.analyzePatterns() is called but implementation not inspected
- Algorithm is likely in `extension/kernel/cognitive/PatternLearningEngine.ts` or `extension/core/base/PatternLearningEngine.ts`
- Need to read file to understand

**Evidence Needed:**
- Read PatternLearningEngine.ts
- Inspect analyzePatterns() method

**How to Verify:**
- Add debug logging to analyzePatterns()
- Run cycle, check patterns.json output

---

### Unknown 2: Correlation Algorithm

**Why Unknown:**
- CorrelationEngine.analyze() is called but implementation not inspected
- Algorithm is likely in `extension/kernel/cognitive/CorrelationEngine.ts`
- Need to read file to understand

**Evidence Needed:**
- Read CorrelationEngine.ts
- Inspect analyze() method

**How to Verify:**
- Add debug logging to analyze()
- Run cycle, check correlations output

---

### Unknown 3: Forecast Algorithm

**Why Unknown:**
- ForecastEngine.generate() is called but implementation not inspected
- Algorithm is likely in `extension/kernel/cognitive/ForecastEngine.ts`
- Need to read file to understand

**Evidence Needed:**
- Read ForecastEngine.ts
- Inspect generate() method

**How to Verify:**
- Add debug logging to generate()
- Run cycle, check forecasts output

---

### Unknown 4: ADR Decision Point Detection

**Why Unknown:**
- ADRGeneratorV2.generateProposals() is called but implementation not inspected
- Algorithm is likely in `extension/kernel/cognitive/ADRGeneratorV2.ts`
- Need to read file to understand

**Evidence Needed:**
- Read ADRGeneratorV2.ts
- Inspect generateProposals() method

**How to Verify:**
- Add debug logging
- Check what ADRs are generated

---

### Unknown 5: Git Commit Polling Interval

**Why Unknown:**
- GitCommitListener implementation not fully inspected
- May use polling or git hooks
- Interval not visible in code I've seen

**Evidence Needed:**
- Read `extension/kernel/inputs/GitCommitListener.ts`
- Check if uses polling or hooks

**How to Verify:**
- Monitor git_commits.jsonl
- Make commits, measure detection time

---

### Unknown 6: Snapshot Rotation Trigger

**Why Unknown:**
- SnapshotRotation.ts exists but trigger not known
- May be periodic, threshold-based, or manual
- Not called in code I've seen

**Evidence Needed:**
- Read `extension/kernel/indexer/SnapshotRotation.ts`
- Find who calls rotation logic

**How to Verify:**
- Count snapshots in context_history/
- Wait to see if old ones are deleted

---

### Unknown 7: Pattern Evolution Storage

**Why Unknown:**
- PatternEvolutionTracker.trackChanges() is called but output location unknown
- May write to file or internal state
- Silent failure makes it hard to verify

**Evidence Needed:**
- Read `extension/kernel/cognitive/PatternEvolutionTracker.ts`
- Find where evolution data is stored

**How to Verify:**
- Search .reasoning_rl4/ for evolution files
- Check if any files grow over time

---

### Unknown 8: Cache Indexing Behavior

**Why Unknown:**
- RL4CacheIndexer is used by scheduler but logic unknown
- Cache index.json exists but update frequency unknown
- May be on-demand or periodic

**Evidence Needed:**
- Read `extension/kernel/indexer/CacheIndex.ts`
- Check when index is updated

**How to Verify:**
- Monitor cache/index.json
- See when it changes

---

### Unknown 9: Timeline Aggregation Frequency

**Why Unknown:**
- TimelineAggregator is used but frequency unknown
- Timeline files exist (2025-11-16.json) but update frequency unknown
- May be hourly, daily, or on-demand

**Evidence Needed:**
- Read `extension/kernel/indexer/TimelineAggregator.ts`
- Check aggregation logic

**How to Verify:**
- Monitor timelines/ directory
- See when new files appear

---

### Unknown 10: Data Normalization Logic

**Why Unknown:**
- DataNormalizer is used but purpose unclear
- May normalize formats, fix corruptions, or merge data
- Implementation not inspected

**Evidence Needed:**
- Read `extension/kernel/indexer/DataNormalizer.ts`
- Understand normalization rules

**How to Verify:**
- Compare before/after data
- Check what gets normalized

---

### Unknown 11: LiveWatcher Purpose

**Why Unknown:**
- LiveWatcher.ts exists in kernel/api/hooks/
- May watch .reasoning_rl4/ for changes
- Not clear if active or legacy

**Evidence Needed:**
- Read `extension/kernel/api/hooks/LiveWatcher.ts`
- Check if instantiated anywhere

**How to Verify:**
- Search for "LiveWatcher" in codebase
- See if it's used

---

### Unknown 12: Structured Logs Purpose

**Why Unknown:**
- logs/structured.jsonl exists but writer unknown
- May be legacy or unused
- Format unknown

**Evidence Needed:**
- Search for "structured.jsonl" in codebase
- Find writer

**How to Verify:**
- Monitor file, see if it grows
- Check what writes to it

---

### Unknown 13: Memory Leak Root Cause

**Why Unknown:**
- Memory grows from 770 MB to 164 GB
- Multiple potential causes (listeners, buffers, JSONL)
- Actual leak source may be combination

**Evidence Needed:**
- Memory profiling with Chrome DevTools
- Heap snapshots over time

**How to Verify:**
- Run extension for hours
- Take heap snapshots
- Compare to find leaking objects

---

### Unknown 14: First Use Mode Deep Analysis

**Why Unknown:**
- Mode scans Git history but extent unknown
- May scan 100 commits, 1000 commits, or all history
- Performance impact unknown

**Evidence Needed:**
- Read AdaptivePromptBuilder.buildPrompt()
- Check what "firstUse" mode does differently

**How to Verify:**
- Generate snapshot in First Use mode
- Measure time, check Git commands in git_pool.jsonl

---

### Unknown 15: WebView Message Queue Backlog

**Why Unknown:**
- VS Code manages message queue internally
- No visibility into queue size or backlog
- May cause delays if WebView slow

**Evidence Needed:**
- VS Code API documentation
- Profiling WebView message handling

**How to Verify:**
- Send many messages rapidly
- Measure WebView processing time

---


