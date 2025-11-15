# 📋 Plan d'Amélioration des Logs RL4 Kernel

**Version**: 2.0  
**Date**: 2025-11-14  
**Objectif**: Logs complémentaires centrés sur la transparence et le snapshot

---

## 🎯 Vision Révisée

**Les logs doivent montrer qu'on capture TOUT, puis être créatifs uniquement autour des snapshots.**

### Les 3 Types de Données RL4

| Type | Source | Contenu | Quand |
|------|--------|---------|-------|
| **📊 Données Brutes** | Kernel (capture) | cycles.jsonl, file_changes.jsonl, git_commits.jsonl, health.jsonl | Continu |
| **🧠 Données Intelligentes** | LLM (prompts) | Inférences, suggestions, insights, commandes | **Uniquement lors du snapshot** |
| **📁 Données Structurées** | Fichiers RL4 | Plan.RL4, Tasks.RL4, Context.RL4, ADRs | Après validation LLM |

### Complémentarité avec les autres interfaces :

| Interface | Rôle | Contenu | Fréquence |
|-----------|------|---------|-----------|
| **Logs (Output Channel)** | **Transparence totale** | On capture TOUT, voici ce qu'on a capturé | Continu |
| **Smart UI (WebView)** | État actuel | KPIs, Cards, Dashboard (données structurées) | Temps réel |
| **Prompts (Snapshots)** | Contexte complet | Plan, Tasks, History, ADRs + **Insights LLM** | **À la demande** |

---

## 🔑 Principes Fondamentaux

### 1. **Transparence Avant Tout**
- Montrer qu'on log vraiment TOUT (cycles, file changes, commits)
- Pas de "magie", on voit ce qui est capturé
- Logs bruts accessibles et compréhensibles

### 2. **Insights Centrés sur Snapshots**
- ❌ **PAS** d'inférences continues pendant le développement
- ✅ **UNIQUEMENT** des insights lors de la génération de snapshot
- Logs intelligents = partie du snapshot généré

### 3. **Respect des Gaps**
- Users ne commitent pas tout le temps → **Normal**
- Temps entre snapshots → **Normal**
- Pas d'inférence entre snapshots (juste capture brute)

---

## 📊 Structure des Logs

### **Section 1 : Capture Continue (Transparence)**

**Objectif** : Montrer qu'on capture vraiment TOUT

#### A. Cycles Cognitifs (Silencieux par défaut)
```
[14:23:15] 📊 **Cycle #1234** — Silent (running in background)
           └─ Status: ✅ Captured (no visible changes)
```

**Quand** : **PAS de log par défaut** — On capture silencieusement
**Log seulement si** :
- Erreur détectée
- Pattern significatif détecté (nouveau pattern, pattern évolué)
- Checkpoint périodique (toutes les heures, pas toutes les 100 cycles)

#### B. File Changes (Agrégation toutes les 30 secondes)
```
[14:25:30] 📝 **File Changes (Last 30s)**
           └─ Files Modified: 3 (extension.ts, api/builder.ts, kernel/scheduler.ts)
           └─ Total Edits: 12 edits
           └─ Hotspot: extension.ts (8 edits in 30s)
           └─ Status: ✅ Captured
```

**Quand** : **Toutes les 30 secondes** (agrégation des changements)
**Log seulement si** : Changements détectés (sinon silence)

#### C. Git Commits (TOUS les commits, c'est rare donc OK)
```
[14:30:45] 🔀 **Git Commit Captured**
           └─ Hash: a1b2c3d
           └─ Message: feat(rl4): Add NarrativeLogger for intelligent logs
           └─ Author: Soynido
           └─ Files: 3 changed (+245/-12)
           └─ Intent: feature (keywords: logger, narrative)
           └─ Timestamp: 2025-11-14T14:30:45.789Z
```

