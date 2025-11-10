/**
 * CognitiveScheduler - Single Master Scheduler for Cognitive Cycle
 * 
 * Replaces multiple autonomous timers with ONE orchestrated cycle:
 * Pattern → Correlation → Forecast → ADR
 * 
 * Features:
 * - Idempotence (hash-based)
 * - Single timer ownership
 * - Phase telemetry
 * 
 * RL4 Kernel Component #7
 */

import { TimerRegistry } from './TimerRegistry';
import { RBOMLedger, setGlobalLedger } from './RBOMLedger';
import { PatternLearningEngine } from './cognitive/PatternLearningEngine';
import { CorrelationEngine } from './cognitive/CorrelationEngine';
import { ForecastEngine, ForecastMetrics } from './cognitive/ForecastEngine';
import { ADRGeneratorV2 } from './cognitive/ADRGeneratorV2';
import { KernelBootstrap } from './KernelBootstrap';
import { FeedbackEvaluator } from './cognitive/FeedbackEvaluator';
import * as crypto from 'crypto';

export interface CycleResult {
    cycleId: number;
    startedAt: string;
    completedAt: string;
    duration: number;
    phases: PhaseResult[];
    inputHash: string; // For idempotence
    success: boolean;
}

export interface PhaseResult {
    name: string;
    duration: number;
    success: boolean;
    metrics?: any;
    error?: string;
}

export class CognitiveScheduler {
    private cycleCount: number = 0;
    private isRunning: boolean = false;
    private lastInputHash: string = '';
    private ledger: RBOMLedger;
    private lastCycleTime: number = Date.now();
    private watchdogTimer: NodeJS.Timeout | null = null;
    private intervalMs: number = 10000; // Default 10s
    private logger: any = null; // OutputChannel for logging
    private workspaceRoot: string; // Workspace root for engines
    
    // Phase E1: Persistent ForecastEngine with adaptive baseline
    private forecastEngine: ForecastEngine;
    // Phase E2.2: Real metrics evaluator
    private feedbackEvaluator: FeedbackEvaluator;
    
    constructor(
        workspaceRoot: string,
        private timerRegistry: TimerRegistry,
        logger?: any,
        bootstrapMetrics?: ForecastMetrics
    ) {
        this.workspaceRoot = workspaceRoot;
        this.ledger = new RBOMLedger(workspaceRoot);
        this.logger = logger;
        
        // Initialize persistent ForecastEngine with bootstrap metrics
        this.forecastEngine = new ForecastEngine(workspaceRoot, bootstrapMetrics);
        // Initialize FeedbackEvaluator for real metrics
        this.feedbackEvaluator = new FeedbackEvaluator(workspaceRoot);
        
        // Expose to globalThis for VS Code commands
        setGlobalLedger(this.ledger);
    }
    
