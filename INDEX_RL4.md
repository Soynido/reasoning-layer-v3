# RL4 — Documentation Index

**Quick Navigation** : Quel fichier lire pour quoi ?

---

## 🚀 START HERE

**Nouveau sur le projet ?** → Lisez dans cet ordre :
1. **`CONTEXT_RL3_RL4.md`** ← Comprendre la séparation RL3/RL4
2. **`RL4_VISION_AND_ROADMAP.md`** ← Vision et objectifs
3. **`TASKS_RL4.md`** ← Tâches et progression

**Déjà familier ?** → Allez directement à :
- **`TASKS_RL4.md`** → Voir les prochaines tâches
- **`RL4_MIGRATION_PLAN.md`** → Plan technique migration

---

## 📚 Documentation Par Catégorie

### 🎯 Vision & Strategy
| Fichier | Description | Quand le lire ? |
|---------|-------------|-----------------|
| `RL4_VISION_AND_ROADMAP.md` | Vision long terme, objectifs, timeline | Comprendre la direction |
| `CONTEXT_RL3_RL4.md` | Séparation RL3/RL4, navigation contexte | Clarifier quel système utiliser |
| `INDEX_RL4.md` | Ce fichier (index documentation) | Trouver le bon document |

### 🔧 Technical Implementation
| Fichier | Description | Quand le lire ? |
|---------|-------------|-----------------|
| `TASKS_RL4.md` | Tâches RL4, progression, checklist | Savoir ce qui reste à faire |
| `RL4_MIGRATION_PLAN.md` | Plan détaillé migration RL3→RL4 | Migrer un composant |
| `extension/kernel/README.md` | Architecture kernel, components | Comprendre le code kernel |

### 🧪 Testing & Validation
| Fichier | Description | Quand le lire ? |
|---------|-------------|-----------------|
| `scripts/validate-flush-fix.sh` | Test automatique flush buffer | Valider la persistance |
| `scripts/check-watchdog.sh` | Test automatique watchdog | Valider auto-restart |
| `scripts/clean-install-rl4.sh` | Installation propre RL4 | Réinstaller from scratch |

### 📊 Status & Monitoring
| Fichier | Description | Quand le lire ? |
|---------|-------------|-----------------|
| `.reasoning_rl4/ledger/cycles.jsonl` | Cycles exécutés (append-only) | Voir l'activité en temps réel |
| `.reasoning_rl4/diagnostics/health.jsonl` | Health checks | Diagnostiquer problèmes |
| `.reasoning_rl4/state/kernel.json` | État actuel kernel | Inspecter l'état |

---

## 🔀 Files to IGNORE (RL3 Legacy)

**Ne lisez PAS ces fichiers pour RL4** (ils concernent RL3) :

| Fichier | Pourquoi Ignorer ? |
|---------|-------------------|
| `TASKS.md` | Mélange RL3+RL4, confus, utiliser `TASKS_RL4.md` |
| `README.md` | Décrit RL3 v1.0.85, pas RL4 |
| `DOCUMENTATION.md` | Documentation RL3 complète (référence historique) |
| `.reasoning/*` | Data RL3 legacy (système dormant) |

**Exception** : Lisez-les si vous voulez :
- Comprendre l'historique RL3
- Récupérer du code RL3 à migrer
- Voir les features RL3 implémentées

---

## 🎯 Quick Commands

### Check RL4 Activity
```bash
# Voir les derniers cycles
tail -5 .reasoning_rl4/ledger/cycles.jsonl | jq -c '{cycleId, time: .timestamp[11:19]}'

# Compter cycles total
wc -l < .reasoning_rl4/ledger/cycles.jsonl

# Voir le dernier cycle
tail -1 .reasoning_rl4/ledger/cycles.jsonl | jq .
```

### Development Workflow
```bash
# 1. Modifier code
vim extension/kernel/CognitiveScheduler.ts

# 2. Recompiler
npm run compile && npm run package

# 3. Installer
/Applications/Cursor.app/Contents/Resources/app/bin/cursor \
  --install-extension reasoning-layer-rl4-2.0.1.vsix --force

# 4. Reload VS Code
# Cmd+Shift+P → Developer: Reload Window

# 5. Vérifier Output Channel
# Output → RL4 Kernel
```

---

## 📌 Context Rules (Pour Cursor Agent)

### Avant de Modifier un Fichier

1. **Check le path** :
   - `extension/kernel/` ? → RL4 (actif)
   - `extension/core/` ? → RL3 (legacy, migration source)

2. **Check data path** :
   - `.reasoning_rl4/` ? → RL4 (actif)
   - `.reasoning/` ? → RL3 (legacy)

3. **Check documentation** :
   - `TASKS_RL4.md` ? → RL4 tasks
   - `TASKS.md` ? → RL3 reference (ignore for RL4 work)

### Context Switching

**Travailler sur RL4 Kernel** :
```
@CONTEXT_RL3_RL4.md
@TASKS_RL4.md
@extension/kernel/
```

**Migrer RL3 Engine** :
```
@RL4_MIGRATION_PLAN.md
@extension/core/base/PatternLearningEngine.ts
@extension/kernel/cognitive/ (destination)
```

**Debugging** :
```
@extension-output (RL4 Kernel channel)
@.reasoning_rl4/ledger/cycles.jsonl
@.reasoning_rl4/diagnostics/health.jsonl
```

---

## 🎬 Ready to Continue?

**Current Status** : ✅ Kernel Stable + Context Clear  
**Next Action** : Migrate first engine (PatternLearningEngine)

**Command** :
```
"Commence la migration de PatternLearningEngine vers RL4"
```

---

*Updated: 2025-11-03 — Documentation index created for context clarity*

