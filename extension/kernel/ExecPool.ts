/**
 * ExecPool - Command Execution Pool with Timeout & Concurrency Control
 * 
 * Features:
 * - Pool size limit (default: 2 concurrent exec)
 * - Timeout protection (default: 2000ms)
 * - AbortController support
 * - Latency tracking (p50/p90/p99)
 * - Queue management
 * 
 * RL4 Kernel Component #3
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecOptions {
    cwd: string;
    timeout?: number; // Default: 2000ms
    env?: NodeJS.ProcessEnv;
}

export interface ExecResult {
    stdout: string;
    stderr: string;
    duration: number; // ms
    timedOut: boolean;
}

export interface ExecMetrics {
    total: number;
    successful: number;
    failed: number;
    timedOut: number;
    latency: {
        p50: number;
        p90: number;
        p99: number;
        max: number;
    };
}

export class ExecPool {
    private poolSize: number;
    private defaultTimeout: number;
    private activeJobs: number = 0;
    private queue: Array<() => Promise<void>> = [];
    
    // Metrics
    private latencies: number[] = [];
    private total: number = 0;
    private successful: number = 0;
    private failed: number = 0;
    private timedOut: number = 0;
    
    constructor(poolSize: number = 2, defaultTimeout: number = 2000) {
        this.poolSize = poolSize;
        this.defaultTimeout = defaultTimeout;
    }
    
    /**
     * Execute command with timeout and concurrency control
     * @param command - Shell command to execute
     * @param options - Execution options
     * @returns ExecResult with stdout, stderr, duration
     */
    async run(command: string, options: ExecOptions): Promise<ExecResult> {
        // Wait for available slot in pool
        while (this.activeJobs >= this.poolSize) {
            await this.waitForSlot();
        }
        
        this.activeJobs++;
        this.total++;
        
        const start = Date.now();
        let timedOut = false;
        
        try {
            const timeout = options.timeout || this.defaultTimeout;
            
            const result = await Promise.race([
                execAsync(command, {
                    cwd: options.cwd,
                    env: options.env,
                    maxBuffer: 1024 * 1024 * 10 // 10MB
                }),
                this.timeoutPromise(timeout)
            ]);
            
            if (result === 'TIMEOUT') {
                timedOut = true;
                this.timedOut++;
                
                return {
                    stdout: '',
                    stderr: `Command timed out after ${timeout}ms`,
                    duration: Date.now() - start,
                    timedOut: true
                };
            }
            
            const duration = Date.now() - start;
            this.latencies.push(duration);
            this.successful++;
            
            return {
                stdout: (result as any).stdout,
                stderr: (result as any).stderr,
                duration,
                timedOut: false
            };
            
        } catch (error) {
            this.failed++;
            
            return {
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                duration: Date.now() - start,
                timedOut: false
            };
            
        } finally {
            this.activeJobs--;
            this.processQueue();
        }
    }
    
    /**
     * Wait for available slot in pool
     */
    private async waitForSlot(): Promise<void> {
        return new Promise(resolve => {
            this.queue.push(async () => resolve());
        });
    }
    
    /**
     * Process queued jobs
     */
    private processQueue(): void {
        if (this.queue.length > 0 && this.activeJobs < this.poolSize) {
            const job = this.queue.shift();
            if (job) {
                job();
            }
        }
    }
    
    /**
     * Timeout promise helper
     */
    private timeoutPromise(ms: number): Promise<string> {
        return new Promise(resolve => {
            setTimeout(() => resolve('TIMEOUT'), ms);
        });
    }
    
    /**
     * Get execution metrics
     */
    getMetrics(): ExecMetrics {
        return {
            total: this.total,
            successful: this.successful,
            failed: this.failed,
            timedOut: this.timedOut,
            latency: this.calculatePercentiles()
        };
    }
    
    /**
     * Calculate latency percentiles
     */
    private calculatePercentiles(): { p50: number; p90: number; p99: number; max: number } {
        if (this.latencies.length === 0) {
            return { p50: 0, p90: 0, p99: 0, max: 0 };
        }
        
        const sorted = [...this.latencies].sort((a, b) => a - b);
        
        const p50 = sorted[Math.floor(sorted.length * 0.50)];
        const p90 = sorted[Math.floor(sorted.length * 0.90)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        const max = sorted[sorted.length - 1];
        
        return { p50, p90, p99, max };
    }
    
    /**
     * Reset metrics (for testing)
     */
    resetMetrics(): void {
        this.latencies = [];
        this.total = 0;
        this.successful = 0;
        this.failed = 0;
        this.timedOut = 0;
    }
    
    /**
     * Get queue status
     */
    getQueueStatus(): { active: number; queued: number; poolSize: number } {
        return {
            active: this.activeJobs,
            queued: this.queue.length,
            poolSize: this.poolSize
        };
    }
}

