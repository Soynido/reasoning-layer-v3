# 🏗️ Architecture des Sources RL4 — Guide Complet

**Version** : RL4 v3.2.0  
**Date** : 12 novembre 2025  
**Pour** : Développeurs & Contributeurs

---

## 📂 Vue d'Ensemble de la Structure

```
/
├── extension/              # 🧠 Code source principal (TypeScript)
│   ├── kernel/            # ⚡ RL4 Kernel (Architecture active)
│   ├── core/              # 🔴 RL3 Legacy (Désactivé mais conservé)
│   ├── webview/           # 🎨 Interface utilisateur React
│   ├── commands/          # 📟 Commandes VS Code actives
│   ├── commands.rl3-disabled/  # 🔴 Commandes RL3 désactivées
│   └── extension.ts       # 🚀 Point d'entrée VS Code
│
├── .reasoning_rl4/        # 💾 Données RL4 (générées automatiquement)
├── docs/                  # 📚 Documentation technique
├── scripts/               # 🔧 Scripts utilitaires
├── tests/                 # 🧪 Tests unitaires
├── bench/                 # 📊 Benchmarks performance
└── out/                   # 📦 Code compilé (webpack)
```

---

## 🧠 Extension / — Code Source Principal

### 📍 `extension.ts` — Point d'Entrée

**Rôle** : Point d'entrée de l'extension VS Code

**Fonctions clés** :
- `activate()` : Initialise RL4 au démarrage de VS Code
- `deactivate()` : Cleanup lors de la fermeture
- Enregistre toutes les commandes VS Code
- Bootstrap du RL4 Kernel

**Dépendances** :
```typescript
import { CognitiveScheduler } from './kernel/CognitiveScheduler';
import { TimerRegistry } from './kernel/TimerRegistry';
import { KernelBootstrap } from './kernel/KernelBootstrap';
```

---

## ⚡ Extension / Kernel / — RL4 Kernel (Architecture Active)

**Philosophie** : "Kernel Dumb + LLM Smart"

Le kernel capture tout, n'analyse rien. L'analyse est déléguée à l'agent LLM via prompts.

### 🎯 Fichiers Principaux

| Fichier | Rôle | Lignes | Criticité |
|---------|------|--------|-----------|
| `CognitiveScheduler.ts` | Orchestrateur principal (cycles toutes les 10s) | ~650 | 🔴 CRITICAL |
| `AppendOnlyWriter.ts` | Persistance temps réel (JSONL) | ~200 | 🔴 CRITICAL |
| `TimerRegistry.ts` | Gestion robuste des timers (watchdog) | ~150 | 🔴 CRITICAL |
| `RBOMLedger.ts` | Merkle chain (intégrité cryptographique) | ~300 | 🟡 HIGH |
| `HealthMonitor.ts` | Diagnostics (memory, event loop) | ~200 | 🟡 HIGH |
| `StateRegistry.ts` | Snapshots de l'état kernel | ~150 | 🟡 HIGH |

---

### 📁 Kernel / API / — API Publique pour Agent LLM

**Rôle** : Génération de prompts et parsing des réponses

#### Modules Clés

**`UnifiedPromptBuilder.ts`** (~645 lignes)
- Génère le prompt complet pour l'agent LLM
- Combine 8 sources de données :
  - Plan.RL4 (intention stratégique)
  - Tasks.RL4 (tâches tactiques)
  - Context.RL4 (état opérationnel)
  - ADRs.RL4 (décisions historiques)
  - Historical summary (30 jours compressés)
  - Blind spot data (timeline, git, health)
  - Bias metrics (déviation du plan)
  - ADR detection signals (commits potentiels)

**`WhereAmISnapshot.ts`** (~850 lignes)
- Génère snapshot "Where Am I?" (contexte immédiat)
- Détecte le projet dynamiquement
- Scanne les modules critiques depuis `file_changes.jsonl`
- Format Markdown pour LLM

