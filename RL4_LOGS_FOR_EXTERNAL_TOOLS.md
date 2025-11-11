# RL4 Logs — Guide Rapide pour Outils Externes

**TL;DR** : Si un outil doit comprendre RL4, donnez-lui **CES 3 FICHIERS** dans cet ordre :

---

## 🎯 Top 3 — Essential Logs (99% du contexte)

### 1️⃣ `rl4-snapshot.json` (32 KB) — **ONE-STOP SHOP** ✅

**Contient TOUT** :
- ✅ Patterns (4)
- ✅ Correlations (1)
- ✅ Forecasts (4)
- ✅ ADR Proposals (3)
- ✅ Kernel State (métriques temps réel)
- ✅ Validation History (2 validations)
- ✅ Recent Cycles (last 10)
- ✅ Recent Commits (last 5)
- ✅ Summary Stats

**Générer** :
```bash
bash scripts/export-rl4-snapshot.sh
# Output: rl4-snapshot.json (32 KB)
```

**Lire** :
```bash
cat rl4-snapshot.json | jq .
```

---

### 2️⃣ `.reasoning_rl4/analytics/ANALYTICS_REPORT.md` (1 KB) — **VISUAL SUMMARY**

**Contient** :
- ASCII charts (adoption rate, forecast distribution)
- Performance metrics (avg patterns/cycle)
- Validation timeline
- Human-readable format

**Lire** :
```bash
cat .reasoning_rl4/analytics/ANALYTICS_REPORT.md
```

---

### 3️⃣ `.reasoning_rl4/ledger/cycles.jsonl` (tail -100) — **EXECUTION HISTORY**

**Contient** :
- 100 derniers cycles exécutés
- Métriques de chaque phase (patterns, correlations, forecasts, adrs)
- Merkle chain pour intégrité

**Lire** :
```bash
tail -100 .reasoning_rl4/ledger/cycles.jsonl | jq .
```

---

## 📋 Fichiers par Cas d'Usage

### Cas 1 : "Qu'est-ce que RL4 a appris ?"
**Fichier** : `.reasoning_rl4/patterns.json` (8 KB)

**Exemple** :
```json
{
  "patterns": [
    {
      "pattern": "High frequency of fix commits (27 fixes) suggests areas requiring stability improvements",
      "confidence": 0.79,
      "recommendation": "Investigate root causes of frequent fixes. Consider adding integration tests."
    }
  ]
}
```

---

### Cas 2 : "Qu'est-ce que RL4 prédit ?"
**Fichier** : `.reasoning_rl4/forecasts.json` (4 KB)

**Exemple** :
```json
[
  {
    "predicted_decision": "Review and document: High frequency of fix commits...",
    "confidence": 0.62,
    "urgency": "low",
    "suggested_timeframe": "H2 2026"
  }
]
```

---

### Cas 3 : "Quelles décisions RL4 propose-t-il ?"
**Fichier** : `.reasoning_rl4/adrs/auto/proposals.index.json` (4 KB)

**Exemple** :
```json
{
  "total_proposals": 3,
  "pending": 1,
  "accepted": 2,
  "adoption_rate": 66.7
}
```

---

### Cas 4 : "RL4 est-il en bonne santé ?"
**Fichier** : `.reasoning_rl4/kernel/state.json.gz` (compressé, 386 B)

**Commande** :
```bash
gunzip -c .reasoning_rl4/kernel/state.json.gz | jq .evaluation_metrics
```

**Exemple** :
```json
{
  "forecast_accuracy": 0.0,
  "pattern_stability": 1.0,
  "adr_adoption_rate": 0.5,
  "cycle_efficiency": 0.9998
}
```

---

### Cas 5 : "Qu'est-ce que RL4 a observé ?"
**Fichiers** :
- `.reasoning_rl4/traces/git_commits.jsonl` (16 KB, 10 commits)
- `.reasoning_rl4/traces/file_changes.jsonl` (144 KB, 236 changes)

