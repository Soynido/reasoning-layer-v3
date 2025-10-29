import * as fs from 'fs';
import * as path from 'path';

/**
 * ConversationLogger - Memory Layer Component
 * 
 * Logs all conversations (input/output) for reflection and learning.
 * Stores conversations in .reasoning/conversations/YYYY-MM-DD.log
 * 
 * Features:
 * - JSON format structured logging
 * - Daily rotation (one file per day)
 * - Automatic language detection
 * - Intent tracking
 * - Confidence tracking
 * - Reasoning capture
 */
export class ConversationLogger {
    private workspaceRoot: string;
    private conversationsDir: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.conversationsDir = path.join(workspaceRoot, '.reasoning', 'conversations');
        
        // Ensure conversations directory exists
        if (!fs.existsSync(this.conversationsDir)) {
            fs.mkdirSync(this.conversationsDir, { recursive: true });
        }
    }

    /**
     * Log a conversation entry
     */
    public logConversation(entry: ConversationEntry): void {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.conversationsDir, `${today}.log`);

        // Load existing entries
        let entries: ConversationEntry[] = [];
        if (fs.existsSync(logFile)) {
            try {
                const content = fs.readFileSync(logFile, 'utf-8');
                // Handle both JSON array and line-delimited JSON
                if (content.trim().startsWith('[')) {
                    entries = JSON.parse(content);
                } else {
                    // Line-delimited JSON
                    const lines = content.trim().split('\n').filter(l => l);
                    entries = lines.map(l => JSON.parse(l));
                }
            } catch (error) {
                // If corrupted, start fresh
                entries = [];
            }
        }

        // Add new entry
        entries.push(entry);

        // Save (line-delimited JSON for easy streaming)
        const lines = entries.map(e => JSON.stringify(e, null, 0));
        fs.writeFileSync(logFile, lines.join('\n') + '\n', 'utf-8');
    }

    /**
     * Get today's conversations
     */
    public getTodayConversations(): ConversationEntry[] {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.conversationsDir, `${today}.log`);

        if (!fs.existsSync(logFile)) {
            return [];
        }

        try {
            const content = fs.readFileSync(logFile, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);
            return lines.map(l => JSON.parse(l));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get conversations for a specific date
     */
    public getConversationsForDate(date: string): ConversationEntry[] {
        const logFile = path.join(this.conversationsDir, `${date}.log`);

        if (!fs.existsSync(logFile)) {
            return [];
        }

        try {
            const content = fs.readFileSync(logFile, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);
            return lines.map(l => JSON.parse(l));
        } catch (error) {
            return [];
        }
    }

    /**
     * Analyze conversations for reflection
     */
    public analyzeConversations(entries: ConversationEntry[]): ConversationAnalysis {
        const analysis: ConversationAnalysis = {
            totalConversations: entries.length,
            intentsFrequency: {},
            languagesFrequency: {},
            averageConfidence: 0,
            confusionPatterns: [],
            peakHours: {},
            intentErrors: []
        };

        if (entries.length === 0) {
            return analysis;
        }

        let totalConfidence = 0;

        for (const entry of entries) {
            // Intent frequency
            const intent = entry.intent || 'unknown';
            analysis.intentsFrequency[intent] = (analysis.intentsFrequency[intent] || 0) + 1;

            // Language frequency
            const lang = entry.detectedLanguage || 'unknown';
            analysis.languagesFrequency[lang] = (analysis.languagesFrequency[lang] || 0) + 1;

            // Confidence
            if (entry.confidence) {
                totalConfidence += entry.confidence;
            }

            // Peak hours
            const hour = new Date(entry.timestamp).getHours();
            analysis.peakHours[hour] = (analysis.peakHours[hour] || 0) + 1;

            // Intent errors (low confidence)
            if (entry.confidence && entry.confidence < 0.5) {
                analysis.intentErrors.push({
                    input: entry.input,
                    detectedIntent: intent,
                    confidence: entry.confidence,
                    timestamp: entry.timestamp
                });
            }
        }

        analysis.averageConfidence = totalConfidence / entries.length;

        // Detect confusion patterns (multiple intents for similar inputs)
        const inputGroups = new Map<string, string[]>();
        for (const entry of entries) {
            const normalized = entry.input.toLowerCase().trim();
            if (!inputGroups.has(normalized)) {
                inputGroups.set(normalized, []);
            }
            const intents = inputGroups.get(normalized)!;
            if (entry.intent && !intents.includes(entry.intent)) {
                intents.push(entry.intent);
            }
        }

        for (const [input, intents] of inputGroups.entries()) {
            if (intents.length > 1) {
                analysis.confusionPatterns.push({
                    input,
                    conflictingIntents: intents
                });
            }
        }

        return analysis;
    }

    /**
     * Get stats
     */
    public getStats(): LoggerStats {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = this.getTodayConversations();

        // Count total files
        let totalFiles = 0;
        let totalEntries = 0;
        if (fs.existsSync(this.conversationsDir)) {
            const files = fs.readdirSync(this.conversationsDir).filter(f => f.endsWith('.log'));
            totalFiles = files.length;
            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(this.conversationsDir, file), 'utf-8');
                    const lines = content.trim().split('\n').filter(l => l);
                    totalEntries += lines.length;
                } catch (error) {
                    // Ignore corrupted files
                }
            }
        }

        return {
            todayConversations: todayEntries.length,
            totalConversations: totalEntries,
            totalFiles,
            conversationsDir: this.conversationsDir
        };
    }
}

/**
 * Types
 */
export interface ConversationEntry {
    timestamp: string; // ISO 8601
    input: string;
    intent?: string;
    detectedLanguage?: string;
    confidence?: number;
    reasoning?: string;
    responseType?: string;
    responseSummary?: string;
    sessionId?: string;
}

export interface ConversationAnalysis {
    totalConversations: number;
    intentsFrequency: Record<string, number>;
    languagesFrequency: Record<string, number>;
    averageConfidence: number;
    confusionPatterns: ConfusionPattern[];
    peakHours: Record<number, number>;
    intentErrors: IntentError[];
}

export interface ConfusionPattern {
    input: string;
    conflictingIntents: string[];
}

export interface IntentError {
    input: string;
    detectedIntent: string;
    confidence: number;
    timestamp: string;
}

export interface LoggerStats {
    todayConversations: number;
    totalConversations: number;
    totalFiles: number;
    conversationsDir: string;
}

