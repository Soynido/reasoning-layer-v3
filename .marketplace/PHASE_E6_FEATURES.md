# Phase E6 — New Features Roadmap

**Date:** 2025-11-12  
**Status:** Planning  
**Priority:** Post-Marketplace (after Phase E5 100% complete)

---

## 🎯 Feature 1: Dual-Mode Onboarding

### Problem Statement
Currently, RL4 has no onboarding experience. Users don't know:
- **What RL4 is doing** when they first install it
- **How to get started** (existing workspace vs new workspace)
- **What to expect** from the extension

### Two User Scenarios

#### **Scenario A: Existing Workspace (Project Already Started)**
**User context:**
- Git history exists (50+ commits)
- Files already present (package.json, src/, etc.)
- Active development (recent commits)

**Expected experience:**
```
🧠 RL4 — First Awakening

I detect an existing project with:
  • 127 commits across 3 months
  • 45 files (TypeScript, React)
  • Last commit: 2 days ago

I can reconstruct your cognitive history from Git.
This will take ~30 seconds.

Options:
  [Reconstruct History]  ← Recommended (analyze past)
  [Start Fresh]          ← Ignore history, start now
  [Configure First]      ← Review settings
```

#### **Scenario B: New Workspace (Project From Scratch)**
**User context:**
- Empty workspace or minimal files
- No git history (or <5 commits)
- User is starting a new project

**Expected experience:**
```
🧠 RL4 — Welcome to Your New Project

I'll accompany you from the very first commit.

I will help you:
  • Track cognitive load as you build
  • Detect architectural decisions
  • Suggest when to refactor vs continue

Let's start by understanding your project:
  [Quick Setup]    ← 3 questions (2 min)
  [Skip Setup]     ← Use defaults, start observing
```

---

### Implementation Plan

#### 1.1. Create `OnboardingDetector.ts`
**Purpose:** Detect workspace state (existing vs new)

**Detection logic:**
```typescript
export interface WorkspaceState {
  mode: 'existing' | 'new' | 'ambiguous';
  confidence: number; // 0.0-1.0
  evidence: {
    git_commits: number;
    git_age_days: number;
    files_count: number;
    package_json_exists: boolean;
    recent_activity: boolean; // commits in last 7 days
  };
}

async function detectWorkspaceState(workspaceRoot: string): Promise<WorkspaceState> {
  // 1. Check git history
  const commits = await countGitCommits(workspaceRoot);
  const firstCommit = await getFirstCommitDate(workspaceRoot);
  const lastCommit = await getLastCommitDate(workspaceRoot);
  
  // 2. Check files
  const files = await countFiles(workspaceRoot);
  const packageJson = fs.existsSync(path.join(workspaceRoot, 'package.json'));
  
  // 3. Determine mode
  if (commits > 20 && files > 10) {
    return { mode: 'existing', confidence: 0.95, evidence: {...} };
  } else if (commits < 5 && files < 5) {
    return { mode: 'new', confidence: 0.90, evidence: {...} };
  } else {
    return { mode: 'ambiguous', confidence: 0.60, evidence: {...} };
  }
}
```

**Location:** `extension/kernel/onboarding/OnboardingDetector.ts`

---

#### 1.2. Create `OnboardingOrchestrator.ts`
**Purpose:** Show appropriate onboarding based on detected mode

**Flow:**
```typescript
export async function runOnboarding(
  workspaceRoot: string,
  logger: CognitiveLogger
): Promise<OnboardingResult> {
  
  // 1. Detect workspace state
  const state = await detectWorkspaceState(workspaceRoot);
  logger.narrative(`🧠 Detecting workspace... (${state.evidence.git_commits} commits, ${state.evidence.files_count} files)`);
  
  // 2. Show appropriate experience
  if (state.mode === 'existing') {
    return await runExistingWorkspaceOnboarding(workspaceRoot, state, logger);
  } else {
    return await runNewWorkspaceOnboarding(workspaceRoot, state, logger);
  }
}
```