**Quand** : **TOUS** les commits (c'est rare, donc pas de spam)
**Important** : Montrer qu'on capture TOUT (transparence)

#### D. Health Metrics (Silencieux sauf problème)
```
[14:35:00] 💚 **Health Check**
           └─ Memory: 305MB
           └─ Event Loop: 0.05ms p50
           └─ Status: ✅ Healthy
```

**Quand** : **PAS de log si healthy** (silence = tout va bien)
**Log seulement si** :
- Problème détecté (memory > 400MB, event loop > 1ms)
- Résumé périodique (toutes les heures)

#### E. Gaps & Inactivité (Silencieux, normal)
```
[14:40:00] ⏸️ **Gap Detected** — Inactive (normal)
           └─ Last Activity: 15 min ago
           └─ Status: ✅ Capturing continues in background
```

**Quand** : **PAS de log par défaut** (inactivité = normal)
**Log seulement si** : Retour après longue absence (>1h) → "Welcome back"

---

### **Section 2 : Résumés Périodiques (Sans Inférence)**

**Objectif** : Synthèse de ce qui a été capturé, SANS interprétation

#### A. Résumé Périodique (Toutes les heures)
```
[15:00:00] 📊 **Hourly Summary (Last Hour)**
           └─ Cycles: 360 captured (silent)
           └─ File Changes: 127 events aggregated
           └─ Git Commits: 8 commits
           └─ Health: ✅ All systems healthy
           └─ Status: ✅ All systems capturing
           └─ Data Integrity: ✅ All JSONL files valid
```

**Quand** : **Toutes les heures** (pas toutes les 100 cycles = 50 min)
**Format** : Court, résumé, pas de détails

#### B. Résumé de Session (Début)
```
[14:00:00] === RL4 KERNEL — Session Start ===
[14:00:01] 📊 **Capture Status**
           └─ Workspace: PS (T7 Rewards)
           └─ Total Events Captured: 2,847
           └─ Last Cycle: #2847 (2 min ago)
           └─ Files Tracked: 89 files
           └─ GitHub Status: ✅ Connected
[14:00:02] └─ Capture Active: ✅ All listeners running
[14:00:03] └─ Data Integrity: ✅ All JSONL files valid
[14:00:04] ==========================================
```

**Quand** : Au démarrage de la session

---

### **Section 3 : Insights au Moment du Snapshot (Intelligents)**

**Objectif** : Inférences, suggestions, insights **UNIQUEMENT** quand l'utilisateur génère un snapshot

#### A. Logs de Génération de Snapshot
```
[15:30:00] 📋 **Snapshot Generation Started**
           └─ Mode: Flexible (25% threshold)
           └─ User Request: reasoning.kernel.whereami
           
[15:30:01] 📊 **Data Aggregated for Snapshot**
           └─ Cycles: 2,847 total (7749 in history)
           └─ Commits: 10 recent (last 2h)
           └─ File Changes: 45 events (last 2h)
           └─ Health: 20 checks (last 2h)
           └─ Plan.RL4: ✅ Found (v2.0)
           └─ Tasks.RL4: ✅ Found (v1.9)
           └─ Context.RL4: ✅ Found (v2.3)
           └─ ADRs: 4 documented
           
[15:30:02] 🧠 **LLM Analysis (via Prompt)**
           └─ Confidence: 100%
           └─ Bias: 66% (vs baseline)
           └─ Cognitive Load: Normal (0.52)
           └─ Plan Drift: 66% (Phase changed, Goal modified)
           
[15:30:03] 💡 **Insights Generated (from LLM)**
           └─ Inference: Plan drift cohérent avec mode Flexible
           └─ Suggestion: Génère snapshot avant pause pour capturer état stable
           └─ Alert: Context.RL4 à jour (mis à jour il y a 5 min)
           └─ Pattern: Développement rapide détecté (5 commits en 15 min)
           
[15:30:04] ✅ **Snapshot Generated**
           └─ Size: 15.2 KB
           └─ Sections: 9 sections
           └─ Status: ✅ Copied to clipboard
           └─ Next: Paste in AI agent (Cursor/Claude)
```

**Quand** : **UNIQUEMENT** lors de la génération de snapshot

#### B. Logs Post-Snapshot (Si LLM met à jour les fichiers RL4)
```
[15:35:00] 📝 **Context.RL4 Updated** (via LLM agent)
           └─ Updated By: LLM Agent
           └─ Changes: KPIs recalculés (Cognitive Load, Plan Drift, Risks)
           └─ Version: 2.3 → 2.4
           └─ Confidence: 100%
           └─ Timestamp: 2025-11-14T15:35:00.123Z
           
[15:35:05] 📝 **Tasks.RL4 Updated** (via LLM agent)
           └─ Updated By: LLM Agent
           └─ Changes: 2 tasks completed, 1 task added
           └─ Version: 1.9 → 2.0
           └─ Bias: 66% → 68% (+2%)
           └─ Timestamp: 2025-11-14T15:35:05.456Z
```

**Quand** : Quand les fichiers RL4 sont mis à jour (détecté par FileWatcher)

---

## 🏗️ Architecture Proposée (Réutilisation Maximale)

### ✅ **Réutilisation : Étendre CognitiveLogger** (Pas de nouveau fichier)

**Fichier existant** : `extension/kernel/CognitiveLogger.ts`

**Nouvelles méthodes à ajouter** :

```typescript
/**
 * CognitiveLogger — Extension pour logs de transparence
 * 
 * Rôle : Montrer qu'on capture TOUT (transparence) + Insights snapshot
 * 
 * PRINCIPE : Pas de nouveaux fichiers, extension du logger existant
 */
export class CognitiveLogger {
    // ... méthodes existantes (cycleStart, cycleEnd, phase, system, narrative, etc.)
    
    // === NOUVELLES MÉTHODES : Transparence ===
    
    // Log erreur de cycle (pas de log si succès)
    logCycleError(cycleId: number, error: string): void;
    
    // Log changement de pattern significatif (pas de log si stable)
    logPatternChange(cycleId: number, patterns: Pattern[]): void;
    
    // Log capture de file change (agrégé toutes les 30s)
    logFileChangeAggregate(period: number, changes: FileChangeSummary): void;
    
    // Log capture de commit (TOUS)
    logCommitCapture(commit: CommitEvent): void;
    
    // Log health check (seulement si problème)
    logHealthIssue(health: HealthMetrics, issue: string): void;
    
    // Log retour après longue absence
    logWelcomeBack(lastActivity: Date, summary: SessionSummary): void;
    
    // Résumé horaire (toutes les heures) - REMPLACE generateMinuteSummary()
    logHourlySummary(summary: HourlySummary): void;
    
    // === NOUVELLES MÉTHODES : Snapshots ===
    
    // Log début de génération snapshot
    logSnapshotStart(mode: ModeType, dataAggregated: DataSummary): void;
    
    // Log données agrégées pour snapshot
    logDataAggregation(summary: AggregatedData): void;
    
    // Log analyse LLM (via prompt généré)
    logLLMAnalysis(confidence: number, bias: number, metrics: KPIMetrics): void;
    
    // Log insights générés (extraits du prompt)
    logInsights(insights: Insight[]): void;
    
    // Log snapshot généré
    logSnapshotGenerated(size: number, sections: number): void;
    
    // Log mise à jour fichiers RL4 (si LLM modifie)
    logRL4FileUpdate(file: 'Plan' | 'Tasks' | 'Context' | 'ADR', changes: FileChanges): void;
}
```

**Modifications des méthodes existantes** :
- `checkPeriodicSummaries()` → Change de 60s à 3600s (1 heure)
- Supprimer `generateMinuteSummary()` → Remplacé par `logHourlySummary()`
- Modifier `generateContextSnapshot()` → Toutes les heures au lieu de 10 minutes

### Intégration dans `CognitiveScheduler.ts` (Modification existante)

```typescript
// Dans runCycle(), après capture
// ❌ PAS de log par défaut (silence = tout va bien)

// Seulement si erreur
if (!result.success) {
    this.logger.logCycleError(result.cycleId, result.error || 'Unknown error');
}

// Seulement si pattern significatif détecté
if (result.newPatternDetected || result.patternEvolved) {
    this.logger.logPatternChange(result.cycleId, result.patterns);
}

// Résumé toutes les heures (pas toutes les 100 cycles)
const now = Date.now();
if (!this.lastHourlySummary) {
    this.lastHourlySummary = now;
}
if (now - this.lastHourlySummary > 3600000) { // 1 heure
    const summary = this.aggregateHourlySummary(result.cycleId);
    this.logger.logHourlySummary(summary);
    this.lastHourlySummary = now;
}
```

### Intégration dans `UnifiedPromptBuilder.ts` (Extension existante)

**Fichier** : `extension/kernel/api/UnifiedPromptBuilder.ts`

**Modifications** :
```typescript
// Dans generate(), lors de la génération de snapshot
async generate(
    deviationMode: DeviationMode,
    options?: PromptOptions
): Promise<string> {
    // Obtenir CognitiveLogger (via workspace ou injection)
    const logger = this.cognitiveLogger || getCognitiveLogger(this.workspaceRoot);
    
    // Log début
    logger.logSnapshotStart(deviationMode, {
        totalCycles: await this.countCycles(),
        recentCommits: await this.loadRecentCommits(10),
        fileChanges: await this.loadRecentFileChanges(45),
        // ...
    });
    
    // Log agrégation données
    const dataSummary = await this.aggregateData(deviationMode);
    logger.logDataAggregation(dataSummary);
    
    // ... génération du prompt ...
    
    // Log analyse LLM (métriques extraites du prompt)
    logger.logLLMAnalysis(
        dataSummary.confidence,
        dataSummary.bias,
        dataSummary.kpiMetrics
    );
    
    // Log insights générés (extraits du prompt)
    const insights = this.extractInsights(prompt);
    logger.logInsights(insights);
    
    // Log snapshot généré
    const sections = this.countSections(prompt);
    logger.logSnapshotGenerated(prompt.length, sections);
    
    return prompt;
}
```

---

## 📝 Format de Log Standardisé

### Format Général :

```
[TIMESTAMP] [CATEGORY_EMOJI] **Titre** — Description
           └─ Detail 1: Valeur
           └─ Detail 2: Valeur
           └─ Status: ✅/⚠️/❌
```

### Catégories d'emoji :

- 📊 **Capture Continue** (transparence)
- 📝 **File Changes** (agrégés)
- 🔀 **Git Commits** (tous)
- 💚 **Health Checks**
- ⏸️ **Gaps & Inactivité**
- 📋 **Snapshots** (génération)
- 🧠 **LLM Analysis** (insights)
- 📝 **RL4 File Updates** (Plan/Tasks/Context/ADR)

---

## 🔄 Séparation Claire : Brute vs Intelligent

### Données Brutes (Logs - TransparencyLogger)
- ✅ Cycles capturés
- ✅ File changes capturés
- ✅ Commits capturés
- ✅ Health checks
- ✅ Gaps détectés
- ❌ **PAS d'inférence**
- ❌ **PAS de suggestions**
- ❌ **PAS d'interprétation**

### Données Intelligentes (SnapshotLogger)
- ✅ Agrémentation de données pour snapshot
- ✅ Analyse LLM (via prompt généré)
- ✅ Insights extraits du prompt
- ✅ Suggestions pour l'utilisateur
- ✅ Alertes contextuelles
- **QUAND** : **UNIQUEMENT** lors de la génération de snapshot

### Données Structurées (FileWatcher)
- ✅ Détection de mise à jour Plan.RL4
- ✅ Détection de mise à jour Tasks.RL4
- ✅ Détection de mise à jour Context.RL4
- ✅ Détection de création ADR
- **QUAND** : Détection de changement de fichier

---

## 📋 Exemples de Flux

### Flux 1 : Session Normale (Pas de Snapshot)

```
[14:00:00] === RL4 KERNEL — Session Start ===
[14:00:01] 📊 **Capture Status**
           └─ Workspace: PS (T7 Rewards)
           └─ Total Events: 2,847
           └─ All Listeners: ✅ Active
           └─ Data Integrity: ✅ Valid
[14:00:02] ==========================================

[14:25:30] 📝 **File Changes (Last 30s)**
           └─ Files Modified: 3 (extension.ts, api/builder.ts, kernel/scheduler.ts)
           └─ Total Edits: 12 edits
           └─ Hotspot: extension.ts (8 edits in 30s)
           └─ Status: ✅ Captured

[14:30:45] 🔀 **Git Commit Captured**
           └─ Hash: a1b2c3d
           └─ Message: feat: Add feature X
           └─ Files: 3 changed (+245/-12)
           └─ Intent: feature

[15:00:00] 📊 **Hourly Summary (Last Hour)**
           └─ Cycles: 360 captured (silent)
           └─ File Changes: 127 events aggregated
           └─ Git Commits: 8 commits
           └─ Health: ✅ All systems healthy
           └─ Status: ✅ All systems capturing
```

**Principle** : Silence = tout va bien. Log seulement ce qui compte.
- ❌ Pas de log toutes les 10 secondes (cycles)
- ✅ Log commits (rares, donc OK)
- ✅ Log file changes agrégés (toutes les 30s si changements)
- ✅ Résumé horaire (toutes les heures)

---

### Flux 2 : Génération de Snapshot

```
[15:30:00] 📋 **Snapshot Generation Started**
           └─ Mode: Flexible (25% threshold)
           └─ User: reasoning.kernel.whereami
           
[15:30:01] 📊 **Data Aggregated for Snapshot**
           └─ Cycles: 2,847 total
           └─ Commits: 10 recent (last 2h)
           └─ File Changes: 45 events (last 2h)
           └─ Plan.RL4: ✅ Found (v2.0)
           └─ Tasks.RL4: ✅ Found (v1.9)
           └─ Context.RL4: ✅ Found (v2.3)
           
[15:30:02] 🧠 **LLM Analysis (via Prompt)**
           └─ Prompt Generated: 15.2 KB
           └─ Sections: 9 sections
           └─ Data Sources: Plan, Tasks, Context, History, ADRs
           
[15:30:03] 💡 **Insights Generated (from LLM via Prompt)**
           └─ Inference: Plan drift 66% mais cohérent avec mode Flexible
           └─ Suggestion: Moment idéal pour snapshot (activité stable)
           └─ Pattern: Développement rapide (5 commits en 15 min)
           └─ Alert: Context.RL4 à jour
           
[15:30:04] ✅ **Snapshot Generated**
           └─ Size: 15.2 KB
           └─ Status: ✅ Copied to clipboard
           └─ Next: Paste in AI agent
```

**Inférences UNIQUEMENT au moment du snapshot.**

---

### Flux 3 : Mise à Jour des Fichiers RL4 (par LLM)

```
[15:35:00] 📝 **Context.RL4 Updated** (via LLM agent)
           └─ Updated By: LLM Agent
           └─ Changes: KPIs recalculés
           └─ Version: 2.3 → 2.4
           └─ Timestamp: 2025-11-14T15:35:00.123Z
           
[15:35:05] 📝 **Tasks.RL4 Updated** (via LLM agent)
           └─ Updated By: LLM Agent
           └─ Changes: 2 tasks completed, 1 added
           └─ Version: 1.9 → 2.0
           └─ Bias: 66% → 68%
```

**Logs de détection de changement (FileWatcher).**

---

## 🎯 Priorités d'Implémentation

### Phase 1 : Extension CognitiveLogger (Semaine 1)
- [ ] Étendre `CognitiveLogger.ts` avec méthodes transparence
  - [ ] `logFileChangeAggregate(period, changes)`
  - [ ] `logCommitCapture(commit)`
  - [ ] `logCycleError(cycleId, error)`
  - [ ] `logPatternChange(cycleId, patterns)`
  - [ ] `logHealthIssue(health, issue)`
  - [ ] `logWelcomeBack(lastActivity, summary)`
  - [ ] `logHourlySummary(summary)` (remplace `generateMinuteSummary()`)
- [ ] Modifier `checkPeriodicSummaries()` : 60s → 3600s (1 heure)
- [ ] Supprimer `generateMinuteSummary()` (remplacé par `logHourlySummary()`)
- [ ] Modifier `generateContextSnapshot()` : 10 min → 1 heure

### Phase 2 : Modification FileChangeWatcher (Semaine 1)
- [ ] Modifier `FileChangeWatcher.ts` pour agrégation 30s
  - [ ] Ajouter agrégation toutes les 30s (timer)
  - [ ] Passer `CognitiveLogger` au constructeur (remplace `outputChannel`)
  - [ ] Remplacer `SimpleLogger.log()` par `CognitiveLogger.logFileChangeAggregate()`
  - [ ] Garder buffer existant (`changeBuffer`, `burstTimeout`)

### Phase 3 : Modification GitCommitListener (Semaine 1)
- [ ] Modifier `GitCommitListener.ts`
  - [ ] Passer `CognitiveLogger` au constructeur (remplace `outputChannel`)
  - [ ] Remplacer `SimpleLogger.log()` par `CognitiveLogger.logCommitCapture()`
  - [ ] Garder logique de capture existante

### Phase 4 : Modification CognitiveScheduler (Semaine 1)
- [ ] Modifier `CognitiveScheduler.ts`
  - [ ] Résumés horaires au lieu de toutes les 100 cycles
  - [ ] Utiliser `logger.logCycleError()` pour erreurs
  - [ ] Utiliser `logger.logPatternChange()` pour patterns changés
  - [ ] Ajouter `aggregateHourlySummary()` pour résumés horaires

### Phase 5 : Extension UnifiedPromptBuilder (Semaine 2)
- [ ] Modifier `UnifiedPromptBuilder.ts`
  - [ ] Ajouter logs snapshot generation dans `generate()`
  - [ ] `logSnapshotStart(mode, dataSummary)`
  - [ ] `logDataAggregation(summary)`
  - [ ] `logLLMAnalysis(confidence, bias, metrics)`
  - [ ] `logInsights(insights)`
  - [ ] `logSnapshotGenerated(size, sections)`
  - [ ] Obtenir `CognitiveLogger` (via workspace ou injection)

### Phase 6 : Détection File Updates (Semaine 2)
- [ ] Modifier `FileChangeWatcher.ts` ou créer détecteur dédié
  - [ ] Détecter changements `.reasoning_rl4/Plan.RL4`
  - [ ] Détecter changements `.reasoning_rl4/Tasks.RL4`
  - [ ] Détecter changements `.reasoning_rl4/Context.RL4`
  - [ ] Détecter nouvelles ADRs `.reasoning_rl4/ADRs/auto/`
  - [ ] Appeler `CognitiveLogger.logRL4FileUpdate(file, changes)`

---

## ⚙️ Configuration

```typescript
interface LogConfig {
    // Transparence (capture brute)
    transparency: {
        cycleLogging: 'silent' | 'errors-only' | 'pattern-changes'; // default: 'silent'
        fileChangeAggregation: number; // Secondes entre agrégations (default: 30)
        commitLogAll: boolean; // Log TOUS les commits (default: true - c'est rare donc OK)
        healthCheckLogging: 'silent' | 'issues-only'; // default: 'issues-only'
        gapLogging: 'silent' | 'welcome-back-only'; // default: 'welcome-back-only' (>1h absence)
        hourlySummary: boolean; // Résumé toutes les heures (default: true)
    };
    
    // Snapshots (inférences)
    snapshots: {
        logStart: boolean; // Log début génération (default: true)
        logDataAggregation: boolean; // Log agrégation données (default: true)
        logLLMAnalysis: boolean; // Log analyse LLM (default: true)
        logInsights: boolean; // Log insights générés (default: true)
    };
    
    // File Updates
    fileUpdates: {
        logPlanUpdates: boolean; // Log updates Plan.RL4 (default: true)
        logTasksUpdates: boolean; // Log updates Tasks.RL4 (default: true)
        logContextUpdates: boolean; // Log updates Context.RL4 (default: true)
        logADRUpdates: boolean; // Log nouvelles ADRs (default: true)
    };
}
```

---

## ✅ Critères de Succès

1. **Transparence totale** : L'utilisateur voit qu'on capture TOUT
2. **Pas d'inférence continue** : Insights UNIQUEMENT lors du snapshot
3. **Séparation claire** : Données brutes vs intelligentes vs structurées
4. **Respect des gaps** : Pas d'alerte si pas de commit/snapshot depuis longtemps

---

## 📚 Références

- **Analyse de Réutilisation** : `docs/RL4_LOG_REUSE_ANALYSIS.md`
- **CognitiveLogger** : `extension/kernel/CognitiveLogger.ts` (existant)
- **UnifiedLogger** : `extension/core/UnifiedLogger.ts` (existant)
- **FileChangeWatcher** : `extension/kernel/inputs/FileChangeWatcher.ts` (existant)
- **GitCommitListener** : `extension/kernel/inputs/GitCommitListener.ts` (existant)
- **CognitiveScheduler** : `extension/kernel/CognitiveScheduler.ts` (existant)
- **UnifiedPromptBuilder** : `extension/kernel/api/UnifiedPromptBuilder.ts` (existant)
- **TimelineAggregator** : `extension/kernel/indexer/TimelineAggregator.ts` (existant, réutilisé)

---

## ✅ Résumé : Réutilisation Maximale

### Fichiers à Modifier (5 fichiers existants)
1. ✅ `extension/kernel/CognitiveLogger.ts` - **Étendre** avec méthodes transparence
2. ✅ `extension/kernel/inputs/FileChangeWatcher.ts` - **Modifier** pour agrégation 30s
3. ✅ `extension/kernel/inputs/GitCommitListener.ts` - **Modifier** pour utiliser CognitiveLogger
4. ✅ `extension/kernel/CognitiveScheduler.ts` - **Modifier** pour résumés horaires
5. ✅ `extension/kernel/api/UnifiedPromptBuilder.ts` - **Étendre** avec logs snapshot

### Fichiers à NE PAS Créer
- ❌ `TransparencyLogger.ts` → Étendre CognitiveLogger
- ❌ `SnapshotLogger.ts` → Ajouter dans UnifiedPromptBuilder
- ❌ Nouveaux agrégateurs → Utiliser TimelineAggregator existant

### Avantages
- ✅ **Réutilisation 95%** du code existant
- ✅ **Pas de duplication** - Un seul logger (CognitiveLogger)
- ✅ **Moins de fichiers** - 5 modifications au lieu de créer 3-4 nouveaux fichiers
- ✅ **Cohérence** - Tous les logs passent par CognitiveLogger
- ✅ **Maintenabilité** - Un seul endroit pour formater les logs

---

**Prochaine étape** : Implémenter Phase 1 (Extension CognitiveLogger)
