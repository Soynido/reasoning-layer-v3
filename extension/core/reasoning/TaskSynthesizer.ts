/**
 * Task Synthesizer - Level 8.75: Goal-to-Action Conversion
 * 
 * Analyzes goals and synthesizes concrete actionable tasks
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TaskRule {
    action: string;
    engine: string;
    params?: any;
}

export interface SynthesizedTask {
    id: string;
    title: string;
    description: string;
    engine: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
}

export interface GoalTasks {
    goal_id: string;
    objective: string;
    priority: string;
    tasks: SynthesizedTask[];
    created_at: string;
}

interface TaskKnowledgeBase {
    [objectivePattern: string]: TaskRule[];
}

export class TaskSynthesizer {
    private workspaceRoot: string;
    private tasksPath: string;
    private tasksMarkdownPath: string;
    private knowledgeBase: TaskKnowledgeBase;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.tasksPath = path.join(workspaceRoot, '.reasoning', 'tasks.json');
        this.tasksMarkdownPath = path.join(workspaceRoot, '.reasoning', 'ReasoningTasks.md');
        
        // Initialize knowledge base: goal objectives → task rules
        this.knowledgeBase = {
            'Improve pattern diversity': [
                { action: 'Generate pattern mutations', engine: 'PatternMutationEngine' },
                { action: 'Evaluate pattern novelty', engine: 'PatternEvaluator' },
                { action: 'Prune redundant patterns', engine: 'PatternPruner' }
            ],
            'Reduce correlation duplication': [
                { action: 'Apply correlation deduplication', engine: 'CorrelationDeduplicator' },
                { action: 'Analyze correlation patterns', engine: 'CorrelationAnalyzer' }
            ],
            'Reduce thematic bias': [
                { action: 'Implement category diversity limits', engine: 'CategoryLimiter' },
                { action: 'Re-balance historical analysis', engine: 'HistoricalBalancer' }
            ],
            'Build visual dashboard': [
                { action: 'Create timeline visualization', engine: 'TimelineVisualizer' },
                { action: 'Generate pattern graph', engine: 'PatternGraphGenerator' },
                { action: 'Build bias dashboard', engine: 'BiasDashboard' }
            ]
        };
    }

    /**
     * Synthesize tasks from goals
     */
    public async synthesizeTasks(): Promise<GoalTasks[]> {
        console.log('🎯 TaskSynthesizer: Analyzing goals and synthesizing tasks...');

        // Load goals
        const goalsPath = path.join(this.workspaceRoot, '.reasoning', 'goals.json');
        if (!fs.existsSync(goalsPath)) {
            console.log('⚠️ No goals.json found');
            return [];
        }

        const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
        const activeGoals = goalsData.active_goals || [];

        if (activeGoals.length === 0) {
            console.log('⚠️ No active goals found');
            return [];
        }

        console.log(`📋 Found ${activeGoals.length} active goals`);

        const synthesizedTasks: GoalTasks[] = [];

        for (const goal of activeGoals) {
            const tasks = this.generateTasksForGoal(goal);
            
            if (tasks.length > 0) {
                synthesizedTasks.push({
                    goal_id: goal.id,
                    objective: goal.objective,
                    priority: goal.priority,
                    tasks: tasks,
                    created_at: new Date().toISOString()
                });
            }
        }

        // Save to JSON
        await this.saveTasks(synthesizedTasks);

        // Generate markdown report
        await this.generateMarkdownReport(synthesizedTasks);

        console.log(`✅ TaskSynthesizer: Generated ${synthesizedTasks.length} goal task sets`);
        return synthesizedTasks;
    }

    /**
     * Generate tasks for a specific goal
     */
    private generateTasksForGoal(goal: any): SynthesizedTask[] {
        const tasks: SynthesizedTask[] = [];
        const baseTimestamp = Date.now();

        // Find matching rules in knowledge base
        const matchingRules = this.knowledgeBase[goal.objective] || [];

        if (matchingRules.length === 0) {
            console.log(`⚠️ No task rules found for: ${goal.objective}`);
            return [];
        }

        // Convert rules to tasks
        let taskIndex = 1;
        for (const rule of matchingRules) {
            const task: SynthesizedTask = {
                id: `task-${baseTimestamp}-${taskIndex}`,
                title: rule.action,
                description: this.generateTaskDescription(rule, goal),
                engine: rule.engine,
                status: 'pending',
                priority: this.mapGoalPriority(goal.priority),
                created_at: new Date().toISOString()
            };
            tasks.push(task);
            taskIndex++;
        }

        return tasks;
    }

    /**
     * Generate descriptive task description
     */
    private generateTaskDescription(rule: TaskRule, goal: any): string {
        const baseDescription = rule.action;
        const rationale = goal.rationale?.[0] || '';
        
        // Add context-specific details
        if (goal.objective === 'Improve pattern diversity') {
            return `${baseDescription} - Target: generate 5+ new patterns with novelty score >0.6`;
        }
        
        if (goal.objective === 'Reduce correlation duplication') {
            return `${baseDescription} - Remove duplicate correlations from current analysis`;
        }
        
        if (goal.objective === 'Reduce thematic bias') {
            return `${baseDescription} - Limit forecasts to 3 per category`;
        }
        
        return baseDescription;
    }

    /**
     * Map goal priority to task priority
     */
    private mapGoalPriority(goalPriority: string): 'low' | 'medium' | 'high' {
        if (goalPriority === 'critical' || goalPriority === 'high') return 'high';
        if (goalPriority === 'medium') return 'medium';
        return 'low';
    }

    /**
     * Save tasks to JSON
     */
    private async saveTasks(tasks: GoalTasks[]): Promise<void> {
        const data = {
            generated_at: new Date().toISOString(),
            goals: tasks,
            total_tasks: tasks.reduce((sum, g) => sum + g.tasks.length, 0)
        };

        fs.writeFileSync(
            this.tasksPath,
            JSON.stringify(data, null, 2),
            'utf-8'
        );
    }

    /**
     * Generate human-readable markdown report
     */
    private async generateMarkdownReport(tasks: GoalTasks[]): Promise<void> {
        let markdown = `# 🎯 Reasoning Tasks - Auto-Generated\n\n`;
        markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
        markdown += `This file contains all synthesized tasks derived from active goals.\n\n`;

        for (const goalTasks of tasks) {
            markdown += `## Goal: ${goalTasks.objective}\n\n`;
            markdown += `**Priority:** ${goalTasks.priority.toUpperCase()}\n`;
            markdown += `**Goal ID:** ${goalTasks.goal_id}\n\n`;

            if (goalTasks.tasks.length === 0) {
                markdown += `*No tasks generated for this goal.*\n\n`;
                continue;
            }

            for (const task of goalTasks.tasks) {
                const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
                const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                
                markdown += `- ${checkbox} ${priorityEmoji} **${task.title}**\n`;
                markdown += `  - *Engine:* ${task.engine}\n`;
                markdown += `  - *Status:* ${task.status}\n`;
                markdown += `  - *Description:* ${task.description}\n\n`;
            }
        }

        fs.writeFileSync(this.tasksMarkdownPath, markdown, 'utf-8');
    }
}
