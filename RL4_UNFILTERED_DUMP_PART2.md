# 🔥 RL4 COMPLETE UNFILTERED DUMP - PART 2

**Continuation of unfiltered truth dump**

---

## 3. Deep Internal Architecture (Real View, Not Theoretical)

### Real Entrypoints (What Actually Runs)

**Extension Activation Sequence (EXACT ORDER):**

1. **Line 54-59:** `activate()` function called by VS Code
2. **Line 55:** Check workspace folder exists (fail fast if not)
3. **Line 62-64:** Create CognitiveLogger
4. **Line 66-68:** Log activation banner
5. **Line 70-76:** Initialize MemoryWatchdog (NEW in E4.1)
6. **Line 79:** Load kernel config from `.reasoning_rl4/kernel_config.json`
7. **Line 82-103:** Initialize kernel components IF `USE_TIMER_REGISTRY` is true:
   - TimerRegistry
   - StateRegistry
   - HealthMonitor
   - KernelBootstrap (loads artifacts)
   - CognitiveScheduler (with forecast metrics from bootstrap)
   - ExecPool
   - KernelAPI
8. **Line 117-132:** Bootstrap loading (BEFORE scheduler starts):
   - Load universals
   - Load state
   - Load forecast baseline
9. **Line 135-138:** Start HealthMonitor IF `USE_HEALTH_MONITOR` is true
10. **Line 140-176:** Start CognitiveScheduler (DELAYED 3 seconds):
    - External setTimeout (3s delay)
    - Start scheduler with interval from config
    - Start Input Layer (GitCommitListener, FileChangeWatcher)
11. **Line 179-279:** Register commands:
    - `reasoning.kernel.status`
    - `reasoning.kernel.reflect`
    - `reasoning.kernel.flush`
    - `reasoning.kernel.whereami`
12. **Line 282:** Register ADR validation commands
13. **Line 285-290:** Create status bar item
14. **Line 294-310:** Create WebView panel:
    - Panel ID: 'rl4Webview'
    - Title: '🧠 RL4 Dashboard'
    - ViewColumn: Two
    - `retainContextWhenHidden: false` (CRITICAL for memory)
15. **Line 310:** Load WebView HTML
16. **Line 314-317:** Initialize parsers (promptBuilder, adrParser, planParser)
17. **Line 320-384:** Initialize ADRs.RL4 template if missing
18. **Line 387-404:** Helper: sendContextToWebView()
19. **Line 407-463:** Helper: sendInitialRL4Data()
20. **Line 466:** Call sendInitialRL4Data() after 500ms
21. **Line 469-486:** Send initial GitHub status after 600ms
22. **Line 489:** Initialize default Plan/Tasks/Context files
23. **Line 492:** Ensure Cursor rule exists
24. **Line 495-529:** Register `rl4.openTerminal` command
25. **Line 531-1452:** Register WebView message handlers (MASSIVE)
26. **Line 1457-1464:** Register WebView disposal handler
27. **Line 1473:** Register `rl4.toggleWebview` command
28. **Line 1477-1478:** Log activation complete

**TRUTH:** Activation takes ~3-4 seconds total (3s scheduler delay + 500ms init + 600ms GitHub)

---

### Real Dependencies (Implicit)

**Files That MUST Exist Or Kernel Crashes:**

1. **`.reasoning_rl4/` directory** - Created automatically if missing
2. **`.reasoning_rl4/kernel_config.json`** - Created with defaults if missing
3. **`extension/kernel/KernelBootstrap.ts`** - MUST exist (required by scheduler)
4. **`extension/kernel/cognitive/ForecastEngine.ts`** - MUST exist (scheduler dependency)
5. **`extension/kernel/cognitive/PatternLearningEngine.ts`** - MUST exist (scheduler dependency)
6. **`extension/kernel/cognitive/CorrelationEngine.ts`** - MUST exist (scheduler dependency)
7. **`extension/kernel/cognitive/ADRGeneratorV2.ts`** - MUST exist (scheduler dependency)

