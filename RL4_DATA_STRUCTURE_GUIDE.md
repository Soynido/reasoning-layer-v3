# RL4 Data Structure Guide — For External Tools

**Purpose** : Comprehensive guide for tools/LLMs to understand RL4 cognitive outputs  
**Date** : 2025-11-10  
**Version** : RL4 Kernel v2.0.7

---

## 📊 Essential Logs Hierarchy

Pour comprendre l'output global du RL4, lire ces fichiers **dans cet ordre** :

### Niveau 1 : 🧠 **Cognitive Output** (What RL4 thinks)
```
1. patterns.json           (8 KB)  — Patterns détectés
2. correlations.json       (4 KB)  — Relations entre patterns/events
3. forecasts.json          (4 KB)  — Prédictions futures
4. adrs/auto/*.json        (12 KB) — Decisions architecturales proposées
```

### Niveau 2 : 📊 **Execution Ledger** (What RL4 did)
```
5. ledger/cycles.jsonl     (3.1 MB, 5,592 cycles) — Ledger principal
6. ledger/adr_validations.jsonl (4 KB, 2 validations) — Validation history
```

### Niveau 3 : 🎯 **Input Signals** (What RL4 observed)
```
7. traces/git_commits.jsonl      (16 KB, 10 commits)
8. traces/file_changes.jsonl     (144 KB, 236 changes)
```

### Niveau 4 : 📈 **Health & Metrics** (How well RL4 performs)
```
9. kernel/state.json.gz          (compressed state)
10. feedback_report.json         (comprehensive metrics)
```

---

## 📁 File Structure with Examples

### 1. `patterns.json` — Detected Patterns

**What it is** : Patterns cognitifs détectés depuis l'historique Git et les events

**Structure** :
```json
{
  "patterns": [
    {
      "id": "pattern-kernel-evolution-1762787585212",
      "pattern": "Frequent kernel architecture commits (21 commits) indicate active evolution of core reasoning infrastructure",
      "frequency": 21,
      "confidence": 0.83,
      "impact": "Stability",
      "category": "structural",
      "tags": ["kernel", "architecture", "infrastructure"],
      "firstSeen": "2025-11-03T19:03:59+01:00",
      "lastSeen": "2025-10-27T15:45:17+01:00",
      "evidenceIds": [
        "git-b2321a64-1762204440N",
        "git-0a2b4282-1762204440N",
        ...
      ],
      "recommendation": "Continue kernel stabilization efforts. Consider documenting architectural decisions and creating stability metrics."
    }
  ],
  "generated_at": "2025-11-10T13:17:23.782Z",
  "version": "1.0"
}
```

**Key Fields** :
- `pattern` : Description humaine du pattern
- `frequency` : Nombre d'occurrences détectées
- `confidence` : Score de confiance (0.0-1.0)
- `impact` : Domaine impacté (Stability, User_Experience, Technical_Debt)
- `category` : Type de pattern (structural, cognitive, operational)
- `recommendation` : Action recommandée

**Typical Count** : 4 patterns actifs

---

### 2. `correlations.json` — Pattern-Event Correlations

**What it is** : Relations détectées entre patterns et events

**Structure** :
```json
[
  {
    "id": "corr-1762780633781-wjiwkk9xt",
    "pattern_id": "pattern-kernel-evolution-1762780633778",
    "event_id": "53c5867b-c889-4964-ab9f-094ea5391f02",
    "correlation_score": 0.21,
    "direction": "emerging",
    "tags": ["kernel", "architecture", "infrastructure"],
    "impact": "Stability",
    "timestamp": "2025-11-10T13:17:13.781Z"
  }
]
```

**Key Fields** :
- `correlation_score` : Force de la corrélation (0.0-1.0)
- `direction` : Tendance (emerging, strengthening, weakening)
- `pattern_id` : Référence au pattern source
- `event_id` : Référence à l'event corrélé

**Typical Count** : 1-5 corrélations actives

---

### 3. `forecasts.json` — Future Predictions

**What it is** : Prédictions de décisions futures basées sur patterns/correlations

