# Context Management — RL3 vs RL4

**Date** : 2025-11-03  
**Purpose** : Maintenir le contexte séparé entre RL3 (legacy) et RL4 (kernel)

---

## 🎯 Quick Reference

### Quel Système Utiliser ?

| Question | Réponse |
|----------|---------|
| **Le kernel qui tourne actuellement ?** | RL4 (`extension/kernel/`) |
| **Les cycles qui s'exécutent ?** | RL4 (`CognitiveScheduler.ts`) |
| **Les données actuelles ?** | `.reasoning_rl4/` |
| **Les engines cognitifs ?** | RL3 (code existe mais inactif) |
| **Les input listeners ?** | RL3 (code existe mais inactif) |

### Paths Clés

| Type | RL3 | RL4 |
|------|-----|-----|
| **Config** | `.reasoning/kernel_config.json` | `.reasoning_rl4/kernel_config.json` ✅ |
| **Cycles** | N/A | `.reasoning_rl4/ledger/cycles.jsonl` ✅ |
| **Traces** | `.reasoning/traces/` | `.reasoning_rl4/traces/` |
| **State** | `.reasoning/state/` | `.reasoning_rl4/state/` ✅ |
| **Health** | `.reasoning/diagnostics/health.jsonl` | `.reasoning_rl4/diagnostics/health.jsonl` ✅ |
| **Patterns** | `.reasoning/patterns.json` | `.reasoning_rl4/patterns.jsonl` (future) |
| **ADRs** | `.reasoning/ADRs/` | `.reasoning_rl4/ADRs/` (future) |

---

## 📊 État Actuel (2025-11-03 18:38)

### ✅ RL4 Kernel (ACTIF)

**Code** : `extension/kernel/`  
**Data** : `.reasoning_rl4/`  
**Extension** : `reasoning-layer-rl4@2.0.1`  
**Output** : Output Channel "RL4 Kernel"

**Composants Actifs** :
- ✅ `CognitiveScheduler` → Génère cycles toutes les 10s
- ✅ `TimerRegistry` → Gère les timers (watchdog actif)
- ✅ `AppendOnlyWriter` → Flush auto toutes les 10 lignes
- ✅ `RBOMLedger` → Merkle chain (intégrité cryptographique)
- ✅ `HealthMonitor` → Diagnostics (health.jsonl)
- ✅ `StateRegistry` → Snapshots (kernel.json)

**Métriques Actuelles** :
- Cycles générés : 529 (depuis plusieurs sessions)
- Dernier cycle : 18:38:17 UTC
- Uptime : Continu (watchdog auto-restart)
- Crash rate : 0%

**Limitations** :
- ❌ Phases cognitives = placeholders (Pattern/Correlation/Forecast/ADR)
- ❌ Pas d'Input Layer (Git/Files/GitHub/Shell)
- ❌ Pas d'output riche (logs basiques uniquement)

---

### ⚠️ RL3 System (DORMANT)

**Code** : `extension/core/`  
**Data** : `.reasoning/`  
**Extension** : Désactivée (remplacée par RL4)  
**Output** : N/A

**Composants Disponibles (Inactifs)** :
- 🔴 `PatternLearningEngine` → 1,200 lignes (prêt à migrer)
- 🔴 `CorrelationEngine` → 900 lignes (prêt à migrer)
- 🔴 `ForecastEngine` → 800 lignes (prêt à migrer)
- 🔴 `ADRGeneratorV2` → 1,100 lignes (prêt à migrer)
- 🔴 `GitCommitListener` → 450 lignes (prêt à migrer)
- 🔴 `FileChangeWatcher` → 450 lignes (prêt à migrer)
- 🔴 `GitHubDiscussionListener` → 400 lignes (prêt à migrer)
- 🔴 `ShellMessageCapture` → 400 lignes (prêt à migrer)

**Data Legacy** :
- `.reasoning/manifest.json` → Last: 2025-11-03 18:51
- `.reasoning/traces/2025-11-03.json` → 4.0K
- `.reasoning/diagnostics/health.jsonl` → 308 lines

**Status** : Code stable mais **non exécuté** (pas connecté au kernel actif).

