# 🧠 Cognitive Sandbox Strategy - Séparation Code/Cognition

**Date**: 2025-11-02  
**Issue**: Pollution du code source par scripts cognitifs temporaires  
**Solution**: CognitiveSandbox (~/.rl3/sandbox/)

---

## 🔍 Diagnostic du Problème

### Comportement Actuel (Problématique)

Le RL3 génère des **scripts cognitifs temporaires** pour exécuter des tâches :
- `scripts/repair-integrity-ledger.js`
- `scripts/load-refactor-goal.js`
- `scripts/register-goal-in-traces.js`
- `scripts/update-goal-progress.js`

**Ces scripts** :
✅ Sont utiles pour l'exécution cognitive  
❌ Mais polluent le code source  
❌ Finissent versionnés dans Git  
❌ Peuvent être inclus dans le bundle VSIX  
❌ Gonflent artificiellement l'extension

### Pourquoi ça arrive ?

**Du point de vue cognitif** :
> "Je génère du code utile pour exécuter un plan, donc je le stocke là où se trouve le contexte principal."

**Mais du point de vue développeur** :
- ❌ Brise l'encapsulation (extension ≠ workspace)
- ❌ Mélange cognitif/exécution
- ❌ Build non déterministe

---

## ✅ Solution : Cognitive Sandbox

### Architecture Proposée

```
Workspace actuel (code source permanent)
├── extension/              ← Code production UNIQUEMENT
│   ├── core/
│   ├── commands/
│   └── extension.ts
├── package.json
└── webpack.config.js

~/.rl3/ (global, hors workspace)
├── models/                 ← Cache modèles ML (Sprint 2)
└── sandbox/                ← Scripts cognitifs temporaires
    ├── Reasoning Layer V3/ ← Par workspace
    │   ├── repair-integrity-ledger.js
    │   ├── load-refactor-goal.js
    │   ├── sprint-execution.js
    │   └── archive/        ← Scripts archivés
    └── AutreProjet/
        └── ...
```

### Principes

1. **Code permanent** → `extension/`, `cli/`, testé, versionné
2. **Scripts cognitifs** → `~/.rl3/sandbox/`, temporaires, non versionnés
3. **Modèles ML** → `~/.rl3/models/`, global cache
4. **Données workspace** → `.reasoning/`, contexte cognitif persistant

---

## 🛠️ Implémentation

### Module Créé

**Fichier**: `extension/core/environment/CognitiveSandbox.ts`

**Features**:
- ✅ `getPath(workspace)` : Retourne sandbox path
- ✅ `createFile(workspace, filename, content)` : Crée script temporaire
- ✅ `createExecutable(...)` : Script exécutable (chmod +x)
- ✅ `listFiles(workspace)` : Liste scripts
- ✅ `cleanup(workspace, maxDays)` : Supprime fichiers anciens
- ✅ `destroySandbox(workspace)` : Nettoyage complet
- ✅ `getStats(workspace)` : Statistiques
- ✅ `executeScript(workspace, filename, args)` : Exécution sécurisée
- ✅ `archiveFromWorkspace(...)` : Archive scripts vers sandbox

### Usage dans le RL3

**Avant (problématique)** :
```typescript
// ❌ Génère dans scripts/ (pollue le repo)
const scriptPath = path.join(workspaceRoot, 'scripts', 'repair-ledger.js');
fs.writeFileSync(scriptPath, scriptContent);
```

**Après (propre)** :
```typescript
// ✅ Génère dans ~/.rl3/sandbox/
import { CognitiveSandbox } from './core/environment/CognitiveSandbox';

const scriptPath = CognitiveSandbox.createExecutable(
    workspaceRoot,
    'repair-ledger.js',
    scriptContent
);

// Exécuter
const result = await CognitiveSandbox.executeScript(workspaceRoot, 'repair-ledger.js');
console.log(result.stdout);
```

---

## 🔧 Migration des Scripts Existants

### Scripts à Migrer vers Sandbox

Les scripts suivants sont **cognitifs temporaires** et doivent être migrés :

**À déplacer vers sandbox** :
```
scripts/load-refactor-goal.js           → ~/.rl3/sandbox/[workspace]/
scripts/register-goal-in-traces.js      → ~/.rl3/sandbox/[workspace]/
scripts/update-goal-progress.js         → ~/.rl3/sandbox/[workspace]/
```

