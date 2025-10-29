import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from '../PersistenceManager';
import { RBOMEngine } from './RBOMEngine';
import { CaptureEvent, GitCommitData } from '../types';
import { ADR } from './types';
import { EvidenceQualityScorer } from '../EvidenceQualityScorer';
import { LLMInterpreter } from '../inputs/LLMInterpreter';

interface EventSummary {
    totalEvents: number;
    byType: Record<string, number>;
    byFile: Record<string, number>;
    byCategory: Record<string, number>;
    timeRange: { start: string; end: string };
    keyFiles: string[];
    majorChanges: {
        description: string;
        files: string[];
        count: number;
        timestamp: string;
    }[];
    dependencyHistory: string[];
    gitEvolution: {
        branches: string[];
        commitsByAuthor: Record<string, number>;
    };
}

interface ADRFromSummary {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    components: string[];
    evidenceIds: string[];
    tags: string[];
    confidence: number; // 0-1
}

// DecisionPattern for heuristic detection
interface DecisionPattern {
    type: 'Dependency' | 'Config' | 'Refactor' | 'Test' | 'Feature' | 'Architecture';
    confidence: number; // 0-1
    changes: number;
    commit?: {
        hash: string;
        message: string;
        author: string;
        date: string;
        filesChanged: string[];
        insertions: number;
        deletions: number;
    };
    dependencies?: string[];
    configFiles?: string[];
    score: number; // Calculated score
}

/**
 * DecisionSynthesizer - Complete historical analysis and ADR generation
 * 
 * Uses a "long-form reasoning" approach on the entire history
 */
export class DecisionSynthesizer {
    private lastSynthesis: number = 0;
    private qualityScorer: EvidenceQualityScorer;
    private llmInterpreter: LLMInterpreter | null = null;

    constructor(
        private workspaceRoot: string,
        private persistence: PersistenceManager,
        private rbomEngine: RBOMEngine
    ) {
        // ⊘ ROBUST: Use fallback if workspaceRoot undefined (following user's recommendation)
        if (!workspaceRoot) {
            const fallback = process.cwd();
            console.warn(`⚠️ DecisionSynthesizer: workspaceRoot is undefined. Using fallback: ${fallback}`);
            this.workspaceRoot = fallback;
        }
        
        this.qualityScorer = new EvidenceQualityScorer();
        
        // Initialize LLM Interpreter for semantic analysis
        try {
            this.llmInterpreter = new LLMInterpreter(this.workspaceRoot);
            this.persistence.logWithEmoji('🤖', 'LLMInterpreter initialized for semantic synthesis');
        } catch (error) {
            console.warn('⚠️ LLMInterpreter initialization failed, running without semantic analysis');
            this.llmInterpreter = null;
        }
        
        this.persistence.logWithEmoji('🧠', 'DecisionSynthesizer initialized with historical analysis and evidence quality scoring');
    }

    /**
     * Fast auto-synthesis on the last 250 events
     * Heuristic detection with score ≥ 0.6
     */
    public async runAutoSynthesis(): Promise<void> {
        try {
            const events = this.loadRecentEvents(250);
            if (events.length === 0) {
                this.persistence.logWithEmoji('⚠️', 'No recent events found for auto-synthesis');
                return;
            }

            this.persistence.logWithEmoji('🔍', `Auto-synthesis: analyzing ${events.length} recent events...`);
            
            // Score evidence quality
            const qualityScores = this.qualityScorer.scoreEvidenceSet(events);
            const qualitySummary = this.qualityScorer.getQualitySummary(qualityScores);
            this.persistence.logWithEmoji('📊', `Evidence quality: ${qualitySummary}`);
            
            // Filter high-quality evidence only
            const highQualityEventIds = this.qualityScorer.filterHighQuality(qualityScores).map(q => q.eventId);
            const highQualityEvents = events.filter(e => highQualityEventIds.includes(e.id));
            
            if (highQualityEvents.length === 0) {
                this.persistence.logWithEmoji('⚠️', 'No high-quality evidence found - skipping synthesis');
                return;
            }
            
            this.persistence.logWithEmoji('✅', `Using ${highQualityEvents.length} high-quality evidence items`);
            
            const patterns = this.detectDecisionPatterns(highQualityEvents);
            if (patterns.length === 0) {
                this.persistence.logWithEmoji('✓', 'No decision patterns detected (confidence < 0.6)');
                return;
            }

            this.persistence.logWithEmoji('🎯', `Found ${patterns.length} decision pattern(s) with score ≥ 0.6`);

            for (const pattern of patterns) {
                const adr = this.generateADR(pattern, events);
                const savedAdr = this.rbomEngine.createADR({
                    title: adr.title,
                    status: 'accepted',
                    author: adr.author,
                    context: adr.context,
                    decision: adr.decision,
                    consequences: adr.consequences,
                    tags: adr.tags,
                    components: adr.components,
                    evidenceIds: adr.evidenceIds,
                    autoGenerated: true
                });

                if (savedAdr) {
                    this.persistence.logWithEmoji('✅', `ADR auto-generated: ${adr.title} (confidence: ${(pattern.score * 100).toFixed(0)}%)`);
                }
            }
        } catch (error) {
            this.persistence.logWithEmoji('❌', `Auto-synthesis failed: ${error}`);
        }
    }

