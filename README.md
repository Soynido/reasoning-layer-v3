# RL4 Kernel — Dev Continuity System

> **Never lose your cognitive thread.**  
> Captures your dev context, generates structured prompts for AI agents, and maintains your reasoning history across sessions.

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

## 🎓 Credits

**Author:** Valentin Galudec  
**Project:** Reasoning Layer V4 (RL4)  
**Version:** 3.3.0 (Intelligent Deviation Modes)  
**Repository:** https://github.com/Soynido/reasoning-layer-v3

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
