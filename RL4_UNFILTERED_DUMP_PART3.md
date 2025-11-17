# 🔥 RL4 COMPLETE UNFILTERED DUMP - PART 3

**Continuation of unfiltered truth dump**

---

## 6. Hidden or Rare Triggers

### Rare Flow 1: Feedback Loop (Every 100 Cycles)

**Trigger:** `cycleCount % 100 === 0`

**Frequency:** Every 100 cycles = ~16.7 minutes (if 10s interval) or ~200 hours (if 2h interval)

**Flow:**
```typescript
IF cycleId % 100 === 0:
  1. Call FeedbackEvaluator.evaluate(cycleId)
  2. Adjust ForecastEngine baseline
     - Read last 100 cycles from cycles.jsonl
     - Calculate actual forecast accuracy
     - Compare with current baseline
     - Update baseline = (old_baseline * 0.9) + (new_accuracy * 0.1)
  3. Log checkpoint summary:
     - Baseline: {forecast_precision}
     - Improvement: {improvement_rate}
     - Total Evals: {total_forecasts}
```

**TRUTH:** This only runs once per ~17 minutes in testing, or once per ~8 days in production

**TRUTH:** Baseline adjustment is MINIMAL (10% weight on new data)

**TRUTH:** If cycles.jsonl is corrupted, feedback loop crashes

---

### Rare Flow 2: Pattern Evolution Tracking

**Trigger:** After Pattern Learning phase completes

**Frequency:** Every cycle (if patterns detected)

**Flow:**
```typescript
try {
  await patternEvolutionTracker.trackChanges(patterns, cycleId)
} catch (error) {
  logger.warning('Pattern evolution tracking failed (non-critical)')
}
```

**TRUTH:** This is wrapped in try/catch (silent failure)

**TRUTH:** If this fails, cycle continues normally (no user notification)

**TRUTH:** Evolution data is written to UNKNOWN location (not documented)

---

### Rare Flow 3: Snapshot Rotation

**Trigger:** UNKNOWN (periodic or threshold-based?)

**Purpose:** Rotate old snapshots in `context_history/`

**Flow:**
```typescript
// Assumption based on SnapshotRotation.ts existence
1. List all snapshot-*.json files
2. IF count > MAX_SNAPSHOTS (UNKNOWN threshold):
   - Sort by timestamp
   - Delete oldest snapshots
   - Keep only last N (UNKNOWN value)
```

**TRUTH:** Rotation logic exists but trigger is UNKNOWN

**TRUTH:** MAX_SNAPSHOTS threshold is UNKNOWN

**TRUTH:** May never run (snapshots accumulate forever?)

---

### Rare Flow 4: JSONL Rotation (PLANNED, NOT IMPLEMENTED)

**Trigger:** NEVER (Phase E4.1 planned but not completed)

**Intended Flow:**
```typescript
IF file_size > THRESHOLD:
  1. Rename file to {filename}-{timestamp}.jsonl
  2. Compress to .gz
  3. Create new empty file
```

**TRUTH:** This does NOT exist yet

**TRUTH:** JSONL files grow forever without rotation

**TRUTH:** This causes memory leaks

---

### Rare Flow 5: Emergency Mode (UNCONFIRMED)

**Trigger:** UNKNOWN (possibly on critical error)

**Evidence:** HealthMonitor exists but emergency logic UNKNOWN

**Possible Flow:**
```typescript
IF critical_error_detected:
  1. Stop CognitiveScheduler
  2. Flush all buffers
  3. Save emergency state
  4. Show VS Code error message
  5. Disable extension?
```

**TRUTH:** Emergency mode logic is NOT documented

**TRUTH:** May not exist (need code inspection)

---

### Rare Flow 6: Bootstrap Reconstruction (First Boot)

**Trigger:** Extension activation + kernel artifacts missing

**Frequency:** First boot only (or after deleting .reasoning_rl4/)

