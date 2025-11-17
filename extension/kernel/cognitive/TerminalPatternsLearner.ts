/**
 * TerminalPatternsLearner — Auto-learning des patterns terminaux
 * 
 * Apprend des patterns d'exécution des tâches pour :
 * - Auto-suggest @rl4:completeWhen pour nouvelles tâches
 * - Détecter anomalies (success rate drop, unusual duration)
 * - Classifier commandes par phase (Setup/Build/Test/Deploy)
 * 
 * Persist dans `.reasoning_rl4/terminal-patterns.json`
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface TaskPattern {
  taskId: string;
  taskTitle?: string;
  typicalCommands: string[];
  successRate: number; // 0-1
  avgDuration: number; // ms
  runsCount: number;
  lastRun: string; // ISO timestamp
  completeWhen?: string; // Auto-detected pattern
}

export interface CommandClassification {
  command: string;
  phase: 'setup' | 'implementation' | 'debug' | 'test' | 'refactor' | 'document' | 'review' | 'deploy';
  confidence: number; // 0-1
}

export interface TerminalEvent {
  timestamp: string;
  type: 'command_start' | 'command_end' | 'output' | 'file_created' | 'git_commit' | 'custom';
  taskId?: string;
  command?: string;
  exitCode?: number;
  output?: string;
  file?: string;
  metadata?: any;
}

export interface PatternAnomaly {
  taskId: string;
  type: 'success_rate_drop' | 'unusual_duration' | 'command_change' | 'dependency_issue';
  severity: 'low' | 'medium' | 'high';
  description: string;
  expected: any;
  actual: any;
  recommendation: string;
}

export interface TaskSuggestion {
  taskId: string;
  taskTitle: string;
  suggestedCondition: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  matchedPattern?: {
    taskId: string;
    taskTitle?: string;
    runsCount: number;
    successRate: number;
  };
}

export class TerminalPatternsLearner {
  private workspaceRoot: string;
  private patternsPath: string;
  private terminalEventsPath: string;
  private patterns: Map<string, TaskPattern> = new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.patternsPath = path.join(workspaceRoot, '.reasoning_rl4', 'terminal-patterns.json');
    this.terminalEventsPath = path.join(workspaceRoot, '.reasoning_rl4', 'terminal-events.jsonl');
  }

  /**
   * Load existing patterns from disk
   */
  async loadPatterns(): Promise<void> {
    try {
      if (!fs.existsSync(this.patternsPath)) {
        this.patterns = new Map();
        return;
      }

      const content = fs.readFileSync(this.patternsPath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data.patterns)) {
        for (const pattern of data.patterns) {
          this.patterns.set(pattern.taskId, pattern);
        }
      }
    } catch (error) {
      console.error('[TerminalPatternsLearner] Failed to load patterns:', error);
      this.patterns = new Map();
    }
  }

  /**
   * Save patterns to disk
   */
  async savePatterns(): Promise<void> {
    try {
      const dir = path.dirname(this.patternsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: '1.0',
        updated: new Date().toISOString(),
        patterns: Array.from(this.patterns.values())
      };

      fs.writeFileSync(this.patternsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[TerminalPatternsLearner] Failed to save patterns:', error);
    }
  }

  /**
   * Learn from terminal events (typically last 24h)
   */
  async learnFromEvents(events: TerminalEvent[]): Promise<void> {
    // Group events by taskId
    const eventsByTask = new Map<string, TerminalEvent[]>();

    for (const event of events) {
      if (!event.taskId) continue;

      if (!eventsByTask.has(event.taskId)) {
        eventsByTask.set(event.taskId, []);
      }
      eventsByTask.get(event.taskId)!.push(event);
    }

    // Learn pattern for each task
    for (const [taskId, taskEvents] of eventsByTask.entries()) {
      await this.learnTaskPattern(taskId, taskEvents);
    }

    // Save updated patterns
    await this.savePatterns();
  }

  /**
   * Learn pattern for a single task
   */
  private async learnTaskPattern(taskId: string, events: TerminalEvent[]): Promise<void> {
    // Get or create pattern
    const existing = this.patterns.get(taskId);
    const pattern: TaskPattern = existing || {
      taskId,
      typicalCommands: [],
      successRate: 0,
      avgDuration: 0,
      runsCount: 0,
      lastRun: ''
    };

    // Extract runs (start/end pairs)
    const runs: Array<{ start: TerminalEvent; end?: TerminalEvent }> = [];
    let currentRun: { start: TerminalEvent; end?: TerminalEvent } | null = null;

    for (const event of events) {
      if (event.type === 'command_start') {
        if (currentRun) {
          runs.push(currentRun); // Save incomplete run
        }
        currentRun = { start: event };
      } else if (event.type === 'command_end' && currentRun) {
        currentRun.end = event;
        runs.push(currentRun);
        currentRun = null;
      }
    }

    if (currentRun) {
      runs.push(currentRun); // Save last incomplete run
    }

    // Update stats
    if (runs.length > 0) {
      pattern.runsCount += runs.length;

      // Update typical commands
      for (const run of runs) {
        const command = run.start.command;
        if (command && !pattern.typicalCommands.includes(command)) {
          pattern.typicalCommands.push(command);
        }
      }

      // Calculate success rate
      const successfulRuns = runs.filter(r => r.end?.exitCode === 0).length;
      pattern.successRate = (existing ? existing.successRate * existing.runsCount : 0) / pattern.runsCount + 
                           successfulRuns / pattern.runsCount;

      // Calculate average duration
      const durations = runs
        .filter(r => r.start && r.end)
        .map(r => {
          const start = new Date(r.start.timestamp).getTime();
          const end = new Date(r.end!.timestamp).getTime();
          return end - start;
        });

      if (durations.length > 0) {
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        pattern.avgDuration = (existing ? existing.avgDuration * existing.runsCount : 0) / pattern.runsCount + 
                             totalDuration / pattern.runsCount;
      }

      // Update last run
      const lastEvent = events[events.length - 1];
      pattern.lastRun = lastEvent.timestamp;

      // Auto-detect completeWhen
      if (pattern.successRate > 0.8 && pattern.runsCount >= 3) {
        pattern.completeWhen = this.detectCompleteWhen(pattern, runs);
      }
    }

    this.patterns.set(taskId, pattern);
  }

  /**
   * Auto-detect completeWhen pattern
   */
  private detectCompleteWhen(pattern: TaskPattern, runs: Array<{ start: TerminalEvent; end?: TerminalEvent }>): string {
    // If all successful runs have exitCode 0, suggest that
    const allSuccessful = runs.filter(r => r.end?.exitCode === 0).length === runs.length;
    if (allSuccessful && runs.length >= 3) {
      return 'exitCode 0';
    }

    // Check for test passing pattern
    const hasTestPattern = pattern.typicalCommands.some(cmd => 
      cmd.includes('test') || cmd.includes('jest') || cmd.includes('mocha')
    );
    if (hasTestPattern) {
      return 'test passing';
    }

    // Check for build pattern
    const hasBuildPattern = pattern.typicalCommands.some(cmd => 
      cmd.includes('build') || cmd.includes('compile') || cmd.includes('webpack')
    );
    if (hasBuildPattern) {
      return 'build success';
    }

    // Default
    return 'exitCode 0';
  }

  /**
   * Suggest @rl4:completeWhen for a new task
   */
  suggestCompleteWhen(taskTitle: string): string | null {
    // Fuzzy match with existing patterns
    const matchedPattern = this.findSimilarPattern(taskTitle);

    if (matchedPattern && matchedPattern.completeWhen) {
      return matchedPattern.completeWhen;
    }

    // Heuristic-based suggestions
    const lowerTitle = taskTitle.toLowerCase();

    if (lowerTitle.includes('test')) {
      return 'test passing';
    }

    if (lowerTitle.includes('build') || lowerTitle.includes('compile')) {
      return 'build success';
    }

    if (lowerTitle.includes('install') || lowerTitle.includes('setup')) {
      return 'npm success';
    }

    if (lowerTitle.includes('commit') || lowerTitle.includes('push')) {
      return 'git commit';
    }

    if (lowerTitle.includes('create') || lowerTitle.includes('add')) {
      // Extract file name if present
      const fileMatch = taskTitle.match(/\b(\w+\.\w+)\b/);
      if (fileMatch) {
        return `file exists: ${fileMatch[1]}`;
      }
    }

    // Default
    return 'exitCode 0';
  }

  /**
   * Suggest for a specific task (returns structured data for UI)
   */
  suggestForTask(taskId: string, taskTitle: string): TaskSuggestion | null {
    const suggestion = this.suggestCompleteWhen(taskTitle);
    if (!suggestion) return null;

    // Find matched pattern for confidence calculation
    const matchedPattern = this.findSimilarPattern(taskTitle);
    
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let reason = 'Heuristic-based suggestion';

    if (matchedPattern && matchedPattern.completeWhen === suggestion) {
      // Pattern-based suggestion (high confidence)
      if (matchedPattern.runsCount >= 5 && matchedPattern.successRate > 0.85) {
        confidence = 'HIGH';
        reason = `Based on ${matchedPattern.runsCount} successful runs (${Math.round(matchedPattern.successRate * 100)}% success rate)`;
      } else if (matchedPattern.runsCount >= 3) {
        confidence = 'MEDIUM';
        reason = `Based on ${matchedPattern.runsCount} runs (${Math.round(matchedPattern.successRate * 100)}% success rate)`;
      }
    } else {
      // Heuristic-based suggestion
      const lowerTitle = taskTitle.toLowerCase();
      if (lowerTitle.includes('test') || lowerTitle.includes('build') || lowerTitle.includes('install')) {
        confidence = 'MEDIUM';
        reason = 'Common pattern detected in task title';
      }
    }

    return {
      taskId,
      taskTitle,
      suggestedCondition: suggestion,
      confidence,
      reason,
      matchedPattern: matchedPattern ? {
        taskId: matchedPattern.taskId,
        taskTitle: matchedPattern.taskTitle,
        runsCount: matchedPattern.runsCount,
        successRate: matchedPattern.successRate
      } : undefined
    };
  }

  /**
   * Find similar pattern by fuzzy matching task title
   */
  private findSimilarPattern(taskTitle: string): TaskPattern | null {
    let bestMatch: TaskPattern | null = null;
    let bestScore = 0;

    for (const pattern of this.patterns.values()) {
      if (!pattern.taskTitle) continue;

      const score = this.calculateSimilarity(taskTitle, pattern.taskTitle);
      if (score > bestScore && score > 0.6) { // 60% similarity threshold
        bestScore = score;
        bestMatch = pattern;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings (simple Jaccard)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Detect anomalies in task execution
   */
  detectAnomalies(taskId: string, recentEvents: TerminalEvent[]): PatternAnomaly[] {
    const pattern = this.patterns.get(taskId);
    if (!pattern || pattern.runsCount < 3) {
      return []; // Not enough data
    }

    const anomalies: PatternAnomaly[] = [];

    // Analyze recent runs
    const recentRuns = this.extractRuns(recentEvents);
    if (recentRuns.length === 0) return [];

    // 1. Success rate drop
    const recentSuccessRate = recentRuns.filter(r => r.end?.exitCode === 0).length / recentRuns.length;
    if (recentSuccessRate < pattern.successRate - 0.3) { // 30% drop
      anomalies.push({
        taskId,
        type: 'success_rate_drop',
        severity: 'high',
        description: `Success rate dropped from ${(pattern.successRate * 100).toFixed(0)}% to ${(recentSuccessRate * 100).toFixed(0)}%`,
        expected: pattern.successRate,
        actual: recentSuccessRate,
        recommendation: 'Check recent commits or dependency changes that might have broken this task.'
      });
    }

    // 2. Unusual duration
    const recentDurations = recentRuns
      .filter(r => r.start && r.end)
      .map(r => new Date(r.end!.timestamp).getTime() - new Date(r.start.timestamp).getTime());

    if (recentDurations.length > 0) {
      const recentAvgDuration = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
      const durationChange = Math.abs(recentAvgDuration - pattern.avgDuration) / pattern.avgDuration;

      if (durationChange > 0.5) { // 50% change
        anomalies.push({
          taskId,
          type: 'unusual_duration',
          severity: 'medium',
          description: `Duration changed from ${(pattern.avgDuration / 1000).toFixed(1)}s to ${(recentAvgDuration / 1000).toFixed(1)}s`,
          expected: pattern.avgDuration,
          actual: recentAvgDuration,
          recommendation: recentAvgDuration > pattern.avgDuration 
            ? 'Task is taking longer than usual. Check for performance regressions.'
            : 'Task is faster than usual. Verify if tests are actually running.'
        });
      }
    }

    // 3. Command change
    const recentCommands = recentRuns.map(r => r.start.command).filter(Boolean) as string[];
    const newCommands = recentCommands.filter(cmd => !pattern.typicalCommands.includes(cmd));

    if (newCommands.length > 0 && pattern.runsCount > 5) {
      anomalies.push({
        taskId,
        type: 'command_change',
        severity: 'low',
        description: `New command(s) detected: ${newCommands.join(', ')}`,
        expected: pattern.typicalCommands,
        actual: recentCommands,
        recommendation: 'Verify if this command change is intentional or if the task definition needs updating.'
      });
    }

    return anomalies;
  }

  /**
   * Extract runs from events
   */
  private extractRuns(events: TerminalEvent[]): Array<{ start: TerminalEvent; end?: TerminalEvent }> {
    const runs: Array<{ start: TerminalEvent; end?: TerminalEvent }> = [];
    let currentRun: { start: TerminalEvent; end?: TerminalEvent } | null = null;

    for (const event of events) {
      if (event.type === 'command_start') {
        if (currentRun) {
          runs.push(currentRun);
        }
        currentRun = { start: event };
      } else if (event.type === 'command_end' && currentRun) {
        currentRun.end = event;
        runs.push(currentRun);
        currentRun = null;
      }
    }

    if (currentRun) {
      runs.push(currentRun);
    }

    return runs;
  }

  /**
   * Classify command by development phase
   */
  classifyCommand(command: string): CommandClassification {
    const lowerCommand = command.toLowerCase();

    // Setup phase
    if (lowerCommand.includes('install') || lowerCommand.includes('init') || lowerCommand.includes('setup')) {
      return { command, phase: 'setup', confidence: 0.9 };
    }

    // Build phase
    if (lowerCommand.includes('build') || lowerCommand.includes('compile') || lowerCommand.includes('webpack')) {
      return { command, phase: 'implementation', confidence: 0.9 };
    }

    // Test phase
    if (lowerCommand.includes('test') || lowerCommand.includes('jest') || lowerCommand.includes('mocha')) {
      return { command, phase: 'test', confidence: 0.9 };
    }

    // Debug phase
    if (lowerCommand.includes('debug') || lowerCommand.includes('log')) {
      return { command, phase: 'debug', confidence: 0.8 };
    }

    // Deploy phase
    if (lowerCommand.includes('deploy') || lowerCommand.includes('publish') || lowerCommand.includes('release')) {
      return { command, phase: 'deploy', confidence: 0.9 };
    }

    // Document phase
    if (lowerCommand.includes('doc') || lowerCommand.includes('readme')) {
      return { command, phase: 'document', confidence: 0.8 };
    }

    // Default: implementation
    return { command, phase: 'implementation', confidence: 0.5 };
  }

  /**
   * Get all patterns
   */
  getPatterns(): TaskPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Alias for getPatterns (for backward compatibility)
   */
  getAllPatterns(): TaskPattern[] {
    return this.getPatterns();
  }

  /**
   * Detect all anomalies across all patterns
   */
  detectAllAnomalies(): PatternAnomaly[] {
    const allAnomalies: PatternAnomaly[] = [];
    
    // Load recent events for analysis
    try {
      const recentEvents = this.loadRecentEvents(100); // Last 100 events
      
      for (const [taskId, pattern] of this.patterns.entries()) {
        if (pattern.runsCount < 3) continue; // Skip patterns with insufficient data
        
        const taskEvents = recentEvents.filter(e => e.taskId === taskId);
        if (taskEvents.length === 0) continue;
        
        const anomalies = this.detectAnomalies(taskId, taskEvents);
        allAnomalies.push(...anomalies);
      }
    } catch (error) {
      console.error('[TerminalPatternsLearner] Failed to detect anomalies:', error);
    }
    
    return allAnomalies;
  }

  /**
   * Load recent terminal events
   */
  private loadRecentEvents(maxEvents: number = 100): TerminalEvent[] {
    const events: TerminalEvent[] = [];
    
    try {
      if (!fs.existsSync(this.terminalEventsPath)) {
        return events;
      }

      const lines = fs.readFileSync(this.terminalEventsPath, 'utf-8').split('\n').filter(l => l.trim());
      const recentLines = lines.slice(-maxEvents);

      for (const line of recentLines) {
        try {
          const event = JSON.parse(line);
          events.push(event);
        } catch {
          // Skip invalid lines
        }
      }
    } catch (error) {
      console.error('[TerminalPatternsLearner] Failed to load recent events:', error);
    }

    return events;
  }

  /**
   * Get pattern for specific task
   */
  getPattern(taskId: string): TaskPattern | null {
    return this.patterns.get(taskId) || null;
  }
}

