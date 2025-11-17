# 🖥️ RL4 Terminal — Usage Guide

## What is RL4 Terminal?

The **RL4 Terminal** is a dedicated terminal in VS Code/Cursor designed for executing tasks with structured logging. Unlike the regular terminal, RL4 Terminal allows you to:

- ✅ **Track task execution** automatically
- ✅ **Verify task completion** based on exit codes and output
- ✅ **Learn patterns** from repeated executions
- ✅ **Auto-suggest** completion conditions for new tasks

All events are logged in `.reasoning_rl4/terminal-events.jsonl` for the **TaskVerificationEngine** to analyze.

---

## 📌 Opening RL4 Terminal

### Via Command Palette
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `RL4: Open Terminal`
3. Press Enter

### Via Keyboard Shortcut
You can configure a custom shortcut in VS Code settings.

---

## 🏷️ Markers Format

RL4 Terminal uses **structured markers** to track task execution. These markers are written to `terminal-events.jsonl` in JSON format.

### Marker Types

#### 1. `RL4_TASK_START` — Task Begins
```bash
# RL4_TASK_START id=task-001 command="npm test"
```

**JSONL Entry:**
```json
{
  "timestamp": "2025-11-16T10:00:00.000Z",
  "type": "command_start",
  "taskId": "task-001",
  "command": "npm test",
  "terminal": "RL4"
}
```

#### 2. `RL4_TASK_RESULT` — Task Ends
```bash
# RL4_TASK_RESULT id=task-001 status=success exitCode=0
```

**JSONL Entry:**
```json
{
  "timestamp": "2025-11-16T10:00:05.000Z",
  "type": "command_end",
  "taskId": "task-001",
  "status": "success",
  "exitCode": 0,
  "terminal": "RL4"
}
```

#### 3. `RL4_FILE_CREATED` — File Created
```bash
# RL4_FILE_CREATED id=task-002 path=".test-verification.txt"
```

**JSONL Entry:**
```json
{
  "timestamp": "2025-11-16T10:01:00.000Z",
  "type": "file_created",
  "taskId": "task-002",
  "file": ".test-verification.txt",
  "terminal": "RL4"
}
```

#### 4. `RL4_GIT_COMMIT` — Git Commit
```bash
# RL4_GIT_COMMIT id=task-003 commit=3055f6e
```

**JSONL Entry:**
```json
{
  "timestamp": "2025-11-16T10:02:00.000Z",
  "type": "git_commit",
  "taskId": "task-003",
  "metadata": {
    "commit": "3055f6e"
  },
  "terminal": "RL4"
}
```

---

## 🔧 Helper Scripts Usage

RL4 provides two helper scripts to make logging easier:
- **`scripts/rl4-log.js`** — Node.js helper
- **`scripts/rl4-log.sh`** — Bash helper

### Node.js Helper (`rl4-log.js`)

#### Start a Task
```bash
node scripts/rl4-log.js start task-001 "npm test"
```

#### End a Task
```bash
node scripts/rl4-log.js end task-001 success 0
node scripts/rl4-log.js end task-002 failure 1
```

#### Custom Event
```bash
node scripts/rl4-log.js custom task-003 file_created '{"path":".test.txt"}'
```

---

### Bash Helper (`rl4-log.sh`)

#### Setup
First, source the helper script in your terminal:
```bash
source scripts/rl4-log.sh
```

This loads the following functions:
- `rl4_task_start <taskId> <command>`
- `rl4_task_result <taskId> <status> <exitCode>`
- `rl4_file_created <taskId> <filePath>`
- `rl4_git_commit <taskId> <commitHash>`
- `rl4_run <taskId> <command>` (auto-logs start/end)

#### Example Usage

**Manual Logging:**
```bash
rl4_task_start task-001 "npm test"
npm test
rl4_task_result task-001 success $?
```

**Auto-Logging with `rl4_run`:**
```bash
rl4_run task-001 "npm test"
# Automatically logs start, runs command, logs result
```

**File Created:**
```bash
touch .test-verification.txt
rl4_file_created task-002 ".test-verification.txt"
```

**Git Commit:**
```bash
git commit -m "Fix bug"
COMMIT_HASH=$(git rev-parse --short HEAD)
rl4_git_commit task-003 "$COMMIT_HASH"
```

---

## 📝 Examples — Real Use Cases

### Example 1: Run Tests
```bash
# Source helper
source scripts/rl4-log.sh

# Task: auto-test-001
rl4_run auto-test-001 "npm test"
```

**Result in `terminal-events.jsonl`:**
```jsonl
{"timestamp":"2025-11-16T10:00:00.000Z","type":"command_start","taskId":"auto-test-001","command":"npm test","terminal":"RL4"}
{"timestamp":"2025-11-16T10:00:05.000Z","type":"command_end","taskId":"auto-test-001","status":"success","exitCode":0,"terminal":"RL4"}
```

---

### Example 2: Build Project
```bash
source scripts/rl4-log.sh

rl4_task_start auto-test-002 "npm run build"
npm run build
rl4_task_result auto-test-002 success $?
```

---

### Example 3: Create File
```bash
source scripts/rl4-log.sh

rl4_task_start auto-test-003 "touch .test-verification.txt"
touch .test-verification.txt
rl4_file_created auto-test-003 ".test-verification.txt"
rl4_task_result auto-test-003 success 0
```

---

### Example 4: Complex Workflow
```bash
source scripts/rl4-log.sh

# Task: build-and-test (task-004)
rl4_task_start task-004 "build and test workflow"

# Step 1: Install dependencies
npm install
if [ $? -ne 0 ]; then
  rl4_task_result task-004 failure 1
  exit 1
fi

# Step 2: Build
npm run build
if [ $? -ne 0 ]; then
  rl4_task_result task-004 failure 1
  exit 1
fi

# Step 3: Test
npm test
if [ $? -ne 0 ]; then
  rl4_task_result task-004 failure 1
  exit 1
fi

# Success!
rl4_task_result task-004 success 0
```

