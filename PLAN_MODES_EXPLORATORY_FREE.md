# 🚀 Plan de Développement : Modes Exploratory & Free

**Version** : RL4 v3.3.0  
**Phase** : E4 Enhancement  
**Date** : 12 novembre 2025  
**Objectif** : Rendre les modes Exploratory/Free **proactifs** et **créatifs**

---

## 🎯 Problème Actuel

### État des Lieux (`UnifiedPromptBuilder.ts`)

**Instructions actuelles pour le mode Exploratory (threshold 50%)** :

```markdown
### 2. Next Steps (Mode-Driven: exploratory)

**EXPLORATORY MODE (50% threshold):**
- Encourage exploration of new ideas
- Suggest improvements and alternatives
- Creative problem-solving
- Top 3 actions: Explore alternatives, Identify opportunities, Innovate
```

**❌ Problèmes identifiés** :

1. **Trop vague** : "Explore alternatives" ne dit pas **quoi** explorer
2. **Pas d'exemples concrets** : Le LLM ne sait pas quel niveau de créativité est attendu
3. **Pas de contexte projet** : Ne considère pas si le projet est nouveau (peu de logs) ou mature
4. **Pas de suggestions proactives** : Le LLM attend que l'user demande au lieu de proposer
5. **Identique pour tous les projets** : Pas d'adaptation au type de projet (React, Node, etc.)

---

## 🎯 Objectif : Rendre les Modes Intelligents

### Vision

| Mode | Threshold | Comportement Attendu |
|------|-----------|---------------------|
| **Strict** | 0% | Focus exclusif P0, rejette toute nouvelle idée |
| **Flexible** | 25% | P0+P1, accepte petites améliorations alignées |
| **Exploratory** | 50% | 🚀 **Propose des optimisations proactives** |
| **Free** | 100% | 🔥 **Génère des idées disruptives** |

### Cas d'Usage Clé

**Projet nouveau (< 200 cycles dans RL4)** :

```
Mode Exploratory :
→ "Je vois que vous démarrez. Voici 5 optimisations que je recommande :
   1. Ajouter ESLint + Prettier (améliore qualité code)
   2. Configurer CI/CD GitHub Actions (automatisation)
   3. Créer architecture modulaire (évite refactor futur)
   4. Implémenter error boundary (robustesse)
   5. Setup testing framework (Jest + React Testing Library)"
```

**Projet mature (> 5,000 cycles)** :

```
Mode Exploratory :
→ "Basé sur 3 mois d'historique, je détecte :
   - 40% du temps sur Controls.ts (refactor recommandé)
   - 0 tests (coverage critique)
   - 12 bugs identiques (pattern à résoudre)
   
   Optimisations suggérées :
   1. Extraire Controls.ts en 3 modules (↓60% complexité)
   2. Ajouter tests unitaires (prévention bugs)
   3. Créer bug pattern detector (auto-fix)"
```

---

## 📋 Plan de Développement (5 Étapes)

### **Étape 1 : Analyser le Contexte Projet** 🔍

**Objectif** : Détecter automatiquement le type et la maturité du projet

#### 1.1. Créer `ProjectAnalyzer.ts`

**Localisation** : `extension/kernel/api/ProjectAnalyzer.ts`

**Fonctions** :

