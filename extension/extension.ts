import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PersistenceManager } from './core/PersistenceManager';
import { EventAggregator } from './core/EventAggregator';
import { SBOMCaptureEngine } from './core/SBOMCaptureEngine';
import { ConfigCaptureEngine } from './core/ConfigCaptureEngine';
import { TestCaptureEngine } from './core/TestCaptureEngine';
import { GitMetadataEngine } from './core/GitMetadataEngine';
import { SchemaManager } from './core/SchemaManager';
import { ManifestGenerator } from './core/ManifestGenerator';
// RBOM Engine temporarily disabled for diagnostics
// import { RBOMEngine } from './core/rbom/RBOMEngine';
// import { ADR } from './core/rbom/types';
// import { EvidenceMapper } from './core/EvidenceMapper';

let persistence: PersistenceManager | null = null;
let eventAggregator: EventAggregator | null = null;
let sbomCapture: SBOMCaptureEngine | null = null;
let configCapture: ConfigCaptureEngine | null = null;
let testCapture: TestCaptureEngine | null = null;
let gitMetadata: GitMetadataEngine | null = null;
let schemaManager: SchemaManager | null = null;
// RBOM Engine enabled (asynchronously initialized)
let rbomEngine: any = null; // RBOMEngine dynamically loaded
let evidenceMapper: any = null; // EvidenceMapper dynamically loaded
let decisionSynthesizer: any = null; // DecisionSynthesizer dynamically loaded

// Debounce map to prevent event multiplication
const fileDebounceMap = new Map<string, NodeJS.Timeout>();

