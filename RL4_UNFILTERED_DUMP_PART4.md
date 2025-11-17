# 🔥 RL4 COMPLETE UNFILTERED DUMP - PART 4

**Continuation of unfiltered truth dump**

---

## 9. ALL Commands Implemented in extension.ts

### Command 1: `reasoning.kernel.status`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. Get active timer count from TimerRegistry
2. Get memory usage from process.memoryUsage()
3. Get uptime from process.uptime()
4. Format message:
   "🧠 RL4 Kernel Status:
   Memory: {heapUsed}MB
   Timers: {total}
   Uptime: {minutes}min"
5. Show VS Code info message
6. Log to CognitiveLogger
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

---

### Command 2: `reasoning.kernel.reflect`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. Log "Running manual cycle..."
2. Call scheduler.runCycle()
3. Wait for result
4. Format message:
   "✅ Cycle {cycleId}: {duration}ms, {phases} phases"
5. Show VS Code info message
6. Log to CognitiveLogger
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

**TRUTH:** This forces a cycle immediately (bypasses interval)

---

### Command 3: `reasoning.kernel.flush`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. Call kernel.api.flush()
2. Show VS Code info message: "✅ Flushed"
3. Log to CognitiveLogger
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

**TRUTH:** Purpose of flush() is UNKNOWN (need code inspection)

---

### Command 4: `reasoning.kernel.whereami`

**Exact Syntax:** No parameters (shows QuickPick)

**Behavior:**
```typescript
1. Show QuickPick with 5 modes:
   - Strict (0%)
   - Flexible (25%)
   - Exploratory (50%)
   - Free (100%)
   - First Use (Deep Analysis)
2. User selects mode
3. IF cancelled → return
4. Log "Generating snapshot (mode: {mode})..."
5. Create AdaptivePromptBuilder
6. Call buildPrompt({ mode, includeHistory, includeGoals, includeTechStack })
7. Open snapshot in new document
8. Show info message: "✅ Snapshot generated ({mode})!"
9. Log success
```

**Parameters:**
- `mode`: 'strict' | 'flexible' | 'exploratory' | 'free' | 'firstUse'
- `includeHistory`: boolean (true for exploratory/free/firstUse)
- `includeGoals`: boolean (always true)
- `includeTechStack`: boolean (always true)

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

---

### Command 5: `reasoning.adr.reviewPending`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. ADRValidationCommands.reviewPending()
2. Read adrs/auto/ directory
3. List all auto-generated ADRs
4. Show QuickPick with ADRs
5. User selects ADR to review
6. Show ADR content in new document
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

**Location:** `extension/commands/adr-validation.ts`

---

### Command 6: `reasoning.adr.acceptProposal`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. ADRValidationCommands.acceptProposal()
2. Show QuickPick with pending ADRs
3. User selects ADR
4. Move ADR from adrs/auto/ to adrs/
5. Update ADRs.RL4 with accepted ADR
6. Show success message
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

**Location:** `extension/commands/adr-validation.ts`

---

### Command 7: `reasoning.adr.rejectProposal`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. ADRValidationCommands.rejectProposal()
2. Show QuickPick with pending ADRs
3. User selects ADR
4. Delete ADR from adrs/auto/
5. Show success message
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

**Location:** `extension/commands/adr-validation.ts`

---

### Command 8: `rl4.toggleWebview`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. IF webviewPanel exists:
   → Dispose webviewPanel
   → Set webviewPanel = null
   → Update status bar: "$(brain) RL4 Dashboard"
2. ELSE:
   → Create new webviewPanel
   → Load HTML
   → Register message handlers
   → Send initial data
   → Update status bar: "$(brain) RL4 Dashboard $(check)"
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible via status bar)

**TRUTH:** This is how status bar item works

---

### Command 9: `rl4.openTerminal`

**Exact Syntax:** No parameters

**Behavior:**
```typescript
1. Check if terminal "RL4 Terminal" exists
2. IF exists:
   → Reveal existing terminal
   → Log "RL4 Terminal revealed"
3. ELSE:
   → Create new terminal:
     - Name: "RL4 Terminal"
     - cwd: workspaceRoot
     - env: { ...process.env, RL4_TERMINAL: '1' }
   → Show terminal
   → IF scripts/rl4-log.sh exists:
     - Send: "source scripts/rl4-log.sh"
     - Send: "echo '✅ RL4 Terminal helper loaded'"
   → ELSE:
     - Send: "echo '⚠️ RL4 helper script not found'"
   → Log "RL4 Terminal created"
```