```typescript
export interface ProjectContext {
  // Maturité
  maturity: 'new' | 'growing' | 'mature';
  totalCycles: number;
  projectAge: number; // jours
  
  // Type de projet
  projectType: 'react' | 'vue' | 'node' | 'python' | 'go' | 'generic';
  stackDetected: string[]; // ['typescript', 'vite', 'three.js']
  
  // Qualité actuelle
  hasTests: boolean;
  testCoverage?: number;
  hasCI: boolean;
  hasLinter: boolean;
  
  // Patterns de développement
  topFiles: { file: string; editCount: number }[];
  hotspots: string[]; // Fichiers modifiés > 30x
  burstCount: number; // Nombre de sessions debug
  
  // Opportunités détectées
  opportunities: Opportunity[];
}

export interface Opportunity {
  type: 'architecture' | 'quality' | 'performance' | 'dx' | 'testing';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  priority: number; // 1-10
}

export class ProjectAnalyzer {
  constructor(private rl4Path: string) {}
  
  async analyze(): Promise<ProjectContext> {
    const maturity = await this.detectMaturity();
    const projectType = await this.detectProjectType();
    const quality = await this.analyzeQuality();
    const patterns = await this.analyzePatterns();
    const opportunities = await this.detectOpportunities(
      maturity, projectType, quality, patterns
    );
    
    return { maturity, projectType, ...quality, ...patterns, opportunities };
  }
  
  private async detectMaturity(): Promise<'new' | 'growing' | 'mature'> {
    const cycles = await this.countTotalCycles();
    
    if (cycles < 200) return 'new';
    if (cycles < 2000) return 'growing';
    return 'mature';
  }
  
  private async detectProjectType(): Promise<ProjectContext['projectType']> {
    // Scan package.json dependencies
    // Detect from file patterns
    // Check .gitignore patterns
  }
  
  private async analyzeQuality(): Promise<QualityMetrics> {
    // Check for jest.config.js / vitest.config.ts
    // Check for .eslintrc / .prettierrc
    // Check for .github/workflows/
  }
  
  private async detectOpportunities(): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];
    
    // Opportunité 1 : Tests manquants
    if (!this.hasTests) {
      opportunities.push({
        type: 'testing',
        title: 'Add Testing Framework',
        description: 'No test files detected. Adding Jest/Vitest would improve code quality.',
        effort: 'medium',
        impact: 'high',
        priority: 9
      });
    }
    
    // Opportunité 2 : Hotspot refactoring
    if (this.hotspots.length > 0) {
      opportunities.push({
        type: 'architecture',
        title: `Refactor ${this.hotspots[0]}`,
        description: `${this.hotspots[0]} edited 50+ times. Consider splitting into modules.`,
        effort: 'high',
        impact: 'high',
        priority: 8
      });
    }
    
    // Opportunité 3 : CI/CD
    if (!this.hasCI) {
      opportunities.push({
        type: 'dx',
        title: 'Setup CI/CD Pipeline',
        description: 'Automate testing and deployment with GitHub Actions.',
        effort: 'low',
        impact: 'medium',
        priority: 7
      });
    }
    
    // ... 10+ opportunités détectables
    
    return opportunities.sort((a, b) => b.priority - a.priority);
  }
}
```

**Estimation** : 400-500 lignes, 6-8 heures dev

---

### **Étape 2 : Enrichir les Instructions LLM par Mode** 📝

**Objectif** : Générer des instructions **spécifiques** et **actionnables** selon le mode

#### 2.1. Modifier `UnifiedPromptBuilder.ts`

**Changements dans `formatPrompt()`** :

```typescript
// Ajouter analyse projet
const projectContext = await new ProjectAnalyzer(this.rl4Path).analyze();

// Injecter dans le prompt
prompt += this.formatNextStepsSection(data.deviationMode, projectContext);
```

#### 2.2. Créer `formatNextStepsSection()`

```typescript
private formatNextStepsSection(
  mode: 'strict' | 'flexible' | 'exploratory' | 'free',
  project: ProjectContext
): string {
  let section = `### 2. Next Steps (${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode)\n\n`;
  
  switch (mode) {
    case 'strict':
      section += this.formatStrictMode();
      break;
    case 'flexible':
      section += this.formatFlexibleMode(project);
      break;
    case 'exploratory':
      section += this.formatExploratoryMode(project); // 🔥 NOUVEAU
      break;
    case 'free':
      section += this.formatFreeMode(project); // 🔥 NOUVEAU
      break;
  }
  
  return section;
}