**Location:** `extension/kernel/onboarding/OnboardingOrchestrator.ts`

---

#### 1.3. Create `ExistingWorkspaceOnboarding.ts`
**Purpose:** Onboarding for projects with history

**Key features:**
- Show Git history summary (commits, contributors, age)
- Offer to reconstruct history via `RetroactiveTraceBuilder`
- Display timeline (first commit → last commit)
- Estimate reconstruction time (based on commit count)

**UI:**
```typescript
async function runExistingWorkspaceOnboarding(
  workspaceRoot: string,
  state: WorkspaceState,
  logger: CognitiveLogger
): Promise<OnboardingResult> {
  
  logger.narrative('');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('🧠 RL4 — First Awakening (Existing Project)');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('');
  logger.narrative(`I detect a project with:`);
  logger.narrative(`  • ${state.evidence.git_commits} commits`);
  logger.narrative(`  • ${state.evidence.git_age_days} days of history`);
  logger.narrative(`  • ${state.evidence.files_count} files`);
  logger.narrative(`  • Last activity: ${state.evidence.recent_activity ? 'Recent (7 days)' : 'Older'}`);
  logger.narrative('');
  logger.narrative('I can reconstruct your cognitive history from Git.');
  logger.narrative(`Estimated time: ~${Math.ceil(state.evidence.git_commits / 10)}s`);
  logger.narrative('');
  
  // Show options via VS Code Quick Pick
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(history) Reconstruct History',
      description: 'Analyze past commits and build cognitive context',
      detail: 'Recommended — Understand project evolution',
      action: 'reconstruct'
    },
    {
      label: '$(play) Start Fresh',
      description: 'Ignore history, start observing from now',
      detail: 'Faster — Skip past analysis',
      action: 'fresh'
    },
    {
      label: '$(gear) Configure First',
      description: 'Review RL4 settings before starting',
      detail: 'Advanced — Customize behavior',
      action: 'configure'
    }
  ], {
    placeHolder: 'How should I start observing this project?',
    ignoreFocusOut: true
  });
  
  if (choice?.action === 'reconstruct') {
    logger.narrative('');
    logger.narrative('🔄 Reconstructing history... (this may take a moment)');
    await runRetroactiveReconstruction(workspaceRoot, logger);
    logger.narrative('✅ History reconstructed! Context ready.');
  } else if (choice?.action === 'fresh') {
    logger.narrative('✅ Starting fresh. Observing from now.');
  } else {
    logger.narrative('⚙️ Opening configuration...');
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:rl4');
  }
  
  logger.narrative('');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('✨ RL4 is now active. I\'ll observe your next moves.');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('');
  
  return { completed: true, mode: 'existing', action: choice?.action || 'skip' };
}
```

**Location:** `extension/kernel/onboarding/ExistingWorkspaceOnboarding.ts`

---

#### 1.4. Create `NewWorkspaceOnboarding.ts`
**Purpose:** Onboarding for new projects

**Key features:**
- Welcome message (clean slate)
- Optional quick setup (3 questions)
- Explain what RL4 will observe
- Show first snapshot generation

