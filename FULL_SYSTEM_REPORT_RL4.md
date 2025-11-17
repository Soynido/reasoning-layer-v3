# 🔍 RL4 Extension — Complete System Report

**Generated:** 2025-11-16  
**Version:** 3.5.10  
**Workspace:** `/Users/valentingaludec/Reasoning Layer V3`  
**Report Type:** Exhaustive Reconstruction Documentation

---

## 1. High-Level Vision (Current)

### What RL4 Is Now

**RL4 (Reasoning Layer 4)** is a VS Code extension that solves the problem of **context loss** in software development. It captures development activity, generates structured prompts for AI agents, and maintains reasoning history across sessions.

### Product Vision

RL4 positions itself as a **"Dev Continuity System"** with the tagline: *"Never lose your cognitive thread."*

**Core Promise:**
- Capture everything you do (commits, file changes, decisions)
- Generate AI-ready context snapshots on demand
- Maintain a searchable history of "why" decisions were made
- Bridge between human developer and AI agents (Cursor, Claude, ChatGPT)

### Role of Reasoning

**Explicit Reasoning (Visible to User):**
- **Snapshots:** User generates cognitive snapshots via command palette
- **ADRs:** Architecture Decision Records auto-generated and visible
- **Tasks.RL4:** User-managed task list with metadata (`@rl4:id`, `@rl4:completeWhen`)
- **Dev Tab:** Visual interface showing proposals, verifications, patterns

**Hidden Reasoning (Background):**
- **Pattern Learning:** TerminalPatternsLearner analyzes command patterns (runs in background)
- **Correlation Engine:** Finds relationships between events (runs every 10s)
- **Forecast Engine:** Predicts future decisions (runs every 10s)
- **ADR Generation:** Auto-proposes architecture decisions (runs every 10s)
- **Anomaly Detection:** Detects unusual activity (runs on snapshot generation)

### Real-World Use Cases

1. **Context Switching:** Return to a project after weeks, generate snapshot → instant context
2. **AI Agent Integration:** Copy snapshot → paste in Cursor/Claude → agent has full context
3. **Team Handoffs:** Generate handoff report with decisions, goals, blockers
4. **Post-Mortem Analysis:** Query event history to understand what changed
5. **Task Verification:** Execute tasks in RL4 Terminal → auto-verification → mark as done

---

## 2. Architecture Overview (Current Reality)

### 2.1 Kernel Components

**Core Kernel (`extension/kernel/`):**

1. **TimerRegistry.ts** (120 lines)
   - Centralized timer management
   - Prevents memory leaks from orphaned timers
   - Status: ✅ Core, essential

2. **AppendOnlyWriter.ts** (199 lines)
   - JSONL append-only writer
   - No array rewrites (memory efficient)
   - Used for: `git_commits.jsonl`, `file_changes.jsonl`, `terminal-events.jsonl`, `decisions.jsonl`
   - Status: ✅ Core, essential

3. **ExecPool.ts** (200 lines)
   - Git command execution pool
   - Concurrency: 2, Timeout: 2s
   - Used by: GitCommitListener, GitHub integrations
   - Status: ✅ Core, essential

4. **StateRegistry.ts** (110 lines)
   - Periodic state snapshots
   - Status: ✅ Core, essential

5. **HealthMonitor.ts** (190 lines)
   - System health tracking
   - Event loop monitoring
   - Status: ✅ Core, essential

6. **CognitiveScheduler.ts** (727 lines)
   - **Single master scheduler** orchestrating cognitive cycle
   - Runs every 10 seconds (configurable: `cognitive_cycle_interval_ms`)
   - Phases: Pattern Learning → Correlation → Forecasting → ADR Synthesis
   - Idempotence: Skips if input hash unchanged
   - Status: ✅ Core, essential

7. **RBOMLedger.ts** (150 lines)
   - Append-only ADR ledger with Merkle verification
   - Status: ✅ Core, essential

8. **EvidenceGraph.ts** (80 lines)
   - Inverted index (trace → artifacts)
   - Status: ✅ Core, essential

9. **KernelAPI.ts** (90 lines)
   - Public API (status, reflect, flush, shutdown)
   - Status: ✅ Core, essential

10. **KernelBootstrap.ts** (186 lines)
    - Loads kernel artifacts on startup
    - Restores state from `.reasoning_rl4/kernel/state.json.gz`
    - Status: ✅ Core, essential

11. **CognitiveLogger.ts** (COGNITIVE_LOGGER_README.md)
    - Structured logging with emojis
    - Hourly summaries
    - Status: ✅ Core, essential

12. **MemoryMonitor.ts** (NEW, untracked)
    - Memory usage tracking
    - Baseline snapshots
    - Status: 🟡 Experimental, Phase E4.1

13. **MemoryWatchdog.ts** (NEW, untracked)
    - Alerts if RAM > threshold (500 MB)
    - Checks every 5 minutes
    - Status: 🟡 Experimental, Phase E4.1

**Kernel API (`extension/kernel/api/`):**

1. **UnifiedPromptBuilder.ts** (2087 lines)
   - **Core snapshot generator**
   - Returns `{ prompt: string, metadata: { anomalies, compression } }`
   - Integrates: AnomalyDetector, PromptOptimizer
   - Chat Memory section (prioritizes chat > Tasks > Plan > Snapshot)
   - Status: ✅ Core, essential

2. **AdaptivePromptBuilder.ts**
   - Wrapper for UnifiedPromptBuilder (backward compatibility)
   - Returns `Promise<string>` (extracts `result.prompt`)
   - Status: ✅ Core, essential

3. **PromptOptimizer.ts** (357 lines)
   - 4 compression modes: strict/flexible/exploratory/free
   - Reduces prompt size by 40-60% (strict) to 0% (free)
   - Status: ✅ Core, essential

4. **AnomalyDetector.ts** (345 lines)
   - 5 anomaly types: sudden_change, regression, unusual_activity, bias_spike, plan_drift
   - Severity: low/medium/high/critical
   - Status: ✅ Core, essential

5. **TasksRL4Parser.ts** (108 lines)
   - Parses `Tasks.RL4` file
   - Extracts `@rl4:id` and `@rl4:completeWhen` markers
   - Checks conditions: `exitCode 0`, `test passing`, `file exists: X`, etc.
   - Status: ✅ Core, essential

6. **TaskVerificationEngine.ts** (195 lines)
   - Reads `terminal-events.jsonl`
   - Matches events with tasks (by `@rl4:id`)
   - Calculates confidence: HIGH (100% + exitCode 0), MEDIUM (>50%), LOW (<50%)
   - Cursor-based reading (avoids reprocessing events)
   - Status: ✅ Core, essential

7. **TerminalPatternsLearner.ts** (476 lines)
   - Auto-learns from terminal events
   - Fuzzy matching (Jaccard similarity, 60% threshold)
   - Auto-suggests `@rl4:completeWhen` for new tasks
   - Detects anomalies: success rate drop, unusual duration, command change
   - Command classification: setup/build/test/debug/deploy/document
   - Persists to `terminal-patterns.json`
   - Status: ✅ Core, essential

8. **AdHocTracker.ts** (NEW, untracked)
   - Tracks ad-hoc actions (not in Tasks.RL4)
   - Writes to `ad-hoc-actions.jsonl`
   - Status: 🟡 Experimental, Phase E5

9. **SnapshotReminder.ts** (178 lines)
   - Timer: checks every 30min if last snapshot >2h
   - Auto-suggests mode based on Tasks.RL4 + cycles.jsonl
   - Status: ✅ Core, essential