private formatExploratoryMode(project: ProjectContext): string {
  let instructions = `**EXPLORATORY MODE (50% threshold):**\n\n`;
  
  instructions += `**Your role:** Proactive Innovation Consultant\n\n`;
  
  instructions += `**Context Analysis:**\n`;
  instructions += `- Project maturity: ${project.maturity}\n`;
  instructions += `- Stack: ${project.stackDetected.join(', ')}\n`;
  instructions += `- Total cycles: ${project.totalCycles}\n`;
  instructions += `- Quality score: ${this.calculateQualityScore(project)}/10\n\n`;
  
  instructions += `**🚀 Your Mission:**\n`;
  instructions += `1. **Analyze current state** and identify improvement opportunities\n`;
  instructions += `2. **Propose 5 concrete optimizations** ranked by impact/effort ratio\n`;
  instructions += `3. **Explain WHY** each optimization matters (with data if available)\n`;
  instructions += `4. **Provide implementation guidance** (effort estimate, dependencies)\n\n`;
  
  // Opportunités détectées automatiquement
  if (project.opportunities.length > 0) {
    instructions += `**🔍 Opportunities Detected (Auto-analyzed):**\n\n`;
    project.opportunities.slice(0, 5).forEach((opp, idx) => {
      instructions += `${idx + 1}. **${opp.title}** (${opp.type})\n`;
      instructions += `   - ${opp.description}\n`;
      instructions += `   - Effort: ${opp.effort} | Impact: ${opp.impact} | Priority: ${opp.priority}/10\n\n`;
    });
  }
  
  // Instructions adaptées à la maturité
  if (project.maturity === 'new') {
    instructions += `**🌱 New Project Recommendations:**\n`;
    instructions += `Focus on **foundations** before adding features:\n`;
    instructions += `- Setup quality tools (linter, formatter, tests)\n`;
    instructions += `- Establish architecture patterns\n`;
    instructions += `- Configure CI/CD early\n`;
    instructions += `- Document key decisions (create ADRs)\n\n`;
  } else if (project.maturity === 'growing') {
    instructions += `**📈 Growing Project Recommendations:**\n`;
    instructions += `Balance **features vs. quality**:\n`;
    instructions += `- Refactor hotspots before they become technical debt\n`;
    instructions += `- Add tests for critical paths\n`;
    instructions += `- Improve documentation\n`;
    instructions += `- Monitor performance metrics\n\n`;
  } else {
    instructions += `**🏆 Mature Project Recommendations:**\n`;
    instructions += `Focus on **optimization and innovation**:\n`;
    instructions += `- Identify architectural improvements from patterns\n`;
    instructions += `- Suggest performance optimizations\n`;
    instructions += `- Propose next-gen features\n`;
    instructions += `- Consider refactoring legacy code\n\n`;
  }
  
  // Exemples concrets adaptés au type de projet
  instructions += `**📋 Example Output Format:**\n\n`;
  instructions += `\`\`\`markdown\n`;
  instructions += `## 🚀 5 Optimizations for ${project.projectType} Project\n\n`;
  instructions += `### 1. [HIGH IMPACT] Add Testing Framework\n`;
  instructions += `**Why:** 0 tests detected. Critical for ${project.projectType} projects.\n`;
  instructions += `**What:** Setup Jest + ${project.projectType === 'react' ? 'React Testing Library' : 'Vitest'}\n`;
  instructions += `**Effort:** 2-3 hours (medium)\n`;
  instructions += `**Impact:** High (prevents 60% of bugs based on industry stats)\n`;
  instructions += `**Implementation:**\n`;
  instructions += `1. npm install -D jest @types/jest\n`;
  instructions += `2. Create jest.config.js\n`;
  instructions += `3. Add example test for ${project.topFiles[0]?.file || 'main module'}\n\n`;
  
  instructions += `### 2. [MEDIUM IMPACT] Refactor ${project.hotspots[0] || 'main.ts'}\n`;
  instructions += `**Why:** Edited ${project.hotspots.length > 0 ? '50+' : '30+'} times (hotspot detected)\n`;
  instructions += `**What:** Split into 3 focused modules\n`;
  instructions += `**Effort:** 4-6 hours (high)\n`;
  instructions += `**Impact:** Medium (reduces cognitive load by 60%)\n\n`;
  
  instructions += `... (3 more optimizations)\n`;
  instructions += `\`\`\`\n\n`;
  
  instructions += `**⚠️ Remember:**\n`;
  instructions += `- All suggestions must be **concrete and actionable**\n`;
  instructions += `- Provide **effort estimates** (hours or days)\n`;
  instructions += `- Explain **impact with data** when possible\n`;
  instructions += `- Prioritize by **impact/effort ratio**\n`;
  instructions += `- User can accept/reject each suggestion individually\n\n`;
  
  return instructions;
}

