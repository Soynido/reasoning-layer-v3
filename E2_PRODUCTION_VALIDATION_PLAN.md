# Phase E2 — Production Validation Plan

**Date de démarrage** : 2025-11-10 14:45  
**Durée estimée** : 100 cycles × 10s = ~17 minutes  
**Objectif** : Valider les fixes E2.5 en production

---

## 🎯 Objectifs de Validation

### 1. **Validation de la Déduplication ADR**
- ✅ **Fix déployé** : SHA256 hash sur titre uniquement (ADRGeneratorV2.ts)
- 🎯 **Objectif** : 0 nouveaux duplicates sur 100 cycles
- 📊 **Métrique** : `total_adr_files` doit rester ≈ `unique_adrs`

### 2. **Validation des Seuils de Confidence**
- ✅ **Fix déployé** : Thresholds augmentés à 0.70 (ForecastEngine.ts)
- 🎯 **Objectif** : ADR adoption rate > 15% (actuellement 7.7%)
- 📊 **Métrique** : `adr_adoption_rate` dans feedback_report.json

### 3. **Validation de l'Adaptive α**
- ✅ **Fix déployé** : Calibration variance-based (Phase E2.3)
- 🎯 **Objectif** : α ajusté dynamiquement selon variance
- 📊 **Métrique** : Logs `🔧 α adjusted: X.XX → Y.YY`

### 4. **Validation des Métriques Réelles**
- ✅ **Fix déployé** : FeedbackEvaluator intégré (Phase E2.2)
- 🎯 **Objectif** : Composite feedback > 0.50 (actuellement 0.38)
- 📊 **Métrique** : `composite_feedback` dans feedback_report.json

---

## 📊 Métriques à Observer

### Baseline (Avant fixes - Cycle 4982)
```json
{
  "total_adr_files": 147,
  "unique_adrs": 3,
  "duplication_rate": 0.98,
  "adr_adoption_rate": 0.077,
  "forecast_accuracy": 0,
  "pattern_stability": 1.0,
  "cycle_efficiency": 0.84,
  "composite_feedback": 0.38,
  "confidence_threshold": 0.65,
  "alpha": 0.1
}
```

### Objectifs (Après fixes - Cycle 5082+)
```json
{
  "total_adr_files": "~3-5 (pas de nouveaux duplicates)",
  "unique_adrs": "~3-5",
  "duplication_rate": "< 0.05",
  "adr_adoption_rate": "> 0.15",
  "forecast_accuracy": "> 0",
  "pattern_stability": "~1.0",
  "cycle_efficiency": "> 0.80",
  "composite_feedback": "> 0.50",
  "confidence_threshold": 0.70,
  "alpha": "dynamic (0.05-0.1)"
}
```

---

## 🔍 Plan d'Observation

### Phase 1 : Observation Courte (0-20 cycles, ~3 minutes)

**Actions** :
1. ✅ Déployer les fixes (déjà fait)
2. ✅ Nettoyer les duplicates existants (144 removed)
3. 🔄 Observer les premiers cycles avec nouveaux thresholds

**Vérifications** :
- [ ] Extension RL4 active (check Output Channel)
- [ ] Cycles génèrent des forecasts (confidence ≥ 0.70)
- [ ] Aucun nouveau duplicate ADR créé
- [ ] Logs de FeedbackEvaluator visibles (si cycle % 100 == 0)

**Commandes de vérification** :
```bash
# Check nombre d'ADRs
ls -l .reasoning_rl4/adrs/auto/*.json | wc -l

# Check dernier cycle
tail -1 .reasoning_rl4/ledger/cycles.jsonl | jq .

# Check forecasts générés
cat .reasoning_rl4/forecasts.json | jq '. | length'
```

---

### Phase 2 : Observation Moyenne (20-100 cycles, ~13 minutes)

**Actions** :
1. Observer l'évolution des métriques
2. Vérifier les ajustements automatiques de α
3. Valider la stabilité du système

**Vérifications** :
- [ ] Nouveaux forecasts générés (confidence ≥ 0.70)
- [ ] ADR adoption rate en amélioration
- [ ] Composite feedback en augmentation
- [ ] α ajusté automatiquement (logs présents si variance change)

**Commandes de vérification** :
```bash
# Check feedback report (si cycle ≥ 100)
cat .reasoning_rl4/feedback_report.json | jq .

# Check forecast metrics
cat .reasoning_rl4/kernel/forecast_metrics.json.gz | gunzip | jq .

# Check derniers logs (Output Channel)
# → Rechercher "📊 [E2.2] Real metrics computed"
# → Rechercher "🔧 α adjusted"
```

---

### Phase 3 : Observation Longue (100+ cycles, post-feedback loop)

**Actions** :
1. Analyser le premier feedback loop (cycle 100)
2. Valider les métriques réelles
3. Décision : continuer ou ajuster

**Vérifications** :
- [ ] **CRITIQUE** : Feedback loop exécuté (cycle % 100 == 0)
- [ ] Real metrics computed (accuracy, stability, adoption, efficiency)
- [ ] Forecast accuracy > 0% (au moins 1 forecast validé)
- [ ] ADR adoption rate > 10% (minimum acceptable)
- [ ] Composite feedback > 0.45 (amélioration de +18% vs baseline)

