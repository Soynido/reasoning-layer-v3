/**
 * Cognitive Agents - Global RL3 Agent Components
 * 
 * This module contains the agents for the "Reasoning Layer Everywhere" strategy:
 * - CognitiveScorer: Evaluate cognitive value of GitHub content
 * - CognitiveCommentEngine: Generate intelligent, non-spammy comments
 * - GitHubWatcher: Monitor GitHub for cognitive signals
 * - MemoryLedger: Track all interactions and build cognitive graph
 */

export { CognitiveScorer, type ScoredContent, type CognitiveSignals } from './CognitiveScorer';
export { CognitiveCommentEngine, type CommentInsight } from './CognitiveCommentEngine';
export { GitHubWatcher, type WatchConfig, type WatchedIssue } from './GitHubWatcher';
export { MemoryLedger, type InteractionRecord, type RepoHistory, type CognitiveGraph } from './MemoryLedger';

