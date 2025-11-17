<!-- 71b01136-3dce-42cd-aa1b-f814f7f98abb df48d9c4-4f1b-4f2c-abf5-91d60640243a -->
# Plan: RL4 Quick Wins #3 - History Enrichment

## Objectif
Transformer le RL4 d'un "logger de commits" en "time machine cognitive" où chaque instant passé est reconstructible. Passe de 40% à 85% de visibilité du passé (+45 points).

## Problème Résolu
- Patterns/Forecasts = snapshot only (pas d'évolution temporelle)
- Impossible de reconstruire état cognitif à un instant T passé
- Test 6 limité : "3 cycles avant CacheIndex" → Données brutes sans contexte
- Test 3 limité : "Pattern réapparition" → Pas de courbe évolution
- Test 7 limité : "Profil cognitif" → Statique, pas de trajectoire

## Scope (6h, 3 Modules)

### Module 1: Pattern Evolution Tracker (2h)

**Fichier**: `extension/kernel/cognitive/PatternEvolutionTracker.ts`

**Responsabilité**: Tracer évolution confidence/frequency patterns dans le temps.

**Données capturées**:
```typescript
interface PatternEvolution {
  timestamp: string;
  cycle_id: number;
  pattern_id: string;
  confidence: number;
  frequency: number;
  delta_confidence: number;  // vs. snapshot précédent
  delta_frequency: number;
  trend: "rising" | "stable" | "declining";
}
```

**Fichier généré**: `.reasoning_rl4/history/patterns_evolution.jsonl`

**Intégration**: Dans `CognitiveScheduler.ts` après phase pattern-learning :
```typescript
// Ligne ~280 (après PatternLearningEngine)
const previousPatterns = await this.loadPreviousPatterns();
await this.patternEvolutionTracker.trackChanges(
  previousPatterns,
  currentPatterns,
  result.cycleId
);
```

**Pattern inspiré de**: `DataNormalizer.ts` (compare états avant/après)

---

### Module 2: Cognitive Snapshot Rotation (1h)

**Fichier**: `extension/kernel/indexer/SnapshotRotation.ts`

**Responsabilité**: Sauvegarder snapshots cognitifs complets tous les 100 cycles.

**Données capturées**:
```typescript
interface CognitiveSnapshot {
  cycle: number;
  timestamp: string;
  patterns: Pattern[];        // État complet patterns
  forecasts: Forecast[];      // État complet forecasts
  correlations: Correlation[];
  cognitive_load: number;     // Charge horaire
  git_context: {
    last_commit: string;
    time_since_commit_sec: number;
  };
  files_active: string[];     // Top 5 fichiers
}
```

**Dossier généré**: `.reasoning_rl4/context_history/`
- `snapshot-100.json`
- `snapshot-200.json`
- `snapshot-300.json`

**Intégration**: Dans `CognitiveScheduler.ts` après normalization (100 cycles) :
```typescript
// Ligne ~510 (après normalization every 100 cycles)
if (result.cycleId % 100 === 0) {
  await this.snapshotRotation.saveSnapshot(result.cycleId);
}
```

**Pattern inspiré de**: `TimelineAggregator.ts` (agrégation périodique)

---

### Module 3: Historical State Reconstructor (3h)

**Fichier**: `extension/kernel/api/StateReconstructor.ts`

**Responsabilité**: Reconstruire état cognitif complet à n'importe quel instant passé.

**API exposée**:
```typescript
export class StateReconstructor {
  // Reconstruit état à timestamp exact
  async reconstructAt(timestamp: string): Promise<CognitiveState>;
  
  // Évolution métrique dans le temps
  async getMetricEvolution(
    metric: "cognitive_load" | "pattern_confidence" | "forecast_count",
    from: string,
    to: string
  ): Promise<TimeSeriesData>;
  
  // Trouve snapshot le plus proche
  async findClosestSnapshot(timestamp: string): Promise<CognitiveSnapshot>;
}
```

**Méthode de reconstruction**:
1. Trouver cycle le plus proche (cycles.jsonl)
2. Charger snapshot cognitif (context_history/ ou reconstruire)
3. Charger patterns evolution à ce timestamp
4. Charger git context (git_commits.jsonl)
5. Charger timeline cognitive load
6. Agréger en objet unifié

**Intégration**: Extension de `RL4Hooks.ts` :
```typescript
// Nouvelle méthode dans RL4Hooks
async getHistoricalState(timestamp: string): Promise<CognitiveState> {
  return this.stateReconstructor.reconstructAt(timestamp);
}
```

**Pattern inspiré de**: `CacheIndex.ts` (queries temporelles rapides)

---

## Intégration CognitiveScheduler

**Fichier modifié**: `extension/kernel/CognitiveScheduler.ts`

**Changements**:
```typescript
// Imports (ligne ~27)
import { PatternEvolutionTracker } from './cognitive/PatternEvolutionTracker';
import { SnapshotRotation } from './indexer/SnapshotRotation';

// Membres privés (ligne ~76)
private patternEvolutionTracker: PatternEvolutionTracker;
private snapshotRotation: SnapshotRotation;

// Constructor (ligne ~103)
this.patternEvolutionTracker = new PatternEvolutionTracker(workspaceRoot);
this.snapshotRotation = new SnapshotRotation(workspaceRoot);

// Après pattern-learning (ligne ~280)
await this.patternEvolutionTracker.trackChanges(
  previousPatterns,
  currentPatterns,
  result.cycleId
);

// Après normalization (ligne ~510, tous les 100 cycles)
if (result.cycleId % 100 === 0) {
  await this.snapshotRotation.saveSnapshot(result.cycleId);
}
```

---

## Bénéfices Mesurables

### Pour Tests 1-7

**Test 6 Enhanced**: "Memory Replay"
```
Question: "3 cycles avant CacheIndex"

Avant:
→ Cycle 259: {cycleId: 259, timestamp: "...", patterns: 4}

Après:
→ Cycle 259: {
    cycleId: 259,
    patterns: [
      {id: "kernel-evolution", confidence: 0.83, trend: "rising"}
    ],
    forecasts: [{predicted: "Review and document", confidence: 0.65}],
    cognitive_load: 0.99,
    git_context: {last_commit: "feat(kernel)", time_since: "53min"},
    files_active: ["CorrelationEngine.ts"]
  }
```

**Test 3 Enhanced**: "Pattern Réapparition"
```
Question: "Pourquoi pattern kernel réapparu ?"

Avant:
→ "firstSeen: 03 nov, lastSeen: 27 oct" (données statiques)

Après:
→ Courbe évolution confidence:
   27 oct: 0.72 (émergence)
   03 nov: 0.83 (peak) 
   04-09 nov: 0.78 (dormance)
   10 nov: 0.83 (réactivation)
→ Causalité: Commit 14:07 corrélé avec remontée +0.05
```

**Test 7 Enhanced**: "Profil Cognitif"
```
Question: "Mon style depuis 03 novembre"

Avant:
→ "Structuré-Consolidant (78%)" (snapshot statique)

Après:
→ "Trajectoire développement :
   03 nov: Exploratoire (65%)
   05 nov: Consolidation (72%)
   07 nov: Consolidation (78%)
   10 nov: Documentation (82%)
   
   Pattern: Cycle hebdomadaire exploitation→consolidation (confidence 0.71)"
```

---

## Tests de Validation

### Test 1: Pattern Evolution
```bash
# Après 200+ cycles avec plusieurs modifications patterns
cat .reasoning_rl4/history/patterns_evolution.jsonl | \
  jq 'select(.pattern_id | contains("kernel")) | {cycle_id, confidence, trend}'

# Expected: Évolution confidence visible
# {cycle_id: 100, confidence: 0.80, trend: "rising"}
# {cycle_id: 200, confidence: 0.83, trend: "stable"}
```

### Test 2: Snapshot Rotation
```bash
# Après 300 cycles
ls -1 .reasoning_rl4/context_history/

# Expected:
# snapshot-100.json
# snapshot-200.json
# snapshot-300.json
```

### Test 3: State Reconstruction
```typescript
// Via RL4Hooks ou command VS Code
const state = await rl4.reconstructStateAt("2025-11-10T13:59:54Z");
console.log(state.patterns);  // Patterns actifs à ce moment
console.log(state.cognitive_load);  // Charge à cet instant
```

---

## Structure Fichiers Générés

```
.reasoning_rl4/
├── history/                         ← NOUVEAU DOSSIER
│   ├── patterns_evolution.jsonl     ← Évolution patterns
│   └── forecasts_evolution.jsonl    ← Évolution forecasts
├── context_history/                 ← NOUVEAU DOSSIER
│   ├── snapshot-100.json            ← Snapshot cycle 100
│   ├── snapshot-200.json            ← Snapshot cycle 200
│   └── ...
└── [existing traces/ledger/...]
```

---

## Estimation

| Module | Lignes | Temps | Difficulté |
|--------|--------|-------|------------|
| PatternEvolutionTracker | 180L | 2h | Faible (compare objects) |
| SnapshotRotation | 120L | 1h | Très faible (JSON write) |
| StateReconstructor | 250L | 3h | Moyenne (agrégation multi-sources) |
| Integration Scheduler | +15L | 0.5h | Triviale |
| Tests validation | - | 0.5h | - |
| **Total** | **~550L** | **7h** | **Moyenne** |

---

## Impact Global

### Visibilité Passé

| Dimension | Avant | Après | Gain |
|-----------|-------|-------|------|
| Git history | 100% | 100% | - |
| Patterns évolution | 0% | 100% | +100% |
| Cognitive snapshots | 0% | 100% | +100% |
| State reconstruction | 0% | 100% | +100% |
| **Moyenne** | **40%** | **85%** | **+45%** |

### Zone Grise Totale

```
Présent : 18% (Quick Wins #1) → 35% (Quick Wins #2 futur)
Passé   : 40% (actuel)        → 85% (Quick Wins #3)
──────────────────────────────────────────────────────
Global  : 29% visible         → 60% visible

Zone grise : 71% → 40% (amélioration 78%)
```

Le RL4 passe de "mémoire partielle de commits" à "time machine cognitive complète" 🕰️✨

### To-dos

- [ ] Create PatternEvolutionTracker.ts in extension/kernel/cognitive/ - track confidence/frequency changes over time
- [ ] Create SnapshotRotation.ts in extension/kernel/indexer/ - save full cognitive snapshots every 100 cycles
- [ ] Create StateReconstructor.ts in extension/kernel/api/ - rebuild cognitive state at any past timestamp
- [ ] Integrate history modules into CognitiveScheduler.ts - track evolution, rotate snapshots
- [ ] Test history features: verify evolution tracking, check snapshots created, test state reconstruction