10. **ADRParser.ts**
    - Parses `ADRs.RL4` file
    - Status: ✅ Core, essential

11. **PlanTasksContextParser.ts**
    - Parses `Plan.RL4` and `Tasks.RL4`
    - Extracts tasks, priorities, metadata
    - Status: ✅ Core, essential

12. **CommitContextCollector.ts**
    - Collects git commit context
    - Status: ✅ Core, essential

13. **CommitPromptGenerator.ts**
    - Generates commit prompts with "WHY"
    - Status: ✅ Core, essential

**Kernel Inputs (`extension/kernel/inputs/`):**

1. **GitCommitListener.ts**
   - Watches for git commits
   - Writes to `traces/git_commits.jsonl`
   - Increments commit counter for hourly summary
   - Status: ✅ Core, essential

2. **FileChangeWatcher.ts** (539 lines)
   - Watches file changes (chokidar)
   - Aggregates changes every 30 seconds
   - Writes to `traces/file_changes.jsonl`
   - Status: ✅ Core, essential

3. **IDEActivityListener.ts**
   - Tracks IDE events (editor changes, focus, etc.)
   - Writes to `traces/ide_activity.jsonl`
   - Status: ✅ Core, essential
   - ⚠️ **MEMORY LEAK:** Event listeners not disposed (Phase E4.1 fix needed)

4. **BuildMetricsListener.ts**
   - Tracks build metrics
   - Status: ✅ Core, essential
   - ⚠️ **MEMORY LEAK:** Event listeners not disposed (Phase E4.1 fix needed)

**Kernel Cognitive (`extension/kernel/cognitive/`):**

1. **PatternLearningEngine.ts**
   - Analyzes patterns from traces
   - Writes to `patterns.json`
   - Status: ✅ Core, essential

2. **CorrelationEngine.ts**
   - Finds correlations between events
   - Status: ✅ Core, essential

3. **ForecastEngine.ts**
   - Generates forecasts (predictive insights)
   - Adaptive baseline (0.73 default)
   - Metrics: forecast_precision, improvement_rate
   - Status: ✅ Core, essential

4. **ADRGeneratorV2.ts**
   - Auto-generates ADR proposals
   - Writes to `adrs/auto/`
   - Status: ✅ Core, essential

5. **PatternEvolutionTracker.ts**
   - Tracks pattern changes over time
   - Status: ✅ Core, essential

6. **FeedbackEvaluator.ts**
   - Evaluates feedback every 100 cycles
   - Status: ✅ Core, essential

**Kernel Indexer (`extension/kernel/indexer/`):**

1. **CacheIndex.ts** (RL4CacheIndexer)
   - Indexes cache for fast lookups
   - Status: ✅ Core, essential

2. **ContextSnapshot.ts** (ContextSnapshotGenerator)
   - Generates context snapshots
   - Status: ✅ Core, essential

3. **TimelineAggregator.ts**
   - Aggregates timeline data
   - Status: ✅ Core, essential

4. **DataNormalizer.ts**
   - Normalizes data formats
   - Status: ✅ Core, essential

5. **SnapshotRotation.ts**
   - Rotates old snapshots
   - Status: ✅ Core, essential

**Legacy Core (`extension/core/`):**

**Status:** 🟡 **DEPRECATED/DUPLICATED** — Most files are legacy from RL3, not actively used in RL4 kernel architecture. Some may be referenced but kernel components take precedence.

**Key Legacy Files:**
- `core/base/PatternLearningEngine.ts` — Duplicated by `kernel/cognitive/PatternLearningEngine.ts`
- `core/base/CorrelationEngine.ts` — Duplicated by `kernel/cognitive/CorrelationEngine.ts`
- `core/base/ForecastEngine.ts` — Duplicated by `kernel/cognitive/ForecastEngine.ts`
- `core/base/ADRGeneratorV2.ts` — Duplicated by `kernel/cognitive/ADRGeneratorV2.ts`
- `core/inputs/FileChangeWatcher.ts` — Duplicated by `kernel/inputs/FileChangeWatcher.ts`
- `core/inputs/GitCommitListener.ts` — Duplicated by `kernel/inputs/GitCommitListener.ts`

**Status Assessment:**
- ❌ **Should be removed** in reconstruction (causes confusion)
- ✅ **Kernel versions are authoritative**

### 2.2 Background Data

**`.reasoning_rl4/` Directory Structure:**

```
.reasoning_rl4/
├── adrs/
│   ├── active.json              # Current ADRs (parsed from ADRs.RL4)
│   └── auto/                    # Auto-generated ADR proposals
├── ADRs.RL4                     # User-managed ADR file (markdown)
├── cache/
│   └── index.json               # Cache index for fast lookups
├── context_history/
│   ├── index.json               # Index of snapshots
│   └── snapshot-*.json          # Historical snapshots (610-900+)
├── context.json                  # Latest cognitive snapshot (generated)
├── Context.RL4                   # Operational context (KPIs, risks, observations)
├── diagnostics/
│   ├── git_pool.jsonl            # Git command execution log
│   ├── git_pool-*.jsonl.gz       # Rotated/compressed logs
│   └── health.jsonl              # Health monitoring data
├── history/                      # (Empty or legacy)
├── kernel/
│   └── state.json.gz             # Kernel state (compressed)
├── kernel_config.json            # Kernel configuration (feature flags, intervals)
├── ledger/
│   ├── cycles.jsonl             # Cognitive cycle results (append-only)
│   └── decisions.jsonl           # User decisions (accept/reject proposals, mark done)
├── logs/
│   └── structured.jsonl          # Structured logs
├── patterns.json                  # Detected patterns (from PatternLearningEngine)
├── Plan.RL4                      # Strategic vision (phases, goals, success criteria)
├── proposals.json                 # LLM proposals (from parseLLMResponse or manual)
├── reminder_state.json            # SnapshotReminder state (last snapshot timestamp)
├── state/
│   └── kernel.json                # Kernel state (uncompressed)
├── Tasks.RL4                      # User-managed task list (markdown with @rl4:* markers)
├── terminal-events.jsonl          # Terminal execution events (from RL4 Terminal)
├── terminal-patterns.json         # Learned terminal patterns (from TerminalPatternsLearner)
├── timelines/
│   ├── 2025-11-16.json            # Timeline data per day
│   └── 2025-11-17.json
└── traces/
    ├── file_changes.jsonl         # File modification events
    ├── git_commits.jsonl           # Git commit events
    └── ide_activity.jsonl         # IDE activity events
```

**File Purposes:**

- **Plan.RL4:** Strategic vision, phases, goals, deviation modes (strict/flexible/exploratory/free)
- **Tasks.RL4:** Tactical TODOs with priorities (P0/P1/P2), metadata (`@rl4:id`, `@rl4:completeWhen`)
- **Context.RL4:** Operational context (KPIs, cognitive load, risks, agent observations)
- **ADRs.RL4:** Architecture Decision Records (user-managed)
- **proposals.json:** LLM-generated task proposals (from `parseLLMResponse` or manual)
- **terminal-events.jsonl:** Terminal execution events (from RL4 Terminal markers)
- **terminal-patterns.json:** Learned patterns (auto-updated by TerminalPatternsLearner)
- **decisions.jsonl:** Audit trail of user decisions (accept/reject, mark done)
- **cycles.jsonl:** Cognitive cycle results (every 10s)
- **patterns.json:** Detected patterns (from PatternLearningEngine)
- **context.json:** Latest snapshot (generated on demand)
- **context_history/:** Historical snapshots (for restoration)

