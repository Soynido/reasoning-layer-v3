/**
 * TaskVerificationEngine
 * 
 * Moteur de vérification automatique des tâches basé sur :
 * - Lecture de `.reasoning_rl4/terminal-events.jsonl`
 * - Parsing de `Tasks.RL4` avec markers @rl4:id / @rl4:completeWhen
 * - Matching des conditions avec les événements terminaux
 * 
 * Principe : RL4 PROPOSE, ne modifie JAMAIS automatiquement.
 * -> Envoie des suggestions "Mark as Done" à l'UI.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { TasksRL4Parser, TaskRL4Marker } from './TasksRL4Parser';

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

export interface TaskVerificationResult {
    taskId: string;
    verified: boolean;
    verifiedAt?: string;
    matchedConditions: string[];
    matchedEvents: TerminalEvent[];
    confidence: 'low' | 'medium' | 'high';
    suggestion: string;
}

export class TaskVerificationEngine {
    private workspaceRoot: string;
    private terminalEventsPath: string;
    private tasksRL4Path: string;
    private tasks: TaskRL4Marker[] = [];
    private lastProcessedLine = 0;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.terminalEventsPath = path.join(workspaceRoot, '.reasoning_rl4', 'terminal-events.jsonl');
        this.tasksRL4Path = path.join(workspaceRoot, '.reasoning_rl4', 'Tasks.RL4');
    }

    /**
     * Initialise le moteur : parse Tasks.RL4
     */
    public async initialize(): Promise<void> {
        await this.reloadTasks();
    }

    /**
     * Recharge les tâches depuis Tasks.RL4
     */
    public async reloadTasks(): Promise<void> {
        if (!fs.existsSync(this.tasksRL4Path)) {
            this.tasks = [];
            return;
        }

        const content = fs.readFileSync(this.tasksRL4Path, 'utf-8');
        this.tasks = TasksRL4Parser.parse(content);
    }

    /**
     * Vérifie toutes les tâches en fonction des événements terminaux récents
     */
    public async verifyAllTasks(): Promise<TaskVerificationResult[]> {
        await this.reloadTasks();

        if (this.tasks.length === 0) {
            return [];
        }

        if (!fs.existsSync(this.terminalEventsPath)) {
            return [];
        }

        // Lire tous les événements depuis la dernière vérification
        const events = await this.readTerminalEvents();

        // Pour chaque tâche, vérifier si les conditions sont satisfaites
        const results: TaskVerificationResult[] = [];

        for (const task of this.tasks) {
            const result = this.verifyTask(task, events);
            if (result.verified) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Vérifie une tâche spécifique
     */
    private verifyTask(task: TaskRL4Marker, events: TerminalEvent[]): TaskVerificationResult {
        const matchedConditions: string[] = [];
        const matchedEvents: TerminalEvent[] = [];

        // Si aucune condition @rl4:completeWhen, on ne peut pas vérifier
        if (!task.completeWhen || task.completeWhen.length === 0) {
            return {
                taskId: task.id,
                verified: false,
                matchedConditions: [],
                matchedEvents: [],
                confidence: 'low',
                suggestion: 'No @rl4:completeWhen condition defined'
            };
        }

        // Pour chaque condition, chercher un événement qui la satisfait
        for (const condition of task.completeWhen) {
            for (const event of events) {
                // Si l'événement a un taskId explicite, vérifier la correspondance
                if (event.taskId && event.taskId !== task.id) {
                    continue;
                }

                if (TasksRL4Parser.checkCondition(condition, event)) {
                    matchedConditions.push(condition);
                    matchedEvents.push(event);
                    break; // Une condition satisfaite suffit
                }
            }
        }

        // Si au moins une condition est satisfaite, la tâche est vérifiée
        const verified = matchedConditions.length > 0;
        const confidence = this.calculateConfidence(matchedConditions.length, task.completeWhen.length, matchedEvents);

        let suggestion = '';
        if (verified) {
            suggestion = `Task verified: ${matchedConditions.length}/${task.completeWhen.length} conditions met. Suggest marking as done.`;
        }

        return {
            taskId: task.id,
            verified,
            verifiedAt: verified ? new Date().toISOString() : undefined,
            matchedConditions,
            matchedEvents,
            confidence,
            suggestion
        };
    }

    /**
     * Calcule le niveau de confiance de la vérification
     */
    private calculateConfidence(
        matchedCount: number,
        totalConditions: number,
        events: TerminalEvent[]
    ): 'low' | 'medium' | 'high' {
        const ratio = matchedCount / totalConditions;

        // High: Toutes les conditions satisfaites + exitCode 0
        if (ratio === 1 && events.some(e => e.exitCode === 0)) {
            return 'high';
        }

        // Medium: Au moins 50% des conditions satisfaites
        if (ratio >= 0.5) {
            return 'medium';
        }

        // Low: Moins de 50%
        return 'low';
    }

    /**
     * Lit les événements terminaux depuis terminal-events.jsonl
     */
    private async readTerminalEvents(): Promise<TerminalEvent[]> {
        const events: TerminalEvent[] = [];

        if (!fs.existsSync(this.terminalEventsPath)) {
            return events;
        }

        const fileStream = fs.createReadStream(this.terminalEventsPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let lineNumber = 0;
        for await (const line of rl) {
            lineNumber++;

            // Ignorer les lignes déjà traitées
            if (lineNumber <= this.lastProcessedLine) {
                continue;
            }

            if (line.trim().length === 0) {
                continue;
            }

            try {
                const event = JSON.parse(line) as TerminalEvent;
                events.push(event);
            } catch (error) {
                // Ligne malformée, on continue
                console.warn(`Failed to parse terminal event at line ${lineNumber}:`, error);
            }
        }

        // Mettre à jour la dernière ligne traitée
        this.lastProcessedLine = lineNumber;

        return events;
    }

    /**
     * Réinitialise le curseur de lecture (pour re-traiter tous les événements)
     */
    public resetCursor(): void {
        this.lastProcessedLine = 0;
    }

    /**
     * Obtient toutes les tâches avec leurs markers
     */
    public getTasks(): TaskRL4Marker[] {
        return this.tasks;
    }
}

