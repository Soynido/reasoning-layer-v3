# RL4 Migration Plan — RL3 → RL4 Kernel

**Date** : 2025-11-03  
**Status** : Kernel Stable ✅ — Ready for Migration  
**Goal** : Integrate RL3 cognitive engines into RL4 kernel

---

## 🎯 Objectif

**Transformer les placeholders RL4** en **engines RL3 fonctionnels**, adaptés au nouveau kernel.

**Contraintes** :
- ✅ **Zero breaking changes** au kernel
- ✅ **Backward compatible** avec RL3 data
- ✅ **Progressive migration** (un engine à la fois)
- ✅ **Tests à chaque étape**

---

## 📦 Composants à Migrer

### Existant (RL3)
```
extension/core/base/
├── PatternLearningEngine.ts      [1,200 lignes] ✅ Exists
├── CorrelationEngine.ts           [900 lignes]  ✅ Exists
├── ForecastEngine.ts              [800 lignes]  ✅ Exists
└── ADRGeneratorV2.ts              [1,100 lignes] ✅ Exists

extension/core/inputs/
├── GitCommitListener.ts           [450 lignes]  ✅ Exists
├── FileChangeWatcher.ts           [450 lignes]  ✅ Exists
├── GitHubDiscussionListener.ts    [400 lignes]  ✅ Exists
└── ShellMessageCapture.ts         [400 lignes]  ✅ Exists
```

### Cible (RL4)
```
extension/kernel/cognitive/
├── PatternLearningEngine.ts      [Adapted from RL3]
├── CorrelationEngine.ts           [Adapted from RL3]
├── ForecastEngine.ts              [Adapted from RL3]
└── ADRSynthesizer.ts              [Adapted from RL3]

extension/kernel/inputs/
├── GitCommitListener.ts           [Adapted from RL3]
├── FileChangeWatcher.ts           [Adapted from RL3]
├── GitHubListener.ts              [Adapted from RL3]
└── ShellCapture.ts                [Adapted from RL3]
```

---

## 🛠️ Migration Strategy

### Step 1: Créer Adaptateurs (Bridges)
**Objectif** : Isoler les différences RL3/RL4

```typescript
// extension/kernel/adapters/RL3Bridge.ts
export class RL3Bridge {
    // Convertit RL3 PersistenceManager → RL4 AppendOnlyWriter
    static async savePattern(pattern: Pattern) {
        const writer = new AppendOnlyWriter('.reasoning_rl4/patterns.jsonl');
        await writer.append(pattern);
    }
    
    // Convertit RL3 Logger → RL4 UnifiedLogger
    static log(message: string) {
        UnifiedLogger.getInstance().log(message);
    }
    
    // Convertit RL3 paths → RL4 paths
    static resolvePath(rl3Path: string): string {
        return rl3Path.replace('.reasoning/', '.reasoning_rl4/');
    }
}
```

**Bénéfice** : Migration incrémentale sans tout casser.

---

### Step 2: Migrer PatternLearningEngine (Jour 1-2)

#### 2.1 Copier RL3 → RL4
```bash
cp extension/core/base/PatternLearningEngine.ts \
   extension/kernel/cognitive/PatternLearningEngine.ts
```

#### 2.2 Adapter les Imports
**Avant (RL3)** :
```typescript
import { PersistenceManager } from '../PersistenceManager';
import { UnifiedLogger } from '../UnifiedLogger';
```

**Après (RL4)** :
```typescript
import { AppendOnlyWriter } from '../AppendOnlyWriter';
import { UnifiedLogger } from '../../core/UnifiedLogger';
```

#### 2.3 Adapter la Persistance
**Avant (RL3)** :
```typescript
fs.writeFileSync('.reasoning/patterns.json', JSON.stringify(patterns));
```

**Après (RL4)** :
```typescript
const writer = new AppendOnlyWriter('.reasoning_rl4/patterns.jsonl');
await writer.append({ type: 'pattern', data: pattern });
await writer.flush(true); // Force flush for critical data
```

#### 2.4 Intégrer au CognitiveScheduler
**Fichier** : `extension/kernel/CognitiveScheduler.ts`

**Avant (ligne 193-197)** :
```typescript
result.phases.push(await this.runPhase('pattern-learning', async () => {
    // Placeholder: call PatternLearningEngine
    console.log('🔍 Pattern Learning phase');
    return { patternsDetected: 0 };
}));
```

**Après** :
```typescript
result.phases.push(await this.runPhase('pattern-learning', async () => {
    const engine = new PatternLearningEngine(this.workspaceRoot);
    const patterns = await engine.detectPatterns();
    return { patternsDetected: patterns.length };
}));
```

#### 2.5 Tester
```bash
# 1. Recompiler
npm run compile && npm run package

# 2. Réinstaller
/Applications/Cursor.app/Contents/Resources/app/bin/cursor \
  --install-extension reasoning-layer-rl4-2.0.2.vsix --force

# 3. Reload VS Code

# 4. Vérifier cycles.jsonl
tail -5 .reasoning_rl4/ledger/cycles.jsonl | jq '.phases.patterns.count'
# Devrait montrer > 0 si patterns détectés
```

---

### Step 3: Migrer CorrelationEngine (Jour 3-4)

**Process identique** :
1. Copier RL3 → RL4
2. Adapter imports/paths
3. Intégrer au scheduler (ligne 200-203)
4. Tester

**Différence clé** : CorrelationEngine **lit** patterns.jsonl (généré par Phase 1).

---

### Step 4: Migrer ForecastEngine (Jour 5-6)

**Dépendances** :
- Lit `patterns.jsonl`
- Lit `correlations.jsonl`
- Génère `forecasts.jsonl`

---

### Step 5: Migrer ADRGeneratorV2 (Jour 7)

**Renommer** : `ADRGeneratorV2.ts` → `ADRSynthesizer.ts`

**Inputs** :
- `forecasts.jsonl`
- Evidence (Git commits, GitHub issues)
- Historical ADRs

**Output** :
- `ADRs/auto/*.md`

---

## 📊 Timeline Réaliste

| Semaine | Objectif | Livrables |
|---------|----------|-----------|
| **Week 1** (Nov 4-10) | Migration Engines | 4 engines adaptés + testés |
| **Week 2** (Nov 11-17) | Integration | Pipeline complet fonctionnel |
| **Week 3** (Nov 18-24) | Input Layer | GitCommitListener + FileWatcher |
| **Week 4** (Nov 25-Dec 1) | Output Layer | WebView Dashboard |
| **Week 5** (Dec 2-8) | Meta Layer | SelfReviewEngine |
| **Week 6** (Dec 9-15) | Polish | Documentation + Release |

---

## 🚀 Démarrage Immédiat

### Option 1 : Migration Manuelle (Control Total)
**Vous** faites la migration étape par étape en suivant ce plan.

**Avantage** : Contrôle total, apprentissage profond.

### Option 2 : Migration Assistée (Plus Rapide)
**Je** peux migrer les engines un par un, en validant avec vous à chaque étape.

**Avantage** : Plus rapide, je gère les détails techniques.

### Option 3 : Hybrid (Recommandé)
**Vous** : Architecture decisions, review final  
**Moi** : Coding, testing, integration

---

## 🎬 Prête(e) à Démarrer ?

**Commande suggérée** : 
```
"Commence la migration de PatternLearningEngine RL3 → RL4"
```

Ou préférez-vous :
1. D'abord **analyser les dépendances** de chaque engine ?
2. **Créer les tests** avant de migrer ?
3. **Autre priorité** ?

**Quelle est votre préférence ?** 🚀