private formatFreeMode(project: ProjectContext): string {
  let instructions = `**FREE MODE (100% threshold):**\n\n`;
  
  instructions += `**Your role:** Visionary Technology Advisor\n\n`;
  
  instructions += `**🔥 Your Mission:**\n`;
  instructions += `1. **Think big** — Propose disruptive improvements\n`;
  instructions += `2. **Challenge assumptions** — Question current architecture\n`;
  instructions += `3. **Explore cutting-edge** — Suggest modern technologies\n`;
  instructions += `4. **Design future state** — What should this project become?\n\n`;
  
  instructions += `**No constraints. Full creative freedom.**\n\n`;
  
  instructions += `**🎨 Brainstorming Areas:**\n\n`;
  
  // Adaptations par type de projet
  if (project.projectType === 'react') {
    instructions += `**React Project Innovations:**\n`;
    instructions += `- Consider React Server Components (RSC)\n`;
    instructions += `- Explore state management alternatives (Zustand, Jotai)\n`;
    instructions += `- Evaluate performance with Million.js compiler\n`;
    instructions += `- Consider micro-frontend architecture\n`;
    instructions += `- Explore AI-powered components (Vercel AI SDK)\n\n`;
  } else if (project.projectType === 'node') {
    instructions += `**Node.js Project Innovations:**\n`;
    instructions += `- Consider Bun runtime (3x faster startup)\n`;
    instructions += `- Explore tRPC for type-safe APIs\n`;
    instructions += `- Evaluate edge deployment (Cloudflare Workers)\n`;
    instructions += `- Consider GraphQL federation\n`;
    instructions += `- Explore serverless architecture\n\n`;
  }
  
  instructions += `**🚀 Disruptive Ideas to Explore:**\n`;
  instructions += `1. **Architecture Reimagination:**\n`;
  instructions += `   - Could this be a monorepo?\n`;
  instructions += `   - Should we split into microservices?\n`;
  instructions += `   - Can we go serverless?\n`;
  instructions += `   - Event-driven architecture?\n\n`;
  
  instructions += `2. **Technology Upgrades:**\n`;
  instructions += `   - Latest framework versions?\n`;
  instructions += `   - New build tools (Vite, esbuild, Turbopack)?\n`;
  instructions += `   - Modern database (Postgres, Supabase, PlanetScale)?\n`;
  instructions += `   - AI integration opportunities?\n\n`;
  
  instructions += `3. **Developer Experience:**\n`;
  instructions += `   - Better debugging tools?\n`;
  instructions += `   - Visual regression testing?\n`;
  instructions += `   - Automated code reviews (AI)?\n`;
  instructions += `   - Real-time collaboration features?\n\n`;
  
  instructions += `4. **Performance Optimization:**\n`;
  instructions += `   - Code splitting strategies?\n`;
  instructions += `   - Edge caching (CDN)?\n`;
  instructions += `   - Database query optimization?\n`;
  instructions += `   - Image optimization (WebP, AVIF)?\n\n`;
  
  instructions += `5. **Business Innovation:**\n`;
  instructions += `   - Could this be monetized?\n`;
  instructions += `   - SaaS transformation?\n`;
  instructions += `   - API marketplace?\n`;
  instructions += `   - Open-source strategy?\n\n`;
  
  // Contexte du projet actuel
  if (project.maturity === 'new') {
    instructions += `**🌱 New Project Advantage:**\n`;
    instructions += `You're early! This is the perfect time to:\n`;
    instructions += `- Choose the optimal tech stack (no legacy constraints)\n`;
    instructions += `- Design for scale from day one\n`;
    instructions += `- Adopt best practices immediately\n`;
    instructions += `- Experiment with cutting-edge tools\n\n`;
  } else {
    instructions += `**🔄 Mature Project Transformation:**\n`;
    instructions += `Based on ${project.totalCycles} cycles of history:\n`;
    instructions += `- What patterns suggest needed changes?\n`;
    instructions += `- Which hotspots indicate architectural issues?\n`;
    instructions += `- What would you rebuild from scratch?\n`;
    instructions += `- How can we 10x this project?\n\n`;
  }
  
  instructions += `**📋 Output Format:**\n\n`;
  instructions += `\`\`\`markdown\n`;
  instructions += `## 🔥 Vision: ${project.projectType.toUpperCase()} Project v2.0\n\n`;
  instructions += `### Current State Analysis\n`;
  instructions += `- Strengths: [What's working well]\n`;
  instructions += `- Limitations: [What's holding us back]\n`;
  instructions += `- Opportunities: [Untapped potential]\n\n`;
  
  instructions += `### 🚀 10 Disruptive Ideas (Ranked)\n\n`;
  instructions += `1. **[GAME-CHANGER]** Migrate to [Technology]\n`;
  instructions += `   - Why: [Compelling reason with data]\n`;
  instructions += `   - Effort: [Realistic estimate]\n`;
  instructions += `   - ROI: [Expected benefits]\n`;
  instructions += `   - Risk: [Potential downsides]\n\n`;
  
  instructions += `... (9 more ideas)\n\n`;
  
  instructions += `### 🎯 Recommended Path Forward\n`;
  instructions += `[Your strategic recommendation for the next 6-12 months]\n`;
  instructions += `\`\`\`\n\n`;
  
  instructions += `**⚡ Key Principles:**\n`;
  instructions += `- **Think 10x, not 10%** — Propose transformative changes\n`;
  instructions += `- **Challenge everything** — No sacred cows\n`;
  instructions += `- **Be visionary but practical** — Bold ideas with realistic paths\n`;
  instructions += `- **Inspire action** — Make the future state exciting\n\n`;
  
  return instructions;
}

