# 🎬 User Journey - Vue Synthétique

> **Timeline visuelle du parcours utilisateur RL4**

---

## 🌟 Premier Démarrage (Workspace Vierge)

```
T+0s      │ 👤 Utilisateur ouvre VS Code + workspace
          │
T+0.5s    │ 🚀 Extension RL4 s'active automatiquement
          │    ├─ Création Output Channel "RL4 Kernel"
          │    ├─ Affichage automatique
          │    └─ Logs initiaux visibles
          │
T+1.0s    │ ⚙️  Chargement configuration
          │    └─ .reasoning_rl4/kernel_config.json
          │       (créé avec défauts si absent)
          │
T+1.2s    │ 🔧 Initialisation des composants
          │    ├─ TimerRegistry
          │    ├─ StateRegistry
          │    ├─ HealthMonitor
          │    ├─ CognitiveScheduler
          │    ├─ ExecPool
          │    └─ KernelAPI
          │
T+1.5s    │ 🔍 Recherche artefacts kernel
          │    ├─ .reasoning_rl4/kernel/state.json.gz
          │    ├─ .reasoning_rl4/kernel/universals.json.gz
          │    └─ .reasoning_rl4/kernel/forecast_metrics.json.gz
          │    
          │    ❌ ABSENT (workspace vierge)
          │    └─ "No kernel artifacts found, starting with default baseline (0.73)"
          │
T+2.0s    │ ❤️  Démarrage Health Monitor
          │    └─ Monitoring CPU/Mémoire/Timers actif
          │
T+2.5s    │ 📢 Annonce démarrage Scheduler
          │    └─ "Starting CognitiveScheduler (delayed start in 3s)..."
          │
T+5.5s    │ 🧠 Démarrage effectif Scheduler
          │    ├─ Cycles cognitifs toutes les 10s
          │    └─ "Watchdog active (10000ms cycles)"
          │
T+5.6s    │ 📥 Démarrage Input Layer
          │    ├─ 🔍 Détection dépôt Git
          │    │   ├─ ✅ Si Git → GitCommitListener actif
          │    │   └─ ❌ Si non-Git → GitCommitListener disabled
          │    └─ 📁 FileChangeWatcher actif (toujours)
          │
T+5.7s    │ 📂 Création structure .reasoning_rl4/
          │    ├─ kernel/
          │    ├─ ledger/
          │    ├─ traces/
          │    ├─ adrs/auto/
          │    ├─ diagnostics/
          │    ├─ patterns.json
          │    ├─ correlations.json
          │    ├─ forecasts.json
          │    └─ kernel_config.json
          │
T+15.5s   │ 🔄 Premier Cycle Cognitif (#1)
          │    ├─ 📊 Patterns: 0 détectés
          │    ├─ 🔗 Correlations: 0 trouvées
          │    ├─ 🔮 Forecasts: 0 générés
          │    ├─ 📋 ADRs: 0 proposées
          │    └─ ✅ Cycle #1 complete (merkle: 3a2f5b...)
          │
T+25.5s   │ 🔄 Cycle #2...
T+35.5s   │ 🔄 Cycle #3...
T+45.5s   │ 🔄 Cycle #4...
          │
          ▼
    ÉTAT STABLE
          │
          ├─ ✅ Extension activée et fonctionnelle
          ├─ ✅ Output Channel visible avec logs en continu
          ├─ ✅ Structure .reasoning_rl4/ créée
          ├─ ✅ Cycles cognitifs toutes les 10 secondes
          ├─ ✅ Capture d'événements active (Git + Files)
          └─ ✅ Système observe le développeur silencieusement
```

---

## 🔄 Sessions Suivantes (Retour)

```
T+0s      │ 👤 Utilisateur ouvre VS Code + workspace existant
          │
T+0.5s    │ 🚀 Extension RL4 s'active
          │    └─ .reasoning_rl4/ EXISTE déjà ✅
          │
T+1.0s    │ ⚙️  Chargement configuration existante
          │    └─ .reasoning_rl4/kernel_config.json ✅
          │
T+1.5s    │ 🔍 Chargement artefacts kernel
          │    ├─ ✅ state.json.gz trouvé
          │    ├─ ✅ universals.json.gz trouvé (42 universals)
          │    ├─ ✅ forecast_metrics.json.gz trouvé
          │    └─ "Bootstrap complete: 42 universals loaded"
          │       "Forecast precision baseline: 0.847"
          │
T+2.0s    │ 📖 Lecture des ledgers existants
          │    ├─ cycles.jsonl (442 cycles précédents)
          │    ├─ git_commits.jsonl (10 commits)
          │    └─ file_changes.jsonl (247 modifications)
          │
T+5.5s    │ 🧠 Démarrage Scheduler
          │    └─ Reprise depuis cycle #442
          │
T+15.5s   │ 🔄 Nouveau cycle (#443)
          │    ├─ 📊 Patterns: 4 (stable, persistés)
          │    ├─ 🔗 Correlations: 1
          │    ├─ 🔮 Forecasts: 4
          │    └─ ✅ Cycle #443 complete (merkle: 7f1e2d...)
          │       └─ Merkle chain maintenue (prevMerkleRoot ↔ merkleRoot)
          │
          ▼
    CONTINUITÉ ASSURÉE
          │
          ├─ ✅ Numéro de cycle incrémenté (442 → 443)
          ├─ ✅ Merkle chain intacte
          ├─ ✅ Patterns et forecasts persistés
          ├─ ✅ Historique complet accessible
          └─ ✅ "Mémoire" du système restaurée
```

