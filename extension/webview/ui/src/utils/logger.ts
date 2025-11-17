/**
 * WebViewLogger - Production-safe logging with rotation
 * 
 * Prevents memory leaks by limiting log buffer to 100 entries.
 * No console.log in production mode.
 */

export interface LogEntry {
    timestamp: string;
    level: 'log' | 'warn' | 'error';
    message: string;
}

export class WebViewLogger {
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 100;
    private production: boolean;

    constructor(production: boolean = true) {
        this.production = production;
    }

    /**
     * Log informational message
     */
    public log(message: string): void {
        this.addLog('log', message);
  }

  /**
     * Log warning message
   */
    public warn(message: string): void {
        this.addLog('warn', message);
  }

  /**
     * Log error message
   */
    public error(message: string): void {
        this.addLog('error', message);
  }

  /**
     * Get all logs
   */
    public getLogs(): LogEntry[] {
        return [...this.logs];
  }

  /**
   * Clear all logs
   */
    public clear(): void {
    this.logs = [];
  }

  /**
     * Internal: Add log with rotation
     */
    private addLog(level: 'log' | 'warn' | 'error', message: string): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };

        // Add to buffer
        this.logs.push(entry);

        // Rotate if exceeded max
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift(); // Remove oldest
        }

        // Debug mode only: console output
        if (!this.production) {
            const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
            console[level](`${prefix} [WebView] ${message}`);
        }
  }
}

// Export singleton instance
export const logger = new WebViewLogger(true);