    private loadRecentEvents(limit: number): CaptureEvent[] {
        // ⊘ ROBUST: Ensure workspaceRoot is defined before path.join
        const workspaceRoot = this.workspaceRoot || process.cwd();
        const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
        if (!fs.existsSync(tracesDir)) return [];

        const allEvents: CaptureEvent[] = [];
        const files = fs.readdirSync(tracesDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse(); // Most recent first

        for (const file of files) {
            try {
                const filePath = path.join(tracesDir, file);
                const events: CaptureEvent[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                allEvents.push(...events);
                if (allEvents.length >= limit) break;
            } catch {
                // Ignore corrupted files
            }
        }

        return allEvents.slice(0, limit);
    }

    /**
     * Heuristic detection of decision patterns
     * Score ≥ 0.6 = probable ADR
     */
    private detectDecisionPatterns(events: CaptureEvent[]): DecisionPattern[] {
        const patterns: DecisionPattern[] = [];
        
        // Grouper par commit
        const commits = this.groupByCommit(events);
        
        for (const commit of commits) {
            let score = 0;
            const filesChanged = commit.filesChanged.length;
            const hasDependencyChange = commit.filesChanged.some(f => 
                f.includes('package') || f.includes('requirements') || f.includes('Cargo')
            );
            const hasConfigChange = commit.filesChanged.some(f =>
                f.includes('.env') || f.includes('.yml') || f.includes('.yaml') || f.includes('.json')
            );
            const hasTestChange = commit.filesChanged.some(f => 
                f.includes('test') || f.includes('spec') || f.includes('__tests__')
            );
            
            // Scoring heuristique
            if (filesChanged > 10) score += 0.4; // Refactor/Architecture
            if (hasDependencyChange) score += 0.6; // Dependency decision
            if (hasConfigChange) score += 0.5; // Environment decision
            if (hasTestChange) score += 0.3; // Quality/coverage
            
            // Analyse du message de commit
            const message = commit.message.toLowerCase();
            if (message.match(/migrate|refactor|replace|switch/)) score += 0.4;
            if (message.match(/fix|patch|deprecated/)) score += 0.2;
            
            // Score final
            score = Math.min(1, score);
            
            // If score ≥ 0.6, it's a probable decision
            if (score >= 0.6) {
                let type: DecisionPattern['type'] = 'Feature';
                if (hasDependencyChange) type = 'Dependency';
                else if (hasConfigChange) type = 'Config';
                else if (filesChanged > 10) type = 'Architecture';
                else if (hasTestChange) type = 'Test';
                
                console.log(
                    `🔍 Detected ${type} pattern in commit ${commit.hash} | confidence: ${score.toFixed(2)} | files: ${filesChanged}`
                );
                
                patterns.push({
                    type,
                    confidence: score,
                    changes: filesChanged,
                    commit,
                    score
                });
            }
        }
        
        return patterns;
    }

    /**
     * Group events by commit
     */
    private groupByCommit(events: CaptureEvent[]): Array<{
        hash: string;
        message: string;
        author: string;
        date: string;
        filesChanged: string[];
        insertions: number;
        deletions: number;
    }> {
        const commits = new Map<string, {
            hash: string;
            message: string;
            author: string;
            date: string;
            filesChanged: string[];
            insertions: number;
            deletions: number;
        }>();
        
        for (const event of events) {
            // Accept both git_commit AND file_change with metadata.commit
            if ((event.type === 'git_commit' || event.type === 'file_change') && event.metadata?.commit) {
                const commitData = event.metadata.commit as any;
                // Extract hash from source or commit
                let hash = '';
                // ⊘ ROBUST: Check event.source before .includes() and convert to string
                if (event.source) {
                    const sourcePath = String(event.source);
                    if (sourcePath.includes(':') && sourcePath.includes('git:')) {
                        hash = sourcePath.split(':')[1];
                    }
                }
                if (!hash && commitData.hash) {
                    hash = commitData.hash;
                }
                
                if (!hash) continue;
                
                if (!commits.has(hash)) {
                    commits.set(hash, {
                        hash,
                        message: commitData.message || '',
                        author: commitData.author || commitData.author_name || 'unknown',
                        date: commitData.timestamp || commitData.date || event.timestamp,
                        filesChanged: commitData.files || commitData.files_changed || [],
                        insertions: commitData.insertions || 0,
                        deletions: commitData.deletions || 0
                    });
                } else {
                    // Merge files
                    const existing = commits.get(hash)!;
                    const newFiles = commitData.files || commitData.files_changed || [];
                    existing.filesChanged = [...new Set([...existing.filesChanged, ...newFiles])];
                    existing.insertions += commitData.insertions || 0;
                    existing.deletions += commitData.deletions || 0;
                }
            }
        }
        
        return Array.from(commits.values());
    }

    /**
     * Build summary text for LLM semantic analysis
     */
    private buildSummaryText(summary: EventSummary): string {
        const parts = [];
        
        parts.push(`Workspace state analysis:`);
        parts.push(`- Total events: ${summary.totalEvents}`);
        parts.push(`- Key files modified: ${summary.keyFiles.slice(0, 5).join(', ')}`);
        
        if (summary.majorChanges.length > 0) {
            parts.push(`- Major changes detected:`);
            summary.majorChanges.slice(0, 3).forEach(change => {
                parts.push(`  * ${change.description} (${change.count} events)`);
            });
        }
        
        if (summary.dependencyHistory.length > 0) {
            parts.push(`- Dependencies: ${summary.dependencyHistory.slice(0, 5).join(', ')}`);
        }
        
        const authors = Object.keys(summary.gitEvolution.commitsByAuthor);
        if (authors.length > 0) {
            parts.push(`- Contributors: ${authors.slice(0, 3).join(', ')}`);
        }
        
        return parts.join('\n');
    }

    /**
     * Generate an ADR from a detected pattern
     */
    private generateADR(pattern: DecisionPattern, events: CaptureEvent[]): {
        title: string;
        context: string;
        decision: string;
        consequences: string;
        author: string;
        tags: string[];
        components: string[];
        evidenceIds: string[];
    } {
        const title = `Auto-ADR: ${pattern.type} decision (${pattern.commit?.hash.substring(0, 7) || 'unknown'})`;
        const context = this.describeProblem(pattern);
        const decision = this.inferDecision(pattern);
        const consequences = this.inferConsequences(pattern);
        
        // Find evidence (events linked to the commit)
        // ⊘ ROBUST: Check e.source before .includes() and convert to string
        const evidenceIds = events
            .filter(e => {
                if (!e.source) return false;
                const sourcePath = String(e.source);
                return sourcePath.includes(pattern.commit?.hash || '');
            })
            .map(e => e.id)
            .slice(0, 10);
        
        const components = pattern.commit?.filesChanged.slice(0, 5) || [];
        
        return {
            title,
            context,
            decision,
            consequences,
            author: `system:auto-${pattern.type}`,
            tags: [pattern.type.toLowerCase(), 'auto-generated', 'heuristic'],
            components,
            evidenceIds
        };
    }

    private describeProblem(pattern: DecisionPattern): string {
        const changeCount = pattern.changes;
        const type = pattern.type;
        
        if (type === 'Dependency') {
            return `Detected dependency update with ${changeCount} file changes. The project structure shows modifications to package management and dependency files.`;
        }
        if (type === 'Config') {
            return `Detected configuration changes across ${changeCount} files. Environment settings, build configuration, or deployment parameters were modified.`;
        }
        if (type === 'Architecture' || type === 'Refactor') {
            return `Detected architectural refactoring with ${changeCount} files modified. This suggests a significant structural change to the codebase.`;
        }
        if (type === 'Test') {
            return `Detected test coverage changes with ${changeCount} files modified. Quality assurance and testing infrastructure were updated.`;
        }
        return `Detected significant changes: ${changeCount} files modified in a ${type} context.`;
    }

    private inferDecision(pattern: DecisionPattern): string {
        const type = pattern.type;
        
        if (type === 'Dependency') {
            return `Updated package dependencies to improve security, reduce version conflicts, and modernize the dependency stack.`;
        }
        if (type === 'Config') {
            return `Modified configuration to adapt to new environment requirements, improve deployment process, or optimize runtime settings.`;
        }
        if (type === 'Architecture') {
            return `Restructured core architecture to improve maintainability, reduce technical debt, and enable future scalability.`;
        }
        if (type === 'Test') {
            return `Enhanced test coverage and quality assurance to improve code reliability and catch regressions earlier.`;
        }
        return `Made ${type} decision to improve project quality and maintainability.`;
    }

    private inferConsequences(pattern: DecisionPattern): string {
        const type = pattern.type;
        
        if (type === 'Dependency') {
            return `Reduced security vulnerabilities; improved dependency tree; potential API incompatibilities require testing.`;
        }
        if (type === 'Config') {
            return `Improved environment configuration; potential deployment adjustments needed; runtime behavior may change.`;
        }
        if (type === 'Architecture' || type === 'Refactor') {
            return `Improved code maintainability; reduced technical debt; potential breaking changes require team coordination.`;
        }
        if (type === 'Test') {
            return `Improved code quality; better regression detection; longer CI/CD pipeline.`;
        }
        return `Positive impact on project quality; requires testing and validation.`;
    }

    public async synthesizeHistoricalDecisions(): Promise<void> {
        // ⊘ ROBUST: Ensure workspaceRoot is defined before synthesis
        if (!this.workspaceRoot) {
            const fallback = process.cwd();
            console.warn(`⚠️ DecisionSynthesizer.synthesizeHistoricalDecisions: workspaceRoot is undefined. Using fallback: ${fallback}`);
            this.workspaceRoot = fallback;
        }

        const now = Date.now();
        if (now - this.lastSynthesis < 300000) { // Synthesis every 5 minutes
            return;
        }
        this.lastSynthesis = now;

        try {
            // Step 1: Read all traces
            const allEvents = this.loadAllEvents();
            if (allEvents.length === 0) {
                this.persistence.logWithEmoji('⚠️', 'No historical events found');
                return;
            }

            this.persistence.logWithEmoji('📚', `Analyzing ${allEvents.length} historical events...`);

            // Step 2: Intelligent pre-filtering
            const summary = this.createIntelligentSummary(allEvents);
            
            this.persistence.logWithEmoji('🔍', `Summary: ${summary.totalEvents} events, ${summary.majorChanges.length} major changes`);

            // Step 2.5: LLM semantic analysis (if available and complex patterns detected)
            if (this.llmInterpreter && summary.majorChanges.length > 0) {
                try {
                    // Build summary text for LLM analysis
                    const summaryText = this.buildSummaryText(summary);
                    
                    if (summaryText.length > 50) {
                        const intent = await this.llmInterpreter.interpret(summaryText);
                        this.persistence.logWithEmoji('🤖', `LLM semantic analysis: ${intent.intent} (confidence: ${(intent.confidence * 100).toFixed(1)}%)`);
                        
                        // Log reasoning if provided
                        if (intent.reasoning) {
                            this.persistence.logWithEmoji('💡', `Reasoning: ${intent.reasoning}`);
                        }
                    }
                } catch (llmError) {
                    console.warn('⚠️ LLM analysis failed, continuing with heuristic analysis', llmError);
                }
            }

            // Step 3: Architectural reasoning
            const adrCandidates = this.reasonArchitecturalDecisions(summary, allEvents);

            // Step 4: Generate ADRs
            if (adrCandidates.length > 0) {
                this.persistence.logWithEmoji('🎯', `Generated ${adrCandidates.length} architectural decisions`);
                for (const candidate of adrCandidates) {
                    await this.createADRFromSynthesis(candidate);
                }
            }

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Synthesis failed: ${error}`);
        }
    }

    private loadAllEvents(): CaptureEvent[] {
        // ⊘ ROBUST: Ensure workspaceRoot is defined before path.join
        const workspaceRoot = this.workspaceRoot || process.cwd();
        const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
        if (!fs.existsSync(tracesDir)) return [];

        const allEvents: CaptureEvent[] = [];
        const files = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json')).sort();

        for (const file of files) {
            try {
                const filePath = path.join(tracesDir, file);
                const events: CaptureEvent[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                allEvents.push(...events);
            } catch (error) {
                // Ignore corrupted files
            }
        }

        return allEvents;
    }

    private createIntelligentSummary(events: CaptureEvent[]): EventSummary {
        const summary: EventSummary = {
            totalEvents: events.length,
            byType: {},
            byFile: {},
            byCategory: {},
            timeRange: { start: events[0]?.timestamp || '', end: events[events.length - 1]?.timestamp || '' },
            keyFiles: [],
            majorChanges: [],
            dependencyHistory: [],
            gitEvolution: {
                branches: [],
                commitsByAuthor: {}
            }
        };

        // Grouper par type
        for (const event of events) {
            summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
            
            // ⊘ ROBUST: Check event.source before path.basename and convert to string
            if (event.source) {
                const sourcePath = String(event.source); // Convert to string safely
                const fileName = path.basename(sourcePath);
                summary.byFile[fileName] = (summary.byFile[fileName] || 0) + 1;
            }
            
            const category = event.metadata?.category || event.metadata?.level || 'unknown';
            summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

            // Détecter les dépendances
            if (event.type === 'dependencies' && event.metadata?.dependencies) {
                const deps = event.metadata.dependencies as any[];
                deps.forEach(dep => {
                    if (dep.name && !summary.dependencyHistory.includes(dep.name)) {
                        summary.dependencyHistory.push(dep.name);
                    }
                });
            }

            // Détecter l'évolution Git
            if (event.type === 'git_commit' && event.metadata?.commit) {
                const author = event.metadata.commit.author || 'unknown';
                summary.gitEvolution.commitsByAuthor[author] = (summary.gitEvolution.commitsByAuthor[author] || 0) + 1;
            }
        }

        // Identifier les fichiers clés (les plus modifiés)
        const sortedFiles = Object.entries(summary.byFile)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);
        summary.keyFiles = sortedFiles.map(([file]) => file);

        // Détecter les changements majeurs
        const fileGroups = new Map<string, CaptureEvent[]>();
        for (const event of events) {
            // ⊘ ROBUST: Check event.source before path.dirname and convert to string
            if (!event.source) continue;
            const sourcePath = String(event.source); // Convert to string safely
            const dir = path.dirname(sourcePath);
            if (!fileGroups.has(dir)) fileGroups.set(dir, []);
            fileGroups.get(dir)!.push(event);
        }

        for (const [dir, dirEvents] of fileGroups.entries()) {
            if (dirEvents.length >= 5) {
                const recentEvent = dirEvents[dirEvents.length - 1];
                // ⊘ ROBUST: Check dir and event.source before path.basename
                const dirName = dir ? path.basename(dir) : 'unknown';
                summary.majorChanges.push({
                    description: `Intensive development in ${dirName}`,
                    files: dirEvents.map(e => {
                        if (!e.source) return 'unknown';
                        const sourcePath = String(e.source); // Convert to string safely
                        return path.basename(sourcePath);
                    }),
                    count: dirEvents.length,
                    timestamp: recentEvent.timestamp
                });
            }
        }

        return summary;
    }

    private reasonArchitecturalDecisions(summary: EventSummary, events: CaptureEvent[]): ADRFromSummary[] {
        const decisions: ADRFromSummary[] = [];

        // Pattern 1: Persistence structure established
        // Intent: Detect human decision to stabilize a persistence contract
        if (summary.byFile['PersistenceManager.ts'] > 3 || summary.byFile['ManifestGenerator.ts'] > 2) {
            // ⊘ ROBUST: Check e.source before .includes() and convert to string
            const persistenceEvents = events.filter(e => {
                if (!e.source) return false;
                const sourcePath = String(e.source); // Convert to string safely
                return sourcePath.includes('PersistenceManager') || 
                       sourcePath.includes('ManifestGenerator') ||
                       sourcePath.includes('SchemaManager');
            });

            decisions.push({
                title: 'Stabilizing the persistence contract via versioned manifest',
                context: `The developer iterated ${summary.byFile['PersistenceManager.ts'] || 0} times on PersistenceManager and ${summary.byFile['ManifestGenerator.ts'] || 0} times on ManifestGenerator. The implicit intention was to guarantee the consistency of captured data.`,
                decision: 'The choice made: implement a local-first persistence engine with versioned manifest and Zod schema for validation. This decision aimed to avoid data corruption and facilitate debugging.',
                consequences: 'Observable impact: local architecture without server dependency, systematic event validation, manifest always consistent with traces.',
                components: ['PersistenceManager.ts', 'ManifestGenerator.ts', 'SchemaManager.ts'],
                evidenceIds: persistenceEvents.map(e => e.id).slice(0, 5),
                tags: ['decision', 'persistence', 'data-integrity'],
                confidence: 0.95
            });
        }

        // Pattern 2: Multi-capture event capture
        const captureEngines = ['SBOMCaptureEngine', 'ConfigCaptureEngine', 'TestCaptureEngine', 'GitMetadataEngine'];
        const enginesDetected = captureEngines.filter(engine => {
            return Object.keys(summary.byFile).some(file => file.includes(engine.replace('Engine', '')));
        });

        if (enginesDetected.length >= 2) {
            decisions.push({
                title: 'Adoption of a modular architecture through specialized capture engines',
                context: `Development shows the creation of ${enginesDetected.length} separate engines (${enginesDetected.join(', ')}). The intention was to decouple capture responsibilities by technical domain.`,
                decision: 'The choice made: one engine per metadata type rather than a monolithic capture system. This decision aimed to improve maintainability and test each capture engine independently.',
                consequences: 'Observable impact: code is more modular, each engine can evolve without affecting others. This facilitates the addition of new capture engines.',
                components: enginesDetected,
                evidenceIds: events.slice(0, 10).map(e => e.id),
                tags: ['decision', 'architecture', 'modularity'],
                confidence: 0.90
            });
        }

        // ✅ Pattern 3: Dépendances stratégiques
        const strategicDeps = summary.dependencyHistory.filter(dep => 
            dep.includes('git') || dep.includes('zod') || dep.includes('uuid')
        );
        if (strategicDeps.length > 0) {
            decisions.push({
                title: `Adoption of external libraries for ${strategicDeps.join(', ')}`,
                context: `The project added dependencies ${strategicDeps.join(' and ')} in package-lock.json. The intention was to use mature solutions rather than reinventing.`,
                decision: `The choice made: use ${strategicDeps.map(d => `${d} (${this.getDepPurpose(d)})`).join(' and ')}. This decision aimed to save time and avoid bugs.`,
                consequences: 'Observable impact: more stable code, less maintenance, but external community dependency.',
                components: ['package-lock.json'],
                evidenceIds: events.filter(e => e.type === 'dependencies').map(e => e.id).slice(0, 5),
                tags: ['decision', 'dependencies', 'trade-off'],
                confidence: 0.85
            });
        }

        // ✅ Pattern 4: Évolution Git structurée
        if (summary.gitEvolution.commitsByAuthor) {
            const totalCommits = Object.values(summary.gitEvolution.commitsByAuthor).reduce((a, b) => a + b, 0);
            if (totalCommits > 10) {
                const authors = Object.keys(summary.gitEvolution.commitsByAuthor);
                decisions.push({
                    title: 'Using Git for decision traceability via history',
                    context: `${totalCommits} commits detected, ${authors.length} contributor(s). Development shows Git used as a traceability tool.`,
                    decision: 'The choice made: maintain a complete Git history with structured commits. This decision aimed to document changes naturally.',
                    consequences: 'Observable impact: Git history becomes source of truth for understanding project evolution.',
                    components: ['git'],
                    evidenceIds: events.filter(e => e.type === 'git_commit').map(e => e.id).slice(0, 5),
                    tags: ['decision', 'git', 'traceability'],
                    confidence: 0.80
                });
            }
        }

        // Pattern 5: Major refactor detected
        if (summary.majorChanges.length > 0) {
            const biggestChange = summary.majorChanges.sort((a, b) => b.count - a.count)[0];
            if (biggestChange.count >= 10) {
                // ⊘ ROBUST: Check e.source before .includes() and convert to string
                const changeEvents = events.filter(e => {
                    if (!e.source) return false;
                    const sourcePath = String(e.source); // Convert to string safely
                    return biggestChange.files.some(file => sourcePath.includes(file));
                });

                // ⊘ ROBUST: Check biggestChange.files before path.basename
                const firstFile = biggestChange.files && biggestChange.files[0] ? biggestChange.files[0].split('/')[0] : 'unknown';
                const fileBasename = firstFile !== 'unknown' ? path.basename(firstFile) : 'unknown';
                
                decisions.push({
                    title: `Major refactor of ${fileBasename}`,
                    context: `${biggestChange.count} modifications detected across ${biggestChange.files.length} files in ${biggestChange.description}. The developer chose to refactor rather than add patches.`,
                    decision: 'The choice made: refactor rather than add workarounds. This decision aimed to improve long-term maintainability.',
                    consequences: 'Observable impact: cleaner code, clearer architecture, but risk of short-term breaking changes.',
                    components: biggestChange.files,
                    evidenceIds: changeEvents.map(e => e.id).slice(0, 10),
                    tags: ['decision', 'refactor', 'trade-off'],
                    confidence: 0.75
                });
            }
        }

        return decisions;
    }

    private getDepPurpose(name: string): string {
        if (name.includes('git')) return 'intégration Git native';
        if (name.includes('zod')) return 'validation de schémas';
        if (name.includes('uuid')) return 'génération d\'identifiants uniques';
        if (name.includes('webpack')) return 'bundling et compilation';
        return 'fonctionnalité spécifique';
    }

    private async createADRFromSynthesis(candidate: ADRFromSummary): Promise<void> {
        try {
            // ⊘ Safety checks
            if (!this.workspaceRoot) {
                this.persistence.logWithEmoji('❌', 'DecisionSynthesizer: workspaceRoot is undefined');
                return;
            }
            
            if (!this.rbomEngine) {
                this.persistence.logWithEmoji('❌', 'DecisionSynthesizer: rbomEngine is undefined');
                return;
            }
            
            // Vérifier les doublons
            const existingADRs = this.rbomEngine.listADRs();
            const similarADR = existingADRs.find(adr => 
                adr.title.toLowerCase() === candidate.title.toLowerCase()
            );

            if (similarADR) {
                this.persistence.logWithEmoji('⏭️', `ADR déjà existant: ${candidate.title}`);
                return;
            }

            const adr = this.rbomEngine.createADR({
                title: candidate.title,
                status: 'accepted', // Auto-généré = déjà accepté (fait historique)
                author: 'system:historical-analysis',
                context: candidate.context,
                decision: candidate.decision,
                consequences: candidate.consequences,
                tags: [...candidate.tags, 'auto-generated', 'historical'],
                components: candidate.components,
                relatedADRs: [],
                evidenceIds: [],
                autoGenerated: true
            });

            if (!adr) {
                this.persistence.logWithEmoji('❌', 'Failed to create ADR: rbomEngine.createADR returned null');
                return;
            }
            
            if (!adr.id) {
                this.persistence.logWithEmoji('❌', 'Failed to create ADR: adr.id is undefined');
                return;
            }

            // Link evidence
            for (const evidenceId of candidate.evidenceIds) {
                this.rbomEngine.linkEvidence(adr.id, evidenceId);
            }

            this.persistence.logWithEmoji('🧠', `Historical ADR synthesized: ${adr.title} (confidence: ${(candidate.confidence * 100).toFixed(0)}%)`);

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to create synthesized ADR: ${error}`);
            console.error('DecisionSynthesizer.createADRFromSynthesis error:', error);
        }
    }
}

