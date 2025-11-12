# RL4 Dev Continuity System — Manifest

**Version**: 2.2.0  
**Last Updated**: 2025-11-12  
**Status**: Phase E3 — Manual Cognitive Bridge

---

## 🎯 Vision

> "The only system that lets any dev — or AI agent — stop working and resume exactly where they left off."

**RL4 is NOT a reasoning layer.**  
**RL4 is a Context Engine for Builders.**

---

## 🧠 Core Principle: Manual Cognitive Bridge

### What RL4 Does

RL4 = **Data Collector + Structurer** (not intelligent)

- ✅ **Collects** automatically, continuously (every 10 seconds):
  - Git commits (metadata, files, timestamps)
  - File changes (paths, sizes, edit patterns)
  - IDE activity (files opened, focus time)
  - Build events (success/failure)
  - Health metrics (memory, event loop, timers)

- ✅ **Structures** in machine-readable formats:
  - JSON/JSONL with consistent schemas
  - Chronological ordering
  - Cross-referenced IDs
  - Timestamped everything

- ❌ **Does NOT**:
  - Generate forecasts (requires LLM)
  - Detect patterns autonomously (requires reasoning)
  - Create ADRs automatically (requires human validation)
  - Determine priorities (requires context understanding)

### What Agent LLM Does

Agent LLM = **Reasoning Engine** (powered by Claude, GPT, etc.)

- Receives **structured prompts** with ALL raw RL4 data
- Analyzes and understands the **"WHY"**
- Generates insights:
  - **Patterns**: Recurring behaviors in development
  - **Forecasts**: What should happen next
  - **ADRs**: Decisions that should be documented
  - **Correlations**: How events are related
  - **Priorities**: What needs attention (High/Med/Low)

### What Human Does

Human = **Validator + Decision Maker**

1. **Copies** prompt from RL4 WebView
2. **Pastes** into their agent (Cursor, Claude, Windsurf, etc.)
3. **Reviews** agent's analysis
4. **Validates** or rejects suggestions
5. **Records** validated decisions back into RL4

---

## 🔄 The Workflow

```
┌─────────────────────────────────────────────────┐
│  1. RL4 Collects (automatic, continuous)       │
│     ↓ cycles, commits, file changes            │
├─────────────────────────────────────────────────┤
│  2. Human Copies Prompt (manual)                │
│     ↓ structured data in Markdown              │
├─────────────────────────────────────────────────┤
│  3. Agent LLM Analyzes (reasoning)              │
│     ↓ "these commits = stabilization pattern"  │
├─────────────────────────────────────────────────┤
│  4. Human Validates (decision)                  │
│     ↓ accept/reject insights                   │
├─────────────────────────────────────────────────┤
│  5. RL4 Records (persistence)                   │
│     ↓ validated decisions stored                │
└─────────────────────────────────────────────────┘
```

**Key Insight**: The human stays in the loop. No hallucinations. Full transparency.

---

## 📦 The 4 Pain Points We Solve

### 1. 🧭 **Where am I?** (Now)

**Problem**: Context loss when switching tasks or returning to project.

**RL4 Solution**: 
- Copies **current snapshot** (last 1-2 hours)
- Files modified, commits, health metrics
- Agent recalibrates with exact context

**Prompt Generated**:
```markdown
# 🧠 NOW — Context Snapshot

## 📅 Period: Last 2 hours
## 📝 Files Modified: 15 files
## 🔧 Git Commits: 3 commits
## 📊 Health: Memory 310MB, stable

🎯 Task: Recalibrate your context based on this data.
```

---

### 2. 🕒 **Where I come from?** (Before)

**Problem**: Need to understand what happened during a specific period.

**RL4 Solution**:
- Date/time picker (from → to)
- Complete timeline replay
- Chronological events with context