---

## 🔍 Manual Mode (Without Helper Scripts)

If you prefer, you can manually echo markers and write to `terminal-events.jsonl`:

```bash
# Manual markers (visible in terminal)
echo "# RL4_TASK_START id=task-001 command=\"npm test\""
npm test
EXIT_CODE=$?
echo "# RL4_TASK_RESULT id=task-001 status=success exitCode=$EXIT_CODE"

# Manual JSONL append (direct file write)
echo '{"timestamp":"2025-11-16T10:00:00.000Z","type":"command_start","taskId":"task-001","command":"npm test","terminal":"RL4"}' >> .reasoning_rl4/terminal-events.jsonl
npm test
echo '{"timestamp":"2025-11-16T10:00:05.000Z","type":"command_end","taskId":"task-001","status":"success","exitCode":0,"terminal":"RL4"}' >> .reasoning_rl4/terminal-events.jsonl
```

---

## 🎯 How RL4 Verifies Tasks

### 1. Task Definition in `Tasks.RL4`
```markdown
- [ ] [P0] Run test suite
  @rl4:id=auto-test-001
  @rl4:completeWhen="exitCode 0"
```

### 2. Execution in RL4 Terminal
```bash
rl4_run auto-test-001 "npm test"
```

### 3. RL4 Verification
- **TaskVerificationEngine** reads `terminal-events.jsonl`
- Finds events with `taskId=auto-test-001`
- Checks if condition `exitCode 0` is met
- Marks task as **Verified** (confidence: HIGH)

### 4. Dev Tab Update
- Badge appears: **✅ Verified by RL4**
- Button available: **Mark as Done**
- User clicks → Task checked in `Tasks.RL4`

---

## 🧠 Pattern Learning

RL4 learns from repeated executions:

```bash
# First run
rl4_run task-001 "npm test"

# Second run
rl4_run task-001 "npm test"

# Third run
rl4_run task-001 "npm test"
```

**After 3+ runs, RL4 learns:**
- **Typical command:** `npm test`
- **Success rate:** 100%
- **Average duration:** 5.2s
- **Auto-suggested condition:** `exitCode 0`

**Next time you create a similar task:**
```markdown
- [ ] [P0] Run E2E tests
  @rl4:id=task-new
```

**RL4 suggests:**
```
💡 This task looks like testing
   Suggested: @rl4:completeWhen="npm test exitCode 0"
   [Apply] [Edit] [Ignore]
```

---

## 📊 Supported Completion Conditions

RL4 supports the following patterns in `@rl4:completeWhen`:

| Pattern | Description | Example |
|---------|-------------|---------|
| `exitCode 0` | Command exits with code 0 | `npm test` |
| `test passing` | Tests pass | `npm test` output contains "passing" |
| `build success` | Build succeeds | `npm run build` exits 0 |
| `file exists: X` | File created | `touch .test.txt` |
| `git commit` | Git commit created | `git commit -m "..."` |
| `output contains "X"` | Output has string | `echo "success"` |

---

## 🚀 Best Practices

### 1. Always Use Task IDs
```bash
# ✅ GOOD
rl4_run task-001 "npm test"

# ❌ BAD (no tracking)
npm test
```

### 2. Match Task IDs with Tasks.RL4
```markdown
# Tasks.RL4
- [ ] [P0] Run tests @rl4:id=auto-test-001

# Terminal
rl4_run auto-test-001 "npm test"
```

### 3. Use Descriptive Commands
```bash
# ✅ GOOD
rl4_run task-001 "npm run test:unit"

# ❌ BAD (too vague)
rl4_run task-001 "test"
```

### 4. Log File Creations
```bash
touch .verification.txt
rl4_file_created task-002 ".verification.txt"
```

### 5. Use `rl4_run` for Simple Commands
```bash
# Automatically handles start/end logging
rl4_run task-001 "npm test"
```

---

## ❓ FAQ

### Q: Do I need to use RL4 Terminal for every command?
**A:** No, only for tasks you want to track in `Tasks.RL4`.

### Q: Can I use regular terminal?
**A:** Yes, but RL4 won't track those commands.

### Q: What if I forget to log the end marker?
**A:** Task will remain unverified. You can manually add it or re-run.

### Q: Can I use Node.js helper in Bash scripts?
**A:** Yes! `node scripts/rl4-log.js start task-001 "npm test"`

### Q: Are markers mandatory?
**A:** For automatic verification, yes. Otherwise, manual tracking only.

---

## 🛠️ Troubleshooting

### Issue: Events not appearing in Dev Tab
**Solution:** Check `terminal-events.jsonl` exists and has valid JSON:
```bash
cat .reasoning_rl4/terminal-events.jsonl
```

### Issue: Helper script not found
**Solution:** Ensure you're in workspace root:
```bash
ls scripts/rl4-log.sh
source scripts/rl4-log.sh
```

### Issue: Task not verified despite success
**Solution:** Check task ID matches in `Tasks.RL4` and terminal:
```bash
grep "@rl4:id=task-001" .reasoning_rl4/Tasks.RL4
grep "task-001" .reasoning_rl4/terminal-events.jsonl
```

---

## 📚 Resources

- **Extension Docs:** See main README.md
- **Dev Tab Workflow:** See AUDIT_REPORT_E4.md
- **Task Format:** See Tasks.RL4 examples

---

**Generated by RL4 Kernel v3.5.8**

