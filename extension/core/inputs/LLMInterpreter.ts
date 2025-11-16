import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * LLMInterpreter - Linguistic Bridge for Natural Language Understanding
 * 
 * Interprets natural language (multilingual) into structured intentions.
 * Acts as a pure interpreter - no execution, only intent classification.
 * 
 * Features:
 * - Multilingual support (FR, EN, ES, DE, IT, PT, etc.)
 * - Intent classification (status, analyze, synthesize, go, help, etc.)
 * - Context-aware interpretation (uses traces, ADRs, patterns)
 * - Confidence scoring (0-1)
 * - Reasoning extraction (why this intent)
 * 
 * Security: 
 * - LLM only interprets, never executes
 * - RL3 executes actions locally
 * - No API calls without explicit configuration
 */
export class LLMInterpreter {
    private workspaceRoot: string;
    private contextCache: string | null = null;
    private lastContextUpdate: number = 0;
    private readonly CONTEXT_CACHE_TTL = 60000; // 1 minute
    private llmBridge: any; // Optional LLMBridge for semantic understanding

    // Intent mapping patterns (multilingual)
    private readonly INTENT_PATTERNS: Record<string, { keywords: string[], languages: string[] }> = {
        status: {
            keywords: ['status', 'état', 'state', 'where', 'où', 'situation', 'situación', 'zustand', 'stato'],
            languages: ['en', 'fr', 'es', 'de', 'it']
        },
        analyze: {
            keywords: ['analyze', 'analyse', 'analizar', 'analysiere', 'analizza', 'analisar', 'exam', 'examine', 'examiner', 'examinar'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        synthesize: {
            keywords: ['synthesize', 'synthèse', 'síntesis', 'synthese', 'sintetizzare', 'sintetizar', 'generate', 'générer', 'generar'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        go: {
            keywords: ['go', 'vas', 'allez', 'vamos', 'gehen', 'vai', 'execute', 'exécuter', 'ejecutar', 'ausführen'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        help: {
            keywords: ['help', 'aide', 'ayuda', 'hilfe', 'aiuto', 'ajuda', 'assist', 'assister', 'asistir', 'assistieren'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        context: {
            keywords: ['context', 'contexte', 'contexto', 'kontext', 'contesto', 'contexto'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        history: {
            keywords: ['history', 'historique', 'historial', 'verlauf', 'storia', 'histórico'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        patterns: {
            keywords: ['patterns', 'motifs', 'patrones', 'muster', 'modelli', 'padrões'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        correlations: {
            keywords: ['correlations', 'corrélations', 'correlaciones', 'korrelationen', 'correlazioni', 'correlações'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        adrs: {
            keywords: ['adr', 'decisions', 'décisions', 'decisiones', 'entscheidungen', 'decisioni', 'decisões'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        task: {
            keywords: ['task', 'tâche', 'tarea', 'aufgabe', 'compito', 'tarefa', 'todo', 'à faire', 'por hacer', 'zu tun'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        },
        plan: {
            keywords: ['plan', 'planner', 'planificar', 'planen', 'pianificare', 'planejar'],
            languages: ['en', 'fr', 'es', 'de', 'it', 'pt']
        }
    };

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        
        // Try to initialize LLMBridge (optional, requires API keys)
        try {
            const { LLMBridge } = require('./LLMBridge');
            this.llmBridge = new LLMBridge();
            if (this.llmBridge.isAvailable()) {
                console.log(`🤖 LLMInterpreter: ${this.llmBridge.getProvider()} bridge initialized`);
            } else {
                console.log('📋 LLMInterpreter: Running in offline mode (no API key found)');
                this.llmBridge = null;
            }
        } catch (error) {
            console.log('📋 LLMInterpreter: Running in offline mode (pattern matching only)');
            this.llmBridge = null;
        }
    }

    /**
     * Interpret natural language input (multilingual)
     * 
     * @param input Natural language input (any language)
     * @param useLLM If true, uses external LLM API (requires configuration)
     * @returns Structured intent with confidence and reasoning
     */
    public async interpret(input: string, useLLM: boolean = false): Promise<InterpretationResult> {
        // Clean input
        const cleanInput = input.trim().toLowerCase();

        if (!cleanInput) {
            return {
                intent: 'unknown',
                confidence: 0,
                reasoning: 'Empty input',
                detectedLanguage: 'unknown',
                originalInput: input
            };
        }

        // Detect language
        const detectedLanguage = this.detectLanguage(cleanInput);

        // Method 1: Pattern matching (fast, offline, multilingual)
        const patternMatch = this.matchPatterns(cleanInput, detectedLanguage);

        // Method 2: LLM interpretation (automatic if confidence < 0.7 and bridge available)
        if (this.llmBridge && patternMatch.confidence < 0.7) {
            try {
                const llmResult = await this.llmBridge.interpret(input);
                
                // Use LLM if confidence higher and intent valid
                if (llmResult.confidence > patternMatch.confidence && llmResult.intent !== 'unknown') {
                    return {
                        intent: llmResult.intent,
                        confidence: llmResult.confidence,
                        reasoning: llmResult.reasoning || 'LLM semantic interpretation',
                        detectedLanguage,
                        originalInput: input,
                        entities: llmResult.entities,
                        provider: this.llmBridge.getProvider()
                    };
                }
            } catch (error) {
                console.warn('⚠️ LLM interpretation failed, using pattern matching:', error);
            }
        }
        
        // Method 3: Legacy LLM interpretation (if explicitly requested)
        if (useLLM && this.isLLMConfigured()) {
            const llmInterpretation = await this.interpretViaLLM(cleanInput, detectedLanguage);
            
            // Use LLM if confidence higher
            if (llmInterpretation.confidence > patternMatch.confidence) {
                return llmInterpretation;
            }
        }

        return {
            ...patternMatch,
            detectedLanguage,
            originalInput: input
        };
    }

    /**
     * Detect input language (simple heuristic)
     */
    private detectLanguage(input: string): string {
        // Common words per language
        const languageIndicators: Record<string, string[]> = {
            'fr': ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'est', 'sont', 'avec', 'pour', 'dans'],
            'en': ['the', 'is', 'are', 'with', 'for', 'and', 'or', 'this', 'that', 'what', 'where', 'when'],
            'es': ['el', 'la', 'los', 'las', 'de', 'un', 'una', 'es', 'son', 'con', 'para', 'en'],
            'de': ['der', 'die', 'das', 'und', 'oder', 'mit', 'für', 'ist', 'sind', 'was', 'wo', 'wann'],
            'it': ['il', 'la', 'lo', 'gli', 'le', 'di', 'un', 'una', 'è', 'sono', 'con', 'per', 'in'],
            'pt': ['o', 'a', 'os', 'as', 'de', 'um', 'uma', 'é', 'são', 'com', 'para', 'em']
        };

        let maxMatches = 0;
        let detectedLang = 'en'; // Default

        for (const [lang, words] of Object.entries(languageIndicators)) {
            const matches = words.filter(word => input.includes(word)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedLang = lang;
            }
        }

        return detectedLang;
    }

    /**
     * Match patterns against intent keywords (multilingual)
     */
    private matchPatterns(input: string, language: string): InterpretationResult {
        let bestMatch: { intent: string; confidence: number } = { intent: 'unknown', confidence: 0 };

        for (const [intent, pattern] of Object.entries(this.INTENT_PATTERNS)) {
            // Check if language is supported
            if (!pattern.languages.includes(language)) {
                continue;
            }

            // Count keyword matches
            const matches = pattern.keywords.filter(keyword => input.includes(keyword)).length;
            
            if (matches > 0) {
                // Calculate confidence: more matches = higher confidence
                const confidence = Math.min(matches / pattern.keywords.length * 2, 0.95);
                
                if (confidence > bestMatch.confidence) {
                    bestMatch = { intent, confidence };
                }
            }
        }

        // Boost confidence for explicit commands (slash commands)
        if (input.startsWith('/')) {
            const command = input.slice(1).split(' ')[0];
            if (this.INTENT_PATTERNS[command]) {
                bestMatch = { intent: command, confidence: 0.99 };
            }
        }

        // Generate reasoning
        const reasoning = this.generateReasoning(bestMatch.intent, input, language);

        return {
            intent: bestMatch.intent,
            confidence: bestMatch.confidence,
            reasoning,
            detectedLanguage: language
        };
    }

    /**
     * Generate reasoning explanation
     */
    private generateReasoning(intent: string, input: string, language: string): string {
        const reasoningMap: Record<string, Record<string, string>> = {
            status: {
                'fr': `L'utilisateur demande un état des lieux global du système.`,
                'en': `User is requesting a global status overview of the system.`,
                'es': `El usuario solicita un resumen global del estado del sistema.`,
                'de': `Der Benutzer fragt nach einem globalen Systemüberblick.`,
                'it': `L'utente richiede un riepilogo globale dello stato del sistema.`,
                'pt': `O usuário está solicitando uma visão geral do status do sistema.`
            },
            analyze: {
                'fr': `L'utilisateur demande une analyse approfondie.`,
                'en': `User is requesting a deep analysis.`,
                'es': `El usuario solicita un análisis profundo.`,
                'de': `Der Benutzer fragt nach einer tiefgreifenden Analyse.`,
                'it': `L'utente richiede un'analisi approfondita.`,
                'pt': `O usuário está solicitando uma análise profunda.`
            },
            synthesize: {
                'fr': `L'utilisateur demande une synthèse ou génération de contenu.`,
                'en': `User is requesting synthesis or content generation.`,
                'es': `El usuario solicita una síntesis o generación de contenido.`,
                'de': `Der Benutzer fragt nach einer Synthese oder Inhaltsgenerierung.`,
                'it': `L'utente richiede una sintesi o generazione di contenuti.`,
                'pt': `O usuário está solicitando síntese ou geração de conteúdo.`
            },
            go: {
                'fr': `L'utilisateur demande l'exécution autonome d'un plan.`,
                'en': `User is requesting autonomous execution of a plan.`,
                'es': `El usuario solicita la ejecución autónoma de un plan.`,
                'de': `Der Benutzer fragt nach autonomer Ausführung eines Plans.`,
                'it': `L'utente richiede l'esecuzione autonoma di un piano.`,
                'pt': `O usuário está solicitando execução autônoma de um plano.`
            }
        };

        const defaultReasoning: Record<string, string> = {
            'fr': `Intention détectée: ${intent}`,
            'en': `Detected intent: ${intent}`,
            'es': `Intención detectada: ${intent}`,
            'de': `Erkannte Absicht: ${intent}`,
            'it': `Intenzione rilevata: ${intent}`,
            'pt': `Intenção detectada: ${intent}`
        };

        if (reasoningMap[intent] && reasoningMap[intent][language]) {
            return reasoningMap[intent][language];
        }

        return defaultReasoning[language] || defaultReasoning['en'];
    }

    /**
     * Interpret via external LLM API (if configured)
     */
    private async interpretViaLLM(input: string, language: string): Promise<InterpretationResult> {
        // TODO: Implement LLM API call (OpenAI, Claude, etc.)
        // For now, return pattern match result
        return this.matchPatterns(input, language);
    }

    /**
     * Check if LLM is configured
     */
    private isLLMConfigured(): boolean {
        // Check for API keys in .reasoning/config.json
        const configPath = path.join(this.workspaceRoot, '.reasoning', 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                return !!(config.llmApiKey || config.openaiApiKey || config.anthropicApiKey);
            } catch (error) {
                return false;
            }
        }
        return false;
    }

    /**
     * Get cognitive context for LLM interpretation
     */
    public getCognitiveContext(): string {
        // Check cache
        const now = Date.now();
        if (this.contextCache && (now - this.lastContextUpdate) < this.CONTEXT_CACHE_TTL) {
            return this.contextCache;
        }

        const reasoningDir = path.join(this.workspaceRoot, '.reasoning');
        let context = '';

        // Load manifest stats
        const manifestPath = path.join(reasoningDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                context += `Events: ${manifest.totalEvents || 0}, `;
                context += `Confidence: ${((manifest.confidence || 0) * 100).toFixed(1)}%\n`;
            } catch (error) {
                // Ignore
            }
        }

        // Load recent ADRs count
        const adrsDir = path.join(reasoningDir, 'adrs');
        if (fs.existsSync(adrsDir)) {
            try {
                const adrs = fs.readdirSync(adrsDir).filter(f => f.endsWith('.json'));
                context += `ADRs: ${adrs.length}\n`;
            } catch (error) {
                // Ignore
            }
        }

        // Load patterns count
        const patternsPath = path.join(reasoningDir, 'patterns.json');
        if (fs.existsSync(patternsPath)) {
            try {
                const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
                context += `Patterns: ${patterns.patterns?.length || 0}\n`;
            } catch (error) {
                // Ignore
            }
        }

        // Cache context
        this.contextCache = context;
        this.lastContextUpdate = now;

        return context;
    }

    /**
     * Clear context cache
     */
    public clearCache(): void {
        this.contextCache = null;
        this.lastContextUpdate = 0;
    }
}

/**
 * Types
 */
export interface InterpretationResult {
    intent: string;
    confidence: number; // 0-1
    reasoning: string;
    detectedLanguage: string;
    originalInput?: string;
    entities?: Record<string, any>;
    provider?: string;
}