**Files That Can Be Missing (Graceful Degradation):**

1. **`.reasoning_rl4/Plan.RL4`** - Created on first snapshot generation
2. **`.reasoning_rl4/Tasks.RL4`** - Created on first snapshot generation
3. **`.reasoning_rl4/Context.RL4`** - Created on first snapshot generation
4. **`.reasoning_rl4/ADRs.RL4`** - Created on first ADR validation
5. **`.reasoning_rl4/proposals.json`** - Created with empty template if missing
6. **`.reasoning_rl4/terminal-events.jsonl`** - NOT created automatically (user must use helper)
7. **`.reasoning_rl4/terminal-patterns.json`** - Created by TerminalPatternsLearner on first run
8. **`scripts/rl4-log.sh`** - Optional (shows warning if missing)

**Implicit Cross-Module Dependencies:**

1. **CognitiveScheduler** depends on:
   - TimerRegistry (for timer IDs)
   - RBOMLedger (for ADR logging)
   - PatternLearningEngine (phase 1)
   - CorrelationEngine (phase 2)
   - ForecastEngine (phase 3)
   - ADRGeneratorV2 (phase 4)
   - KernelBootstrap (for metrics)
   - FeedbackEvaluator (every 100 cycles)
   - RL4CacheIndexer (for caching)
   - ContextSnapshotGenerator (for snapshots)
   - TimelineAggregator (for timelines)
   - DataNormalizer (for normalization)
   - IDEActivityListener (for IDE events)
   - BuildMetricsListener (for build events)
   - PatternEvolutionTracker (for evolution tracking)
   - SnapshotRotation (for rotation)
   - AppendOnlyWriter (for cycles.jsonl)
   - CognitiveLogger (for logging)

2. **UnifiedPromptBuilder** depends on:
   - PlanTasksContextParser (for Plan.RL4/Tasks.RL4)
   - ADRParser (for ADRs.RL4)
   - AnomalyDetector (for anomaly detection)
   - PromptOptimizer (for compression)
   - StateReconstructor (for state reconstruction)
   - RL4CacheIndexer (for cached data)
   - TimelineAggregator (for timeline data)
   - PatternLearningEngine (for patterns)
   - CorrelationEngine (for correlations)

3. **TaskVerificationEngine** depends on:
   - TasksRL4Parser (for parsing Tasks.RL4)
   - AppendOnlyWriter (for reading terminal-events.jsonl)
   - fs (for file operations)

4. **TerminalPatternsLearner** depends on:
   - TasksRL4Parser (for parsing Tasks.RL4)
   - AppendOnlyWriter (for reading terminal-events.jsonl)
   - fs (for reading/writing terminal-patterns.json)

**Circular Dependencies (HIDDEN):**

1. **CognitiveScheduler ↔ PatternLearningEngine**
   - Scheduler calls PatternLearningEngine.analyzePatterns()
   - PatternLearningEngine reads patterns.json (written by previous cycles)
   - If patterns.json is corrupted, cycle crashes

2. **UnifiedPromptBuilder ↔ CognitiveScheduler**
   - UnifiedPromptBuilder reads patterns.json (written by scheduler)
   - Scheduler depends on snapshot generation for forecasting
   - Deadlock possible if both run simultaneously (UNKNOWN if protected)

---

### Real Sequencing (Not Theoretical)

**Cognitive Cycle Real Flow:**

