/**
 * Task Memory Manager - Level 10.1: Memory Ledger
 * 
 * Persists task execution history in immutable ledger format
 * Generates cognitive roadmap from execution patterns
 * Completes the reasoning feedback loop
 */

import * as fs from 'fs';
import * as path from 'path';

interface TaskRecord {
    timestamp: string;
    task_id: string;
    goal: string;
    action: string;
    file: string;
    status: 'planned' | 'in_progress' | 'completed' | 'failed';
    dependencies?: string[];
    metrics?: {
        before: any;
        after: any;
    };
}

interface CognitiveRoadmap {
    generated_at: string;
    total_tasks: number;
    completed: number;
    in_progress: number;
    planned: number;
    failed: number;
    execution_metrics: {
        average_completion_time?: number;
        success_rate: number;
        dependencies_resolved: number;
    };
    cognitive_evolution: {
        pattern_diversity_trend: number;
        bias_reduction: number;
        correlation_quality: number;
    };
    next_priority: {
        goal: string;
        action: string;
        file?: string;
        reason: string;
    };
}

export class TaskMemoryManager {
    private workspacePath: string;
    private ledgerPath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
        this.ledgerPath = path.join(workspacePath, '.reasoning', 'task_memory.jsonl');
    }

    /**
     * Load existing ledger or create new
     */
    private loadLedger(): TaskRecord[] {
        if (!fs.existsSync(this.ledgerPath)) {
            return [];
        }

        const lines = fs.readFileSync(this.ledgerPath, 'utf-8').trim().split('\n');
        return lines.map(line => JSON.parse(line));
    }

    /**
     * Append record to ledger (immutable)
     */
    public recordTask(task: TaskRecord): void {
        // Ensure .reasoning directory exists
        const dir = path.dirname(this.ledgerPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Append to ledger (JSONL format)
        const record = JSON.stringify(task) + '\n';
        fs.appendFileSync(this.ledgerPath, record);
        console.log(`📝 Recorded task: ${task.task_id} (${task.status})`);
    }

    /**
     * Load action plan and record as planned tasks
     */
    public recordActionPlan(): void {
        const actionPlanPath = path.join(this.workspacePath, '.reasoning', 'action_plan.json');
        
        if (!fs.existsSync(actionPlanPath)) {
            console.log('⚠️  No action plan found');
            return;
        }

        const plan = JSON.parse(fs.readFileSync(actionPlanPath, 'utf-8'));
        const tasks = plan.plan || [];

        console.log(`📋 Recording ${tasks.length} planned tasks`);

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const taskId = `task-${Date.now()}-${i}`;

            this.recordTask({
                timestamp: new Date().toISOString(),
                task_id: taskId,
                goal: task.goal,
                action: task.action,
                file: task.file,
                status: 'planned',
                dependencies: task.dependencies
            });
        }

        console.log(`✅ Recorded ${tasks.length} planned tasks to ledger`);
    }

    /**
     * Generate cognitive roadmap
     */
    public generateRoadmap(): CognitiveRoadmap {
        const records = this.loadLedger();
        const completed = records.filter(r => r.status === 'completed').length;
        const inProgress = records.filter(r => r.status === 'in_progress').length;
        const planned = records.filter(r => r.status === 'planned').length;
        const failed = records.filter(r => r.status === 'failed').length;
        
        const in_progress = inProgress;

        const successRate = records.length > 0 
            ? (completed / (completed + failed)) * 100 
            : 0;

        // Load reasoning data for evolution metrics
        const evolution = this.calculateEvolution();

        // Determine next priority
        const nextPriority = this.determineNextPriority(records);

        const roadmap: CognitiveRoadmap = {
            generated_at: new Date().toISOString(),
            total_tasks: records.length,
            completed,
            in_progress,
            planned,
            failed,
            execution_metrics: {
                success_rate: successRate,
                dependencies_resolved: records.filter(r => r.dependencies && r.dependencies.length > 0).length
            },
            cognitive_evolution: evolution,
            next_priority: nextPriority
        };

        // Save roadmap
        const roadmapPath = path.join(this.workspacePath, '.reasoning', 'CognitiveRoadmap.md');
        this.saveRoadmapMarkdown(roadmap);

        console.log(`🗺️  Cognitive roadmap generated`);
        return roadmap;
    }

    /**
     * Calculate cognitive evolution metrics
     */
    private calculateEvolution(): any {
        const patternsPath = path.join(this.workspacePath, '.reasoning', 'patterns.json');
        const alertsPath = path.join(this.workspacePath, '.reasoning', 'alerts.json');
        const correlationsPath = path.join(this.workspacePath, '.reasoning', 'correlations.json');

        let diversity = 0;
        let biasCount = 0;
        let correlationQuality = 0;

        try {
            if (fs.existsSync(patternsPath)) {
                const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
                // Calculate diversity (entropy)
                if (patterns.patterns && patterns.patterns.length > 0) {
                    const categories = new Map();
                    for (const p of patterns.patterns) {
                        const cat = p.impact || 'Other';
                        categories.set(cat, (categories.get(cat) || 0) + 1);
                    }
                    let entropy = 0;
                    for (const count of categories.values()) {
                        const p = count / patterns.patterns.length;
                        entropy -= p * Math.log2(p);
                    }
                    diversity = entropy;
                }
            }

            if (fs.existsSync(alertsPath)) {
                const biases = JSON.parse(fs.readFileSync(alertsPath, 'utf-8'));
                biasCount = biases.length;
            }

            if (fs.existsSync(correlationsPath)) {
                const correlations = JSON.parse(fs.readFileSync(correlationsPath, 'utf-8'));
                if (correlations.length > 0) {
                    const avgCorr = correlations.reduce((sum: number, c: any) => sum + (c.correlation_score || 0), 0) / correlations.length;
                    correlationQuality = avgCorr;
                }
            }
        } catch (error) {
            console.warn('Could not calculate evolution metrics:', error);
        }

        return {
            pattern_diversity_trend: diversity,
            bias_reduction: biasCount,
            correlation_quality: correlationQuality
        };
    }

    /**
     * Determine next priority from records
     */
    private determineNextPriority(records: TaskRecord[]): any {
        const plannedTasks = records.filter(r => r.status === 'planned');
        
        if (plannedTasks.length === 0) {
            return {
                goal: 'None',
                action: 'All tasks completed',
                reason: 'System is up to date'
            };
        }

        // Find highest priority planned task
        const nextTask = plannedTasks[0];
        
        return {
            goal: nextTask.goal,
            action: nextTask.action,
            file: nextTask.file,
            reason: 'Next in execution queue'
        };
    }

    /**
     * Save roadmap as Markdown
     */
    private saveRoadmapMarkdown(roadmap: CognitiveRoadmap): void {
        const md = [
            '# 🗺️ Cognitive Roadmap',
            '',
            `**Generated:** ${roadmap.generated_at}`,
            '',
            '## 📊 Execution Summary',
            '',
            `- **Total Tasks:** ${roadmap.total_tasks}`,
            `- **Completed:** ${roadmap.completed} ✅`,
            `- **In Progress:** ${roadmap.in_progress} 🔄`,
            `- **Planned:** ${roadmap.planned} 📋`,
            `- **Failed:** ${roadmap.failed} ❌`,
            '',
            '## 📈 Execution Metrics',
            '',
            `- **Success Rate:** ${roadmap.execution_metrics.success_rate.toFixed(1)}%`,
            `- **Dependencies Resolved:** ${roadmap.execution_metrics.dependencies_resolved}`,
            '',
            '## 🧠 Cognitive Evolution',
            '',
            `- **Pattern Diversity:** ${roadmap.cognitive_evolution.pattern_diversity_trend.toFixed(3)} (entropy)`,
            `- **Bias Count:** ${roadmap.cognitive_evolution.bias_reduction}`,
            `- **Correlation Quality:** ${roadmap.cognitive_evolution.correlation_quality.toFixed(3)} (avg score)`,
            '',
            '## 🎯 Next Priority',
            '',
            `**Goal:** ${roadmap.next_priority.goal}`,
            `**Action:** ${roadmap.next_priority.action}`,
            `**File:** ${roadmap.next_priority.file || 'N/A'}`,
            `**Reason:** ${roadmap.next_priority.reason}`,
            '',
            '---',
            '',
            '*This roadmap is auto-generated from task execution ledger*'
        ];

        const roadmapPath = path.join(this.workspacePath, '.reasoning', 'CognitiveRoadmap.md');
        fs.writeFileSync(roadmapPath, md.join('\n'));
        console.log(`✅ Roadmap saved: ${roadmapPath}`);
    }

    /**
     * Main entry point
     */
    public async run(): Promise<void> {
        console.log('🧠 TaskMemoryManager: Starting memory ledger...');

        // Record action plan
        this.recordActionPlan();

        // Generate roadmap
        const roadmap = this.generateRoadmap();

        console.log(`✅ TaskMemoryManager complete`);
        console.log(`📊 Execution: ${roadmap.completed}/${roadmap.total_tasks} completed`);
        console.log(`🎯 Next: ${roadmap.next_priority.action} - ${roadmap.next_priority.file || ''}`);
    }
}

/**
 * Standalone runner
 */
export async function runTaskMemoryManager(workspacePath: string): Promise<void> {
    const manager = new TaskMemoryManager(workspacePath);
    await manager.run();
}