**Structure** :
```json
[
  {
    "forecast_id": "fc-1762780633799-1soq7a0kn",
    "predicted_decision": "Review and document: Frequent kernel architecture commits (21 commits) indicate active evolution of core reasoning infrastructure",
    "decision_type": "ADR_Proposal",
    "rationale": [
      "Pattern: Frequent kernel architecture commits (21 commits) indicate active evolution of core reasoning infrastructure",
      "Correlation: emerging (score: 0.21)"
    ],
    "confidence": 0.60,
    "suggested_timeframe": "H2 2026",
    "related_patterns": ["pattern-kernel-evolution-1762780633778"],
    "urgency": "low",
    "estimated_effort": "high"
  }
]
```

**Key Fields** :
- `predicted_decision` : Décision prédite (texte complet)
- `decision_type` : Type (ADR_Proposal, Refactor, Risk_Alert, Opportunity)
- `confidence` : Niveau de confiance de la prédiction (0.0-1.0)
- `suggested_timeframe` : Horizon temporel (Q1 2026, H2 2026, etc.)
- `urgency` : Niveau d'urgence (low, medium, high, critical)
- `estimated_effort` : Effort estimé (low, medium, high)

**Typical Count** : 4 forecasts actifs

---

### 4. `adrs/auto/proposals.index.json` — ADR Proposals Index

**What it is** : Index de toutes les propositions ADR (accepted/pending/rejected)

**Structure** :
```json
{
  "generated_at": "2025-11-10T15:05:03.891Z",
  "total_proposals": 3,
  "pending": ["adr-proposed-1762779666019-crynol"],
  "accepted": [
    "adr-proposed-1762779666019-5tenoe",
    "adr-proposed-1762779666019-qoetob"
  ],
  "rejected": [],
  "proposals": [
    {
      "id": "adr-proposed-1762779666019-5tenoe",
      "title": "Review and document: Consistent feature development...",
      "confidence": 0.66,
      "status": "accepted",
      "forecast_source": "fc-1762779666036-brtqz",
      "proposedAt": "2025-11-10T13:01:06.019Z"
    }
  ]
}
```

**Key Fields** :
- `total_proposals` : Nombre total d'ADRs proposés
- `pending/accepted/rejected` : IDs des ADRs par statut
- `proposals[]` : Liste détaillée avec confidence scores

---

### 5. `ledger/cycles.jsonl` — Execution Ledger (THE MOST IMPORTANT)

**What it is** : Ledger append-only de **TOUS** les cycles exécutés

**Structure** (1 ligne = 1 cycle) :
```json
{
  "cycleId": 100,
  "timestamp": "2025-11-10T15:19:55.347Z",
  "phases": {
    "patterns": { "hash": "7dd09a1970639e02", "count": 4 },
    "correlations": { "hash": "cfd5bbf328169cc0", "count": 1 },
    "forecasts": { "hash": "e882ad8ae98fb3c5", "count": 4 },
    "adrs": { "hash": "b5878896821de8a0", "count": 0 }
  },
  "merkleRoot": "1a82af40f26712d9...",
  "prevMerkleRoot": "39feb9f520593900...",
  "_timestamp": "2025-11-10T15:19:55.347Z"
}
```

**Key Fields** :
- `cycleId` : Numéro séquentiel du cycle
- `timestamp` : Quand le cycle s'est exécuté
- `phases.*.count` : Combien d'items générés par phase
- `phases.*.hash` : Hash du contenu (pour idempotence)
- `merkleRoot` : Hash cryptographique du cycle
- `prevMerkleRoot` : Chaînage au cycle précédent

**Typical Count** : 5,592 lignes (1 par cycle = 10s interval)

**How to read** :
```bash
# Last 10 cycles
tail -10 ledger/cycles.jsonl | jq .

# Cycles with 0 patterns (idle)
cat ledger/cycles.jsonl | jq 'select(.phases.patterns.count == 0)'

# Cycles where ADRs were generated
cat ledger/cycles.jsonl | jq 'select(.phases.adrs.count > 0)'
```

---