    /**
     * Start periodic cycles with watchdog protection
     * @param periodMs - Period in milliseconds (default: 5-10s for testing, 2h for production)
     */
    async start(periodMs: number = 10000): Promise<void> {
        this.intervalMs = periodMs;
        
        // Stop any existing timers first
        this.stop();
        
        // CRITICAL: Wait for VS Code Extension Host to stabilize
        // Without this delay, timers are registered but never fire
        this.log(`⏳ Waiting 2s for Extension Host to stabilize...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.log(`✅ Extension Host ready`);
        
        // Register main cycle timer
        this.log(`🧪 Registering cycle timer (${periodMs}ms)...`);
        this.timerRegistry.registerInterval(
            'kernel:cognitive-cycle',
            () => {
                this.log('🔔 Cycle timer FIRED!');
                this.runCycle();
            },
            periodMs
        );
        this.log(`✅ Cycle timer registered successfully`);
        
        // 🧠 Watchdog: Check if scheduler is still active every minute
        // If no cycle executed for 2x interval → auto-restart
        const watchdogInterval = Math.max(60000, periodMs); // Min 1 minute
        this.log(`🧪 Registering watchdog timer (${watchdogInterval}ms)...`);
        this.timerRegistry.registerInterval(
            'kernel:cognitive-watchdog',
            () => {
                this.log('🔔 Watchdog timer FIRED!');
                this.checkWatchdog();
            },
            watchdogInterval
        );
        this.log(`✅ Watchdog timer registered successfully`);
        this.log(`🛡️ Watchdog active (checking every ${watchdogInterval}ms)`);
    }
    
    /**
     * Watchdog check - Detects if scheduler is stuck
     */
    private checkWatchdog(): void {
        const delta = Date.now() - this.lastCycleTime;
        const threshold = this.intervalMs * 2;
        
        if (delta > threshold) {
            this.log(`⚠️ Watchdog: Inactive for ${delta}ms (threshold: ${threshold}ms) — auto-restarting...`);
            this.restart();
        } else {
            this.log(`✅ Watchdog: Healthy (last cycle: ${delta}ms ago)`);
        }
    }
    
    /**
     * Restart scheduler (called by watchdog or manually)
     */
    async restart(): Promise<void> {
        this.log('🔄 CognitiveScheduler restarting...');
        const currentInterval = this.intervalMs;
        this.stop();
        await this.start(currentInterval);
        this.log('✅ CognitiveScheduler auto-restarted');
    }
    
    /**
     * Stop all timers (cycle + watchdog)
     */
    stop(): void {
        this.timerRegistry.clear('kernel:cognitive-cycle');
        this.timerRegistry.clear('kernel:cognitive-watchdog');
    }
    
    /**
     * Log helper (uses outputChannel if available, fallback to console)
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        const timeDisplay = timestamp.substring(11, 23); // HH:MM:SS.mmm
        
        if (this.logger && this.logger.appendLine) {
            this.logger.appendLine(`[${timeDisplay}] [Scheduler] ${message}`);
        } else {
            console.log(`[${timeDisplay}] [Scheduler] ${message}`);
        }
    }
    
    /**
     * Run a complete cognitive cycle
     */
    async runCycle(): Promise<CycleResult> {
        if (this.isRunning) {
            this.log('⚠️ Cycle already running, skipping');
            return this.createSkippedResult();
        }
        
        this.isRunning = true;
        this.cycleCount++;
        this.log(`🔄 Running cycle #${this.cycleCount}...`);
        
        const startTime = Date.now();
        const result: CycleResult = {
            cycleId: this.cycleCount,
            startedAt: new Date().toISOString(),
            completedAt: '',
            duration: 0,
            phases: [],
            inputHash: '',
            success: false
        };
        
        try {
            // Calculate input hash for idempotence
            result.inputHash = await this.calculateInputHash();
            
            // Skip if same input as last cycle (idempotence)
            if (result.inputHash === this.lastInputHash) {
                this.log('⏭️ Skipping cycle (same input hash)');
                result.success = true;
                result.phases.push({
                    name: 'idempotence-skip',
                    duration: 0,
                    success: true
                });
                return result;
            }
            
            this.lastInputHash = result.inputHash;
            
            // Phase 1: Pattern Learning
            result.phases.push(await this.runPhase('pattern-learning', async () => {
                const engine = new PatternLearningEngine(this.workspaceRoot);
                const patterns = await engine.analyzePatterns();
                this.log(`🔍 Pattern Learning: ${patterns.length} patterns detected`);
                return { patternsDetected: patterns.length, patterns };
            }));
            
            // Phase 2: Correlation
            result.phases.push(await this.runPhase('correlation', async () => {
                this.log(`[DEBUG] Starting CorrelationEngine.analyze()...`);
                const engine = new CorrelationEngine(this.workspaceRoot);
                const correlations = await engine.analyze();
                this.log(`🔗 Correlation: ${correlations.length} correlations found`);
                if (correlations.length === 0) {
                    this.log(`⚠️ [DEBUG] No correlations generated - check traces/ directory`);
                }
                return { correlationsFound: correlations.length, correlations };
            }));
            
            // Phase 3: Forecasting (using persistent engine with adaptive baseline)
            result.phases.push(await this.runPhase('forecasting', async () => {
                const forecasts = await this.forecastEngine.generate();
                this.log(`🔮 Forecasting: ${forecasts.length} forecasts generated`);
                return { forecastsGenerated: forecasts.length, forecasts };
            }));
            
            // Phase 4: ADR Synthesis
            result.phases.push(await this.runPhase('adr-synthesis', async () => {
                const generator = new ADRGeneratorV2(this.workspaceRoot);
                const proposals = await generator.generateProposals();
                this.log(`📝 ADR Synthesis: ${proposals.length} proposals generated`);
                return { adrsGenerated: proposals.length, proposals };
            }));
            
            result.success = true;
            
        } catch (error) {
            result.success = false;
            this.log(`❌ Cycle failed: ${error}`);
        } finally {
            this.isRunning = false;
            result.completedAt = new Date().toISOString();
            result.duration = Date.now() - startTime;
            
            // Update watchdog timestamp (successful or not, we ran)
            this.lastCycleTime = Date.now();
        }
        
        // Aggregate cycle summary and append to cycles.jsonl (CycleAggregator)
        await this.aggregateAndPersistCycle(result);
        this.log(`✅ Cycle #${result.cycleId} completed in ${result.duration}ms`);
        
        // Phase E2.2: Real feedback loop every 100 cycles
        if (result.cycleId % 100 === 0) {
            await this.applyFeedbackLoop(result.cycleId);
            
            // Log checkpoint summary
            this.log('');
            this.log('═══════════════════════════════════════');
            this.log(`🔍 Checkpoint: Cycle ${result.cycleId}`);
            this.log(`📊 Baseline: ${this.forecastEngine.metrics.forecast_precision.toFixed(3)}`);
            this.log(`📈 Improvement: ${this.forecastEngine.metrics.improvement_rate >= 0 ? '+' : ''}${this.forecastEngine.metrics.improvement_rate.toFixed(4)}`);
            this.log(`📦 Total Evals: ${this.forecastEngine.metrics.total_forecasts}`);
            this.log('═══════════════════════════════════════');
            this.log('');
        }
        
        return result;
    }
    
    /**
     * Run a single phase
     */
    private async runPhase(
        name: string,
        executor: () => Promise<any>
    ): Promise<PhaseResult> {
        const start = Date.now();
        
        try {
            const metrics = await executor();
            
            return {
                name,
                duration: Date.now() - start,
                success: true,
                metrics
            };
        } catch (error) {
            return {
                name,
                duration: Date.now() - start,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    
    /**
     * Calculate input hash (for idempotence)
     */
    private async calculateInputHash(): Promise<string> {
        // Placeholder: hash of recent events, patterns, etc.
        const input = {
            timestamp: new Date().toISOString().split('T')[0], // Daily granularity
            cycleCount: this.cycleCount
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(input))
            .digest('hex')
            .substring(0, 16);
    }
    
    /**
     * Create skipped result
     */
    private createSkippedResult(): CycleResult {
        return {
            cycleId: this.cycleCount,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 0,
            phases: [],
            inputHash: '',
            success: false
        };
    }
    
    /**
     * CycleAggregator - Aggregate cycle results and persist to cycles.jsonl
     * 
     * This method:
     * 1. Extracts phase metrics (patterns, correlations, forecasts, ADRs)
     * 2. Hashes each phase output for integrity
     * 3. Appends cycle summary to ledger with inter-cycle chaining
     */
    private async aggregateAndPersistCycle(result: CycleResult): Promise<void> {
        try {
            // Extract phase metrics and hash each phase output
            const phases = {
                patterns: this.hashPhaseMetrics(result.phases.find(p => p.name === 'pattern-learning')?.metrics || {}),
                correlations: this.hashPhaseMetrics(result.phases.find(p => p.name === 'correlation')?.metrics || {}),
                forecasts: this.hashPhaseMetrics(result.phases.find(p => p.name === 'forecasting')?.metrics || {}),
                adrs: this.hashPhaseMetrics(result.phases.find(p => p.name === 'adr-synthesis')?.metrics || {})
            };
            
            // Append cycle summary to ledger (with inter-cycle chaining)
            // Note: prevMerkleRoot is automatically retrieved by RBOMLedger from cache
            await this.ledger.appendCycle({
                cycleId: result.cycleId,
                timestamp: result.completedAt,
                phases,
                merkleRoot: '' // Will be computed by RBOMLedger
            });
            
            // Force immediate flush for critical ledger data
            await this.ledger.flush();
            
            this.log(`💾 Cycle ${result.cycleId} persisted to cycles.jsonl`);
            
        } catch (error) {
            this.log(`❌ Failed to aggregate cycle ${result.cycleId}: ${error}`);
            // Non-critical error: don't throw, just log
        }
    }
    
    /**
     * Hash phase metrics for integrity verification
     */
    private hashPhaseMetrics(metrics: any): { hash: string; count: number } {
        const metricsStr = JSON.stringify(metrics);
        const hash = crypto.createHash('sha256')
            .update(metricsStr)
            .digest('hex')
            .substring(0, 16);
        
        // Extract count from metrics (default to 0)
        const count = metrics.patternsDetected || 
                     metrics.correlationsFound || 
                     metrics.forecastsGenerated || 
                     metrics.adrsGenerated || 
                     0;
        
        return { hash, count };
    }

    /**
     * Phase E2.2: Apply feedback loop with REAL metrics
     * 
     * Computes actual feedback from system performance:
     * - Forecast accuracy (predictions vs. reality)
     * - Pattern stability (variance over cycles)
     * - ADR adoption rate (unique vs. duplicate decisions)
     * - Cycle efficiency (latency)
     * 
     * @param cycleId - Current cycle ID
     */
    private async applyFeedbackLoop(cycleId: number): Promise<void> {
        this.log(`🔁 [Phase E2.2] Applying real feedback loop at cycle ${cycleId}`);
        
        try {
            // E2.2: Compute real metrics from FeedbackEvaluator
            const metrics = await this.feedbackEvaluator.computeComprehensiveFeedback();
            
            // Log detailed breakdown
            this.log(`📊 [E2.2] Real metrics computed:`);
            this.log(`   • Forecast Accuracy:  ${(metrics.forecast_accuracy * 100).toFixed(1)}%`);
            this.log(`   • Pattern Stability:  ${(metrics.pattern_stability * 100).toFixed(1)}%`);
            this.log(`   • ADR Adoption Rate:  ${(metrics.adr_adoption_rate * 100).toFixed(1)}%`);
            this.log(`   • Cycle Efficiency:   ${(metrics.cycle_efficiency * 100).toFixed(1)}%`);
            
            // Use forecast accuracy as primary feedback signal
            const realFeedback = metrics.forecast_accuracy;
            
            // Update baseline with real feedback
            const prevPrecision = this.forecastEngine.metrics.forecast_precision;
            this.forecastEngine.updateBaseline(realFeedback);
            const newPrecision = this.forecastEngine.metrics.forecast_precision;
            
            // Persist updated metrics + full evaluation
            const updatedMetrics = this.forecastEngine.getMetrics();
            await KernelBootstrap.saveState(
                {
                    version: '2.0.6',
                    cycle: cycleId,
                    updated_at: new Date().toISOString(),
                    forecast_metrics: updatedMetrics,
                    evaluation_metrics: metrics,
                    feedback_history: {
                        prev_precision: prevPrecision,
                        new_precision: newPrecision,
                        delta: newPrecision - prevPrecision,
                        feedback_used: realFeedback
                    }
                },
                this.workspaceRoot
            );
            
            this.log(`💾 [E2.2] Real metrics persisted: precision ${newPrecision.toFixed(3)} (feedback: ${realFeedback.toFixed(3)})`);
            
        } catch (error) {
            this.log(`❌ [E2.2] Feedback loop failed: ${error}`);
        }
    }
}

