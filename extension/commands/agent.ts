import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { UnifiedLogger } from '../core/UnifiedLogger';
import {
    CognitiveScorer,
    CognitiveCommentEngine,
    GitHubWatcher,
    MemoryLedger,
    WatchConfig
} from '../core/agents';

/**
 * Agent commands - Global RL3 Agent operations
 */
export function registerAgentCommands(context: vscode.ExtensionContext) {
    const logger = UnifiedLogger.getInstance();

    // Watch GitHub (observe mode - no comments)
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.agent.observe', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            logger.log('');
            logger.log('👁️  === REASONING LAYER V3 — GITHUB OBSERVER ===');
            logger.log('');

            const config: WatchConfig = {
                topics: ['reasoning', 'architecture decision', 'ADR', 'cognitive', 'intent'],
                maxReposPerHour: 10,
                maxCommentsPerDay: 5,
                observeOnly: true // Safe mode: no comments
            };

            const watcher = new GitHubWatcher(config);
            const memoryLedger = new MemoryLedger(workspaceRoot);

            try {
                // Search for issues
                logger.log(`🔍 Searching GitHub for cognitive signals...`);
                const issues = await watcher.searchIssues();
                logger.log(`📊 Found ${issues.length} issues`);

                // Filter by relevance
                const candidates = watcher.filterCandidates(issues);
                logger.log(`🎯 Selected ${candidates.length} high-value candidates`);

                // Record observations
                for (const candidate of candidates) {
                    memoryLedger.recordObservation(candidate);
                    logger.log(`  👁️  ${candidate.url} (score: ${candidate.relevance.toFixed(2)})`);
                }

                // Show stats
                const stats = watcher.getStats();
                logger.log('');
                logger.log('📊 Session Stats:');
                logger.log(`  - Repos watched: ${stats.watchedReposToday}`);
                logger.log(`  - Observations: ${candidates.length}`);
                logger.log(`  - Mode: ${stats.observeOnly ? 'OBSERVE ONLY' : 'ACTIVE'}`);
                logger.log('');

                vscode.window.showInformationMessage(
                    `✅ Observed ${candidates.length} cognitive discussions. Check RL3 output for details.`
                );

            } catch (error) {
                logger.warn(`Observation failed: ${error}`);
                vscode.window.showErrorMessage(`Failed to observe GitHub: ${error}`);
            }
        })
    );

    // Score a GitHub URL
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.agent.score', async () => {
            const url = await vscode.window.showInputBox({
                prompt: 'Enter GitHub issue/PR URL',
                placeHolder: 'https://github.com/owner/repo/issues/123'
            });

            if (!url) return;

            try {
                logger.log(`📊 Scoring: ${url}`);

                // Fetch issue data via gh CLI
                const { execSync } = require('child_process');
                const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
                
                if (!match) {
                    vscode.window.showErrorMessage('Invalid GitHub issue URL');
                    return;
                }

                const [, owner, repo, number] = match;
                const result = execSync(`gh issue view ${number} --repo ${owner}/${repo} --json title,body`, {
                    encoding: 'utf-8'
                });

                const issue = JSON.parse(result);
                
                // Score it
                const scorer = new CognitiveScorer();
                const scored = scorer.scoreContent(url, issue.title, issue.body);
                
                // Show explanation
                const explanation = scorer.explainScore(scored);
                logger.log(explanation);

                // Show in document
                const doc = await vscode.workspace.openTextDocument({
                    content: explanation,
                    language: 'markdown'
                });
                vscode.window.showTextDocument(doc);

            } catch (error) {
                logger.warn(`Failed to score: ${error}`);
                vscode.window.showErrorMessage(`Failed to score: ${error}`);
            }
        })
    );

    // Generate comment preview
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.agent.preview', async () => {
            const url = await vscode.window.showInputBox({
                prompt: 'Enter GitHub issue/PR URL',
                placeHolder: 'https://github.com/owner/repo/issues/123'
            });

            if (!url) return;

            try {
                logger.log(`💬 Generating comment preview for: ${url}`);

                // Fetch issue data
                const { execSync } = require('child_process');
                const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
                
                if (!match) {
                    vscode.window.showErrorMessage('Invalid GitHub issue URL');
                    return;
                }

                const [, owner, repo, number] = match;
                const result = execSync(`gh issue view ${number} --repo ${owner}/${repo} --json title,body`, {
                    encoding: 'utf-8'
                });

                const issue = JSON.parse(result);
                
                // Score it
                const scorer = new CognitiveScorer();
                const scored = scorer.scoreContent(url, issue.title, issue.body);
                
                // Generate comment
                const commentEngine = new CognitiveCommentEngine();
                const preview = commentEngine.previewComment(scored);
                
                logger.log(preview);

                // Show in document
                const doc = await vscode.workspace.openTextDocument({
                    content: preview,
                    language: 'markdown'
                });
                vscode.window.showTextDocument(doc);

            } catch (error) {
                logger.warn(`Failed to generate preview: ${error}`);
                vscode.window.showErrorMessage(`Failed to generate preview: ${error}`);
            }
        })
    );

    // Show memory ledger
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.agent.memory', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const memoryLedger = new MemoryLedger(workspaceRoot);
            const report = memoryLedger.generateReport();

            logger.log(report);

            // Show in document
            const doc = await vscode.workspace.openTextDocument({
                content: report,
                language: 'markdown'
            });
            vscode.window.showTextDocument(doc);
        })
    );

    // Build cognitive graph
    context.subscriptions.push(
        vscode.commands.registerCommand('reasoning.agent.graph', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const memoryLedger = new MemoryLedger(workspaceRoot);
            const graph = memoryLedger.buildCognitiveGraph();

            const report = [
                `# 🌍 Global Cognitive Graph`,
                ``,
                `## 📊 Overview`,
                `- Repos: ${graph.repos.size}`,
                `- Total Interactions: ${graph.totalInteractions}`,
                `- Comments Posted: ${graph.totalComments}`,
                ``,
                `## 🔝 Top Keywords`,
                graph.topKeywords.map(k => `- **${k.keyword}**: ${k.count}`).join('\n'),
                ``,
                `## 🏆 Top Repos`,
                graph.topRepos.slice(0, 10).map((r, i) => `${i + 1}. ${r.repo} (${r.score.toFixed(2)})`).join('\n'),
                ``,
                `## 📈 Repo Details`,
                ``
            ];

            // Add top 5 repo histories
            const topRepoHistories = Array.from(graph.repos.values())
                .sort((a, b) => b.avgScore - a.avgScore)
                .slice(0, 5);

            for (const history of topRepoHistories) {
                report.push(`### ${history.repo}`);
                report.push(`- Interactions: ${history.totalInteractions} (${history.comments} comments, ${history.observations} observations)`);
                report.push(`- Avg Score: ${history.avgScore.toFixed(2)}`);
                report.push(`- Keywords: ${history.keywords.join(', ')}`);
                report.push(``);
            }

            const content = report.join('\n');
            logger.log(content);

            // Show in document
            const doc = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            vscode.window.showTextDocument(doc);
        })
    );
}

