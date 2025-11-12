/**
 * RL4 WebView UI — Single Context Snapshot System
 * Phase E3.3: Radical simplification - 1 button, 0 confusion
 */

import { useState, useEffect } from 'react';
import './App.css';

// Declare vscode API
declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
    };
    acquireVsCodeApi?: () => {
      postMessage: (message: any) => void;
    };
  }
}

type DeviationMode = 'strict' | 'flexible' | 'exploratory' | 'free';

export default function App() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deviationMode, setDeviationMode] = useState<DeviationMode>('flexible');

  // Listen for messages from extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      console.log('[RL4 WebView] Received message:', message.type);
      
      switch (message.type) {
        case 'snapshotGenerated':
          console.log('[RL4 WebView] Snapshot received, length:', message.payload?.length);
          setPrompt(message.payload);
          setLoading(false);
          
          // Copy to clipboard automatically
          if (message.payload) {
            navigator.clipboard.writeText(message.payload).then(() => {
              setFeedback('✅ Copied to clipboard!');
              setTimeout(() => setFeedback(null), 3000);
            }).catch(err => {
              console.error('[RL4] Clipboard error:', err);
              setFeedback('❌ Copy failed');
              setTimeout(() => setFeedback(null), 3000);
            });
          }
          break;
          
        case 'error':
          console.error('[RL4 WebView] Error:', message.payload);
          setLoading(false);
          setFeedback('❌ Error generating snapshot');
          setTimeout(() => setFeedback(null), 3000);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  // Generate snapshot handler
  const handleGenerateSnapshot = () => {
    setLoading(true);
    setFeedback(null);
    
    console.log('[RL4 WebView] Requesting snapshot with mode:', deviationMode);
    
    if (window.vscode) {
      window.vscode.postMessage({ 
        type: 'generateSnapshot',
        deviationMode 
      });
    } else {
      console.error('[RL4] vscode API not available');
      setLoading(false);
      setFeedback('❌ VS Code API unavailable');
    }
  };

  return (
    <div className="rl4-layout">
      {/* Header */}
      <header className="rl4-header">
        <div className="rl4-logo">
          <span className="rl4-icon">🧠</span>
          <h1>RL4 — Dev Continuity System</h1>
        </div>
        <div className="rl4-tagline">
          <p>Single Context Snapshot. Zero Confusion. Full Feedback Loop.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="rl4-main">
        <div className="rl4-hero">
          {/* Deviation Mode Selector */}
          <div className="deviation-mode-selector">
            <label htmlFor="deviation-mode">🎯 Perception Angle:</label>
            <select 
              id="deviation-mode"
              value={deviationMode}
              onChange={(e) => setDeviationMode(e.target.value as DeviationMode)}
              disabled={loading}
            >
              <option value="strict">🔴 Strict (0%) — P0 only</option>
              <option value="flexible">🟡 Flexible (25%) — P0+P1 OK</option>
              <option value="exploratory">🟢 Exploratory (50%) — New ideas welcome</option>
              <option value="free">⚪ Free (100%) — Creative mode</option>
            </select>
          </div>

          <button 
            onClick={handleGenerateSnapshot}
            disabled={loading}
            className="generate-button"
          >
            {loading ? '⏳ Generating Snapshot...' : '📋 Generate Context Snapshot'}
          </button>

          {feedback && (
            <div className={`feedback ${feedback.includes('✅') ? 'success' : 'error'}`}>
              {feedback}
            </div>
          )}

          <div className="rl4-instructions">
            <p><strong>How it works:</strong></p>
            <ol>
              <li>Click button → Prompt generated & copied</li>
              <li>Paste in Cursor/Claude → Agent analyzes</li>
              <li>Agent updates <code>.reasoning_rl4/Plan.RL4</code>, <code>Tasks.RL4</code>, <code>Context.RL4</code></li>
              <li>RL4 detects changes → Updates internal state</li>
              <li>Next snapshot includes your updates ✅</li>
            </ol>
          </div>
        </div>

        {/* Prompt Preview */}
        {prompt && (
          <div className="prompt-preview">
            <div className="prompt-header">
              <h3>📋 Context Snapshot</h3>
              <span className="prompt-length">{prompt.length} characters</span>
            </div>
            
            <pre className="prompt-content">
              {prompt.substring(0, 1500)}
              {prompt.length > 1500 && '\n\n... (full prompt copied to clipboard)'}
            </pre>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(prompt).then(() => {
                  setFeedback('✅ Copied again!');
                  setTimeout(() => setFeedback(null), 2000);
                });
              }}
              className="copy-again-button"
            >
              📋 Copy Again
            </button>
          </div>
        )}

        {/* Info Cards */}
        <div className="info-cards">
          <div className="info-card">
            <h4>🎯 What RL4 Does</h4>
            <p>Collects workspace activity, system health, file patterns, git history, and ADRs.</p>
          </div>
          
          <div className="info-card">
            <h4>🔍 What You Get</h4>
            <p>Complete context: Plan + Tasks + Timeline + Blind Spot Data + Decision History.</p>
          </div>
          
          <div className="info-card">
            <h4>🔄 Feedback Loop</h4>
            <p>Agent updates <code>Plan/Tasks/Context/ADRs.RL4</code> → RL4 parses → Next snapshot reflects changes.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="rl4-footer">
        <p>RL4 v2.4.0 — Phase E3.3: Single Context Snapshot System</p>
        <p style={{ fontSize: '11px', color: '#666' }}>
          Files: <code>.reasoning_rl4/Plan.RL4</code>, <code>Tasks.RL4</code>, <code>Context.RL4</code>, <code>ADRs.RL4</code>
        </p>
      </footer>
    </div>
  );
}