---

## 💼 Interactions Quotidiennes

### 📝 Modification de Fichier

```
👤 Action: Éditer src/app.ts + Sauvegarder

    ↓ (instant)

📁 FileChangeWatcher détecte
   ├─ Analyse pattern (feature/fix/refactor/docs/config)
   ├─ Calcul cognitive_relevance (0.0 → 1.0)
   └─ Écriture dans traces/file_changes.jsonl
   
    ↓ (< 10s)
    
🔄 Prochain cycle cognitif
   ├─ Nouveau pattern détecté si pertinent
   ├─ Corrélation avec autres événements
   └─ Forecast généré si seuil atteint
```

### 🔧 Commit Git

```
👤 Action: git commit -m "feat: Add auth"

    ↓ (< 5s polling)

🔍 GitCommitListener détecte
   ├─ Extraction métadonnées (hash, message, author, files)
   ├─ Détection intent (feat/fix/docs/test/refactor)
   └─ Écriture dans traces/git_commits.jsonl
   
    ↓ (< 10s)
    
🔄 Prochain cycle cognitif
   ├─ Pattern "auth-implementation" détecté
   ├─ Corrélation commit ↔ file changes
   ├─ Forecast: "Document authentication flow"
   └─ ADR proposée si critères remplis
```

### 🔥 Modification en Burst

```
👤 Action: 3 sauvegardes sur app.ts en 30 secondes

    ↓ (debouncing intelligent)

📁 FileChangeWatcher agrège
   ├─ Détection "burst" (modifs rapprochées)
   ├─ Pattern "refactor" identifié
   ├─ Cognitive_relevance augmenté (0.9 → 0.95)
   └─ 1 seule entrée créée (agrégée)
   
    ↓ (< 10s)
    
🔄 Prochain cycle cognitif
   ├─ Pattern "refactor burst" détecté
   └─ Si répété sur 7j → Alerte anti-pattern
```

---

## 📊 Vue d'ensemble des Cycles

```
Cycle N (toutes les 10s)
┌────────────────────────────────────────────────┐
│                                                │
│  📥 INPUT                                      │
│  ├─ Lecture traces/file_changes.jsonl         │
│  ├─ Lecture traces/git_commits.jsonl          │
│  └─ Lecture ledger/rbom_ledger.jsonl          │
│                                                │
│  ▼                                             │
│                                                │
│  🧩 PATTERN LEARNING                           │
│  ├─ Extraction patterns nouveaux              │
│  ├─ Mise à jour fréquences                    │
│  ├─ Calcul confidence                         │
│  └─ Écriture patterns.json                    │
│                                                │
│  ▼                                             │
│                                                │
│  🔗 CORRELATION                                │
│  ├─ Matching patterns ↔ events                │
│  ├─ Calcul correlation_score                  │
│  ├─ Détection direction (emerging/stable)     │
│  └─ Écriture correlations.json                │
│                                                │
│  ▼                                             │
│                                                │
│  🔮 FORECASTING                                │
│  ├─ Génération prédictions                    │
│  ├─ Calcul confidence (baseline + patterns)   │
│  ├─ Estimation effort/urgency                 │
│  └─ Écriture forecasts.json                   │
│                                                │
│  ▼                                             │
│                                                │
│  📋 ADR GENERATION                             │
│  ├─ Évaluation seuils (confidence, frequency) │
│  ├─ Proposition ADRs si critères atteints     │
│  ├─ Déduplication ADRs similaires             │
│  └─ Écriture adrs/auto/adr-*.json             │
│                                                │
│  ▼                                             │
│                                                │
│  💾 PERSISTENCE                                │
│  ├─ Calcul Merkle Root (intégrité)            │
│  ├─ Chaînage avec cycle précédent             │
│  └─ Append ledger/cycles.jsonl                │
│                                                │
└────────────────────────────────────────────────┘

    ↓ 10s ↓

Cycle N+1...
```

---

## 🎯 Points Clés pour l'Utilisateur

### ✅ Ce que l'utilisateur VOIT

