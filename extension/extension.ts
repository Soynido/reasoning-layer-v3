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
import { registerObserveCommands } from './commands/observe';
import { registerUnderstandCommands } from './commands/understand';
import { registerExecuteCommands } from './commands/execute';
import { registerMaintainCommands } from './commands/maintain';
import { registerHelpCommands } from './commands/help';
import { registerAgentCommands } from './commands/agent';
import { registerPlanCommands } from './commands/contextual/plan';
import { registerTasksCommands } from './commands/contextual/tasks';
import { registerReportsCommands } from './commands/contextual/reports';
import { registerForecastsCommands } from './commands/contextual/forecasts';
import { registerPatternsCommands } from './commands/contextual/patterns';
import { registerLegacyRedirects } from './core/compat/commandRedirects';
import { runSelfAudit } from './core/selfAudit';
import { runCognitiveAwakening } from './core/onboarding/AwakeningSequence';
import { showCognitiveGreeting } from './core/onboarding/CognitiveGreeting';
import { CognitiveRebuilder } from './core/autonomous/CognitiveRebuilder';
import { UnifiedLogger } from './core/UnifiedLogger';
import { getCursorChatIntegration } from './core/integrations/CursorChatIntegration';
import { loadManifest } from './core/utils/manifestLoader';
import { GitCommitListener } from './core/inputs/GitCommitListener';
import { FileChangeWatcher } from './core/inputs/FileChangeWatcher';
import { GitHubDiscussionListener } from './core/inputs/GitHubDiscussionListener';
import { ShellMessageCapture } from './core/inputs/ShellMessageCapture';
// RBOM Engine temporarily disabled for diagnostics
// import { RBOMEngine } from './core/rbom/RBOMEngine';
// import { ADR } from './core/rbom/types';
// import { EvidenceMapper } from './core/EvidenceMapper';

let persistence: PersistenceManager | null = null;
let cursorChatIntegration: any = null;
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

// Level 5: Security components
let integrityEngine: any = null; // IntegrityEngine dynamically loaded
let snapshotManager: any = null; // SnapshotManager dynamically loaded
let lifecycleManager: any = null; // LifecycleManager dynamically loaded

// Level 7: Reasoning components
let patternLearningEngine: any = null; // PatternLearningEngine dynamically loaded

// Input Layer components
let gitCommitListener: GitCommitListener | null = null;
let fileChangeWatcher: FileChangeWatcher | null = null;
let githubDiscussionListener: GitHubDiscussionListener | null = null;
let shellMessageCapture: ShellMessageCapture | null = null;

// Autonomous cycle timers
let autonomousTimers: Array<ReturnType<typeof setInterval>> = [];

// Status bar item (visual activation indicator)
let rl3StatusBarItem: vscode.StatusBarItem | null = null;
// Track if output channel is currently visible
let outputChannelVisible = false;

// Debounce map to prevent event multiplication
const fileDebounceMap = new Map<string, NodeJS.Timeout>();