### 6. `ledger/adr_validations.jsonl` — Human Validation History

**What it is** : Track de toutes les validations humaines (accept/reject ADRs)

**Structure** (1 ligne = 1 validation) :
```json
{
  "adr_id": "adr-proposed-1762779666019-qoetob",
  "action": "accepted",
  "timestamp": "2025-11-10T15:05:03.891Z",
  "validator": "human",
  "notes": "validated - fix frequency confirms stability priority",
  "confidence": 0.62
}
```

**Key Fields** :
- `adr_id` : ID de l'ADR validé
- `action` : accepted ou rejected
- `validator` : "human" ou "auto" (si auto-accept futur)
- `notes` : Raison de la décision
- `confidence` : Confidence du forecast qui a généré cet ADR

**Typical Count** : 2-10 validations

---

### 7. `traces/git_commits.jsonl` — Git Commit Events

**What it is** : Tous les commits Git capturés en temps réel

**Structure** (1 ligne = 1 commit) :
```json
{
  "entry_id": "git-b2321a64-1762204440N",
  "type": "git_commit",
  "target_id": "b2321a64c6020960460a644d5781963a65477ad4",
  "timestamp": "2025-11-03T19:03:59+01:00",
  "data": {
    "commit": {
      "hash": "b2321a64c6020960460a644d5781963a65477ad4",
      "message": "fix(kernel): double-delay timer registration for Extension Host stability",
      "author": "Soynido",
      "files_changed": [
        "extension/extension.ts",
        "extension/kernel/CognitiveScheduler.ts"
      ]
    },
    "intent": {
      "type": "fix",
      "keywords": []
    },
    "impact": "neutral"
  }
}
```

**Key Fields** :
- `commit.hash` : Git SHA
- `commit.message` : Message du commit
- `commit.files_changed` : Fichiers modifiés
- `intent.type` : Type détecté (fix, feat, refactor, test, docs)
- `impact` : Impact estimé (neutral, positive, negative)

**Typical Count** : 10-50 commits

---

### 8. `traces/file_changes.jsonl` — File Change Events

**What it is** : Modifications de fichiers capturées en temps réel (chokidar)

**Structure** (1 ligne = 1 file change) :
```json
{
  "entry_id": "file-1762787937421-8k3mn",
  "type": "file_change",
  "target_id": "extension/kernel/cognitive/ADRGeneratorV2.ts",
  "timestamp": "2025-11-10T16:12:17.421Z",
  "data": {
    "path": "extension/kernel/cognitive/ADRGeneratorV2.ts",
    "event": "change",
    "size": 12345,
    "extension": ".ts"
  }
}
```

**Key Fields** :
- `target_id` : Path du fichier modifié
- `data.event` : Type de changement (change, add, unlink)
- `data.size` : Taille du fichier
- `data.extension` : Extension (.ts, .json, .md)

**Typical Count** : 200-500 changes

---

### 9. `kernel/state.json.gz` — Current Kernel State (CRITICAL)

**What it is** : État complet du kernel avec métriques du dernier feedback loop

**Structure** (compressed JSON) :
```json
{
  "version": "2.0.7",
  "cycle": 100,
  "updated_at": "2025-11-10T15:19:55.390Z",
  "forecast_metrics": {
    "forecast_precision": 0.657,
    "forecast_recall": 0.68,
    "total_forecasts": 43,
    "correct_forecasts": 31,
    "false_positives": 8,
    "false_negatives": 11,
    "improvement_rate": -0.073,
    "baseline": {
      "precision": 0.58,
      "established_at": "2025-10-01T00:00:00Z"
    }
  },
  "evaluation_metrics": {
    "forecast_accuracy": 0.0,
    "pattern_stability": 1.0,
    "adr_adoption_rate": 0.5,
    "cycle_efficiency": 0.9998,
    "total_cycles_analyzed": 5521,
    "last_evaluation": "2025-11-10T15:19:55.390Z"
  },
  "feedback_history": {
    "prev_precision": 0.73,
    "new_precision": 0.657,
    "delta": -0.073,
    "feedback_used": 0.0
  }
}
```