```
START CYCLE
├─ Check if already running → SKIP if true
├─ Increment cycle count
├─ Log cycle start
├─ Calculate input hash (from traces)
│  └─ Read: file_changes.jsonl, git_commits.jsonl, ide_activity.jsonl
│  └─ Hash: SHA256 of concatenated content
├─ Compare with last input hash
│  ├─ If SAME → SKIP cycle (idempotence)
│  └─ If DIFFERENT → PROCEED
├─ Phase 1: Pattern Learning
│  ├─ Create PatternLearningEngine instance (NEW each cycle)
│  ├─ Call analyzePatterns()
│  │  ├─ Read traces/*.jsonl files
│  │  ├─ Detect patterns
│  │  ├─ Write to patterns.json (OVERWRITE, not append)
│  │  └─ Return patterns array
│  ├─ Track pattern evolution (PatternEvolutionTracker)
│  │  └─ Write to evolution logs (UNKNOWN location)
│  └─ Log phase metrics
├─ Phase 2: Correlation
│  ├─ Create CorrelationEngine instance (NEW each cycle)
│  ├─ Call analyze()
│  │  ├─ Read patterns.json + traces/*.jsonl
│  │  ├─ Find correlations
│  │  └─ Return correlations array
│  └─ Log phase metrics
├─ Phase 3: Forecasting
│  ├─ Use PERSISTENT ForecastEngine instance (shared across cycles)
│  ├─ Call generate()
│  │  ├─ Read patterns.json + correlations
│  │  ├─ Generate forecasts
│  │  ├─ Update internal metrics (forecast_precision, improvement_rate)
│  │  └─ Return forecasts array
│  └─ Log phase metrics
├─ Phase 4: ADR Synthesis
│  ├─ Create ADRGeneratorV2 instance (NEW each cycle)
│  ├─ Call generateProposals()
│  │  ├─ Read patterns.json + forecasts + ADRs.RL4
│  │  ├─ Generate ADR proposals
│  │  ├─ Write to adrs/auto/ (APPEND)
│  │  └─ Return proposals array
│  └─ Log phase metrics
├─ Aggregate cycle results
│  ├─ Create summary object
│  ├─ Write to ledger/cycles.jsonl (APPEND)
│  └─ Update internal state
├─ Log cycle end
├─ Check if cycle count % 100 === 0
│  ├─ If YES → Run feedback loop
│  │  ├─ Call FeedbackEvaluator.evaluate()
│  │  ├─ Adjust forecast baseline
│  │  └─ Log checkpoint summary
│  └─ If NO → Skip feedback
└─ Return cycle result
```

**TRUTH:** Each cycle creates NEW instances of engines (except ForecastEngine)

**TRUTH:** ForecastEngine is PERSISTENT across cycles (shared state)

**TRUTH:** Patterns.json is OVERWRITTEN each cycle (not append)

**TRUTH:** Cycles.jsonl is APPENDED each cycle (never overwritten)

**TRUTH:** Feedback loop only runs every 100 cycles (~16.7 minutes if 10s interval)

---

### Real File Write Operations

**What Gets Written When:**

| File | Writer | Frequency | Operation | Size Limit |
|------|--------|-----------|-----------|------------|
| `patterns.json` | PatternLearningEngine | Every cycle (if changed) | OVERWRITE | None |
| `cycles.jsonl` | CognitiveScheduler | Every cycle | APPEND | None (grows forever) |
| `adrs/auto/*.json` | ADRGeneratorV2 | Rarely (when ADR detected) | CREATE | None |
| `traces/file_changes.jsonl` | FileChangeWatcher | Every 30s | APPEND | None (grows forever) |
| `traces/git_commits.jsonl` | GitCommitListener | On commit | APPEND | None (grows forever) |
| `traces/ide_activity.jsonl` | IDEActivityListener | On IDE event | APPEND | None (grows forever) |
| `diagnostics/health.jsonl` | HealthMonitor | Every 10s | APPEND | None (grows forever) |
| `diagnostics/git_pool.jsonl` | ExecPool | On git command | APPEND | None (grows forever) |
| `kernel/state.json.gz` | StateRegistry | Every 10min | OVERWRITE | ~100-500 KB |
| `terminal-events.jsonl` | User/Helper | On command | APPEND | None (grows forever) |
| `terminal-patterns.json` | TerminalPatternsLearner | On-demand | OVERWRITE | None |
| `proposals.json` | Extension | On parse | OVERWRITE | None |
| `Tasks.RL4` | Extension | On apply patch | OVERWRITE | None |
| `decisions.jsonl` | Extension | On decision | APPEND | None (grows forever) |
| `logs/structured.jsonl` | UNKNOWN | UNKNOWN | APPEND | None (grows forever) |