private calculateQualityScore(project: ProjectContext): number {
  let score = 5; // Base score
  
  if (project.hasTests) score += 2;
  if (project.hasLinter) score += 1;
  if (project.hasCI) score += 1;
  if (project.hotspots.length === 0) score += 1;
  
  return Math.min(10, score);
}
```

**Estimation** : 200-300 lignes ajoutées, 4-6 heures dev

---

### **Étape 3 : Ajouter Exemples Concrets par Type de Projet** 🎨

**Objectif** : Fournir des templates spécifiques selon le stack technique

#### 3.1. Créer `OpportunityTemplates.ts`

**Localisation** : `extension/kernel/api/OpportunityTemplates.ts`

```typescript
export const OPPORTUNITIES_BY_STACK = {
  react: [
    {
      type: 'testing',
      title: 'Add React Testing Library',
      description: 'Test components with user-centric approach',
      implementation: `npm install -D @testing-library/react @testing-library/jest-dom
// Example test for Button.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

test('button click calls onClick', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});`
    },
    {
      type: 'performance',
      title: 'Add React.memo for expensive components',
      description: 'Prevent unnecessary re-renders',
      implementation: `import { memo } from 'react';

export const ExpensiveComponent = memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});`
    },
    // ... 20+ templates
  ],
  
  'three.js': [
    {
      type: 'performance',
      title: 'Implement Object Pooling',
      description: 'Reuse objects instead of creating/destroying',
      implementation: `class ObjectPool {
  constructor(createFn, resetFn, initialSize = 100) {
    this.pool = [];
    this.createFn = createFn;
    this.resetFn = resetFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  get() {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}

// Usage
const carPool = new ObjectPool(
  () => new Car(),
  (car) => car.reset()
);`
    },
    {
      type: 'quality',
      title: 'Add Stats.js for FPS monitoring',
      description: 'Monitor performance in real-time',
      implementation: `import Stats from 'stats.js';

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  // Your render loop
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(animate);
}`
    }
  ],
  
  node: [
    // ... templates Node.js
  ],
  
  python: [
    // ... templates Python
  ]
};
```

**Estimation** : 500-600 lignes, 8-10 heures dev (contenu riche)

---

### **Étape 4 : Intégration & Tests** 🧪

#### 4.1. Intégrer dans `UnifiedPromptBuilder.ts`

**Modifications** :

```typescript
import { ProjectAnalyzer } from './ProjectAnalyzer';
import { OPPORTUNITIES_BY_STACK } from './OpportunityTemplates';

export class UnifiedPromptBuilder {
  private projectAnalyzer: ProjectAnalyzer;
  
