# .reasoning_rl4/ — RL4 Kernel Data Directory

**Purpose**: Isolated data directory for RL4 Kernel  
**Created**: 2025-11-03 (I3-C)  
**Owner**: RL4 Kernel

---

## 📂 Directory Structure

```
.reasoning_rl4/
├── state/              # Kernel state snapshots
├── diagnostics/        # JSONL logs (git_pool.jsonl, health.jsonl)
├── ledger/             # Immutable ledgers (rbom_ledger.jsonl)
└── traces/             # Event traces (append-only JSONL)
```

---

## 🔒 Data Isolation

**RL4 Kernel writes to**: `.reasoning_rl4/`  
**RL3 Legacy writes to**: `.reasoning/`

**Benefits**:
- No data collision
- Clear separation of concerns
- Easy cleanup (rm -rf .reasoning_rl4/)
- Dual mode operation (RL3 + RL4 coexist)

---

## 📝 File Formats

### JSONL (JSON Lines)

All Kernel data uses **append-only JSONL** format:
- One JSON object per line
- No array wrapping
- Stream-friendly
- No O(n) rewrites

**Example** (`traces/2025-11-03.jsonl`):
```
{"id":"evt-1","type":"commit","timestamp":"2025-11-03T14:00:00.123Z"}
{"id":"evt-2","type":"file_change","timestamp":"2025-11-03T14:01:15.456Z"}
{"id":"evt-3","type":"issue_linked","timestamp":"2025-11-03T14:02:30.789Z"}
```

### State Snapshots

**Format**: JSON (pretty-printed for readability)  
**Frequency**: Every 5 minutes (configurable)  
**Location**: `state/snapshot_<timestamp>.json`

---

## 🚫 .gitignore

**Status**: `.reasoning_rl4/` is gitignored by default

**Rationale**:
- Runtime data (not source code)
- Large files (logs, traces)
- Machine-specific (workspace-dependent)
- Regenerated on each run

**Exception**: `README.md` is committed for documentation

---

## 🔍 Monitoring

### JSONL Logs

1. **git_pool.jsonl** — ExecPool metrics
   - Every git/gh command execution
   - Fields: timestamp, command, latency_ms, success, queue_size

2. **health.jsonl** — HealthMonitor metrics (I3-C pending)
   - Memory, timers, event loop lag
   - Frequency: Every 60s

3. **traces/*.jsonl** — Event traces (I3-C pending)
   - All captured events
   - Append-only, no rewrites

### Querying JSONL

```bash
# Get all git commands with latency >100ms
cat .reasoning_rl4/diagnostics/git_pool.jsonl | jq 'select(.latency_ms > 100)'

# Count failed commands
cat .reasoning_rl4/diagnostics/git_pool.jsonl | jq 'select(.success == false)' | wc -l

# Average latency
cat .reasoning_rl4/diagnostics/git_pool.jsonl | jq '.latency_ms' | awk '{sum+=$1; count++} END {print sum/count}'
```

---

## 🧹 Cleanup

```bash
# Delete all runtime data (safe - regenerated on next run)
rm -rf .reasoning_rl4/

# Keep directory structure, delete data only
rm -rf .reasoning_rl4/{state,diagnostics,ledger,traces}/*
```

---

## 📊 Storage Estimates

| Directory | Size (typical) | Growth Rate |
|-----------|----------------|-------------|
| **state/** | ~1-5 MB | 1 MB/day |
| **diagnostics/** | ~10-50 MB | 5 MB/day |
| **ledger/** | ~1-10 MB | 0.5 MB/day |
| **traces/** | ~50-500 MB | 20 MB/day |
| **Total** | ~100-500 MB | ~25 MB/day |

**Rotation**: AppendOnlyWriter auto-rotates files >50MB

---

**Last Updated**: 2025-11-03 14:30  
**Version**: RL4 Kernel v2.0.0-beta2