### 2.3 WebView

**Current UI (`extension/webview/ui/src/App.tsx` - 1447 lines):**

**4 Tabs:**

1. **Control Tab:**
   - **Generate Snapshot** button (4 modes: Strict/Flexible/Exploratory/Free)
   - **Parse LLM Response** button (reads clipboard, writes to proposals.json)
   - **GitHub Integration** section (connect, commit with WHY)
   - **Commit Prompt Generator** (generates commit message with reasoning)

2. **Dev Tab:**
   - **Proposed Tasks** section (from proposals.json)
     - Cards with: title, priority, bias, effort, ROI, why
     - Accept/Reject buttons
     - Patch preview (shows diff before applying)
     - Apply Patch button (updates Tasks.RL4)
   - **Verified Tasks** section (from TaskVerificationEngine)
     - Badge "✅ Verified by RL4" (confidence: HIGH/MEDIUM/LOW)
     - "Mark as Done" button (checks task in Tasks.RL4)
     - Matched conditions + events (collapsible)
   - **Suggested Conditions** section (from TerminalPatternsLearner)
     - Tasks without `@rl4:completeWhen` + auto-suggestions
     - "Apply Suggestion" button
   - **Suggested from Activity** section (from AdHocTracker)
     - Ad-hoc actions converted to task proposals
     - Badge "🔧 Ad-Hoc"

3. **Insights Tab:**
   - **Sub-tabs:** KPIs / Patterns
   - **KPIs Sub-tab:**
     - CognitiveLoadCard (load %, bursts, switches)
     - NextStepsCard (P0 tasks)
     - PlanDriftCard (drift %, justification)
     - RisksCard (critical/medium/low risks)
     - AnomaliesCard (detected anomalies with severity)
   - **Patterns Sub-tab:**
     - PatternsCard (learned terminal patterns)
     - Pattern anomalies (success rate drops, unusual durations)

4. **About Tab:**
   - Extension info, version, links

**Data Sources:**

- **Context.RL4:** Parsed for KPIs (cognitive load, next steps, plan drift, risks)
- **proposals.json:** Read via FileWatcher, sent to WebView on change
- **Tasks.RL4:** Read for task list, updated on "Apply Patch" / "Mark as Done"
- **terminal-events.jsonl:** Read by TaskVerificationEngine (every 10s)
- **terminal-patterns.json:** Read on "requestPatterns" message
- **ADRs.RL4:** Read for Insights tab (future)

**Message Handlers (extension.ts → WebView):**

- `generateSnapshot` → Generates snapshot, sends `snapshotGenerated`
- `parseLLMResponse` → Reads clipboard, writes proposals.json, sends `proposalsParsed`
- `submitDecisions` → Generates patch preview, sends `patchPreview`
- `applyPatch` → Applies patch to Tasks.RL4, sends `taskLogChanged`
- `markTaskDone` → Checks task in Tasks.RL4, sends `taskMarkedDone`
- `requestPatterns` → Loads patterns, sends `patternsUpdated`
- `requestSuggestions` → Generates suggestions, sends `suggestionsUpdated`
- `applySuggestion` → Updates Tasks.RL4 with suggestion
- `githubStatus` → Checks GitHub connection
- `generateCommitPrompt` → Generates commit prompt with WHY
- `executeCommit` → Executes git commit via ExecPool

**FileWatchers (extension.ts):**

- **proposals.json:** Watches for changes, sends `proposalsUpdated` to WebView
- **Tasks.RL4:** Watches for changes, sends `taskLogChanged` to WebView

### 2.4 FileWatchers

**Active Watchers:**

1. **GitCommitListener** (`extension/kernel/inputs/GitCommitListener.ts`)
   - **What:** Watches for git commits (via git hooks or polling)
   - **Writes to:** `.reasoning_rl4/traces/git_commits.jsonl`
   - **Status:** ✅ Active

2. **FileChangeWatcher** (`extension/kernel/inputs/FileChangeWatcher.ts`)
   - **What:** Watches file changes (chokidar)
   - **Tracks:** All files in workspace (except ignored patterns)
   - **Aggregates:** Every 30 seconds
   - **Writes to:** `.reasoning_rl4/traces/file_changes.jsonl`
   - **Status:** ✅ Active

3. **IDEActivityListener** (`extension/kernel/inputs/IDEActivityListener.ts`)
   - **What:** Watches IDE events (editor changes, focus, etc.)
   - **Writes to:** `.reasoning_rl4/traces/ide_activity.jsonl`
   - **Status:** ✅ Active
   - ⚠️ **MEMORY LEAK:** Event listeners not disposed

4. **BuildMetricsListener** (`extension/kernel/inputs/BuildMetricsListener.ts`)
   - **What:** Watches build metrics
   - **Status:** ✅ Active
   - ⚠️ **MEMORY LEAK:** Event listeners not disposed

5. **proposals.json FileWatcher** (in extension.ts)
   - **What:** Watches `.reasoning_rl4/proposals.json`
   - **Action:** Sends `proposalsUpdated` to WebView
   - **Status:** ✅ Active

6. **Tasks.RL4 FileWatcher** (in extension.ts)
   - **What:** Watches `.reasoning_rl4/Tasks.RL4`
   - **Action:** Sends `taskLogChanged` to WebView
   - **Status:** ✅ Active

7. **LiveWatcher** (`extension/kernel/api/hooks/LiveWatcher.ts`)
   - **What:** Watches entire `.reasoning_rl4/` directory
   - **Purpose:** Detects changes to RL4 files (Plan, Tasks, Context, ADRs)
   - **Status:** ❓ Unknown if active (may be legacy)

---

## 3. File System Inventory (Exact, Exhaustive)

### `/Users/valentingaludec/Reasoning Layer V3/extension/`

**Total Files:** ~188 TypeScript files

#### Core Entry Point

- **extension.ts** (1778 lines)
  - **Status:** ✅ **ESSENTIAL** — Main extension entry point
  - **Purpose:** Activates extension, registers commands, creates WebView, handles messages
  - **Key Functions:**
    - `activate()` — Initializes kernel, creates WebView, registers commands
    - `getWebviewHtml()` — Generates HTML for WebView
    - Message handlers (generateSnapshot, parseLLMResponse, submitDecisions, etc.)

#### Kernel Directory (`extension/kernel/`)

**Core Kernel (11 files):**
- `TimerRegistry.ts` — ✅ **ESSENTIAL**
- `AppendOnlyWriter.ts` — ✅ **ESSENTIAL**
- `ExecPool.ts` — ✅ **ESSENTIAL**
- `StateRegistry.ts` — ✅ **ESSENTIAL**
- `HealthMonitor.ts` — ✅ **ESSENTIAL**
- `CognitiveScheduler.ts` — ✅ **ESSENTIAL**
- `RBOMLedger.ts` — ✅ **ESSENTIAL**
- `EvidenceGraph.ts` — ✅ **ESSENTIAL**
- `KernelAPI.ts` — ✅ **ESSENTIAL**
- `KernelBootstrap.ts` — ✅ **ESSENTIAL**
- `CognitiveLogger.ts` — ✅ **ESSENTIAL**

**Memory Management (2 files, NEW):**
- `MemoryMonitor.ts` — 🟡 **EXPERIMENTAL** (Phase E4.1)
- `MemoryWatchdog.ts` — 🟡 **EXPERIMENTAL** (Phase E4.1)