**Key Metrics** :
- `evaluation_metrics.adr_adoption_rate` : % ADRs acceptés (50% = 2/3)
- `evaluation_metrics.pattern_stability` : Stabilité des patterns (1.0 = 100%)
- `evaluation_metrics.cycle_efficiency` : % cycles réussis (0.9998 = 99.98%)
- `forecast_metrics.forecast_precision` : Précision baseline (0.657)

**How to read** :
```bash
gunzip -c kernel/state.json.gz | jq .
```

---

### 10. `feedback_report.json` — Comprehensive Feedback

**What it is** : Rapport de feedback généré par `extract-feedback-metrics.ts` (standalone)

**Structure** :
```json
{
  "generated_at": "2025-11-10T13:03:51.593Z",
  "cycles_analyzed": 4906,
  "data_sources": {
    "cycles": 4906,
    "forecasts": 4,
    "adrs": 52
  },
  "metrics": {
    "forecast_accuracy": 0.0,
    "pattern_stability": 1.0,
    "adr_adoption_rate": 0.077,
    "cycle_efficiency": 0.84
  },
  "composite_feedback": 0.38,
  "baseline_precision": 0.73,
  "delta": -0.35,
  "interpretation": "Regression detected",
  "recommendation": "Decrease α for stability"
}
```

**Key Fields** :
- `composite_feedback` : Score global (0.0-1.0), 0.50+ = sain
- `interpretation` : "Regression detected" ou "Improvement detected"
- `recommendation` : Action recommandée par le système

**⚠️ Note** : Ce fichier peut être **obsolète** (généré manuellement). Préférer `kernel/state.json.gz` pour données temps réel.

---

## 📋 Complete Examples

### Example 1 : Full Pattern

```json
{
  "id": "pattern-fix-cycle-1762787585212",
  "pattern": "High frequency of fix commits (27 fixes) suggests areas requiring stability improvements",
  "frequency": 27,
  "confidence": 0.7875,
  "impact": "Stability",
  "category": "structural",
  "tags": ["fixes", "stability", "quality"],
  "firstSeen": "2025-11-03T20:44:57+01:00",
  "lastSeen": "2025-10-26T18:50:54+01:00",
  "evidenceIds": [
    "git-0d4465dc-1762204440N",
    "git-b2321a64-1762204440N",
    "git-64ae0a60-1762204441N"
  ],
  "recommendation": "Investigate root causes of frequent fixes. Consider adding integration tests and improving error handling."
}
```

**Interpretation** :
- RL4 a détecté **27 commits de fix** sur les dernières semaines
- Confidence **78.75%** → Pattern robuste
- Impact **Stability** → Affecte la stabilité du système
- Recommandation : Ajouter tests d'intégration

---

### Example 2 : Full Forecast

```json
{
  "forecast_id": "fc-1762780633799-1zh9iw7aw",
  "predicted_decision": "Review and document: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements",
  "decision_type": "ADR_Proposal",
  "rationale": [
    "Pattern: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements",
    "Correlation: emerging (score: 0.6108663300851116)"
  ],
  "confidence": 0.60,
  "suggested_timeframe": "H2 2026",
  "related_patterns": ["pattern-fix-cycle-1762780633778"],
  "urgency": "low",
  "estimated_effort": "high"
}
```

**Interpretation** :
- RL4 prédit qu'un **ADR** devrait être créé pour documenter les fix commits
- Confidence **60%** → Prédiction modérée
- Timeframe **H2 2026** → Pas urgent
- Effort **high** → Nécessite investigation approfondie

---

### Example 3 : Full Cycle (from ledger)

```json
{
  "cycleId": 100,
  "timestamp": "2025-11-10T15:19:55.347Z",
  "phases": {
    "patterns": {
      "hash": "7dd09a1970639e02",
      "count": 4
    },
    "correlations": {
      "hash": "cfd5bbf328169cc0",
      "count": 1
    },
    "forecasts": {
      "hash": "e882ad8ae98fb3c5",
      "count": 4
    },
    "adrs": {
      "hash": "b5878896821de8a0",
      "count": 0
    }
  },
  "merkleRoot": "1a82af40f26712d973accf37394c6ffc69e431d662a63c2f223dc3047f25206d",
  "prevMerkleRoot": "39feb9f520593900eefc78e6efa071e48534259246c8c1121854d9e6460573bb"
}
```

