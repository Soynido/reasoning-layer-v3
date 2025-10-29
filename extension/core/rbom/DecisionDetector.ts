import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from '../PersistenceManager';
import { RBOMEngine } from './RBOMEngine';
import { CaptureEvent, Evidence } from '../types';
import { EvidenceMapper } from '../EvidenceMapper';
import { ADR } from './types';

interface Pattern {
    name: string;
    description: string;
    detect(events: CaptureEvent[]): ADRCandidate[];
}

interface ADRCandidate {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    components: string[];
    evidenceIds: string[];
    tags: string[];
}

export class DecisionDetector {
    private lastScan: number = 0;
    private patterns: Pattern[] = [];

    constructor(
        private workspaceRoot: string,
        private persistence: PersistenceManager,
        private rbomEngine: RBOMEngine,
        private evidenceMapper: EvidenceMapper
    ) {
        this.initializePatterns();
        this.persistence.logWithEmoji('🧠', 'DecisionDetector initialized with auto-ADR generation');
    }

    private initializePatterns(): void {
        // ✅ Pattern 1: Stabilisation d'un composant
        this.patterns.push({
            name: 'component-stabilization',
            description: 'Multiple modifications on the same file in short timeframe',
            detect: (events) => this.detectComponentStabilization(events)
        });

        // ✅ Pattern 2: Ajout d'une dépendance lourde
        this.patterns.push({
            name: 'heavy-dependency',
            description: 'New dependency added to package-lock.json',
            detect: (events) => this.detectHeavyDependency(events)
        });

        // ✅ Pattern 3: Introduction d'un nouveau module
        this.patterns.push({
            name: 'new-module',
            description: 'New significant module created',
            detect: (events) => this.detectNewModule(events)
        });

        // ✅ Pattern 4: Refactor massif
        this.patterns.push({
            name: 'massive-refactor',
            description: 'Large number of files modified in core/ directory',
            detect: (events) => this.detectMassiveRefactor(events)
        });

        // ✅ Pattern 5: Stabilisation du contrat de persistance
        this.patterns.push({
            name: 'persistence-stabilization',
            description: 'Persistence contract stabilized',
            detect: (events) => this.detectPersistenceStabilization(events)
        });
    }

    public async scanRecentEvents(): Promise<void> {
        const now = Date.now();
        if (now - this.lastScan < 120000) { // Scansion minimum toutes les 2 minutes
            return;
        }
        this.lastScan = now;

        try {
            const allEvents = this.loadAllEvents(); // TOUS les événements historiques
            if (allEvents.length === 0) return;

            this.persistence.logWithEmoji('🔍', `Scanning ${allEvents.length} historical events for decisions...`);

            let candidates: ADRCandidate[] = [];

            for (const pattern of this.patterns) {
                const patternCandidates = pattern.detect(allEvents);
                candidates.push(...patternCandidates);
            }

            if (candidates.length > 0) {
                this.persistence.logWithEmoji('🎯', `Found ${candidates.length} decision candidates`);
                
                for (const candidate of candidates) {
                    await this.createADRFromCandidate(candidate);
                }
            }

        } catch (error) {
            this.persistence.logWithEmoji('⚠️', `Decision scan failed: ${error}`);
        }
    }