**Kernel API (`extension/kernel/api/` - 25 files):**
- `UnifiedPromptBuilder.ts` (2087 lines) — ✅ **ESSENTIAL**
- `AdaptivePromptBuilder.ts` — ✅ **ESSENTIAL**
- `PromptOptimizer.ts` (357 lines) — ✅ **ESSENTIAL**
- `AnomalyDetector.ts` (345 lines) — ✅ **ESSENTIAL**
- `TasksRL4Parser.ts` (108 lines) — ✅ **ESSENTIAL**
- `TaskVerificationEngine.ts` (195 lines) — ✅ **ESSENTIAL**
- `TerminalPatternsLearner.ts` (476 lines) — ✅ **ESSENTIAL**
- `SnapshotReminder.ts` (178 lines) — ✅ **ESSENTIAL**
- `ADRParser.ts` — ✅ **ESSENTIAL**
- `PlanTasksContextParser.ts` — ✅ **ESSENTIAL**
- `CommitContextCollector.ts` — ✅ **ESSENTIAL**
- `CommitPromptGenerator.ts` — ✅ **ESSENTIAL**
- `AdHocTracker.ts` — 🟡 **EXPERIMENTAL** (Phase E5)
- `StateReconstructor.ts` — ✅ **ESSENTIAL**
- `ContextSnapshotGenerator.ts` — ✅ **ESSENTIAL**
- `TimelineAggregator.ts` — ✅ **ESSENTIAL**
- `DataNormalizer.ts` — ✅ **ESSENTIAL**
- `SnapshotRotation.ts` — ✅ **ESSENTIAL**
- `CacheIndex.ts` — ✅ **ESSENTIAL**
- `LiveWatcher.ts` — ❓ **UNKNOWN** (may be legacy)
- `hooks/` — ❓ **UNKNOWN** (may be legacy)
- Other API files — ❓ **UNKNOWN** (need inspection)

**Kernel Cognitive (`extension/kernel/cognitive/` - 11 files):**
- `PatternLearningEngine.ts` — ✅ **ESSENTIAL**
- `CorrelationEngine.ts` — ✅ **ESSENTIAL**
- `ForecastEngine.ts` — ✅ **ESSENTIAL**
- `ADRGeneratorV2.ts` — ✅ **ESSENTIAL**
- `PatternEvolutionTracker.ts` — ✅ **ESSENTIAL**
- `FeedbackEvaluator.ts` — ✅ **ESSENTIAL**
- `types.ts` — ✅ **ESSENTIAL**
- Other cognitive files — ❓ **UNKNOWN** (need inspection)

**Kernel Inputs (`extension/kernel/inputs/` - 4 files):**
- `GitCommitListener.ts` — ✅ **ESSENTIAL**
- `FileChangeWatcher.ts` (539 lines) — ✅ **ESSENTIAL**
- `IDEActivityListener.ts` — ✅ **ESSENTIAL** (⚠️ memory leak)
- `BuildMetricsListener.ts` — ✅ **ESSENTIAL** (⚠️ memory leak)

**Kernel Indexer (`extension/kernel/indexer/` - 5 files):**
- `CacheIndex.ts` — ✅ **ESSENTIAL**
- `ContextSnapshot.ts` — ✅ **ESSENTIAL**
- `TimelineAggregator.ts` — ✅ **ESSENTIAL**
- `DataNormalizer.ts` — ✅ **ESSENTIAL**
- `SnapshotRotation.ts` — ✅ **ESSENTIAL**

**Kernel Other:**
- `config.ts` — ✅ **ESSENTIAL**
- `cli.ts` — ✅ **ESSENTIAL** (standalone CLI)
- `index.ts` — ✅ **ESSENTIAL** (exports)
- `README.md` — ✅ **ESSENTIAL** (documentation)
- `adapters/` (3 files) — ✅ **ESSENTIAL** (RL3 compatibility)
- `onboarding/` (4 files) — ✅ **ESSENTIAL**
- `bootstrap/` (1 file) — ✅ **ESSENTIAL**
- `detection/` (1 file) — ✅ **ESSENTIAL**

#### Core Directory (`extension/core/`)

**Status:** 🟡 **DEPRECATED/DUPLICATED** — Legacy from RL3, mostly unused in RL4 kernel architecture.

**Assessment:**
- ❌ **Should be removed** in reconstruction (causes confusion)
- ✅ **Kernel versions are authoritative**
- ⚠️ **Some files may be referenced** but should be migrated to kernel

**Key Duplications:**
- `core/base/PatternLearningEngine.ts` → Duplicated by `kernel/cognitive/PatternLearningEngine.ts`
- `core/base/CorrelationEngine.ts` → Duplicated by `kernel/cognitive/CorrelationEngine.ts`
- `core/base/ForecastEngine.ts` → Duplicated by `kernel/cognitive/ForecastEngine.ts`
- `core/base/ADRGeneratorV2.ts` → Duplicated by `kernel/cognitive/ADRGeneratorV2.ts`
- `core/inputs/FileChangeWatcher.ts` → Duplicated by `kernel/inputs/FileChangeWatcher.ts`
- `core/inputs/GitCommitListener.ts` → Duplicated by `kernel/inputs/GitCommitListener.ts`

**Files to Keep (if referenced):**
- `core/integrations/GitHubFineGrainedManager.ts` — ✅ **ESSENTIAL** (used in extension.ts)
- `core/integrations/GitHubCLIManager.ts` — ✅ **ESSENTIAL** (used in extension.ts)
- `core/integrations/CursorChatIntegration.ts` — ❓ **UNKNOWN**

**Files to Remove:**
- All `core/base/` files (duplicated)
- All `core/inputs/` files (duplicated)
- Most other `core/` files (legacy, not used)

#### WebView Directory (`extension/webview/ui/`)

**Status:** ✅ **ESSENTIAL** — React app for WebView UI

**Key Files:**
- `src/App.tsx` (1447 lines) — ✅ **ESSENTIAL** (main UI component)
- `src/components/` (21 .tsx files) — ✅ **ESSENTIAL**
  - `AnomaliesCard.tsx` — ✅ **ESSENTIAL**
  - `PatternsCard.tsx` — ✅ **ESSENTIAL**
  - `CognitiveLoadCard.tsx` — ✅ **ESSENTIAL**
  - `NextStepsCard.tsx` — ✅ **ESSENTIAL**
  - `PlanDriftCard.tsx` — ✅ **ESSENTIAL**
  - `RisksCard.tsx` — ✅ **ESSENTIAL**
  - Other components — ✅ **ESSENTIAL**
- `src/utils/` (9 .ts files) — ✅ **ESSENTIAL**
  - `contextParser.ts` — ✅ **ESSENTIAL**
  - `logger.ts` — ✅ **ESSENTIAL** (memory-safe logger)
  - `prompts.ts` — ✅ **ESSENTIAL**
- `src/api/` — ✅ **ESSENTIAL**
- `src/types/` — ✅ **ESSENTIAL**
- `src/*.css` (11 files) — ✅ **ESSENTIAL**
- `vite.config.ts` — ✅ **ESSENTIAL**
- `tailwind.config.ts` — ✅ **ESSENTIAL**

#### Commands Directory (`extension/commands/`)

- `adr-validation.ts` — ✅ **ESSENTIAL** (ADR validation commands)

#### Scripts Directory (`scripts/`)

- `rl4-log.js` (162 lines) — ✅ **ESSENTIAL** (Node.js helper)
- `rl4-log.sh` (198 lines) — ✅ **ESSENTIAL** (Bash helper)

