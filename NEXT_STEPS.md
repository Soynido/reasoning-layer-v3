# 🎯 Next Critical Steps - Reasoning Layer V3

## 📊 Current Status

**✅ Stable Release**: v1.0.8-stable (b6bd7b3)  
**✅ Layer 1**: 100% Complete (Core Capture)  
**✅ Layer 2**: 100% Complete (RBOM + DecisionSynthesizer)  
**✅ Phase 1**: 100% Complete (Diff Summary, PR/Issue, Evidence Quality)

---

## 🔴 CRITICAL PRIORITY - Phase 2 (Days 21-30)

### 1. **Enhanced ADR Schema** ⭐ TOP PRIORITY

**Why**: Current ADRs are basic. Need richer context for better decision tracking.

**What to implement**:
```typescript
interface ADREnhanced extends ADR {
  // New fields:
  tradeoffs?: { 
    pros: string[]; 
    cons: string[]; 
  };
  rejectedOptions?: { 
    option: string; 
    reason: string; 
  }[];
  assumptions?: string[];
  constraints?: {
    technical?: string[];
    business?: string[];
    timeline?: string;
  };
  risks?: {
    risk: string;
    probability: 'low' | 'medium' | 'high';
    impact: string;
  }[];
  mitigations?: string[];
  supersededBy?: string; // ID of ADR that replaces this one
  supersedes?: string[]; // IDs of ADRs this replaces
}
```

**Files to modify**:
- `extension/core/rbom/schema.ts` - Update Zod schema
- `extension/core/rbom/types.ts` - Add new interface
- `extension/core/rbom/RBOMEngine.ts` - Update validation
- `extension/core/rbom/DecisionSynthesizer.ts` - Auto-fill new fields

**Effort**: 2-3 days

---

### 2. **Better PR/Issue Linking** ⭐ HIGH PRIORITY

**Why**: GitHubCaptureEngine exists but doesn't actively link PRs/Issues to ADRs.

**What to implement**:
```typescript
// In GitHubCaptureEngine.ts
public async linkPRToADR(prNumber: number, adrId: string): Promise<void> {
  const pr = await this.fetchPR(prNumber);
  const adr = this.rbomEngine.getADR(adrId);
  
  // Add PR data to ADR evidence
  adr.evidence.push({
    type: 'pr',
    id: pr.number,
    title: pr.title,
    url: pr.url,
    diffStats: pr.additions + pr.deletions,
    linkedAt: new Date().toISOString()
  });
  
  this.rbomEngine.updateADR(adrId, adr);
}

// Auto-link based on commit messages
public parseCommitReferences(commitMessage: string): {
  prs: number[];
  issues: number[];
} {
  const prMatch = commitMessage.match(/(?:Fix|Closes|Resolves)\s+#(\d+)/gi);
  const issueMatch = commitMessage.match(/#(\d+)/g);
  // ... parsing logic
}
```

**Files to modify**:
- `extension/core/GitHubCaptureEngine.ts` - Add linking methods
- `extension/core/rbom/types.ts` - Enhanced evidence types

**Effort**: 1-2 days

---

### 3. **AST Parser for Code Impact** ⭐ HIGH PRIORITY

**Why**: Need to detect which functions/classes are affected by commits for better ADR context.

**What to implement**:
```typescript
// extension/core/CodeAnalyzer.ts (NEW)
export class CodeAnalyzer {
  public parseDiff(diff: string, filePath: string): {
    functionsAffected: string[];
    classesModified: string[];
    importsChanged: string[];
  } {
    // Parse diff to extract:
    // - Function names in modified lines
    // - Class names in modified lines
    // - Import statements changed
    // Return structured data
  }
  
  public detectPatterns(code: string): Pattern[] {
    // Detect design patterns:
    // - Factory, Singleton, Strategy, etc.
    // Return array of detected patterns
  }
}
```

**Dependencies**: 
- Consider using `@babel/parser` or `typescript-parser` for AST parsing
- Or implement simple regex-based extraction for minimal setup

**Files to create**:
- `extension/core/CodeAnalyzer.ts` - New file

**Files to modify**:
- `extension/core/GitMetadataEngine.ts` - Integrate CodeAnalyzer
- `extension/core/rbom/types.ts` - Add code impact fields

**Effort**: 3-4 days (with AST library)

---

### 4. **Risk & Mitigation Tracking** 🟡 MEDIUM PRIORITY

**Why**: Track risks identified during decisions and how they're mitigated.

**What to implement**:
```typescript
interface Risk {
  risk: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'identified' | 'mitigated' | 'resolved' | 'occurred';
}
```

**Effort**: 1 day (extend ADR schema)

---

## 🟡 MEDIUM PRIORITY - Future Enhancements

### 5. **Pattern Detection** (2-3 days)
- Detect design patterns in code changes
- Track recurring architectural decisions
- Build pattern library

### 6. **Evolution Timeline** (1-2 days)
- Track `superseded_by` / `supersedes` relationships
- Visualize decision evolution
- Auto-mark deprecated ADRs

### 7. **Context Recipes** (3-4 days)
- Deterministic selectors for context injection
- Enable fine-grained context for AI assistants
- File/line → decision mapping

---

## 🟢 LOW PRIORITY - Enterprise Features

### 8. **Human Context** (Future)
- Team structure, contributors, reviewers
- Business objectives, OKRs, KPIs
- Budget impact tracking

### 9. **External Integrations** (Future)
- CRM, Analytics, Product Metrics
- User feedback, Regulatory context
- Market signals

### 10. **Advanced ML Features** (Future)
- Decision embeddings (semantic search)
- Intent clustering
- Anomaly detection
- Evolution forecasting

---

## 📅 Recommended Implementation Order

1. **Week 3 (Days 21-23)**: Enhanced ADR Schema
2. **Week 3 (Days 24-25)**: Better PR/Issue Linking  
3. **Week 4 (Days 26-29)**: AST Parser
4. **Week 4 (Day 30)**: Risk & Mitigation Tracking

**Total**: ~10 days for Phase 2 core features

---

## 🚀 Quick Start: Enhanced ADR Schema

**Step 1**: Update `extension/core/rbom/types.ts`
```typescript
export interface ADREnhanced extends ADR {
  tradeoffs?: { pros: string[]; cons: string[] };
  rejectedOptions?: { option: string; reason: string }[];
  assumptions?: string[];
  constraints?: { technical?: string[]; business?: string[] };
  risks?: { risk: string; probability: string; impact: string }[];
  mitigations?: string[];
}
```

**Step 2**: Update Zod schema in `extension/core/rbom/schema.ts`

**Step 3**: Update RBOMEngine to handle new fields

**Step 4**: Extend DecisionSynthesizer to auto-fill tradeoffs/rejected options

---

## 📊 Success Metrics for Phase 2

- [ ] Enhanced ADRs with tradeoffs and rejected options
- [ ] PR/Issues actively linked to ADRs via evidence
- [ ] Code impact analysis showing functions affected by commits
- [ ] Risk tracking and mitigation strategies documented
- [ ] AST parsing operational (minimal implementation)
- [ ] Schema backward-compatible with existing ADRs

---

*Last update: 2025-01-27 - v1.0.8-stable released*

