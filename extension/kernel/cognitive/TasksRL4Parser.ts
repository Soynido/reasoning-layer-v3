/**
 * TasksRL4Parser
 * 
 * Parse Tasks.RL4 pour extraire les markers RL4 :
 * - @rl4:id <task-id>
 * - @rl4:completeWhen <condition>
 * 
 * Retourne une structure exploitable par TaskVerificationEngine.
 */

export interface TaskRL4Marker {
    id: string;
    completeWhen: string[];
    rawText: string;
    lineNumber: number;
}

export class TasksRL4Parser {
    /**
     * Parse le contenu de Tasks.RL4 et extrait tous les markers @rl4:id / @rl4:completeWhen
     */
    public static parse(content: string): TaskRL4Marker[] {
        const lines = content.split('\n');
        const tasks: TaskRL4Marker[] = [];
        let currentTask: Partial<TaskRL4Marker> | null = null;
        let currentLineNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            currentLineNumber = i + 1;

            // Détection @rl4:id
            const idMatch = line.match(/@rl4:id\s+(\S+)/);
            if (idMatch) {
                // Si on avait une tâche en cours, on la finalise
                if (currentTask && currentTask.id) {
                    tasks.push(currentTask as TaskRL4Marker);
                }

                // Nouvelle tâche
                currentTask = {
                    id: idMatch[1],
                    completeWhen: [],
                    rawText: line,
                    lineNumber: currentLineNumber
                };
                continue;
            }

            // Détection @rl4:completeWhen
            const completeWhenMatch = line.match(/@rl4:completeWhen\s+(.+)/);
            if (completeWhenMatch && currentTask) {
                const condition = completeWhenMatch[1].trim();
                currentTask.completeWhen = currentTask.completeWhen || [];
                currentTask.completeWhen.push(condition);
                currentTask.rawText += '\n' + line;
            }

            // Accumulation du texte brut de la tâche (pour contexte)
            if (currentTask && !idMatch && !completeWhenMatch) {
                if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
                    currentTask.rawText += '\n' + line;
                }
            }
        }

        // Finaliser la dernière tâche
        if (currentTask && currentTask.id) {
            tasks.push(currentTask as TaskRL4Marker);
        }

        return tasks;
    }

    /**
     * Trouve une tâche par son ID
     */
    public static findTaskById(tasks: TaskRL4Marker[], id: string): TaskRL4Marker | undefined {
        return tasks.find(task => task.id === id);
    }

    /**
     * Find tasks without @rl4:completeWhen marker
     */
    public static findTasksWithoutCompleteWhen(tasks: TaskRL4Marker[]): TaskRL4Marker[] {
        return tasks.filter(task => !task.completeWhen || task.completeWhen.length === 0);
    }

    /**
     * Extract task title from rawText
     */
    public static extractTaskTitle(rawText: string): string {
        // Match pattern: - [ ] [P0] Task title @rl4:id=...
        const match = rawText.match(/^\s*-\s*\[\s*\]\s*\[P\d+\]\s*(.+?)(?:\s+@rl4:)/);
        if (match) {
            return match[1].trim();
        }

        // Fallback: extract first line
        const firstLine = rawText.split('\n')[0].trim();
        // Remove checkboxes and priority markers
        return firstLine
            .replace(/^\s*-\s*\[\s*\]\s*/, '')
            .replace(/\[P\d+\]\s*/, '')
            .replace(/@rl4:\w+.*$/, '')
            .trim();
    }

    /**
     * Vérifie si une condition completeWhen est satisfaite par un événement terminal
     */
    public static checkCondition(condition: string, event: any): boolean {
        const conditionLower = condition.toLowerCase();

        // Patterns de succès
        if (conditionLower.includes('exitcode 0') || conditionLower.includes('exit code 0')) {
            return event.exitCode === 0;
        }

        if (conditionLower.includes('test passing') || conditionLower.includes('tests passing')) {
            return event.output?.toLowerCase().includes('passing') || 
                   event.output?.toLowerCase().includes('test passed');
        }

        if (conditionLower.includes('npm success') || conditionLower.includes('build success')) {
            return event.exitCode === 0 && 
                   (event.output?.toLowerCase().includes('success') || 
                    event.output?.toLowerCase().includes('built'));
        }

        if (conditionLower.includes('file created') || conditionLower.includes('file exists')) {
            // Extrait le nom du fichier de la condition
            const fileMatch = condition.match(/file\s+(?:created|exists):\s*(\S+)/i);
            if (fileMatch && event.type === 'file_created') {
                return event.file === fileMatch[1];
            }
        }

        if (conditionLower.includes('commit created') || conditionLower.includes('git commit')) {
            return event.type === 'git_commit' || 
                   (event.exitCode === 0 && event.command?.includes('git commit'));
        }

        // Pattern générique : recherche de texte dans l'output
        const outputMatch = condition.match(/output contains "(.+?)"/i);
        if (outputMatch && event.output) {
            return event.output.includes(outputMatch[1]);
        }

        return false;
    }
}