### `/Users/valentingaludec/Reasoning Layer V3/.reasoning_rl4/`

**Status:** ✅ **ESSENTIAL** — All files are essential for RL4 operation

**Key Files:**
- `Plan.RL4` — ✅ **ESSENTIAL**
- `Tasks.RL4` — ✅ **ESSENTIAL**
- `Context.RL4` — ✅ **ESSENTIAL**
- `ADRs.RL4` — ✅ **ESSENTIAL**
- `proposals.json` — ✅ **ESSENTIAL**
- `terminal-events.jsonl` — ✅ **ESSENTIAL**
- `terminal-patterns.json` — ✅ **ESSENTIAL**
- `decisions.jsonl` — ✅ **ESSENTIAL**
- `cycles.jsonl` — ✅ **ESSENTIAL**
- `patterns.json` — ✅ **ESSENTIAL**
- `context.json` — ✅ **ESSENTIAL**
- `kernel_config.json` — ✅ **ESSENTIAL**
- `kernel/state.json.gz` — ✅ **ESSENTIAL**
- `traces/*.jsonl` — ✅ **ESSENTIAL**
- `context_history/*.json` — ✅ **ESSENTIAL**
- `diagnostics/*.jsonl` — ✅ **ESSENTIAL**
- `ledger/*.jsonl` — ✅ **ESSENTIAL**

---

## 4. Functional Behavior (Cycle by Cycle)

### What Happens Every 10 Seconds

**Cognitive Cycle (CognitiveScheduler.runCycle):**

1. **Input Hash Calculation** (idempotence check)
   - Calculates hash of input data
   - If same as last cycle → **SKIP** (no changes)
   - If different → **PROCEED**

2. **Phase 1: Pattern Learning** (`pattern-learning`)
   - `PatternLearningEngine.analyzePatterns()`
   - Reads: `traces/file_changes.jsonl`, `traces/git_commits.jsonl`, `traces/ide_activity.jsonl`
   - Writes: `patterns.json` (updated)
   - Tracks pattern evolution (PatternEvolutionTracker)

3. **Phase 2: Correlation** (`correlation`)
   - `CorrelationEngine.analyze()`
   - Finds relationships between events
   - Writes: (internal state, may write to cache)

4. **Phase 3: Forecasting** (`forecasting`)
   - `ForecastEngine.generate()`
   - Generates predictive insights
   - Updates metrics: `forecast_precision`, `improvement_rate`
   - Writes: (internal state, may write to cache)

5. **Phase 4: ADR Synthesis** (`adr-synthesis`)
   - `ADRGeneratorV2.generateProposals()`
   - Generates ADR proposals
   - Writes: `adrs/auto/` (new ADR proposals)

6. **Cycle Aggregation**
   - Aggregates cycle results
   - Writes: `ledger/cycles.jsonl` (append-only)
   - Logs: CognitiveLogger (cycle summary)

7. **Feedback Loop** (every 100 cycles)
   - `FeedbackEvaluator.evaluate()`
   - Adjusts forecast baseline
   - Logs checkpoint summary

**Files Updated Every 10 Seconds:**
- `patterns.json` (if patterns detected)
- `ledger/cycles.jsonl` (always, append-only)
- `adrs/auto/` (if ADRs generated)
- Internal state (ForecastEngine metrics)

**What Does NOT Happen:**
- ❌ **No snapshot generation** (user-triggered only)
- ❌ **No task verification** (runs separately, every 10s via TaskVerificationEngine)
- ❌ **No terminal pattern learning** (runs separately, on-demand or periodic)
- ❌ **No WebView updates** (only on file changes or user actions)

### Task Verification (Every 10 Seconds)

**TaskVerificationEngine** (runs separately from cognitive cycle):

1. **Read Tasks.RL4**
   - Parses `@rl4:id` and `@rl4:completeWhen` markers
   - Extracts task metadata

2. **Read terminal-events.jsonl**
   - Reads new events (cursor-based, avoids reprocessing)
   - Filters events by `taskId`

3. **Match Events with Tasks**
   - Checks if `@rl4:completeWhen` conditions are met
   - Calculates confidence: HIGH/MEDIUM/LOW

4. **Send to WebView**
   - Sends `taskVerificationResults` message
   - WebView updates "Verified Tasks" section

**Files Updated:**
- None (read-only, sends messages to WebView)

### Terminal Pattern Learning (On-Demand or Periodic)

**TerminalPatternsLearner** (runs on-demand or periodic):

1. **Read terminal-events.jsonl**
   - Aggregates events by `taskId`
   - Calculates: success rate, avg duration, runs count

2. **Update terminal-patterns.json**
   - Writes learned patterns
   - Updates command classification

3. **Detect Anomalies**
   - Success rate drop (>20%)
   - Unusual duration (>2σ)
   - Command change

**Files Updated:**
- `terminal-patterns.json` (updated)

### File Change Aggregation (Every 30 Seconds)

**FileChangeWatcher** (runs separately):

1. **Aggregate Changes**
   - Collects file changes from last 30s
   - Creates summary: files modified, total edits, hotspot

2. **Write to traces/file_changes.jsonl**
   - Appends aggregated summary

**Files Updated:**
- `traces/file_changes.jsonl` (append-only, every 30s)

### Git Commit Detection (Event-Driven)

**GitCommitListener** (runs on git commit):

1. **Detect Commit**
   - Via git hooks or polling

2. **Write to traces/git_commits.jsonl**
   - Appends commit event

**Files Updated:**
- `traces/git_commits.jsonl` (append-only, on commit)

---

## 5. Current Limitations / Broken Parts

### Critical Issues

1. **Memory Leaks (Phase E4.1 - CRITICAL)**
   - **Extension-host:** 770 MB after 1h30 → 164 GB after 2 months (crash certain)
   - **Renderer:** 1.18 GB after 1h30 → 252 GB after 2 months (crash certain)
   - **Root Causes:**
     - Event listeners never disposed (IDEActivityListener, BuildMetricsListener)
     - ExecPool buffers never released (2563 ops accumulated)
     - Console.log accumulation in renderer
     - JSONL files grow linearly without rotation
   - **Status:** 🔴 **CRITICAL** — Sprint E4.1 planned but not completed
   - **Fix Applied:** `retainContextWhenHidden: false` (frees ~1 GB when dashboard closed)

2. **Missing Implementation: Parse LLM Response**
   - **Status:** ✅ **FIXED** (Phase E4 completed)
   - **Handler exists:** `parseLLMResponse` in extension.ts
   - **Button exists:** "📋 Parse LLM Response" in Control Tab

3. **Missing Implementation: Helper Scripts**
   - **Status:** ✅ **FIXED** (Phase E4 completed)
   - **Files exist:** `scripts/rl4-log.js`, `scripts/rl4-log.sh`

4. **Pattern Learning UI Not Visible**
   - **Status:** 🟡 **PARTIAL** — Backend works, UI exists but may not be fully integrated
   - **Backend:** TerminalPatternsLearner works (476 lines)
   - **UI:** PatternsCard exists, Patterns tab exists
   - **Issue:** User may not see patterns unless they click "Patterns" tab

5. **Ad-Hoc Tracker Not Integrated**
   - **Status:** 🟡 **EXPERIMENTAL** — AdHocTracker.ts exists but may not be fully integrated
   - **File:** `extension/kernel/cognitive/AdHocTracker.ts` (untracked)
   - **Issue:** Ad-hoc actions may not be tracked automatically

### Useless Modules

