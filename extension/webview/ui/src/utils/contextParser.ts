/**
 * Context.RL4 Parser — Extract KPIs from LLM-generated file
 * Parses structured markdown sections into typed objects
 */

export interface CognitiveLoadData {
  percentage: number;
  level: 'normal' | 'high' | 'critical';
  metrics: {
    bursts: number;
    switches: number;
    parallelTasks: number;
    uncommittedFiles: number;
  };
}

export interface NextTaskData {
  priority: 'P0' | 'P1' | 'P2';
  action: string;
}

export interface NextTasksData {
  mode: 'strict' | 'flexible' | 'exploratory' | 'free';
  steps: NextTaskData[];
}

export interface PlanDriftData {
  percentage: number;
  threshold: number;
  changes: {
    phase: {
      original: string;
      current: string;
      changed: boolean;
    };
    goal: {
      percentage: number;
    };
    tasks: {
      added: number;
    };
  };
}

export interface RiskData {
  emoji: string;
  severity: 'critical' | 'warning' | 'ok';
  description: string;
}

export interface RisksData {
  risks: RiskData[];
}

/**
 * Parse Context.RL4 content and extract KPIs section
 */
export function parseContextRL4(content: string): {
  cognitiveLoad: CognitiveLoadData | null;
  nextSteps: NextTasksData | null;
  planDrift: PlanDriftData | null;
  risks: RisksData | null;
} {
  const result = {
    cognitiveLoad: null as CognitiveLoadData | null,
    nextSteps: null as NextTasksData | null,
    planDrift: null as PlanDriftData | null,
    risks: null as RisksData | null,
  };

  try {
    // Extract KPIs section
    const kpiMatch = content.match(/## KPIs \(LLM-Calculated\)([\s\S]*?)(?=##|$)/);
    if (!kpiMatch) return result;

    const kpiSection = kpiMatch[1];

    // 1. Parse Cognitive Load
    const cognitiveLoadMatch = kpiSection.match(
      /### Cognitive Load: (\d+)% \((Normal|High|Critical)\)\s*- Bursts: (\d+).*?\n\s*- Switches: (\d+).*?\n\s*- Parallel Tasks: (\d+).*?\n\s*- Uncommitted Files: (\d+)/is
    );
    
    if (cognitiveLoadMatch) {
      result.cognitiveLoad = {
        percentage: parseInt(cognitiveLoadMatch[1]),
        level: cognitiveLoadMatch[2].toLowerCase() as 'normal' | 'high' | 'critical',
        metrics: {
          bursts: parseInt(cognitiveLoadMatch[3]),
          switches: parseInt(cognitiveLoadMatch[4]),
          parallelTasks: parseInt(cognitiveLoadMatch[5]),
          uncommittedFiles: parseInt(cognitiveLoadMatch[6]),
        },
      };
    }

    // 2. Parse Next Tasks (allow extra text after "Mode")
    const nextTasksMatch = kpiSection.match(
      /### Next (?:Steps|Tasks) \((Strict|Flexible|Exploratory|Free) Mode[^\)]*\)([\s\S]*?)(?=###|$)/i
    );
    
    if (nextTasksMatch) {
      const mode = nextTasksMatch[1].toLowerCase() as 'strict' | 'flexible' | 'exploratory' | 'free';
      const stepsText = nextTasksMatch[2];
      
      // Extract numbered steps with priorities (flexible format: **[P0] TEXT:** or [P0] TEXT)
      const stepMatches = stepsText.matchAll(/\d+\.\s*\*{0,2}\[(P[012])\][^\n]*?:\s*(.+?)(?=\n\d+\.|$)/gs);
      const steps: NextTaskData[] = [];
      
      for (const match of stepMatches) {
        steps.push({
          priority: match[1] as 'P0' | 'P1' | 'P2',
          action: match[2].trim(),
        });
      }
      
      result.nextSteps = { mode, steps };
    }

    // 3. Parse Plan Drift (flexible: handles both drift and no-drift formats)
    const planDriftMatch = kpiSection.match(
      /### Plan Drift: (\d+)%([\s\S]*?)(?=###|$)/
    );
    
    if (planDriftMatch) {
      const percentage = parseInt(planDriftMatch[1]);
      const driftText = planDriftMatch[2];
      
      // Extract phase change (handles both "→" and "=" formats)
      const phaseMatchArrow = driftText.match(/- Phase: (.+?) → (.+?) —/);
      const phaseMatchEquals = driftText.match(/- Phase: (.+?) = (.+?) —/);
      const phaseMatch = phaseMatchArrow || phaseMatchEquals;
      
      const phase = phaseMatch 
        ? {
            original: phaseMatch[1].trim(),
            current: phaseMatch[2].trim(),
            changed: phaseMatchArrow !== null, // Only true if arrow detected
          }
        : {
            original: 'Unknown',
            current: 'Unknown',
            changed: false,
          };
      
      // Extract goal percentage (if present)
      const goalMatch = driftText.match(/- Goal: (\d+)% different/);
      const goal = {
        percentage: goalMatch ? parseInt(goalMatch[1]) : 0,
      };
      
      // Extract tasks added (if present)
      const tasksMatch = driftText.match(/- Tasks: \+(\d+) added/);
      const tasks = {
        added: tasksMatch ? parseInt(tasksMatch[1]) : 0,
      };
      
      // Extract threshold from text (e.g., "Strict: 0% threshold")
      const thresholdMatch = driftText.match(/\((?:Strict|Flexible|Exploratory|Free): (\d+)% threshold\)/i);
      const threshold = thresholdMatch ? parseInt(thresholdMatch[1]) : 25;
      
      result.planDrift = {
        percentage,
        threshold,
        changes: { phase, goal, tasks },
      };
    }

    // 4. Parse Risks (accept any emoji)
    const risksMatch = kpiSection.match(/### Risks([\s\S]*?)(?=###|$)/);
    
    if (risksMatch) {
      const risksText = risksMatch[1];
      // Match any emoji (Unicode range for emojis) followed by text
      const riskMatches = risksText.matchAll(/- ([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}✅]+)\s*(.+?)(?=\n-|$)/gsu);
      const risks: RiskData[] = [];
      
      for (const match of riskMatches) {
        const emoji = match[1].trim();
        const description = match[2].trim();
        
        // Infer severity from emoji
        const severity = (emoji === '🔴' || emoji.includes('🔴'))
          ? 'critical' 
          : (emoji === '🟡' || emoji.includes('🟡') || emoji.includes('⚠'))
          ? 'warning' 
          : 'ok';
        
        risks.push({
          emoji,
          severity,
          description,
        });
      }
      
      result.risks = { risks };
    }

  } catch (error) {
    console.error('[RL4] Error parsing Context.RL4:', error);
  }

  return result;
}

/**
 * Mock data for development/testing
 */
export function getMockKPIData() {
  return {
    cognitiveLoad: {
      percentage: 34,
      level: 'normal' as const,
      metrics: {
        bursts: 1,
        switches: 25,
        parallelTasks: 0,
        uncommittedFiles: 21,
      },
    },
    nextTasks: {
      mode: 'flexible' as const,
      steps: [
        { priority: 'P0' as const, action: 'URGENT: Commit 21 uncommitted files' },
        { priority: 'P1' as const, action: 'PRIORITY: Document potential architectural decisions' },
        { priority: 'P1' as const, action: 'CONTINUE: Complete workspace insight components' },
        { priority: 'P1' as const, action: 'REVIEW: Evaluate plan drift and decide next actions' },
      ],
    },
    planDrift: {
      percentage: 58,
      threshold: 25,
      changes: {
        phase: {
          original: 'Phase 1 - Core Features',
          current: 'Phase 2 - UI Enhancement',
          changed: true,
        },
        goal: {
          percentage: 70,
        },
        tasks: {
          added: 3,
        },
      },
    },
    risks: {
      risks: [
        {
          emoji: '🔴',
          severity: 'critical' as const,
          description: '21 uncommitted files — Risk of data loss if system crashes',
        },
        {
          emoji: '🟡',
          severity: 'warning' as const,
          description: 'Burst activity detected (24 edits in <1min) — Possible debugging session',
        },
        {
          emoji: '🟡',
          severity: 'warning' as const,
          description: '34min gap detected — Potential blocker or break',
        },
        {
          emoji: '🟢',
          severity: 'ok' as const,
          description: 'System health stable (Memory: 284MB, Event Loop: 0.09ms)',
        },
      ],
    },
  };
}

