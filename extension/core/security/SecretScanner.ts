/**
 * Secret Scanner - Sprint 1, Task 1.2
 * 
 * Détecte et anonymise automatiquement les secrets dans les logs/traces
 * 
 * Features:
 * - Pattern matching pour 10+ types de secrets
 * - Redaction automatique (***REDACTED***)
 * - Detection sans modification (pour audit)
 * - Intégration avec PersistenceManager
 * 
 * Security: Prevents accidental exposure of credentials in traces
 */

export interface SecretPattern {
    name: string;
    regex: RegExp;
    replacement: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface SecretDetection {
    type: string;
    position: number;
    length: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    redacted: string;
}

export class SecretScanner {
    private static readonly PATTERNS: SecretPattern[] = [
        // GitHub Tokens
        {
            name: 'GitHub Personal Access Token',
            regex: /ghp_[a-zA-Z0-9]{36}/g,
            replacement: 'ghp_***REDACTED***',
            severity: 'CRITICAL'
        },
        {
            name: 'GitHub OAuth Token',
            regex: /gho_[a-zA-Z0-9]{36}/g,
            replacement: 'gho_***REDACTED***',
            severity: 'CRITICAL'
        },
        
        // AWS Keys
        {
            name: 'AWS Access Key',
            regex: /AKIA[0-9A-Z]{16}/g,
            replacement: 'AKIA***REDACTED***',
            severity: 'CRITICAL'
        },
        {
            name: 'AWS Secret Key',
            regex: /[A-Za-z0-9/+=]{40}/g, // AWS secret pattern
            replacement: '***AWS_SECRET_REDACTED***',
            severity: 'CRITICAL'
        },
        
        // OpenAI / Anthropic
        {
            name: 'OpenAI API Key',
            regex: /sk-[a-zA-Z0-9]{48}/g,
            replacement: 'sk-***REDACTED***',
            severity: 'CRITICAL'
        },
        {
            name: 'Anthropic API Key',
            regex: /sk-ant-[a-zA-Z0-9-]{95}/g,
            replacement: 'sk-ant-***REDACTED***',
            severity: 'CRITICAL'
        },
        
        // JWT Tokens
        {
            name: 'JWT Token',
            regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
            replacement: 'eyJ***REDACTED_JWT***',
            severity: 'HIGH'
        },
        
        // Private Keys
        {
            name: 'RSA Private Key',
            regex: /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA )?PRIVATE KEY-----/g,
            replacement: '-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----',
            severity: 'CRITICAL'
        },
        {
            name: 'SSH Private Key',
            regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
            replacement: '-----BEGIN OPENSSH PRIVATE KEY-----\n***REDACTED***\n-----END OPENSSH PRIVATE KEY-----',
            severity: 'CRITICAL'
        },
        
        // Generic Patterns
        {
            name: 'Password Field',
            regex: /(password|passwd|pwd|secret)["']?\s*[:=]\s*["']?([^"'\s,}]{8,})/gi,
            replacement: '$1: "***REDACTED***"',
            severity: 'HIGH'
        },
        {
            name: 'Bearer Token',
            regex: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
            replacement: 'Bearer ***REDACTED***',
            severity: 'HIGH'
        },
        {
            name: 'API Key Pattern',
            regex: /(api[_-]?key|apikey)["']?\s*[:=]\s*["']?([a-zA-Z0-9]{20,})/gi,
            replacement: '$1: "***REDACTED***"',
            severity: 'HIGH'
        },
        
        // Stripe / Payment
        {
            name: 'Stripe Secret Key',
            regex: /sk_live_[a-zA-Z0-9]{24,}/g,
            replacement: 'sk_live_***REDACTED***',
            severity: 'CRITICAL'
        },
        {
            name: 'Stripe Publishable Key',
            regex: /pk_live_[a-zA-Z0-9]{24,}/g,
            replacement: 'pk_live_***REDACTED***',
            severity: 'MEDIUM'
        }
    ];
    
    /**
     * ✅ REDACT: Anonymise tous les secrets dans un texte
     */
    public static redact(text: string): string {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        let redacted = text;
        
        for (const pattern of this.PATTERNS) {
            redacted = redacted.replace(pattern.regex, pattern.replacement);
        }
        
        return redacted;
    }
    
    /**
     * 🔍 DETECT: Détecte la présence de secrets (sans anonymiser)
     * 
     * Utile pour audit et alertes
     */
    public static detect(text: string): SecretDetection[] {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        const detections: SecretDetection[] = [];
        
        for (const pattern of this.PATTERNS) {
            // Reset regex state
            pattern.regex.lastIndex = 0;
            
            const matches = text.matchAll(new RegExp(pattern.regex.source, pattern.regex.flags));
            
            for (const match of matches) {
                const matchedText = match[0];
                
                detections.push({
                    type: pattern.name,
                    position: match.index || 0,
                    length: matchedText.length,
                    severity: pattern.severity,
                    redacted: this.redactSingle(matchedText, pattern)
                });
            }
        }
        
        return detections;
    }
    
    /**
     * Redact un seul secret
     */
    private static redactSingle(secret: string, pattern: SecretPattern): string {
        return secret.replace(new RegExp(pattern.regex.source, pattern.regex.flags), pattern.replacement);
    }
    
    /**
     * 📊 SCAN FILE: Scanne un fichier pour des secrets
     */
    public static async scanFile(filePath: string): Promise<{
        hasSecrets: boolean;
        detections: SecretDetection[];
        redactedContent: string;
    }> {
        const fs = require('fs');
        
        if (!fs.existsSync(filePath)) {
            return {
                hasSecrets: false,
                detections: [],
                redactedContent: ''
            };
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const detections = this.detect(content);
        const redactedContent = this.redact(content);
        
        return {
            hasSecrets: detections.length > 0,
            detections,
            redactedContent
        };
    }
    
    /**
     * 🔒 REDACT OBJECT: Anonymise récursivement un objet
     * 
     * Utile pour les événements de trace (objets JSON)
     */
    public static redactObject(obj: any): any {
        if (typeof obj === 'string') {
            return this.redact(obj);
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.redactObject(item));
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const redacted: any = {};
            
            for (const [key, value] of Object.entries(obj)) {
                // Redact la clé ET la valeur
                const redactedKey = this.redact(key);
                redacted[redactedKey] = this.redactObject(value);
            }
            
            return redacted;
        }
        
        return obj;
    }
    
    /**
     * 📝 AUDIT LOG: Vérifie si du texte contient des secrets
     * 
     * Retourne true si secrets détectés
     */
    public static hasSecrets(text: string): boolean {
        return this.detect(text).length > 0;
    }
    
    /**
     * 📊 STATISTICS: Retourne les stats de détection
     */
    public static getStats(text: string): {
        totalSecrets: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
    } {
        const detections = this.detect(text);
        
        const stats = {
            totalSecrets: detections.length,
            bySeverity: {} as Record<string, number>,
            byType: {} as Record<string, number>
        };
        
        for (const detection of detections) {
            // Count by severity
            stats.bySeverity[detection.severity] = (stats.bySeverity[detection.severity] || 0) + 1;
            
            // Count by type
            stats.byType[detection.type] = (stats.byType[detection.type] || 0) + 1;
        }
        
        return stats;
    }
}