**Interpretation** :
- Cycle **100** exécuté à 15:19:55
- **4 patterns** détectés (hash 7dd09a19...)
- **1 corrélation** trouvée (hash cfd5bbf3...)
- **4 forecasts** générés (hash e882ad8a...)
- **0 ADRs** générés dans ce cycle (normal, ils sont proposés ailleurs)
- **Merkle chain** : Chaîné au cycle précédent (integrity guaranteed)

---

### Example 4 : Full ADR Proposal

```json
{
  "id": "adr-proposed-1762779666019-qoetob",
  "title": "Review and document: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements",
  "status": "proposed",
  "createdAt": "2025-11-10T13:01:06.019Z",
  "modifiedAt": "2025-11-10T15:05:03.891Z",
  "author": "ADR Synthesizer V2 (Auto)",
  "context": "This ADR was automatically proposed based on pattern analysis and forecast modeling.\n\nPattern detected: \"High frequency of fix commits (27 fixes) suggests areas requiring stability improvements\"\nFrequency: 27 occurrences\nPattern confidence: 79%\n\nForecast confidence: 62%\nSuggested timeframe: H2 2026\nEstimated effort: high\n\nRationale:\n- Pattern: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements\n- Correlation: emerging (score: 0.6973296556464964)\n\n⚠️ This proposal requires human validation before acceptance.",
  "decision": "[AUTO-PROPOSED] Review and document: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements\n\nThis proposal was generated based on:\n- Pattern: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements\n- Correlation: emerging (score: 0.6973296556464964)\n\nRequires human validation before acceptance.",
  "consequences": "Expected impact: Stability\n\nPattern: High frequency of fix commits (27 fixes) suggests areas requiring stability improvements\nConfidence: 79%",
  "tags": ["pattern-fix-cycle-1762779666001"],
  "components": [],
  "relatedADRs": [],
  "evidenceIds": [],
  "autoGenerated": true,
  "forecast_source": "fc-1762779666036-v49z5",
  "requires_human_validation": true,
  "proposedAt": "2025-11-10T13:01:06.019Z",
  "validationStatus": "accepted",
  "validationNotes": "validated - fix frequency confirms stability priority",
  "confidence": 0.62
}
```

**Key Fields** :
- `validationStatus` : pending/accepted/rejected
- `validationNotes` : Raison de la validation humaine
- `confidence` : Confidence du forecast source
- `autoGenerated` : true (généré par RL4)
- `forecast_source` : ID du forecast qui a généré cet ADR

---

### Example 5 : Git Commit Trace

```json
{
  "entry_id": "git-b2321a64-1762204440N",
  "type": "git_commit",
  "target_id": "b2321a64c6020960460a644d5781963a65477ad4",
  "timestamp": "2025-11-03T19:03:59+01:00",
  "data": {
    "commit": {
      "hash": "b2321a64c6020960460a644d5781963a65477ad4",
      "message": "fix(kernel): double-delay timer registration for Extension Host stability",
      "author": "Soynido",
      "files_changed": [
        "extension/extension.ts",
        "extension/kernel/CognitiveScheduler.ts"
      ]
    },
    "intent": {
      "type": "fix",
      "keywords": []
    },
    "tags": [],
    "impact": "neutral"
  }
}
```

---

### Example 6 : File Change Trace

```json
{
  "entry_id": "file-1762787937421-8k3mn",
  "type": "file_change",
  "target_id": "extension/kernel/cognitive/ADRGeneratorV2.ts",
  "timestamp": "2025-11-10T16:12:17.421Z",
  "data": {
    "path": "extension/kernel/cognitive/ADRGeneratorV2.ts",
    "event": "change",
    "size": 12834,
    "extension": ".ts"
  }
}
```

