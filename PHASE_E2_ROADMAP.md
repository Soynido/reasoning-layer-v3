# 🚀 Phase E2 Roadmap — Real Metrics Integration

**Version** : RL4 Kernel v2.0.4 → v2.0.5  
**Status** : 🔄 IN PROGRESS  
**Start Date** : 2025-11-10  
**Estimated Duration** : 1-2 weeks

---

## 🎯 Objectif de Phase E2

**Remplacer le feedback simulé par des métriques réelles** basées sur les données existantes du système RL4.

### Avant (Phase E1)
```typescript
// Simulated feedback with ±5% noise
const simulatedFeedback = Math.random() * 0.2 + 0.7;
this.forecastEngine.updateBaseline(simulatedFeedback);
```

### Après (Phase E2)
```typescript
// Real feedback from FeedbackEvaluator
const evaluator = new FeedbackEvaluator(this.workspaceRoot);
const metrics = await evaluator.computeComprehensiveFeedback();
const realFeedback = metrics.composite_feedback;
this.forecastEngine.updateBaseline(realFeedback);
```

---

## 📊 Données Disponibles

### Sources Actuelles
| Source | Contenu | Volume | Exploitable |
|--------|---------|--------|-------------|
| **cycles.jsonl** | 4,312 cycles avec timestamps + phases | 100% | ✅ OUI |
| **git_commits.jsonl** | 5 commits avec metadata | 100% | ✅ OUI |
| **file_changes.jsonl** | 12 file changes avec patterns | 85% | ✅ OUI |
| **forecasts.json** | Forecasts générés (0 actuellement) | 0% | ⚠️ PARTIEL |
| **adrs/auto/*.json** | ADRs synthétisés (0 actuellement) | 0% | ⚠️ PARTIEL |

### Analyse Actuelle (extract-feedback-metrics.js)
```
📊 Metrics computed:
   📊 Forecast Accuracy:    50.0%  (neutral, no data)
   🧠 Pattern Stability:    100.0% (excellent!)
   📝 ADR Adoption Rate:    50.0%  (neutral, no data)
   ⚡ Cycle Efficiency:     100.0% (excellent!)

   🎯 Composite Feedback:   70.0%
   📈 Baseline:             73.0%
   Δ  Delta:                -3.0%
```

---

## 🧩 Composants Créés (Phase E1→E2)

### 1. FeedbackEvaluator.ts ✅
**Fichier** : `extension/kernel/cognitive/FeedbackEvaluator.ts` (306 lines)

**Méthodes** :
- `computeForecastAccuracy(windowSize)` — Compare forecasts vs. ADRs dans une fenêtre temporelle
- `computePatternStability(windowSize)` — Mesure variance des pattern counts
- `computeADRAdoptionRate()` — Détecte titres dupliqués (fuzzy match)
- `computeCycleEfficiency(windowSize)` — Calcule latence moyenne entre cycles
- `computeComprehensiveFeedback()` — Composite pondéré (40% accuracy, 20% stability, 20% adoption, 20% efficiency)

### 2. extract-feedback-metrics.ts ✅
**Fichier** : `scripts/extract-feedback-metrics.ts` (201 lines)

**Fonctionnalité** :
- Charge cycles.jsonl, forecasts.json, adrs/*.json
- Calcule 4 métriques + composite
- Génère feedback_report.json
- Affiche delta vs. baseline

### 3. Fail-safes ✅
**Fichier** : `extension/kernel/KernelBootstrap.ts` (modifié)

**Mécanismes** :
- Lock-file (state.lock) avec timeout 5s
- Temp file + atomic rename (.tmp → .gz)
- Stale lock detection et cleanup
- Error handling with rollback

---

## ⚙️ Zones à Renforcer (Analyse Utilisateur)

### 1. ✅ Source du Feedback — **RÉSOLU**
- **Avant** : Feedback simulé avec Math.random()
- **Maintenant** : FeedbackEvaluator avec 4 métriques réelles
- **Statut** : Fondations créées, intégration pending

### 2. ⚠️ Validation Empirique — **EN COURS**
**Problème** : Sans ground-truth, impossible de savoir si baseline s'améliore vraiment ou dérive.

**Solution proposée** :
1. **Run long (1,000+ cycles)** avec logs détaillés
2. **Tracer courbe** de forecast_precision sur 10 points
3. **Valider convergence** EMA (drift < ±0.05)

**Action** :
```bash
# Lancer 1,000 cycles en continu
# Attendre ~2.8 heures (10s/cycle)
# Analyser feedback_report.json toutes les 100 cycles
```

### 3. ✅ Fail-safes de Persistance — **RÉSOLU**
- **Avant** : Risque de corruption si crash pendant save
- **Maintenant** : Lock-file + atomic write + cleanup
- **Statut** : Implémenté et testé

### 4. ⚠️ Étalonnage α — **PENDING**
**Problème** : α=0.1 optimal pour signal peu bruité, mais peut ne pas convenir si feedback devient volatile.

**Solution proposée** :
```typescript
// Adaptive α based on variance
const recentFeedbacks = last10Feedbacks();
const variance = calculateVariance(recentFeedbacks);
const α = variance > 0.05 ? 0.05 : 0.1; // Lower α if noisy
```

**Action** : Implémenter α dynamique en Phase E2.2

---

## 📈 Roadmap Détaillée

### E2.1 : Integration de FeedbackEvaluator (1-2 jours)

**Objectif** : Remplacer feedback simulé par métriques réelles

**Tasks** :
- [ ] Importer FeedbackEvaluator dans CognitiveScheduler
- [ ] Modifier `applyFeedbackLoop()` :
  ```typescript
  private async applyFeedbackLoop(cycleId: number): Promise<void> {
      const evaluator = new FeedbackEvaluator(this.workspaceRoot);
      const metrics = await evaluator.computeComprehensiveFeedback();
      
      // Use real composite feedback instead of simulation
      const realFeedback = metrics.composite_feedback;
      this.forecastEngine.updateBaseline(realFeedback);
      
      // Persist metrics
      await KernelBootstrap.saveState({
          version: '2.0.5',
          cycle: cycleId,
          updated_at: new Date().toISOString(),
          forecast_metrics: this.forecastEngine.getMetrics(),
          evaluation_metrics: metrics
      }, this.workspaceRoot);
  }
  ```
- [ ] Tester avec cycles réels
- [ ] Vérifier logs montrent métriques réelles

### E2.2 : α Dynamique (1 jour)

**Objectif** : Adapter α selon variance des feedbacks

**Tasks** :
- [ ] Tracker derniers 10 feedbacks dans ForecastEngine
- [ ] Calculer variance avant update
- [ ] Ajuster α : variance > 0.05 → α=0.05, sinon α=0.1
- [ ] Logger changements d'α dans Output Channel

### E2.3 : Forecast Validation (2-3 jours)

**Objectif** : Valider predictions vs. reality

**Tasks** :
- [ ] Créer `ForecastValidator.ts`
- [ ] Comparer forecasts cycle N avec ADRs cycle N+1/N+2
- [ ] Calculer precision/recall/F1
- [ ] Intégrer dans FeedbackEvaluator
- [ ] Afficher dans feedback_report.json

### E2.4 : ADR Adoption Tracking (2 jours)

**Objectif** : Mesurer combien d'ADRs proposés sont acceptés

**Tasks** :
- [ ] Ajouter champ `status` dans ADR schema : "proposed" | "accepted" | "rejected"
- [ ] Créer commande VS Code : `Mark ADR as Accepted/Rejected`
- [ ] Tracker adoption rate dans FeedbackEvaluator
- [ ] Utiliser comme signal de qualité

### E2.5 : Longitudinal Charts (3-4 jours)

**Objectif** : Visualiser évolution sur 1,000+ cycles

**Tasks** :
- [ ] Créer `generate-charts.ts`
- [ ] Parser feedback_report.json historique
- [ ] Générer CSV : cycle, precision, accuracy, stability
- [ ] Créer graphique (gnuplot ou Python/matplotlib)
- [ ] Afficher dans WebView Dashboard (Phase 4)

### E2.6 : Validation Empirique (1 semaine)

**Objectif** : Confirmer EMA converge correctement

**Tasks** :
- [ ] Lancer run long : 1,000 cycles
- [ ] Collecter feedback_report.json toutes les 100 cycles
- [ ] Analyser drift (< ±0.05 target)
- [ ] Vérifier trend (+0.05/1,000 cycles target)
- [ ] Documenter résultats dans VALIDATION_E2.md

---

## 🎯 Success Criteria

### Phase E2.1 (Immediate)
- [ ] FeedbackEvaluator intégré dans scheduler
- [ ] Feedback réel remplace feedback simulé
- [ ] Logs montrent 4 métriques réelles
- [ ] Composite feedback > 70%

### Phase E2 Complete (1-2 weeks)
- [ ] α dynamique fonctionnel
- [ ] Forecast validation implémentée
- [ ] ADR adoption trackée
- [ ] Charts générés (1,000+ cycles)
- [ ] Drift < ±0.05 validé empiriquement
- [ ] Precision trend > +0.05/1,000 cycles

---

## 📊 Indicateurs Clés (KPIs)

| Indicateur | Cible | Signification |
|------------|-------|---------------|
| **Baseline Drift** | < ±0.05 / 1,000 cycles | Stabilité du modèle cognitif |
| **Cycle Latency** | < 5ms | Maintien de la réactivité |
| **Precision Trend** | +0.05 / 1,000 cycles | Progression réelle du moteur |
| **State Integrity** | 100% (SHA match) | Aucune corruption artefact |
| **Recovery Time** | < 1 cycle | Reprise instantanée après crash |
| **Forecast Accuracy** | > 75% | Qualité des prédictions |
| **Pattern Stability** | > 80% | Cohérence des patterns |
| **ADR Adoption** | > 60% | Pertinence des décisions |

---

## 🚀 Vision Post-E2

### Phase E3 : Universals Adaptation (2-3 weeks)
- **Merge mode** : Ajouter nouveaux universals sans écraser
- **Decay function** : Réduire confiance patterns obsolètes
- **Novelty detection** : Identifier patterns émergents

### Phase E4 : Model Retraining (1 month)
- **Export pipeline** : Traces → Training data
- **Periodic retraining** : Tous les 1,000 cycles
- **ONNX hot-reload** : Update model sans restart

### Phase E5 : Autonomous Meta-Learning (2 months)
- **Self-correction** : Détecter et corriger erreurs
- **Goal synthesis** : Générer objectifs autonomes
- **Strategic planning** : Décider quand apprendre

---

## 📞 Immediate Actions

### Pour l'utilisateur
1. **Lancer run long** :
   ```bash
   # Attendre 1,000 cycles (~2.8 heures)
   # Vérifier feedback_report.json toutes les 100 cycles
   ```

2. **Valider convergence** :
   ```bash
   cd "/Users/valentingaludec/Reasoning Layer V3"
   node scripts/extract-feedback-metrics.js
   # Répéter 10 fois sur 1,000 cycles
   # Tracer courbe de composite_feedback
   ```

3. **Committer Phase E2.1** :
   ```bash
   git add .
   git commit -m "feat(kernel): Phase E2.1 - Real metrics integration

   - Add FeedbackEvaluator module (306 lines)
   - Add extract-feedback-metrics script (201 lines)
   - Add fail-safes to KernelBootstrap (lock-file + atomic write)
   - Update TASKS_RL4.md with Phase E2 roadmap
   - Create PHASE_E2_ROADMAP.md
   "
   ```

---

## 📚 Documentation

### Fichiers Créés
- `extension/kernel/cognitive/FeedbackEvaluator.ts` (306 lines)
- `scripts/extract-feedback-metrics.ts` (201 lines)
- `PHASE_E2_ROADMAP.md` (ce fichier)

### Fichiers Modifiés
- `extension/kernel/KernelBootstrap.ts` (+50 lines fail-safes)
- `TASKS_RL4.md` (+80 lines Phase E2)

---

**✅ Phase E2.1 Foundations Complete!**

*Ready to integrate FeedbackEvaluator and replace simulated feedback with real metrics.*

---

**Author** : Valentin Galudec  
**Date** : 2025-11-10  
**Version** : RL4 Kernel v2.0.4 → v2.0.5 (Phase E2 IN PROGRESS)

