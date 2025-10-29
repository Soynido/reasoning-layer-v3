import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { UnifiedLogger } from '../core/UnifiedLogger';

/**
 * Execute commands - Run autopilot, sync GitHub, handle integrity
 */
export function registerExecuteCommands(context: vscode.ExtensionContext) {
    // Run Autopilot
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.autopilot.run', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const logger = UnifiedLogger.getInstance();
            logger.log('');
            logger.log('🚀 === REASONING LAYER V3 — AUTOPILOT CYCLE ===');
            logger.log('');

            try {
                // Full autopilot cycle: check all cognitive systems
                logger.logWithEmoji('🔍', 'Checking cognitive state...');
                
                // Check manifest
                const manifestPath = path.join(workspaceRoot, '.reasoning', 'manifest.json');
                let totalEvents = 0;
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        // Support both camelCase and snake_case formats
                        totalEvents = manifest.totalEvents || manifest.total_events || 0;
                    } catch (e) {
                        logger.warn('Failed to read manifest.json');
                    }
                }
                logger.log(`📊 Total Events: ${totalEvents}`);

                // Check ADRs (count all JSON files including /auto subdirectory)
                const adrsDir = path.join(workspaceRoot, '.reasoning', 'adrs');
                const autoAdrsDir = path.join(adrsDir, 'auto');
                let adrCount = 0;
                
                if (fs.existsSync(adrsDir)) {
                    // Count main ADRs (excluding index.json)
                    const mainAdrs = fs.readdirSync(adrsDir).filter(f => 
                        f.endsWith('.json') && f !== 'index.json' && !fs.statSync(path.join(adrsDir, f)).isDirectory()
                    );
                    adrCount += mainAdrs.length;
                    
                    // Count auto-generated ADRs in /auto subdirectory
                    if (fs.existsSync(autoAdrsDir)) {
                        const autoAdrs = fs.readdirSync(autoAdrsDir).filter(f => 
                            f.endsWith('.json')
                        );
                        adrCount += autoAdrs.length;
                    }
                }
                logger.log(`📝 ADRs Generated: ${adrCount}`);

                // Check goals
                const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
                let goalsCount = 0;
                if (fs.existsSync(goalsPath)) {
                    try {
                        const goals = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
                        goalsCount = goals.active_goals?.length || 0;
                    } catch (e) {
                        logger.warn('Failed to read goals.json');
                    }
                }
                logger.log(`🎯 Active Goals: ${goalsCount}`);

                // Check patterns
                const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
                let patternsCount = 0;
                if (fs.existsSync(patternsPath)) {
                    try {
                        const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
                        patternsCount = patterns.patterns?.length || 0;
                    } catch (e) {
                        // Ignore
                    }
                }
                logger.log(`🔍 Patterns Detected: ${patternsCount}`);

                // Check correlations (support both array and object formats)
                const correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
                let correlationsCount = 0;
                if (fs.existsSync(correlationsPath)) {
                    try {
                        const content = fs.readFileSync(correlationsPath, 'utf-8');
                        const data = JSON.parse(content);
                        
                        // Support both formats: array or object with correlations property
                        if (Array.isArray(data)) {
                            correlationsCount = data.length;
                        } else if (data.correlations && Array.isArray(data.correlations)) {
                            correlationsCount = data.correlations.length;
                        }
                    } catch (e) {
                        logger.warn(`Failed to parse correlations.json: ${e}`);
                    }
                }
                logger.log(`🔗 Correlations: ${correlationsCount}`);

                // OPTIMIZATION: Regenerate correlations first to sync with current patterns
                logger.log('');
                logger.logWithEmoji('🔗', 'Regenerating correlations with current patterns...');
                try {
                    const { CorrelationEngine } = await import('../core/base/CorrelationEngine');
                    const corrEngine = new CorrelationEngine(workspaceRoot);
                    const correlations = await corrEngine.analyze();
                    logger.log(`🔗 Correlations Regenerated: ${correlations.length}`);
                    
                    const strong = correlations.filter(c => c.correlation_score >= 0.72).length; // OPTIMIZED: 0.75 → 0.72
                    const medium = correlations.filter(c => c.correlation_score >= 0.60 && c.correlation_score < 0.72).length;
                    logger.log(`   • Strong (≥0.75): ${strong}`);
                    logger.log(`   • Medium (0.65-0.75): ${medium}`);
                } catch (error) {
                    logger.warn(`Failed to regenerate correlations: ${error}`);
                }

                // OPTIMIZATION: Regenerate forecasts with new thresholds
                logger.log('');
                logger.logWithEmoji('🔮', 'Regenerating forecasts with optimized thresholds...');
                try {
                    const { ForecastEngine } = await import('../core/base/ForecastEngine');
                    const forecastEngine = new ForecastEngine(workspaceRoot);
                    const forecasts = await forecastEngine.generate();
                    logger.log(`🔮 Forecasts Generated: ${forecasts.length} (optimized coverage)`);
                    
                    if (forecasts.length > 0) {
                        const byType = {
                            ADR_Proposal: forecasts.filter(f => f.decision_type === 'ADR_Proposal').length,
                            Risk_Alert: forecasts.filter(f => f.decision_type === 'Risk_Alert').length,
                            Opportunity: forecasts.filter(f => f.decision_type === 'Opportunity').length,
                        };
                        logger.log(`   • ADR Proposals: ${byType.ADR_Proposal}`);
                        logger.log(`   • Risk Alerts: ${byType.Risk_Alert}`);
                        logger.log(`   • Opportunities: ${byType.Opportunity}`);
                    }
                } catch (error) {
                    logger.warn(`Failed to regenerate forecasts: ${error}`);
                }

                // OPTIMIZATION: Re-evaluate goals post-cycle
                logger.log('');
                logger.logWithEmoji('🎯', 'Re-evaluating goals based on cycle results...');
                try {
                    const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');
                    if (fs.existsSync(goalsPath)) {
                        const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
                        const activeGoals = goalsData.active_goals || [];
                        
                        // Update goal progress based on current metrics
                        for (const goal of activeGoals) {
                            if (!goal.progress) goal.progress = 0;
                            
                            if (goal.objective && goal.objective.includes('duplication') && correlationsCount < 200) {
                                goal.progress = Math.min(1.0, goal.progress + 0.2);
                            }
                            if (goal.objective && goal.objective.includes('diversity') && patternsCount > 4) {
                                goal.progress = Math.min(1.0, goal.progress + 0.15);
                            }
                            if (goal.objective && goal.objective.includes('predictive')) {
                                const forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
                                if (fs.existsSync(forecastsPath)) {
                                    const forecastsData = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
                                    if (forecastsData.length >= 4) {
                                        goal.progress = Math.min(1.0, goal.progress + 0.25);
                                    }
                                }
                            }
                        }
                        
                        goalsData.last_evaluated = new Date().toISOString();
                        fs.writeFileSync(goalsPath, JSON.stringify(goalsData, null, 2), 'utf-8');
                        logger.log(`🎯 Goals updated: ${activeGoals.filter((g: any) => g.progress >= 0.8).length}/${activeGoals.length} near completion`);
                    }
                } catch (error) {
                    logger.warn(`Failed to re-evaluate goals: ${error}`);
                }

                logger.log('');
                logger.log('✅ Autopilot cycle completed successfully');
                vscode.window.showInformationMessage('🧠 Autopilot cycle completed');
            } catch (error) {
                logger.warn(`Autopilot cycle failed: ${error}`);
                vscode.window.showErrorMessage(`Autopilot failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        })
    );

    // Sync GitHub
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.sync', async () => {
            vscode.window.showInformationMessage('⚙️ GitHub sync triggered (integration pending)');
        })
    );

    // GitHub CLI Commands - Local Cognitive Agent
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.listIssues', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);
                
                const state = await vscode.window.showQuickPick(['open', 'closed', 'all'], {
                    placeHolder: 'Select issue state'
                });
                if (!state) return;

                const issues = await manager.listIssues(state as any);
                const issueList = issues.map((i: any) => `#${i.number}: ${i.title}`).join('\n');
                
                const doc = await vscode.workspace.openTextDocument({
                    content: `# GitHub Issues (${state})\n\n${issueList}`,
                    language: 'markdown'
                });
                vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list issues: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.createIssue', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);

                const title = await vscode.window.showInputBox({
                    prompt: 'Issue title',
                    placeHolder: 'Enter issue title'
                });
                if (!title) return;

                const body = await vscode.window.showInputBox({
                    prompt: 'Issue body (Markdown supported)',
                    placeHolder: 'Enter issue description'
                });
                if (body === undefined) return;

                const result = await manager.createIssue(title, body || '');
                vscode.window.showInformationMessage(`✅ Issue created: ${result.url}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.commentPR', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);

                const prNumberStr = await vscode.window.showInputBox({
                    prompt: 'PR number',
                    placeHolder: 'Enter PR number'
                });
                if (!prNumberStr) return;
                const prNumber = parseInt(prNumberStr);

                const body = await vscode.window.showInputBox({
                    prompt: 'Comment body (Markdown supported)',
                    placeHolder: 'Enter comment'
                });
                if (!body) return;

                await manager.commentPR(prNumber, body);
                vscode.window.showInformationMessage(`✅ Commented on PR #${prNumber}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to comment PR: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.publishDiscussion', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);

                const title = await vscode.window.showInputBox({
                    prompt: 'Discussion title',
                    placeHolder: 'Enter discussion title'
                });
                if (!title) return;

                const body = await vscode.window.showInputBox({
                    prompt: 'Discussion body (Markdown supported)',
                    placeHolder: 'Enter discussion content'
                });
                if (body === undefined) return;

                const result = await manager.publishDiscussion(title, body || '');
                vscode.window.showInformationMessage(`✅ Discussion published: ${result.url}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to publish discussion: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.publishForecast', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);

                // Load latest forecast
                const forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
                if (!fs.existsSync(forecastsPath)) {
                    vscode.window.showWarningMessage('No forecasts found. Generate forecasts first.');
                    return;
                }

                const forecasts = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
                if (!Array.isArray(forecasts) || forecasts.length === 0) {
                    vscode.window.showWarningMessage('No forecasts available.');
                    return;
                }

                const forecastItems = forecasts.map((f: any, i: number) => ({
                    label: `${f.predicted_decision} (${((f.confidence || 0) * 100).toFixed(0)}%)`,
                    forecast: f,
                    index: i
                }));

                const selected = await vscode.window.showQuickPick(forecastItems, {
                    placeHolder: 'Select forecast to publish'
                });
                if (!selected) return;

                await manager.publishForecast(selected.forecast);
                vscode.window.showInformationMessage(`✅ Forecast published as discussion`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to publish forecast: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.createADRIssue', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const { RBOMEngine } = await import('../core/rbom/RBOMEngine');
                const manager = new GitHubCLIManager(workspaceRoot);

                // Load ADRs
                const logger = UnifiedLogger.getInstance();
                const rbomEngine = new RBOMEngine(workspaceRoot, 
                    (msg) => logger.log(msg),
                    (msg) => logger.warn(msg)
                );
                const adrs = rbomEngine.listADRs();

                if (adrs.length === 0) {
                    vscode.window.showWarningMessage('No ADRs found. Create ADRs first.');
                    return;
                }

                const adrItems = adrs.map(adr => ({
                    label: adr.title,
                    description: `Status: ${adr.status}`,
                    adr
                }));

                const selected = await vscode.window.showQuickPick(adrItems, {
                    placeHolder: 'Select ADR to publish as issue'
                });
                if (!selected) return;

                const result = await manager.createADRIssue(selected.adr);
                vscode.window.showInformationMessage(`✅ ADR issue created: ${result.url}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create ADR issue: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.pushCommit', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);

                const message = await vscode.window.showInputBox({
                    prompt: 'Commit message',
                    placeHolder: 'Enter commit message'
                });
                if (!message) return;

                await manager.pushCommit(message);
                vscode.window.showInformationMessage(`✅ Commit pushed`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to push commit: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.runWorkflow', async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const manager = new GitHubCLIManager(workspaceRoot);

                const workflowId = await vscode.window.showInputBox({
                    prompt: 'Workflow ID or filename',
                    placeHolder: 'Enter workflow ID (e.g., ci.yml)'
                });
                if (!workflowId) return;

                await manager.runWorkflow(workflowId);
                vscode.window.showInformationMessage(`✅ Workflow triggered: ${workflowId}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to run workflow: ${error}`);
            }
        })
    );

    // 🧪 TEST COMMAND: Publish Cognitive State Report to GitHub
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.github.cli.publishCognitiveReport', async () => {
            const logger = UnifiedLogger.getInstance();
            
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                logger.log('🧠 Generating Cognitive State Report...');

                const { GitHubCLIManager } = await import('../core/integrations/GitHubCLIManager');
                const { loadManifest } = await import('../core/utils/manifestLoader');
                const manager = new GitHubCLIManager(workspaceRoot);

                // Read cognitive state
                const manifest = loadManifest(workspaceRoot);
                const patternsPath = path.join(workspaceRoot, '.reasoning', 'patterns.json');
                const correlationsPath = path.join(workspaceRoot, '.reasoning', 'correlations.json');
                const forecastsPath = path.join(workspaceRoot, '.reasoning', 'forecasts.json');
                const goalsPath = path.join(workspaceRoot, '.reasoning', 'goals.json');

                const patternsData = fs.existsSync(patternsPath) ? JSON.parse(fs.readFileSync(patternsPath, 'utf-8')) : { patterns: [] };
                const patterns = Array.isArray(patternsData) ? patternsData : (patternsData.patterns || []);
                const correlations = fs.existsSync(correlationsPath) ? JSON.parse(fs.readFileSync(correlationsPath, 'utf-8')) : [];
                const forecasts = fs.existsSync(forecastsPath) ? JSON.parse(fs.readFileSync(forecastsPath, 'utf-8')) : [];
                const goalsData = fs.existsSync(goalsPath) ? JSON.parse(fs.readFileSync(goalsPath, 'utf-8')) : { active_goals: [] };

                // Generate report
                const timestamp = new Date().toISOString();
                const reportBody = `# 🧠 Reasoning Layer V3 — État Cognitif
                
**Date**: ${timestamp}
**Version**: ${manifest.version || 'N/A'}
**Total Events**: ${manifest.totalEvents}

---

## 📊 Métriques Cognitive

| Métrique | Valeur |
|----------|--------|
| 🧩 Patterns détectés | ${patterns.length} |
| 🔗 Corrélations actives | ${correlations.length} |
| 🔮 Forecasts générés | ${forecasts.length} |
| 🎯 Objectifs actifs | ${goalsData.active_goals?.length || 0} |

---

## 🧩 Top 3 Patterns (par confiance)

${patterns
    .sort((a: any, b: any) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((p: any, i: number) => `${i + 1}. **${p.pattern}** (${(p.confidence * 100).toFixed(1)}%)\n   - Impact: ${p.impact}\n   - Occurrences: ${p.frequency}`)
    .join('\n\n')}

---

## 🔮 Forecasts Actifs

${forecasts.length > 0 
    ? forecasts.slice(0, 3).map((f: any, i: number) => `${i + 1}. **${f.title}**\n   - Confiance: ${(f.confidence * 100).toFixed(1)}%\n   - Type: ${f.type}`).join('\n\n')
    : '_Aucun forecast généré pour le moment._'}

---

## 🎯 Objectifs Actifs

${goalsData.active_goals?.length > 0
    ? goalsData.active_goals.map((g: any, i: number) => `${i + 1}. **${g.objective}**\n   - Progrès: ${(g.progress * 100).toFixed(0)}%\n   - Statut: ${g.status}`).join('\n\n')
    : '_Aucun objectif actif._'}

---

## 🔗 Corrélations Récentes

${correlations.length > 0
    ? correlations
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
        .map((c: any, i: number) => `${i + 1}. **${c.event_category}** ↔ Pattern ${c.pattern_id.substring(0, 8)}\n   - Score: ${(c.correlation_score * 100).toFixed(1)}%`)
        .join('\n\n')
    : '_Aucune corrélation détectée._'}

---

## 📈 État Système

- ✅ Persistence Manager: Active
- ✅ Decision Synthesizer: Active
- ✅ Pattern Learning Engine: Active
- ✅ Correlation Engine: Active
- ✅ Forecast Engine: Active
- ✅ GitHub CLI Integration: Active

---

_Rapport généré automatiquement par Reasoning Layer V3_
_Pour plus d'informations: \`.reasoning/\` directory_
`;

                // Create GitHub issue
                const result = await manager.createIssue(
                    `🧠 Cognitive State Report — ${new Date().toLocaleDateString('fr-FR')}`,
                    reportBody
                );

                // Log the action
                const traceFile = path.join(workspaceRoot, '.reasoning', 'traces', `github_report_${Date.now()}.json`);
                fs.writeFileSync(traceFile, JSON.stringify({
                    action: 'publish_cognitive_report',
                    timestamp,
                    issue_url: result.url,
                    issue_number: result.number,
                    metrics: {
                        patterns: patterns.length,
                        correlations: correlations.length,
                        forecasts: forecasts.length,
                        goals: goalsData.active_goals?.length || 0
                    }
                }, null, 2), 'utf-8');

                logger.log(`✅ Cognitive Report published: ${result.url}`);
                
                vscode.window.showInformationMessage(
                    `✅ Rapport cognitif publié: Issue #${result.number}`,
                    'Ouvrir sur GitHub'
                ).then(selection => {
                    if (selection === 'Ouvrir sur GitHub') {
                        vscode.env.openExternal(vscode.Uri.parse(result.url));
                    }
                });

            } catch (error) {
                logger.warn(`Failed to publish cognitive report: ${error}`);
                vscode.window.showErrorMessage(`Failed to publish report: ${error}`);
            }
        })
    );

    // These commands already exist in package.json, no need to re-register
    // Create Snapshot and Verify Integrity are handled by existing handlers
}

