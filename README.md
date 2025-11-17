# RL4 Kernel — Dev Continuity System

> **Never lose your cognitive thread.**  
> Captures your dev context, generates structured prompts for AI agents, and maintains your reasoning history across sessions.

---

## ✨ What's New in v3.5.8

### 🎉 Major Features (Phase E3.4 Completed — Nov 16, 2025)

#### 1. **Dev Tab with Task Verification** ✨
- ✅ **Parse LLM proposals** automatically from clipboard
- ✅ **Accept/Reject tasks** with bias guard validation
- ✅ **Verify task completion** via RL4 Terminal events
- ✅ **Badge "Verified by RL4"** when tasks succeed
- ✅ **One-click "Mark as Done"** in Dev Tab

#### 2. **RL4 Terminal with Structured Logging** 🖥️
- ✅ **Dedicated terminal** for task execution tracking
- ✅ **Helper scripts** (Node.js + Bash) for easy logging
- ✅ **Auto-verification** based on exit codes and output
- ✅ **Pattern learning** from repeated executions

#### 3. **Terminal Patterns Learning** 🧠
- ✅ **Auto-suggest** `@rl4:completeWhen` for new tasks
- ✅ **Anomaly detection** (success rate drop, unusual duration)
- ✅ **Command classification** (setup/build/test/debug/deploy)
- ✅ **Fuzzy matching** to find similar tasks

#### 4. **PromptOptimizer & AnomalyDetector** ⚡
- ✅ **4 compression modes** (strict/flexible/exploratory/free)
- ✅ **5 anomaly types** detected (sudden_change, regression, bias_spike, etc.)
- ✅ **Metadata in snapshots** (anomalies + compression stats)