**Parameters:** None

**Hidden Flags:** None

**Deprecated:** No

**Internal-Only:** No (user-accessible)

**TRUTH:** Terminal is NOT monitored (no API listener)

---

### Hidden/Internal Commands

**NONE FOUND**

All commands are user-accessible via Command Palette or UI.

---

## 10. ALL Messages Sent Between extension ↔ webview

### Direction: Extension → WebView

#### Message 1: `snapshotGenerated`

**Payload:**
```json
{
  "type": "snapshotGenerated",
  "payload": "string (full snapshot text)"
}
```

**Trigger:** User generates snapshot (via command or WebView button)

**When:** After snapshot generation completes

**Debounce:** No

**Repeat:** Only when user triggers

**WebView Action:** 
- Sets prompt state
- Copies to clipboard automatically
- Shows feedback message

---

#### Message 2: `snapshotMetadata`

**Payload:**
```json
{
  "type": "snapshotMetadata",
  "payload": {
    "anomalies": [
      {
        "type": "sudden_change",
        "severity": "high",
        "description": "...",
        "context": "...",
        "recommendation": "..."
      }
    ],
    "compression": {
      "originalSize": 45000,
      "optimizedSize": 27000,
      "reductionPercent": 40,
      "mode": "flexible"
    }
  }
}
```

**Trigger:** After snapshot generation (sent alongside snapshotGenerated)

**When:** Immediately after generation

**Debounce:** No

**Repeat:** Every snapshot

**WebView Action:**
- Updates anomalies state
- Updates compressionMetrics state
- Shows in Insights tab

---

#### Message 3: `proposalsUpdated`

**Payload:**
```json
{
  "type": "proposalsUpdated",
  "payload": {
    "suggestedTasks": [
      {
        "id": "task-001",
        "title": "...",
        "priority": "P1",
        "bias": 5
      }
    ]
  }
}
```

OR (with counts):
```json
{
  "type": "proposalsUpdated",
  "payload": {
    "suggestedTasks": [...],
    "counts": {
      "newCount": 3,
      "changedCount": 1
    }
  }
}
```

**Trigger:** 
1. proposals.json FileWatcher detects change
2. Extension sends after parseLLMResponse
3. Extension sends initial data on WebView creation

**When:** 
- On file change (immediate)
- After parse (immediate)
- On WebView creation (after 500ms)

**Debounce:** No (chokidar handles stability)

**Repeat:** Every time proposals.json changes

**WebView Action:**
- Updates proposals state
- Updates devBadge (newCount, changedCount)
- Shows in Dev tab

---

#### Message 4: `patchPreview`

**Payload:**
```json
{
  "type": "patchPreview",
  "payload": {
    "diff": "...",
    "tasksToAdd": [
      {
        "title": "...",
        "priority": "P1",
        "id": "task-001"
      }
    ],
    "biasImpact": 10,
    "currentBias": 5,
    "threshold": 25,
    "allowed": true
  }
}
```

**Trigger:** User clicks "Accept" in Dev tab (submitDecisions message)

**When:** After bias calculation completes

**Debounce:** No

**Repeat:** Every submitDecisions call

**WebView Action:**
- Sets patchPreview state
- Shows diff in Dev tab
- Enables/disables "Apply Patch" button based on allowed

---

#### Message 5: `taskLogChanged`

**Payload:**
```json
{
  "type": "taskLogChanged",
  "payload": {
    "newCount": 5,
    "changedCount": 2
  }
}
```

**Trigger:** 
1. Tasks.RL4 FileWatcher detects change
2. After applyPatch completes
3. After markTaskDone completes

**When:** 
- On file change (immediate)
- After patch application (immediate)
- After mark done (immediate)

**Debounce:** No

**Repeat:** Every time Tasks.RL4 changes

**WebView Action:**
- Updates devBadge (newCount, changedCount)
- Refreshes Dev tab

---

#### Message 6: `taskVerificationResults`

**Payload:**
```json
{
  "type": "taskVerificationResults",
  "payload": [
    {
      "taskId": "task-001",
      "verified": true,
      "verifiedAt": "2025-11-16T11:00:00.000Z",
      "matchedConditions": ["exitCode 0"],
      "matchedEvents": [
        {
          "timestamp": "...",
          "type": "command_end",
          "exitCode": 0
        }
      ],
      "confidence": "high",
      "suggestion": ""
    }
  ]
}
```

**Trigger:** 
1. DEPRECATED: Was every 10s (now removed)
2. NOW: On-demand when WebView sends requestTaskVerifications