---

## 🔀 Migration Strategy

### Architecture Cible (Hybrid RL3+RL4)

```
┌─────────────────────────────────────────────────────────┐
│                   RL4 KERNEL (Orchestrator)             │
│  ✅ CognitiveScheduler → Cycles toutes les 10s          │
│  ✅ TimerRegistry → Gestion timers robuste              │
│  ✅ AppendOnlyWriter → Persistance temps réel           │
│  ✅ RBOMLedger → Merkle chain intégrité                 │
└─────────────────────────────────────────────────────────┘
                          ↓ appelle
┌─────────────────────────────────────────────────────────┐
│              RL3 COGNITIVE ENGINES (Workers)            │
│  🔄 PatternLearningEngine → Détecte patterns           │
│  🔄 CorrelationEngine → Trouve corrélations            │
│  🔄 ForecastEngine → Prédit futures décisions          │
│  🔄 ADRGeneratorV2 → Génère ADRs auto                  │
└─────────────────────────────────────────────────────────┘
                          ↑ reçoit données
┌─────────────────────────────────────────────────────────┐
│               RL3 INPUT LAYER (Sensors)                 │
│  🔄 GitCommitListener → Écoute commits                 │
│  🔄 FileChangeWatcher → Watch file changes             │
│  🔄 GitHubListener → Monitor discussions               │
│  🔄 ShellCapture → Capture terminal events             │
└─────────────────────────────────────────────────────────┘
                          ↓ écrit dans
                  .reasoning_rl4/traces/
```

**Principe** : 
- ✅ **RL4 Kernel** = Infrastructure robuste (orchestration, persistance, timers)
- 🔄 **RL3 Engines** = Logique métier (patterns, correlations, forecasts, ADRs)
- 🔄 **RL3 Inputs** = Capteurs (Git, Files, GitHub, Shell)

**Tout converge vers** `.reasoning_rl4/` (single source of truth).

---

## 📝 Cheat Sheet — Quelle Commande Pour Quoi ?

### Debugging RL4 Kernel

```bash
# Voir les cycles en cours
tail -10 .reasoning_rl4/ledger/cycles.jsonl | jq -c '{cycleId, timestamp: .timestamp[11:23]}'

# Vérifier si le scheduler tourne
ps aux | grep "Cursor" | grep -v grep

# Voir le dernier cycle
tail -1 .reasoning_rl4/ledger/cycles.jsonl | jq '{cycleId, timestamp, merkleRoot: .merkleRoot[:16]}'

# Compter cycles total
wc -l < .reasoning_rl4/ledger/cycles.jsonl

# Voir health monitor
tail -10 .reasoning_rl4/diagnostics/health.jsonl | jq -c '{timestamp: ._timestamp[11:23], status}'
```

### Debugging RL3 Engines (Futur)

```bash
# Voir patterns détectés (après migration)
cat .reasoning_rl4/patterns.jsonl | jq -c '{id, name, confidence}'

# Voir correlations (après migration)
cat .reasoning_rl4/correlations.jsonl | jq -c '{id, strength}'

# Voir forecasts (après migration)
cat .reasoning_rl4/forecasts.jsonl | jq -c '{id, category, confidence}'

# Voir ADRs générés (après migration)
ls -lh .reasoning_rl4/ADRs/auto/
```

### Debugging Extension

```bash
# Recompiler
npm run compile

# Packager
npm run package

# Installer
/Applications/Cursor.app/Contents/Resources/app/bin/cursor \
  --install-extension reasoning-layer-rl4-2.0.1.vsix --force

# Voir logs (dans VS Code)
# Output → RL4 Kernel
```

---

## 🎯 Navigation Contexte (Pour Cursor Agent)

### Quand Travailler sur RL4 Kernel

**Scope** : `extension/kernel/`  
**Tests** : Cycles, timers, persistance, health  
**Data** : `.reasoning_rl4/`  
**Objectif** : Infrastructure robuste

**Fichiers clés** :
- `extension/kernel/CognitiveScheduler.ts` → Orchestrateur
- `extension/kernel/AppendOnlyWriter.ts` → Persistance
- `extension/kernel/TimerRegistry.ts` → Timers
- `extension/extension.ts` → Entry point