1. **Legacy Core Directory (`extension/core/`)**
   - **Status:** ❌ **DEPRECATED** — Duplicated by kernel versions
   - **Impact:** Confusion, maintenance burden
   - **Action:** Remove in reconstruction

2. **Mock Health Data in CognitiveScheduler**
   - **Status:** 🟡 **FAKE** — Lines 474-478 use `Math.random()` for health metrics
   - **Impact:** Fake data, not real health monitoring
   - **Action:** Replace with real HealthMonitor data

3. **Unused API Files**
   - **Status:** ❓ **UNKNOWN** — Some files in `kernel/api/` may be unused
   - **Action:** Audit and remove unused files

### Fake-Intelligent Behavior

1. **Forecast Engine Mock Baseline**
   - **Status:** 🟡 **PARTIAL** — Uses adaptive baseline (0.73 default) but may not be accurate
   - **Impact:** Forecasts may not be meaningful

2. **Pattern Learning May Not Evolve**
   - **Status:** 🟡 **UNKNOWN** — Patterns may be detected but not used effectively
   - **Impact:** Patterns exist but don't improve workflow

3. **Anomaly Detection May Be Too Sensitive**
   - **Status:** 🟡 **UNKNOWN** — May detect false positives
   - **Impact:** User ignores anomalies if too many false positives

### Insights That Don't Matter

1. **Cognitive Load Calculation**
   - **Status:** 🟡 **QUESTIONABLE** — Formula may not reflect real cognitive load
   - **Impact:** KPI may be meaningless

2. **Plan Drift Calculation**
   - **Status:** 🟡 **QUESTIONABLE** — May not accurately measure drift
   - **Impact:** KPI may be meaningless

3. **Forecast Precision**
   - **Status:** 🟡 **QUESTIONABLE** — May not be validated against reality
   - **Impact:** Metric may be meaningless

### Patterns/Forecasts That Never Evolve

1. **Pattern Learning May Not Improve**
   - **Status:** 🟡 **UNKNOWN** — Patterns detected but may not be used to improve suggestions
   - **Impact:** Learning doesn't lead to better UX

2. **Forecast Engine May Not Learn**
   - **Status:** 🟡 **UNKNOWN** — Forecasts generated but may not improve over time
   - **Impact:** Forecasts don't get better

### UI Features That Lie

1. **"Verified by RL4" Badge**
   - **Status:** ✅ **WORKS** — Based on real terminal events
   - **Issue:** May show false positives if conditions are too loose

2. **Pattern Suggestions**
   - **Status:** 🟡 **PARTIAL** — Suggestions generated but may not be accurate
   - **Issue:** Fuzzy matching (60% threshold) may match unrelated tasks

3. **Anomaly Alerts**
   - **Status:** 🟡 **PARTIAL** — Anomalies detected but may be false positives
   - **Issue:** User may ignore if too many false positives

### Missing Wiring

1. **Task Verification Not Integrated in Cognitive Cycle**
   - **Status:** 🟡 **PARTIAL** — Runs separately, not part of cognitive cycle
   - **Impact:** Verification happens but not synchronized with cycle

2. **Terminal Pattern Learning Not Integrated in Cognitive Cycle**
   - **Status:** 🟡 **PARTIAL** — Runs on-demand, not part of cognitive cycle
   - **Impact:** Learning happens but not synchronized with cycle

3. **Ad-Hoc Tracker Not Integrated**
   - **Status:** 🟡 **EXPERIMENTAL** — Exists but may not be wired up
   - **Impact:** Ad-hoc actions not tracked automatically

### Over-Complexity That Brings No Value

1. **Multiple Pattern Learning Engines**
   - **Status:** ❌ **DUPLICATED** — `core/base/PatternLearningEngine.ts` and `kernel/cognitive/PatternLearningEngine.ts`
   - **Impact:** Confusion, maintenance burden

2. **Multiple Correlation Engines**
   - **Status:** ❌ **DUPLICATED** — `core/base/CorrelationEngine.ts` and `kernel/cognitive/CorrelationEngine.ts`
   - **Impact:** Confusion, maintenance burden

3. **Multiple Forecast Engines**
   - **Status:** ❌ **DUPLICATED** — `core/base/ForecastEngine.ts` and `kernel/cognitive/ForecastEngine.ts`
   - **Impact:** Confusion, maintenance burden

4. **Complex Cognitive Cycle**
   - **Status:** 🟡 **QUESTIONABLE** — 4 phases (Pattern → Correlation → Forecast → ADR) may be over-engineered
   - **Impact:** May not provide value proportional to complexity

5. **Multiple File Watchers**
   - **Status:** 🟡 **QUESTIONABLE** — Multiple watchers may be redundant
   - **Impact:** Performance overhead, complexity

---

## 6. User-Facing Workflow (Actual)

### Installation → First Click → First Prompt → Using Agent → Updating RL4

#### Installation

1. **User installs extension:**
   ```bash
   code --install-extension reasoning-layer-rl4-3.5.10.vsix
   ```

2. **Extension activates:**
   - Checks for workspace folder
   - Creates `.reasoning_rl4/` directory if missing
   - Initializes kernel components (TimerRegistry, ExecPool, etc.)
   - Creates WebView panel (auto-opens in column 2)
   - Starts CognitiveScheduler (delayed 3s)
   - Starts FileWatchers (GitCommitListener, FileChangeWatcher, IDEActivityListener, BuildMetricsListener)
   - Creates status bar item "🧠 RL4 Dashboard"

3. **Initialization:**
   - Creates default files: `Plan.RL4`, `Tasks.RL4`, `Context.RL4`, `ADRs.RL4` (if missing)
   - Creates `proposals.json` with empty `{ suggestedTasks: [] }`
   - Loads kernel state from `kernel/state.json.gz` (if exists)
   - Sends initial data to WebView (Context.RL4, proposals.json, Tasks.RL4, ADRs.RL4)

#### First Click

1. **User clicks status bar item or opens Dashboard:**
   - WebView opens (if not already open)
   - Shows Control Tab by default
   - Displays: "Generate Snapshot" button, "Parse LLM Response" button, GitHub integration

2. **User clicks "Generate Snapshot":**
   - QuickPick shows 4 modes: Strict/Flexible/Exploratory/Free
   - User selects mode
   - Extension calls `AdaptivePromptBuilder.buildPrompt()` or `UnifiedPromptBuilder.generate()`
   - Snapshot generated (150-300ms average)
   - Snapshot displayed in new document (VS Code editor)
   - Snapshot automatically copied to clipboard
   - WebView shows feedback: "✅ Snapshot generated!"

#### First Prompt Generation

1. **Snapshot Content:**
   - Current state (last N commits, file changes)
   - Active goals (from Tasks.RL4)
   - Decisions (from ADRs.RL4)
   - Patterns detected (from patterns.json)
   - Anomalies detected (from AnomalyDetector)
   - Compression metrics (from PromptOptimizer)

2. **User copies snapshot:**
   - Snapshot is in clipboard
   - User pastes in AI agent (Cursor, Claude, ChatGPT)

#### Using the Agent

1. **AI Agent Returns Proposals:**
   - Agent analyzes snapshot
   - Returns `RL4_PROPOSAL` JSON:
     ```json
     {
       "RL4_PROPOSAL": {
         "suggestedTasks": [
           {
             "id": "task-001",
             "title": "Add unit tests",
             "priority": "P1",
             "bias": 5
           }
         ]
       }
     }
     ```