export async function activate(context: vscode.ExtensionContext) {
    console.log('🧠 Reasoning Layer V3 - Activation started');
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Reasoning Layer V3 requires a workspace folder');
        return;
    }
    
    try {
        // STEP 1: PersistenceManager (core stable)
        persistence = new PersistenceManager(workspaceRoot);
        persistence.logWithEmoji('🧠', 'Reasoning Layer V3 - Activated successfully!');
        
        // STEP 1.5: SchemaManager (persistence contract)
        schemaManager = new SchemaManager(workspaceRoot, persistence);
        persistence.logWithEmoji('📋', 'SchemaManager initialized - persistence contract v1.0');
        
        // Auto-generate initial manifest (DISABLED)
        
        // STEP 2: EventAggregator (centralization + debounce)
        eventAggregator = new EventAggregator();
        console.log('EventAggregator created successfully');
        
        // STEP 2: Connect EventAggregator to PersistenceManager with schema validation
        eventAggregator.on('eventCaptured', (event) => {
            if (schemaManager) {
                const validatedEvent = schemaManager.validateEvent(event);
                if (validatedEvent) {
                    persistence?.saveEvent(validatedEvent as any);
                }
            } else {
                persistence?.saveEvent(event);
            }
        });
        console.log('EventAggregator connected to persistence manager with schema validation');
        
        // Force creation of .reasoning directory
        persistence.logWithEmoji('📁', 'Creating .reasoning directory structure...');
        
        // STEP 2: VS Code Watchers via EventAggregator
        setupVSCodeWatchers();
        persistence.logWithEmoji('👀', 'VS Code file watchers started');
        
        // STEP 3: SBOMCaptureEngine (Priority 1)
        setTimeout(() => {
            if (!persistence || !eventAggregator) return;
            
            try {
                sbomCapture = new SBOMCaptureEngine(workspaceRoot, persistence, eventAggregator);
                sbomCapture.start();
                persistence.logWithEmoji('📦', 'SBOMCaptureEngine started - monitoring dependencies');
            } catch (sbomError) {
                console.warn('⚠️ SBOMCaptureEngine failed to start:', sbomError);
                persistence.logWithEmoji('⚠️', 'SBOMCaptureEngine disabled');
            }
        }, 2000); // Delayed activation of 2 seconds
        
        // STEP 4: ConfigCaptureEngine (Priority 2)
        setTimeout(() => {
            if (!persistence || !eventAggregator) return;
            
            try {
                configCapture = new ConfigCaptureEngine(workspaceRoot, persistence, eventAggregator);
                configCapture.start();
                persistence.logWithEmoji('⚙️', 'ConfigCaptureEngine started - monitoring config files');
            } catch (configError) {
                console.warn('⚠️ ConfigCaptureEngine failed to start:', configError);
                persistence.logWithEmoji('⚠️', 'ConfigCaptureEngine disabled');
            }
        }, 3000); // Delayed activation of 3 seconds
        
        // STEP 5: TestCaptureEngine (Priority 3)
        setTimeout(() => {
            if (!persistence || !eventAggregator) return;
            
            try {
                testCapture = new TestCaptureEngine(workspaceRoot, persistence, eventAggregator);
                testCapture.start();
                persistence.logWithEmoji('🧪', 'TestCaptureEngine started - monitoring test reports');
            } catch (testError) {
                console.warn('⚠️ TestCaptureEngine failed to start:', testError);
                persistence.logWithEmoji('⚠️', 'TestCaptureEngine disabled');
            }
        }, 4000); // Delayed activation of 4 seconds
        
        // STEP 6: GitMetadataEngine (Priority 4)
        setTimeout(async () => {
            if (!persistence || !eventAggregator) return;
            
            try {
                gitMetadata = new GitMetadataEngine(workspaceRoot, persistence, eventAggregator);
                await gitMetadata.start();
                persistence.logWithEmoji('🌿', 'GitMetadataEngine started - monitoring Git metadata');
            } catch (gitError) {
                console.warn('⚠️ GitMetadataEngine failed to start:', gitError);
                persistence.logWithEmoji('⚠️', 'GitMetadataEngine disabled');
            }
        }, 5000); // Delayed activation of 5 seconds
        
        // STEP 6.5: GitHubCaptureEngine (Priority 5)
        setTimeout(async () => {
            if (!persistence || !eventAggregator) return;
            
            try {
                const { GitHubCaptureEngine } = await import('./core/GitHubCaptureEngine');
                const githubCapture = new GitHubCaptureEngine(workspaceRoot, persistence, eventAggregator);
                githubCapture.start();
                persistence.logWithEmoji('🐙', 'GitHubCaptureEngine started - GitHub integration active');
            } catch (githubError) {
                console.warn('⚠️ GitHubCaptureEngine failed to start:', githubError);
                persistence.logWithEmoji('⚠️', 'GitHubCaptureEngine disabled');
            }
        }, 5500); // Delayed activation of 5.5 seconds
        
        // STEP 7: RBOMEngine asynchronous activation via dynamic import
        setTimeout(async () => {
            console.log('🧠 Extension RBOM entrypoint reached (deferred load)');
            
            if (!persistence || !eventAggregator || !workspaceRoot) {
                console.warn('⚠️ Missing dependencies for RBOMEngine');
                return;
            }

            try {
                // Dynamic import to avoid top-level blocking
                const { RBOMEngine } = await import('./core/rbom/RBOMEngine');
                const { EvidenceMapper } = await import('./core/EvidenceMapper');
                const { DecisionSynthesizer } = await import('./core/rbom/DecisionSynthesizer');
                
                // Fire-and-forget callbacks
                const log = (msg: string) => {
                    console.log(msg);
                    persistence?.appendLine(msg);
                };
                const warn = (msg: string) => {
                    console.warn(msg);
                    persistence?.appendLine(`⚠️ ${msg}`);
                };

                console.log('🔧 Creating RBOMEngine instance (async)...');
                rbomEngine = new RBOMEngine(workspaceRoot, log, warn);
                evidenceMapper = new EvidenceMapper();
                decisionSynthesizer = new DecisionSynthesizer(workspaceRoot, persistence, rbomEngine);

                // Fire-and-forget: never await
                console.log('🔧 Calling warmupValidation()...');
                rbomEngine.warmupValidation();

                persistence.logWithEmoji('🧠', 'RBOMEngine initialized asynchronously (deferred 6s)');
                persistence.logWithEmoji('🔗', 'EvidenceMapper ready - Capture ↔ RBOM bridge active');
                persistence.logWithEmoji('🤖', 'DecisionSynthesizer ready - Auto ADR generation enabled');
                console.log('✅ RBOMEngine initialization completed (async deferred)');
                
                // Trigger ADR synthesis after 2 minutes
                setTimeout(() => {
                    console.log('🧠 Starting historical decision synthesis...');
                    decisionSynthesizer?.synthesizeHistoricalDecisions();
                }, 120000); // 2 minutes
                
                // Periodic synthesis every 5 minutes
                setInterval(() => {
                    console.log('🧠 Periodic decision synthesis...');
                    decisionSynthesizer?.synthesizeHistoricalDecisions();
                }, 300000); // 5 minutes
            } catch (rbomError) {
                const errorMsg = rbomError instanceof Error ? rbomError.message : String(rbomError);
                console.warn('⚠️ RBOMEngine could not load:', errorMsg);
                persistence?.logWithEmoji('⚠️', `RBOMEngine disabled - ${errorMsg}`);
            }
        }, 6000); // Delayed activation of 6 seconds to avoid top-level blocking
        
        // GitHub Repository Info (once only)
        persistence.logWithEmoji('🚀', 'GitHub integration available - create repo for full features');
        
        // Base commands
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.init', () => {
                vscode.window.showInformationMessage('✅ Reasoning Layer V3 initialized!');
                persistence?.logWithEmoji('🎉', 'Manual initialization triggered');
                persistence?.show();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.showOutput', () => {
                persistence?.show();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.captureNow', () => {
                vscode.window.showInformationMessage('📸 Manual capture triggered');
                persistence?.logWithEmoji('📸', 'Manual capture triggered');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.checkGitHub', () => {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) return;
                
                const gitDir = require('path').join(workspaceRoot, '.git');
                if (require('fs').existsSync(gitDir)) {
                    vscode.window.showInformationMessage('✅ Git repository detected! Create a GitHub repo to unlock all features.');
                    persistence?.logWithEmoji('✅', 'Git repository detected - GitHub integration available');
                } else {
                    vscode.window.showInformationMessage('❌ No Git repository detected. Initialize Git then create a GitHub repo.');
                    persistence?.logWithEmoji('❌', 'No Git repository detected - initialize Git first');
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.refreshTraces', () => {
                vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
                persistence?.logWithEmoji('🔄', 'Traces refreshed in explorer');
                vscode.window.showInformationMessage('🔄 Traces refreshed!');
            })
        );

        // GitHub Setup Command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.github.setup', async () => {
                try {
                    const { GitHubTokenManager } = await import('./core/GitHubTokenManager');
                    await GitHubTokenManager.showSetupDialog();
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to setup GitHub: ${error}`);
                }
            })
        );

        // GitHub Clear Token Command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.github.clear', async () => {
                try {
                    const { GitHubTokenManager } = await import('./core/GitHubTokenManager');
                    await GitHubTokenManager.clearToken();
                    vscode.window.showInformationMessage('✅ GitHub token cleared');
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to clear token: ${error}`);
                }
            })
        );

        // GitHub Test Command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.github.test', async () => {
                try {
                    const { GitHubTokenManager } = await import('./core/GitHubTokenManager');
                    const { GitHubCaptureEngine } = await import('./core/GitHubCaptureEngine');
                    
                    if (!persistence || !eventAggregator) {
                        vscode.window.showErrorMessage('❌ Persistence or EventAggregator not initialized');
                        return;
                    }

                    const token = GitHubTokenManager.getToken();
                    if (!token) {
                        vscode.window.showWarningMessage('⚠️ No GitHub token found. Please setup token first.');
                        return;
                    }

                    vscode.window.showInformationMessage('🧪 Testing GitHub integration...');
                    const githubCapture = new GitHubCaptureEngine(workspaceRoot!, persistence, eventAggregator);
                    githubCapture.start();
                    vscode.window.showInformationMessage('✅ GitHub integration test complete! Check output logs.');
                } catch (error) {
                    vscode.window.showErrorMessage(`❌ Test failed: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.showSchema', () => {
                if (schemaManager) {
                    const documentation = schemaManager.getSchemaDocumentation();
                    vscode.window.showInformationMessage('📋 Persistence Contract v1.0', 'View Schema').then(selection => {
                        if (selection === 'View Schema') {
                            vscode.workspace.openTextDocument({
                                content: documentation,
                                language: 'markdown'
                            }).then(doc => {
                                vscode.window.showTextDocument(doc);
                            });
                        }
                    });
                } else {
                    vscode.window.showErrorMessage('SchemaManager not initialized');
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.validateTraces', () => {
                if (schemaManager && persistence) {
                    const tracesPath = persistence.getTracesPath();
                    const isValid = schemaManager.validateTracesFile(tracesPath);
                    if (isValid) {
                        vscode.window.showInformationMessage('✅ Traces file is valid');
                    } else {
                        vscode.window.showErrorMessage('❌ Traces file validation failed');
                    }
                } else {
                    vscode.window.showErrorMessage('SchemaManager or PersistenceManager not initialized');
                }
            })
        );

        // RBOM Engine DISABLED for Layer 1 stability (re-enabled in Strata 2)
        /*
        if (workspaceRoot) {
            rbomEngine = new RBOMEngine(workspaceRoot);
            evidenceMapper = new EvidenceMapper();
            decisionSynthesizer = new DecisionSynthesizer(workspaceRoot, persistence, rbomEngine);
            persistence.logWithEmoji('🧠', 'RBOM Engine initialized with historical synthesis');

            const synthesisInterval = setInterval(() => {
                decisionSynthesizer?.synthesizeHistoricalDecisions();
            }, 300000);

            context.subscriptions.push({
                dispose: () => clearInterval(synthesisInterval)
            });

            setTimeout(() => {
                decisionSynthesizer?.synthesizeHistoricalDecisions();
            }, 120000);
        }
        */

        // ✅ ADR Commands ACTIVÉS (Layer 2)
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.create', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                const title = await vscode.window.showInputBox({
                    prompt: 'Enter ADR title',
                    placeHolder: 'e.g., Use TypeScript for type safety'
                });

                if (!title) return;

                const author = await vscode.window.showInputBox({
                    prompt: 'Enter author name',
                    value: 'Developer'
                });

                if (!author) return;

                const adr = rbomEngine.createADR({
                    title,
                    author,
                    status: 'proposed',
                    context: '',
                    decision: '',
                    consequences: ''
                });

                if (adr) {
                    vscode.window.showInformationMessage(`✅ ADR created: ${adr.id}`);
                    persistence?.logWithEmoji('📝', `ADR created: ${adr.title}`);
                } else {
                    vscode.window.showErrorMessage('❌ Failed to create ADR');
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.list', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                const adrs = rbomEngine.listADRs();
                
                if (adrs.length === 0) {
                    vscode.window.showInformationMessage('📋 No ADRs found. Create one with "Create ADR" command.');
                    return;
                }

                const items = adrs.map((adr: any) => ({
                    label: `📄 ${adr.title}`,
                    description: `Status: ${adr.status} | ${adr.evidenceIds?.length || 0} evidence(s)`,
                    adr
                }));

                const selected: any = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select an ADR to view'
                });

                if (selected && selected.adr) {
                    vscode.commands.executeCommand('reasoning.adr.view', selected.adr.id);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.view', async (adrId?: string) => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                let id = adrId;
                
                if (!id) {
                    const adrs = rbomEngine.listADRs();
                    if (adrs.length === 0) {
                        vscode.window.showInformationMessage('📋 No ADRs found');
                        return;
                    }

                    const items = adrs.map((adr: any) => ({
                        label: adr.title,
                        description: `Status: ${adr.status}`,
                        id: adr.id
                    }));

                    const selected: any = await vscode.window.showQuickPick(items);
                    if (!selected) return;
                    id = selected.id;
                }

                const adr = rbomEngine.getADR(id);
                if (!adr) {
                    vscode.window.showErrorMessage(`ADR not found: ${id}`);
                    return;
                }

                // Open ADR in new editor
                const content = `# ${adr.title}

**Status**: ${adr.status}
**Author**: ${adr.author}
**Created**: ${adr.createdAt}
**Modified**: ${adr.modifiedAt}

## Context
${adr.context}

## Decision
${adr.decision}

## Consequences
${adr.consequences}

## Tags
${adr.tags.join(', ')}

## Components
${adr.components.join(', ')}

## Evidence
${adr.evidenceIds.length} evidence(s) linked
`;

                const doc = await vscode.workspace.openTextDocument({
                    content,
                    language: 'markdown'
                });
                vscode.window.showTextDocument(doc);

                persistence?.logWithEmoji('👁️', `Viewing ADR: ${adr.title}`);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.link', async () => {
                if (!rbomEngine || !persistence) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                const adrs = rbomEngine.listADRs();
                if (adrs.length === 0) {
                    vscode.window.showInformationMessage('📋 No ADRs found. Create one first.');
                    return;
                }

                const adrItems = adrs.map((adr: any) => ({
                    label: adr.title,
                    description: `Status: ${adr.status}`,
                    adrId: adr.id
                }));

                const selectedADR: any = await vscode.window.showQuickPick(adrItems, {
                    placeHolder: 'Select ADR to link evidence'
                });

                if (!selectedADR) return;

                // Load recent evidence (from traces)
                const tracesPath = path.join(persistence.getWorkspaceRoot(), '.reasoning', 'traces');
                let evidenceCount = 0;
                
                if (fs.existsSync(tracesPath)) {
                    const files = fs.readdirSync(tracesPath).filter(f => f.endsWith('.json'));
                    for (const file of files) {
                        const filePath = path.join(tracesPath, file);
                        const events = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        evidenceCount += events.length;
                    }
                }

                vscode.window.showInformationMessage(`🔗 Link evidence to ADR\nFound ${evidenceCount} events in traces`);
                persistence.logWithEmoji('🔗', `Linking evidence to ADR: ${selectedADR?.label || 'Unknown'}`);
            })
        );

        // Auto-synthesis ADR Command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.auto', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized. Please wait a few seconds.');
                    persistence?.logWithEmoji('⚠️', 'Auto-synthesis skipped: RBOM Engine not ready');
                    return;
                }

                const progressOptions: vscode.ProgressOptions = {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Auto-generating ADRs',
                    cancellable: false
                };

                vscode.window.withProgress(progressOptions, async () => {
                    try {
                        if (decisionSynthesizer) {
                            await decisionSynthesizer.runAutoSynthesis();
                            vscode.window.showInformationMessage('✅ Auto ADR synthesis complete!');
                            persistence?.logWithEmoji('✅', 'Auto-synthesis completed successfully');
                        } else {
                            vscode.window.showErrorMessage('DecisionSynthesizer not initialized');
                        }
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Auto-synthesis failed: ${errorMsg}`);
                        persistence?.logWithEmoji('❌', `Auto-synthesis error: ${errorMsg}`);
                    }
                });
            })
        );

        // Evolution Timeline Commands
        let evolutionManager: any = null;
        
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.evolution', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                // Dynamic import of EvolutionManager
                if (!evolutionManager) {
                    const { EvolutionManager } = await import('./core/rbom/EvolutionManager');
                    evolutionManager = new EvolutionManager(rbomEngine, (msg: string) => persistence?.logWithEmoji('🔄', msg));
                }

                const allADRs = rbomEngine.listADRs();
                if (allADRs.length === 0) {
                    vscode.window.showInformationMessage('No ADRs found. Create some ADRs first.');
                    return;
                }

                interface ADRChoice {
                    label: string;
                    adr: any;
                }
                
                const adrChoices: ADRChoice[] = allADRs.map((adr: any) => ({ label: adr.title, adr }));
                const selected = await vscode.window.showQuickPick(adrChoices, {
                    placeHolder: 'Select an ADR to view its evolution timeline'
                });

                if (selected && selected.adr) {
                    const timeline = evolutionManager.getEvolutionTimeline(selected.adr.id);
                    if (timeline.length === 0) {
                        vscode.window.showInformationMessage(`No evolution links found for "${selected.adr.title}"`);
                    } else {
                        const details = timeline.map((link: any) => `• ${link.from.substring(0, 8)} → ${link.to.substring(0, 8)}`).join('\n');
                        vscode.window.showInformationMessage(`Evolution timeline for "${selected.adr.title}":\n${details}`);
                    }
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.deprecated', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                if (!evolutionManager) {
                    const { EvolutionManager } = await import('./core/rbom/EvolutionManager');
                    evolutionManager = new EvolutionManager(rbomEngine, (msg: string) => persistence?.logWithEmoji('🔄', msg));
                }

                const deprecated = evolutionManager.getDeprecatedADRs();
                if (deprecated.length === 0) {
                    vscode.window.showInformationMessage('No deprecated ADRs found.');
                } else {
                    const list = deprecated.map((adr: any) => `• ${adr.title} (${adr.status})`).join('\n');
                    vscode.window.showInformationMessage(`Deprecated ADRs:\n${list}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.suggest', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                if (!evolutionManager) {
                    const { EvolutionManager } = await import('./core/rbom/EvolutionManager');
                    evolutionManager = new EvolutionManager(rbomEngine, (msg: string) => persistence?.logWithEmoji('🔄', msg));
                }

                vscode.window.showInformationMessage('Analyzing ADRs for potential superseding relationships...');
                const suggestions = evolutionManager.suggestSuperseding();
                
                if (suggestions.length === 0) {
                    vscode.window.showInformationMessage('No potential superseding relationships found.');
                } else {
                    const top = suggestions.slice(0, 5);
                    const list = top.map((s: any) => `• Similarity: ${(s.similarity * 100).toFixed(0)}% between ${s.adr1.substring(0, 8)} and ${s.adr2.substring(0, 8)}`).join('\n');
                    vscode.window.showInformationMessage(`Potential superseding relationships:\n${list}`);
                }
            })
        );

        // Rationale Scorer Command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.adr.score', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                const allADRs = rbomEngine.listADRs();
                if (allADRs.length === 0) {
                    vscode.window.showInformationMessage('No ADRs found. Create some ADRs first.');
                    return;
                }

                interface ADRChoice {
                    label: string;
                    adr: any;
                }
                
                const adrChoices: ADRChoice[] = allADRs.map((adr: any) => ({ label: `${adr.title} (${adr.status})`, adr }));
                const selected = await vscode.window.showQuickPick(adrChoices, {
                    placeHolder: 'Select an ADR to score its rationale quality'
                });

                if (selected && selected.adr) {
                    // Dynamic import of RationaleScorer
                    const { RationaleScorer } = await import('./core/rbom/RationaleScorer');
                    const scorer = new RationaleScorer();
                    
                    const score = scorer.calculateScore(selected.adr);
                    const label = scorer.getQualityLabel(score.overall);
                    const suggestions = scorer.suggestImprovements(selected.adr);

                    const report = [
                        `📊 Rationale Quality Score: ${(score.overall * 100).toFixed(0)}% (${label})`,
                        '',
                        `Evidence: ${(score.evidence * 100).toFixed(0)}%`,
                        `Trade-offs: ${(score.tradeoffs * 100).toFixed(0)}%`,
                        `Alternatives: ${(score.alternatives * 100).toFixed(0)}%`,
                        `Assumptions: ${(score.assumptions * 100).toFixed(0)}%`,
                        `Risks: ${(score.risks * 100).toFixed(0)}%`,
                        `Mitigations: ${(score.mitigations * 100).toFixed(0)}%`,
                        `Completeness: ${(score.completeness * 100).toFixed(0)}%`,
                    ];

                    if (suggestions.length > 0) {
                        report.push('', '💡 Suggestions:', ...suggestions.map(s => `  • ${s}`));
                    }

                    vscode.window.showInformationMessage(report.join('\n'));
                }
            })
        );

        console.log('✅ Reasoning Layer V3 - Commands registered successfully');
        vscode.window.showInformationMessage('🧠 Reasoning Layer V3 is now active!');

        // Generate manifest after 2 seconds (safe)
        setTimeout(async () => {
            try {
                if (persistence && workspaceRoot) {
                    const manifestGenerator = new ManifestGenerator(workspaceRoot, persistence);
                    await manifestGenerator.generate();
                    persistence.logWithEmoji('📄', 'Manifest auto-generated successfully');
                }
            } catch (err) {
                persistence?.logWithEmoji('⚠️', `Manifest generation skipped: ${(err as Error).message}`);
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Activation failed:', error);
        vscode.window.showErrorMessage(`Failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    console.log('🧠 Reasoning Layer V3 - Deactivating...');
    
    if (sbomCapture) {
        sbomCapture.stop();
    }
    
    if (configCapture) {
        configCapture.stop();
    }
    
    if (testCapture) {
        testCapture.stop();
    }
    
    if (gitMetadata) {
        gitMetadata.stop();
    }
    
    if (eventAggregator) {
        eventAggregator.dispose();
    }
    
    if (persistence) {
        persistence.dispose();
    }
    
    console.log('✅ Extension deactivated successfully');
}

// STEP 1: VS Code Watchers (progressive and safe)
function setupVSCodeWatchers() {
    if (!persistence) {
        console.warn('⚠️ PersistenceManager not available for watchers');
        return;
    }

    // 1. Text document changes (avec debounce)
    vscode.workspace.onDidChangeTextDocument(textDocEvent => {
        if (textDocEvent.document.isUntitled || textDocEvent.document.uri.scheme !== 'file') {
            return;
        }

        if (shouldIgnoreFile(textDocEvent.document.uri.fsPath)) {
            return;
        }

        const filePath = textDocEvent.document.uri.fsPath;

        // Debounce to prevent event multiplication
        const existingTimeout = fileDebounceMap.get(filePath);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
            const change = textDocEvent.contentChanges[0];
            if (change && eventAggregator) {
                eventAggregator.captureEvent(
                    'file_change',
                    filePath,
                    {
                        language: textDocEvent.document.languageId,
                        lineCount: textDocEvent.document.lineCount,
                        level: '1 - Code & Structure Technique',
                        category: 'File Changes'
                    }
                );
                persistence?.logWithEmoji('📝', `File modified: ${path.basename(filePath)}`);
            }
            fileDebounceMap.delete(filePath);
        }, 1000); // 1 second debounce

        fileDebounceMap.set(filePath, timeout);
    });

    // 2. File saves
    vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.scheme !== 'file' || shouldIgnoreFile(document.uri.fsPath)) {
            return;
        }

        if (eventAggregator) {
            eventAggregator.captureEvent(
                'file_change',
                document.uri.fsPath,
                {
                    action: 'save',
                    language: document.languageId,
                    lineCount: document.lineCount,
                    level: '1 - Code & Structure Technique',
                    category: 'File Saves'
                }
            );
            persistence?.logWithEmoji('💾', `File saved: ${document.fileName}`);
        }
    });
}

// COPIED V2 - Robust filtering
function shouldIgnoreFile(filePath: string): boolean {
    const ignoredPatterns = [
        /node_modules\//,
        /\.git\//,
        /\.vscode\//,
        /out\//,
        /dist\//,
        /build\//,
        /\.reasoning\//,
        /\.cache\//,
        /coverage\//,
        /\.map$/,
        /\.tmp$/,
        /\.log$/
    ];

    return ignoredPatterns.some(pattern => pattern.test(filePath));
}