**When:** On WebView request only

**Debounce:** No

**Repeat:** Only when requested

**WebView Action:**
- Updates taskVerifications state
- Shows "✅ Verified by RL4" badges
- Shows "Mark as Done" buttons

---

#### Message 7: `taskMarkedDone`

**Payload:**
```json
{
  "type": "taskMarkedDone",
  "payload": {
    "taskId": "task-001"
  }
}
```

**Trigger:** After markTaskDone completes

**When:** Immediately after Tasks.RL4 updated

**Debounce:** No

**Repeat:** Every markTaskDone call

**WebView Action:**
- Removes verification badge for task
- Removes from verified tasks list

---

#### Message 8: `proposalsParsed`

**Payload:**
```json
{
  "type": "proposalsParsed",
  "payload": {
    "count": 3
  }
}
```

**Trigger:** After parseLLMResponse completes successfully

**When:** Immediately after proposals.json written

**Debounce:** No

**Repeat:** Every parseLLMResponse call

**WebView Action:**
- Shows feedback: "✅ X proposals parsed"

---

#### Message 9: `parseError`

**Payload:**
```json
{
  "type": "parseError",
  "payload": "string (error message)"
}
```

**Trigger:** parseLLMResponse fails (no RL4_PROPOSAL found or JSON parse error)

**When:** Immediately after error

**Debounce:** No

**Repeat:** Every parse error

**WebView Action:**
- Shows error message

---

#### Message 10: `githubStatus`

**Payload:**
```json
{
  "type": "githubStatus",
  "payload": {
    "connected": true,
    "repo": "Soynido/rl4-official",
    "reason": ""
  }
}
```

OR (error):
```json
{
  "type": "githubStatus",
  "payload": {
    "connected": false,
    "repo": null,
    "reason": "gh CLI not found"
  }
}
```

**Trigger:** 
1. On WebView creation (after 600ms)
2. After executeCommit completes
3. On githubCheckConnection message from WebView

**When:** 
- Initial: 600ms after WebView created
- After commit: immediate
- On request: immediate

**Debounce:** No

**Repeat:** Multiple times (init + after commits)

**WebView Action:**
- Updates githubStatus state
- Shows connection status in Control tab

---

#### Message 11: `commitPromptGenerated`

**Payload:**
```json
{
  "type": "commitPromptGenerated",
  "payload": {
    "prompt": "string (full commit prompt)",
    "suggestedTitle": "feat: Add feature",
    "suggestedBody": "WHY: Reasoning here..."
  }
}
```

**Trigger:** After generateCommitPrompt completes

**When:** Immediately after prompt generated

**Debounce:** No

**Repeat:** Every generateCommitPrompt call

**WebView Action:**
- Sets commitPrompt state
- Shows suggested title/body in Control tab

---

#### Message 12: `commitCommandGenerated`

**Payload:**
```json
{
  "type": "commitCommandGenerated",
  "payload": "gh api repos/:owner/:repo/commits -F message='...' -F description='...'"
}
```

**Trigger:** After commit prompt generation + user edits title/body

**When:** When user clicks "Generate Command"

**Debounce:** No

**Repeat:** Every command generation

**WebView Action:**
- Sets commitCommand state
- Shows command in Control tab
- Enables "Execute" button

---

#### Message 13: `commitExecuted`

**Payload:**
```json
{
  "type": "commitExecuted",
  "payload": "string (command output)"
}
```

**Trigger:** After executeCommit completes successfully

**When:** Immediately after command succeeds

**Debounce:** No

**Repeat:** Every successful commit

**WebView Action:**
- Shows success message
- Clears commit form

---

#### Message 14: `commitError`

**Payload:**
```json
{
  "type": "commitError",
  "payload": "string (error message)"
}
```

**Trigger:** executeCommit fails

**When:** Immediately after error

**Debounce:** No

**Repeat:** Every commit error

**WebView Action:**
- Shows error message

---

#### Message 15: `kpisUpdated`

**Payload:**
```json
{
  "type": "kpisUpdated",
  "payload": "string (full Context.RL4 content)"
}
```

**Trigger:** 
1. On WebView creation (sendContextToWebView)
2. Context.RL4 FileWatcher detects change

**When:** 
- Initial: 500ms after WebView created
- On change: immediate

**Debounce:** No

**Repeat:** Every Context.RL4 change

**WebView Action:**
- Parses Context.RL4
- Updates cognitiveLoad, nextTasks, planDrift, risks states
- Shows in Insights tab

---

