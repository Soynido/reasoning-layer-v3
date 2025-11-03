# 🔧 Configuration Corrigée — Instructions de Retest

**Problème identifié :** ❌ `kernel_config.json` avait une structure imbriquée incorrecte  
**Correction appliquée :** ✅ Structure aplatie pour correspondre à `KernelConfig` interface  
**Status :** Prêt pour retest

---

## 📋 Ce qui a été corrigé

### Avant (❌ Structure imbriquée)
```json
{
  "features": {
    "USE_TIMER_REGISTRY": true,
    "cognitive_cycle_interval_ms": 10000
  },
  "intervals": {
    "cognitive_cycle_interval_ms": 10000
  }
}
```

### Après (✅ Structure aplatie)
```json
{
  "USE_TIMER_REGISTRY": true,
  "cognitive_cycle_interval_ms": 10000
}
```

**Impact :** Le `CognitiveScheduler` démarrera maintenant correctement à l'activation.

---

## 🚀 Étapes de Retest (3 minutes)

### 1️⃣ Recharger Cursor/VS Code
```
Cmd+Shift+P > Developer: Reload Window
```

**Attendu après 10s :**
- Output Channel "Reasoning Layer" affiche :
  ```
  🧠 RL4 Kernel initialized
  ✅ CognitiveScheduler started (10000ms cycles)
  ```

---

### 2️⃣ Relancer le Test 10-Cycles
```bash
cd "/Users/valentingaludec/Reasoning Layer V3"
./scripts/test-10-cycles.sh
```

**Durée :** 2 minutes (10 cycles × 10s)

**Attendu :**
```
✅ SUCCESS: 10+ cycles completed!
📊 Final cycles count: 10
✨ New cycles generated: 10
🔍 Chain integrity: OK (genesis cycle + 9 linked cycles)
```

---

### 3️⃣ Vérification Manuelle (si succès)
```bash
# Vérifier cycles.jsonl
cat .reasoning_rl4/ledger/cycles.jsonl | wc -l
# Attendu: 10

# Vérifier le chaînage
cat .reasoning_rl4/ledger/cycles.jsonl | jq -r '.prevMerkleRoot' | uniq -c
# Attendu:
#   1 0000000000000000  (genesis)
#   9 <hashes>          (linked)

# Preview des cycles
cat .reasoning_rl4/ledger/cycles.jsonl | jq -c '{cycleId, timestamp, merkleRoot: .merkleRoot[:16]}'
```

---

### 4️⃣ Tag v2.0.1 (après validation)
```bash
git tag -a v2.0.1 -m "RL4: CycleAggregator + auto-flush validated (10 cycles)

✅ CycleAggregator operational
✅ Inter-cycle chaining verified
✅ Auto-flush on deactivate tested
✅ Config structure fixed

Next: I4-A2 (100-cycle production validation)"

git push origin feat/rl4-i4-ledger
git push origin v2.0.1
```

---

## 🐛 Si le Test Échoue à Nouveau

### A. Vérifier l'activation
```bash
# Ouvrir Output Channel: Reasoning Layer
# Chercher : "RL4 Kernel initialized"
```

**Si absent :**
- Extension pas activée → Réinstaller : `cursor --install-extension reasoning-layer-v3-1.0.87.vsix --force`

---

### B. Vérifier la config
```bash
cat .reasoning/kernel_config.json | jq '.'
```

**Attendu :**
```json
{
  "USE_TIMER_REGISTRY": true,
  "cognitive_cycle_interval_ms": 10000
}
```

**Si structure imbriquée :** Config auto-régénérée avec mauvaise structure → Bug dans `loadKernelConfig`

---

### C. Vérifier RBOMLedger
```bash
ls -lh .reasoning_rl4/ledger/
```

**Attendu :**
- `rbom_ledger.jsonl` (existe déjà ✅)
- `cycles.jsonl` (doit être créé par le scheduler)

**Si cycles.jsonl absent :** Scheduler ne démarre pas → Vérifier logs

---

### D. Forcer un cycle manuel
```bash
# Dans Output Channel, taper :
# "Reasoning: Run Cognitive Cycle"
```

**Si ça marche :** Scheduler ne démarre pas automatiquement → Problème de timer  
**Si ça échoue :** Problème dans `CognitiveScheduler.runCycle()`

---

## 📊 Diagnostic Rapide

| Symptôme | Cause Probable | Solution |
|----------|----------------|----------|
| Output Channel vide | Extension pas activée | Reload + vérifier installation |
| "Kernel initialized" mais pas "Scheduler started" | `USE_TIMER_REGISTRY = false` | Vérifier config |
| Scheduler started mais pas de cycles | Timer pas démarré | Vérifier `scheduler.start()` |
| cycles.jsonl vide | `appendCycle()` échoue | Vérifier logs RBOMLedger |

---

## ✅ Critères de Succès

- [ ] Extension activée (Output Channel visible)
- [ ] Scheduler démarré ("CognitiveScheduler started")
- [ ] 10 cycles générés en 100-120s
- [ ] `cycles.jsonl` contient 10 entrées JSONL valides
- [ ] Chaînage inter-cycles OK (1 genesis + 9 linked)
- [ ] Aucune erreur dans Output Channel

---

**Prêt ? GO !** 🚀

**Recharge Cursor et relance le test !**