**TRUTH:** Most JSONL files grow forever without rotation

**TRUTH:** This causes memory leaks (files loaded entirely into memory)

**TRUTH:** No automatic cleanup or rotation (Phase E4.1 planned)

---

### Real Assumptions Baked Into Code

1. **Workspace Has Git Repository**
   - Assumed: GitCommitListener checks but continues if not found
   - Impact: No git traces if not a git repo
   - Graceful: Yes (just logs warning)

2. **File System Is Writable**
   - Assumed: All write operations assume success
   - Impact: If `.reasoning_rl4/` is read-only, extension crashes
   - Graceful: No (throws exceptions)

3. **VS Code API Is Available**
   - Assumed: `vscode` module always works
   - Impact: If VS Code version is too old, extension may crash
   - Graceful: No (throws exceptions)

4. **Node.js Version Is Modern**
   - Assumed: Node.js >=18 (for modern APIs)
   - Impact: If Node.js <18, some APIs may fail
   - Graceful: No (throws exceptions)

5. **User Has English Locale**
   - Assumed: Some messages are in French (hardcoded)
   - Impact: Non-French users see French text in Cursor rules
   - Graceful: Yes (but confusing)

6. **Terminal Supports ANSI Colors**
   - Assumed: CognitiveLogger uses emojis (may break on Windows)
   - Impact: Output may be garbled on some terminals
   - Graceful: Yes (still readable)

7. **GitHub CLI (`gh`) Is Installed**
   - Assumed: GitHubFineGrainedManager checks but doesn't guide installation
   - Impact: GitHub features don't work without `gh`
   - Graceful: Yes (shows error message)

8. **User Understands RL4 Concepts**
   - Assumed: User knows what "deviation mode" means
   - Impact: Confusing UI for new users
   - Graceful: No (no onboarding)

9. **Tasks.RL4 Uses Markdown Format**
   - Assumed: TasksRL4Parser expects specific format
   - Impact: If user uses different format, parsing fails
   - Graceful: Yes (skips invalid lines)

10. **Snapshot Is Copied Manually**
    - Assumed: User copies snapshot to clipboard and pastes in agent
    - Impact: No automatic integration with AI agents
    - Graceful: Yes (but manual workflow)

---

## 4. Internal State Machines (All of Them)

### CognitiveScheduler State Machine

**States:**
1. **IDLE** - Not running, waiting for start()
2. **STARTING** - Start() called, initializing components
3. **RUNNING** - Cycle running, processing phases
4. **WAITING** - Cycle complete, waiting for next interval
5. **STOPPING** - Stop() called, cleaning up
6. **STOPPED** - Fully stopped, timers cleared

**Transitions:**
```
IDLE → STARTING (on start())
STARTING → RUNNING (after initialization)
RUNNING → WAITING (after cycle completes)
WAITING → RUNNING (after interval elapses)
RUNNING → STOPPING (on stop())
WAITING → STOPPING (on stop())
STOPPING → STOPPED (after cleanup)
```

**State Variables:**
- `isRunning: boolean` - True if cycle in progress
- `cycleCount: number` - Number of cycles run
- `lastInputHash: string` - Hash of last input (idempotence)
- `lastCycleTime: number` - Timestamp of last cycle (watchdog)
- `timerHandle: TimerHandle` - Timer registry handle

**Hidden State:**
- `forecastEngine: ForecastEngine` - PERSISTENT across cycles (shared state)
- `commitCount: number` - Number of commits (for hourly summary)
- `lastHourlySummaryTime: number` - Timestamp of last summary

