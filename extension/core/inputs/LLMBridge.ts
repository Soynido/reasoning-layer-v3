import * as https from 'https';
import * as process from 'process';

/**
 * LLMBridge - Bridge between RL3 and external LLM APIs
 * 
 * Integrates with:
 * - Anthropic Claude API
 * - OpenAI GPT API
 * 
 * Features:
 * - Real-time logging to RL3 console
 * - Auto-detection of available provider
 * - Graceful error handling
 * - Performance metrics
 */

export interface LLMIntentResult {
    intent: string;
    confidence: number;
    entities?: Record<string, any>;
    reasoning?: string;
    provider?: string;
    error?: string;
    duration?: number;
}

export class LLMBridge {
    private provider: 'anthropic' | 'openai' | 'none' = 'none';
    private apiKey: string | null = null;

    constructor() {
        // Auto-detect provider from environment variables
        if (process.env.ANTHROPIC_API_KEY) {
            this.provider = 'anthropic';
            this.apiKey = process.env.ANTHROPIC_API_KEY;
            this.log('🤖', `LLMBridge: Anthropic provider detected`);
        } else if (process.env.OPENAI_API_KEY) {
            this.provider = 'openai';
            this.apiKey = process.env.OPENAI_API_KEY;
            this.log('🤖', `LLMBridge: OpenAI provider detected`);
        } else {
            this.log('⚙️', `LLMBridge: Offline mode (no API key found)`);
        }
    }

    /**
     * Interpret natural language phrase using LLM
     */
    public async interpret(phrase: string): Promise<LLMIntentResult> {
        const start = Date.now();

        if (this.provider === 'none' || !this.apiKey) {
            this.log('🌐', 'LLMBridge: offline mode (no API key)');
            return {
                intent: 'unknown',
                confidence: 0.0,
                provider: 'offline'
            };
        }

        this.log('🌐', `LLMBridge: Sending prompt → ${this.provider}`);
        this.log('📝', `Prompt: "${phrase.substring(0, 60)}${phrase.length > 60 ? '...' : ''}"`);

        try {
            const response = await this.queryAPI(phrase);
            const duration = Date.now() - start;

            this.log('🤖', `LLMBridge (${this.provider}) responded in ${duration}ms`);
            this.log('→', `Parsed intent: ${response.intent} (${(response.confidence * 100).toFixed(1)}% confidence)`);

            return {
                ...response,
                provider: this.provider,
                duration
            };
        } catch (err: any) {
            const duration = Date.now() - start;
            this.log('❌', `LLMBridge Error: ${err.message} (after ${duration}ms)`);
            return {
                intent: 'unknown',
                confidence: 0.0,
                provider: this.provider,
                error: err.message,
                duration
            };
        }
    }

    /**
     * Query the appropriate API based on provider
     */
    private async queryAPI(prompt: string): Promise<LLMIntentResult> {
        if (this.provider === 'anthropic') {
            return this.queryAnthropic(prompt);
        }
        if (this.provider === 'openai') {
            return this.queryOpenAI(prompt);
        }
        return { intent: 'unknown', confidence: 0.0 };
    }

    /**
     * Query Anthropic Claude API
     */
    private queryAnthropic(prompt: string): Promise<LLMIntentResult> {
        return new Promise((resolve, reject) => {
            const systemPrompt = this.buildSystemPrompt();
            
            const body = JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 256,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: `Phrase: """${prompt}"""` }
                ]
            });

            const req = https.request({
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey!,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                },
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            reject(new Error(`Anthropic API error: ${parsed.error.message}`));
                            return;
                        }
                        const text = parsed.content?.[0]?.text || '{}';
                        const json = JSON.parse(text);
                        resolve(json);
                    } catch (err: any) {
                        reject(new Error(`Invalid Anthropic response: ${err.message}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`HTTP request failed: ${err.message}`));
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Query OpenAI GPT API
     */
    private queryOpenAI(prompt: string): Promise<LLMIntentResult> {
        return new Promise((resolve, reject) => {
            const systemPrompt = this.buildSystemPrompt();
            
            const body = JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 256,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Phrase: """${prompt}"""` }
                ],
                temperature: 0.3
            });

            const req = https.request({
                hostname: 'api.openai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                },
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            reject(new Error(`OpenAI API error: ${parsed.error.message}`));
                            return;
                        }
                        const text = parsed.choices?.[0]?.message?.content || '{}';
                        const json = JSON.parse(text);
                        resolve(json);
                    } catch (err: any) {
                        reject(new Error(`Invalid OpenAI response: ${err.message}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`HTTP request failed: ${err.message}`));
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Build system prompt for LLM
     */
    private buildSystemPrompt(): string {
        return `You are the linguistic interpretation engine for Reasoning Layer V3 (RL3), an autonomous cognitive system.

Your task: Analyze natural language phrases and return a JSON object with:
{
  "intent": "...",        // action to execute (see list below)
  "confidence": 0.0-1.0,  // your confidence in the interpretation
  "entities": { ... },    // detected entities (files, concepts, steps)
  "reasoning": "..."      // brief explanation of your interpretation
}

Available intents:
- "status": User asks about system state
- "analyze": User wants to analyze something
- "synthesize": User wants a synthesis/summary
- "roadmap": User asks for next steps, priorities, or roadmap
- "task": User asks about tasks or TODOs
- "help": User needs help
- "context": User asks about current context
- "history": User wants to see history
- "patterns": User asks about detected patterns
- "correlations": User asks about correlations
- "adrs": User asks about architectural decisions
- "go": User wants to execute autonomous actions
- "reflect": User wants daily reflection
- "repository": User asks about the connected repository
- "git": User asks about Git status
- "package": User asks about packages/dependencies
- "file": User wants to analyze a file
- "unknown": Cannot determine intent

Languages supported: French, English, Spanish, German, Italian, Portuguese

Important:
- Return ONLY valid JSON, no markdown, no code blocks
- Be flexible with verb forms (identifier/identifie, analyser/analyse)
- Detect entities like file paths, dates, priorities (P0/P1/P2)
- High confidence (>0.8) for clear intents, lower for ambiguous phrases`;
    }

    /**
     * Check if LLM is available
     */
    public isAvailable(): boolean {
        return this.provider !== 'none' && !!this.apiKey;
    }

    /**
     * Get current provider
     */
    public getProvider(): string {
        return this.provider;
    }

    /**
     * Log message with timestamp
     */
    private log(emoji: string, message: string): void {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${emoji} ${message}`);
    }
}