#### Message 16: `tasksLoaded`

**Payload:**
```json
{
  "type": "tasksLoaded",
  "payload": "string (full Tasks.RL4 content)"
}
```

**Trigger:** On WebView creation (sendInitialRL4Data)

**When:** 500ms after WebView created

**Debounce:** No

**Repeat:** Only on WebView creation

**WebView Action:**
- Stores Tasks.RL4 content (if needed)

---

#### Message 17: `adrsLoaded`

**Payload:**
```json
{
  "type": "adrsLoaded",
  "payload": "string (full ADRs.RL4 content)"
}
```

**Trigger:** On WebView creation (sendInitialRL4Data)

**When:** 500ms after WebView created

**Debounce:** No

**Repeat:** Only on WebView creation

**WebView Action:**
- Stores ADRs.RL4 content (if needed)

---

#### Message 18: `patternsUpdated`

**Payload:**
```json
{
  "type": "patternsUpdated",
  "payload": {
    "patterns": [
      {
        "taskId": "task-001",
        "taskTitle": "...",
        "typicalCommands": ["npm test"],
        "successRate": 0.95,
        "avgDuration": 5200,
        "lastRun": "...",
        "runsCount": 23
      }
    ],
    "anomalies": [
      {
        "taskId": "task-001",
        "type": "success_rate_drop",
        "severity": "high",
        "description": "...",
        "expected": 0.95,
        "actual": 0.60,
        "recommendation": "..."
      }
    ]
  }
}
```

**Trigger:** After requestPatterns message from WebView

**When:** Immediately after TerminalPatternsLearner loads data

**Debounce:** No

**Repeat:** Every requestPatterns call

**WebView Action:**
- Updates patterns state
- Updates patternAnomalies state
- Shows in Insights → Patterns tab

---

#### Message 19: `suggestionsUpdated`

**Payload:**
```json
{
  "type": "suggestionsUpdated",
  "payload": [
    {
      "taskId": "task-new",
      "taskTitle": "...",
      "suggestedCondition": "npm test exitCode=0",
      "confidence": "HIGH",
      "reason": "...",
      "matchedPattern": {
        "taskId": "task-001",
        "taskTitle": "...",
        "runsCount": 23,
        "successRate": 0.95
      }
    }
  ]
}
```

**Trigger:** After requestSuggestions message from WebView

**When:** Immediately after TerminalPatternsLearner generates suggestions

**Debounce:** No

**Repeat:** Every requestSuggestions call

**WebView Action:**
- Updates suggestions state
- Shows in Dev tab → "💡 Suggested Conditions" section

---

#### Message 20: `adHocActionsUpdated`

**Payload:**
```json
{
  "type": "adHocActionsUpdated",
  "payload": [
    {
      "timestamp": "...",
      "action": "npm_install",
      "command": "npm install lodash",
      "suggestedTask": "Add lodash dependency to package.json",
      "confidence": "MEDIUM",
      "reason": "..."
    }
  ]
}
```

**Trigger:** After requestAdHocActions message from WebView

**When:** Immediately after AdHocTracker loads data

**Debounce:** No

**Repeat:** Every requestAdHocActions call

**WebView Action:**
- Updates adHocActions state
- Shows in Dev tab → "Suggested from Activity" section

**TRUTH:** This may not be fully wired (AdHocTracker experimental)

---

#### Message 21: `error`

**Payload:**
```json
{
  "type": "error",
  "payload": "string (generic error message)"
}
```

**Trigger:** Various error cases (snapshot generation fails, etc.)

**When:** Immediately after error

**Debounce:** No

**Repeat:** Every error

**WebView Action:**
- Shows error message (toast or banner)

---

### Direction: WebView → Extension

#### Message 1: `generateSnapshot`

**Payload:**
```json
{
  "type": "generateSnapshot",
  "deviationMode": "flexible"
}
```

**Trigger:** User clicks "Generate Snapshot" button in Control tab

**Action:** Generate snapshot with specified mode

**Response:** `snapshotGenerated` + `snapshotMetadata`

---

#### Message 2: `parseLLMResponse`

**Payload:**
```json
{
  "type": "parseLLMResponse"
}
```

**Trigger:** User clicks "Parse LLM Response" button in Control tab

**Action:** Read clipboard, parse JSON, write to proposals.json

**Response:** `proposalsParsed` or `parseError`

---

#### Message 3: `submitDecisions`

**Payload:**
```json
{
  "type": "submitDecisions",
  "decisions": [
    {
      "taskId": "task-001",
      "action": "accept",
      "priority": "P1"
    },
    {
      "taskId": "task-002",
      "action": "reject",
      "reason": "duplicate"
    }
  ]
}
```

