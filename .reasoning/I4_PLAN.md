# 📋 ITERATION 4 — RBOMLedger + EvidenceGraph Integration

**Start Date**: 2025-11-03  
**Branch**: feat/rl4-i4-ledger  
**Base**: v2.0.0 (main)  
**Status**: ⏳ **PENDING**

---

## 🎯 OBJECTIVES

### Primary Goals

1. **RBOMLedger Integration**
   - Connect existing RBOMEngine to Kernel's RBOMLedger
   - Migrate ADR persistence to append-only ledger
   - Enable Merkle tree verification
   - Validate ADR integrity chain

2. **EvidenceGraph Integration**
   - Build inverted index (trace → artifacts)
   - Enable fast evidence lookup
   - Connect to ContextSnapshotManager
   - Provide graph API for queries

3. **Kernel Extraction**
   - Copy extension/kernel/ to reasoning-kernel repo
   - Make kernel standalone (npm package)
   - Add CLI binary
   - Publish to npm (optional)

---

## 📦 COMPONENTS TO INTEGRATE

### RBOMLedger (extension/kernel/RBOMLedger.ts)

**Current Status**: ✅ Created in I2, not yet integrated

**Integration Points**:
- RBOMEngine → RBOMLedger.append()
- ADRGeneratorV2 → RBOMLedger.append()
- DecisionSynthesizer → RBOMLedger.getHead()

**Files to Modify**:
- extension/core/rbom/RBOMEngine.ts
- extension/core/reasoning/ADRGeneratorV2.ts
- extension/core/rbom/DecisionSynthesizer.ts

**Expected Impact**:
- ADRs stored in append-only ledger (.reasoning_rl4/ledger/rbom_ledger.jsonl)
- Merkle tree for integrity verification
- Historical ADR lookup via head pointer

---

### EvidenceGraph (extension/kernel/EvidenceGraph.ts)

**Current Status**: ✅ Created in I2, not yet integrated

**Integration Points**:
- CaptureEngine → EvidenceGraph.index()
- ContextSnapshotManager → EvidenceGraph.query()
- ExternalIntegrator → EvidenceGraph.link()

**Files to Modify**:
- extension/core/CaptureEngine.ts
- extension/core/external/ContextSnapshotManager.ts
- extension/core/external/ExternalIntegrator.ts

**Expected Impact**:
- Fast evidence lookup (O(log n) vs O(n))
- Trace → ADR traceability
- Evidence quality scoring

---

## 🔧 ITERATION 4 PHASES

### I4-A: RBOMLedger Integration (2-3h)

**Scope**:
1. Inject RBOMLedger into RBOMEngine constructor
2. Replace fs.writeFileSync in ADR saves with ledger.append()
3. Update ADR loader to read from ledger
4. Add Merkle snapshot generation

**Acceptance Criteria**:
- [ ] ADRs saved to .reasoning_rl4/ledger/rbom_ledger.jsonl
- [ ] Merkle root generated for each snapshot
- [ ] Integrity verification: ledger.verify() → true
- [ ] Zero fs.writeFileSync in RBOMEngine

---

### I4-B: EvidenceGraph Integration (2-3h)

**Scope**:
1. Inject EvidenceGraph into CaptureEngine
2. Index all events: graph.index(trace, artifacts)
3. Add query commands: reasoning.evidence.lookup
4. Connect to ContextSnapshotManager

**Acceptance Criteria**:
- [ ] All traces indexed in EvidenceGraph
- [ ] Query: graph.findArtifacts(traceId) → [adr1, adr2, ...]
- [ ] Reverse query: graph.findTraces(adrId) → [trace1, trace2, ...]
- [ ] O(log n) lookup performance

---

### I4-C: Kernel Extraction (3-4h)

**Scope**:
1. Copy extension/kernel/ → reasoning-kernel/src/
2. Add package.json, tsconfig.json, README.md
3. Create CLI binary: reasoning-kernel
4. Add tests + benchmarks
5. Publish to npm (optional)

**Acceptance Criteria**:
- [ ] npm install reasoning-kernel works
- [ ] CLI: reasoning-kernel status → JSON
- [ ] Standalone: no VS Code dependencies
- [ ] Tests pass in isolation
- [ ] Documentation complete

---

## 📊 ESTIMATED EFFORT

| Phase | Duration | Risk |
|-------|----------|------|
| I4-A (RBOMLedger) | 2-3h | LOW (append-only pattern proven) |
| I4-B (EvidenceGraph) | 2-3h | MEDIUM (graph indexing complexity) |
| I4-C (Extraction) | 3-4h | LOW (copy + config) |
| **Total** | **7-10h** | **LOW-MEDIUM** |

---

## 🎯 SUCCESS CRITERIA

### RBOMLedger
- ✅ ADRs in append-only ledger
- ✅ Merkle verification operational
- ✅ Historical lookup functional
- ✅ Zero fs.writeFileSync in ADR paths

### EvidenceGraph
- ✅ All traces indexed
- ✅ Fast queries (O(log n))
- ✅ Bidirectional lookup (trace↔ADR)
- ✅ Integration with ContextSnapshot

### Kernel Extraction
- ✅ Standalone package works
- ✅ npm install successful
- ✅ CLI functional
- ✅ Zero VS Code dependencies
- ✅ Published to npm (optional)

---

## 🔒 SAFETY

**Base**: v2.0.0 (stable, tested, benchmarked)  
**Rollback**: git checkout v2.0.0 (30s)  
**Branch**: feat/rl4-i4-ledger (isolated)

---

## 📅 TIMELINE

**Start**: 2025-11-03 (today)  
**Target**: 2025-11-04 or 2025-11-05  
**Duration**: 1-2 days

---

**Status**: ⏳ **READY TO BEGIN**  
**Next**: I4-A (RBOMLedger Integration)

