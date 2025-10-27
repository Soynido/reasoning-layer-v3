# 🗺️ Reasoning Layer V3 - Feature Roadmap

## 📊 Current State vs Vision

### ✅ Currently Implemented (Day 14)

**Layer 1: Core Layer** ✅
- Commit Data (hash, author, message, timestamp, files changed) ✅
- Dependencies (name, version, license via SBOM) ✅
- Config Files (YAML/TOML/ENV parsing) ✅
- Tests (Test reports with coverage) ✅

**Layer 2: RBOM** ✅
- Architectural Decisions (ADRs with title, context, decision, consequences) ✅
- Evidence Linking (Capture events → ADRs) ✅
- Auto-ADR generation (DecisionSynthesizer) ✅
- Zod validation ✅

---

## 🎯 Complete Vision (7 Levels)

Based on your CSV specification, here's the roadmap:

### **Level 1: Code & Structure Technique** (40% implemented)

**✅ Already Done:**
- [x] Commit Data
- [x] Dependencies
- [x] Config Files
- [x] Tests linked
- [x] Build Metadata (partial - GitMetadataEngine)

**🔜 To Implement:**
- [ ] Diff Summary (ajout/suppression, fonction impactée) - **PRIORITY HIGH**
- [ ] AST Parser for dependency tracking
- [ ] Benchmarks/Performance metrics
- [ ] Architecture Map (dependency graph)
- [ ] Code Owners / Maintainers mapping
- [ ] Line-level Links (file:line → decisionID)

**Implementation Priority**: High - Core to decision context

---

### **Level 2: Technical Decisions** (70% implemented)

**✅ Already Done:**
- [x] Architectural Decisions (ADRs)
- [x] Evidence Linking
- [x] Decision validation

**🔜 To Implement:**
- [ ] Trade-offs (avantages/inconvénients)
- [ ] Rejected Options (alternatives exhaustive inventoried)
- [ ] Assumptions (hypothèses documentées)
- [ ] Constraints (techniques documentées)
- [ ] Patterns used (design patterns détectés)
- [ ] Evolution Timeline (superseded_by)
- [ ] Risks identified
- [ ] Mitigations
- [ ] Rationale Depth Score

**Implementation Priority**: Medium - Enhances ADR quality

---

### **Level 3: Human & Organizational Context** (0% implemented)

**🔜 To Implement:**
- [ ] Team Structure (membres, rôles)
- [ ] Contributor Profiles (expérience, spécialité)
- [ ] Decision Author tracking
- [ ] Decision Reviewers (PR reviewers)
- [ ] Cross-team Dependencies
- [ ] Business Objective Link (OKR/KPI)
- [ ] Priority & Deadline tracking
- [ ] Budget Impact
- [ ] Non-tech Stakeholders
- [ ] Meetings & Notes (transcripts)
- [ ] Intent Category (ML classification)

**Implementation Priority**: Low - Nice to have for enterprise contexts

---

### **Level 4: Evidence & Trace** (20% implemented)

**✅ Already Done:**
- [x] Commits cited (via EvidenceMapper)

**🔜 To Implement:**
- [ ] PR Linked (GitHub API integration)
- [ ] Issues Linked (GitHub API)
- [ ] Benchmarks (documents)
- [ ] Unit Tests linked (coverage)
- [ ] Discussions/Threads (Slack, Discord, etc.)
- [ ] Docs & RFCs
- [ ] External References (articles)
- [ ] Evidence Quality Score

**Implementation Priority**: High - Critical for ADR credibility

---

### **Level 5: Integrity & Persistence** (50% implemented)

**✅ Already Done:**
- [x] Versioning (manifest version)
- [x] Snapshot Info (commit tracking)
- [x] Lifecycle Status (active/deprecated)

**🔜 To Implement:**
- [ ] Hash & Signature (BLAKE3 + Ed25519)
- [ ] Encryption Metadata
- [ ] Redactions Applied
- [ ] ACL / Permissions
- [ ] Compression / Storage Metadata
- [ ] Retention Policy
- [ ] Integrity Chain (blockchain-like ledger)

**Implementation Priority**: Medium - Important for enterprise security

---

