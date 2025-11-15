# 🔍 Analyse de Réutilisation — Logs RL4

**Date**: 2025-11-14  
**Objectif**: Identifier les éléments existants à réutiliser pour éviter la duplication

---

## ✅ Éléments Existants à Réutiliser

### 1. **CognitiveLogger** (extension/kernel/CognitiveLogger.ts)

**État actuel** :
- ✅ `cycleStart(cycleId)` / `cycleEnd(cycleId, phases, health)`
- ✅ `phase(phaseName, cycleId, count, durationMs)`
- ✅ `system(message, emoji?)`
- ✅ `narrative(message)` — pour storytelling
- ✅ `warning(message)` / `error(message)`
- ✅ Résumés périodiques (toutes les minutes, toutes les 10 minutes)
- ✅ Structured logging (JSONL)

**À étendre** :
- ➕ `logFileChangeAggregate(period, changes)` — agrégation toutes les 30s
- ➕ `logCommitCapture(commit)` — log commits (déjà capturés par GitCommitListener)
- ➕ `logHourlySummary(summary)` — remplacer résumé toutes les minutes
- ➕ `logWelcomeBack(lastActivity, summary)` — retour après >1h
- ➕ `logCycleError(cycleId, error)` — erreurs de cycles
- ➕ `logPatternChange(cycleId, patterns)` — changements de patterns

**Action** : ✅ **Étendre CognitiveLogger** (pas créer TransparencyLogger séparé)

---

### 2. **UnifiedLogger** (extension/core/UnifiedLogger.ts)

**État actuel** :
- ✅ Singleton pour Output Channel "RL4 Kernel"
- ✅ `logStartup(workspaceName, totalEvents, githubConnected)`
- ✅ `logOnboarding()`
- ✅ `log(message)` / `logWithEmoji(emoji, message)`
- ✅ `warn(message)`
- ✅ `show()` — focus Output Channel

**Réutilisation** : ✅ Déjà utilisé par CognitiveLogger → Pas de duplication nécessaire

---

### 3. **SimpleLogger** (dans FileChangeWatcher, GitCommitListener, etc.)

**État actuel** :
- ✅ `log(message)` — avec timestamp
- ✅ `warn(message)` / `error(message)`
- ✅ Utilisé dans FileChangeWatcher, GitCommitListener, IDEActivityListener, BuildMetricsListener

**Problème** : ❌ Logs déjà présents mais **trop verbeux** (chaque file change logué individuellement)

**Solution** : ✅ **Modifier FileChangeWatcher** pour agrégation toutes les 30s au lieu de log individuel

---

### 4. **FileChangeWatcher** (extension/kernel/inputs/FileChangeWatcher.ts)

**État actuel** :
- ✅ Capture file changes (add/change/delete)
- ✅ Buffer avec `burstTimeout` (déjà prévu pour agrégation)
- ✅ Log chaque changement via SimpleLogger : `simpleLogger.log('📝 File changed: ${filePath}')`
- ✅ Détection de patterns (bursts, hotspots)

**À modifier** :
- 🔧 **Agréger toutes les 30s** au lieu de log immédiat
- 🔧 Appeler `CognitiveLogger.logFileChangeAggregate()` au lieu de `simpleLogger.log()`

**Action** : ✅ **Modifier FileChangeWatcher** pour agrégation 30s

---

### 5. **GitCommitListener** (extension/kernel/inputs/GitCommitListener.ts)

**État actuel** :
- ✅ Capture commits via git hooks + polling
- ✅ Log chaque commit : `simpleLogger.log('🎧 Commit detected: ...')`
- ✅ Enregistre dans traces/git_commits.jsonl