**Failure States:**
- If cycle throws exception → `isRunning` set to false, cycle marked as failed
- No retry logic (waits for next interval)
- No crash recovery (manual restart required)

---

### PromptBuilder State Machine

**States:**
1. **UNINITIALIZED** - Builder not created yet
2. **READY** - Builder created, ready to generate
3. **GENERATING** - Snapshot generation in progress
4. **COMPLETE** - Snapshot generated, returned to caller

**No Persistent State Between Calls:**
- Each generate() call creates NEW builder instance
- No memory of previous snapshots
- Each call is independent

**Internal Sub-States During Generation:**
1. Read Plan.RL4 → 2. Read Tasks.RL4 → 3. Read Context.RL4 → 4. Read ADRs.RL4 → 5. Read patterns.json → 6. Read traces → 7. Detect anomalies → 8. Optimize prompt → 9. Return

**Hidden State:**
- Cache of file contents (if RL4CacheIndexer is used)
- Unknown if cache persists between calls

---

### TerminalPatternsLearner State Machine

**States:**
1. **UNINITIALIZED** - Learner not created
2. **LOADING** - Loading patterns from terminal-patterns.json
3. **READY** - Patterns loaded, ready to learn/suggest
4. **LEARNING** - Learning from terminal events
5. **DETECTING** - Detecting anomalies
6. **SUGGESTING** - Generating suggestions
7. **PERSISTING** - Writing patterns to file

**State Variables:**
- `patterns: Map<string, TaskPattern>` - Learned patterns (in-memory)
- `commandClassifications: Map<string, string>` - Command classifications
- `anomalies: PatternAnomaly[]` - Detected anomalies

**Persistence:**
- State is loaded from `terminal-patterns.json` on creation
- State is written to `terminal-patterns.json` on save
- If file missing → starts with empty state

**Hidden Behavior:**
- Patterns are OVERWRITTEN each save (not merged)
- If two learners run concurrently → RACE CONDITION (last write wins)
- No locking mechanism (potential data loss)

---

### SnapshotReminder State Machine

**States:**
1. **IDLE** - Not started
2. **RUNNING** - Timer active, checking periodically
3. **REMINDING** - Showing reminder message
4. **DISMISSED** - User dismissed reminder, waiting for next check

**State Variables:**
- `lastSnapshotTime: number` - Timestamp of last snapshot
- `reminderShown: boolean` - True if reminder currently shown
- `timerHandle: NodeJS.Timer` - Timer for periodic checks

**Persistence:**
- Loads last snapshot time from `.reasoning_rl4/reminder_state.json`
- Writes updated time on snapshot generation
- If file missing → assumes no snapshot yet

**Transition Logic:**
```
Check every 30min:
  IF last_snapshot > 2h ago AND not reminding:
    → Show reminder (VS Code info message)
    → Set reminding = true
  IF user clicks "Generate & Copy":
    → Generate snapshot
    → Record snapshot time
    → Dismiss reminder
    → Set reminding = false
  IF user clicks "Remind me later":
    → Dismiss reminder
    → Set reminding = false
    → Wait for next check (30min)
```

**Hidden State:**
- Reminder state persists across extension reloads
- If user generates snapshot via command palette (not reminder) → time is ALSO recorded

---

### BiasGuard State Machine

**Not a True State Machine:**
- BiasGuard is stateless (function-based, not class)
- Called inline during `applyPatch` handler
- No persistent state

**Logic:**
```
ON applyPatch:
  1. Read Plan.RL4 → Get deviation_mode
  2. Calculate threshold:
     - strict: 0%
     - flexible: 25%
     - exploratory: 50%
     - free: 100%
  3. Read Context.RL4 → Get current bias
  4. Calculate new bias (current + patch bias)
  5. IF new_bias > threshold:
     → Abort patch
     → Log to decisions.jsonl (apply_aborted_bias)
     → Return error to WebView
  6. ELSE:
     → Proceed with patch
     → Update Tasks.RL4
     → Log to decisions.jsonl (patch_applied)
     → Return success to WebView
```

