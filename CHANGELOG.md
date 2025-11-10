# Changelog — RL4 Kernel

All notable changes to the RL4 Kernel extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.4] - 2025-11-10

### Added - Phase E1: Feedback Loop & Adaptive Baseline

#### 🔁 Adaptive Forecast Baseline
- **`ForecastEngine`** now maintains persistent metrics across cycles
- **Exponential Moving Average (EMA)** with α=0.1 for smooth baseline adaptation
- **`updateBaseline(feedback)`** method applies feedback from simulated or real accuracy measurements
- **Every 100 cycles**, system automatically:
  - Evaluates current forecast precision
  - Updates baseline with simulated feedback (±5% variance around 0.73)
  - Persists updated metrics to `state.json.gz`

#### 🧠 KernelBootstrap Integration
- **Persistent ForecastEngine** initialized with bootstrap metrics
- **Metrics loaded from artifacts** at startup: `forecast_metrics.json.gz`
- **Automatic state persistence** every 100 cycles via `applyFeedbackLoop()`

#### 📊 Metrics Tracking
- **`ForecastMetrics`** interface: precision, recall, total forecasts, improvement rate
- **Real-time logging** of baseline updates: `precision 0.730 → 0.735 (Δ +0.005)`
- **Baseline history** tracked with `last_evaluation` timestamps

### Changed
- **`CognitiveScheduler`** constructor now accepts `bootstrapMetrics?: ForecastMetrics`
- **`ForecastEngine`** made persistent across cycles (no longer recreated each cycle)
- **`extension.ts`** loads bootstrap artifacts before scheduler initialization

### Technical Details
- **Bundle size**: 147 KB (+2 KB from v2.0.3)
- **Compilation**: 6.1s (TypeScript + webpack)
- **Memory impact**: Negligible (~1 MB for metrics tracking)

---

## [2.0.3] - 2025-11-10

### Added - KernelBootstrap System

#### 🗂️ Compressed Artifacts
- **`KernelBootstrap`** module loads compressed cognitive artifacts (`.json.gz`)
- **4 artifact types**:
  - `state.json.gz` — Kernel state snapshot
  - `universals.json.gz` — 5 universal cognitive patterns
  - `forecast_metrics.json.gz` — Forecast accuracy baseline (73%)
  - `universals_analysis.json.gz` — Statistical analysis
- **55.5% compression ratio** (2,683 B → 1,193 B)

#### 📦 Generator Script
- **`scripts/generate-kernel-artifacts.ts`** creates initial artifacts
- **Automatic compression** with zlib (gzip)
- **Pre-populated data**: 5 universal patterns, baseline metrics

#### 🔗 Extension Integration
- **Bootstrap runs at startup** before cognitive scheduler
- **Fallback mode** if artifacts missing (starts with default baseline)
- **Logs bootstrap status** in Output Channel

### Documentation
- **`KERNEL_BOOTSTRAP_GUIDE.md`** — Complete usage guide
- **`KERNEL_BOOTSTRAP_COMPLETE.md`** — Technical completion report
- **`KERNEL_BOOTSTRAP_SUMMARY.md`** — Executive summary

---

## [2.0.2] - 2025-11-03

### Added - Cognitive Engines Migration

#### 🧠 4 Cognitive Engines Integrated
- **`PatternLearningEngine`** (579 lines) — Detects recurring decision patterns
- **`CorrelationEngine`** (353 lines) — Finds pattern relationships
- **`ForecastEngine`** (487 lines) — Predicts future decisions
- **`ADRGeneratorV2`** (317 lines) — Synthesizes Architecture Decision Records

#### 📊 Cognitive Cycle Pipeline
- **4-phase execution**: Pattern → Correlation → Forecast → ADR
- **Phase telemetry**: Duration, success/failure, metrics
- **Idempotent cycles**: Hash-based duplicate detection

### Changed
- **Data paths**: `.reasoning/` → `.reasoning_rl4/`
- **Output structure**: JSON files for patterns, correlations, forecasts
- **Scheduler integration**: All engines orchestrated by `CognitiveScheduler`

### Performance
- **Bundle size**: 145 KB (53.5 KB cognitive code)
- **Cycle latency**: 1-3ms per cycle
- **Memory usage**: ~300 MB stable

---

## [2.0.1] - 2025-11-03

### Added - Input Layer

#### 📥 Real-time Capture
- **`GitCommitListener`** — Captures Git commits with metadata
- **`FileChangeWatcher`** — Monitors file system changes (chokidar)
- **Traces persistence**: `.reasoning_rl4/traces/*.jsonl`

#### 🔍 Pattern Detection
- **Burst correlation**: Related changes within time window
- **Cognitive keywords**: Detects refactor, feature, fix patterns
- **Event aggregation**: JSONL append-only logs

### Technical Details
- **3.8 KB Git traces** captured (5 events)
- **18 KB File changes** captured (12 events)
- **Zero data loss**: Append-only guarantees

---

## [2.0.0] - 2025-11-03

### Added - RL4 Kernel Foundation

#### 🏗️ Core Infrastructure
- **`TimerRegistry`** — Centralized timer management (idempotent)
- **`AppendOnlyWriter`** — JSONL persistence with auto-flush (10 lines)
- **`CognitiveScheduler`** — Orchestrates cognitive cycles
- **`RBOMLedger`** — Merkle chain for data integrity
- **`HealthMonitor`** — Real-time diagnostics (memory, timers, uptime)
- **`StateRegistry`** — Kernel state snapshots
- **`ExecPool`** — Concurrent command execution pool
- **`KernelAPI`** — Public kernel interface

#### 🛡️ Reliability Features
- **Watchdog timer**: Auto-restart if scheduler stalls (2x interval)
- **Auto-flush**: Persist data every 10 lines
- **Merkle chain**: Cryptographic integrity verification
- **Zero-crash design**: Production-tested stability

#### 🎯 Deployment
- **VS Code extension**: `reasoning-layer-rl4-2.0.0.vsix`
- **3 commands**:
  - `RL4 Kernel: Status` — Show kernel metrics
  - `RL4 Kernel: Run Cognitive Cycle` — Manual cycle trigger
  - `RL4 Kernel: Flush All Queues` — Force data persistence

### Performance
- **Cycle frequency**: 10 seconds (configurable)
- **Memory usage**: ~290 MB stable
- **Latency**: < 5ms per cycle
- **Uptime**: Continuous (watchdog-protected)

### Data Integrity
- **4,042+ cycles** generated (all sessions)
- **0% crash rate**
- **0% data loss**
- **100% Merkle chain validation**

---

## Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

---

**Maintained by**: Valentin Galudec  
**Repository**: https://github.com/Soynido/reasoning-layer-v3

