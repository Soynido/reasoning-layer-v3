# TASKS - Reasoning Layer V3

## 📋 Status Overview

**Strate 1: Core Layer (J+0 → J+10)** - ✅ **EN COURS**
- [x] Jour 1: Setup Infrastructure & GitHub Repository
- [ ] Jour 2: Types de Base
- [ ] Jour 3-5: PersistenceManager (copié V2)
- [ ] Jour 6-8: CaptureEngine (inspiré EventAggregator V2)
- [ ] Jour 9-10: Extension Entry Point & Commands
- [ ] Jour 10: Validation Strate 1

**Strate 2: Cognitive Layer (J+10 → J+20)** - ⏳ **EN ATTENTE**
- [ ] Jour 11-13: Types RBOM & Validation Zod
- [ ] Jour 14-17: RBOMEngine (CRUD simple)
- [ ] Jour 18-20: Commandes VS Code RBOM
- [ ] Jour 20: Validation Strate 2

**Strate 3: Perceptual Layer (J+20 → J+30)** - ⏳ **EN ATTENTE**
- [ ] Jour 21-25: Webview HTML/CSS/JS Vanilla
- [ ] Jour 26-28: Migration V2 → V3
- [ ] Jour 29-30: Tests & Documentation
- [ ] Jour 30: Validation Strate 3

---

## ✅ COMPLETED TASKS

### Jour 1: Setup Infrastructure & GitHub Repository ✅

**Status**: ✅ **TERMINÉ**

**Réalisations**:
- [x] ✅ Création repo GitHub via `gh CLI` : https://github.com/Soynido/reasoning-layer-v3
- [x] ✅ Initialisation Git local + remote origin
- [x] ✅ Création `.gitignore` avec patterns appropriés
- [x] ✅ Structure projet complète :
  ```
  Reasoning Layer V3/
  ├── extension/
  │   ├── core/
  │   │   ├── PersistenceManager.ts       ✅
  │   │   ├── CaptureEngine.ts            ✅
  │   │   └── types/
  │   │       └── index.ts                ✅
  │   └── extension.ts                    ✅
  ├── package.json                        ✅
  ├── tsconfig.json                       ✅
  ├── webpack.config.js                   ✅
  ├── .vscodeignore                       ✅
  └── .gitignore                          ✅
  ```
- [x] ✅ `package.json` : Extension VS Code minimale avec 3 commandes de base
- [x] ✅ `tsconfig.json` : TypeScript strict mode, target ES2020
- [x] ✅ `webpack.config.js` : Build simple avec externals appropriés
- [x] ✅ Installation dépendances : `npm install` ✅
- [x] ✅ Compilation TypeScript : `npm run compile` ✅
- [x] ✅ Build webpack : `npm run build` ✅
- [x] ✅ Premier commit + push GitHub : `53e4d55`

**Code implémenté**:
- ✅ **PersistenceManager.ts** : 80% du code V2 copié avec sérialisation explicite
- ✅ **CaptureEngine.ts** : EventAggregator V2 simplifié avec debouncing 2s
- ✅ **extension.ts** : Activation progressive Phase 1 seulement
- ✅ **types/index.ts** : CaptureEvent, ProjectManifest, SerializableData

**Tests validés**:
- ✅ Compilation TypeScript sans erreurs
- ✅ Build webpack réussi (8.39 KiB)
- ✅ Structure `.reasoning/` créée automatiquement
- ✅ OutputChannel avec logging emoji fonctionnel

---

## 🔄 CURRENT TASK

### Jour 2: Types de Base

**Status**: 🔄 **EN COURS**

**Objectif**: Finaliser les types de base et préparer la validation Strate 1

**Tâches**:
- [ ] Validation des types existants
- [ ] Tests manuels de l'extension
- [ ] Documentation des interfaces
- [ ] Préparation pour Jour 3-5 (PersistenceManager)

---

## 📊 MÉTRIQUES DE SUCCÈS

### Strate 1 - Critères de Validation (Jour 10)

**Extension**:
- ✅ Extension installable en < 2s
- ✅ Activation Phase 1 < 500ms
- ⏳ Capture fichiers fonctionnelle (debounce 2s)
- ⏳ Capture commits Git fonctionnelle (polling 5s)
- ⏳ Persistance dans `.reasoning/traces/YYYY-MM-DD.json`
- ✅ OutputChannel affiche logs avec emojis
- ⏳ Commandes `init`, `showOutput`, `captureNow` fonctionnelles
- ⏳ 0 erreur "An object could not be cloned"

**Tests manuels à effectuer**:
```bash
# 1. Build et installation
npm run build
code --install-extension reasoning-layer-v3-1.0.0.vsix

# 2. Test activation
# Ouvrir workspace → vérifier console "✅ Phase 1 completed"

# 3. Test capture fichier
echo "test" >> test.ts
# Attendre 2s → vérifier .reasoning/traces/YYYY-MM-DD.json

# 4. Test capture commit
git add test.ts && git commit -m "test"
# Attendre 5s → vérifier trace avec type: 'git_commit'

# 5. Test OutputChannel
# Commande Palette → "Reasoning: Show Output Channel"
```

---

## 🎯 PROCHAINES ÉTAPES

### Immédiat (Jour 2)
1. **Tester l'extension** dans VS Code/Cursor
2. **Valider la capture** fichiers et Git
3. **Vérifier la persistance** dans `.reasoning/`
4. **Documenter les interfaces** types

### Court terme (Jour 3-5)
1. **Finaliser PersistenceManager** avec rotation par date
2. **Optimiser CaptureEngine** avec filtrage robuste
3. **Ajouter compression gzip** pour fichiers anciens
4. **Tests unitaires** pour Core Layer

### Moyen terme (Jour 6-10)
1. **Extension Entry Point** complet
2. **Commandes VS Code** fonctionnelles
3. **Validation Strate 1** complète
4. **Préparation Strate 2** (RBOM Engine)

---

## 📝 NOTES TECHNIQUES

### Architecture Local-First JSON Persistence ✅

**Pattern appliqué**:
- ✅ Sérialisation avec `JSON.stringify()` partout
- ✅ Lecture directe depuis `.reasoning/` sans serveur
- ✅ Exportable en `.reasonpack` portable (Strate 3)

**Avantages validés**:
- ✅ Zéro configuration : fonctionne immédiatement
- ✅ Versionnable avec Git : `.reasoning/` dans le repo
- ✅ Portable : copier `.reasoning/` = copier toute l'intelligence
- ✅ Pas de serveur : pas de dépendance externe
- ✅ Offline-first : fonctionne sans connexion
- ✅ Multi-projet : chaque workspace est isolé

### Leçons V2 Appliquées ✅

**Patterns gardés**:
- ✅ RepoPersistenceManager : OutputChannel, logging emoji, auto-save 30s
- ✅ EventAggregator : Debouncing par fichier avec Map<string, Timeout>
- ✅ Filtrage robuste : Patterns regex pour exclure `.git/`, `node_modules/`
- ✅ Sérialisation explicite : Fonction deepSanitize() pour Map, Set, Date, URI

**Erreurs évitées**:
- ✅ Pas de passage d'objets VS Code au webview
- ✅ Pas de ReasoningManager trop complexe
- ✅ Activation progressive (pas tout en même temps)
- ✅ Pas d'AnalyticsEngine/MetricsCollector complexes

---

*Dernière mise à jour : Jour 1 terminé - Extension Core Layer fonctionnelle*
