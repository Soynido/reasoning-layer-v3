/**
 * Input Layer - Universal Listeners
 * 
 * Part of the Tri-Layer Architecture:
 * 🎧 INPUT LAYER (Listen) → 🧠 CORE ENGINES (Think) → 🗣️ OUTPUT LAYER (Speak)
 * 
 * Components:
 * - GitCommitListener: Captures git commits and parses intent (Phase 1 ✅)
 * - FileChangeWatcher: Monitors file modifications (Phase 2 ✅)
 * - GitHubDiscussionListener: Watches GitHub issues/PRs (Phase 3 ✅)
 * - ShellMessageCapture: Intercepts terminal commands (Phase 4 ✅)
 * - LLMInterpreter: Interprets natural language (multilingual) (Bridge ✅)
 */

export { GitCommitListener, CommitContext, CommitIntent } from './GitCommitListener';
export { FileChangeWatcher, FileChange, ChangePattern, WatcherStats } from './FileChangeWatcher';
export { GitHubDiscussionListener, GitHubDiscussion, CognitiveScore, ListenerStats } from './GitHubDiscussionListener';
export { ShellMessageCapture, CaptureStats } from './ShellMessageCapture';
export { LLMInterpreter, InterpretationResult } from './LLMInterpreter';

