import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from '../PersistenceManager';
import { RBOMEngine } from './RBOMEngine';
import { CaptureEvent } from '../types';
import { ADR } from './types';

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

/**
 * DecisionSynthesizer - Analyse historique complète et génère des ADRs
 * 
 * Utilise une approche "long-form reasoning" sur tout l'historique
 */
export class DecisionSynthesizer {
    private lastSynthesis: number = 0;

    constructor(
        private workspaceRoot: string,
        private persistence: PersistenceManager,
        private rbomEngine: RBOMEngine
    ) {
        this.persistence.logWithEmoji('🧠', 'DecisionSynthesizer initialized with historical analysis');
    }

    public async synthesizeHistoricalDecisions(): Promise<void> {
        const now = Date.now();
        if (now - this.lastSynthesis < 300000) { // Synthèse toutes les 5 minutes
            return;
        }
        this.lastSynthesis = now;

        try {
            // ✅ Étape 1 : Lire toutes les traces
            const allEvents = this.loadAllEvents();
            if (allEvents.length === 0) {
                this.persistence.logWithEmoji('⚠️', 'No historical events found');
                return;
            }

            this.persistence.logWithEmoji('📚', `Analyzing ${allEvents.length} historical events...`);

            // ✅ Étape 2 : Pré-filtrage intelligent
            const summary = this.createIntelligentSummary(allEvents);
            
            this.persistence.logWithEmoji('🔍', `Summary: ${summary.totalEvents} events, ${summary.majorChanges.length} major changes`);

            // ✅ Étape 3 : Raisonnement architectural
            const adrCandidates = this.reasonArchitecturalDecisions(summary, allEvents);

            // ✅ Étape 4 : Générer les ADRs
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
        const tracesDir = path.join(this.workspaceRoot, '.reasoning', 'traces');
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
            
            const fileName = path.basename(event.source);
            summary.byFile[fileName] = (summary.byFile[fileName] || 0) + 1;
            
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
            const dir = path.dirname(event.source);
            if (!fileGroups.has(dir)) fileGroups.set(dir, []);
            fileGroups.get(dir)!.push(event);
        }

        for (const [dir, dirEvents] of fileGroups.entries()) {
            if (dirEvents.length >= 5) {
                const recentEvent = dirEvents[dirEvents.length - 1];
                summary.majorChanges.push({
                    description: `Intensive development in ${path.basename(dir)}`,
                    files: dirEvents.map(e => path.basename(e.source)),
                    count: dirEvents.length,
                    timestamp: recentEvent.timestamp
                });
            }
        }

        return summary;
    }