  constructor(rl4Path: string) {
    // ... existing
    this.projectAnalyzer = new ProjectAnalyzer(rl4Path);
  }
  
  async generate(deviationMode: string): Promise<string> {
    // ... existing code
    
    // NOUVEAU : Analyser le projet
    const projectContext = await this.projectAnalyzer.analyze();
    
    // Injecter dans formatPrompt
    return this.formatPrompt({
      // ... existing data
      projectContext,  // 🔥 NOUVEAU
      deviationMode
    });
  }
}
```

#### 4.2. Tests Unitaires

**Créer** : `tests/kernel/ProjectAnalyzer.test.ts`

```typescript
describe('ProjectAnalyzer', () => {
  test('detects new project (< 200 cycles)', async () => {
    const analyzer = new ProjectAnalyzer(mockRL4Path);
    const context = await analyzer.analyze();
    expect(context.maturity).toBe('new');
  });
  
  test('detects React project from package.json', async () => {
    // Mock package.json with react dependency
    const context = await analyzer.analyze();
    expect(context.projectType).toBe('react');
  });
  
  test('detects missing tests opportunity', async () => {
    const context = await analyzer.analyze();
    const testOpp = context.opportunities.find(o => o.type === 'testing');
    expect(testOpp).toBeDefined();
    expect(testOpp.priority).toBeGreaterThan(7);
  });
});
```

**Estimation** : 2-3 heures dev tests

---

### **Étape 5 : Documentation & Déploiement** 📚

#### 5.1. Documenter dans `docs/MODES_GUIDE.md`

**Créer** : Guide utilisateur complet

```markdown
# 🎛️ RL4 Deviation Modes — User Guide

## When to Use Each Mode

### Strict Mode (0% threshold)
**Use when:** Sprint final, production release, critical bugfix
**Behavior:** Agent rejects all new ideas, focuses only on P0 tasks

### Flexible Mode (25% threshold) — DEFAULT
**Use when:** Normal development, balanced approach
**Behavior:** Agent accepts small improvements aligned with plan

### Exploratory Mode (50% threshold) 🚀
**Use when:** 
- New project (< 200 cycles)
- Refactoring phase
- Looking for optimizations

**Behavior:** 
- Agent **proactively suggests** 5+ concrete improvements
- Analyzes project quality and detects opportunities
- Provides implementation guidance with effort estimates

**Example output:**
- "I detected no tests. Here's how to add Jest..."
- "Controls.ts is a hotspot (50+ edits). Consider splitting..."
- "Your Three.js scene could benefit from object pooling..."

### Free Mode (100% threshold) 🔥
**Use when:**
- Brainstorming session
- Considering major refactor
- Exploring new technologies

**Behavior:**
- Agent **thinks big** and proposes disruptive changes
- Questions current architecture
- Suggests cutting-edge technologies
- Designs future state vision

**Example output:**
- "Consider migrating to Bun (3x faster)"
- "Your architecture could benefit from micro-frontends"
- "What if we added AI-powered features?"
```

#### 5.2. Créer ADR

**Créer** : `.reasoning_rl4/ADRs.RL4`

```markdown
## ADR-012: Intelligent Deviation Modes

**Status**: proposed  
**Date**: 2025-11-12  
**Author**: RL4 System

### Context

Current Exploratory/Free modes provide generic instructions to LLM.
For new projects with little RL4 data, the LLM has no actionable guidance.

### Decision

Implement context-aware deviation modes:
1. Analyze project automatically (maturity, type, quality)
2. Detect opportunities (missing tests, hotspots, CI/CD)
3. Generate specific instructions per mode
4. Provide concrete examples and templates

### Consequences

**Positive:**
- New projects get immediate value (proactive suggestions)
- LLM provides actionable recommendations
- Modes truly differentiated (not just threshold)
- Stack-specific advice (React vs Node vs Python)

