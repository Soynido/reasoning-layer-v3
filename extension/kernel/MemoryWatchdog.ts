/**
 * MemoryWatchdog — Periodic memory monitoring with VS Code alerts
 * 
 * Checks memory usage at regular intervals and alerts user when
 * threshold is exceeded. Helps prevent extension crashes from memory leaks.
 */

import * as vscode from 'vscode';
import { MemoryMonitor } from './MemoryMonitor';
import type { CognitiveLogger } from './CognitiveLogger';

export class MemoryWatchdog {
  private monitor: MemoryMonitor;
  private interval: NodeJS.Timeout | null = null;
  private logger: CognitiveLogger | null;

  constructor(logger?: CognitiveLogger) {
    this.monitor = new MemoryMonitor();
    this.logger = logger || null;
  }

  /**
   * Start monitoring memory at regular intervals
   * @param thresholdMB Alert if memory exceeds this value (default: 500 MB)
   * @param intervalMs Check interval in milliseconds (default: 60000 = 1 minute)
   */
  start(thresholdMB = 500, intervalMs = 60000): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      this.check(thresholdMB);
    }, intervalMs);

    if (this.logger) {
      this.logger.system(`🐕 Memory Watchdog started (threshold: ${thresholdMB} MB)`, '🐕');
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;

      if (this.logger) {
        this.logger.system('🐕 Memory Watchdog stopped', '🐕');
      }
    }
  }

  /**
   * Check current memory usage and alert if threshold exceeded
   */
  private check(thresholdMB: number): void {
    const metrics = this.monitor.getMetrics();
    const heapUsed = metrics.current.heapUsed;

    // Log metrics for debugging
    if (this.logger) {
      this.logger.system(
        `Memory check: ${heapUsed} MB (Δ${metrics.current.deltaFromBaseline >= 0 ? '+' : ''}${metrics.current.deltaFromBaseline} MB)`,
        '📊'
      );
    }

    // Alert at > 500 MB
    if (heapUsed > 500) {
      if (this.logger) {
        this.logger.system(`🚨 Memory high: ${heapUsed} MB (> 500 MB threshold)`, '🚨');
      }
    }

    // VS Code warning at > 600 MB
    if (heapUsed > 600) {
      vscode.window.showWarningMessage(
        `⚠️ RL4 Memory very high: ${heapUsed.toFixed(0)} MB. Consider reloading the window.`,
        'Reload Window',
        'Ignore'
      ).then(choice => {
        if (choice === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    }
  }
}