**Flow:**
```typescript
1. Check for kernel/state.json.gz
2. IF missing:
   - Use default baseline (0.73)
   - Create empty universals
   - Initialize forecast metrics
   - Log: "No kernel artifacts found"
3. IF exists:
   - Decompress state.json.gz
   - Load universals
   - Load forecast baseline
   - Log: "Bootstrap complete: X universals loaded"
```

**TRUTH:** Default baseline 0.73 is HARDCODED (no evidence for this value)

**TRUTH:** If state.json.gz is corrupted, extension crashes (no recovery)

---

### Rare Flow 7: Duplicate Detection in proposals.json

**Trigger:** When applying patch (submitDecisions handler)

**Flow:**
```typescript
1. Read Tasks.RL4
2. For each proposed task:
   - Compare title with existing tasks (fuzzy match?)
   - IF similarity > THRESHOLD (UNKNOWN):
     - Mark as possibleDuplicateOf
     - Show in UI with warning badge
   - ELSE:
     - Proceed with addition
```

**TRUTH:** Duplicate detection algorithm is UNKNOWN

**TRUTH:** Threshold is UNKNOWN (60%? 80%?)

**TRUTH:** May not exist (need code inspection)

---

### Rare Flow 8: WebView Crash Recovery

**Trigger:** WebView throws unhandled exception

**Flow:**
```typescript
webviewPanel.onDidDispose(() => {
  webviewPanel = null
  statusBarItem.text = '$(brain) RL4 Dashboard'
  logger.system('WebView disposed')
})
```

**TRUTH:** If WebView crashes, extension sets webviewPanel = null

**TRUTH:** User must click status bar to recreate WebView

**TRUTH:** All WebView state is lost (no recovery)

---

### Rare Flow 9: ExecPool Concurrency Limit

**Trigger:** More than 2 git commands queued simultaneously

**Flow:**
```typescript
// ExecPool has concurrency: 2, timeout: 2000ms
IF queued_commands > 2:
  1. Queue additional commands (FIFO)
  2. Wait for slot to open
  3. Execute when available
```

**TRUTH:** Commands wait in queue (no error)

**TRUTH:** Queue size is UNLIMITED (potential memory leak)

**TRUTH:** If many commands queued, delays can be LONG (2s * queue_size)

---

### Rare Flow 10: Cursor Rule File Re-Creation

**Trigger:** Every extension activation + rule file missing

**Flow:**
```typescript
function ensureCursorRuleExists():
  IF .cursor/rules/RL4_STRICT_MODE_ENFORCEMENT.mdc exists:
    return (skip)
  ELSE:
    - Create .cursor/rules/ directory
    - Write rule file with hardcoded French content
    - Log: "Created Cursor rule"
```

**TRUTH:** Rule file is checked EVERY activation (performance overhead)

**TRUTH:** If user deletes rule, it's recreated on next activation

**TRUTH:** No way to disable this behavior (hardcoded)

---

## 7. Hardcoded Assumptions

### Hardcoded Thresholds

1. **Fuzzy Matching Similarity: 0.6 (60%)**
   - Location: `TerminalPatternsLearner.ts`
   - Used for: Task title matching
   - Cannot be configured
   - Code: `const SIMILARITY_THRESHOLD = 0.6;`

2. **Bias Guard Thresholds: 0%, 25%, 50%, 100%**
   - Location: `extension.ts` (message handler logic)
   - Cannot be configured via UI
   - Hardcoded per deviation mode

3. **Snapshot Reminder Interval: 30 minutes**
   - Location: `SnapshotReminder.ts`
   - Hardcoded: `setInterval(..., 30 * 60 * 1000)`
   - Cannot be configured

4. **Snapshot Reminder Threshold: 2 hours**
   - Location: `SnapshotReminder.ts`
   - Hardcoded: `if (timeSince > 2 * 60 * 60 * 1000)`
   - Cannot be configured

5. **File Aggregation Interval: 30 seconds**
   - Location: `FileChangeWatcher.ts`
   - Hardcoded: `setInterval(..., 30000)`
   - Cannot be configured

