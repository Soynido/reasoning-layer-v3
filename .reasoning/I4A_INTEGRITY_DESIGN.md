# 🔒 I4-A Design Decision — Integrity Granularity

**Date**: 2025-11-03  
**Phase**: I4-A (RBOMLedger Integration)  
**Critical**: Yes — Defines fundamental integrity invariant

---

## 🎯 INVARIANT FONDAMENTAL

> **"Aucune cognition ne peut exister sans preuve d'intégrité de sa trace."**

**Implication**: Chaque ADR, pattern, correlation, forecast doit avoir une preuve cryptographique de son origine et de sa séquence temporelle.

---

## 📊 OPTIONS ANALYSÉES

### Option 1: Event-Level Hashing

**Approche**: Chaque événement → Merkle leaf

**Avantages**:
- ✅ Granularité maximale
- ✅ Preuve par événement individuel
- ✅ Détection fine de corruption

**Inconvénients**:
- ❌ Overhead de performance (~434,783 events/s → nécessite 434,783 hash/s)
- ❌ Fichier ledger très large (1 hash par ligne)
- ❌ Merkle tree massif (millions de noeuds)

**Verdict**: ❌ **Trop lourd pour le throughput actuel**

---

### Option 2: Batch-Level Hashing (File-based)

**Approche**: 1 Merkle root par fichier JSONL (daily rotation)

**Avantages**:
- ✅ Performance acceptable (1 hash par fichier/jour)
- ✅ Fichier ledger léger (1 entrée/jour)
- ✅ Validation rapide (hash du fichier entier)

**Inconvénients**:
- ⚠️ Granularité grossière (1 jour = potentiellement 10k+ events)
- ⚠️ Si 1 event corrompu → tout le batch invalide

**Verdict**: ⚠️ **Trop grossier pour la détection**

---

### Option 3: Phase-Level Hashing (RECOMMANDÉ)

**Approche**: 1 Merkle root par phase cognitive (Pattern → Correlation → Forecast → ADR)

**Avantages**:
- ✅ Granularité optimale (1 phase = 1-100 events typiquement)
- ✅ Performance excellente (4 hash par cycle de 10s → 0.4 hash/s)
- ✅ Alignement avec CognitiveScheduler
- ✅ Détection précise (corruption isolée par phase)
- ✅ Audit trail clair (phase → ADR → décision)

**Inconvénients**:
- ⚠️ Nécessite hook dans CognitiveScheduler

**Verdict**: ✅ **OPTIMAL — Recommandé**

---

## 🏗️ ARCHITECTURE RECOMMANDÉE

### 1. Niveau de Hachage: Phase-Level

```typescript
// CognitiveScheduler.runCycle()
async runCycle() {
    const cycleStart = Date.now();
    
    // 1. Pattern Learning
    const patterns = await patternEngine.learn();
    const patternsHash = this.ledger.hashBatch(patterns);
    
    // 2. Correlation
    const correlations = await correlationEngine.correlate(patterns);
    const correlationsHash = this.ledger.hashBatch(correlations);
    
    // 3. Forecasting
    const forecasts = await forecastEngine.forecast(correlations);
    const forecastsHash = this.ledger.hashBatch(forecasts);
    
    // 4. ADR Synthesis
    const adrs = await adrGenerator.synthesize(forecasts);
    const adrsHash = this.ledger.hashBatch(adrs);
    
    // 5. Compute Merkle Root
    const merkleRoot = this.ledger.computeRoot([
        patternsHash,
        correlationsHash,
        forecastsHash,
        adrsHash
    ]);
    
    // 6. Append to ledger
    await this.ledger.appendCycle({
        cycleId,
        timestamp: new Date().toISOString(),
        phases: {
            patterns: { hash: patternsHash, count: patterns.length },
            correlations: { hash: correlationsHash, count: correlations.length },
            forecasts: { hash: forecastsHash, count: forecasts.length },
            adrs: { hash: adrsHash, count: adrs.length }
        },
        merkleRoot
    });
}
```

---

### 2. Stockage: Mémoire + Disque

**Ledger** (disque):
- `.reasoning_rl4/ledger/rbom_ledger.jsonl` — ADRs individuels
- `.reasoning_rl4/ledger/cycles.jsonl` — Cycle summaries avec Merkle roots

**Manifest** (disque):
```json
{
  "version": "2.0.0",
  "ledger": {
    "lastMerkleRoot": "abc123...",
    "lastCycleId": 42,
    "totalEntries": 1337,
    "verifiedAt": "2025-11-03T15:00:00.000Z"
  }
}
```

**StateRegistry** (mémoire):
- Cache des derniers Merkle roots (100 derniers cycles)
- Validation instantanée en mémoire

---

### 3. Cycle d'Écriture

**Hooks**:

1. **saveEvent()** (PersistenceManager)
   - RL3 mode: Direct write (pas de hash)
   - RL4 mode: Append to events.jsonl (hash à la fin du cycle)

2. **saveADR()** (RBOMEngine)
   - RL3 mode: File write (pas de hash)
   - RL4 mode: Append to rbom_ledger.jsonl + compute hash