2. **User Clicks "Parse LLM Response":**
   - Extension reads clipboard
   - Parses JSON (supports 4 formats: fenced, RL4_PROPOSAL block, raw JSON)
   - Writes to `proposals.json`
   - FileWatcher detects change
   - WebView receives `proposalsUpdated` message
   - Dev Tab badge shows: "3 nouvelles propositions"

3. **User Opens Dev Tab:**
   - Sees proposal cards
   - Clicks "Accept" or "Reject"
   - If accepted, patch preview generated
   - User clicks "Apply Patch"
   - Extension updates `Tasks.RL4` (adds task with `@rl4:id`)
   - Bias guard checks threshold (25% flexible mode)
   - If threshold exceeded, patch aborted
   - Decision logged to `decisions.jsonl`

4. **User Executes Task in RL4 Terminal:**
   - Opens RL4 Terminal: `Cmd+Shift+P` → "RL4: Open Terminal"
   - Sources helper: `source scripts/rl4-log.sh`
   - Runs task: `rl4_run task-001 "npm test"`
   - Helper writes to `terminal-events.jsonl`
   - TaskVerificationEngine (every 10s) reads events
   - Matches `taskId=task-001` with `@rl4:id=task-001` in Tasks.RL4
   - Checks `@rl4:completeWhen="exitCode 0"` condition
   - If condition met, sends `taskVerificationResults` to WebView
   - Dev Tab shows badge: "✅ Verified by RL4 (HIGH confidence)"

5. **User Clicks "Mark as Done":**
   - Extension reads Tasks.RL4
   - Finds task with `@rl4:id=task-001`
   - Replaces `- [ ]` with `- [x]`
   - Adds `@rl4:completedAt` timestamp
   - Logs to `decisions.jsonl`
   - WebView receives `taskMarkedDone` message
   - Badge removed, task marked as done

#### Updating RL4

1. **User Edits Tasks.RL4:**
   - FileWatcher detects change
   - WebView receives `taskLogChanged` message
   - Dev Tab refreshes

2. **User Edits Plan.RL4:**
   - Changes deviation mode (strict/flexible/exploratory/free)
   - Next snapshot uses new mode

3. **User Edits Context.RL4:**
   - Updates KPIs, risks, observations
   - WebView receives `kpisUpdated` message
   - Insights Tab refreshes

### What Works

✅ **Snapshot Generation:** Works perfectly, 4 modes, fast (150-300ms)  
✅ **Parse LLM Response:** Works, supports 4 formats  
✅ **Dev Tab Workflow:** Accept/Reject → Patch Preview → Apply works  
✅ **Task Verification:** Works, reads terminal-events.jsonl, matches tasks  
✅ **Mark as Done:** Works, updates Tasks.RL4, logs to decisions.jsonl  
✅ **Terminal Helper Scripts:** Work, rl4-log.js and rl4-log.sh functional  
✅ **Pattern Learning:** Backend works, learns from terminal events  
✅ **WebView UI:** 4 tabs work, real-time updates via FileWatchers  

### What Doesn't Work

❌ **Memory Leaks:** Extension-host and Renderer leak memory (Phase E4.1 not completed)  
❌ **Pattern Learning UI:** Backend works but UI may not be fully integrated  
❌ **Ad-Hoc Tracker:** Exists but may not be fully integrated  
❌ **Mock Health Data:** CognitiveScheduler uses fake health data (Math.random())  
❌ **Legacy Core Files:** Duplicated, causes confusion  

---

## 7. Vision Gap (What Valentin Wants vs What RL4 Does)

### Target User Experience (From Plan.RL4 and Context.RL4)

**Expected:**
1. **One Button:** Generate snapshot, copy, paste in agent
2. **One Prompt:** Single, optimized prompt for AI agent
3. **Bridge to External Agent:** Seamless integration with Cursor/Claude
4. **No Fakery:** No fake automation, no illusions
5. **Capture Reasoning → Restore Workspace:** Full context restoration
6. **Where am I / Where should I go / Where do I come from:** Three core questions
7. **Use RL4 as Data-Layer:** Not decision engine, just data provider

### Current Reality vs Target

#### ✅ What Aligns

1. **One Button:** ✅ Works — "Generate Snapshot" button exists
2. **One Prompt:** ✅ Works — UnifiedPromptBuilder generates single prompt
3. **Bridge to External Agent:** ✅ Works — Copy/paste workflow functional
4. **Capture Reasoning:** ✅ Works — ADRs, decisions, patterns captured
5. **Data-Layer:** ✅ Partially — RL4 provides data, but also makes decisions (task verification, pattern suggestions)

#### ❌ What Conflicts

1. **No Fakery:**
   - ❌ **Mock Health Data:** CognitiveScheduler uses `Math.random()` for health metrics (lines 474-478)
   - ❌ **Fake Forecasts:** Forecast Engine may generate meaningless predictions
   - ❌ **False Anomalies:** AnomalyDetector may detect false positives

2. **Not Decision Engine:**
   - ❌ **Task Verification:** RL4 verifies tasks automatically (decision: task is done)
   - ❌ **Pattern Suggestions:** RL4 suggests `@rl4:completeWhen` (decision: this condition is correct)
   - ❌ **ADR Proposals:** RL4 generates ADR proposals (decision: this ADR should exist)
   - ❌ **Bias Guard:** RL4 blocks patches if bias > threshold (decision: this change is too risky)

3. **Where Should I Go:**
   - ❌ **Forecast Engine:** Generates forecasts but may not be accurate
   - ❌ **Next Steps Card:** Shows P0 tasks but may not be prioritized correctly

4. **Over-Complexity:**
   - ❌ **4-Phase Cognitive Cycle:** Pattern → Correlation → Forecast → ADR may be over-engineered
   - ❌ **Multiple Engines:** PatternLearningEngine, CorrelationEngine, ForecastEngine, ADRGeneratorV2 may not provide value proportional to complexity

### Code That Conflicts with Vision

1. **CognitiveScheduler.ts (lines 474-478):**
   ```typescript
   // Mock health data (will be replaced by real HealthMonitor in future)
   const health = {
       drift: Math.random() * 0.5, // Mock: 0-0.5
       coherence: 0.7 + Math.random() * 0.3, // Mock: 0.7-1.0
       status: result.success ? 'stable' : 'error'
   };
   ```
   **Conflict:** Fake data, not "no fakery"

2. **TaskVerificationEngine.ts:**
   - Automatically verifies tasks (decision engine behavior)
   - **Conflict:** Should be data-layer only, user makes decisions

3. **TerminalPatternsLearner.ts:**
   - Auto-suggests `@rl4:completeWhen` (decision engine behavior)
   - **Conflict:** Should be data-layer only, user makes decisions

4. **ADRGeneratorV2.ts:**
   - Auto-generates ADR proposals (decision engine behavior)
   - **Conflict:** Should be data-layer only, user makes decisions

5. **Bias Guard (extension.ts):**
   - Blocks patches if bias > threshold (decision engine behavior)
   - **Conflict:** Should be data-layer only, user makes decisions

---

## 8. Required Clarifications for Full Reconstruction

### Critical Questions

1. **What Files Should Survive?**
   - ✅ Keep: All `extension/kernel/` files (authoritative)
   - ❌ Remove: All `extension/core/` files (duplicated/legacy)?
   - ❓ Keep: `extension/core/integrations/GitHubFineGrainedManager.ts` (used in extension.ts)?
   - ❓ Remove: Unused API files in `kernel/api/`?

