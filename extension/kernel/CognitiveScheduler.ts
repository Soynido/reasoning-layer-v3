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
    
    constructor(
        workspaceRoot: string,
        private timerRegistry: TimerRegistry
    ) {
        this.ledger = new RBOMLedger(workspaceRoot);
        // Expose to globalThis for VS Code commands
        setGlobalLedger(this.ledger);
    }
    
    /**
     * Start periodic cycles
     * @param periodMs - Period in milliseconds (default: 5-10s for testing, 2h for production)
     */
    start(periodMs: number = 10000): void {
        this.timerRegistry.registerInterval(
            'kernel:cognitive-cycle',
            () => this.runCycle(),
            periodMs
        );
    }
    
    /**
     * Run a complete cognitive cycle
     */
    async runCycle(): Promise<CycleResult> {
        if (this.isRunning) {
            console.warn('⚠️ Cognitive cycle already running, skipping');
            return this.createSkippedResult();
        }
        
        this.isRunning = true;
        this.cycleCount++;
        
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
                console.log('⏭️ Skipping cycle (same input hash)');
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
                // Placeholder: call PatternLearningEngine
                console.log('🔍 Pattern Learning phase');
                return { patternsDetected: 0 };
            }));
            
            // Phase 2: Correlation
            result.phases.push(await this.runPhase('correlation', async () => {
                console.log('🔗 Correlation phase');
                return { correlationsFound: 0 };
            }));
            
            // Phase 3: Forecasting
            result.phases.push(await this.runPhase('forecasting', async () => {
                console.log('🔮 Forecasting phase');
                return { forecastsGenerated: 0 };
            }));
            
            // Phase 4: ADR Synthesis
            result.phases.push(await this.runPhase('adr-synthesis', async () => {
                console.log('📝 ADR Synthesis phase');
                return { adrsGenerated: 0 };
            }));
            
            result.success = true;
            
        } catch (error) {
            result.success = false;
            console.error('❌ Cognitive cycle failed:', error);
        } finally {
            this.isRunning = false;
            result.completedAt = new Date().toISOString();
            result.duration = Date.now() - startTime;
        }
        
        // Log cycle to ledger
        await this.ledger.append('correlation', result); // Using 'correlation' type as proxy
        
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
}