export async function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Reasoning Layer V3 requires a workspace folder');
        return;
    }
    
    // Initialize Unified Logger (single source of truth for all output)
    const logger = UnifiedLogger.getInstance();
    logger.show();
    
    // Load manifest data (supports both camelCase and snake_case)
    const manifest = loadManifest(workspaceRoot);
    const totalEvents = manifest.totalEvents;
    let githubConnected = false;
    
    // Check GitHub status
    const githubTokenPath = path.join(workspaceRoot, '.reasoning', 'security', 'github.json');
    githubConnected = fs.existsSync(githubTokenPath);
    
    // Log startup header
    const workspaceName = path.basename(workspaceRoot);
    logger.logStartup(workspaceName, totalEvents, githubConnected);
    
    try {
        // STEP 1: PersistenceManager (core stable)
        persistence = new PersistenceManager(workspaceRoot);
        persistence.logWithEmoji('🧠', 'Reasoning Layer V3 - Activated successfully!');

        // Status bar indicator (bottom-left): opens output channel on click
        try {
            rl3StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
            rl3StatusBarItem.text = '$(rocket) RL3 Activated';
            rl3StatusBarItem.tooltip = 'Reasoning Layer V3 — Click to open Output';
            // Register a dedicated command to ensure output channel opens reliably
            const openOutputCmd = vscode.commands.registerCommand('reasoning.status.openOutput', async () => {
                // Only open if not already visible
                if (!outputChannelVisible) {
                    persistence?.show();
                    // Ensure the Output panel is explicitly shown (avoid toggle behavior)
                    await vscode.commands.executeCommand('workbench.action.output.show');
                    outputChannelVisible = true;
                    persistence?.logWithEmoji('📺', 'Output channel opened');
                }
            });
            context.subscriptions.push(openOutputCmd);
            rl3StatusBarItem.command = 'reasoning.status.openOutput';
            rl3StatusBarItem.show();
            context.subscriptions.push(rl3StatusBarItem);
            persistence.logWithEmoji('🟢', 'Status bar: RL3 Activated');
            // Auto-open output once on activation for visual cue
            setTimeout(() => {
                if (!outputChannelVisible) {
                    // Show activation notification with CTA (non-blocking)
                    void vscode.window.showInformationMessage(
                        '🧠 RL3 Activated — Click "Open Output" to view logs.',
                        'Open Output'
                    ).then(sel => { 
                        if (sel === 'Open Output' && !outputChannelVisible) { 
                            vscode.commands.executeCommand('reasoning.status.openOutput'); 
                        } 
                    });
                    // Also reveal the output once on activation to provide a visual cue
                    setTimeout(() => {
                        if (!outputChannelVisible) {
                            persistence?.show();
                            void vscode.commands.executeCommand('workbench.action.output.show');
                            outputChannelVisible = true;
                        }
                    }, 250);
                }
            }, 700);
        } catch (e) {
            // Non-blocking
        }
        
        // STEP 1.5: SchemaManager (persistence contract)
        schemaManager = new SchemaManager(workspaceRoot, persistence);
        persistence.logWithEmoji('📋', 'SchemaManager initialized - persistence contract v1.0');
        
        // STEP 1.6: GitHub connection health check (fine-grained only)
        setTimeout(async () => {
            try {
                const { GitHubFineGrainedManager } = await import('./core/integrations/GitHubFineGrainedManager');
                const gh = new GitHubFineGrainedManager(workspaceRoot);
                const status = await gh.checkConnection();
                if (!status.ok) {
                    let msg = 'GitHub is not connected.';
                    if (status.reason === 'no_repo') msg = 'No GitHub repository detected in this workspace.';
                    if (status.reason === 'missing_token') msg = `No fine-grained token found for ${status.repo}.`;
                    if (status.reason === 'unauthorized') msg = 'GitHub token unauthorized or expired.';
                    if (status.reason === 'missing_repo_access') msg = 'GitHub token valid but lacks repository access permissions.';

                    // Auto-clean invalid/revoked tokens to avoid conflicts
                    if (status.reason === 'unauthorized') {
                        try {
                            const tokenPath = path.join(workspaceRoot, '.reasoning', 'security', 'github.json');
                            if (fs.existsSync(tokenPath)) {
                                fs.unlinkSync(tokenPath);
                                persistence?.logWithEmoji('🧹', 'Removed invalid GitHub token from workspace');
                            }
                        } catch {}
                    }

                    const action = await vscode.window.showInformationMessage(
                        `🐙 ${msg} Connect now?`,
                        'Connect GitHub',
                        'Dismiss'
                    );
                    if (action === 'Connect GitHub') {
                        void vscode.commands.executeCommand('reasoning.github.setup');
                    }
                } else {
                    if (persistence) {
                        persistence.logWithEmoji('🐙', `GitHub connected for ${status.repo}`);
                    }
                }
            } catch (e) {
                // Do not block activation on GitHub check
            }
        }, 1200);

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
        
        // 🎧 INPUT LAYER: GitCommitListener (Priority 6)
        setTimeout(async () => {
            if (!persistence) return;
            
            try {
                gitCommitListener = new GitCommitListener(workspaceRoot);
                if (gitCommitListener.isGitRepository()) {
                    await gitCommitListener.startWatching();
                    persistence.logWithEmoji('🎧', 'GitCommitListener started - Input Layer active');
                    logger.log('✅ Input Layer Phase 1: GitCommitListener operational');
                } else {
                    persistence.logWithEmoji('⚠️', 'GitCommitListener disabled - Not a Git repository');
                }
            } catch (gitListenerError) {
                console.warn('⚠️ GitCommitListener failed to start:', gitListenerError);
                persistence.logWithEmoji('⚠️', 'GitCommitListener disabled');
            }
        }, 6500); // Delayed activation of 6.5 seconds
        
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

        // GitHub Setup Command (Fine-Grained Integration)
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.github.setup', async () => {
                try {
                    const { GitHubFineGrainedManager } = await import('./core/integrations/GitHubFineGrainedManager');
                    const manager = new GitHubFineGrainedManager(workspaceRoot);
                    await manager.setupIntegration();
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
                    const { GitHubFineGrainedManager } = await import('./core/integrations/GitHubFineGrainedManager');
                    const { GitHubCaptureEngine } = await import('./core/GitHubCaptureEngine');
                    
                    if (!persistence || !eventAggregator) {
                        vscode.window.showErrorMessage('❌ Persistence or EventAggregator not initialized');
                        return;
                    }

                    const fgm = new GitHubFineGrainedManager(workspaceRoot!);
                    const token = fgm.getToken();
                    if (!token) {
                        vscode.window.showWarningMessage('⚠️ No fine-grained GitHub token found. Please run "Setup GitHub integration".');
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

        // Human Context Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.contributors.extract', async () => {
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace found');
                    return;
                }

                const progressOptions: vscode.ProgressOptions = {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Extracting contributors from Git history',
                    cancellable: false
                };

                vscode.window.withProgress(progressOptions, async () => {
                    try {
                        const { HumanContextManager } = await import('./core/HumanContextManager');
                        const humanContext = new HumanContextManager(workspaceRoot, (msg: string) => persistence?.logWithEmoji('👥', msg));
                        
                        const contributors = await humanContext.extractContributors();
                        
                        if (contributors.length === 0) {
                            vscode.window.showInformationMessage('No contributors found in Git history.');
                        } else {
                            // Save to .reasoning/human-context.json
                            const contextPath = path.join(workspaceRoot, '.reasoning', 'human-context.json');
                            const contextData = humanContext.exportHumanContext(contributors);
                            fs.writeFileSync(contextPath, JSON.stringify(contextData, null, 2));
                            
                            vscode.window.showInformationMessage(
                                `✅ Extracted ${contributors.length} contributor(s). Saved to .reasoning/human-context.json`
                            );
                            
                            // Show contributors summary
                            const summary = contextData.summary;
                            const exportContributors = contextData.contributors;
                            const contributorInfo = exportContributors.map((c: any, i: number) => 
                                `  ${i + 1}. ${c.name} - ${c.activity.commitCount} commits - Domains: ${c.expertise.slice(0, 3).join(', ')}`
                            ).join('\n');
                            
                            vscode.window.showInformationMessage(
                                `Contributors Summary:\n${contributorInfo}\n\nTotal commits: ${summary.totalCommits}\nDomains: ${summary.domains.join(', ')}`
                            );
                        }
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Failed to extract contributors: ${errorMsg}`);
                        persistence?.logWithEmoji('❌', `Contributor extraction error: ${errorMsg}`);
                    }
                });
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.contributors.list', async () => {
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace found');
                    return;
                }

                const contextPath = path.join(workspaceRoot, '.reasoning', 'human-context.json');
                if (!fs.existsSync(contextPath)) {
                    vscode.window.showInformationMessage(
                        'No contributor data found. Run "Extract Contributors from Git" first.'
                    );
                    return;
                }

                try {
                    const contextData = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
                    const contributors = contextData.contributors;

                    if (contributors.length === 0) {
                        vscode.window.showInformationMessage('No contributors data available.');
                    } else {
                        const list = contributors.map((c: any, i: number) => 
                            `${i + 1}. ${c.name} - ${c.activity.commitCount} commits - ${c.expertise.join(', ')}`
                        ).join('\n');
                        
                        vscode.window.showInformationMessage(
                            `Contributors (${contributors.length}):\n${list}`
                        );
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to read contributor data: ${error}`);
                }
            })
        );

        // Evidence Report Command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.evidence.report', async () => {
                if (!rbomEngine) {
                    vscode.window.showErrorMessage('RBOM Engine not initialized');
                    return;
                }

                const allADRs = rbomEngine.listADRs();
                if (allADRs.length === 0) {
                    vscode.window.showInformationMessage('No ADRs found.');
                    return;
                }

                interface ADRChoice {
                    label: string;
                    adr: any;
                }
                
                const adrChoices: ADRChoice[] = allADRs.map((adr: any) => ({ label: `${adr.title} (${adr.evidenceIds?.length || 0} evidence)`, adr }));
                const selected = await vscode.window.showQuickPick(adrChoices, {
                    placeHolder: 'Select an ADR to view its evidence report'
                });

                if (selected && selected.adr) {
                    try {
                        const { ADREvidenceManager } = await import('./core/rbom/ADREvidenceManager');
                        const evidenceManager = new ADREvidenceManager();
                        
                        // Load all events from traces directory
                        const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
                        let allEvents: any[] = [];
                        if (fs.existsSync(tracesDir)) {
                            const traceFiles = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json'));
                            for (const file of traceFiles) {
                                try {
                                    const filePath = path.join(tracesDir, file);
                                    const traceEvents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                                    if (Array.isArray(traceEvents)) {
                                        allEvents.push(...traceEvents);
                                    }
                                } catch (error) {
                                    // Ignore corrupted files
                                }
                            }
                        }
                        
                        const report = evidenceManager.generateEvidenceReport(selected.adr, allEvents);
                        const formatted = evidenceManager.formatEvidenceReport(report);
                        
                        // Show report
                        vscode.window.showInformationMessage(formatted);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Failed to generate evidence report: ${errorMsg}`);
                    }
                }
            })
        );

        // Level 5: Security Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.verify.integrity', async () => {
                try {
                    const { IntegrityEngine } = await import('./core/security/IntegrityEngine');
                    
                    integrityEngine = new IntegrityEngine(workspaceRoot);
                    const result = integrityEngine.verifyLedgerIntegrity();
                    
                    if (result.valid) {
                        vscode.window.showInformationMessage('✅ Integrity Chain: Valid ✓');
                    } else {
                        vscode.window.showErrorMessage(`❌ Integrity Chain Invalid:\n${result.errors.join('\n')}`);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to verify integrity: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.snapshot.create', async () => {
                try {
                    if (!rbomEngine) {
                        vscode.window.showErrorMessage('RBOM Engine not initialized');
                        return;
                    }

                    const { IntegrityEngine } = await import('./core/security/IntegrityEngine');
                    const { SnapshotManager } = await import('./core/security/SnapshotManager');
                    
                    integrityEngine = new IntegrityEngine(workspaceRoot);
                    snapshotManager = new SnapshotManager(workspaceRoot, integrityEngine);
                    
                    const allADRs = rbomEngine.listADRs();
                    
                    const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
                    let allEvents: any[] = [];
                    if (fs.existsSync(tracesDir)) {
                        const traceFiles = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json'));
                        for (const file of traceFiles) {
                            try {
                                const filePath = path.join(tracesDir, file);
                                const traceEvents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                                if (Array.isArray(traceEvents)) { allEvents.push(...traceEvents); }
                            } catch (error) { /* Ignore corrupted files */ }
                        }
                    }
                    
                    const snapshot = await snapshotManager.generateSnapshot(allADRs, allEvents);
                    
                    vscode.window.showInformationMessage(
                        `✅ Snapshot created: ${snapshot.snapshot_id}\n` +
                        `📊 ADRs: ${snapshot.adr_count}, Evidence: ${snapshot.evidence_count}`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to create snapshot: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.snapshot.list', async () => {
                try {
                    const { IntegrityEngine } = await import('./core/security/IntegrityEngine');
                    const { SnapshotManager } = await import('./core/security/SnapshotManager');
                    
                    integrityEngine = new IntegrityEngine(workspaceRoot);
                    snapshotManager = new SnapshotManager(workspaceRoot, integrityEngine);
                    
                    const snapshots = snapshotManager.listSnapshots();
                    
                    if (snapshots.length === 0) {
                        vscode.window.showInformationMessage('No snapshots found.');
                        return;
                    }
                    
                    const choices = snapshots.map((snap: any) => ({
                        label: snap.snapshot_id,
                        detail: `${snap.adr_count} ADRs, ${snap.evidence_count} evidence - ${new Date(snap.created_at).toLocaleDateString()}`
                    }));
                    
                    await vscode.window.showQuickPick(choices, { placeHolder: 'Select a snapshot to view details' });
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to list snapshots: ${error}`);
                }
            })
        );

        // Level 6: External Evidence Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.external.sync', async () => {
                try {
                    const { ExternalIntegrator } = await import('./core/external/ExternalIntegrator');
                    const integrator = new ExternalIntegrator(workspaceRoot);
                    
                    vscode.window.showInformationMessage('🔄 Syncing external evidence...');
                    const results = await integrator.syncAll();
                    
                    const summary = results.map(r => 
                        `✅ ${r.source}: ${r.evidenceCount} evidence (${r.status})`
                    ).join('\n');
                    
                    vscode.window.showInformationMessage(
                        `✅ External Evidence Synced:\n${summary}`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to sync: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.external.status', async () => {
                try {
                    const { ExternalIntegrator } = await import('./core/external/ExternalIntegrator');
                    const integrator = new ExternalIntegrator(workspaceRoot);
                    
                    const results = await integrator.syncAll();
                    const allEvidence = integrator.getAllExternalEvidence();
                    
                    const status = `📊 External Evidence Status:\n\n` +
                        results.map(r => `• ${r.source}: ${r.evidenceCount} items - ${r.status}`).join('\n') +
                        `\n\n📦 Total Evidence: ${allEvidence.length}`;
                    
                    vscode.window.showInformationMessage(status);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to get status: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.external.linkADR', async () => {
                try {
                    if (!rbomEngine) {
                        vscode.window.showErrorMessage('RBOM Engine not initialized');
                        return;
                    }

                    const { ExternalIntegrator } = await import('./core/external/ExternalIntegrator');
                    const integrator = new ExternalIntegrator(workspaceRoot);
                    
                    // Select ADR
                    const allADRs = rbomEngine.listADRs();
                    if (allADRs.length === 0) {
                        vscode.window.showInformationMessage('No ADRs found.');
                        return;
                    }

                    const adrChoices = allADRs.map((adr: any) => ({
                        label: adr.title,
                        adr
                    }));
                    
                    const selectedADR: any = await vscode.window.showQuickPick(adrChoices, {
                        placeHolder: 'Select ADR to link external evidence'
                    });

                    if (!selectedADR) { return; }

                    // Select evidence
                    const allEvidence = integrator.getAllExternalEvidence();
                    if (allEvidence.length === 0) {
                        vscode.window.showInformationMessage('No external evidence found. Run sync first.');
                        return;
                    }

                    const evidenceChoices = allEvidence.map(ev => ({
                        label: `${ev.type}: ${ev.source}`,
                        evidence: ev
                    }));

                    const selected = await vscode.window.showQuickPick(evidenceChoices, {
                        placeHolder: 'Select evidence to link',
                        canPickMany: true
                    });

                    if (!selected || selected.length === 0) { return; }

                    // Link evidence to ADR
                    const evidenceIds = selected.map(s => s.evidence.id);
                    await integrator.linkToADR(selectedADR.adr.id, evidenceIds);
                    
                    vscode.window.showInformationMessage(
                        `✅ Linked ${evidenceIds.length} evidence to ADR: ${selectedADR.adr?.title || 'Unknown'}`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to link evidence: ${error}`);
                }
            })
        );

        // Level 7: Pattern Learning & Correlation Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.pattern.analyze', async () => {
                try {
                    const { PatternLearningEngine } = await import('./core/base/PatternLearningEngine');
                    const ple = new PatternLearningEngine(workspaceRoot);
                    
                    vscode.window.showInformationMessage('🔍 Analyzing patterns from ledger...');
                    const patterns = await ple.analyzePatterns();
                    
                    vscode.window.showInformationMessage(
                        `🧠 Pattern Analysis Complete:\n` +
                        `📊 Found ${patterns.length} patterns\n` +
                        patterns.slice(0, 3).map(p => `  • ${p.pattern} (conf: ${Math.round(p.confidence * 100)}%)`).join('\n')
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to analyze patterns: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.correlation.analyze', async () => {
                try {
                    const { CorrelationEngine } = await import('./core/base/CorrelationEngine');
                    const corrEngine = new CorrelationEngine(workspaceRoot);
                    
                    vscode.window.showInformationMessage('🔗 Analyzing correlations...');
                    const correlations = await corrEngine.analyze();
                    
                    const strong = correlations.filter(c => c.correlation_score >= 0.75);
                    
                    vscode.window.showInformationMessage(
                        `🔗 Correlation Analysis Complete:\n` +
                        `📊 Found ${correlations.length} correlations\n` +
                        `🎯 ${strong.length} strong correlations (≥0.75)\n` +
                        strong.slice(0, 3).map(c => `  • ${c.direction} (score: ${Math.round(c.correlation_score * 100)}%)`).join('\n')
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to analyze correlations: ${error}`);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.forecast.generate', async () => {
                try {
                    const { ForecastEngine } = await import('./core/base/ForecastEngine');
                    const forecastEngine = new ForecastEngine(workspaceRoot);
                    
                    vscode.window.showInformationMessage('🔮 Generating forecasts...');
                    const forecasts = await forecastEngine.generate();
                    
                    const byType = {
                        ADR_Proposal: forecasts.filter(f => f.decision_type === 'ADR_Proposal').length,
                        Risk_Alert: forecasts.filter(f => f.decision_type === 'Risk_Alert').length,
                        Opportunity: forecasts.filter(f => f.decision_type === 'Opportunity').length,
                        Refactor: forecasts.filter(f => f.decision_type === 'Refactor').length
                    };
                    
                    vscode.window.showInformationMessage(
                        `🔮 Forecast Generation Complete:\n` +
                        `📊 Generated ${forecasts.length} forecasts\n` +
                        `• ${byType.ADR_Proposal} decisions\n` +
                        `• ${byType.Risk_Alert} risks\n` +
                        `• ${byType.Opportunity} opportunities\n` +
                        `• ${byType.Refactor} refactors`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to generate forecasts: ${error}`);
                }
            })
        );

        // Retroactive Trace Builder (Level 12)
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.retroactive.reconstruct', async () => {
                try {
                    const { RetroactiveTraceBuilder } = await import('./core/retroactive/RetroactiveTraceBuilder');
                    const builder = new RetroactiveTraceBuilder(workspaceRoot);
                    
                    const shouldReconstruct = await builder.shouldReconstruct();
                    
                    if (!shouldReconstruct) {
                        vscode.window.showInformationMessage(
                            '✅ Historical memory already exists. Traces found in .reasoning/traces/'
                        );
                        return;
                    }
                    
                    const progressOptions: vscode.ProgressOptions = {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Reconstructing Historical Memory',
                        cancellable: false
                    };
                    
                    vscode.window.withProgress(progressOptions, async () => {
                        const result = await builder.reconstruct();
                        
                        vscode.window.showInformationMessage(
                            `✅ Historical memory reconstructed:\n` +
                            `📊 ${result.commitsAnalyzed} commits analyzed\n` +
                            `🎭 ${result.eventsGenerated} events generated\n` +
                            `🔍 ${result.patternsDetected} patterns detected\n` +
                            `💯 Avg confidence: ${(result.averageConfidence * 100).toFixed(0)}%`
                        );
                    });
                } catch (error) {
                    console.error('❌ Failed to reconstruct historical memory:', error);
                    vscode.window.showErrorMessage(`Reconstruction failed: ${error}`);
                }
            })
        );

        // Perceptual Layer (Level 11)
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.perceptual.open', () => {
                try {
                    console.log('🎨 Opening Perceptual Layer...');
                    
                    const panel = vscode.window.createWebviewPanel(
                        'reasoningPerceptualLayer',
                        '🧠 Reasoning Layer - Perceptual View',
                        vscode.ViewColumn.One,
                        {
                            enableScripts: true,
                            retainContextWhenHidden: true
                        }
                    );

                    // Load the built UI
                    const uiPath = path.join(context.extensionPath, 'webview', 'ui', 'dist', 'index.html');
                    console.log('📁 UI Path:', uiPath);
                    console.log('📁 Extension Path:', context.extensionPath);
                    
                    if (!fs.existsSync(uiPath)) {
                        vscode.window.showErrorMessage(`UI not found at: ${uiPath}`);
                        console.error('❌ UI file not found!');
                        panel.webview.html = '<h1>UI not found</h1><p>Please run: cd extension/webview/ui && npm run build</p>';
                        return;
                    }
                    
                    const htmlContent = fs.readFileSync(uiPath, 'utf-8');
                    console.log('✅ HTML loaded, size:', htmlContent.length);
                    panel.webview.html = htmlContent;

                // Load cognitive state and send to UI
                const cognitiveManifestPath = path.join(workspaceRoot, '.reasoning', 'CognitiveManifest.json');
                const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
                
                if (fs.existsSync(cognitiveManifestPath)) {
                    const cognitiveState = JSON.parse(fs.readFileSync(cognitiveManifestPath, 'utf-8'));
                    
                    // Load goals if exists
                    if (fs.existsSync(goalsPath)) {
                        const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
                        cognitiveState.cognitive_state.goals_list = goalsData.active_goals || [];
                    }
                    
                    panel.webview.postMessage({
                        command: 'cognitiveStateUpdate',
                        data: cognitiveState.cognitive_state
                    });
                }

                // Listen for messages from UI
                panel.webview.onDidReceiveMessage(message => {
                    if (message.command === 'requestCognitiveState') {
                        const cognitiveManifestPath = path.join(workspaceRoot, '.reasoning', 'CognitiveManifest.json');
                        const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
                        
                        if (fs.existsSync(cognitiveManifestPath)) {
                            const cognitiveState = JSON.parse(fs.readFileSync(cognitiveManifestPath, 'utf-8'));
                            
                            // Load goals if exists
                            if (fs.existsSync(goalsPath)) {
                                const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
                                cognitiveState.cognitive_state.goals_list = goalsData.active_goals || [];
                            }
                            
                            panel.webview.postMessage({
                                command: 'cognitiveStateUpdate',
                                data: cognitiveState.cognitive_state
                            });
                        }
                    }
                });

                    persistence?.logWithEmoji('🎨', 'Perceptual Layer opened');
                } catch (error) {
                    console.error('❌ Failed to open Perceptual Layer:', error);
                    vscode.window.showErrorMessage(`Failed to open Perceptual Layer: ${error}`);
                }
            })
        );

        // 🎧 Input Layer - GitCommitListener (Phase 1)
        setTimeout(async () => {
            try {
                gitCommitListener = new GitCommitListener(workspaceRoot);
                if (gitCommitListener.isGitRepository()) {
                    await gitCommitListener.startWatching();
                    persistence?.logWithEmoji('🎧', 'Input Layer: GitCommitListener activated');
                    
                    // Store in context for disposal
                    context.subscriptions.push({
                        dispose: () => gitCommitListener?.stopWatching()
                    });
                } else {
                    persistence?.logWithEmoji('⚠️', 'Input Layer: Not a git repository (listener disabled)');
                }
            } catch (error) {
                persistence?.logWithEmoji('⚠️', `Input Layer: GitCommitListener failed - ${error}`);
            }
        }, 7000); // 7 seconds - after RBOM
        
        // 🎧 Input Layer - FileChangeWatcher (Phase 2)
        setTimeout(async () => {
            try {
                fileChangeWatcher = new FileChangeWatcher(workspaceRoot);
                await fileChangeWatcher.startWatching();
                persistence?.logWithEmoji('🎧', 'Input Layer: FileChangeWatcher activated');
                
                // Store in context for disposal
                context.subscriptions.push({
                    dispose: () => fileChangeWatcher?.stopWatching()
                });
            } catch (error) {
                persistence?.logWithEmoji('⚠️', `Input Layer: FileChangeWatcher failed - ${error}`);
            }
        }, 8000); // 8 seconds - after GitCommitListener
        
        // 🎧 Input Layer - GitHubDiscussionListener (Phase 3)
        setTimeout(async () => {
            try {
                githubDiscussionListener = new GitHubDiscussionListener(workspaceRoot);
                await githubDiscussionListener.startWatching(5); // Poll every 5 minutes
                persistence?.logWithEmoji('🎧', 'Input Layer: GitHubDiscussionListener activated');
                
                // Store in context for disposal
                context.subscriptions.push({
                    dispose: () => githubDiscussionListener?.stopWatching()
                });
            } catch (error) {
                persistence?.logWithEmoji('⚠️', `Input Layer: GitHubDiscussionListener failed - ${error}`);
            }
        }, 9000); // 9 seconds - after FileChangeWatcher
        
        // 🎧 Input Layer - ShellMessageCapture (Phase 4)
        setTimeout(async () => {
            try {
                shellMessageCapture = new ShellMessageCapture(workspaceRoot);
                shellMessageCapture.startCapturing();
                persistence?.logWithEmoji('🎧', 'Input Layer: ShellMessageCapture activated');
                
                // Store in context for disposal
                context.subscriptions.push({
                    dispose: () => shellMessageCapture?.stopCapturing()
                });
            } catch (error) {
                persistence?.logWithEmoji('⚠️', `Input Layer: ShellMessageCapture failed - ${error}`);
            }
        }, 10000); // 10 seconds - after GitHubDiscussionListener
        
        // Register structured cognitive command groups
        registerObserveCommands(context, workspaceRoot);
        registerUnderstandCommands(context, workspaceRoot);
        registerExecuteCommands(context);
        registerMaintainCommands(context, workspaceRoot);
        registerHelpCommands(context, workspaceRoot);
        registerAgentCommands(context);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // 🤖 AUTO-PACKAGING COMMANDS
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Command: Auto Package (full: compile + package + install)
        const autoPackageCommand = vscode.commands.registerCommand('reasoning.autopackage', async () => {
            try {
                const { AutoPackager } = await import('./core/auto/AutoPackager');
                
                // Réutiliser le channel principal au lieu d'en créer un nouveau
                logger.show();
                logger.log('');
                logger.log('═══════════════════════════════════════════════════════════════');
                logger.log('🤖 AUTOPACKAGER — Compile + Package + Install');
                logger.log('═══════════════════════════════════════════════════════════════');
                
                // Ensure workspaceRoot is defined
                if (!workspaceRoot) {
                    const errorMsg = '❌ Workspace root not found. Please open a workspace folder.';
                    logger.log(errorMsg);
                    vscode.window.showErrorMessage(errorMsg);
                    return;
                }
                
                const autoPackager = new AutoPackager(workspaceRoot, logger.getChannel());
                await autoPackager.run({ bumpVersion: false, installLocally: true });
            } catch (error: any) {
                const errorMsg = `❌ AutoPackager failed: ${error.message}`;
                console.error(errorMsg, error);
                logger.log(errorMsg);
                vscode.window.showErrorMessage(errorMsg);
            }
        });
        context.subscriptions.push(autoPackageCommand);

        // Command: Auto Package with Version Bump
        const autoPackageBumpCommand = vscode.commands.registerCommand('reasoning.autopackage.bump', async () => {
            try {
                const { AutoPackager } = await import('./core/auto/AutoPackager');
                
                // Réutiliser le channel principal
                logger.show();
                logger.log('');
                logger.log('═══════════════════════════════════════════════════════════════');
                logger.log('🔢 AUTOPACKAGER — Version Bump + Compile + Package + Install');
                logger.log('═══════════════════════════════════════════════════════════════');
                
                // Ensure workspaceRoot is defined
                if (!workspaceRoot) {
                    const errorMsg = '❌ Workspace root not found. Please open a workspace folder.';
                    logger.log(errorMsg);
                    vscode.window.showErrorMessage(errorMsg);
                    return;
                }
                
                const autoPackager = new AutoPackager(workspaceRoot, logger.getChannel());
                await autoPackager.run({ bumpVersion: true, installLocally: true });
            } catch (error: any) {
                const errorMsg = `❌ AutoPackager with version bump failed: ${error.message}`;
                console.error(errorMsg, error);
                logger.log(errorMsg);
                vscode.window.showErrorMessage(errorMsg);
            }
        });
        context.subscriptions.push(autoPackageBumpCommand);

        // Command: Quick Rebuild (compile + package only, no install)
        const quickRebuildCommand = vscode.commands.registerCommand('reasoning.quickrebuild', async () => {
            try {
                const { AutoPackager } = await import('./core/auto/AutoPackager');
                
                // Réutiliser le channel principal
                logger.show();
                logger.log('');
                logger.log('═══════════════════════════════════════════════════════════════');
                logger.log('⚡ QUICK REBUILD — Compile + Package (no install)');
                logger.log('═══════════════════════════════════════════════════════════════');
                
                // Ensure workspaceRoot is defined
                if (!workspaceRoot) {
                    const errorMsg = '❌ Workspace root not found. Please open a workspace folder.';
                    logger.log(errorMsg);
                    vscode.window.showErrorMessage(errorMsg);
                    return;
                }
                
                const autoPackager = new AutoPackager(workspaceRoot, logger.getChannel());
                await autoPackager.quickRebuild();
            } catch (error: any) {
                const errorMsg = `❌ Quick rebuild failed: ${error.message}`;
                console.error(errorMsg, error);
                logger.log(errorMsg);
                vscode.window.showErrorMessage(errorMsg);
            }
        });
        context.subscriptions.push(quickRebuildCommand);
        
        // Register contextual command groups
        registerPlanCommands(context, workspaceRoot);
        registerTasksCommands(context, workspaceRoot);
        registerReportsCommands(context, workspaceRoot);
        registerForecastsCommands(context, workspaceRoot);
        registerPatternsCommands(context, workspaceRoot);
        
        // Register legacy command redirects (migration compatibility)
        registerLegacyRedirects(context, workspaceRoot);
        
        // Register Self-Audit command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.selfaudit.run', async () => {
                try {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Running Self-Audit (Level 13)',
                        cancellable: false
                    }, async () => {
                        const result = await runSelfAudit(workspaceRoot);
                        
                        vscode.window.showInformationMessage(
                            `✅ Self-Audit completed:\n` +
                            `📝 ADR generated\n` +
                            `📄 Report: ${path.basename(result.reportPath)}\n` +
                            `💯 Confidence: ${(result.confidence * 100).toFixed(0)}%`
                        );
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(`Self-Audit failed: ${error}`);
                }
            })
        );

        // Register Cognitive Rebuilder command (Full Autonomous Reconstruction)
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.rebuild.full', async () => {
                try {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Full Cognitive Reconstruction',
                        cancellable: false
                    }, async () => {
                        const rebuilder = new CognitiveRebuilder(workspaceRoot);
                        await rebuilder.executeFullRebuild();
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(`Full reconstruction failed: ${error}`);
                }
            })
        );
        
        logger.log('✅ Reasoning Layer V3 - Commands registered successfully');
        
        // Initialize Cursor Chat Integration
        cursorChatIntegration = getCursorChatIntegration(workspaceRoot);
        
        // Register Cursor Chat Integration commands
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.cursor.queryContext', () => {
                const ctx = cursorChatIntegration.queryContext();
                logger.log('💬 Querying cognitive context for Cursor Chat...');
                logger.log(cursorChatIntegration.getContextString());
                vscode.window.showInformationMessage(
                    `🧠 Cognitive Context: ${ctx.summary} (Confidence: ${(ctx.confidence * 100).toFixed(1)}%)`
                );
                return ctx;
            })
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.cursor.logInteraction', async (prompt: string, response: string) => {
                await cursorChatIntegration.logInteraction(prompt, response);
                logger.log('💬 Logged chat interaction to reasoning traces');
            })
        );
        
        logger.log('🔗 Cursor Chat Integration loaded');
        
        // Register autoInit command
        context.subscriptions.push(
            vscode.commands.registerCommand('reasoning.autoInit', async () => {
                const ctx = cursorChatIntegration.queryContext();
                if (ctx.confidence < 0.5) {
                    logger.log('🔄 Running autopilot cycle to bootstrap cognition...');
                    // Trigger autopilot cycle
                    await vscode.commands.executeCommand('reasoning.autopilot.run');
                }
                
                logger.log('✅ Reasoning Layer auto-initialized and synced with Cursor Chat');
                vscode.window.showInformationMessage('🧠 RL3 auto-initialized and synced.');
            })
        );

        // ───────────────────────────────────────────────────────────────────────
        // 🤖 Autonomous Development Cycle Scheduler
        // Schedules periodic cognitive actions to increase persistence & cognition
        // ───────────────────────────────────────────────────────────────────────
        try {
            // Helper to safely run a command and log
            const run = async (cmd: string) => {
                try {
                    persistence?.logWithEmoji('⏱️', `Scheduled run: ${cmd}`);
                    await vscode.commands.executeCommand(cmd);
                    persistence?.logWithEmoji('✅', `Scheduled run completed: ${cmd}`);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    persistence?.logWithEmoji('❌', `Scheduled run failed (${cmd}): ${msg}`);
                }
            };

            // Cadences (ms)
            const TWO_HOURS = 2 * 60 * 60 * 1000;
            const FOUR_HOURS = 4 * 60 * 60 * 1000;
            const ONE_DAY = 24 * 60 * 60 * 1000;

            // Every ~2h: patterns, correlations, ADR auto
            autonomousTimers.push(setInterval(() => {
                void run('reasoning.pattern.analyze');
                void run('reasoning.correlation.analyze');
                void run('reasoning.adr.auto');
            }, TWO_HOURS));

            // Every ~4h: external sync/status (if configured)
            autonomousTimers.push(setInterval(() => {
                void run('reasoning.external.sync');
                void run('reasoning.external.status');
            }, FOUR_HOURS));

            // Daily: integrity check and snapshot
            autonomousTimers.push(setInterval(() => {
                void run('reasoning.verify.integrity');
                void run('reasoning.snapshot.create');
            }, ONE_DAY));

            // Dispose timers on deactivate via context subscription
            context.subscriptions.push({ dispose: () => {
                autonomousTimers.forEach(t => clearInterval(t));
                autonomousTimers = [];
            }});

            persistence?.logWithEmoji('🗓️', 'Autonomous development cycle scheduler started');
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            persistence?.logWithEmoji('⚠️', `Scheduler initialization skipped: ${msg}`);
        }
        
        // Check if first run (minimalist onboarding)
        const reasoningDir = path.join(workspaceRoot, '.reasoning');
        const tracesDir = path.join(reasoningDir, 'traces');
        
        if (fs.existsSync(tracesDir)) {
            const traceFiles = fs.readdirSync(tracesDir).filter(f => f.endsWith('.json'));
            const hasEvents = traceFiles.some(file => {
                const content = JSON.parse(fs.readFileSync(path.join(tracesDir, file), 'utf-8'));
                return Array.isArray(content) && content.length > 0;
            });
            
            if (!hasEvents) {
                logger.logOnboarding();
            }
        } else {
            logger.logOnboarding();
        }

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
    if (rl3StatusBarItem) {
        rl3StatusBarItem.dispose();
        rl3StatusBarItem = null;
    }
    // Clear autonomous timers
    if (autonomousTimers.length) {
        autonomousTimers.forEach(t => clearInterval(t));
        autonomousTimers = [];
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
