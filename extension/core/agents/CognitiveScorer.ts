import { UnifiedLogger } from '../UnifiedLogger';

/**
 * CognitiveScorer - Evaluates the cognitive value of GitHub content
 * 
 * Scores issues, PRs, and discussions based on:
 * - Cognitive keywords density
 * - Architectural depth
 * - Reasoning complexity
 * - Discussion quality
 */

export interface CognitiveSignals {
    keywords: string[];
    score: number;
    category: 'architecture' | 'reasoning' | 'decision' | 'meta' | 'technical' | 'other';
    confidence: number;
}

export interface ScoredContent {
    url: string;
    title: string;
    body: string;
    signals: CognitiveSignals;
    relevance: number; // 0-1 final score
    shouldComment: boolean;
}

export class CognitiveScorer {
    private logger: UnifiedLogger;
    
    // Cognitive keyword weights (higher = more cognitive)
    private readonly COGNITIVE_KEYWORDS = {
        // High cognitive value (weight: 1.0)
        'reasoning': 1.0,
        'decision making': 1.0,
        'architecture': 1.0,
        'ADR': 1.0,
        'architectural decision': 1.0,
        'meta-cognitive': 1.0,
        'intent': 1.0,
        'autopilot': 1.0,
        
        // Medium cognitive value (weight: 0.7)
        'pattern': 0.7,
        'design': 0.7,
        'refactor': 0.7,
        'cognitive': 0.7,
        'thinking': 0.7,
        'strategy': 0.7,
        'framework': 0.7,
        
        // Lower cognitive value (weight: 0.4)
        'AI': 0.4,
        'agent': 0.4,
        'automation': 0.4,
        'workflow': 0.4,
        'planning': 0.4
    };
    
    // Minimum thresholds
    private readonly MIN_RELEVANCE = 0.75; // Don't comment below this
    private readonly MIN_CONFIDENCE = 0.6;  // Don't comment if uncertain
    
    constructor() {
        this.logger = UnifiedLogger.getInstance();
    }
    
    /**
     * Score a GitHub issue/PR for cognitive relevance
     */
    public scoreContent(url: string, title: string, body: string): ScoredContent {
        const text = `${title} ${body}`.toLowerCase();
        
        // Detect cognitive signals
        const signals = this.detectCognitiveSignals(text);
        
        // Calculate final relevance score
        const relevance = this.calculateRelevance(signals, text);
        
        // Determine if we should comment
        const shouldComment = relevance >= this.MIN_RELEVANCE && signals.confidence >= this.MIN_CONFIDENCE;
        
        this.logger.log(`📊 Scored: ${title.substring(0, 50)}... → Relevance: ${relevance.toFixed(2)}, Should Comment: ${shouldComment}`);
        
        return {
            url,
            title,
            body,
            signals,
            relevance,
            shouldComment
        };
    }
    
    /**
     * Detect cognitive signals in text
     */
    private detectCognitiveSignals(text: string): CognitiveSignals {
        const keywords: string[] = [];
        let totalScore = 0;
        let matches = 0;
        
        // Scan for cognitive keywords
        for (const [keyword, weight] of Object.entries(this.COGNITIVE_KEYWORDS)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const occurrences = (text.match(regex) || []).length;
            
            if (occurrences > 0) {
                keywords.push(keyword);
                totalScore += occurrences * weight;
                matches += occurrences;
            }
        }
        
        // Normalize score (0-1)
        const score = Math.min(1.0, totalScore / 10);
        
        // Determine category
        const category = this.categorizeTopic(keywords);
        
        // Calculate confidence based on keyword diversity
        const confidence = Math.min(1.0, keywords.length / 5);
        
        return {
            keywords,
            score,
            category,
            confidence
        };
    }
    
    /**
     * Calculate final relevance score
     */
    private calculateRelevance(signals: CognitiveSignals, text: string): number {
        let relevance = signals.score;
        
        // Bonus for architectural depth (questions, implications, trade-offs)
        if (text.includes('why') || text.includes('how') || text.includes('trade-off')) {
            relevance += 0.1;
        }
        
        // Bonus for meta-reasoning
        if (text.includes('decision') && (text.includes('why') || text.includes('rationale'))) {
            relevance += 0.15;
        }
        
        // Penalty for spam indicators
        if (text.includes('urgent') || text.includes('asap') || text.includes('help needed')) {
            relevance -= 0.2;
        }
        
        // Penalty for short content (likely low quality)
        if (text.length < 200) {
            relevance -= 0.1;
        }
        
        // Bonus for long, thoughtful content
        if (text.length > 1000) {
            relevance += 0.1;
        }
        
        return Math.max(0, Math.min(1.0, relevance));
    }
    
    /**
     * Categorize topic based on keywords
     */
    private categorizeTopic(keywords: string[]): CognitiveSignals['category'] {
        if (keywords.some(k => ['architecture', 'ADR', 'design'].includes(k))) {
            return 'architecture';
        }
        if (keywords.some(k => ['reasoning', 'decision making', 'thinking'].includes(k))) {
            return 'reasoning';
        }
        if (keywords.some(k => ['decision', 'intent', 'strategy'].includes(k))) {
            return 'decision';
        }
        if (keywords.some(k => ['meta-cognitive', 'cognitive'].includes(k))) {
            return 'meta';
        }
        if (keywords.some(k => ['pattern', 'refactor', 'framework'].includes(k))) {
            return 'technical';
        }
        return 'other';
    }
    
    /**
     * Get human-readable explanation of score
     */
    public explainScore(scored: ScoredContent): string {
        const lines = [
            `📊 Cognitive Score Analysis`,
            ``,
            `URL: ${scored.url}`,
            `Title: ${scored.title.substring(0, 60)}...`,
            ``,
            `Relevance: ${(scored.relevance * 100).toFixed(0)}%`,
            `Confidence: ${(scored.signals.confidence * 100).toFixed(0)}%`,
            `Category: ${scored.signals.category}`,
            ``,
            `Keywords detected (${scored.signals.keywords.length}):`,
            scored.signals.keywords.map(k => `  - ${k}`).join('\n'),
            ``,
            `Decision: ${scored.shouldComment ? '✅ Comment recommended' : '❌ Skip (below threshold)'}`
        ];
        
        return lines.join('\n');
    }
}