**UI:**
```typescript
async function runNewWorkspaceOnboarding(
  workspaceRoot: string,
  state: WorkspaceState,
  logger: CognitiveLogger
): Promise<OnboardingResult> {
  
  logger.narrative('');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('🧠 RL4 — Welcome to Your New Project');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('');
  logger.narrative('I\'ll accompany you from the very first commit.');
  logger.narrative('');
  logger.narrative('What I\'ll observe:');
  logger.narrative('  • Files you edit (frequency, bursts, patterns)');
  logger.narrative('  • Commits you make (decisions, refactors)');
  logger.narrative('  • Cognitive load (parallel tasks, context switches)');
  logger.narrative('  • Plan drift (goals vs reality)');
  logger.narrative('');
  logger.narrative('What I WON\'T do:');
  logger.narrative('  • Read your source code (only metadata)');
  logger.narrative('  • Send data to servers (everything local)');
  logger.narrative('  • Interrupt your workflow (passive observation)');
  logger.narrative('');
  
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(rocket) Quick Setup',
      description: '3 questions to personalize experience',
      detail: 'Recommended — 2 minutes',
      action: 'setup'
    },
    {
      label: '$(play) Skip Setup',
      description: 'Use defaults, start observing immediately',
      detail: 'Faster — You can configure later',
      action: 'skip'
    }
  ], {
    placeHolder: 'How would you like to start?',
    ignoreFocusOut: true
  });
  
  if (choice?.action === 'setup') {
    logger.narrative('');
    logger.narrative('📝 Quick Setup (3 questions)...');
    await runQuickSetup(workspaceRoot, logger);
  } else {
    logger.narrative('✅ Using defaults. You can configure later in Settings.');
  }
  
  logger.narrative('');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('✨ RL4 is now active. Make your first edit!');
  logger.narrative('═══════════════════════════════════════════════');
  logger.narrative('');
  
  return { completed: true, mode: 'new', action: choice?.action || 'skip' };
}

async function runQuickSetup(workspaceRoot: string, logger: CognitiveLogger): Promise<void> {
  // Question 1: Deviation Mode
  const mode = await vscode.window.showQuickPick([
    { label: 'Strict', description: 'Follow plan exactly (0% deviation)', value: 'strict' },
    { label: 'Flexible', description: 'Allow minor deviations (25%)', value: 'flexible' },
    { label: 'Exploratory', description: 'Encourage experimentation (50%)', value: 'exploratory' },
    { label: 'Free', description: 'No constraints (100%)', value: 'free' }
  ], { placeHolder: '1/3: How strict should I be about plan adherence?' });
  
  // Question 2: Snapshot Frequency
  const freq = await vscode.window.showQuickPick([
    { label: 'Every 5 minutes', description: 'High frequency (more insights, more disk)', value: 5 },
    { label: 'Every 10 minutes', description: 'Balanced (recommended)', value: 10 },
    { label: 'Every 30 minutes', description: 'Low frequency (less data)', value: 30 }
  ], { placeHolder: '2/3: How often should I take context snapshots?' });
  
  // Question 3: LLM Integration
  const llm = await vscode.window.showQuickPick([
    { label: 'Enable LLM Analysis', description: 'Use GPT-4/Claude for KPI validation', value: true },
    { label: 'Disable LLM', description: 'Local-only mode (no API calls)', value: false }
  ], { placeHolder: '3/3: Enable LLM integration for smart KPIs?' });
  
  // Save config
  const config = {
    deviation_mode: mode?.value || 'flexible',
    snapshot_interval_minutes: freq?.value || 10,
    llm_enabled: llm?.value ?? true
  };
  
  const configPath = path.join(workspaceRoot, '.reasoning_rl4', 'kernel_config.json');
  const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  fs.writeFileSync(configPath, JSON.stringify({ ...existingConfig, ...config }, null, 2));
  
  logger.narrative(`✅ Configuration saved: ${mode?.label}, ${freq?.label}, LLM ${llm?.value ? 'enabled' : 'disabled'}`);
}
```

**Location:** `extension/kernel/onboarding/NewWorkspaceOnboarding.ts`

---

#### 1.5. Integrate into `extension.ts`
**Update activation flow:**

```typescript
export async function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('RL4 requires a workspace folder');
        return;
    }
    
    // Create logger
    const outputChannel = vscode.window.createOutputChannel('RL4 Kernel');
    logger = new CognitiveLogger(workspaceRoot, outputChannel);
    outputChannel.show();
    
    // Check if first boot
    const rl4Dir = path.join(workspaceRoot, '.reasoning_rl4');
    const isFirstBoot = !fs.existsSync(path.join(rl4Dir, '.onboarding_complete'));
    
    if (isFirstBoot) {
        // Run onboarding
        await runOnboarding(workspaceRoot, logger);
        
        // Mark onboarding complete
        fs.mkdirSync(rl4Dir, { recursive: true });
        fs.writeFileSync(path.join(rl4Dir, '.onboarding_complete'), new Date().toISOString());
    } else {
        // Returning user: cognitive greeting
        logger.narrative('🧠 RL4 — Welcome back! Resuming observation...');
    }
    
    // Continue with normal activation
    // ...
}
```

