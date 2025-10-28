import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Legacy command redirects - Migration from old taxonomy to cognitive structure
 * 
 * This ensures backward compatibility while the Reasoning Layer evolves its cognitive architecture.
 */
const redirects: Record<string, string> = {
    // ADR commands → Decide
    'reasoning.adr.create': 'reasoning.generateADRs',
    'reasoning.adr.list': 'reasoning.decisions.analyze',
    'reasoning.adr.view': 'reasoning.decisions.analyze',
    'reasoning.adr.autoGenerate': 'reasoning.generateADRs',
    
    // Security commands → Execute
    'reasoning.security.verify': 'reasoning.integrity.verify',
    'reasoning.snapshot.create': 'reasoning.integrity.verify',
    'reasoning.snapshot.list': 'reasoning.integrity.verify',
    
    // External commands → Collaborate (placeholder)
    'reasoning.external.sync': 'reasoning.github.sync',
    'reasoning.external.status': 'reasoning.dashboard.show',
    'reasoning.external.linkADR': 'reasoning.decisions.analyze',
    
    // Human commands → Collaborate (placeholder)
    'reasoning.contributors.extract': 'reasoning.dashboard.show',
    'reasoning.contributors.list': 'reasoning.dashboard.show',
    
    // Pattern commands → Patterns contextual
    'reasoning.pattern.analyze': 'reasoning.patterns.list',
    
    // Correlation commands → Understand
    'reasoning.correlation.analyze': 'reasoning.events.correlate',
    
    // Forecast commands → Forecasts contextual
    'reasoning.forecast.generate': 'reasoning.forecasts.show',
    
    // Evidence commands → Understand
    'reasoning.evidence.report': 'reasoning.decisions.analyze',
    
    // UI commands → Observe
    'reasoning.perceptual.open': 'reasoning.dashboard.show',
};

/**
 * Log redirect event to Reasoning Layer traces
 */
function logRedirect(workspaceRoot: string, fromCmd: string, toCmd: string) {
    try {
        const tracesDir = path.join(workspaceRoot, '.reasoning', 'traces');
        if (!fs.existsSync(tracesDir)) {
            fs.mkdirSync(tracesDir, { recursive: true });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const traceFile = path.join(tracesDir, `${today}.json`);
        
        const event = {
            id: `redirect-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'command_redirected',
            source: fromCmd,
            target: toCmd,
            metadata: {
                category: 'migration',
                confidence: 1.0,
                synthetic: false
            }
        };
        
        let existing: any[] = [];
        if (fs.existsSync(traceFile)) {
            existing = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
        }
        
        existing.push(event);
        fs.writeFileSync(traceFile, JSON.stringify(existing, null, 2));
    } catch (error) {
        // Silent fail - don't break redirects if logging fails
        console.warn('Failed to log redirect:', error);
    }
}

/**
 * Register legacy command redirects
 */
export function registerLegacyRedirects(context: vscode.ExtensionContext, workspaceRoot: string) {
    for (const [oldCmd, newCmd] of Object.entries(redirects)) {
        context.subscriptions.push(
            vscode.commands.registerCommand(oldCmd as any, async () => {
                console.log(`🔄 Redirecting ${oldCmd} → ${newCmd}`);
                
                // Log redirect for cognitive learning
                logRedirect(workspaceRoot, oldCmd, newCmd);
                
                // Show subtle notification (only once per session)
                const key = `redirect_notified_${oldCmd}`;
                if (!context.globalState.get(key)) {
                    vscode.window.showInformationMessage(
                        `🔄 "${oldCmd}" → Now use "${newCmd}" (migration mode)`,
                        'OK'
                    ).then(() => {
                        context.globalState.update(key, true);
                    });
                }
                
                // Execute the new command
                try {
                    await vscode.commands.executeCommand(newCmd);
                } catch (error) {
                    vscode.window.showWarningMessage(
                        `Command redirect failed: ${newCmd} not available`
                    );
                }
            })
        );
    }
    
    console.log(`✅ Registered ${Object.keys(redirects).length} legacy redirects`);
}