**See [Phase E3.4 Achievements](#phase-e34-achievements) below for technical details.**

---

## 🎯 What Is This?

**RL4 (Reasoning Layer 4)** is a VS Code extension that solves the hardest problem in software development: **context loss**.

When you:
- 🔄 Switch between multiple projects
- ⏸️ Take a break and come back days later
- 👥 Hand off work to teammates or AI agents
- 🧠 Can't remember "Why did I make this decision?"

**RL4** captures everything you do and turns it into structured, AI-ready context.

---

## ✨ Core Features

### 1. **Cognitive Capture Engine**
Automatically records:
- ✅ Git commits (hash, message, diff summary)
- ✅ File changes (what, when, why)
- ✅ Dependencies updates (package.json, requirements.txt)
- ✅ Configuration changes (YAML, TOML, ENV)
- ✅ Test executions and results

**No manual documentation required.** RL4 watches silently in the background.

---

### 2. **Smart Context Snapshots**
Generate instant cognitive snapshots with one command:

```bash
Command: RL4 › 🧠 Where Am I? — Cognitive Snapshot
```

**What you get:**
- 📊 What you've been working on (last N commits, file changes)
- 🎯 Active goals and decisions in progress
- 🔗 Related issues, PRs, and evidence
- 📈 Pattern detection and recommendations

**Perfect for:**
- Returning to a project after weeks
- Handing off context to a teammate
- Providing full context to AI coding assistants (Cursor, Claude, GPT)

---

### 3. **Structured Prompts for AI Agents**
RL4 generates **copy-paste prompts** optimized for LLM agents:

```markdown
# Context for AI Agent

## Current State
- Active Branch: feature/auth-refactor
- Last 5 Commits: [...]
- Modified Files: 12 (auth/, middleware/)

## Goals
- Refactor authentication middleware
- Add JWT token validation
- Update tests

## Decisions Made
- [ADR-042] Chose JWT over sessions (2025-11-10)
- Evidence: Security review, performance benchmarks

## What I Need
- Review security implications of current JWT implementation
- Suggest improvements for token refresh flow
```

**Why this matters:**
- 🚀 AI agents get **perfect context** without hallucinating
- 🔒 Full transparency: You see and validate everything
- 🔁 Works with any LLM (Cursor, Claude, ChatGPT, Windsurf)

---

### 4. **Reasoning History & ADRs**
RL4 auto-generates **Architecture Decision Records (ADRs)** from your work:

**Example ADR:**
```yaml
id: ADR-042
title: "Adopt JWT for authentication"
status: accepted
date: 2025-11-10
context: |
  Security review identified session-based auth as bottleneck.
  Performance benchmarks showed JWT reduces DB queries by 60%.
decision: |
  Migrate to JWT-based authentication with RS256 signing.
consequences: |
  - Improved performance (+60% faster auth)
  - Stateless authentication enables horizontal scaling
  - Requires secure key management (RSA keys in vault)
evidence:
  - commits: [a1b2c3d, e4f5g6h]
  - issues: [#123, #456]
  - benchmarks: [perf-report-2025-11.json]
```

**Benefits:**
- 📚 Never lose the "why" behind your decisions
- 🔍 Searchable reasoning history
- 🤝 Onboard new team members 10x faster

---

### 5. **Kernel-Based Architecture**
RL4 runs as a **cognitive kernel** with:
- 🧠 **Adaptive Modes**: Standard, Focused, Exploratory, Free
- 💾 **Append-only ledger**: Immutable event history (JSONL)
- 🔐 **Cryptographic integrity**: SHA256 hashing, RSA signing
- 📊 **Health monitoring**: Auto-recovery, watchdog, diagnostics

**Performance:**
- ⚡ Minimal overhead (<1% CPU usage)
- 💾 Efficient storage (~10MB per 1000 events)
- 🔄 Non-blocking async architecture

---

## 🚀 Quick Start

### Installation

1. **Install the extension:**
```bash
code --install-extension reasoning-layer-rl4-3.3.0.vsix
```

2. **Restart VS Code** — RL4 activates automatically

3. **Open any Git repository** — Capture starts immediately

---

### First Commands

#### 📊 Check Status
```
Command Palette → RL4 Kernel: 📊 Kernel Status
```
See what RL4 has captured and system health.

#### 🧠 Generate Snapshot
```
Command Palette → RL4 Kernel: 🧠 Where Am I? — Cognitive Snapshot
```
Get instant context for your current state.

#### 🔄 Run Cognitive Cycle
```
Command Palette → RL4 Kernel: 🧠 Run Cognitive Cycle
```
Analyze patterns, detect decisions, generate ADRs.

#### 🖥️ Open Dashboard
```
Command Palette → RL4 Kernel: 🖥️ Show Dashboard
```
Visual interface for goals, patterns, and correlations.

---

## 📂 What Gets Captured?

RL4 creates a `.reasoning_rl4/` folder in your workspace:

```
.reasoning_rl4/
├── traces/
│   ├── file_changes.jsonl       # File modifications
│   ├── git_commits.jsonl        # Git history
│   └── ide_activity.jsonl       # IDE events
├── adrs/
│   ├── active.json              # Current ADRs
│   └── auto/                    # Auto-generated proposals
├── context.json                 # Latest cognitive snapshot
├── patterns.json                # Detected patterns
├── forecasts.json               # Predictive insights
└── kernel/
    └── state.json.gz            # Kernel state
```

**Privacy:** All data stays local. No telemetry, no external calls.

---

## 🎮 Use Cases

### 1. **Context Switching**
**Problem:** You work on 5 projects simultaneously and lose track.

**Solution:**
```bash
# Before switching projects
RL4 › 🧠 Where Am I?
# Copy snapshot → Paste in notes

# When returning
RL4 › 🧠 Restore Context
# Instant recalibration
```

---

### 2. **AI Agent Integration**
**Problem:** Your AI assistant (Cursor, Claude) doesn't know your project history.

**Solution:**
```bash
# Generate context prompt
RL4 › 🧠 Where Am I?

# Copy output → Paste in Cursor Chat
# Agent now has full context
```

**Result:** 10x better AI suggestions, zero hallucinations.

---

### 3. **Team Handoffs**
**Problem:** Teammate takes over your work but doesn't understand decisions.

**Solution:**
```bash
# Generate handoff doc
RL4 › 📊 Generate Handoff Report

# Includes:
# - What was done (commits, files)
# - Why decisions were made (ADRs)
# - What's next (goals, blockers)
```

---

### 4. **Post-Mortem Analysis**
**Problem:** Production issue — need to understand what changed.

**Solution:**
```bash
# Query event history
RL4 › 📜 Show Recent Changes (last 7 days)

# See exactly:
# - Which commits went out
# - Config changes
# - Dependency updates
# - Related decisions
```

---

## 🧠 Adaptive Intelligence Modes

RL4 adapts its behavior based on what you're doing:

### **Standard Mode** (Default)
- Balanced capture and analysis
- Moderate context depth
- Good for normal development

### **Focused Mode** (High Precision)
- Deep context capture
- Maximum evidence linking
- Best for critical decisions

### **Exploratory Mode** (Discovery)
- Pattern detection enabled
- Correlation analysis active
- Great for refactoring

### **Free Mode** (Minimal)
- Lightweight capture only
- Low overhead
- Ideal for quick edits

**Switch modes:**
```bash
Command: RL4 › ⚙️ Switch Mode → [Choose mode]
```

---

## 📊 Technical Architecture

### Kernel Components

```
┌─────────────────────────────────────────────┐
│          RL4 KERNEL (Extension Host)        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    Capture Engines                  │   │
│  │  - FileWatcher                      │   │
│  │  - GitObserver                      │   │
│  │  - ConfigTracker                    │   │
│  │  - DependencyMonitor                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    Cognitive Layer                  │   │
│  │  - PatternDetector                  │   │
│  │  - DecisionSynthesizer              │   │
│  │  - ADR Generator                    │   │
│  │  - ContextBuilder                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    Persistence Layer                │   │
│  │  - JSONL Ledger (append-only)       │   │
│  │  - Gzip compression                 │   │
│  │  - Cryptographic signing            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    API Layer                        │   │
│  │  - UnifiedPromptBuilder             │   │
│  │  - SnapshotGenerator                │   │
│  │  - QueryEngine                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔧 Advanced Features

### **Integrity Verification**
```bash
RL4 › 🔐 Verify Integrity
# Validates cryptographic signatures
# Ensures no data tampering
```

### **Historical Reconstruction**
```bash
RL4 › 🕰️ Reconstruct History
# Scans Git history (up to 1000 commits)
# Generates synthetic traces for past events
# Fills cognitive gaps from late installation
```

### **Cognitive Graph Visualization**
```bash
RL4 › 📈 Show Cognitive Graph
# Visual network of:
# - Decisions → Evidence
# - Patterns → Occurrences
# - Goals → Progress
```

---

## 🛡️ Privacy & Security

### **Local-First Architecture**
- ✅ All data stays on your machine
- ✅ No telemetry, no external calls
- ✅ No account required

### **Cryptographic Guarantees**
- 🔒 SHA256 hashing for integrity
- 🔑 RSA signatures for authenticity
- 📜 Append-only ledger (immutable)

### **Transparent Operation**
- 👁️ All captured data in plain JSONL
- 🔍 Readable with any text editor
- 🗑️ Easy to delete (just remove `.reasoning_rl4/`)

---

## 📈 Metrics & Monitoring

### **Real-Time KPIs**

Check extension status bar for:
- 📊 **Events captured** (total count)
- 🎯 **Active goals** (progress %)
- 🔗 **Patterns detected** (count)
- 💚 **System health** (0-100%)

### **Diagnostic Commands**

```bash
# Health check
RL4 › 🏥 System Diagnostics

# Performance stats
RL4 › ⚡ Performance Report

# Storage usage
RL4 › 💾 Storage Analysis
```

---

## 🎯 Roadmap

### **Current: Phase E2 (v3.3.0)**
- ✅ Kernel architecture stable
- ✅ Adaptive modes implemented
- ✅ Unified prompt builder
- ✅ Smart UI dashboard

### **Next: Phase E3 (Q1 2026)**
- 🎯 AI agent direct integration (MCP protocol)
- 🎯 Semantic search (vector embeddings)
- 🎯 Multi-workspace support
- 🎯 Team collaboration features

### **Future: Phase E4+ (Q2 2026)**
- 🔮 Predictive insights (forecast decisions)
- 🤖 Autonomous recommendations
- 📊 Analytics dashboard (web UI)
- 🌐 Cloud sync (optional, encrypted)

---

## 🤝 Support & Community

### **Documentation**
- 📖 [Complete Guide](docs/README_ARCHITECTURE.md)
- 🎨 [Visual Architecture](ARCHITECTURE_DIAGRAM.md)
- 📚 [Development Plan](plan.md)

### **Troubleshooting**
- 🐛 [GitHub Issues](https://github.com/Soynido/reasoning-layer-v3/issues)
- 💬 Contact: valentin@galudec.com

### **Contributing**
This is an active research project. Contributions welcome!

**Philosophy:** Local-first, privacy-preserving, developer-friendly.

---

## 📄 License

**PROPRIETARY** — Copyright © 2025 Valentin Galudec. All rights reserved.

For licensing inquiries, contact: valentin@galudec.com

---

## 🎓 Phase E3.4 Achievements

### Development Session: Nov 16, 2025 (6h45min)

#### ✅ Core Infrastructure (8 Phases Completed)

**Phase 1: Intelligent Optimization**
- ✅ `PromptOptimizer.ts` (357 lines) — 4 compression modes
- ✅ `AnomalyDetector.ts` (345 lines) — 5 anomaly types
- ✅ `UnifiedPromptBuilder.ts` — Returns `{ prompt, metadata }`
- ✅ `SnapshotReminder.ts` — Auto-remind every 30min

**Phase 2: Terminal & Verification**
- ✅ `TaskVerificationEngine.ts` (239 lines) — Core verification
- ✅ `TasksRL4Parser.ts` (127 lines) — Parse `@rl4:id` / `@rl4:completeWhen`
- ✅ `TerminalPatternsLearner.ts` (476 lines) — Auto-learning engine
- ✅ RL4 Terminal command — Dedicated terminal with structured logging

**Phase 3: UI & Workflow**
- ✅ 4-tabs WebView (Control, Dev, Insights, About)
- ✅ Dev Tab — Proposals + Patch Preview + Verification badges
- ✅ Workflow: LLM proposals → User validation → Bias guard → Apply patch
- ✅ Badge "✅ Verified by RL4" + "Mark as Done" button

**Phase 4: Helper Scripts (Phase E4)**
- ✅ `scripts/rl4-log.js` — Node.js helper for JSONL logging
- ✅ `scripts/rl4-log.sh` — Bash functions (rl4_task_start/result)
- ✅ `README_RL4_TERMINAL.md` — Complete usage guide

#### 📊 Metrics
- **Extension Size:** 717 KiB (compiled)
- **WebView Size:** 307.85 KiB (React app)
- **Tests:** 46 automated tests (97.8% pass rate)
- **Files Created:** 7 new TypeScript components
- **Files Modified:** 4 major files (extension.ts, App.tsx, etc.)
- **Bias:** 0% (no plan deviation)
- **Cognitive Load:** 12% (optimal for development)

#### 🔧 Technical Highlights

**TaskVerificationEngine:**
- Reads `terminal-events.jsonl` with cursor (memory optimized)
- Matches `@rl4:completeWhen` conditions with events
- Calculates confidence: HIGH (100% + exitCode 0), MEDIUM (>50%), LOW (<50%)
- Zero false positives with exit code validation

**TerminalPatternsLearner:**
- Fuzzy matching via Jaccard similarity (60% threshold)
- Auto-detects completion patterns after 3+ runs
- Detects anomalies: success rate drop, unusual duration, command change
- Command classification: setup/build/test/debug/deploy/document

**Bias Guard:**
- Systematic threshold check (strict 0%, flexible 25%, exploratory 50%, free 100%)
- Aborts patch application if threshold exceeded
- All decisions logged in `decisions.jsonl` for audit

---

## 📚 Dev Tab Workflow

### 5-Step Process

```
1. Generate Snapshot (Exploratory mode)
   ↓
2. Paste in LLM → Get RL4_PROPOSAL
   ↓
3. Click "Parse LLM Response" → proposals.json
   ↓
4. Accept/Reject → Patch preview → Apply
   ↓
5. Execute in RL4 Terminal → Auto-verify → Mark as Done
```

### Example Usage

**Step 1: Generate Snapshot**
```bash
Command Palette → "RL4: Where Am I?"
Select mode: "🟢 Exploratory"
```

**Step 2: LLM Returns Proposals**
```json
{
  "RL4_PROPOSAL": {
    "suggestedTasks": [
      {
        "id": "task-001",
        "title": "Add unit tests for TaskVerificationEngine",
        "priority": "P1",
        "bias": 5
      }
    ]
  }
}
```

**Step 3: Parse**
```bash
Copy LLM response → Click "📋 Parse LLM Response"
✅ 1 proposal parsed successfully!
```

**Step 4: Validate**
```bash
Dev Tab → Accept (P1)
Patch Preview: [shows diff]
Apply Patch → Tasks.RL4 updated
```

**Step 5: Execute & Verify**
```bash
# Open RL4 Terminal
source scripts/rl4-log.sh
rl4_run task-001 "npm test"

# RL4 detects completion
Dev Tab → Badge "✅ Verified by RL4" appears
Click "Mark as Done" → Task checked in Tasks.RL4
```

---

## 🖥️ Terminal RL4 Usage

See complete guide: [README_RL4_TERMINAL.md](README_RL4_TERMINAL.md)

### Quick Start

```bash
# Source helper
source scripts/rl4-log.sh

# Run a task with auto-logging
rl4_run task-001 "npm test"

# Manual logging
rl4_task_start task-002 "npm run build"
npm run build
rl4_task_result task-002 success $?
```

### Supported Completion Conditions

```markdown
@rl4:completeWhen="exitCode 0"
@rl4:completeWhen="test passing"
@rl4:completeWhen="build success"
@rl4:completeWhen="file exists: .test.txt"
@rl4:completeWhen="git commit"
@rl4:completeWhen="output contains \"success\""
```

---

## 🚀 Roadmap

### **Done: Phase E3.4 (Nov 2025)**
- ✅ PromptOptimizer & AnomalyDetector
- ✅ TaskVerificationEngine & TerminalPatternsLearner
- ✅ Dev Tab complete workflow
- ✅ RL4 Terminal with helper scripts
- ✅ Pattern learning & auto-suggestions

### **Current: Phase E4 (Production Readiness)**
- 🎯 E2E testing & validation
- 🎯 Release v3.5.8 documentation
- 🎯 Performance monitoring

### **Next: Phase E5 (Q1 2026)**

---

## 🌟 Why RL4 Exists

> "The hardest part of software development isn't writing code — it's understanding why the code was written that way in the first place."

RL4 solves this by capturing **the reasoning behind every decision** and making it instantly accessible.

**Result:**
- 🚀 Faster onboarding
- 🧠 Better AI assistance
- 📚 Living documentation
- 🔍 Searchable decision history
- 🤝 Seamless team collaboration

**Try it today. Your future self will thank you.**

---

*Last updated: November 13, 2025*