**Hidden Behavior:**
- Bias calculation is SIMPLE addition (no weighting)
- If Context.RL4 missing → assumes bias = 0% (graceful)
- If Plan.RL4 missing → assumes flexible mode (25% threshold)

---

### ADR Generation State Machine

**States:**
1. **IDLE** - ADRGeneratorV2 not created
2. **ANALYZING** - Analyzing traces/patterns
3. **DETECTING** - Detecting decision points
4. **GENERATING** - Generating ADR proposals
5. **PERSISTING** - Writing ADR files

**State Variables:**
- `proposals: ADRProposal[]` - Generated proposals (in-memory)

**No Persistence Between Cycles:**
- Each cycle creates NEW ADRGeneratorV2 instance
- No memory of previous proposals

**Internal Logic:**
```
ON generateProposals():
  1. Read patterns.json
  2. Read ADRs.RL4 (existing ADRs)
  3. Detect "decision points" (undefined heuristics)
  4. For each decision point:
     - Check if ADR already exists
     - If not → Generate proposal
     - Write to adrs/auto/adr-{id}.json
  5. Return proposals array
```

**UNKNOWN:**
- How "decision points" are detected (heuristics not documented)
- How duplicate detection works (simple title match?)
- How quality scoring works (fake algorithm?)

---

### FileWatcher State Machines

**FileChangeWatcher States:**
1. **STOPPED** - Not watching
2. **STARTING** - Initializing chokidar
3. **WATCHING** - Watching for changes
4. **AGGREGATING** - Aggregating changes (every 30s)
5. **STOPPING** - Stopping watcher

**State Variables:**
- `isWatching: boolean`
- `aggregatedChanges: Map<string, AggregatedChange>` - Changes buffer (30s window)
- `lastAggregationTime: number` - Timestamp of last aggregation
- `watcher: FSWatcher` - Chokidar instance

**Aggregation Logic:**
```
ON file change event:
  1. Add to aggregatedChanges map
  2. Update count + timestamp
  3. Wait for next aggregation (30s)

ON aggregation timer (every 30s):
  1. Create summary from aggregatedChanges
  2. Write to traces/file_changes.jsonl (APPEND)
  3. Clear aggregatedChanges map
  4. Log via CognitiveLogger
```

**TRUTH:** Changes are batched (30s delay before JSONL write)

---

**GitCommitListener States:**
1. **STOPPED** - Not watching
2. **WATCHING** - Watching for commits
3. **PROCESSING** - Processing commit event

**State Variables:**
- `isWatching: boolean`
- `lastCommitHash: string` - Hash of last processed commit

**Detection Logic:**
```
Polling approach (every N seconds, UNKNOWN interval):
  1. Run: git log -1 --format=%H
  2. Compare hash with lastCommitHash
  3. If different:
     → New commit detected
     → Run: git log -1 --format=%H:%s:%an:%ae
     → Parse output
     → Write to traces/git_commits.jsonl (APPEND)
     → Update lastCommitHash
     → Increment commit counter (for hourly summary)
```