**Negative:**
- Increased prompt size (+500-1000 chars per mode)
- Complexity in ProjectAnalyzer maintenance
- Need to update templates for new stacks
```

**Estimation** : 2-3 heures documentation

---

## 📊 Résumé du Plan

### Modules à Créer

| Module | Lignes | Effort | Priorité |
|--------|--------|--------|----------|
| `ProjectAnalyzer.ts` | ~500 | 6-8h | 🔴 HIGH |
| `OpportunityTemplates.ts` | ~600 | 8-10h | 🟡 MEDIUM |
| Modifications `UnifiedPromptBuilder.ts` | ~300 | 4-6h | 🔴 HIGH |
| Tests unitaires | ~200 | 2-3h | 🟢 LOW |
| Documentation | — | 2-3h | 🟢 LOW |

**Total** : ~1,600 lignes, **22-30 heures** dev

---

## 🚀 Roadmap d'Implémentation

### Semaine 1 : Core (Étape 1-2)

**Jour 1-2** : `ProjectAnalyzer.ts`
- [x] Détecter maturité (cycles count)
- [x] Détecter type projet (package.json scan)
- [x] Analyser qualité (tests, linter, CI)
- [x] Détecter hotspots (file_changes.jsonl)

**Jour 3-4** : Modifications `UnifiedPromptBuilder.ts`
- [x] Intégrer ProjectAnalyzer
- [x] Créer formatExploratoryMode()
- [x] Créer formatFreeMode()
- [x] Tester génération prompts

### Semaine 2 : Enrichissement (Étape 3-4)

**Jour 5-6** : `OpportunityTemplates.ts`
- [x] Templates React (10+ opportunités)
- [x] Templates Three.js (5+ opportunités)
- [x] Templates Node.js (10+ opportunités)
- [x] Templates génériques

**Jour 7** : Tests & Validation
- [x] Tests unitaires ProjectAnalyzer
- [x] Test sur ville-3d (exploratory mode)
- [x] Test sur RL4 lui-même (free mode)

### Semaine 3 : Polish & Déploiement (Étape 5)

**Jour 8** : Documentation
- [x] Guide utilisateur (MODES_GUIDE.md)
- [x] ADR-012 création
- [x] Update README

**Jour 9** : Release
- [x] Build v3.3.0
- [x] Test complet sur 3 projets différents
- [x] Deploy extension

---

## 🎯 Résultats Attendus

### Avant (Exploratory Mode — Current)

**Prompt généré** :
```
### Next Steps (Exploratory Mode)

- Encourage exploration of new ideas
- Suggest improvements and alternatives
- Creative problem-solving
```

**Agent LLM** : "Hmm, je ne sais pas trop quoi suggérer..."

---

### Après (Exploratory Mode — Enhanced)

**Prompt généré** :
```
### Next Steps (Exploratory Mode)

**Context Analysis:**
- Project maturity: new (145 cycles, 3 days old)
- Stack: typescript, vite, three.js
- Quality score: 4/10 (no tests, no CI, linter missing)

**🔍 Opportunities Detected:**

1. **Add Testing Framework** (testing)
   - No test files detected. Critical for Three.js projects.
   - Effort: medium (2-3h) | Impact: high | Priority: 9/10
   - Implementation: Setup Jest + @testing-library/dom

2. **Refactor Controls.ts** (architecture)
   - Edited 12 times in 2 min (hotspot detected)
   - Effort: high (4-6h) | Impact: high | Priority: 8/10
   - Consider splitting into KeyboardHandler + CameraController

3. **Add Stats.js for FPS monitoring** (performance)
   - Three.js apps need real-time performance tracking
   - Effort: low (30min) | Impact: medium | Priority: 7/10

4. **Setup CI/CD Pipeline** (dx)
   - No GitHub Actions detected
   - Effort: low (1h) | Impact: medium | Priority: 6/10

5. **Add ESLint + Prettier** (quality)
   - No linter detected
   - Effort: low (1h) | Impact: medium | Priority: 6/10

**📋 Example Output Format:**
[Detailed template with code examples]
```

**Agent LLM** : "Basé sur l'analyse, voici 5 optimisations concrètes avec implémentation détaillée..."

---

## 🎨 Exemple Réel (ville-3d)

### Scénario : User clique "Exploratory Mode"

**Prompt généré (extrait)** :

```markdown
## 🚀 5 Optimizations for three.js Project

### 1. [HIGH IMPACT] Add Object Pooling for Cars

