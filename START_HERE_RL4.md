# ⚡ START HERE — RL4 Quick Guide

**Date** : 2025-11-03  
**Version** : RL4 Kernel v2.0.1 ✅ Stable

---

## 🎯 Où En Sommes-Nous ?

```
✅ KERNEL RL4 : Stable et actif
   └─ Cycles tournent toutes les 10s
   └─ Données persistées en temps réel
   └─ Watchdog auto-restart actif

🔄 ENGINES RL3 : Code existe, inactif
   └─ PatternLearningEngine (1,200 lignes)
   └─ CorrelationEngine (900 lignes)
   └─ ForecastEngine (800 lignes)
   └─ ADRGeneratorV2 (1,100 lignes)

🎯 OBJECTIF : Migrer engines RL3 → RL4
```

---

## 📚 Quelle Doc Lire ?

| Besoin | Fichier |
|--------|---------|
| **Comprendre séparation RL3/RL4** | `CONTEXT_RL3_RL4.md` |
| **Voir vision long terme** | `RL4_VISION_AND_ROADMAP.md` |
| **Voir tâches à faire** | `TASKS_RL4.md` ⭐ |
| **Plan technique migration** | `RL4_MIGRATION_PLAN.md` |
| **Navigation docs** | `INDEX_RL4.md` |

**⚠️ IGNORER** : `TASKS.md` (RL3 legacy, confus)

---

## 🚀 Prochaine Action

**Option 1** : Migrer PatternLearningEngine  
**Option 2** : Migrer Input Layer (GitCommitListener)  
**Option 3** : Créer WebView Dashboard  
**Option 4** : Autre chose ?

**Commande** :
```
"Démarre la migration de [nom du composant]"
```

---

## ⚡ Quick Status

```bash
# Est-ce que RL4 tourne ?
tail -3 .reasoning_rl4/ledger/cycles.jsonl | jq -c '{cycleId, time: .timestamp[11:19]}'

# Combien de cycles ?
wc -l < .reasoning_rl4/ledger/cycles.jsonl
```

**Si cycles récents** → RL4 fonctionne ✅  
**Si cycles vieux** → Rechargez VS Code

---

*C'est tout ! Les autres docs sont pour aller plus loin.*