2. **What Modules Should Disappear?**
   - ❌ Remove: Legacy `core/` directory?
   - ❌ Remove: Mock health data in CognitiveScheduler?
   - ❌ Remove: Fake forecast engine?
   - ❌ Remove: Unused cognitive engines?

3. **What Should the Only Button Do?**
   - Current: "Generate Snapshot" button exists
   - ❓ Should it be the ONLY button? (Remove "Parse LLM Response", GitHub integration, etc.)?
   - ❓ Or keep multiple buttons but simplify?

4. **What Does the Prompt Need to Include Exactly?**
   - Current: Current state, goals, decisions, patterns, anomalies, compression metrics
   - ❓ Should it include ALL of this, or simplify?
   - ❓ What's the minimum viable prompt?

5. **What Should Be Removed from the Kernel?**
   - ❌ Remove: Decision-making engines (TaskVerificationEngine, TerminalPatternsLearner, ADRGeneratorV2)?
   - ❌ Remove: Cognitive cycle (Pattern → Correlation → Forecast → ADR)?
   - ❌ Remove: Forecast engine (may be fake/useless)?
   - ❌ Remove: Correlation engine (may be useless)?

6. **Should WebView Keep Multi-Tab or Not?**
   - Current: 4 tabs (Control, Dev, Insights, About)
   - ❓ Should it be single tab with just snapshot generation?
   - ❓ Or keep tabs but simplify?

7. **Should RL4 Keep Forecasts/Patterns?**
   - Current: ForecastEngine generates forecasts, PatternLearningEngine detects patterns
   - ❓ Are forecasts useful or fake?
   - ❓ Are patterns useful or just noise?

8. **Should RL4 Be Decision Engine or Data-Layer?**
   - Current: Both (provides data AND makes decisions)
   - ❓ Should it ONLY provide data (no task verification, no suggestions, no ADR proposals)?
   - ❓ Or keep decision-making but make it optional?

9. **What Should Happen Every 10 Seconds?**
   - Current: Cognitive cycle (Pattern → Correlation → Forecast → ADR)
   - ❓ Should this continue, or remove?
   - ❓ What's the minimum background processing needed?

10. **Should Memory Leaks Be Fixed First?**
    - Current: Phase E4.1 planned but not completed
    - ❓ Should reconstruction wait for memory leak fixes?
    - ❓ Or fix during reconstruction?

11. **Should Legacy Core Files Be Removed?**
    - Current: Duplicated by kernel versions
    - ❓ Remove immediately or migrate first?
    - ❓ Are any core files actually used?

12. **What's the Minimum Viable RL4?**
    - ❓ Just snapshot generation?
    - ❓ Snapshot + task tracking?
    - ❓ Snapshot + task tracking + pattern learning?
    - ❓ What's the core value proposition?

---

## 9. Your Final "Full State Dump"

### Everything I Know About RL4 Extension

#### Architecture

- **Entry Point:** `extension/extension.ts` (1778 lines)
- **Kernel:** `extension/kernel/` (authoritative, ~50 files)
- **Legacy Core:** `extension/core/` (deprecated, ~100 files, should be removed)
- **WebView:** `extension/webview/ui/` (React app, 46 files)
- **Commands:** `extension/commands/adr-validation.ts`
- **Scripts:** `scripts/rl4-log.js`, `scripts/rl4-log.sh`

#### Key Components

1. **CognitiveScheduler:** Orchestrates 4-phase cycle every 10s
2. **UnifiedPromptBuilder:** Generates snapshots (2087 lines)
3. **TaskVerificationEngine:** Verifies tasks from terminal events
4. **TerminalPatternsLearner:** Learns from terminal executions (476 lines)
5. **PromptOptimizer:** Compresses prompts (4 modes)
6. **AnomalyDetector:** Detects anomalies (5 types)
7. **AppendOnlyWriter:** JSONL writer (memory efficient)
8. **ExecPool:** Git command pool (concurrency: 2, timeout: 2s)
9. **TimerRegistry:** Centralized timer management
10. **HealthMonitor:** System health tracking

#### Data Files

- **Plan.RL4:** Strategic vision
- **Tasks.RL4:** Tactical TODOs with `@rl4:*` markers
- **Context.RL4:** Operational context (KPIs, risks)
- **ADRs.RL4:** Architecture Decision Records
- **proposals.json:** LLM proposals
- **terminal-events.jsonl:** Terminal execution events
- **terminal-patterns.json:** Learned patterns
- **decisions.jsonl:** User decisions audit trail
- **cycles.jsonl:** Cognitive cycle results
- **patterns.json:** Detected patterns
- **context.json:** Latest snapshot
- **traces/*.jsonl:** Event traces (git, files, IDE)

#### Workflows

1. **Snapshot Generation:** User clicks → Select mode → Generate → Copy → Paste in agent
2. **LLM Proposal:** Agent returns JSON → Parse → proposals.json → Dev Tab → Accept/Reject → Apply
3. **Task Verification:** Execute in RL4 Terminal → terminal-events.jsonl → TaskVerificationEngine → Badge "Verified"
4. **Mark as Done:** Click "Mark as Done" → Tasks.RL4 updated → decisions.jsonl logged

#### Cognitive Cycle (Every 10s)

1. Pattern Learning → `patterns.json`
2. Correlation → (internal state)
3. Forecasting → (internal state, metrics)
4. ADR Synthesis → `adrs/auto/`
5. Cycle Aggregation → `cycles.jsonl`

#### Memory Leaks

- **Extension-host:** 770 MB → 164 GB (2 months)
- **Renderer:** 1.18 GB → 252 GB (2 months)
- **Root Causes:** Event listeners, ExecPool buffers, console.log, JSONL growth
- **Fix Applied:** `retainContextWhenHidden: false` (frees ~1 GB)
- **Phase E4.1:** Planned but not completed

#### Current Phase

- **Phase E3.4:** ✅ Completed (Dev Tab workflow)
- **Phase E4:** ✅ Completed (Parse LLM Response, helper scripts, docs)
- **Phase E4.1:** 🔴 In Progress (Memory Safety - CRITICAL)
- **Phase E5:** ⏸️ Paused (Pattern Learning UI)

#### Version

- **Current:** 3.5.10
- **Last Release:** 3.5.8 (Terminal Intelligence)
- **Extension Size:** 717 KiB (compiled)
- **WebView Size:** 307.85 KiB

#### Known Issues

1. Memory leaks (critical)
2. Mock health data (fake)
3. Legacy core files (duplicated)
4. Pattern Learning UI not fully integrated
5. Ad-Hoc Tracker not fully integrated
6. Forecast engine may be useless
7. Correlation engine may be useless
8. Over-complexity (4-phase cycle)

#### Vision Gap

- **Target:** Data-layer only, no fakery, one button, one prompt
- **Reality:** Decision engine, fake data, multiple buttons, complex prompts
- **Conflict:** TaskVerificationEngine, TerminalPatternsLearner, ADRGeneratorV2 make decisions
- **Conflict:** CognitiveScheduler uses fake health data
- **Conflict:** Multiple buttons, complex UI

#### Reconstruction Questions

- What files survive?
- What modules disappear?
- What should the only button do?
- What should the prompt include?
- What should be removed from kernel?
- Should WebView keep multi-tab?
- Should RL4 keep forecasts/patterns?
- Should RL4 be decision engine or data-layer?
- What should happen every 10 seconds?
- Should memory leaks be fixed first?
- Should legacy core files be removed?
- What's the minimum viable RL4?

---

**End of Report**

*This report contains EVERY detail needed to rebuild RL4 from scratch with zero ambiguity.*

