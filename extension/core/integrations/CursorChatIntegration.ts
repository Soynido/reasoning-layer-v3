import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { UnifiedLogger } from '../UnifiedLogger';

/**
 * Cursor Chat Integration - Bi-directional context sync
 * 
 * Hook 1: QueryContext() - Cursor reads RL3 cognitive context
 * Hook 2: LogInteraction() - RL3 logs chat exchanges
 */

interface CognitiveContext {
    summary: string;
    confidence: number;
    goals: Array<{
        id: string;
        objective: string;
        priority: string;
        confidence: number;
    }>;
    last_decision: string;
    recent_events: number;
    patterns_count: number;
    adrs_count: number;
}

export class CursorChatIntegration {
    private workspaceRoot: string;
    private logger: UnifiedLogger;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logger = UnifiedLogger.getInstance();
    }

    /**
     * Hook 1: QueryContext() - Read current cognitive context
     * Called by Cursor before each AI request
     */
    public queryContext(): CognitiveContext {
        try {
            const contextPath = path.join(this.workspaceRoot, '.reasoning', 'current-context.json');
            const manifestPath = path.join(this.workspaceRoot, '.reasoning', 'manifest.json');
            const goalsPath = path.join(this.workspaceRoot, '.reasoning', 'goals.json');
            const patternsPath = path.join(this.workspaceRoot, '.reasoning', 'patterns.json');
            const adrsPath = path.join(this.workspaceRoot, '.reasoning', 'adrs', 'index.json');

            // Load context file
            let context: any = {};
            if (fs.existsSync(contextPath)) {
                context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
            }

            // Load manifest for total events
            let totalEvents = 0;
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                totalEvents = manifest.totalEvents || 0;
            }

            // Load goals
            let goals: any[] = [];
            if (fs.existsSync(goalsPath)) {
                const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
                goals = goalsData.active_goals || [];
            }

            // Count patterns and ADRs
            let patternsCount = 0;
            if (fs.existsSync(patternsPath)) {
                const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
                patternsCount = patternsData.patterns ? patternsData.patterns.length : 0;
            }

            let adrsCount = 0;
            if (fs.existsSync(adrsPath)) {
                const adrsIndex = JSON.parse(fs.readFileSync(adrsPath, 'utf-8'));
                adrsCount = adrsIndex.adrIds ? adrsIndex.adrIds.length : 0;
            }

            // Get last decision from recent ADRs
            const lastDecision = this.getLastDecision();

            return {
                summary: context.summary || 'No summary yet',
                confidence: context.confidence || 0.5,
                goals: goals.map((g: any) => ({
                    id: g.id,
                    objective: g.objective,
                    priority: g.priority,
                    confidence: g.confidence
                })),
                last_decision: lastDecision,
                recent_events: totalEvents,
                patterns_count: patternsCount,
                adrs_count: adrsCount
            };
        } catch (error) {
            this.logger.warn(`Failed to query context: ${error}`);
            return {
                summary: 'Reasoning Layer not initialized',
                confidence: 0.0,
                goals: [],
                last_decision: 'N/A',
                recent_events: 0,
                patterns_count: 0,
                adrs_count: 0
            };
        }
    }

    /**
     * Hook 2: LogInteraction() - Log chat interactions
     * Called by Cursor after each AI response
     */
    public async logInteraction(prompt: string, response: string): Promise<void> {
        try {
            // 🚫 Ignore corrupted or recursive content
            if (!prompt || !response) {
                this.logger.warn('logInteraction called with empty prompt or response');
                return;
            }

            // 🛡️ Anti-recursion: ignore RL3 internal messages
            if (prompt.includes('[RL3]') || response.includes('[RL3]') || 
                prompt.includes('Reasoning Layer') || response.includes('Reasoning Layer')) {
                this.logger.warn('⚠️ Skipping recursive RL3 log to prevent loop');
                return;
            }

            // 🧹 Sanitize: remove binary-like or non-printable characters
            const sanitize = (text: string) => {
                return text.replace(/[^\x20-\x7E\n\t]+/g, '').slice(0, 5000);
            };

            const tracesDir = path.join(this.workspaceRoot, '.reasoning', 'traces');
            if (!fs.existsSync(tracesDir)) {
                fs.mkdirSync(tracesDir, { recursive: true });
            }

            const today = new Date().toISOString().split('T')[0];
            const traceFile = path.join(tracesDir, `${today}.json`);

            const entry = {
                id: `chat-${Date.now()}`,
                type: 'chat_interaction',
                timestamp: new Date().toISOString(),
                source: 'cursor_chat',
                metadata: {
                    category: 'Interaction',
                    level: '3 - Strategic & Contextual',
                    prompt_length: sanitize(prompt).length,
                    response_length: sanitize(response).length,
                    prompt_preview: sanitize(prompt).substring(0, 100),
                    response_preview: sanitize(response).substring(0, 100)
                },
                prompt: sanitize(prompt),
                response: sanitize(response)
            };

            // Append to today's trace
            let existing: any[] = [];
            if (fs.existsSync(traceFile)) {
                existing = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
            }

            existing.push(entry);
            fs.writeFileSync(traceFile, JSON.stringify(existing, null, 2), 'utf-8');

            this.logger.log(`💬 Logged chat interaction [${entry.id}] (${entry.metadata.prompt_length} chars)`);
        } catch (error) {
            this.logger.warn(`Failed to log chat interaction: ${error}`);
            console.error('CursorChatIntegration.logInteraction error:', error);
        }
    }

    /**
     * Get the last decision from recent ADRs
     */
    private getLastDecision(): string {
        try {
            const adrsDir = path.join(this.workspaceRoot, '.reasoning', 'adrs');
            if (!fs.existsSync(adrsDir)) {
                return 'No ADRs yet';
            }

            const files = fs.readdirSync(adrsDir)
                .filter(f => f.endsWith('.json') && f.startsWith('ADR-'))
                .sort()
                .reverse();

            if (files.length === 0) {
                return 'No ADRs yet';
            }

            // Try to read the most recent ADR
            const mostRecent = files[0];
            const adrFile = path.join(adrsDir, mostRecent);
            const adr = JSON.parse(fs.readFileSync(adrFile, 'utf-8'));

            return adr.title || adr.id || 'Unknown decision';
        } catch (error) {
            return 'N/A';
        }
    }

    /**
     * Get context as formatted string for Cursor
     */
    public getContextString(): string {
        const ctx = this.queryContext();
        return `
🧠 REASONING LAYER V3 — Cognitive Context

📊 Summary: ${ctx.summary}
🎯 Confidence: ${(ctx.confidence * 100).toFixed(1)}%
📈 Total Events: ${ctx.recent_events}
🔍 Patterns Detected: ${ctx.patterns_count}
📝 ADRs Generated: ${ctx.adrs_count}

🎯 Active Goals (${ctx.goals.length}):
${ctx.goals.map(g => `  • ${g.objective} (${g.priority}, conf: ${g.confidence.toFixed(2)})`).join('\n')}

📋 Last Decision: ${ctx.last_decision}
`;
    }
}

/**
 * Export singleton instance
 */
export function getCursorChatIntegration(workspaceRoot: string): CursorChatIntegration {
    return new CursorChatIntegration(workspaceRoot);
}