### **Level 6: External Context** (0% implemented)

**🔜 To Implement:**
- [ ] Product Metrics (KPIs)
- [ ] User Feedback (CRM integration)
- [ ] Regulatory Context
- [ ] Competitor Benchmarks
- [ ] Customer Constraints
- [ ] Market Signals
- [ ] Incident Postmortems
- [ ] Deprecation Notices
- [ ] Tooling Influence

**Implementation Priority**: Very Low - External integrations complex

---

### **Level 7: Memory & Reasoning** (10% implemented)

**✅ Already Done:**
- [x] DecisionSynthesizer (pattern detection)

**🔜 To Implement:**
- [ ] Decision Embeddings (semantic vectors)
- [ ] Patterns Detected (recurring motifs)
- [ ] Bias & Divergence Detection
- [ ] Temporal Graph (timeline navigation)
- [ ] Influence Mapping (who influences what)
- [ ] Context Recipes (deterministic selectors)
- [ ] Causal Links (decision A → impact B)
- [ ] Intent Clustering
- [ ] Anomaly Detection
- [ ] Evolution Forecast (ML prediction)

**Implementation Priority**: Medium - Advanced intelligence features

---

## 🚀 Recommended Next Steps

### **Phase 1: Core Enhancements (Day 15-20)**

**1. Diff Summary Enhancement** ⭐
```typescript
// extension/core/GitCaptureEngine.ts
private parseDiffSummary(file: string): {
  insertions: number;
  deletions: number;
  functionsImpacted: string[];
  dependenciesModified: string[];
}
```

**2. PR/Issue Integration** ⭐
```typescript
// extension/core/GitHubCaptureEngine.ts (new)
class GitHubCaptureEngine {
  capturePR(prNumber: number): Promise<PRData>
  captureIssue(issueNumber: number): Promise<IssueData>
}
```

**3. Evidence Quality Scoring**
```typescript
// extension/core/rbom/EvidenceQuality.ts (new)
class EvidenceQuality {
  scoreEvidence(adr: ADR): EvidenceScore {
    // Count of PRs, issues, commits, benchmarks
    // Freshness of evidence
    // Diversity of sources
  }
}
```

### **Phase 2: Advanced ADR Features (Day 21-25)**

**4. Trade-offs & Rejected Options**
```typescript
// extension/core/rbom/types.ts
interface ADREnhanced extends ADR {
  tradeoffs?: { pros: string[]; cons: string[] };
  rejectedOptions?: { option: string; reason: string }[];
  assumptions?: string[];
  constraints?: string[];
}
```

**5. AST Parser for Code Impact**
```typescript
// extension/core/CodeAnalyzer.ts (new)
class CodeAnalyzer {
  parseFunctionsModified(file: string, diff: string): string[]
  detectPatterns(file: string): Pattern[]
}
```

### **Phase 3: Enterprise Features (Future)**

- Level 3: Human context
- Level 5: Security & encryption
- Level 6: External integrations
- Level 7: Advanced ML features

---

## 📅 Implementation Timeline

| Phase | Features | Estimated Days | Priority |
|-------|----------|----------------|----------|
| **Phase 1** | Diff summary, PR/Issue linking, Evidence quality | 5-7 days | 🔴 High |
| **Phase 2** | Trade-offs, AST parsing, Enhanced ADRs | 7-10 days | 🟡 Medium |
| **Phase 3** | Human context, Security, ML features | Future | 🟢 Low |

---

## 🤔 Is Now the Right Time?

**Current Status**: Day 14 - 100% English translation complete, Layer 1 & 2 stable

**Recommendation**:
- ✅ **YES** - Document this roadmap now (this file)
- ⏸️ **NOT YET** - Implement new features

**Why?**
1. Layer 1 & 2 are stable and production-ready
2. We should test current features first
3. New features should be added incrementally
4. Good time to plan, but not to build

**Next Immediate Actions**:
1. Test Layer 2 (ADR commands) ✅
2. Document roadmap (this file) ✅
3. Update TASKS.md with Phase 1 priorities ⏳
4. Start Phase 1 implementation (after testing)

---

*Last update: 2025-01-27 - Roadmap documented - Ready for Phase 1 planning*