---

## 🎯 Recommended Reading Order for External Tools

### Scenario 1 : "What is RL4 thinking right now?"

**Read** :
1. `patterns.json` → Current patterns detected
2. `forecasts.json` → Future predictions
3. `adrs/auto/proposals.index.json` → Proposed decisions

**Quick Command** :
```bash
cat patterns.json | jq '.patterns[] | {pattern, confidence, recommendation}'
cat forecasts.json | jq '.[] | {predicted_decision, confidence, urgency}'
cat adrs/auto/proposals.index.json | jq '{total: .total_proposals, accepted: (.accepted | length), pending: (.pending | length)}'
```

---

### Scenario 2 : "What has RL4 done recently?"

**Read** :
1. `ledger/cycles.jsonl` (last 100 lines) → Recent execution history
2. `ledger/adr_validations.jsonl` → Human decisions
3. `traces/git_commits.jsonl` (last 10) → Recent Git activity

**Quick Command** :
```bash
tail -100 ledger/cycles.jsonl | jq '{cycleId, patterns: .phases.patterns.count, forecasts: .phases.forecasts.count}'
cat ledger/adr_validations.jsonl | jq .
tail -10 traces/git_commits.jsonl | jq '{hash: .data.commit.hash, message: .data.commit.message, intent: .data.intent.type}'
```

---

### Scenario 3 : "How healthy is RL4?"

**Read** :
1. `kernel/state.json.gz` → Latest metrics (CRITICAL)
2. `feedback_report.json` → Comprehensive feedback (peut être obsolète)
3. Last cycle in `ledger/cycles.jsonl` → Current cycle ID

**Quick Command** :
```bash
gunzip -c kernel/state.json.gz | jq '.evaluation_metrics'
cat feedback_report.json | jq '{composite: .composite_feedback, interpretation}'
tail -1 ledger/cycles.jsonl | jq '.cycleId'
```

---

### Scenario 4 : "Give me a complete picture"

**Read ALL 10 essential files in order** :

```bash
# 1-4: Cognitive output
cat patterns.json | jq '.patterns | length'
cat correlations.json | jq '. | length'
cat forecasts.json | jq '. | length'
cat adrs/auto/proposals.index.json | jq .total_proposals

# 5-6: Execution ledger
wc -l ledger/cycles.jsonl
wc -l ledger/adr_validations.jsonl

# 7-8: Input signals
wc -l traces/git_commits.jsonl
wc -l traces/file_changes.jsonl

# 9-10: Health metrics
gunzip -c kernel/state.json.gz | jq .evaluation_metrics
cat feedback_report.json | jq .interpretation
```

---

## 📊 Quick Stats Commands

### Cognitive Pipeline Stats
```bash
# Patterns detected
cat patterns.json | jq '.patterns | length'

# Average pattern confidence
cat patterns.json | jq '[.patterns[].confidence] | add / length'

# Forecast types distribution
cat forecasts.json | jq 'group_by(.decision_type) | map({type: .[0].decision_type, count: length})'

# ADR adoption rate
cat adrs/auto/proposals.index.json | jq '{total: .total_proposals, accepted: (.accepted | length), rate: ((.accepted | length) / .total_proposals * 100)}'
```

### Execution Stats
```bash
# Total cycles executed
wc -l ledger/cycles.jsonl

# Cycles per day (last 24h)
cat ledger/cycles.jsonl | jq -r '.timestamp' | grep "$(date -u +%Y-%m-%d)" | wc -l

# Average patterns/cycle
cat ledger/cycles.jsonl | jq '[.phases.patterns.count] | add / length'

# Merkle chain integrity (should all be 64 chars)
tail -10 ledger/cycles.jsonl | jq -r '.merkleRoot' | awk '{print length}'
```

### Input Activity Stats
```bash
# Git commits by intent type
cat traces/git_commits.jsonl | jq -r '.data.intent.type' | sort | uniq -c

# Files changed by extension
cat traces/file_changes.jsonl | jq -r '.data.extension' | sort | uniq -c

# Most active files
cat traces/file_changes.jsonl | jq -r '.target_id' | sort | uniq -c | sort -rn | head -10
```