**Prompt Generated**:
```markdown
# 🕒 BEFORE — Timeline Replay

**Period**: 2025-11-12 10:00 → 11:30

## Events (chronological):
- 10:23 - Commit: feat(rl4): Add pattern detection
- 10:45 - Pattern detected: kernel-evolution
- 11:02 - Forecast generated: Review architecture
- 11:15 - ADR created: Modular kernel

🎯 Task: Analyze this timeline and explain what happened.
```

---

### 3. 🎯 **Where should I go?** (Next)

**Problem**: Unclear what to do next based on project state.

**RL4 Solution**:
- Raw data + explicit reasoning request
- Agent determines priorities
- Human validates action plan

**Prompt Generated**:
```markdown
# ➡️ NEXT — Reasoning Request

Based on current RL4 data:
- 27 fix commits (high frequency)
- 30% predictive drift
- coherence at 70%

🎯 Task: Identify High/Med/Low priority actions with reasoning.
```

---

### 4. 🧳 **Capture & Restore** (Restore)

**Problem**: Can't restore exact workspace state from the past.

**RL4 Solution**:
- Manual PIN: Save current state with label
- Auto snapshots: Every N cycles
- Full workspace ZIP: Code + cognitive state
- Download to ~/Downloads/

**Features**:
- Complete workspace + `.reasoning_rl4/` folder
- Naming: `reasoning-layer-v3-v12.11.2025.14.zip`
- Unzip anywhere, instant context restoration

---

## 🏆 Why This Beats Plan/Spec/Tasks

| Dimension | Plan/Spec/Tasks | RL4 Dev Continuity |
|-----------|-----------------|-------------------|
| **Temporalité** | Static snapshots | Continuous (10s cycles) |
| **Granularité** | Macro (milestones) | Micro (every edit, commit) |
| **Origine** | Human declares | Derived from real work |
| **Mise à jour** | Manual (dies quickly) | Automatic (always live) |
| **Lien intent ↔ code** | Broken after 1 sprint | Always connected |
| **Vision** | What we want to do | What we actually did + why |

**The Analogy**:
> "RL4 is to Plan.md what Git is to a folder zip."

---

## 🚀 Target Market

### Primary Users
- **Multi-timezone dev teams**: Context handoff between shifts
- **Multi-project freelancers**: Switch projects without losing context
- **AI labs**: Agent context persistence across sessions
- **IDE assistants**: Universal context layer (Cursor, Windsurf, Cody)

### Use Cases
1. **Context restoration**: Return to project after days/weeks
2. **Team handoff**: Share exact cognitive state with teammate
3. **Debugging sessions**: Replay what happened during incident
4. **Architecture decisions**: Document reasoning with evidence
5. **Agent calibration**: Give LLM perfect context for next task

---

## 🎨 Positioning

### What We Say
- ✅ "Dev Continuity System"
- ✅ "Context Engine for Builders"
- ✅ "Never lose your cognitive thread"
- ✅ "Resume exactly where you left off"