6. **Forecast Baseline Default: 0.73**
   - Location: `ForecastEngine.ts` (assumption)
   - Hardcoded default
   - Evidence: UNKNOWN (may not exist)

7. **Forecast Baseline Learning Rate: 0.1 (10%)**
   - Location: `FeedbackEvaluator.ts` (assumption)
   - Hardcoded: `new_baseline = old * 0.9 + new * 0.1`
   - Cannot be configured

8. **ExecPool Concurrency: 2**
   - Location: `extension.ts` activation
   - Hardcoded: `new ExecPool(2, 2000, workspaceRoot)`
   - Cannot be configured via settings

9. **ExecPool Timeout: 2000ms**
   - Location: `extension.ts` activation
   - Hardcoded: `new ExecPool(2, 2000, workspaceRoot)`
   - Cannot be configured via settings

10. **Memory Watchdog Threshold: 500 MB**
    - Location: `extension.ts` activation
    - Hardcoded: `memoryWatchdog.start(500, 300000)`
    - Cannot be configured via settings

11. **Memory Watchdog Check Interval: 5 minutes**
    - Location: `extension.ts` activation
    - Hardcoded: `memoryWatchdog.start(500, 300000)` (300000ms)
    - Cannot be configured via settings

12. **Task Verification Confidence Thresholds:**
    - HIGH: 100% conditions matched + exitCode 0
    - MEDIUM: >50% conditions matched
    - LOW: <50% conditions matched
    - Location: `TaskVerificationEngine.ts`
    - Hardcoded logic
    - Cannot be configured

13. **Pattern Anomaly Thresholds:**
    - Success rate drop: >20% deviation
    - Unusual duration: >2σ (2 standard deviations)
    - Location: `TerminalPatternsLearner.ts`
    - Hardcoded
    - Cannot be configured

14. **Scheduler Delayed Start: 3 seconds**
    - Location: `extension.ts` activation
    - Hardcoded: `setTimeout(..., 3000)`
    - Cannot be configured

15. **WebView Initial Data Delay: 500ms**
    - Location: `extension.ts` activation
    - Hardcoded: `setTimeout(sendInitialRL4Data, 500)`
    - Cannot be configured

16. **GitHub Status Check Delay: 600ms**
    - Location: `extension.ts` activation
    - Hardcoded: `setTimeout(..., 600)`
    - Cannot be configured

---

### Hardcoded Prediction Baselines

1. **Forecast Precision Baseline: 0.73**
   - No evidence for this value
   - May be arbitrary choice
   - Used as starting point for adaptive learning

2. **Mock Health Metrics:**
   - Drift: `Math.random() * 0.5` (0-0.5)
   - Coherence: `0.7 + Math.random() * 0.3` (0.7-1.0)
   - Location: `CognitiveScheduler.ts` lines 474-478
   - **FAKE DATA** (no real health monitoring)

---

### Hardcoded Debounce Intervals

1. **Chokidar Write Stability: 300ms**
   - Location: `FileChangeWatcher.ts`
   - Config: `awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }`
   - Cannot be configured

2. **Chokidar Poll Interval: 100ms**
   - Location: `FileChangeWatcher.ts`
   - Config: `awaitWriteFinish: { pollInterval: 100 }`
   - Cannot be configured

---

### Hardcoded Buffer Sizes

1. **ExecPool Output Buffer: UNLIMITED**
   - Location: `ExecPool.ts`
   - No size limit on stdout/stderr
   - **MEMORY LEAK** (buffers accumulate)

2. **Aggregated File Changes Buffer: UNLIMITED**
   - Location: `FileChangeWatcher.ts`
   - Map grows without bound (30s window)
   - Cleared every 30s (not a leak, but can spike)

3. **WebView Message Queue: UNLIMITED**
   - VS Code manages internally
   - No explicit size limit in RL4 code
   - Potential backlog if WebView slow

---

### Hardcoded File Size Limits

1. **JSONL Files: NO LIMIT**
   - All JSONL files grow forever
   - No rotation (Phase E4.1 planned)
   - **MEMORY LEAK** (files loaded into memory)