**`PlanTasksContextParser.ts`** (~450 lignes)
- Parse Plan.RL4 / Tasks.RL4 / Context.RL4
- Extrait : phase, goal, timeline, success criteria, tasks, blockers
- Calcule confidence et bias

**`HistorySummarizer.ts`** (~300 lignes)
- Compresse 30 jours de cycles en 2 KB JSON
- Statistiques : cycles, patterns, forecasts, ADRs
- Trends : hotspots, top files, activity spikes

**`BlindSpotDataLoader.ts`** (~400 lignes)
- Charge les données "blind spot" (invisibles à l'agent LLM sans RL4)
- Timeline, file patterns, git history, health trends

**`ADRParser.ts`** (~200 lignes)
- Parse ADRs depuis `adrs.jsonl`
- Extrait : id, title, status, decision, context, consequences

**`BiasCalculator.ts`** (~250 lignes)
- Calcule le bias (déviation du plan initial)
- Compare Plan.RL4 actuel vs baseline
- Génère recommandations

**`ADRSignalEnricher.ts`** (~350 lignes)
- Détecte les commits potentiels ADR
- Score : commit type, file count, lines changed, core files, cognitive pattern
- Threshold : >70% = ADR probable

---

### 📁 Kernel / Cognitive / — Moteurs Cognitifs (Legacy RL3, Inactifs)

**Status** : Code stable mais **non exécuté** (placeholders dans le kernel)

**Modules disponibles (à activer progressivement) :**

| Module | Lignes | Description | Status |
|--------|--------|-------------|--------|
| `PatternLearningEngine.ts` | ~1,200 | Détecte patterns récurrents | 🔴 Dormant |
| `CorrelationEngine.ts` | ~900 | Trouve corrélations événements | 🔴 Dormant |
| `ForecastEngine.ts` | ~800 | Génère prédictions décisions | 🔴 Dormant |
| `ADRGeneratorV2.ts` | ~1,100 | Synthèse ADRs automatique | 🔴 Dormant |

**Raison** : Phase E3.3 → Focus sur prompt generation (LLM intelligent) avant de réactiver les engines (kernel intelligent).

---

### 📁 Kernel / Inputs / — Capteurs d'Événements

**Rôle** : Capture temps réel des événements du workspace

| Module | Source | Format | Fréquence |
|--------|--------|--------|-----------|
| `FileChangeWatcher.ts` | VS Code FileSystemWatcher | JSONL | Temps réel (debounce 2s) |
| `GitCommitListener.ts` | Git hooks + polling | JSONL | Polling 5s |
| `IDEActivityListener.ts` | VS Code API (onDidChangeActiveTextEditor) | JSONL | Temps réel |
| `BuildMetricsListener.ts` | VS Code Tasks API | JSONL | Event-driven |

**Output** : `.reasoning_rl4/traces/*.jsonl`

---

### 📁 Kernel / Indexer / — Indexation & Agrégation

**Rôle** : Optimise l'accès aux données brutes

| Module | Rôle | Output |
|--------|------|--------|
| `CacheIndex.ts` | Index rapide des cycles | `.reasoning_rl4/cache/index.json` |
| `TimelineAggregator.ts` | Agrège cycles par jour/heure | `.reasoning_rl4/timelines/YYYY-MM-DD.json` |
| `ContextSnapshot.ts` | Snapshot contexte actuel | `.reasoning_rl4/context.json` |
| `SnapshotRotation.ts` | Rotation snapshots (keep 30) | `.reasoning_rl4/context_history/` |
| `DataNormalizer.ts` | Normalise formats hétérogènes | In-memory |

---

### 📁 Kernel / Onboarding / — Séquence d'Initialisation

**Rôle** : Détecte si workspace est nouveau ou existant, puis initialise RL4

| Module | Rôle |
|--------|------|
| `OnboardingDetector.ts` | Détecte si `.reasoning_rl4/` existe |
| `NewWorkspaceOnboarding.ts` | Crée structure initiale |
| `ExistingWorkspaceOnboarding.ts` | Charge état existant |
| `OnboardingOrchestrator.ts` | Coordonne la séquence |

**Flow** :
```
1. Extension activates
2. OnboardingDetector checks .reasoning_rl4/
3. If new → NewWorkspaceOnboarding
   - Create directories
   - Generate default Plan.RL4
   - Initialize kernel artifacts
4. If existing → ExistingWorkspaceOnboarding
   - Load bootstrap state
   - Resume from last cycle
5. Start CognitiveScheduler
```

---

### 📁 Kernel / Adapters / — Compatibilité RL3

**Rôle** : Adaptateurs pour réutiliser code RL3 legacy

| Module | Rôle |
|--------|------|
| `RL3Bridge.ts` | Expose API RL3-compatible au RL4 kernel |
| `PersistenceManagerProxy.ts` | Proxy vers PersistenceManager RL3 |
| `TimerProxy.ts` | Adapte RL3 timers au TimerRegistry RL4 |

**Utilité** : Permet migration progressive RL3 → RL4 sans breaking changes.

---

## 🔴 Extension / Core / — RL3 Legacy (Désactivé)

**Status** : Code stable mais **non connecté au kernel actif**

**Pourquoi conservé ?**
1. Reference pour migration progressive
2. Code réutilisable (engines cognitifs)
3. Backup architectural

### 📁 Core / Base / — Engines Cognitifs RL3

**Modules de raisonnement autonome (à migrer vers RL4)** :

| Module | Lignes | Description | Migration |
|--------|--------|-------------|-----------|
| `PatternLearningEngine.ts` | ~1,200 | ML patterns | ⏳ Planifié E4 |
| `CorrelationEngine.ts` | ~900 | Corrélations | ⏳ Planifié E4 |
| `ForecastEngine.ts` | ~800 | Prédictions | ⏳ Planifié E4 |
| `ADRGeneratorV2.ts` | ~1,100 | Synthèse ADRs | ⏳ Planifié E5 |
| `BiasMonitor.ts` | ~400 | Détection biais | ⏳ Planifié E5 |

---

### 📁 Core / Inputs / — Capteurs RL3

**Capteurs avancés (à migrer vers RL4)** :

| Module | Description | Migration |
|--------|-------------|-----------|
| `GitHubDiscussionListener.ts` | Polling discussions GitHub | 📅 Futur |
| `ShellMessageCapture.ts` | Capture terminal events | 📅 Futur |
| `LLMBridge.ts` | Intégration LLM externe | ⏳ E6 |

---

### 📁 Core / Memory / — Systèmes de Mémoire

**Modules de méta-cognition (à migrer)** :

| Module | Description | Status |
|--------|-------------|--------|
| `SelfReviewEngine.ts` | Auto-évaluation performance | 🔴 Dormant |
| `HistoryManager.ts` | Tracking évolution | 🔴 Dormant |
| `TaskMemoryManager.ts` | Ledger actions | 🔴 Dormant |
| `AutoTaskSynthesizer.ts` | Génération tasks autonome | 🔴 Dormant |

---

### 📁 Core / RBOM / — Reasoning Bill of Materials

**Modules de gestion des ADRs** :

| Module | Description | Status |
|--------|-------------|--------|
| `RBOMEngine.ts` | CRUD ADRs + validation Zod | ✅ Stable (réutilisé) |
| `DecisionSynthesizer.ts` | Détection décisions auto | 🔴 Dormant |
| `ADREvidenceManager.ts` | Gestion preuves | 🔴 Dormant |

---

## 🎨 Extension / Webview / — Interface Utilisateur

**Stack** : React + TypeScript + Vite

### Structure

```
webview/
├── ui/                     # Code source React
│   ├── src/
│   │   ├── App.tsx        # Component principal
│   │   ├── views/
│   │   │   ├── Now.tsx    # Tab "Where Am I?"
│   │   │   ├── Before.tsx # Tab "Timeline Replay"
│   │   │   ├── Next.tsx   # Tab "What's Next?"
│   │   │   └── Restore.tsx # Tab "Snapshots"
│   │   ├── components/
│   │   │   ├── WhereAmI.tsx
│   │   │   └── ui/         # Composants réutilisables
│   │   ├── api/
│   │   │   ├── rl4Hooks.ts  # Hooks React
│   │   │   └── useRL4Store.ts # State management
│   │   ├── utils/
│   │   │   ├── prompts.ts   # Templates prompts
│   │   │   └── contextParser.ts # Parsers .RL4 files
│   │   └── styles/
│   │       ├── globals.css
│   │       ├── components.css
│   │       └── theme.css
│   └── package.json
│
└── dist/                   # Build Vite (servi par VS Code)
    ├── index.html
    └── assets/
```

### Tabs Implémentés

| Tab | Composant | Fonction |
|-----|-----------|----------|
| 🧭 **Now** | `Now.tsx` | Generate Context Snapshot (copie prompt) |
| 🕒 **Before** | `Before.tsx` | Timeline Replay (date picker) |
| 🎯 **Next** | `Next.tsx` | What's Next? (reasoning request) |
| 🧳 **Restore** | `Restore.tsx` | Workspace Snapshots (PIN + ZIP) |

---

## 📟 Extension / Commands / — Commandes VS Code

### Actives

| Fichier | Commandes | Status |
|---------|-----------|--------|
| `adr-validation.ts` | `reasoning.adr.validate` | ✅ Active |
| (dans extension.ts) | `reasoning.generateSnapshot` | ✅ Active |
| (dans extension.ts) | `reasoning.showWebView` | ✅ Active |

### Désactivées (RL3 Legacy)

**Dossier** : `commands.rl3-disabled/`

| Fichier | Commandes | Raison |
|---------|-----------|--------|
| `agent.ts` | `reasoning.agent.*` | Remplacé par prompt generation |
| `execute.ts` | `reasoning.execute.*` | Autopilot désactivé (Phase E3.3) |
| `maintain.ts` | `reasoning.maintain.*` | Maintenance manuelle non nécessaire |
| `observe.ts` | `reasoning.observe.*` | Remplacé par kernel inputs |
| `understand.ts` | `reasoning.understand.*` | Remplacé par prompt analysis |

---

## 💾 .reasoning_rl4/ — Données Générées

**Créé automatiquement** par RL4 au démarrage

```
.reasoning_rl4/
├── ledger/
│   ├── cycles.jsonl           # 13,000+ cycles (append-only)
│   ├── adrs.jsonl              # ADRs ledger
│   └── adr_validations.jsonl   # Validations humaines
│
├── traces/
│   ├── file_changes.jsonl      # Tous les changements fichiers
│   ├── git_commits.jsonl       # Tous les commits
│   └── ide_activity.jsonl      # Activité IDE
│
├── diagnostics/
│   ├── health.jsonl            # Métriques système
│   └── git_pool.jsonl          # Pool Git operations
│
├── context_history/
│   └── snapshot-*.json         # 30 derniers snapshots
│
├── timelines/
│   └── YYYY-MM-DD.json         # Agrégation journalière
│
├── adrs/
│   └── auto/
│       └── adr-proposed-*.json # ADRs auto-générés
│
├── cache/
│   └── index.json              # Index rapide
│
├── kernel/
│   └── state.json.gz           # État kernel compressé
│
├── Plan.RL4                    # Plan stratégique (YAML + Markdown)
├── Tasks.RL4                   # Tâches tactiques (YAML + Markdown)
├── Context.RL4                 # État opérationnel (YAML + Markdown)
├── ADRs.RL4                    # Décisions historiques (Markdown)
│
├── context.json                # Snapshot courant
├── patterns.json               # Patterns détectés
├── forecasts.json              # Prédictions
└── correlations.json           # Corrélations
```

---

## 📚 Docs / — Documentation Technique

| Fichier | Contenu |
|---------|---------|
| `README_ARCHITECTURE.md` | Architecture globale |
| `WHEREAMI_SNAPSHOT_API.md` | API WhereAmI |
| `WHEREAMI_WEBVIEW_INTEGRATION.md` | Intégration WebView |
| `WHY_SMART_UI.md` | Rationale Smart UI (ADR-006) |
| `FileSystemPoller.md` | Polling system docs |
| `RL4_OBSERVER_REPORT.md` | Rapport observateur |

---

## 🔧 Scripts / — Utilitaires

| Fichier | Usage |
|---------|-------|
| `generate-kernel-artifacts.js` | Génère artifacts bootstrap |
| `clean-reasoning.sh` | Nettoie `.reasoning_rl4/` |
| `backup-reasoning.sh` | Backup complet |
| `validate-jsonl.ts` | Valide format JSONL |
| `rebuild-index.ts` | Reconstruit cache |

---

## 🧪 Tests / — Tests Unitaires

```
tests/
├── kernel/
│   ├── RBOMLedger.test.ts      # Tests Merkle chain
│   └── TimerRegistry.test.ts   # Tests timers
│
├── whereami-snapshot.test.ts   # Tests WhereAmI
├── run_intents_eval.js         # Évaluation intents
└── intents_full.json           # Dataset test
```

**Coverage** : ~40% (focus sur modules critiques)

---

## 📊 Bench / — Benchmarks Performance

```
bench/
├── events-10k.ts               # Benchmark 10k événements
├── git-pool.ts                 # Benchmark Git operations
├── stability-2h.ts             # Test stabilité 2h
└── results/
    ├── events-10k.json
    └── git-pool.json
```

**Résultats** :
- 10k events : ~2.5s (4,000 events/s)
- Git pool : ~150ms avg latency
- Stability 2h : 0 crashes, memory stable

---

## 📦 Out / — Code Compilé (Webpack)

```
out/
├── extension.js                # Bundle principal (~1.1 MB)
├── extension.js.map            # Source maps
└── extension.js.LICENSE.txt   # Licenses dépendances
```

**Build** : Webpack 5 avec optimisations production

---

## 🎯 Dépendances Clés

### Runtime (package.json)

| Package | Version | Usage |
|---------|---------|-------|
| `vscode` | `^1.85.0` | VS Code API |
| `zod` | `^3.23.8` | Validation schemas |
| `simple-git` | `^3.25.0` | Git operations |

### DevDependencies

| Package | Version | Usage |
|---------|---------|-------|
| `typescript` | `^5.3.3` | Compilation |
| `webpack` | `^5.102.1` | Bundling |
| `@types/vscode` | `^1.85.0` | Types VS Code |
| `vsce` | `^3.2.1` | Packaging extension |

---

## 🔄 Flow de Données Complet

### 1. Capture (Inputs)

```
Workspace Events
    ↓
FileChangeWatcher.ts → file_changes.jsonl
GitCommitListener.ts → git_commits.jsonl
IDEActivityListener.ts → ide_activity.jsonl
    ↓
AppendOnlyWriter.ts (flush toutes les 10 lignes)
```

### 2. Aggregation (Kernel)

```
Raw JSONL files
    ↓
CognitiveScheduler.ts (cycle toutes les 10s)
    ↓
TimelineAggregator.ts → timelines/YYYY-MM-DD.json
ContextSnapshot.ts → context.json
CacheIndex.ts → cache/index.json
```

### 3. Compression (API)

```
30 jours de données brutes (25 MB)
    ↓
HistorySummarizer.ts
    ↓
Summary JSON (2 KB) — compressé 12,500x
```

### 4. Prompt Generation (API)

```
All sources:
- Plan.RL4
- Tasks.RL4
- Context.RL4
- ADRs.RL4
- Historical summary
- Blind spot data
    ↓
UnifiedPromptBuilder.ts
    ↓
Markdown prompt (~15 KB) → Clipboard
```

### 5. LLM Analysis (External)

```
User paste prompt dans Cursor
    ↓
Agent LLM analyse
    ↓
Agent update Plan/Tasks/Context/ADRs.RL4
```

### 6. Feedback Loop (Watchers)

```
FileWatchers detect .RL4 changes
    ↓
PlanTasksContextParser.ts re-parse
    ↓
WebView refreshes (LiveWatcher)
    ↓
User voit KPIs mis à jour
```

---

## 🗺️ Carte Mentale Simplifiée

```
RL4 Architecture
│
├─ KERNEL (Dumb Logger)
│  ├─ Inputs (capture events)
│  ├─ Scheduler (orchestrate cycles)
│  ├─ Writers (persist JSONL)
│  └─ Indexers (optimize access)
│
├─ API (Prompt Generation)
│  ├─ Builders (generate prompts)
│  ├─ Parsers (parse .RL4 files)
│  ├─ Loaders (load raw data)
│  └─ Summarizers (compress history)
│
├─ WEBVIEW (UI)
│  ├─ React components
│  ├─ Tabs (Now/Before/Next/Restore)
│  └─ FileWatchers (real-time refresh)
│
└─ CORE (Legacy RL3 - Dormant)
   ├─ Cognitive engines (patterns, forecasts)
   ├─ Memory systems (self-review)
   └─ RBOM (ADR management)
```

---

## 🎯 Modules Par Criticité

### 🔴 CRITICAL (Ne jamais casser)

1. `CognitiveScheduler.ts` — Orchestrateur principal
2. `AppendOnlyWriter.ts` — Persistance données
3. `TimerRegistry.ts` — Gestion timers robuste
4. `extension.ts` — Point d'entrée VS Code

### 🟡 HIGH (Important mais réparable)

5. `UnifiedPromptBuilder.ts` — Génération prompts
6. `RBOMLedger.ts` — Merkle chain
7. `HealthMonitor.ts` — Diagnostics
8. `PlanTasksContextParser.ts` — Parse .RL4 files

### 🟢 MEDIUM (Utile mais non bloquant)

9. `HistorySummarizer.ts` — Compression
10. `WhereAmISnapshot.ts` — Snapshot "Now"
11. `BiasCalculator.ts` — Calcul bias
12. `ADRSignalEnricher.ts` — Détection ADRs

### ⚪ LOW (Nice to have)

13. `SnapshotRotation.ts` — Rotation snapshots
14. `DataNormalizer.ts` — Normalisation formats
15. Cognitive engines (dormants)

---

## 🚀 Points d'Entrée Pour Développeur

### Ajouter une Commande VS Code

1. Modifier `extension.ts` :
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('reasoning.myCommand', () => {
       // Logic
     })
   );
   ```

2. Ajouter dans `package.json` :
   ```json
   "contributes": {
     "commands": [{
       "command": "reasoning.myCommand",
       "title": "Reasoning: My Command"
     }]
   }
   ```

### Ajouter un Capteur d'Événements

1. Créer `extension/kernel/inputs/MyListener.ts` :
   ```typescript
   export class MyListener {
     start() {
       // Listen to events
       // Write to AppendOnlyWriter
     }
   }
   ```

2. Intégrer dans `CognitiveScheduler.ts`

### Ajouter une Section au Prompt

1. Modifier `UnifiedPromptBuilder.ts` méthode `formatPrompt()`
2. Charger données depuis `.reasoning_rl4/`
3. Ajouter section Markdown au prompt

---

## 📈 Évolution Prévue

### Phase E4 (Q4 2025)
- ✅ Smart UI KPIs validés par LLM
- ⏳ ADR Auto-Detection signals
- ⏳ Reactive UI (FileWatchers)

### Phase E5 (Q1 2026)
- 📅 Réactivation Cognitive Engines (patterns, forecasts)
- 📅 Migration RL3 → RL4 complète
- 📅 Agent autonome (Loop complet sans humain)

### Phase E6 (Q2 2026)
- 📅 Multi-project support
- 📅 Team collaboration
- 📅 Cloud sync

---

## 🙏 Contributeurs

**Architecture actuelle** : Valentin Galudec  
**Phase** : E3.3 → E4 (Smart UI)  
**Version** : v3.2.0-universal-fix

---

**🎯 Ce document est vivant : mettez-le à jour lors de chaque refactor majeur.**

---

**Date de dernière mise à jour** : 12 novembre 2025, 23:30

