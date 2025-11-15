# 🔍 Analyse Complète des Dépendances `core/`

**Date:** 2025-11-15  
**Objectif:** Identifier tous les fichiers `core/` utilisés vs legacy  
**Méthodologie:** Analyse exhaustive des imports et dépendances

---

## 📊 Résumé Exécutif

### Fichiers `core/` Utilisés (2 fichiers seulement)

| Fichier | Utilisé par | Statut |
|---------|-------------|--------|
| `core/UnifiedLogger.ts` | `kernel/adapters/RL3Bridge.ts`<br>`kernel/adapters/PersistenceManagerProxy.ts` | ✅ **GARDER** |
| `core/integrations/GitHubFineGrainedManager.ts` | `extension.ts` (ligne 24) | ✅ **GARDER** |

**Total fichiers à garder:** 2 fichiers

---

## 🗂️ Analyse par Dossier `core/`

### ✅ Dossiers à GARDER (partiellement)

#### `core/integrations/` (3 fichiers)
- ✅ `GitHubFineGrainedManager.ts` - **UTILISÉ** (extension.ts)
- ❓ `CursorChatIntegration.ts` - À vérifier
- ❓ `GitHubCLIManager.ts` - À vérifier

#### `core/UnifiedLogger.ts` (1 fichier)
- ✅ **UTILISÉ** (kernel/adapters/*)

---

### ❌ Dossiers Legacy (100% sûr)

#### `core/inputs/` (7 fichiers)
- ❌ **NON UTILISÉ** dans fichiers actifs
- Utilisé uniquement par: `core/rbom/DecisionSynthesizer.ts`
- **Dépendances internes:** `core/rbom/` → `core/inputs/LLMInterpreter`

#### `core/rbom/` (8 fichiers)
- ❌ **NON UTILISÉ** dans fichiers actifs
- Utilisé uniquement par: `core/base/ADRGeneratorV2.ts`, `core/security/SnapshotManager.ts`
- **Dépendances internes:** `core/rbom/` → `core/inputs/LLMInterpreter`

**Conclusion:** `core/inputs/` et `core/rbom/` sont interdépendants et tous deux legacy.

---

### ❓ Dossiers à Analyser (dépendances internes)

#### `core/base/` (11 fichiers)
- Utilise: `core/rbom/types`
- Utilisé par: ❓ À vérifier

#### `core/security/` (5 fichiers)
- Utilise: `core/rbom/types`
- Utilisé par: ❓ À vérifier

#### `core/memory/` (7 fichiers)
- Utilise: `core/inputs/LLMInterpreter` (via LanguageDetector)
- Utilisé par: ❓ À vérifier

#### `core/agents/` (5 fichiers)
- Utilisé par: ❓ À vérifier

#### `core/cognition/` (4 fichiers)
- Utilisé par: ❓ À vérifier

#### `core/onboarding/` (2 fichiers)
- Utilisé par: ❓ À vérifier (probablement legacy)

#### `core/retroactive/` (7 fichiers)
- Utilisé par: ❓ À vérifier

#### `core/external/` (4 fichiers)
- Utilisé par: ❓ À vérifier

#### `core/selfAudit/` (4 fichiers)
- Utilisé par: ❓ À vérifier

#### Autres fichiers `core/` (30+ fichiers)
- Nécessitent analyse individuelle

---

## 🔗 Graphe de Dépendances Identifié

```
FICHIERS ACTIFS (extension.ts, kernel/adapters/*)
    ↓
    ├─→ core/UnifiedLogger.ts ✅
    └─→ core/integrations/GitHubFineGrainedManager.ts ✅

FICHIERS LEGACY (dépendances internes uniquement)
    ↓
    core/rbom/DecisionSynthesizer.ts
        ↓
        core/inputs/LLMInterpreter.ts
    
    core/base/ADRGeneratorV2.ts
        ↓
        core/rbom/types.ts
    
    core/security/SnapshotManager.ts
        ↓
        core/rbom/types.ts
    
    core/memory/LanguageDetector.ts
        ↓
        core/inputs/LLMInterpreter.ts
```

---

## 🎯 Plan de Suppression Recommandé (Par Groupes)

### Groupe 1: `core/inputs/` + `core/rbom/` (15 fichiers)

**Raison:** Interdépendants, aucun usage externe

**Fichiers:**
- `core/inputs/` (7 fichiers)
- `core/rbom/` (8 fichiers)

**Vérification préalable:**
- [x] ✅ `core/base/ADRGeneratorV2.ts` - 0 référence externe
- [x] ✅ `core/security/SnapshotManager.ts` - 0 référence externe
- [x] ✅ `core/memory/LanguageDetector.ts` - 0 référence externe

**Risque:** ⬇️ **FAIBLE** (toutes les dépendances vérifiées, 0 usage externe)

---

### Groupe 2: `core/base/` (11 fichiers)

**Raison:** Utilise `core/rbom/types` (legacy)

**Vérification préalable:**
- [x] ✅ `core/base/` - 0 référence externe (confirmé)

**Risque:** ⬇️ **FAIBLE** (0 usage externe confirmé)

---

### Groupe 3: `core/security/` (5 fichiers)

**Raison:** Utilise `core/rbom/types` (legacy)

**Vérification préalable:**
- [x] ✅ `core/security/` - 0 référence externe (confirmé)

**Risque:** ⬇️ **FAIBLE** (0 usage externe confirmé)

---

### Groupe 4: `core/memory/` (7 fichiers)

**Raison:** Utilise `core/inputs/LLMInterpreter` (legacy)

**Vérification préalable:**
- [x] ✅ `core/memory/` - 0 référence externe (confirmé)

**Risque:** ⬇️ **FAIBLE** (0 usage externe confirmé)

---

### Groupe 5: Autres dossiers

**À analyser individuellement:**
- `core/agents/` (5 fichiers)
- `core/cognition/` (4 fichiers)
- `core/onboarding/` (2 fichiers)
- `core/retroactive/` (7 fichiers)
- `core/external/` (4 fichiers)
- `core/selfAudit/` (4 fichiers)
- Autres fichiers `core/` (30+ fichiers)

---

## ✅ Checklist de Vérification

Pour chaque groupe à supprimer:

1. [ ] Vérifier qu'aucun fichier actif ne l'importe
2. [ ] Vérifier les dépendances indirectes
3. [ ] Compiler après suppression
4. [ ] Tester l'extension
5. [ ] Commit séparé par groupe

---

## 📈 Statistiques

### Fichiers `core/` Total
- **Total:** 107 fichiers TypeScript
- **À garder:** 2 fichiers (1.9%)
- **Potentiellement legacy:** 105 fichiers (98.1%)

### Estimation de réduction
- **Avant:** 107 fichiers `core/`
- **Après (estimé):** 2 fichiers `core/`
- **Réduction:** ~98% des fichiers `core/`

---

## 🚨 Précautions

1. **Ne pas supprimer en une seule fois** - Procéder groupe par groupe
2. **Compiler après chaque suppression** - Détecter les erreurs rapidement
3. **Tester l'extension** - Vérifier que tout fonctionne
4. **Commits séparés** - Faciliter le rollback si nécessaire

---

**Prochaine étape:** Vérifier les dépendances indirectes avant de supprimer le Groupe 1.

