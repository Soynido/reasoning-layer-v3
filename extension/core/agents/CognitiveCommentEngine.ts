import { UnifiedLogger } from '../UnifiedLogger';
import { ScoredContent } from './CognitiveScorer';

/**
 * CognitiveCommentEngine - Generates intelligent, non-spammy comments
 * 
 * Capabilities:
 * - Generate contextual insights based on cognitive analysis
 * - Format comments with RL3 signature
 * - Apply anti-spam filters
 * - Template-based responses with variations
 */

export interface CommentInsight {
    content: string;
    signature: string;
    fullComment: string;
    metadata: {
        category: string;
        template: string;
        keywords: string[];
    };
}

export class CognitiveCommentEngine {
    private logger: UnifiedLogger;
    
    // Comment templates by category
    private readonly TEMPLATES: Record<string, string[]> = {
        architecture: [
            `This discussion touches on architectural decision-making, which aligns with the concept of **Reasoning as a Layer** — making system decisions explicit, traceable, and learnable.\n\n{insight}\n\nHave you considered capturing these architectural decisions as ADRs (Architecture Decision Records) for future reference?`,
            
            `Interesting architectural pattern here. From a cognitive systems perspective, {insight}.\n\nThis kind of reasoning could benefit from being made explicit in your decision-making layer.`,
            
            `The architectural trade-offs you're discussing remind me of decision layering — where each choice is recorded with its context, alternatives, and rationale.\n\n{insight}`
        ],
        
        reasoning: [
            `This is a great example of meta-reasoning — thinking about how the system thinks.\n\n{insight}\n\nMaking this reasoning explicit (as a "reasoning layer") could help with debugging, optimization, and even autonomous decision-making.`,
            
            `The reasoning pattern you're describing could be formalized as a cognitive loop:\n1. Observe (gather context)\n2. Understand (analyze patterns)\n3. Decide (evaluate options)\n4. Execute (take action)\n5. Learn (capture outcome)\n\n{insight}`,
            
            `{insight}\n\nThis kind of reasoning transparency is what makes systems truly auditable and improvable over time.`
        ],
        
        decision: [
            `Decision-making at this level deserves to be captured and made traceable. {insight}.\n\nConsider: What if every decision left a cognitive trace you could query later?`,
            
            `{insight}\n\nThe decision you're making here could be an ADR (Architecture Decision Record) — documenting the context, alternatives, and rationale for future teams.`,
            
            `This decision point is exactly where a reasoning layer shines: {insight}.`
        ],
        
        meta: [
            `Meta-cognitive observation: {insight}.\n\nThis is the kind of system self-awareness that enables true autonomy.`,
            
            `{insight}\n\nMeta-reasoning like this is what separates reactive systems from truly cognitive ones.`,
            
            `Fascinating meta-level thinking. {insight}.`
        ],
        
        technical: [
            `From a cognitive architecture perspective, {insight}.\n\nThese patterns could be detected automatically with a reasoning layer.`,
            
            `{insight}\n\nThis refactoring could benefit from explicit decision capture — why this pattern? What alternatives were considered?`,
            
            `Technical insight: {insight}.\n\nConsider making these patterns explicit in your system's cognitive layer.`
        ]
    };
    
    // Insight variations based on keywords
    private readonly INSIGHTS: Record<string, string> = {
        'reasoning': 'explicit reasoning helps systems learn from their own decision-making process',
        'decision': 'capturing decisions with their context enables better future choices',
        'architecture': 'architectural choices become clearer when treated as cognitive artifacts',
        'ADR': 'ADRs are cognitive traces — they make implicit knowledge explicit',
        'pattern': 'detected patterns are the foundation of cognitive learning',
        'intent': 'explicit intent makes systems auditable and improvable',
        'autopilot': 'autonomous systems need traceable reasoning to be trustworthy',
        'agent': 'cognitive agents benefit from layered reasoning — observe, understand, decide, execute',
        'meta-cognitive': 'systems that reason about their own reasoning can truly improve over time'
    };
    
    constructor() {
        this.logger = UnifiedLogger.getInstance();
    }
    
    /**
     * Generate a comment for scored content
     */
    public generateComment(scored: ScoredContent): CommentInsight | null {
        if (!scored.shouldComment) {
            this.logger.log(`🚫 Skipping comment generation (relevance: ${scored.relevance.toFixed(2)})`);
            return null;
        }
        
        // Select template based on category
        const templates = this.TEMPLATES[scored.signals.category] || this.TEMPLATES.technical;
        const template = this.selectTemplate(templates);
        
        // Generate insight based on keywords
        const insight = this.generateInsight(scored.signals.keywords);
        
        // Fill template
        const content = template.replace('{insight}', insight);
        
        // Add signature
        const signature = this.formatSignature();
        
        const fullComment = `${content}\n\n${signature}`;
        
        this.logger.log(`💬 Generated comment (${fullComment.length} chars) for category: ${scored.signals.category}`);
        
        return {
            content,
            signature,
            fullComment,
            metadata: {
                category: scored.signals.category,
                template: template.substring(0, 50),
                keywords: scored.signals.keywords
            }
        };
    }
    
    /**
     * Select a template (with variation to avoid repetition)
     */
    private selectTemplate(templates: string[]): string {
        // Use timestamp-based pseudo-random selection for variation
        const index = Math.floor(Date.now() / 1000) % templates.length;
        return templates[index];
    }
    
    /**
     * Generate contextual insight based on keywords
     */
    private generateInsight(keywords: string[]): string {
        // Find the most relevant keyword
        for (const keyword of keywords) {
            if (this.INSIGHTS[keyword.toLowerCase()]) {
                return this.INSIGHTS[keyword.toLowerCase()];
            }
        }
        
        // Fallback insight
        return 'making reasoning explicit creates cognitive traces that systems can learn from';
    }
    
    /**
     * Format RL3 signature
     */
    private formatSignature(): string {
        return `---

🧠 *This observation is generated by [Reasoning Layer V3](https://github.com/Soynido/reasoning-layer-v3) — an open-source cognitive system that makes decision-making explicit, traceable, and learnable.*

*Learn more: [What is Reasoning as a Layer?](https://github.com/Soynido/reasoning-layer-v3#readme)*`;
    }
    
    /**
     * Preview comment without posting
     */
    public previewComment(scored: ScoredContent): string {
        const insight = this.generateComment(scored);
        
        if (!insight) {
            return `❌ No comment would be generated (relevance too low: ${scored.relevance.toFixed(2)})`;
        }
        
        return `📝 Preview Comment:\n\n${insight.fullComment}\n\n---\n\n📊 Metadata:\n- Category: ${insight.metadata.category}\n- Keywords: ${insight.metadata.keywords.join(', ')}\n- Relevance: ${scored.relevance.toFixed(2)}`;
    }
}