---

## 🧪 Health Check Commands

### Quick Health Check (30 seconds)
```bash
#!/bin/bash
echo "🔍 RL4 Quick Health Check"
echo ""

# Current cycle
CYCLE=$(tail -1 ledger/cycles.jsonl | jq -r '.cycleId')
echo "Current Cycle: $CYCLE"

# Patterns detected
PATTERNS=$(cat patterns.json | jq '.patterns | length')
echo "Patterns: $PATTERNS"

# ADR adoption
ADOPTION=$(cat adrs/auto/proposals.index.json | jq '(.accepted | length) / .total_proposals * 100')
echo "ADR Adoption: ${ADOPTION}%"

# Latest metrics
gunzip -c kernel/state.json.gz | jq -r '"Pattern Stability: " + (.evaluation_metrics.pattern_stability * 100 | tostring) + "%"'
gunzip -c kernel/state.json.gz | jq -r '"Cycle Efficiency: " + (.evaluation_metrics.cycle_efficiency * 100 | tostring) + "%"'
```

---

## 📈 Analytics Files (Bonus)

**New in v2.0.7** :

### `analytics/cycles_timeline.csv`
```csv
cycle_id,timestamp,patterns_count,correlations_count,forecasts_count,adrs_count,merkle_root
1,2025-11-10T15:03:25.344Z,0,0,0,0,
2,2025-11-10T15:03:35.347Z,0,0,0,0,
...
100,2025-11-10T15:19:55.347Z,4,1,4,0,7dd09a1970639e02
```

**Use case** : Import dans Excel/Google Sheets pour graphiques

---

### `analytics/adr_adoption.csv`
```csv
cycle_id,timestamp,total_adrs,pending,accepted,rejected,adoption_rate
10,2025-11-10T15:04:55.345Z,3,1,2,0,0.6667
20,2025-11-10T15:07:25.346Z,3,1,2,0,0.6667
...
```

**Use case** : Visualiser l'évolution du taux d'adoption

---

### `analytics/ANALYTICS_REPORT.md`
```markdown
# RL4 Analytics Report
**Generated**: 2025-11-10T15:05:31.948Z

## ADR Adoption Summary
- Total ADRs: 3
- Accepted: 2 ✅
- Adoption Rate: 66.7%

Adoption: █████████████████████████████████░░░ 66.7%
Target:   ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 15%
```

**Use case** : Rapport visuel ASCII pour humains

---

## 🎯 Key Insights for External Tools

### What Makes a Good RL4 Analysis?

1. **Start with `kernel/state.json.gz`** → Gives latest metrics
2. **Read `patterns.json`** → Understand what RL4 detected
3. **Read `forecasts.json`** → Understand what RL4 predicts
4. **Scan `ledger/cycles.jsonl` (tail -100)** → See recent activity
5. **Check `adrs/auto/proposals.index.json`** → See proposed decisions

### Red Flags to Watch

- ⚠️ **ADR adoption < 10%** → Trop de faux positifs
- ⚠️ **Pattern stability < 0.95** → Patterns instables
- ⚠️ **Cycle efficiency < 0.80** → Beaucoup d'échecs
- ⚠️ **Composite feedback < 0.45** → Régression détectée
- 🔴 **merkleRoot empty** → Corruption du ledger

---

## 📝 Summary

**Top 5 Essential Files** (pour comprendre RL4 en 2 minutes) :
1. `kernel/state.json.gz` (metrics temps réel) — **MOST IMPORTANT**
2. `patterns.json` (ce que RL4 a appris)
3. `forecasts.json` (ce que RL4 prédit)
4. `adrs/auto/proposals.index.json` (décisions proposées)
5. `ledger/cycles.jsonl` (tail -10 pour activité récente)

**Total size** : ~3.2 MB (dont 3.1 MB pour cycles.jsonl)

---

*Generated: 2025-11-10 16:20*  
*For: External tools, LLMs, analytics platforms*  
*Version: RL4 Kernel v2.0.7*