**Trigger:** User clicks "Accept" or "Reject" buttons in Dev tab

**Action:** Generate patch preview with bias check

**Response:** `patchPreview`

---

#### Message 4: `applyPatch`

**Payload:**
```json
{
  "type": "applyPatch",
  "patch": {
    "tasksToAdd": [...],
    "biasImpact": 10
  }
}
```

**Trigger:** User clicks "Apply Patch" button after preview

**Action:** Update Tasks.RL4, log to decisions.jsonl

**Response:** `taskLogChanged`

---

#### Message 5: `markTaskDone`

**Payload:**
```json
{
  "type": "markTaskDone",
  "taskId": "task-001"
}
```

**Trigger:** User clicks "Mark as Done" button for verified task

**Action:** Update Tasks.RL4 (check box), add timestamp, log to decisions.jsonl

**Response:** `taskMarkedDone` + `taskLogChanged`

---

#### Message 6: `requestPatterns`

**Payload:**
```json
{
  "type": "requestPatterns"
}
```

**Trigger:** User opens Insights → Patterns tab

**Action:** Load terminal-patterns.json via TerminalPatternsLearner

**Response:** `patternsUpdated`

---

#### Message 7: `requestSuggestions`

**Payload:**
```json
{
  "type": "requestSuggestions"
}
```

**Trigger:** User opens Dev tab (automatic)

**Action:** Read Tasks.RL4, find tasks without `@rl4:completeWhen`, generate suggestions

**Response:** `suggestionsUpdated`

---

#### Message 8: `applySuggestion`

**Payload:**
```json
{
  "type": "applySuggestion",
  "taskId": "task-new",
  "suggestedCondition": "npm test exitCode=0"
}
```

**Trigger:** User clicks "Apply Suggestion" button

**Action:** Update Tasks.RL4 (add `@rl4:completeWhen`), log to decisions.jsonl

**Response:** `taskLogChanged`

---

#### Message 9: `requestAdHocActions`

**Payload:**
```json
{
  "type": "requestAdHocActions"
}
```

**Trigger:** User opens Dev tab → "Suggested from Activity" section

**Action:** Load ad-hoc-actions.jsonl via AdHocTracker

**Response:** `adHocActionsUpdated`

---

#### Message 10: `githubCheckConnection`

**Payload:**
```json
{
  "type": "githubCheckConnection"
}
```

**Trigger:** User clicks "Check Connection" in Control tab

**Action:** Run `gh auth status` via GitHubFineGrainedManager

**Response:** `githubStatus`

---

#### Message 11: `generateCommitPrompt`

**Payload:**
```json
{
  "type": "generateCommitPrompt",
  "context": "manual_trigger"
}
```

**Trigger:** User clicks "Generate Commit Prompt" in Control tab

**Action:** Collect context (commits, files, tasks), generate prompt

**Response:** `commitPromptGenerated`

---

#### Message 12: `generateCommitCommand`

**Payload:**
```json
{
  "type": "generateCommitCommand",
  "title": "feat: Add feature",
  "body": "WHY: Reasoning here..."
}
```

**Trigger:** User edits title/body and clicks "Generate Command"

**Action:** Format `gh api` command with title + body

**Response:** `commitCommandGenerated`

---

#### Message 13: `executeCommit`

**Payload:**
```json
{
  "type": "executeCommit",
  "command": "gh api repos/:owner/:repo/commits ...",
  "why": "Reasoning here..."
}
```

**Trigger:** User clicks "Execute" button

**Action:** Execute command via ExecPool, refresh GitHub status

**Response:** `commitExecuted` or `commitError`, then `githubStatus`

---

#### Message 14: `openFile`

**Payload:**
```json
{
  "type": "openFile",
  "fileName": "extension/extension.ts"
}
```

**Trigger:** User clicks file link in WebView (FileLink component)

**Action:** Open file in VS Code editor

**Response:** None (VS Code action only)

---

#### Message 15: `requestTaskVerifications`

**Payload:**
```json
{
  "type": "requestTaskVerifications"
}
```

**Trigger:** User opens Dev tab (automatic)

**Action:** Run TaskVerificationEngine.verifyAllTasks()

**Response:** `taskVerificationResults`

**TRUTH:** This is the NEW way (replaces 10s polling)

---

### MISSING Messages (From Report but NOT in Code)

**NONE FOUND**

All documented messages appear to be implemented.

---


