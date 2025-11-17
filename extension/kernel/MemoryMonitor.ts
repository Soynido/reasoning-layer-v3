/**
 * MemoryMonitor.ts
 * 
 * Monitors memory usage of the extension to detect leaks and excessive consumption.
 * Part of E4.1 Memory Safety Sprint.
 */

export interface MemorySnapshot {
  timestamp: string;
  heapUsed: number;      // MB
  heapTotal: number;     // MB
  external: number;      // MB
  arrayBuffers: number;  // MB
  rss: number;           // MB (Resident Set Size)
  deltaFromBaseline: number; // MB
}

export interface MemoryMetrics {
  baseline: MemorySnapshot;
  current: MemorySnapshot;
  snapshots: MemorySnapshot[];
  averageHeapUsed: number;
  peakHeapUsed: number;
  lastSnapshot: string;
}

export class MemoryMonitor {
  private baseline: MemorySnapshot | null = null;
  private snapshots: MemorySnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 100; // Keep last 100 snapshots

  constructor() {
    // Capture baseline at instantiation
    this.baseline = this.captureSnapshot();
  }

  /**
   * Capture a memory snapshot
   */
  public snapshot(): MemorySnapshot {
    const snap = this.captureSnapshot();
    
    // Store snapshot (with rotation)
    this.snapshots.push(snap);
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift(); // Remove oldest
    }

    return snap;
  }

  /**
   * Log warning if memory exceeds threshold
   * @param thresholdMB - Threshold in megabytes
   * @returns true if threshold exceeded
   */
  public logIfHigh(thresholdMB: number): boolean {
    const current = this.snapshot();
    const exceeded = current.heapUsed > thresholdMB;

    if (exceeded) {
      console.warn(
        `[MemoryMonitor] Memory threshold exceeded: ${current.heapUsed.toFixed(2)} MB > ${thresholdMB} MB ` +
        `(delta: +${current.deltaFromBaseline.toFixed(2)} MB from baseline)`
      );
    }

    return exceeded;
  }

  /**
   * Get comprehensive memory metrics
   */
  public getMetrics(): MemoryMetrics {
    const current = this.captureSnapshot();

    // Calculate average heap used
    const avgHeapUsed = this.snapshots.length > 0
      ? this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.snapshots.length
      : current.heapUsed;

    // Find peak heap used
    const peakHeapUsed = this.snapshots.length > 0
      ? Math.max(...this.snapshots.map(s => s.heapUsed))
      : current.heapUsed;

    return {
      baseline: this.baseline!,
      current,
      snapshots: [...this.snapshots], // Return copy
      averageHeapUsed: Number(avgHeapUsed.toFixed(2)),
      peakHeapUsed: Number(peakHeapUsed.toFixed(2)),
      lastSnapshot: current.timestamp
    };
  }

  /**
   * Get current heap usage in MB
   */
  public getCurrentHeapUsage(): number {
    const memUsage = process.memoryUsage();
    return Number((memUsage.heapUsed / 1024 / 1024).toFixed(2));
  }

  /**
   * Get baseline heap usage
   */
  public getBaselineHeapUsage(): number {
    return this.baseline?.heapUsed || 0;
  }

  /**
   * Reset baseline to current memory state
   */
  public resetBaseline(): void {
    this.baseline = this.captureSnapshot();
    console.log(`[MemoryMonitor] Baseline reset to ${this.baseline.heapUsed.toFixed(2)} MB`);
  }

  /**
   * Clear all stored snapshots
   */
  public clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Get snapshot history count
   */
  public getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /**
   * Internal: Capture raw memory snapshot
   */
  private captureSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    
    const heapUsed = memUsage.heapUsed / 1024 / 1024;
    const heapTotal = memUsage.heapTotal / 1024 / 1024;
    const external = memUsage.external / 1024 / 1024;
    const arrayBuffers = memUsage.arrayBuffers / 1024 / 1024;
    const rss = memUsage.rss / 1024 / 1024;

    const baselineHeap = this.baseline?.heapUsed || heapUsed;
    const delta = heapUsed - baselineHeap;

    return {
      timestamp: new Date().toISOString(),
      heapUsed: Number(heapUsed.toFixed(2)),
      heapTotal: Number(heapTotal.toFixed(2)),
      external: Number(external.toFixed(2)),
      arrayBuffers: Number(arrayBuffers.toFixed(2)),
      rss: Number(rss.toFixed(2)),
      deltaFromBaseline: Number(delta.toFixed(2))
    };
  }
}