**À modifier** :
- 🔧 Appeler `CognitiveLogger.logCommitCapture(commit)` au lieu de `simpleLogger.log()`
- ✅ **Garder TOUS les commits** (c'est rare donc OK)

**Action** : ✅ **Modifier GitCommitListener** pour utiliser CognitiveLogger

---

### 6. **CognitiveScheduler** (extension/kernel/CognitiveScheduler.ts)

**État actuel** :
- ✅ Utilise `CognitiveLogger` pour cycles
- ✅ Résumés tous les 100 cycles (checkpoint)
- ✅ Logs d'erreurs via `logger.error()`

**À modifier** :
- 🔧 **Résumé horaire** au lieu de toutes les 100 cycles (50 min)
- 🔧 Log erreurs via `logger.logCycleError()` au lieu de `logger.error()`
- 🔧 Log changements de patterns via `logger.logPatternChange()`

**Action** : ✅ **Modifier CognitiveScheduler** pour utiliser nouvelles méthodes

---

### 7. **TimelineAggregator** (extension/kernel/indexer/TimelineAggregator.ts)

**État actuel** :
- ✅ Génère timelines quotidiennes
- ✅ Agrégation par heure
- ✅ Appelé toutes les 10 cycles par CognitiveScheduler

**Réutilisation** : ✅ **Déjà utilisé** → Pas de modification nécessaire (utile pour données structurées)

---

### 8. **UnifiedPromptBuilder** (extension/kernel/api/UnifiedPromptBuilder.ts)

**État actuel** :
- ✅ Génère snapshots/prompts
- ✅ Intègre Plan/Tasks/Context/ADRs

**À ajouter** :
- ➕ Logs snapshot generation (début, agrégation, LLM analysis, snapshot généré)

**Action** : ✅ **Étendre UnifiedPromptBuilder** avec logs snapshot (ou créer SnapshotLogger minimal)

---

## 🎯 Plan de Réutilisation (Optimisé)

### Phase 1 : Extension CognitiveLogger (Pas de nouveau fichier)

**Fichier** : `extension/kernel/CognitiveLogger.ts`

**Nouvelles méthodes** :
```typescript
// Transparence (capture brute)
logFileChangeAggregate(period: number, changes: FileChangeSummary): void
logCommitCapture(commit: CommitEvent): void
logCycleError(cycleId: number, error: string): void
logPatternChange(cycleId: number, patterns: Pattern[]): void

// Résumés périodiques
logHourlySummary(summary: HourlySummary): void  // Remplace generateMinuteSummary()
logWelcomeBack(lastActivity: Date, summary: SessionSummary): void

// Health (seulement si problème)
logHealthIssue(health: HealthMetrics, issue: string): void
```

**Modification** :
- 🔧 Changer `generateMinuteSummary()` → `logHourlySummary()` (toutes les heures)
- 🔧 Supprimer `generateContextSnapshot()` (toutes les 10 minutes) → Trop fréquent

---

### Phase 2 : Modification FileChangeWatcher (Agrégation 30s)

**Fichier** : `extension/kernel/inputs/FileChangeWatcher.ts`

**Modifications** :
1. Ajouter agrégation toutes les 30s (au lieu de log immédiat)
2. Remplacer `simpleLogger.log()` par appel à `CognitiveLogger.logFileChangeAggregate()`
3. Garder buffer existant (`changeBuffer`, `burstTimeout`)

**Code** :
```typescript
// Au lieu de :
simpleLogger.log(`📝 File changed: ${filePath}`);

// Faire :
this.changeBuffer.set(filePath, change);
// Puis toutes les 30s (agrégation) :
if (this.lastAggregationTime + 30000 < Date.now()) {
    this.logAggregatedChanges();
}
```

---

### Phase 3 : Modification GitCommitListener (Utiliser CognitiveLogger)

**Fichier** : `extension/kernel/inputs/GitCommitListener.ts`

**Modifications** :
1. Remplacer `simpleLogger.log('🎧 Commit detected...')` par `CognitiveLogger.logCommitCapture(commit)`
2. Passer `CognitiveLogger` au constructeur (au lieu de `outputChannel`)

**Code** :
```typescript
// Au lieu de :
simpleLogger.log(`🎧 Commit detected: ${context.message}...`);

// Faire :
this.cognitiveLogger.logCommitCapture({
    hash: context.hash,
    message: context.message,
    author: context.author,
    files: context.files,
    timestamp: new Date().toISOString()
});
```

---

### Phase 4 : Modification CognitiveScheduler (Résumés horaires)

**Fichier** : `extension/kernel/CognitiveScheduler.ts`

**Modifications** :
1. Résumé horaire (toutes les heures) au lieu de toutes les 100 cycles
2. Utiliser nouvelles méthodes `CognitiveLogger` (logCycleError, logPatternChange)

**Code** :
```typescript
// Au lieu de :
if (result.cycleId % 100 === 0) {
    // Checkpoint toutes les 100 cycles (50 min)
}

// Faire :
const now = Date.now();
if (now - this.lastHourlySummary > 3600000) { // 1 heure
    const summary = this.aggregateHourlySummary();
    this.logger.logHourlySummary(summary);
    this.lastHourlySummary = now;
}
```

---

### Phase 5 : Logs Snapshot (UnifiedPromptBuilder ou extension)

**Option A** : Étendre `UnifiedPromptBuilder.ts` (recommandé)
- Ajouter logs snapshot directement dans `generate()`

**Option B** : Créer `SnapshotLogger.ts` minimal (si trop de logique)
- Simple wrapper autour de `CognitiveLogger`

**Recommandation** : ✅ **Option A** — Étendre UnifiedPromptBuilder

---

## 📊 Fichiers à Modifier (Pas de Nouveaux Fichiers)

### ✅ À Modifier (5 fichiers)

1. **extension/kernel/CognitiveLogger.ts**
   - Ajouter méthodes transparence
   - Changer résumés périodiques (heure au lieu de minute)

2. **extension/kernel/inputs/FileChangeWatcher.ts**
   - Agrégation toutes les 30s
   - Utiliser CognitiveLogger au lieu de SimpleLogger

3. **extension/kernel/inputs/GitCommitListener.ts**
   - Utiliser CognitiveLogger au lieu de SimpleLogger

4. **extension/kernel/CognitiveScheduler.ts**
   - Résumés horaires au lieu de toutes les 100 cycles
   - Utiliser nouvelles méthodes CognitiveLogger

5. **extension/kernel/api/UnifiedPromptBuilder.ts**
   - Ajouter logs snapshot generation

### ❌ Pas de Nouveaux Fichiers

- ❌ Pas de `TransparencyLogger.ts` → Étendre CognitiveLogger
- ❌ Pas de `SnapshotLogger.ts` → Ajouter dans UnifiedPromptBuilder
- ❌ Pas de nouveaux agrégateurs → Utiliser TimelineAggregator existant

---

## ✅ Avantages de Cette Approche

1. **Réutilisation maximale** : Utilise 95% du code existant
2. **Pas de duplication** : Un seul logger (CognitiveLogger)
3. **Moins de fichiers** : 5 modifications au lieu de créer 3-4 nouveaux fichiers
4. **Cohérence** : Tous les logs passent par CognitiveLogger
5. **Maintenabilité** : Un seul endroit pour formater les logs

---

## 📝 Checklist d'Implémentation

### Phase 1 : CognitiveLogger
- [ ] Ajouter `logFileChangeAggregate()`
- [ ] Ajouter `logCommitCapture()`
- [ ] Ajouter `logCycleError()`
- [ ] Ajouter `logPatternChange()`
- [ ] Ajouter `logHourlySummary()` (remplace `generateMinuteSummary()`)
- [ ] Ajouter `logWelcomeBack()`
- [ ] Ajouter `logHealthIssue()`
- [ ] Modifier `checkPeriodicSummaries()` pour heures au lieu de minutes

### Phase 2 : FileChangeWatcher
- [ ] Ajouter agrégation toutes les 30s
- [ ] Passer CognitiveLogger au constructeur
- [ ] Remplacer SimpleLogger par CognitiveLogger
- [ ] Appeler `logFileChangeAggregate()` toutes les 30s

### Phase 3 : GitCommitListener
- [ ] Passer CognitiveLogger au constructeur
- [ ] Remplacer SimpleLogger par CognitiveLogger
- [ ] Appeler `logCommitCapture()` pour chaque commit

### Phase 4 : CognitiveScheduler
- [ ] Modifier résumés (heures au lieu de 100 cycles)
- [ ] Utiliser `logCycleError()` pour erreurs
- [ ] Utiliser `logPatternChange()` pour patterns changés

### Phase 5 : UnifiedPromptBuilder
- [ ] Ajouter logs snapshot generation
- [ ] Log début, agrégation, LLM analysis, snapshot généré

---

**Prochaine étape** : Commencer Phase 1 (Extension CognitiveLogger)

