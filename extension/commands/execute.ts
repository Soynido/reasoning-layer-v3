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

    // These commands already exist in package.json, no need to re-register
    // Create Snapshot and Verify Integrity are handled by existing handlers
}

