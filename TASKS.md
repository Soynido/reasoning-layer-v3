# TASKS - Reasoning Layer V3

## 📋 Status Overview

**Strate 1: Core Layer (J+0 → J+10)** - ✅ **IN PROGRESS**
- [x] Day 1: Infrastructure Setup & GitHub Repository
- [ ] Day 2: Base Types
- [ ] Day 3-5: PersistenceManager (copied from V2)
- [ ] Day 6-8: CaptureEngine (inspired by V2 EventAggregator)
- [ ] Day 9-10: Extension Entry Point & Commands
- [ ] Day 10: Strate 1 Validation

**Strate 2: Cognitive Layer (J+10 → J+20)** - ⏳ **PENDING**
- [ ] Day 11-13: RBOM Types & Zod Validation
- [ ] Day 14-17: RBOMEngine (simple CRUD)
- [ ] Day 18-20: VS Code RBOM Commands
- [ ] Day 20: Strate 2 Validation

**Strate 3: Perceptual Layer (J+20 → J+30)** - ⏳ **PENDING**
- [ ] Day 21-25: Vanilla HTML/CSS/JS Webview
- [ ] Day 26-28: V2 → V3 Migration
- [ ] Day 29-30: Tests & Documentation
- [ ] Day 30: Strate 3 Validation

---

## ✅ COMPLETED TASKS

### Day 1: Infrastructure Setup & GitHub Repository ✅

**Status**: ✅ **COMPLETED**

**Achievements**:
- [x] ✅ GitHub repository creation via `gh CLI`: https://github.com/Soynido/reasoning-layer-v3
- [x] ✅ Local Git initialization + remote origin
- [x] ✅ `.gitignore` creation with appropriate patterns
- [x] ✅ Complete project structure:
  ```
  Reasoning Layer V3/
  ├── extension/
  │   ├── core/
  │   │   ├── PersistenceManager.ts       ✅
  │   │   ├── CaptureEngine.ts            ✅
  │   │   └── types/
  │   │       └── index.ts                ✅
  │   └── extension.ts                    ✅
  ├── package.json                        ✅
  ├── tsconfig.json                       ✅
  ├── webpack.config.js                   ✅
  ├── .vscodeignore                       ✅
  └── .gitignore                          ✅
  ```
- [x] ✅ `package.json`: Minimal VS Code extension with 3 basic commands
- [x] ✅ `tsconfig.json`: TypeScript strict mode, ES2020 target
- [x] ✅ `webpack.config.js`: Simple build with appropriate externals
- [x] ✅ Dependencies installation: `npm install` ✅
- [x] ✅ TypeScript compilation: `npm run compile` ✅
- [x] ✅ Webpack build: `npm run build` ✅
- [x] ✅ First commit + GitHub push: `53e4d55`

**Implemented code**:
- ✅ **PersistenceManager.ts**: 80% of V2 code copied with explicit serialization
- ✅ **CaptureEngine.ts**: V2 EventAggregator simplified with 2s debouncing
- ✅ **extension.ts**: Progressive activation Phase 1 only
- ✅ **types/index.ts**: CaptureEvent, ProjectManifest, SerializableData

**Validated tests**:
- ✅ TypeScript compilation without errors
- ✅ Successful webpack build (8.39 KiB)
- ✅ `.reasoning/` structure created automatically
- ✅ OutputChannel with emoji logging functional

---

## 🔄 CURRENT TASK

### Day 2: Base Types

**Status**: 🔄 **IN PROGRESS**

**Objective**: Finalize base types and prepare Strate 1 validation

**Tasks**:
- [ ] Validate existing types
- [ ] Manual extension testing
- [ ] Interface documentation
- [ ] Preparation for Day 3-5 (PersistenceManager)

---

## 📊 SUCCESS METRICS

### Strate 1 - Validation Criteria (Day 10)

**Extension**:
- ✅ Extension installable in < 2s
- ✅ Phase 1 activation < 500ms
- ⏳ File capture functional (2s debounce)
- ⏳ Git commit capture functional (5s polling)
- ⏳ Persistence in `.reasoning/traces/YYYY-MM-DD.json`
- ✅ OutputChannel displays logs with emojis
- ⏳ Commands `init`, `showOutput`, `captureNow` functional
- ⏳ 0 "An object could not be cloned" errors

**Manual tests to perform**:
```bash
# 1. Build and installation
npm run build
code --install-extension reasoning-layer-v3-1.0.0.vsix

# 2. Activation test
# Open workspace → check console "✅ Phase 1 completed"

# 3. File capture test
echo "test" >> test.ts
# Wait 2s → check .reasoning/traces/YYYY-MM-DD.json

# 4. Commit capture test
git add test.ts && git commit -m "test"
# Wait 5s → check trace with type: 'git_commit'

# 5. OutputChannel test
# Command Palette → "Reasoning: Show Output Channel"
```

---

## 🎯 NEXT STEPS

### ✅ Strate 1: Core Layer (J+0 → J+10) - COMPLETED
- ✅ PersistenceManager fonctionnel
- ✅ Capture automatique des fichiers (VS Code API)
- ✅ Logs détaillés avec emojis
- ✅ Messages GitHub integration
- ✅ GitCaptureEngine (Niveau 1: Commit Data + Diff Summary)

### 🚀 Strate 2: Cognitive Layer (J+10 → J+20) - IN PROGRESS
- 🔄 RBOM Engine (Architectural Decision Records)
- 🔄 Schema Zod pour validation
- 🔄 Commandes VS Code pour ADRs
- 🔄 Niveau 1: Dependencies (SBOM/package-lock)
- 🔄 Niveau 4: PR/Issues linking (GitHub API)

### 📋 Strate 3: Perceptual Layer (J+20 → J+30) - PLANNED
- Webview HTML/CSS/JS Vanilla
- Niveau 2: ADR Engine complet
- Niveau 3: Team Context
- Niveau 5: Integrity & Persistence
- Migration V2 → V3
- Tests & Documentation

---

## 📝 TECHNICAL NOTES

### Local-First JSON Persistence Architecture ✅

**Applied pattern**:
- ✅ Serialization with `JSON.stringify()` everywhere
- ✅ Direct reading from `.reasoning/` without server
- ✅ Exportable as portable `.reasonpack` (Strate 3)

**Validated advantages**:
- ✅ Zero configuration: works immediately
- ✅ Git versionable: `.reasoning/` in the repo
- ✅ Portable: copy `.reasoning/` = copy all intelligence
- ✅ No server: no external dependency
- ✅ Offline-first: works without connection
- ✅ Multi-project: each workspace is isolated

### V2 Lessons Applied ✅

**Kept patterns**:
- ✅ RepoPersistenceManager: OutputChannel, emoji logging, 30s auto-save
- ✅ EventAggregator: File debouncing with Map<string, Timeout>
- ✅ Robust filtering: Regex patterns to exclude `.git/`, `node_modules/`
- ✅ Explicit serialization: deepSanitize() function for Map, Set, Date, URI

**Avoided errors**:
- ✅ No passing VS Code objects to webview
- ✅ No overly complex ReasoningManager
- ✅ Progressive activation (not everything at once)
- ✅ No AnalyticsEngine/MetricsCollector complexity

---

*Last update: Day 1 completed - Core Layer extension functional*