**UNKNOWN:**
- Polling interval (not shown in code I've seen)
- Alternative: May use git hooks (not confirmed)

---

## 5. Complete List of Kernel Timers

**Timer 1: Cognitive Cycle**
- **Type:** setInterval
- **Delay:** 10000ms (10 seconds, configurable)
- **Location:** CognitiveScheduler.start()
- **Managed by:** TimerRegistry
- **Callback:** runCycle()
- **Blocks:** No (async, non-blocking)
- **Failure:** Logged, next cycle continues
- **Cleanup:** Disposed on stop()

**Timer 2: Snapshot Reminder**
- **Type:** setInterval
- **Delay:** 1800000ms (30 minutes)
- **Location:** SnapshotReminder.start()
- **Managed by:** Own timer (not TimerRegistry)
- **Callback:** checkAndRemind()
- **Blocks:** No (async, non-blocking)
- **Failure:** Silently ignored (no UI feedback)
- **Cleanup:** Disposed on stop()

**Timer 3: Health Check**
- **Type:** setInterval
- **Delay:** 10000ms (10 seconds, configurable)
- **Location:** HealthMonitor.start()
- **Managed by:** TimerRegistry
- **Callback:** check()
- **Blocks:** No (async, non-blocking)
- **Failure:** Logged, next check continues
- **Cleanup:** Disposed on stop()

**Timer 4: State Snapshot**
- **Type:** setInterval
- **Delay:** 600000ms (10 minutes, configurable)
- **Location:** StateRegistry (assumption, not verified)
- **Managed by:** TimerRegistry (assumption)
- **Callback:** snapshot()
- **Blocks:** Yes (gzip compression blocks ~100-500ms)
- **Failure:** Logged, next snapshot continues
- **Cleanup:** Disposed on stop()

**Timer 5: File Aggregation**
- **Type:** setInterval
- **Delay:** 30000ms (30 seconds, hardcoded)
- **Location:** FileChangeWatcher.startAggregationTimer()
- **Managed by:** Own timer (not TimerRegistry)
- **Callback:** logAggregatedChanges()
- **Blocks:** No (async, non-blocking)
- **Failure:** Logged, next aggregation continues
- **Cleanup:** Disposed on stopWatching()

**Timer 6: Memory Watchdog**
- **Type:** setInterval
- **Delay:** 300000ms (5 minutes, configurable)
- **Location:** MemoryWatchdog.start()
- **Managed by:** Own timer (not TimerRegistry)
- **Callback:** check()
- **Blocks:** No (async, non-blocking)
- **Failure:** Logged, next check continues
- **Cleanup:** Disposed on stop()

**Timer 7: Scheduler Delayed Start**
- **Type:** setTimeout (ONE-TIME)
- **Delay:** 3000ms (3 seconds, hardcoded)
- **Location:** extension.ts activation
- **Managed by:** None (anonymous)
- **Callback:** Start scheduler + input layer
- **Blocks:** No (async, non-blocking)
- **Failure:** Extension fails to start fully
- **Cleanup:** Auto-cleanup after execution

**Timer 8: WebView Initial Data Send**
- **Type:** setTimeout (ONE-TIME)
- **Delay:** 500ms (hardcoded)
- **Location:** extension.ts activation
- **Managed by:** None (anonymous)
- **Callback:** sendInitialRL4Data()
- **Blocks:** No (async, non-blocking)
- **Failure:** WebView shows empty state
- **Cleanup:** Auto-cleanup after execution

**Timer 9: GitHub Status Check**
- **Type:** setTimeout (ONE-TIME)
- **Delay:** 600ms (hardcoded)
- **Location:** extension.ts activation
- **Managed by:** None (anonymous)
- **Callback:** Check GitHub connection
- **Blocks:** No (async, non-blocking)
- **Failure:** GitHub status shows "unknown"
- **Cleanup:** Auto-cleanup after execution

**Timer 10: Git Commit Polling (UNCONFIRMED)**
- **Type:** setInterval (assumption)
- **Delay:** UNKNOWN (possibly 5-10 seconds)
- **Location:** GitCommitListener
- **Managed by:** Own timer (assumption)
- **Callback:** Check for new commits
- **Blocks:** No (async, non-blocking)
- **Failure:** Commits not detected
- **Cleanup:** UNKNOWN

**TRUTH:** At least 10 timers run concurrently

**TRUTH:** Multiple timers NOT managed by TimerRegistry (memory leak risk)

**TRUTH:** Some timers are anonymous (hard to debug)

---


