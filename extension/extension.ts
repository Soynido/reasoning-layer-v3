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
import { RBOMEngine } from './core/rbom/RBOMEngine';
import { ADR } from './core/rbom/types';
import { EvidenceMapper } from './core/EvidenceMapper';
import { DecisionDetector } from './core/rbom/DecisionDetector';

let persistence: PersistenceManager | null = null;
let eventAggregator: EventAggregator | null = null;
let sbomCapture: SBOMCaptureEngine | null = null;
let configCapture: ConfigCaptureEngine | null = null;
let testCapture: TestCaptureEngine | null = null;
let gitMetadata: GitMetadataEngine | null = null;
let schemaManager: SchemaManager | null = null;
let rbomEngine: RBOMEngine | null = null;
let evidenceMapper: EvidenceMapper | null = null;
let decisionDetector: DecisionDetector | null = null;

// ✅ Debounce map pour éviter la multiplication d'événements
const fileDebounceMap = new Map<string, NodeJS.Timeout>();

export async function activate(context: vscode.ExtensionContext) {
    console.log('🧠 Reasoning Layer V3 - Activation started');
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Reasoning Layer V3 requires a workspace folder');
        return;
    }
    
    try {
        // ✅ ÉTAPE 1: PersistenceManager (core stable)
        persistence = new PersistenceManager(workspaceRoot);
        persistence.logWithEmoji('🧠', 'Reasoning Layer V3 - Activated successfully!');
        
        // ✅ ÉTAPE 1.5: SchemaManager (persistence contract)
        schemaManager = new SchemaManager(workspaceRoot, persistence);
        persistence.logWithEmoji('📋', 'SchemaManager initialized - persistence contract v1.0');
        
        // ✅ Auto-générer le manifest initial (DÉSACTIVÉ)
        
        // ✅ ÉTAPE 2: EventAggregator (centralisation + debounce)
        eventAggregator = new EventAggregator();
        console.log('EventAggregator created successfully');
        
        // ✅ ÉTAPE 2: Connecter EventAggregator au PersistenceManager avec validation schema
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
        
        // Forcer la création du dossier .reasoning
        persistence.logWithEmoji('📁', 'Creating .reasoning directory structure...');
        
        // ✅ ÉTAPE 2: VS Code Watchers via EventAggregator
        setupVSCodeWatchers();
        persistence.logWithEmoji('👀', 'VS Code file watchers started');
        
        // ✅ ÉTAPE 3: SBOMCaptureEngine (Priorité 1)
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
        }, 2000); // Activation différée de 2 secondes
        
        // ✅ ÉTAPE 4: ConfigCaptureEngine (Priorité 2)
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
        }, 3000); // Activation différée de 3 secondes
        
        // ✅ ÉTAPE 5: TestCaptureEngine (Priorité 3)
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
        }, 4000); // Activation différée de 4 secondes
        
        // ✅ ÉTAPE 6: GitMetadataEngine (Priorité 4)
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
        }, 5000); // Activation différée de 5 secondes
        
        // ✅ GitHub Repository Info (once only)
        persistence.logWithEmoji('🚀', 'GitHub integration available - create repo for full features');
        
        // Commandes de base
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

        // ✅ RBOM Engine initialization
        if (workspaceRoot) {
            rbomEngine = new RBOMEngine(workspaceRoot);
            evidenceMapper = new EvidenceMapper();
            decisionDetector = new DecisionDetector(workspaceRoot, persistence, rbomEngine, evidenceMapper);
            persistence.logWithEmoji('🧠', 'RBOM Engine initialized with auto-decision detection');

            // ✅ Activer le scanner automatique
            const scanInterval = setInterval(() => {
                decisionDetector?.scanRecentEvents();
            }, 10000); // Scan toutes les 10 secondes

            context.subscriptions.push({
                dispose: () => clearInterval(scanInterval)
            });
        }

        // ✅ ADR Commands
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

                const items = adrs.map(adr => ({
                    label: `📄 ${adr.title}`,
                    description: `Status: ${adr.status} | ${adr.evidenceIds.length} evidence(s)`,
                    adr
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select an ADR to view'
                });

                if (selected) {
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

                    const items = adrs.map(adr => ({
                        label: adr.title,
                        description: `Status: ${adr.status}`,
                        id: adr.id
                    }));

                    const selected = await vscode.window.showQuickPick(items);
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

                const adrItems = adrs.map(adr => ({
                    label: adr.title,
                    description: `Status: ${adr.status}`,
                    adrId: adr.id
                }));

                const selectedADR = await vscode.window.showQuickPick(adrItems, {
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
                persistence.logWithEmoji('🔗', `Linking evidence to ADR: ${selectedADR.label}`);
            })
        );

        console.log('✅ Reasoning Layer V3 - Commands registered successfully');
        vscode.window.showInformationMessage('🧠 Reasoning Layer V3 is now active!');

        // ✅ Générer le manifest après 2 secondes (sécurisé)
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

// ✅ ÉTAPE 1: VS Code Watchers (progressive et sécurisé)
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

        // ✅ Debounce pour éviter la multiplication d'événements
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
        }, 1000); // 1 seconde de debounce

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

// ✅ COPIÉ V2 - Filtrage robuste
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
