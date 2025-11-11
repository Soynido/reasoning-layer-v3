# Installation RL4 v2.0.6 — Bug Fixes E2.5

**Version** : v2.0.6  
**Date** : 2025-11-10  
**Package** : `reasoning-layer-rl4-2.0.6.vsix` (2.63 MB)

---

## 🔧 Fixes Inclus

### Bug #1 : ADR Deduplication ✅
- SHA256 hash sur titre uniquement
- Aucun nouveau duplicate généré
- 144 duplicates nettoyés

### Bug #2 : Confidence Thresholds ✅
- Correlation score : 0.65 → 0.70
- Forecast confidence : 0.65 → 0.70
- Fallback minimum : 0.60 → 0.65

### Phase E2.2 : Real Metrics ✅
- FeedbackEvaluator intégré
- Métriques réelles tous les 100 cycles

### Phase E2.3 : Adaptive α ✅
- Calibration variance-based
- α dynamique : 0.05-0.1

---

## 📦 Installation

### Méthode 1 : Via VS Code Command Palette

1. Ouvrir VS Code/Cursor
2. `Cmd+Shift+P` → "Extensions: Install from VSIX..."
3. Sélectionner : `reasoning-layer-rl4-2.0.6.vsix`
4. Recharger la fenêtre (`Cmd+R`)

### Méthode 2 : Via Terminal

```bash
cd "/Users/valentingaludec/Reasoning Layer V3"

# Installation
code --install-extension reasoning-layer-rl4-2.0.6.vsix --force

# Ou avec Cursor
cursor --install-extension reasoning-layer-rl4-2.0.6.vsix --force
```

### Méthode 3 : Installation Manuelle

1. Ouvrir VS Code/Cursor
2. Extensions (⌘+Shift+X)
3. Menu `...` → "Install from VSIX..."
4. Sélectionner le fichier
5. Reload Window

---

## ✅ Vérification Post-Installation

### 1. Check Version
```bash
# Dans VS Code Output Channel "RL4 Kernel"
# Rechercher : "RL4 Kernel v2.0.6"
```

### 2. Vérifier l'Extension Active
```bash
# Terminal
cd "/Users/valentingaludec/Reasoning Layer V3"
tail -1 .reasoning_rl4/ledger/cycles.jsonl | jq .cycleId
# Doit afficher un nombre croissant
```

### 3. Monitoring des Fixes
```bash
# Exécuter le script de monitoring
bash scripts/monitor-validation.sh

# Check forecasts (après quelques cycles)
cat .reasoning_rl4/forecasts.json | jq '.[] | {confidence, decision_type}'

# Check ADRs (ne doit pas augmenter rapidement)
ls -1 .reasoning_rl4/adrs/auto/*.json | wc -l
```

---

## 📊 Observation Production (17 minutes)

### Checkpoint 1 : Cycle 300 (~15 min)
```bash
# Attendre le feedback loop
bash scripts/monitor-validation.sh

# Vérifier dans Output Channel :
# → "🔁 [Phase E2.2] Applying real feedback loop"
# → "📊 [E2.2] Real metrics computed"
```

### Métriques Attendues
```
✅ ADR adoption rate > 10% (minimum)
✅ Composite feedback > 0.45 (amélioration)
✅ Forecast confidence ≥ 0.70 (nouveaux forecasts)
✅ Zéro nouveaux duplicates
✅ α ajusté automatiquement (si variance change)
```

---

## 🚨 Troubleshooting

### Problème : Extension ne démarre pas
```bash
# Vérifier les logs
cat ~/.vscode/extensions/reasoning-layer-rl4-*/extension/out/extension.js.map
# Ou dans Output Channel "RL4 Kernel"
```

### Problème : Cycles ne progressent pas
```bash
# Check timer registry
tail -50 ~/.vscode/extensions/reasoning-layer-rl4-*/logs/*.log
```

### Problème : Forecasts toujours < 0.70
```bash
# Attendre régénération des forecasts (prochain cycle pattern learning)
# Les anciens forecasts (0.60-0.65) seront remplacés
```

### Problème : Duplicates ADR détectés
```bash
# Vérifier hash function
grep "isDuplicate" .reasoning_rl4/adrs/auto/*.json
# Re-run cleanup si nécessaire
node scripts/cleanup-duplicate-adrs.js
```

---

## 📈 Prochaines Étapes

### Si Validation Réussie (Cycle 300)
1. ✅ Documenter résultats → `E2_COMPLETE.md`
2. ✅ Commit + push fixes validés
3. ✅ Décision : Passer à Phase 4 (Output Layer)

### Si Validation Partielle
1. ⚠️ Observer 100 cycles supplémentaires
2. ⚠️ Ajuster thresholds si nécessaire (0.68 au lieu de 0.70)
3. ⚠️ Implémenter charts pour analyse approfondie

### Si Validation Échouée
1. ❌ Rollback thresholds à 0.65
2. ❌ Analyser logs d'erreur
3. ❌ Re-test avec thresholds ajustés

---

## 🔗 Références

- **Plan de validation** : `E2_PRODUCTION_VALIDATION_PLAN.md`
- **Tasks RL4** : `TASKS_RL4.md` (Section Phase E2 Final)
- **Bug fixes report** : `E2.5_BUG_FIXES_REPORT.md`
- **Monitoring script** : `scripts/monitor-validation.sh`

---

**Installation créée** : 2025-11-10  
**Version** : v2.0.6  
**Status** : ✅ Ready for production validation