    private loadAllEvents(): CaptureEvent[] {
        const tracesDir = path.join(this.workspaceRoot, '.reasoning', 'traces');
        if (!fs.existsSync(tracesDir)) return [];

        const allEvents: CaptureEvent[] = [];
        const files = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json'));

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

    private loadRecentEvents(minutesAgo: number): CaptureEvent[] {
        const tracesDir = path.join(this.workspaceRoot, '.reasoning', 'traces');
        if (!fs.existsSync(tracesDir)) return [];

        const allEvents: CaptureEvent[] = [];
        const files = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json'));

        const cutoff = Date.now() - (minutesAgo * 60 * 1000);

        for (const file of files) {
            try {
                const filePath = path.join(tracesDir, file);
                const events: CaptureEvent[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                
                for (const event of events) {
                    const eventTime = new Date(event.timestamp).getTime();
                    if (eventTime >= cutoff) {
                        allEvents.push(event);
                    }
                }
            } catch (error) {
                // Ignore corrupted files
            }
        }

        return allEvents;
    }

    private detectComponentStabilization(events: CaptureEvent[]): ADRCandidate[] {
        const candidates: ADRCandidate[] = [];
        
        // Compter les événements par fichier
        const fileCounts = new Map<string, CaptureEvent[]>();
        for (const event of events.filter(e => e.type === 'file_change')) {
            const file = event.source;
            if (!fileCounts.has(file)) {
                fileCounts.set(file, []);
            }
            fileCounts.get(file)!.push(event);
        }

        // Si un fichier a >5 modifications en 2 minutes, c'est une stabilisation
        for (const [file, fileEvents] of fileCounts.entries()) {
            if (fileEvents.length >= 5) {
                const fileName = path.basename(file);
                const dir = path.dirname(file).split('/').pop() || '';
                
                candidates.push({
                    title: `Stabilisation du composant ${fileName}`,
                    context: `Multiple modifications detected on ${fileName} within short timeframe (${fileEvents.length} changes). Component is being actively refined.`,
                    decision: `${fileName} stabilized with ${fileEvents.length} iterations. Core functionality now stable.`,
                    consequences: `Component can be considered stable and ready for production use. Further changes should be incremental.`,
                    components: [fileName],
                    evidenceIds: fileEvents.map(e => e.id),
                    tags: ['auto', 'stabilization', dir || 'core']
                });
            }
        }

        return candidates;
    }

    private detectHeavyDependency(events: CaptureEvent[]): ADRCandidate[] {
        const candidates: ADRCandidate[] = [];
        
        const sbomEvents = events.filter(e => e.type === 'dependencies' && e.metadata?.dependencies?.length > 0);
        
        for (const event of sbomEvents) {
            const deps = event.metadata.dependencies as any[];
            
            // Détecter les dépendances lourdes (ex: simple-git, zod)
            const heavyDeps = deps.filter((d: any) => 
                d.name && (d.name.includes('git') || d.name.includes('zod') || d.name.includes('webpack'))
            );

            if (heavyDeps.length > 0) {
                const depName = heavyDeps[0].name;
                candidates.push({
                    title: `Intégration de la dépendance ${depName}`,
                    context: `New significant dependency ${depName} added to project dependencies.`,
                    decision: `Integrate ${depName} to provide ${this.getDepPurpose(depName)} capabilities.`,
                    consequences: `Project now depends on ${depName}. Must be monitored for security updates and compatibility.`,
                    components: ['package-lock.json'],
                    evidenceIds: [event.id],
                    tags: ['auto', 'dependency', 'external']
                });
            }
        }

        return candidates;
    }

    private getDepPurpose(name: string): string {
        if (name.includes('git')) return 'Git integration';
        if (name.includes('zod')) return 'schema validation';
        if (name.includes('webpack')) return 'bundling';
        return 'specific functionality';
    }

    private detectNewModule(events: CaptureEvent[]): ADRCandidate[] {
        const candidates: ADRCandidate[] = [];
        const newFiles = new Set<string>();

        for (const event of events.filter(e => e.type === 'file_change')) {
            // ⊘ ROBUST: Check event.source before path.basename and convert to string
            if (!event.source) continue;
            const sourcePath = String(event.source); // Convert to string safely
            const fileName = path.basename(sourcePath);
            if (fileName.match(/^[A-Z][\w]+Engine\.ts$/)) {
                newFiles.add(fileName);
            }
        }

        for (const file of newFiles) {
            const moduleName = file.replace('.ts', '');
            candidates.push({
                title: `Introduction du module ${moduleName}`,
                context: `New module ${moduleName} created to handle specific responsibilities.`,
                decision: `Introduce ${moduleName} as a dedicated component to manage ${this.getModulePurpose(moduleName)}.`,
                consequences: `Architecture now includes ${moduleName}. Must be properly integrated and tested.`,
                components: [file],
                evidenceIds: events.filter(e => {
                    if (!e.source) return false;
                    const sourcePath = String(e.source); // Convert to string safely
                    return sourcePath.includes(file);
                }).map(e => e.id),
                tags: ['auto', 'architecture', 'new-module']
            });
        }

        return candidates;
    }

    private getModulePurpose(name: string): string {
        if (name.includes('Capture')) return 'data capture';
        if (name.includes('Persistence')) return 'data persistence';
        if (name.includes('RBOM')) return 'reasoning and decision tracking';
        if (name.includes('Event')) return 'event management';
        return 'specific functionality';
    }

    private detectMassiveRefactor(events: CaptureEvent[]): ADRCandidate[] {
        const candidates: ADRCandidate[] = [];
        const coreEvents = events.filter(e => {
            if (!e.source) return false;
            const sourcePath = String(e.source); // Convert to string safely
            return sourcePath.includes('/core/');
        });
        
        if (coreEvents.length >= 10) {
            const coreFiles = new Set(coreEvents.map(e => {
                if (!e.source) return 'unknown';
                const sourcePath = String(e.source); // Convert to string safely
                return path.basename(sourcePath);
            }));
            candidates.push({
                title: 'Refactor massif du noyau technique',
                context: `Large number of files modified in core/ directory (${coreFiles.size} files, ${coreEvents.length} changes).`,
                decision: `Refactor core architecture to improve maintainability and modularity.`,
                consequences: `Core layer structure improved. Breaking changes may affect dependent components.`,
                components: Array.from(coreFiles),
                evidenceIds: coreEvents.map(e => e.id),
                tags: ['auto', 'refactor', 'core-layer']
            });
        }

        return candidates;
    }

    private detectPersistenceStabilization(events: CaptureEvent[]): ADRCandidate[] {
        const candidates: ADRCandidate[] = [];
        
        const persistenceEvents = events.filter(e => 
            e.source.includes('PersistenceManager') || e.source.includes('ManifestGenerator')
        );

        if (persistenceEvents.length >= 8) {
            candidates.push({
                title: 'Stabilisation du contrat de persistance',
                context: `Persistence layer stabilized through ${persistenceEvents.length} iterations. Schema and manifest system now stable.`,
                decision: `Persistence contract finalized with schema validation and automatic manifest generation.`,
                consequences: `RBOM Engine can now rely on stable data schema. Breaking changes must be versioned.`,
                components: ['PersistenceManager.ts', 'ManifestGenerator.ts', 'SchemaManager.ts'],
                evidenceIds: persistenceEvents.map(e => e.id),
                tags: ['auto', 'persistence', 'schema', 'stability']
            });
        }

        return candidates;
    }

    private async createADRFromCandidate(candidate: ADRCandidate): Promise<void> {
        try {
            // ✅ Vérifier si un ADR similaire existe déjà
            const existingADRs = this.rbomEngine.listADRs();
            const similarADR = existingADRs.find(adr => 
                adr.title === candidate.title || 
                adr.components.some(c => candidate.components.includes(c))
            );

            if (similarADR) {
                this.persistence.logWithEmoji('⏭️', `ADR déjà existant: ${candidate.title}`);
                return;
            }

            const adr = this.rbomEngine.createADR({
                title: candidate.title,
                status: 'proposed',
                author: 'system:auto',
                context: candidate.context,
                decision: candidate.decision,
                consequences: candidate.consequences,
                tags: candidate.tags,
                components: candidate.components,
                relatedADRs: [],
                evidenceIds: [],
                autoGenerated: true
            });

            if (adr) {
                // Link evidence
                for (const evidenceId of candidate.evidenceIds) {
                    this.rbomEngine.linkEvidence(adr.id, evidenceId);
                }

                this.persistence.logWithEmoji('🧠', `ADR auto-generated: ${adr.title} (${adr.id})`);
                this.persistence.logWithEmoji('📄', `ADR saved to .reasoning/adrs/${adr.id}.json`);
            }
        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to create ADR from candidate: ${error}`);
        }
    }
}