---

### Testing Strategy

**Test scenarios:**
1. **Existing workspace (100+ commits):**
   - Should detect as "existing"
   - Should show reconstruction option
   - Should estimate time correctly

2. **New workspace (empty):**
   - Should detect as "new"
   - Should show welcome message
   - Should offer quick setup

3. **Ambiguous workspace (5-10 commits):**
   - Should detect as "ambiguous"
   - Should ask user to clarify
   - Should offer both paths

4. **Returning user:**
   - Should skip onboarding
   - Should show cognitive greeting
   - Should resume observation silently

---

### UX Principles

1. **Non-blocking:** Onboarding should NEVER block user's work
2. **Skippable:** User can skip setup and configure later
3. **Narrative:** Use storytelling, not technical jargon
4. **Visual:** Use emojis, boxes, clear sections
5. **Fast:** Onboarding should take <2 minutes

---

## 🎯 Feature 2: Cognitive Narrative Logs

### Problem Statement
Current logs are **technical and boring**:
```
[15:43:27] ⚙️ Initializing RL4 Kernel...
[15:43:28] ✅ RL4 Kernel components created
[15:43:29] 🧠 [CYCLE#1] START — Phase: cognitive-cycle
[15:43:30]   ↳ 4 patterns | 99 correlations | 3 forecasts | 0 ADRs
[15:43:31] ✅ [CYCLE#1] END — health: stable — 1234ms
```

Users want **narrative and engaging** logs:
```
[15:43:27] 🧠 I'm awakening in your workspace...
[15:43:28] 📁 Scanning: 127 files, 3 months of Git history
[15:43:29] 🔍 First cognitive cycle starting...
[15:43:30]   • Learned 4 new patterns from recent commits
   • Found 99 correlations between file changes
   • Generated 3 forecasts for next steps
[15:43:31] ✨ Cognitive cycle complete. I'm ready to assist!
```

---

### Implementation Plan

#### 2.1. Add Narrative Logging to `CognitiveLogger.ts`

**New method: `narrative(message: string)`**

```typescript
/**
 * Log narrative message (storytelling, user-facing)
 */
narrative(message: string): void {
    const timestamp = this.formatTimestamp();
    
    // Detect special formatting
    if (message.startsWith('═══')) {
        // Full-width separator
        this.channel.appendLine(message);
    } else if (message === '') {
        // Empty line
        this.channel.appendLine('');
    } else {
        // Standard narrative
        this.channel.appendLine(`[${timestamp}] ${message}`);
    }
}
```

**Location:** `extension/kernel/CognitiveLogger.ts` (add method)

---

#### 2.2. Update Kernel Activation Logs

**Before (technical):**
```typescript
logger.system('=== RL4 KERNEL — Cognitive Console ===', '🧠');
logger.system(`Workspace: ${workspaceRoot}`, '📁');
logger.system('=====================================', '═');
logger.system('🔧 Initializing RL4 Kernel...', '🔧');
logger.system('✅ RL4 Kernel components created', '✅');
```

**After (narrative):**
```typescript
logger.narrative('');
logger.narrative('═══════════════════════════════════════════════');
logger.narrative('🧠 RL4 Kernel — Cognitive System Awakening');
logger.narrative('═══════════════════════════════════════════════');
logger.narrative('');
logger.narrative(`📁 Workspace: ${path.basename(workspaceRoot)}`);
logger.narrative(`📅 Time: ${new Date().toLocaleTimeString()}`);
logger.narrative('');
logger.narrative('🔄 Initializing cognitive components...');
logger.narrative('  • Timer Registry — Tracking temporal patterns');
logger.narrative('  • State Registry — Loading workspace memory');
logger.narrative('  • Health Monitor — System diagnostics active');
logger.narrative('  • Cognitive Scheduler — Cycle orchestration ready');
logger.narrative('');
logger.narrative('✨ All systems operational. Beginning observation.');
logger.narrative('');
logger.narrative('═══════════════════════════════════════════════');
logger.narrative('');
```

