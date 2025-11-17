import * as fs from 'fs';
import * as path from 'path';

/**
 * Ad-Hoc Action (unplanned developer action)
 */
export interface AdHocAction {
  timestamp: string;
  action: 'npm_install' | 'file_created' | 'git_commit' | 'terminal_command' | 'manual_marker';
  command?: string;
  file?: string;
  commitMessage?: string;
  marker?: string; // For RL4_ACTION markers
  suggestedTask: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  linkedTaskId?: string; // If already linked to a task
}

/**
 * Ad-Hoc Tracker
 * Detects unplanned developer actions from terminal-events.jsonl
 */
export class AdHocTracker {
  private workspaceRoot: string;
  private terminalEventsPath: string;
  private adHocActionsPath: string;
  private tasksPath: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.terminalEventsPath = path.join(workspaceRoot, '.reasoning_rl4', 'terminal-events.jsonl');
    this.adHocActionsPath = path.join(workspaceRoot, '.reasoning_rl4', 'ad-hoc-actions.jsonl');
    this.tasksPath = path.join(workspaceRoot, '.reasoning_rl4', 'Tasks.RL4');
  }

  /**
   * Detect ad-hoc actions from recent terminal events
   */
  detectAdHocActions(lookbackMinutes: number = 60): AdHocAction[] {
    const actions: AdHocAction[] = [];

    try {
      if (!fs.existsSync(this.terminalEventsPath)) {
        return actions;
      }

      // Read terminal events
      const lines = fs.readFileSync(this.terminalEventsPath, 'utf-8').split('\n').filter(l => l.trim());
      const cutoffTime = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

      // Read existing tasks to check for duplicates
      const existingTasks = this.loadExistingTasks();

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          
          // Skip events before cutoff
          if (event.timestamp < cutoffTime) continue;

          // Skip events already linked to a task
          if (event.taskId) continue;

          // Detect ad-hoc actions
          const action = this.detectAction(event, existingTasks);
          if (action) {
            actions.push(action);
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }

      // Deduplicate similar actions
      return this.deduplicateActions(actions);
    } catch (error) {
      console.error('[AdHocTracker] Error detecting actions:', error);
      return actions;
    }
  }

  /**
   * Detect action type from terminal event
   */
  private detectAction(event: any, existingTasks: Set<string>): AdHocAction | null {
    // 1. NPM Install
    if (event.type === 'task_result' && event.command?.includes('npm install')) {
      const pkgMatch = event.command.match(/npm install\s+([@\w/-]+)/);
      const pkgName = pkgMatch ? pkgMatch[1] : 'dependencies';
      const suggestedTask = `Install ${pkgName} dependency`;

      // Check if similar task exists
      if (existingTasks.has(suggestedTask.toLowerCase())) {
        return null; // Already exists
      }

      return {
        timestamp: event.timestamp,
        action: 'npm_install',
        command: event.command,
        suggestedTask,
        confidence: 'HIGH',
        reason: 'Package installation detected without linked task'
      };
    }

    // 2. File Created
    if (event.type === 'file_created' && event.file) {
      const fileName = path.basename(event.file);
      const suggestedTask = `Create ${fileName}`;

      if (existingTasks.has(suggestedTask.toLowerCase())) {
        return null;
      }

      return {
        timestamp: event.timestamp,
        action: 'file_created',
        file: event.file,
        suggestedTask,
        confidence: 'MEDIUM',
        reason: 'File created without linked task'
      };
    }

    // 3. Git Commit
    if (event.type === 'git_commit' && event.metadata?.message) {
      const commitMsg = event.metadata.message;
      const suggestedTask = commitMsg.length > 50 ? commitMsg.substring(0, 47) + '...' : commitMsg;

      if (existingTasks.has(suggestedTask.toLowerCase())) {
        return null;
      }

      return {
        timestamp: event.timestamp,
        action: 'git_commit',
        commitMessage: commitMsg,
        suggestedTask,
        confidence: 'MEDIUM',
        reason: 'Git commit without linked task'
      };
    }

    // 4. RL4_ACTION Marker (explicit user marker)
    if (event.metadata?.rl4_action) {
      const marker = event.metadata.rl4_action;
      return {
        timestamp: event.timestamp,
        action: 'manual_marker',
        command: event.command,
        marker,
        suggestedTask: marker,
        confidence: 'HIGH',
        reason: 'Explicit RL4_ACTION marker from developer'
      };
    }

    // 5. Generic Terminal Command (long-running or complex)
    if (event.type === 'task_result' && event.command && event.exitCode === 0) {
      // Only suggest for complex commands (>30 chars, not simple ls/cd/etc)
      const simpleCommands = ['ls', 'cd', 'pwd', 'echo', 'cat', 'git status', 'git log'];
      const isSimple = simpleCommands.some(cmd => event.command.trim().startsWith(cmd));
      
      if (!isSimple && event.command.length > 30) {
        const suggestedTask = `Run: ${event.command.substring(0, 40)}...`;
        
        if (existingTasks.has(suggestedTask.toLowerCase())) {
          return null;
        }

        return {
          timestamp: event.timestamp,
          action: 'terminal_command',
          command: event.command,
          suggestedTask,
          confidence: 'LOW',
          reason: 'Complex terminal command detected'
        };
      }
    }

    return null;
  }

  /**
   * Load existing tasks from Tasks.RL4 (to avoid duplicates)
   */
  private loadExistingTasks(): Set<string> {
    const tasks = new Set<string>();

    try {
      if (!fs.existsSync(this.tasksPath)) {
        return tasks;
      }

      const content = fs.readFileSync(this.tasksPath, 'utf-8');
      
      // Extract task titles (lines starting with - [ ])
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*-\s*\[\s*\]\s*\[P\d+\]\s*(.+?)(?:\s+@rl4:)/);
        if (match) {
          tasks.add(match[1].trim().toLowerCase());
        }
      }
    } catch (error) {
      console.error('[AdHocTracker] Error loading tasks:', error);
    }

    return tasks;
  }

  /**
   * Deduplicate similar actions (same suggestion within 5 minutes)
   */
  private deduplicateActions(actions: AdHocAction[]): AdHocAction[] {
    const seen = new Map<string, AdHocAction>();

    for (const action of actions) {
      const key = `${action.suggestedTask.toLowerCase()}_${action.action}`;
      
      const existing = seen.get(key);
      if (existing) {
        // Keep the most recent one
        const existingTime = new Date(existing.timestamp).getTime();
        const currentTime = new Date(action.timestamp).getTime();
        
        if (currentTime > existingTime) {
          seen.set(key, action);
        }
      } else {
        seen.set(key, action);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Log ad-hoc action to ad-hoc-actions.jsonl
   */
  async logAction(action: AdHocAction): Promise<void> {
    try {
      const dir = path.dirname(this.adHocActionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const line = JSON.stringify(action) + '\n';
      fs.appendFileSync(this.adHocActionsPath, line, 'utf-8');
    } catch (error) {
      console.error('[AdHocTracker] Error logging action:', error);
    }
  }

  /**
   * Get recent ad-hoc actions (last N)
   */
  getRecentActions(limit: number = 10): AdHocAction[] {
    const actions: AdHocAction[] = [];

    try {
      if (!fs.existsSync(this.adHocActionsPath)) {
        return actions;
      }

      const lines = fs.readFileSync(this.adHocActionsPath, 'utf-8').split('\n').filter(l => l.trim());
      const recentLines = lines.slice(-limit);

      for (const line of recentLines) {
        try {
          actions.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      }
    } catch (error) {
      console.error('[AdHocTracker] Error reading actions:', error);
    }

    return actions;
  }

  /**
   * Mark action as linked to a task
   */
  async markAsLinked(action: AdHocAction, taskId: string): Promise<void> {
    action.linkedTaskId = taskId;
    await this.logAction(action);
  }
}