```
┌─────────────────────────────────────────┐
│  📺 OUTPUT CHANNEL "RL4 Kernel"         │
├─────────────────────────────────────────┤
│  [16:30:45] === RL4 KERNEL ===          │
│  [16:30:45] Workspace: /my-project      │
│  [16:30:48] ✅ Scheduler started        │
│  [16:30:58] 🔄 Cycle #1 started         │
│  [16:30:58] 📊 Patterns: 0              │
│  [16:30:58] ✅ Cycle #1 complete         │
│  [16:31:08] 🔄 Cycle #2 started         │
│  [16:31:08] 📊 Patterns: 1              │
│  ...                                     │
└─────────────────────────────────────────┘

Rafraîchissement continu toutes les 10s
Logs horodatés et structurés
Visibilité complète sur l'activité cognitive
```

### ✅ Ce que l'utilisateur NE VOIT PAS (mais qui fonctionne)

- 🔇 Capture silencieuse des modifications de fichiers
- 🔇 Polling Git toutes les 5s pour détecter commits
- 🔇 Calculs cognitifs en arrière-plan
- 🔇 Écriture continue dans les ledgers
- 🔇 Génération automatique patterns/forecasts/ADRs
- 🔇 Maintien de l'intégrité Merkle

### 🎚️ Niveau d'intervention utilisateur

```
┌──────────────────────────────────────────────┐
│  Installation              │ 🟢 Unique        │
│  Activation               │ 🟢 Automatique   │
│  Fonctionnement quotidien │ 🟢 Zéro-touch   │
│  Consultation données     │ 🟡 Optionnelle   │
│  Configuration avancée    │ 🔴 Rare          │
└──────────────────────────────────────────────┘

L'utilisateur CODE normalement
RL4 observe, apprend et documente en silence
```

---

## 🚀 Évolution Future (Roadmap)

### Phase actuelle: Observation Silencieuse ✅

```
👤 Développeur ──code──> 🧠 RL4 observe
                              │
                              ├─ Patterns détectés
                              ├─ Forecasts générés
                              ├─ ADRs proposées
                              └─ Données stockées

📊 Consultation manuelle des fichiers JSON
```

### Phase prochaine: WebView Interactive 🔄

```
👤 Développeur ──code──> 🧠 RL4 observe
                              │
                              ├─ Patterns détectés
                              ├─ Forecasts générés
                              ├─ ADRs proposées
                              └─ Données stockées
                              
                         🖥️  WebView VS Code
                         │
                         ├─ 🔄 Replay Cognitif
                         ├─ 📝 PR Summary
                         └─ 🚨 Alertes Anti-Pattern

👤 Interaction riche et visuelle
```

### Phase future: AI Proactive 🌟

```
👤 Développeur ──code──> 🧠 RL4 observe
                              │
                              ├─ Patterns détectés
                              ├─ Forecasts générés
                              ├─ ADRs proposées
                              └─ Données stockées
                              
                         🤖 AI Augmentée
                         │
                         ├─ 💬 Suggestions proactives
                         ├─ 📊 Insights prédictifs
                         └─ ⚠️  Alertes préventives

👤 RL4 devient assistant cognitif actif
```

---

## 📈 Progression de l'Apprentissage

```
Jour 1 (Cycle 1-100)
├─ Patterns: 0-2 (baseline learning)
├─ Confidence: 0.73 (défaut)
└─ Phase: Observation initiale

    ↓

Semaine 1 (Cycle 100-1000)
├─ Patterns: 2-5 (patterns émergents)
├─ Confidence: 0.73 → 0.80
└─ Phase: Reconnaissance patterns

    ↓

Mois 1 (Cycle 1000-4500)
├─ Patterns: 5-8 (patterns stables)
├─ Confidence: 0.80 → 0.85
└─ Phase: Prédictions fiables

    ↓

Mois 3+ (Cycle 4500+)
├─ Patterns: 8-12 (patterns consolidés)
├─ Confidence: 0.85 → 0.90+
└─ Phase: Expertise domaine

💡 Plus le système observe, plus il devient précis
```

---

## ⚙️ Configuration Rapide

### Intervalle des cycles

```bash
# Fichier: .reasoning_rl4/kernel_config.json
{
  "cognitive_cycle_interval_ms": 10000  # ← Modifier ici
}

# Options courantes:
# 5000  → Haute fréquence (dev actif)
# 10000 → Normal (défaut) ✅
# 30000 → Basse fréquence (économie)
# 60000 → Très basse (background)
```

### Activer/Désactiver modules

```bash
{
  "USE_TIMER_REGISTRY": true,      # ← Core kernel
  "USE_HEALTH_MONITOR": true,      # ← Monitoring (optionnel)
  "cognitive_cycle_interval_ms": 10000
}
```

---

**Résumé:** RL4 s'active automatiquement, observe silencieusement, apprend continuellement, et documente sans intervention. L'utilisateur code normalement, RL4 fait le reste. 🧠✨

---

**Version:** 1.0  
**Date:** 2025-11-10  
**Pour:** Quick Reference User Journey