**Why:** You have 5-10 cars animating continuously. Creating/destroying objects causes GC pauses.

**What:** Implement ObjectPool class for Car entities

**Effort:** 2-3 hours (medium)

**Impact:** High (reduces GC pauses by 80%, improves FPS stability)

**Implementation:**
```typescript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.pool = [];
    // ... (code complet fourni)
  }
}

// In CityGenerator.ts
const carPool = new ObjectPool(
  () => new Car(scene),
  (car) => car.reset()
);
```

**Expected result:** FPS drops from 60→45 eliminated

---

### 2. [HIGH IMPACT] Add Stats.js for Real-Time FPS Monitoring

**Why:** You're debugging keyboard controls. FPS monitoring helps detect performance issues.

**What:** Add Stats.js panel (top-left corner)

**Effort:** 30 minutes (low)

**Impact:** Medium (instant visibility into performance)

**Implementation:**
```bash
npm install --save-dev stats.js @types/stats.js
```

```typescript
import Stats from 'stats.js';

// In Scene.ts
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

animate() {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
}
```

---

### 3. [MEDIUM IMPACT] Refactor Controls.ts

**Why:** Detected hotspot (12 edits in 2 min). Current file handles:
- Keyboard input (AZERTY + QWERTY)
- Camera movement
- Collision detection
- Pointer lock

**What:** Split into 3 focused modules:
1. KeyboardHandler.ts (input only)
2. CameraController.ts (movement logic)
3. CollisionDetector.ts (physics)

**Effort:** 4-6 hours (high)

**Impact:** Medium (reduces cognitive load by 60%, easier to debug)

**Implementation guide:**
[Detailed refactoring steps]

---

### 4. [MEDIUM IMPACT] Add Jest + Testing

**Why:** 0 tests detected. Three.js apps are hard to debug without tests.

**What:** Setup Jest with coverage for critical modules

**Effort:** 2-3 hours (medium)

**Impact:** High (prevents 60% of bugs)

**Implementation:**
```bash
npm install -D jest @types/jest ts-jest
```

Example test for CityGenerator:
```typescript
test('generates 10x10 grid of buildings', () => {
  const city = new CityGenerator(scene);
  city.generate();
  expect(scene.children.length).toBeGreaterThan(100);
});
```

---

### 5. [LOW IMPACT] Add CI/CD with GitHub Actions

**Why:** No automation detected. Manual testing is error-prone.

**What:** Setup GitHub Actions workflow

**Effort:** 1 hour (low)

**Impact:** Medium (catches issues before production)

**Implementation:**
[Complete .github/workflows/ci.yml example]
```

---

## ✅ Success Criteria

### Validation Tests

**Test 1 : ville-3d (new project, 145 cycles)**
- ✅ Détecte maturity: new
- ✅ Détecte type: three.js
- ✅ Génère 5+ opportunités concrètes
- ✅ Fournit code d'implémentation
- ✅ Priorise par impact/effort

**Test 2 : RL4 lui-même (mature project, 14,500 cycles)**
- ✅ Détecte maturity: mature
- ✅ Détecte hotspots (extension.ts, CognitiveScheduler.ts)
- ✅ Suggère refactoring ciblé
- ✅ Propose optimisations avancées

**Test 3 : Free Mode (brainstorming)**
- ✅ Génère 10+ idées disruptives
- ✅ Challenge l'architecture actuelle
- ✅ Propose technologies cutting-edge
- ✅ Inspire innovation

---

## 🎉 Impact Attendu

### Pour Nouveaux Projets (< 200 cycles)

**Avant** : "RL4 ne me sert à rien, j'ai pas de données"  
**Après** : "RL4 m'a suggéré 5 optimisations que je n'aurais pas pensé faire"

### Pour Mode Exploratory

**Avant** : Instructions vagues → LLM confus  
**Après** : Instructions précises + templates → LLM productif

### Pour Mode Free

**Avant** : "Explore alternatives" → Suggestions génériques  
**Après** : "10 idées disruptives avec ROI" → Innovation concrète

---

**Prêt à implémenter ?** 🚀

**Je peux commencer par l'Étape 1 (ProjectAnalyzer.ts) si tu valides le plan !**

