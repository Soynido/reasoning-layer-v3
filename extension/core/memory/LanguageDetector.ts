import * as fs from 'fs';
import * as path from 'path';

/**
 * LanguageDetector - Auto-detect and configure user language preference
 * 
 * Detects user language from:
 * 1. Chat messages (primary - from Cursor chat)
 * 2. Conversation history (secondary)
 * 3. Environment variables (RL3_LANG)
 * 4. Git config (user.locale)
 * 5. System locale (fallback)
 * 
 * Updates .reasoning/preferences.json automatically
 */
export class LanguageDetector {
    private workspaceRoot: string;
    private preferencesPath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.preferencesPath = path.join(workspaceRoot, '.reasoning', 'preferences.json');
    }

    /**
     * Detect language from chat message (from Cursor chat)
     * Call this when user sends a message in Cursor chat
     */
    public detectFromChat(message: string): string | null {
        // Use same detection logic as LLMInterpreter
        const languageIndicators: Record<string, string[]> = {
            'fr': ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'est', 'sont', 'avec', 'pour', 'dans', 'frérot', 'journée'],
            'en': ['the', 'is', 'are', 'with', 'for', 'and', 'or', 'this', 'that', 'what', 'where', 'when'],
            'es': ['el', 'la', 'los', 'las', 'de', 'un', 'una', 'es', 'son', 'con', 'para', 'en'],
            'de': ['der', 'die', 'das', 'und', 'oder', 'mit', 'für', 'ist', 'sind', 'was', 'wo', 'wann'],
            'it': ['il', 'la', 'lo', 'gli', 'le', 'di', 'un', 'una', 'è', 'sono', 'con', 'per', 'in'],
            'pt': ['o', 'a', 'os', 'as', 'de', 'um', 'uma', 'é', 'são', 'com', 'para', 'em']
        };

        const messageLower = message.toLowerCase();
        let maxMatches = 0;
        let detectedLang: string | null = null;

        for (const [lang, words] of Object.entries(languageIndicators)) {
            const matches = words.filter(word => messageLower.includes(word)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedLang = lang;
            }
        }

        // Only update if confident (at least 2 matches)
        if (detectedLang && maxMatches >= 2) {
            this.updatePreference(detectedLang, 'chat_message');
            return detectedLang;
        }

        return null;
    }

    /**
     * Update language preference
     */
    private updatePreference(language: string, source: string): void {
        try {
            let preferences: any = {
                preferredLanguage: language,
                detectedAt: new Date().toISOString(),
                detectionMethod: source
            };

            if (fs.existsSync(this.preferencesPath)) {
                preferences = JSON.parse(fs.readFileSync(this.preferencesPath, 'utf-8'));
                preferences.preferredLanguage = language;
                preferences.updatedAt = new Date().toISOString();
                preferences.lastDetectionMethod = source;
            }

            fs.writeFileSync(this.preferencesPath, JSON.stringify(preferences, null, 2), 'utf-8');
        } catch (error) {
            // Ignore errors
        }
    }

    /**
     * Get current language preference
     */
    public getPreference(): string | null {
        if (!fs.existsSync(this.preferencesPath)) {
            return null;
        }

        try {
            const preferences = JSON.parse(fs.readFileSync(this.preferencesPath, 'utf-8'));
            return preferences.preferredLanguage || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Auto-detect from multiple sources
     */
    public autoDetect(): string | null {
        // 1. Check existing preference
        const existing = this.getPreference();
        if (existing) {
            return existing;
        }

        // 2. Check environment variable
        if (process.env.RL3_LANG) {
            this.updatePreference(process.env.RL3_LANG.toLowerCase(), 'environment');
            return process.env.RL3_LANG.toLowerCase();
        }

        // 3. Check conversation history
        const conversationsDir = path.join(this.workspaceRoot, '.reasoning', 'conversations');
        if (fs.existsSync(conversationsDir)) {
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(conversationsDir, `${today}.log`);
            
            if (fs.existsSync(logFile)) {
                try {
                    const content = fs.readFileSync(logFile, 'utf-8');
                    const lines = content.trim().split('\n').filter(l => l);
                    const entries = lines.map(l => JSON.parse(l));
                    
                    // Count languages
                    const langCounts: Record<string, number> = {};
                    for (const entry of entries) {
                        const lang = entry.detectedLanguage || 'unknown';
                        langCounts[lang] = (langCounts[lang] || 0) + 1;
                    }
                    
                    const sortedLangs = Object.entries(langCounts)
                        .filter(([lang]) => lang !== 'unknown')
                        .sort((a, b) => b[1] - a[1]);
                    
                    if (sortedLangs.length > 0 && sortedLangs[0][1] >= 2) {
                        this.updatePreference(sortedLangs[0][0], 'conversation_history');
                        return sortedLangs[0][0];
                    }
                } catch (error) {
                    // Ignore
                }
            }
        }

        // 4. Check git config
        try {
            const { execSync } = require('child_process');
            const gitLang = execSync('git config user.locale', { 
                encoding: 'utf-8', 
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            
            if (gitLang) {
                const lang = gitLang.split('_')[0].toLowerCase();
                this.updatePreference(lang, 'git_config');
                return lang;
            }
        } catch (error) {
            // Git not available
        }

        // 5. System locale (fallback)
        const systemLocale = process.env.LANG || process.env.LC_ALL || '';
        if (systemLocale) {
            const lang = systemLocale.split('_')[0].toLowerCase();
            if (['fr', 'en', 'es', 'de', 'it', 'pt'].includes(lang)) {
                this.updatePreference(lang, 'system_locale');
                return lang;
            }
        }

        return null;
    }
}