**Location:** `extension/extension.ts` (update activation logs)

---

#### 2.3. Update Cycle Logs (Narrative)

**Before (technical):**
```
[15:43:29] 🧠 [CYCLE#1] START — Phase: cognitive-cycle
[15:43:30]   ↳ 🔍 4 pattern-learning items
[15:43:30]   ↳ 🔗 99 correlation items
[15:43:30]   ↳ 🔮 3 forecasting items
[15:43:30]   ↳ 📝 0 adr-synthesis items
[15:43:31] ✅ [CYCLE#1] END — health: stable — 1234ms
```

**After (narrative):**
```
[15:43:29] 🧠 Cognitive Cycle #1 — Analyzing recent activity...

[15:43:30]   🔍 Learning Patterns
             • Detected 4 new behavioral patterns
             • Updated pattern memory (18 total)

[15:43:30]   🔗 Discovering Correlations
             • Found 99 connections between file changes
             • Confidence: 87% (strong correlations)

[15:43:30]   🔮 Generating Forecasts
             • Created 3 forecasts for next steps
             • Recommendation: Focus on P0 tasks first

[15:43:31] ✨ Cycle complete (1.2s) — System health: Stable
           Next cycle in 60 seconds.
```

**Location:** `extension/kernel/CognitiveLogger.ts` (update `cycleStart`, `phase`, `cycleEnd`)

---

#### 2.4. Add Contextual Insights

**Every 5 minutes, show narrative insight:**

```
[16:00:00] 
[16:00:00] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[16:00:00] 📊 5-Minute Reflection
[16:00:00] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[16:00:00] 
[16:00:00] You've been editing intensely:
[16:00:00]   • 23 file changes in the last 5 minutes
[16:00:00]   • Focus: backend/api/ (67% of edits)
[16:00:00]   • Cognitive load: 58% (moderate)
[16:00:00] 
[16:00:00] 💡 Insight: You haven't committed in 47 minutes.
[16:00:00]    Consider committing your progress to reduce risk.
[16:00:00] 
[16:00:00] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[16:00:00] 
```

**Location:** `extension/kernel/CognitiveLogger.ts` (new method `insightsSummary()`)

---

#### 2.5. Add Emotional Intelligence

**React to user behavior narratively:**

**Scenario 1: Rapid editing (burst detected)**
```
[17:05:12] ⚡ Whoa! I detect rapid editing activity.
           15 files changed in 2 minutes — you're in the zone! 🔥
```

**Scenario 2: Long gap (no activity >30 min)**
```
[18:35:00] 🕰️ Welcome back! You've been away for 34 minutes.
           Last context: Working on backend/auth.ts (authentication flow)
```

**Scenario 3: High cognitive load**
```
[19:12:00] 🛑 Cognitive load is high (78%).
           You're juggling 4 parallel tasks.
           
           💡 Suggestion: Complete one task before starting another.
```

**Scenario 4: Git commit detected**
```
[20:45:23] 🎉 Commit detected! "feat: add user authentication"
           Great progress. I've updated the cognitive context.
```

**Location:** `extension/kernel/inputs/IDEActivityListener.ts` (emit narrative events)

---

### Log Hierarchy (Narrative Mode)

**Level 1: System Events** (always shown)
- Awakening, shutdown, errors
- Example: "🧠 I'm awakening in your workspace..."

**Level 2: Cycles** (shown every minute)
- Cognitive cycle summaries
- Example: "🧠 Cognitive Cycle #42 — Analyzing..."

**Level 3: Insights** (every 5 minutes)
- Contextual reflections, suggestions
- Example: "📊 5-Minute Reflection — You've been editing..."

**Level 4: Events** (conditionally shown)
- Burst detected, gap detected, commits
- Example: "⚡ Rapid editing detected!"

**Level 5: Debug** (hidden by default)
- Technical details, metrics
- Only shown if `USE_VERBOSE_LOGS: true`