2. **Kernel State: NO LIMIT**
   - `kernel/state.json.gz` can grow indefinitely
   - Compression helps but doesn't prevent growth

3. **Snapshot Files: NO LIMIT**
   - `context_history/snapshot-*.json` accumulate
   - Rotation logic exists but trigger UNKNOWN

---

### Hardcoded JSONL Truncation Behavior

**TRUTH:** No truncation exists

**TRUTH:** Files grow linearly with usage

**TRUTH:** After weeks/months, files become huge (>100 MB)

**TRUTH:** Loading huge files into memory causes crashes

---

## 8. Complete Description of Every JSONL File Format

### File: `traces/file_changes.jsonl`

**Format:** One JSON object per line (aggregated every 30s)

**Schema:**
```json
{
  "timestamp": "2025-11-16T10:30:00.000Z",
  "type": "file_change_aggregate",
  "period_seconds": 30,
  "files_modified": 5,
  "total_edits": 12,
  "files": [
    "extension/extension.ts",
    "extension/kernel/api/UnifiedPromptBuilder.ts",
    "README.md"
  ],
  "hotspot": {
    "file": "extension/extension.ts",
    "edits": 8
  }
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `type`: Always "file_change_aggregate" (required)
- `period_seconds`: Always 30 (required)
- `files_modified`: Integer (required)
- `total_edits`: Integer (required)
- `files`: Array of strings (file paths, required)
- `hotspot`: Object or undefined (optional)
  - `file`: String (required if hotspot exists)
  - `edits`: Integer (required if hotspot exists)

**Edge Cases:**
- If no changes in 30s window → NO line written (sparse)
- If hotspot has 1 edit → hotspot is still included
- File paths are relative to workspace root

**Variants:**
- None (always same format)

---

### File: `traces/git_commits.jsonl`

**Format:** One JSON object per line (on each commit)

**Schema:**
```json
{
  "timestamp": "2025-11-16T10:35:00.000Z",
  "type": "git_commit",
  "hash": "a1b2c3d4",
  "message": "feat: Add feature",
  "author": "Valentin Galudec",
  "email": "valentin@galudec.com",
  "files_changed": 3,
  "insertions": 150,
  "deletions": 20
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `type`: Always "git_commit" (required)
- `hash`: String (short hash, required)
- `message`: String (commit message, required)
- `author`: String (required)
- `email`: String (required)
- `files_changed`: Integer (optional, may be missing)
- `insertions`: Integer (optional, may be missing)
- `deletions`: Integer (optional, may be missing)

**Edge Cases:**
- If git log parsing fails → Some fields may be empty strings
- If commit is merge → message may contain newlines (escaped as \n)

**Variants:**
- Old format (before Phase X): May not have insertions/deletions fields

---

### File: `traces/ide_activity.jsonl`

**Format:** One JSON object per line (on IDE events)

**Schema:**
```json
{
  "timestamp": "2025-11-16T10:36:00.000Z",
  "type": "editor_change",
  "file": "extension/extension.ts",
  "language": "typescript",
  "lineCount": 1779
}
```

OR

```json
{
  "timestamp": "2025-11-16T10:37:00.000Z",
  "type": "editor_focus",
  "file": "extension/extension.ts"
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `type`: "editor_change" | "editor_focus" | "editor_open" | "editor_close" (required)
- `file`: String (file path, required)
- `language`: String (optional, only for editor_change)
- `lineCount`: Integer (optional, only for editor_change)

**Edge Cases:**
- If file path is outside workspace → path may be absolute
- If language unknown → field may be "plaintext" or missing

**Variants:**
- May have additional event types (need code inspection)

---

### File: `ledger/cycles.jsonl`

**Format:** One JSON object per line (every cognitive cycle)

**Schema:**
```json
{
  "cycleId": 123,
  "startedAt": "2025-11-16T10:40:00.000Z",
  "completedAt": "2025-11-16T10:40:00.500Z",
  "duration": 500,
  "phases": [
    {
      "name": "pattern-learning",
      "duration": 150,
      "success": true,
      "metrics": {
        "patternsDetected": 5
      }
    },
    {
      "name": "correlation",
      "duration": 200,
      "success": true,
      "metrics": {
        "correlationsFound": 2
      }
    },
    {
      "name": "forecasting",
      "duration": 50,
      "success": true,
      "metrics": {
        "forecastsGenerated": 3
      }
    },
    {
      "name": "adr-synthesis",
      "duration": 100,
      "success": true,
      "metrics": {
        "adrsGenerated": 0
      }
    }
  ],
  "inputHash": "sha256:abc123...",
  "success": true
}
```

**Field Types:**
- `cycleId`: Integer (required)
- `startedAt`: ISO 8601 string (required)
- `completedAt`: ISO 8601 string (required)
- `duration`: Integer (milliseconds, required)
- `phases`: Array of objects (required, may be empty if skipped)
  - `name`: String (required)
  - `duration`: Integer (required)
  - `success`: Boolean (required)
  - `metrics`: Object (optional)
- `inputHash`: String (required)
- `success`: Boolean (required)

**Edge Cases:**
- If cycle skipped (idempotence) → phases array has ONE item: `{ name: 'idempotence-skip', duration: 0, success: true }`
- If phase fails → `success: false`, may have `error` field
- If cycle crashes → Last line may be incomplete (truncated JSON)

**Variants:**
- Skip cycles have minimal data
- Failed cycles have error messages in phase objects

---

### File: `ledger/decisions.jsonl`

**Format:** One JSON object per line (on user decisions)

**Schema (Proposal Accepted):**
```json
{
  "timestamp": "2025-11-16T10:45:00.000Z",
  "event": "proposal_accepted",
  "taskId": "task-001",
  "priority": "P1",
  "bias": 5,
  "user_action": "accept"
}
```

**Schema (Proposal Rejected):**
```json
{
  "timestamp": "2025-11-16T10:46:00.000Z",
  "event": "proposal_rejected",
  "taskId": "task-002",
  "reason": "duplicate",
  "user_action": "reject"
}
```

**Schema (Patch Applied):**
```json
{
  "timestamp": "2025-11-16T10:47:00.000Z",
  "event": "patch_applied",
  "tasksAdded": 2,
  "tasksModified": 0,
  "biasTotal": 10,
  "user_action": "apply"
}
```

**Schema (Patch Aborted - Bias):**
```json
{
  "timestamp": "2025-11-16T10:48:00.000Z",
  "event": "apply_aborted_bias",
  "biasTotal": 30,
  "threshold": 25,
  "mode": "flexible",
  "user_action": "abort"
}
```

**Schema (Task Marked Done):**
```json
{
  "timestamp": "2025-11-16T10:50:00.000Z",
  "event": "task_completed",
  "taskId": "task-001",
  "trigger": "terminal",
  "verified": true,
  "user_action": "mark_done"
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `event`: String (required, see variants above)
- `taskId`: String (optional, context-dependent)
- `priority`: String (optional)
- `bias`: Integer (optional)
- `reason`: String (optional)
- `tasksAdded`: Integer (optional)
- `tasksModified`: Integer (optional)
- `biasTotal`: Integer (optional)
- `threshold`: Integer (optional)
- `mode`: String (optional)
- `trigger`: String (optional)
- `verified`: Boolean (optional)
- `user_action`: String (required)

**Edge Cases:**
- Different events have different fields (heterogeneous)
- No schema validation (any JSON is accepted)

**Variants:**
- 5+ event types (see schemas above)
- Fields vary by event type

---

### File: `terminal-events.jsonl`

**Format:** One JSON object per line (from RL4 Terminal)

**Schema (Command Start):**
```json
{
  "timestamp": "2025-11-16T11:00:00.000Z",
  "type": "command_start",
  "taskId": "task-001",
  "command": "npm test",
  "terminal": "RL4"
}
```

**Schema (Command End):**
```json
{
  "timestamp": "2025-11-16T11:00:05.000Z",
  "type": "command_end",
  "taskId": "task-001",
  "status": "success",
  "exitCode": 0,
  "durationMs": 5000,
  "terminal": "RL4"
}
```

**Schema (File Created):**
```json
{
  "timestamp": "2025-11-16T11:01:00.000Z",
  "type": "file_created",
  "taskId": "task-002",
  "file": ".test-verification.txt",
  "terminal": "RL4"
}
```

**Schema (Git Commit):**
```json
{
  "timestamp": "2025-11-16T11:02:00.000Z",
  "type": "git_commit",
  "taskId": "task-003",
  "metadata": {
    "commit": "3055f6e"
  },
  "terminal": "RL4"
}
```

**Schema (Custom Event):**
```json
{
  "timestamp": "2025-11-16T11:03:00.000Z",
  "type": "custom",
  "taskId": "task-004",
  "metadata": {
    "key": "value"
  },
  "terminal": "RL4"
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `type`: "command_start" | "command_end" | "file_created" | "git_commit" | "custom" (required)
- `taskId`: String (required)
- `command`: String (required for command_start)
- `status`: "success" | "failure" (required for command_end)
- `exitCode`: Integer (required for command_end)
- `durationMs`: Integer (optional for command_end)
- `file`: String (required for file_created)
- `metadata`: Object (optional, for git_commit and custom)
- `terminal`: Always "RL4" (required)

**Edge Cases:**
- If helper scripts fail → Lines may be missing (incomplete pairs)
- If user types manually → Format may vary (validation needed)
- If command times out → No command_end line written

**Variants:**
- 5 event types (see schemas above)
- Custom events have flexible metadata

---

### File: `diagnostics/health.jsonl`

**Format:** One JSON object per line (every 10s from HealthMonitor)

**Schema:**
```json
{
  "timestamp": "2025-11-16T11:05:00.000Z",
  "type": "health_check",
  "eventLoopLatency": {
    "p50": 0.07,
    "p95": 0.15,
    "p99": 0.25
  },
  "uptime": 1500000,
  "status": "healthy"
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `type`: Always "health_check" (required)
- `eventLoopLatency`: Object (required)
  - `p50`: Float (milliseconds, required)
  - `p95`: Float (milliseconds, required)
  - `p99`: Float (milliseconds, required)
- `uptime`: Integer (milliseconds, required)
- `status`: "healthy" | "degraded" | "unhealthy" (required)

**Edge Cases:**
- If event loop blocked → Latencies may be very high (>1000ms)
- If uptime overflows → UNKNOWN behavior (depends on Node.js)

**Variants:**
- None (always same format)

---

### File: `diagnostics/git_pool.jsonl`

**Format:** One JSON object per line (every git command)

**Schema:**
```json
{
  "timestamp": "2025-11-16T11:10:00.000Z",
  "command": "git log -1 --format=%H",
  "duration": 25,
  "exitCode": 0,
  "stdout": "a1b2c3d4e5f6...",
  "stderr": "",
  "timedOut": false
}
```

**Field Types:**
- `timestamp`: ISO 8601 string (required)
- `command`: String (required)
- `duration`: Integer (milliseconds, required)
- `exitCode`: Integer (required, 0 = success)
- `stdout`: String (required, may be empty)
- `stderr`: String (required, may be empty)
- `timedOut`: Boolean (required)

**Edge Cases:**
- If command times out → `timedOut: true`, `exitCode: null`, `stderr: "Command timed out"`
- If command fails → `exitCode: non-zero`, `stderr: error message`
- If stdout/stderr are huge → NO truncation (memory leak)

**Variants:**
- None (always same format)

---

### File: `logs/structured.jsonl`

**Format:** UNKNOWN (need code inspection)

**Purpose:** UNKNOWN (may be legacy or unused)

**TRUTH:** This file exists in .reasoning_rl4/ but writer is UNKNOWN

---