**Commande** :
```bash
# Last 5 commits
tail -5 .reasoning_rl4/traces/git_commits.jsonl | jq '{hash: .data.commit.hash, message: .data.commit.message}'
```

---

## 🚀 Quick Start pour Outils Externes

### Option 1 : Snapshot Unique (Recommandé)

```bash
# 1. Générer snapshot
bash scripts/export-rl4-snapshot.sh

# 2. Lire snapshot
cat rl4-snapshot.json | jq .

# 3. Injecter dans outil externe
curl -X POST https://api.example.com/analyze \
  -H "Content-Type: application/json" \
  -d @rl4-snapshot.json
```

---

### Option 2 : Lecture Sélective

```bash
# Cognitive output only
cat .reasoning_rl4/patterns.json
cat .reasoning_rl4/forecasts.json

# Execution history only
tail -100 .reasoning_rl4/ledger/cycles.jsonl

# Health metrics only
gunzip -c .reasoning_rl4/kernel/state.json.gz
```

---

## 📊 Tailles de Fichiers

| Priorité | Fichier | Taille | Description |
|----------|---------|--------|-------------|
| 🔴 **P0** | `rl4-snapshot.json` | 32 KB | **Tout-en-un** (recommandé) |
| 🟠 **P1** | `patterns.json` | 8 KB | Patterns détectés |
| 🟠 **P1** | `forecasts.json` | 4 KB | Prédictions |
| 🟠 **P1** | `kernel/state.json.gz` | 386 B | Métriques temps réel |
| 🟡 **P2** | `ledger/cycles.jsonl` | 3.1 MB | Full history (tail -100 suffit) |
| 🟡 **P2** | `analytics/ANALYTICS_REPORT.md` | 1 KB | Rapport visual |
| 🟢 **P3** | `traces/*.jsonl` | 160 KB | Input signals |

**Total Essential** : ~40 KB (avec snapshot)  
**Total Complete** : ~3.3 MB (avec full ledger)

---

## 💡 Best Practices

### Pour LLMs (Claude, GPT, etc.)
```bash
# Injecter snapshot dans context
cat rl4-snapshot.json | jq . | pbcopy

# Ou combiner avec guide de structure
cat RL4_DATA_STRUCTURE_GUIDE.md rl4-snapshot.json
```

### Pour Analytics Platforms
```bash
# Export CSV pour Excel/Tableau
.reasoning_rl4/analytics/cycles_timeline.csv
.reasoning_rl4/analytics/adr_adoption.csv
.reasoning_rl4/analytics/forecast_accuracy.csv
```

### Pour APIs REST
```bash
# Snapshot JSON est directement POST-able
curl -X POST https://api.example.com/reasoning \
  -H "Content-Type: application/json" \
  -d @rl4-snapshot.json
```

---

## 🎯 Minimal Context (Pour Tokens Limités)

Si limitation de tokens, **minimum absolu** :

```bash
# Extract minified snapshot (top-level only)
cat rl4-snapshot.json | jq '{
  patterns: (.patterns | map({pattern, confidence})),
  forecasts: (.forecasts | map({predicted_decision, confidence})),
  metrics: .kernel_state.evaluation_metrics,
  stats: .summary_stats
}'

# Output: ~2-3 KB (vs 32 KB complet)
```

---

## 📝 Files Generated

**Guide complet** : `RL4_DATA_STRUCTURE_GUIDE.md` (15 KB)
- Structure de tous les fichiers
- Exemples réels
- Commandes d'analyse
- Health checks

**Snapshot compact** : `rl4-snapshot.json` (32 KB)
- État cognitif complet
- Historique récent
- Métriques temps réel

**Export script** : `scripts/export-rl4-snapshot.sh`
- Génère snapshot à la demande
- Combine tous les logs essentiels
- Format JSON standard

---

**RÉSUMÉ** : Donnez `rl4-snapshot.json` + `RL4_DATA_STRUCTURE_GUIDE.md` à n'importe quel outil, il comprendra RL4 en 2 minutes ! 🚀