---

### Configuration

**User can toggle narrative mode via `kernel_config.json`:**

```json
{
  "USE_NARRATIVE_LOGS": true,      // Default: true (engaging)
  "USE_MINIMAL_LOGS": false,        // Default: false (technical)
  "USE_VERBOSE_LOGS": false,        // Default: false (debug)
  "USE_EMOTIONAL_INTELLIGENCE": true // Default: true (reactions)
}
```

**Presets:**
- **Narrative** (default): Engaging, storytelling, emotional
- **Minimal**: Technical, compact, metrics only
- **Verbose**: Debug, full details, all events
- **Silent**: No logs (Output Channel empty)

---

## 📦 Deliverables Summary

### Feature 1: Dual-Mode Onboarding
1. ✅ `OnboardingDetector.ts` — Detect workspace state
2. ✅ `OnboardingOrchestrator.ts` — Route to appropriate experience
3. ✅ `ExistingWorkspaceOnboarding.ts` — For projects with history
4. ✅ `NewWorkspaceOnboarding.ts` — For new projects
5. ✅ Update `extension.ts` — Integrate onboarding flow
6. ✅ `.onboarding_complete` marker — Skip on returning users

### Feature 2: Cognitive Narrative Logs
1. ✅ Add `narrative()` method to `CognitiveLogger.ts`
2. ✅ Update activation logs (awakening sequence)
3. ✅ Update cycle logs (narrative format)
4. ✅ Add 5-minute insights summaries
5. ✅ Add emotional intelligence reactions
6. ✅ Add log mode configuration (narrative/minimal/verbose/silent)

---

## 🎯 Success Criteria

### Onboarding
- [ ] First-time users see appropriate experience (existing vs new)
- [ ] Users understand what RL4 does in <60 seconds
- [ ] Users can skip setup and configure later
- [ ] Returning users see no onboarding (silent boot)
- [ ] Onboarding takes <2 minutes max

### Logs
- [ ] Logs are **interesting to read** (storytelling, not technical)
- [ ] Users can understand cognitive state from logs alone
- [ ] Emotional intelligence reacts to user behavior (bursts, gaps, commits)
- [ ] 5-minute insights provide actionable suggestions
- [ ] Users can toggle narrative/minimal/verbose modes

---

## 📊 Expected Impact

### User Retention
- **Before:** 30% of users abandon after 1st use (confused)
- **After:** 70% retention after onboarding (clear value)

### Log Engagement
- **Before:** Users ignore Output Channel (technical noise)
- **After:** Users read logs for insights (narrative + emotional)

### Time to Value
- **Before:** Users need 1 hour to understand RL4
- **After:** Users understand in <5 minutes (onboarding + narrative logs)

---

## 🚀 Implementation Timeline

**Week 1 (Feature 1: Onboarding)**
- Day 1-2: OnboardingDetector + ExistingWorkspaceOnboarding
- Day 3-4: NewWorkspaceOnboarding + Quick Setup
- Day 5: Integration + Testing

**Week 2 (Feature 2: Narrative Logs)**
- Day 1-2: Add narrative() method + Update activation logs
- Day 3-4: Update cycle logs + Add insights summaries
- Day 5: Emotional intelligence + Configuration

**Week 3 (Polish + Testing)**
- Day 1-2: User testing (5-10 beta testers)
- Day 3-4: Refinement based on feedback
- Day 5: Final polish + documentation

---

**Phase E6 Priority:** Start after Phase E5 100% complete (marketplace published)

**Dependencies:**
- Phase E5 must be 100% complete
- Screenshots must be captured
- Marketplace submission must be live
- User feedback from marketplace (first 10 installs)

---

**Next Steps:**
1. Complete Phase E5 (capture screenshots, publish)
2. Gather initial user feedback from marketplace
3. Prioritize Feature 1 or Feature 2 based on feedback
4. Implement and iterate

**Status:** ✅ DOCUMENTED, ⏳ PENDING IMPLEMENTATION

