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

export interface NextStepData {
  priority: 'P0' | 'P1' | 'P2';
  action: string;
}

export interface NextStepsData {
  mode: 'strict' | 'flexible' | 'exploratory' | 'free';
  steps: NextStepData[];
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
  nextSteps: NextStepsData | null;
  planDrift: PlanDriftData | null;
  risks: RisksData | null;
} {
  const result = {
    cognitiveLoad: null as CognitiveLoadData | null,
    nextSteps: null as NextStepsData | null,
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
      /### Cognitive Load: (\d+)% \((Normal|High|Critical)\)\s*- Bursts: (\d+)\s*- Switches: (\d+)\s*- Parallel Tasks: (\d+)\s*- Uncommitted Files: (\d+)/i
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

    // 2. Parse Next Steps
    const nextStepsMatch = kpiSection.match(
      /### Next Steps \((Strict|Flexible|Exploratory|Free) Mode\)([\s\S]*?)(?=###|$)/i
    );
    
    if (nextStepsMatch) {
      const mode = nextStepsMatch[1].toLowerCase() as 'strict' | 'flexible' | 'exploratory' | 'free';
      const stepsText = nextStepsMatch[2];
      
      // Extract numbered steps with priorities
      const stepMatches = stepsText.matchAll(/\d+\.\s*\[(P[012])\]\s*(.+?)(?=\n|$)/g);
      const steps: NextStepData[] = [];
      
      for (const match of stepMatches) {
        steps.push({
          priority: match[1] as 'P0' | 'P1' | 'P2',
          action: match[2].trim(),
        });
      }
      
      result.nextSteps = { mode, steps };
    }

    // 3. Parse Plan Drift
    const planDriftMatch = kpiSection.match(
      /### Plan Drift: (\d+)%([\s\S]*?)(?=###|$)/
    );
    
    if (planDriftMatch) {
      const percentage = parseInt(planDriftMatch[1]);
      const driftText = planDriftMatch[2];
      
      // Extract phase change
      const phaseMatch = driftText.match(/- Phase: (.+?) → (.+?)(?:\n|$)/);
      const phase = phaseMatch 
        ? {
            original: phaseMatch[1].trim(),
            current: phaseMatch[2].trim(),
            changed: true,
          }
        : {
            original: 'Unknown',
            current: 'Unknown',
            changed: false,
          };
      
      // Extract goal percentage
      const goalMatch = driftText.match(/- Goal: (\d+)% different/);
      const goal = {
        percentage: goalMatch ? parseInt(goalMatch[1]) : 0,
      };
      
      // Extract tasks added
      const tasksMatch = driftText.match(/- Tasks: \+(\d+) added/);
      const tasks = {
        added: tasksMatch ? parseInt(tasksMatch[1]) : 0,
      };
      
      // Determine threshold based on mode (assume flexible = 25% by default)
      const threshold = 25; // TODO: Extract from deviation mode
      
      result.planDrift = {
        percentage,
        threshold,
        changes: { phase, goal, tasks },
      };
    }

    // 4. Parse Risks
    const risksMatch = kpiSection.match(/### Risks([\s\S]*?)(?=###|$)/);
    
    if (risksMatch) {
      const risksText = risksMatch[1];
      const riskMatches = risksText.matchAll(/- (🔴|🟡|🟢)\s*(.+?)(?=\n-|$)/gs);
      const risks: RiskData[] = [];
      
      for (const match of riskMatches) {
        const emoji = match[1];
        const description = match[2].trim();
        
        const severity = emoji === '🔴' 
          ? 'critical' 
          : emoji === '🟡' 
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
    nextSteps: {
      mode: 'flexible' as const,
      steps: [
        { priority: 'P0' as const, action: 'URGENT: Commit 21 uncommitted files' },
        { priority: 'P1' as const, action: 'PRIORITY: Document 6 ADRs potentials' },
        { priority: 'P1' as const, action: 'CONTINUE: Complete Smart UI Components' },
        { priority: 'P1' as const, action: 'RECALIBRATE: Decision on 58% bias' },
      ],
    },
    planDrift: {
      percentage: 58,
      threshold: 25,
      changes: {
        phase: {
          original: 'E3.3 - Single Context Snapshot',
          current: 'E4 - Smart UI with KPIs',
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
          description: '21 uncommitted files (risk of data loss)',
        },
        {
          emoji: '🟡',
          severity: 'warning' as const,
          description: 'Burst activity detected (UnifiedPromptBuilder.ts)',
        },
        {
          emoji: '🟡',
          severity: 'warning' as const,
          description: '34min gap detected (16:04→16:38) — Potential blocker',
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