3. **CognitiveScheduler.runCycle()** (fin de cycle)
   - Compute Merkle root des 4 phases
   - Append to cycles.jsonl
   - Update manifest.json with lastMerkleRoot

**Validation**:
```typescript
// Command: reasoning.kernel.verify
async function verifyIntegrity() {
    const ledger = kernel.rbomLedger;
    const manifest = loadManifest();
    
    // Verify last cycle
    const lastCycle = ledger.getLastCycle();
    if (lastCycle.merkleRoot !== manifest.ledger.lastMerkleRoot) {
        throw new Error('Integrity violation: Merkle root mismatch');
    }
    
    // Verify full chain (optional, expensive)
    const chainValid = await ledger.verifyChain();
    return { valid: chainValid, lastRoot: lastCycle.merkleRoot };
}
```

---

## 🔧 IMPLEMENTATION PLAN (I4-A)

### Step 1: Enhance RBOMLedger (1h)

- [ ] Add `hashBatch(items: any[]): string` method
- [ ] Add `computeRoot(hashes: string[]): string` method
- [ ] Add `appendCycle(cycle: CycleSummary): Promise<void>`
- [ ] Add `verifyChain(): Promise<boolean>`
- [ ] Create cycles.jsonl alongside rbom_ledger.jsonl

### Step 2: Integrate with RBOMEngine (0.5h)

- [x] Import RBOMLedger ✅ (done)
- [x] Add useLedger flag ✅ (done)
- [x] Modify saveADR() to use ledger ✅ (done)
- [ ] Make all callers async (createADR, updateADR, linkEvidence)

### Step 3: Integrate with CognitiveScheduler (1h)

- [ ] Inject RBOMLedger into CognitiveScheduler
- [ ] Add Merkle root computation at end of each cycle
- [ ] Append cycle summary to cycles.jsonl
- [ ] Update manifest.json with lastMerkleRoot

### Step 4: Add Verification Commands (0.5h)

- [ ] Add `reasoning.kernel.verify` command
- [ ] Add `kernel.api.verify()` method
- [ ] Display verification status in Output Channel

---

## 📝 PROPOSED LEDGER FORMAT

### rbom_ledger.jsonl (ADRs individuels)

```jsonl
{"id":"adr-001","title":"...","hash":"abc123","timestamp":"2025-11-03T15:00:00.000Z","data":{...}}
{"id":"adr-002","title":"...","hash":"def456","timestamp":"2025-11-03T15:01:00.000Z","data":{...}}
```

### cycles.jsonl (Cycle summaries)

```jsonl
{"cycleId":1,"timestamp":"2025-11-03T15:00:00.000Z","phases":{"patterns":{"hash":"a1","count":3},"correlations":{"hash":"b2","count":5},"forecasts":{"hash":"c3","count":2},"adrs":{"hash":"d4","count":1}},"merkleRoot":"root123"}
{"cycleId":2,"timestamp":"2025-11-03T15:10:00.000Z","phases":{...},"merkleRoot":"root456"}
```

### manifest.json (Merkle root snapshot)

```json
{
  "version": "2.0.0",
  "ledger": {
    "lastMerkleRoot": "root456",
    "lastCycleId": 2,
    "totalADRs": 15,
    "totalCycles": 2,
    "verifiedAt": "2025-11-03T15:10:05.000Z"
  }
}
```

---

## ✅ DECISION FINALE

**Stratégie adoptée**: **Option 3 (Phase-Level Hashing)**

**Rationale**:
1. **Performance**: 0.4 hash/s au lieu de 434,783 hash/s → overhead négligeable
2. **Granularité**: Suffisante pour détecter corruption (1 phase = 1-100 events)
3. **Alignement**: Suit l'architecture CognitiveScheduler (Pattern→Correlation→Forecast→ADR)
4. **Audit**: Trace claire (cycle → phases → ADRs → décisions)

**Impact**:
- Chaque cycle cognitive est prouvé cryptographiquement
- Intégrité vérifiable en <100ms (hash du dernier cycle)
- Chaîne complète vérifiable en ~1-5s (tous les cycles)
- Overhead: <1% du temps de cycle

---

## 🎯 ACCEPTANCE CRITERIA (I4-A)

- [ ] RBOMLedger.hashBatch() implemented
- [ ] RBOMLedger.computeRoot() implemented
- [ ] RBOMLedger.appendCycle() implemented
- [ ] RBOMLedger.verifyChain() implemented
- [ ] CognitiveScheduler integrated avec ledger
- [ ] manifest.json updated with lastMerkleRoot
- [ ] reasoning.kernel.verify command works
- [ ] Validation: verifyChain() → true
- [ ] Performance: cycle overhead <1%

---

## 📊 ESTIMATED IMPACT

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| **Integrity** | None | Cryptographic | ✅ 100% |
| **Audit trail** | Manual | Automated | ✅ |
| **Performance** | N/A | <1% overhead | ✅ Negligible |
| **Verification** | Impossible | <100ms | ✅ Instant |
| **Trust** | Manual review | Mathematical proof | ✅ |

---

**Status**: ⏳ **Design Approved — Ready for Implementation**  
**Estimated Duration**: 2-3 hours  
**Next**: Implement RBOMLedger enhancements