### What We DON'T Say
- ❌ "Reasoning Layer" (too abstract)
- ❌ "AI that predicts" (not AI, it's data)
- ❌ "Automatic decision maker" (human validates)
- ❌ "Replaces documentation" (complements it)

---

## 🔬 Technical Architecture

### Core Components

```
RL4 Kernel (Node.js + TypeScript)
├── Data Collection
│   ├── GitCommitListener
│   ├── FileChangeWatcher
│   ├── IDEActivityListener
│   ├── BuildMetricsListener
│   └── HealthMonitor
│
├── Data Persistence
│   ├── AppendOnlyWriter (JSONL)
│   ├── StateRegistry (snapshots)
│   ├── RBOMLedger (Merkle chain)
│   └── TimerRegistry (lifecycle)
│
├── Data Structuring
│   ├── CacheIndex (fast queries)
│   ├── TimelineAggregator (daily rollups)
│   ├── ContextSnapshot (current state)
│   └── DataNormalizer (consistency)
│
└── Prompt Generation (NEW — Phase E3)
    └── PromptBridge
        ├── loadRawData(period)
        ├── formatNowPrompt()
        ├── formatBeforePrompt(from, to)
        ├── formatNextPrompt()
        └── formatRestorePrompt(cycleId)
```

### Data Storage

```
.reasoning_rl4/
├── ledger/
│   ├── cycles.jsonl          (10,774+ cycles)
│   ├── adrs.jsonl             (ADR ledger)
│   └── adr_validations.jsonl (human feedback)
│
├── traces/
│   ├── file_changes.jsonl    (every file edit)
│   ├── git_commits.jsonl     (every commit)
│   └── ide_activity.jsonl    (IDE events)
│
├── diagnostics/
│   ├── health.jsonl          (real-time metrics)
│   └── git_pool.jsonl        (Git operations)
│
├── context_history/
│   └── snapshot-*.json       (28 snapshots)
│
├── timelines/
│   └── YYYY-MM-DD.json       (daily aggregates)
│
├── patterns.json             (4 detected patterns)
├── forecasts.json            (4 forecasts — LLM generated)
├── correlations.json         (1 correlation — LLM found)
├── goals.json                (4 goals — human defined)
└── context.json              (current snapshot)
```

---

## 📊 Success Metrics

### User Experience (Target)
- 🎯 Time to context restoration: **< 10 seconds** (via Now prompt)
- 🎯 Time to action plan: **< 5 seconds** (via Next prompt)
- 🎯 Time to historical replay: **< 30 seconds** (via Before timeline)
- 🎯 Time to workspace restore: **< 2 minutes** (via Restore ZIP)

### Adoption (if published)
- 🎯 Prompts copied per user per day: **3+**
- 🎯 Manual PINs created per project: **2+**
- 🎯 Timeline replays per week: **1+**

### Technical Quality
- ✅ Zero data loss on workspace restore
- ✅ ZIP integrity verified (unzip successful)
- ✅ Prompt accuracy: 95%+ (context matches reality)
- ✅ UI latency: < 500ms for all operations
- ✅ Data collection: 100% uptime (watchdog active)

---

## 🔮 Roadmap

### Phase E3: Manual Cognitive Bridge (Current)
- [x] E3.1: PromptBridge.ts (Core module) 🔄 **IN PROGRESS**
- [ ] E3.2: Before Time Capsule (Date picker + replay)
- [ ] E3.3: Restore Workspace Snapshot (PIN + ZIP)
- [ ] E3.4: Terminology Refactoring (Remove "reasoning")

### Phase E4: Validation Workflow
- [ ] ADR validation UI (Accept/Reject)
- [ ] Pattern validation (Confirm/Dismiss)
- [ ] Feedback loop (Agent suggestions → Human validation → RL4 records)

### Phase E5: Multi-Agent Support
- [ ] Prompt templates per agent type (Cursor, Claude, Windsurf, Dust)
- [ ] Agent-specific formatting
- [ ] Copy-paste optimization per IDE

### Phase E6: Workspace Collaboration
- [ ] Team context sharing
- [ ] Snapshot export/import
- [ ] Collaborative validation

---

## 🧩 Competitive Advantage

**What makes RL4 unique**:

1. **Reasoning is invisible**: User never sees "patterns" or "forecasts" in the UI
2. **Human stays in control**: No autonomous decisions, full transparency
3. **Universal compatibility**: Works with any LLM agent (not locked to one)
4. **Perfect memory**: 10-second granularity, append-only ledger
5. **Time travel**: Replay any period with complete context
6. **Workspace versioning**: Full project state capture + restore

**The invisible edge**: Reasoning powers everything, but users only see:
- 🧭 Now (where am I?)
- 🕒 Before (where I come from?)
- 🎯 Next (where should I go?)
- 🧳 Restore (capture & restore)

---

## 📝 License & Status

- **License**: Private / Internal Development
- **Status**: Phase E3 — In Active Development
- **Version**: 2.2.0
- **Repository**: https://github.com/Soynido/reasoning-layer-v3

---

**RL4 Dev Continuity System**  
*Never lose your cognitive thread.*