    private reasonArchitecturalDecisions(summary: EventSummary, events: CaptureEvent[]): ADRFromSummary[] {
        const decisions: ADRFromSummary[] = [];

        // ✅ Pattern 1: Structure de persistance établie
        // Intent: Détecter la décision humaine de stabiliser un contrat de persistance
        if (summary.byFile['PersistenceManager.ts'] > 3 || summary.byFile['ManifestGenerator.ts'] > 2) {
            const persistenceEvents = events.filter(e => 
                e.source.includes('PersistenceManager') || 
                e.source.includes('ManifestGenerator') ||
                e.source.includes('SchemaManager')
            );

            decisions.push({
                title: 'Stabilisation du contrat de persistance via manifest versionné',
                context: `Le développeur a itéré ${summary.byFile['PersistenceManager.ts'] || 0} fois sur PersistenceManager et ${summary.byFile['ManifestGenerator.ts'] || 0} fois sur ManifestGenerator. L'intention implicite était de garantir la cohérence des données capturées.`,
                decision: 'Le choix fait: implémenter un moteur de persistance local-first avec manifest versionné et schéma Zod pour validation. Cette décision visait à éviter la corruption de données et faciliter le debugging.',
                consequences: 'Impact observable: architecture locale sans dépendance serveur, validation systématique des événements, manifest toujours en cohérence avec les traces.',
                components: ['PersistenceManager.ts', 'ManifestGenerator.ts', 'SchemaManager.ts'],
                evidenceIds: persistenceEvents.map(e => e.id).slice(0, 5),
                tags: ['decision', 'persistence', 'data-integrity'],
                confidence: 0.95
            });
        }

        // ✅ Pattern 2: Capture d'événements multi-capteurs
        const captureEngines = ['SBOMCaptureEngine', 'ConfigCaptureEngine', 'TestCaptureEngine', 'GitMetadataEngine'];
        const enginesDetected = captureEngines.filter(engine => {
            return Object.keys(summary.byFile).some(file => file.includes(engine.replace('Engine', '')));
        });

        if (enginesDetected.length >= 2) {
            decisions.push({
                title: 'Adoption d\'une architecture modulaire par capteur spécialisé',
                context: `Le développement montre la création de ${enginesDetected.length} engines séparés (${enginesDetected.join(', ')}). L'intention était de découpler les responsabilités de capture par domaine technique.`,
                decision: 'Le choix fait: un engine par type de métadonnée plutôt qu\'un capteur monolithique. Cette décision visait à améliorer la maintenabilité et tester chaque capteur indépendamment.',
                consequences: 'Impact observable: le code est plus modulaire, chaque engine peut évoluer sans affecter les autres. Cela facilite l\'ajout de nouveaux capteurs.',
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
                title: `Adoption de librairies externes pour ${strategicDeps.join(', ')}`,
                context: `Le projet a ajouté les dépendances ${strategicDeps.join(' et ')} dans package-lock.json. L'intention était d'utiliser des solutions matures plutôt que de réinventer.`,
                decision: `Le choix fait: utiliser ${strategicDeps.map(d => `${d} (${this.getDepPurpose(d)})`).join(' et ')}. Cette décision visait à gagner du temps et éviter les bugs.`,
                consequences: 'Impact observable: code plus stable, moins de maintenance, mais dépendance de communauté externe.',
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
                    title: 'Usage de Git pour traçabilité des décisions via historique',
                    context: `${totalCommits} commits détectés, ${authors.length} contributeur(s). Le développement montre l'utilisation de Git comme outil de traçabilité.`,
                    decision: 'Le choix fait: maintenir un historique Git complet avec commits structurés. Cette décision visait à documenter naturellement les changements.',
                    consequences: 'Impact observable: L\'historique Git devient source de vérité pour comprendre l\'évolution du projet.',
                    components: ['git'],
                    evidenceIds: events.filter(e => e.type === 'git_commit').map(e => e.id).slice(0, 5),
                    tags: ['decision', 'git', 'traceability'],
                    confidence: 0.80
                });
            }
        }

        // ✅ Pattern 5: Refactor majeur détecté
        if (summary.majorChanges.length > 0) {
            const biggestChange = summary.majorChanges.sort((a, b) => b.count - a.count)[0];
            if (biggestChange.count >= 10) {
                const changeEvents = events.filter(e => 
                    biggestChange.files.some(file => e.source.includes(file))
                );

                decisions.push({
                    title: `Refactor majeur de ${path.basename(biggestChange.files[0]?.split('/')[0] || 'unknown')}`,
                    context: `${biggestChange.count} modifications détectées sur ${biggestChange.files.length} fichiers dans ${biggestChange.description}. Le développeur a choisi de refactoriser plutôt que d'ajouter des patches.`,
                    decision: 'Le choix fait: refactoriser plutôt que d\'ajouter des workarounds. Cette décision visait à améliorer la maintenabilité à long terme.',
                    consequences: 'Impact observable: code plus propre, architecture plus claire, mais risque de breaking changes à court terme.',
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

            if (adr) {
                // Link evidence
                for (const evidenceId of candidate.evidenceIds) {
                    this.rbomEngine.linkEvidence(adr.id, evidenceId);
                }

                this.persistence.logWithEmoji('🧠', `Historical ADR synthesized: ${adr.title} (confidence: ${(candidate.confidence * 100).toFixed(0)}%)`);
            }

        } catch (error) {
            this.persistence.logWithEmoji('❌', `Failed to create synthesized ADR: ${error}`);
        }
    }
}