**Commandes de vérification** :
```bash
# Check cycle actuel
tail -1 .reasoning_rl4/ledger/cycles.jsonl | jq '.cycleId'

# Check feedback report (généré tous les 100 cycles)
cat .reasoning_rl4/feedback_report.json | jq '{
  generated_at,
  cycles_analyzed,
  forecast_accuracy,
  adr_adoption_rate,
  composite_feedback: (.composite_feedback * 100 | round / 100),
  interpretation
}'

# Check état kernel
cat .reasoning_rl4/kernel/forecast_metrics.json.gz | gunzip | jq '{
  forecast_precision,
  forecast_recall,
  improvement_rate,
  baseline
}'
```

---

## ✅ Critères de Succès

### Validation Minimale (Cycle 100)
- ✅ **Zéro nouveaux duplicates** : total_adr_files ≈ unique_adrs
- ✅ **ADR adoption > 10%** : Amélioration vs 7.7% baseline
- ✅ **Composite feedback > 0.45** : Amélioration vs 0.38 baseline
- ✅ **Forecast accuracy > 0%** : Au moins 1 forecast validé
- ✅ **Adaptive α fonctionnel** : Logs d'ajustement présents

### Validation Optimale (Cycle 100)
- 🎯 **ADR adoption > 15%** : Objectif atteint
- 🎯 **Composite feedback > 0.50** : Objectif atteint
- 🎯 **Forecast accuracy > 5%** : Début de calibration
- 🎯 **Pattern stability = 1.0** : Stabilité maintenue
- 🎯 **Cycle efficiency > 0.85** : Performance améliorée

---

## 🚨 Alertes à Surveiller

### Alertes Critiques 🔴
1. **Nouveaux duplicates détectés** (total_adr_files >> unique_adrs)
   - Action : Vérifier la déduplication dans ADRGeneratorV2.ts
   - Possible cause : Hash collision ou bug dans isDuplicate()

2. **ADR adoption rate < 5%** (régression vs 7.7%)
   - Action : Thresholds trop élevés, réduire à 0.68
   - Possible cause : Trop peu de forecasts passent le seuil 0.70

3. **Composite feedback < 0.35** (régression vs 0.38)
   - Action : Investiguer les métriques individuelles
   - Possible cause : Forecast accuracy ou ADR adoption en chute

### Alertes Mineures ⚠️
4. **ADR adoption 10-15%** (amélioration insuffisante)
   - Action : Observer 100 cycles supplémentaires
   - Décision : Ajuster thresholds si stagnation

5. **Forecast accuracy = 0%** après 100 cycles
   - Action : Valider manuellement quelques ADRs
   - Possible cause : Aucun forecast n'a encore été validé humainement

6. **α ne s'ajuste pas** (toujours 0.1)
   - Action : Vérifier variance des feedbacks
   - Possible cause : Pas assez de feedbacks (< 5) ou variance trop stable

---

## 📈 Graphiques à Générer (Post-validation)

Si les résultats sont positifs, générer les charts suivants :

### 1. ADR Adoption Rate Trend
```
Cycles 4900-5000: Baseline (7.7%)
Cycles 5000-5100: Post-fix (target: 15%+)
```

### 2. Composite Feedback Evolution
```
Cycles 4900-5000: Baseline (0.38)
Cycles 5000-5100: Post-fix (target: 0.50+)
```

### 3. Forecast Confidence Distribution
```
Before: Mean 0.62, Threshold 0.65
After:  Mean 0.72, Threshold 0.70
```

### 4. Adaptive α Timeline
```
Display α adjustments over time with variance annotations
```

---

## 📝 Rapport de Validation

À compléter après observation :

### Résultats Observés (Cycle 5082+)
```json
{
  "observation_period": "Cycle 4982 → 5082",
  "total_cycles_observed": 100,
  "new_adrs_generated": "___",
  "duplicates_detected": "___",
  "adr_adoption_rate": "___",
  "composite_feedback": "___",
  "forecast_accuracy": "___",
  "alpha_adjustments": "___",
  "validation_status": "✅ PASS / ⚠️ PARTIAL / ❌ FAIL"
}
```

### Décision Post-Validation
- [ ] **Succès total** : Passer à Phase 4 (Output Layer)
- [ ] **Succès partiel** : Continuer observation 100 cycles supplémentaires
- [ ] **Échec** : Ajuster thresholds et re-tester
- [ ] **Implémenter charts** : Générer visualisations pour analyse approfondie

---

## 🔄 Prochaines Étapes

### Si Validation Réussie ✅
1. Documenter les résultats dans TASKS_RL4.md
2. Créer rapport E2_COMPLETE.md
3. Bump version à v2.0.7
4. Commit + push les fixes validés
5. **Passer à Phase 4** : Output Layer (WebView Dashboard)

### Si Validation Partielle ⚠️
1. Identifier les métriques problématiques
2. Ajuster thresholds si nécessaire
3. Observer 100 cycles supplémentaires
4. Décider : accepter état actuel ou itérer

### Si Validation Échouée ❌
1. Analyser les logs d'erreur
2. Identifier la régression
3. Rollback les thresholds si nécessaire
4. Re-test avec thresholds ajustés

---

**Plan créé** : 2025-11-10 14:45  
**Démarrage observation** : Immédiat  
**Prochain checkpoint** : Cycle 5082 (dans ~17 minutes)

---

*Ce document sera mis à jour avec les résultats réels après observation.*