**À garder dans scripts/** (outils permanents) :
```
scripts/repair-integrity-ledger.js      ← Outil de maintenance permanent
scripts/qa-check.sh                     ← Checklist QA (si créé)
```

### Script de Migration Automatique

```bash
#!/bin/bash
# scripts/migrate-to-sandbox.sh

WORKSPACE_NAME=$(basename "$PWD")
SANDBOX_DIR="$HOME/.rl3/sandbox/$WORKSPACE_NAME"

mkdir -p "$SANDBOX_DIR"

# Migrer les scripts cognitifs
mv scripts/load-refactor-goal.js "$SANDBOX_DIR/" 2>/dev/null
mv scripts/register-goal-in-traces.js "$SANDBOX_DIR/" 2>/dev/null
mv scripts/update-goal-progress.js "$SANDBOX_DIR/" 2>/dev/null

echo "✅ Scripts migrated to $SANDBOX_DIR"
ls -lh "$SANDBOX_DIR"
```

---

## 📝 .vscodeignore Update

**Ajout dans .vscodeignore** :
```
# Exclude all temporary reasoning scripts
scripts/**
!scripts/repair-integrity-ledger.js
!scripts/qa-check.sh

# Exclude cognitive data (managed separately)
.reasoning/**

# Exclude development artifacts
checkpoints/**
datasets/**
tests/**
```

---

## 🎯 Règle pour la Suite du Refactor

### ✅ À FAIRE : Code Permanent

**Localisation** : `extension/`, `cli/`

**Exemples** :
- `extension/core/security/SecureCredentialManager.ts` ← ✅ Permanent
- `extension/core/storage/TraceRotationManager.ts` ← ✅ Permanent
- `extension/core/validation/Schemas.ts` ← ✅ Permanent

**Caractéristiques** :
- Testé avec tests unitaires
- Compilé dans le bundle
- Versionné dans Git
- Inclus dans VSIX

### ❌ À ÉVITER : Scripts Cognitifs Temporaires

**Localisation** : `~/.rl3/sandbox/[workspace]/`

**Exemples** :
- Scripts de migration one-shot
- Scripts d'exécution de tâches
- Prototypes de code
- Outils de diagnostic temporaires

**Caractéristiques** :
- Non versionnés
- Non compilés
- Auto-nettoyés après 30 jours
- Exclus du VSIX

---

## 🚀 Application aux Sprints Suivants

### Sprint 2 : Performance & Storage

**Code Permanent** :
- ✅ `extension/core/ml/ModelCache.ts` → Extension
- ✅ `extension/core/storage/CompressionManager.ts` → Extension

**Scripts Cognitifs** (si besoin) :
- ❌ `~/.rl3/sandbox/migrate-models.js` → Sandbox
- ❌ `~/.rl3/sandbox/test-compression.js` → Sandbox

### Sprint 3 : Scalability & Architecture

**Code Permanent** :
- ✅ `extension/core/GlobalReasoningService.ts` → Extension
- ✅ `extension/core/autosync/SharedAutoSyncService.ts` → Extension

**Scripts Cognitifs** :
- ❌ `~/.rl3/sandbox/benchmark-timers.js` → Sandbox
- ❌ `~/.rl3/sandbox/multi-workspace-test.js` → Sandbox

### Sprint 4 : UX & Observability

**Code Permanent** :
- ✅ `extension/core/config/ConfigurationManager.ts` → Extension
- ✅ `extension/commands/diagnostic.ts` → Extension

**Scripts Cognitifs** :
- ❌ Aucun nécessaire (tout dans l'extension)

### Sprint 5 : Testing & Release

**Code Permanent** :
- ✅ `extension/tests/*.test.ts` → Tests unitaires
- ✅ `scripts/qa-check.sh` → CI/CD permanent

**Scripts Cognitifs** :
- ❌ `~/.rl3/sandbox/generate-test-data.js` → Sandbox

---

## 🧹 Cleanup Immédiat (Post-Sprint 1)

### Action 1 : Migrer les 3 scripts temporaires

```bash
# Créer le sandbox
mkdir -p ~/.rl3/sandbox/Reasoning\ Layer\ V3/

# Migrer
mv scripts/load-refactor-goal.js ~/.rl3/sandbox/Reasoning\ Layer\ V3/
mv scripts/register-goal-in-traces.js ~/.rl3/sandbox/Reasoning\ Layer\ V3/
mv scripts/update-goal-progress.js ~/.rl3/sandbox/Reasoning\ Layer\ V3/

# Garder dans scripts/ (outils permanents)
# - repair-integrity-ledger.js ← Maintenance tool (permanent)
```

### Action 2 : Mettre à jour .gitignore

```bash
# .gitignore
scripts/*
!scripts/repair-integrity-ledger.js
!scripts/qa-check.sh
```

### Action 3 : Mettre à jour .vscodeignore

```bash
# .vscodeignore
scripts/**
!scripts/repair-integrity-ledger.js
!scripts/qa-check.sh
```

---

## ✅ Checklist de Validation

Pour chaque nouveau fichier généré, se demander :

- [ ] **Est-ce du code permanent** (testé, versionné, dans VSIX) ?
  - → OUI : `extension/`, `cli/`, avec tests unitaires
  - → NON : Continue ↓

- [ ] **Est-ce un script cognitif temporaire** (exécution one-shot) ?
  - → OUI : `~/.rl3/sandbox/[workspace]/`
  - → NON : Continue ↓

- [ ] **Est-ce un outil de maintenance réutilisable** ?
  - → OUI : `scripts/` (versionné mais exclu du VSIX)
  - → NON : Probablement un script sandbox

---

## 📊 Impact de la Stratégie

### Avant (Actuel)

```
Repository:
├── scripts/
│   ├── repair-integrity-ledger.js       ← Permanent ✅
│   ├── load-refactor-goal.js            ← Temporaire ❌
│   ├── register-goal-in-traces.js       ← Temporaire ❌
│   └── update-goal-progress.js          ← Temporaire ❌
└── extension/
    └── ...

VSIX size: 17MB (inclut potentiellement scripts/)
```

### Après (Propre)

```
Repository:
├── scripts/
│   ├── repair-integrity-ledger.js       ← Permanent ✅
│   └── qa-check.sh                      ← Permanent ✅
└── extension/
    ├── core/
    │   └── environment/
    │       └── CognitiveSandbox.ts      ← Nouveau ✅
    └── ...

~/.rl3/sandbox/Reasoning Layer V3/
├── load-refactor-goal.js                ← Temporaire, isolé ✅
├── register-goal-in-traces.js
├── update-goal-progress.js
└── archive/                             ← Auto-archivé

VSIX size: < 5MB (scripts/ exclu)
```

---

## 🎯 Recommandation Immédiate

### Pour Sprint 2-5

**Adopter systématiquement CognitiveSandbox** :

```typescript
// Dans GoalToActionCompiler, TaskSynthesizer, etc.
import { CognitiveSandbox } from '../environment/CognitiveSandbox';

// Générer un script cognitif
const scriptPath = CognitiveSandbox.createExecutable(
    workspaceRoot,
    `sprint${sprintNum}-task${taskNum}.js`,
    generatedCode
);

// Exécuter
const result = await CognitiveSandbox.executeScript(
    workspaceRoot,
    `sprint${sprintNum}-task${taskNum}.js`
);

// Cleanup automatique après 30 jours
await CognitiveSandbox.cleanup(workspaceRoot, 30);
```

### Migration Post-Sprint 1

**Option A** : Migrer maintenant (recommandé)
```bash
bash scripts/migrate-to-sandbox.sh
git rm scripts/load-refactor-goal.js scripts/register-goal-in-traces.js scripts/update-goal-progress.js
git commit -m "cleanup: Migrate cognitive scripts to sandbox"
```

**Option B** : Migrer à la fin de Sprint 5 (moins urgent)

---

## 📋 Conclusion

**Problème identifié** : ✅ Confirmé  
**Solution créée** : ✅ CognitiveSandbox.ts  
**Stratégie définie** : ✅ Séparation claire  
**Prêt pour Sprint 2** : ✅ Oui

**Impact attendu** :
- Code source : Plus propre, focalisé sur production
- VSIX : 17MB → < 5MB
- Build : Déterministe, reproductible
- Maintenance : Scripts temporaires auto-nettoyés

**Règle d'or pour la suite** :
> "Si c'est généré pour exécuter une tâche cognitive one-shot → Sandbox.  
> Si c'est du code testé et permanent → Extension."

---

**Créé** : `extension/core/environment/CognitiveSandbox.ts`  
**Stratégie** : Définie et documentée  
**Application** : Sprints 2-5