### Quand Travailler sur RL3 Engines

**Scope** : `extension/core/base/`  
**Tests** : Pattern detection, correlation, forecasting, ADR generation  
**Data** : `.reasoning_rl4/` (migré depuis `.reasoning/`)  
**Objectif** : Intelligence cognitive

**Fichiers clés** :
- `extension/core/base/PatternLearningEngine.ts` → ML patterns
- `extension/core/base/CorrelationEngine.ts` → Corrélations
- `extension/core/base/ForecastEngine.ts` → Prédictions
- `extension/core/base/ADRGeneratorV2.ts` → ADR synthesis

### Quand Travailler sur Input Layer

**Scope** : `extension/core/inputs/`  
**Tests** : Capture events (Git, Files, GitHub, Shell)  
**Data** : `.reasoning_rl4/traces/`  
**Objectif** : Capteurs temps réel

**Fichiers clés** :
- `extension/core/inputs/GitCommitListener.ts` → Git hooks
- `extension/core/inputs/FileChangeWatcher.ts` → File watching
- `extension/core/inputs/GitHubDiscussionListener.ts` → GitHub polling
- `extension/core/inputs/ShellMessageCapture.ts` → Terminal capture

---

## 🚀 Plan d'Action Simplifié

### Option A : Activation Progressive RL3 → RL4 (Recommandé)

**Semaine 1** : Migrer Cognitive Engines
1. Adapter `PatternLearningEngine` pour RL4 kernel
2. Adapter `CorrelationEngine` pour RL4 kernel
3. Adapter `ForecastEngine` pour RL4 kernel
4. Adapter `ADRGeneratorV2` pour RL4 kernel

**Semaine 2** : Migrer Input Layer
1. Adapter `GitCommitListener` pour RL4 kernel
2. Adapter `FileChangeWatcher` pour RL4 kernel
3. Adapter `GitHubListener` pour RL4 kernel
4. Adapter `ShellCapture` pour RL4 kernel

**Résultat** : Système complet RL3+RL4 avec kernel robuste.

### Option B : Dual System (RL3 et RL4 séparés)

**RL3** : Maintenir comme système legacy complet  
**RL4** : Construire nouveau système from scratch

**Avantage** : Zero risque de casse RL3  
**Inconvénient** : Double maintenance

---

## 📌 Règles de Contexte (Pour Cursor Agent)

### Avant de Modifier un Fichier

1. **Identifier le système** : RL3 (`extension/core/`) ou RL4 (`extension/kernel/`) ?
2. **Vérifier data path** : `.reasoning/` ou `.reasoning_rl4/` ?
3. **Confirmer si actif** : Le code est-il appelé par `extension.ts` ?

### Tests à Faire

| Système | Test Command | Expected |
|---------|--------------|----------|
| RL4 Kernel | `tail -5 .reasoning_rl4/ledger/cycles.jsonl` | Nouveaux cycles toutes les 10s |
| RL3 Engines | `cat .reasoning_rl4/patterns.jsonl` | Patterns détectés (après migration) |
| RL3 Inputs | `cat .reasoning_rl4/traces/*.jsonl` | Events capturés (après migration) |

---

## 🎬 Prochaine Action Recommandée

**Étape 1 : Activer le premier engine RL3**

Migrer `PatternLearningEngine` de RL3 → RL4 :
1. Copier vers `extension/kernel/cognitive/`
2. Adapter imports (AppendOnlyWriter, UnifiedLogger)
3. Intégrer dans `CognitiveScheduler.ts` (ligne 193-197)
4. Tester : vérifier que `patterns.count > 0` dans cycles.jsonl

**Voulez-vous que je commence ?**

---

## 📚 Documents de Référence

- `RL4_VISION_AND_ROADMAP.md` → Vision long terme
- `RL4_MIGRATION_PLAN.md` → Plan détaillé migration
- `TASKS.md` → Liste complète tâches RL3
- `CONTEXT_RL3_RL4.md` → Ce fichier (navigation contexte)

**Mettez à jour ce fichier** quand vous migrez des composants.

