/**
 * RL4 WebView UI — Smart UI with LLM-Validated KPIs
 * Phase E4: Transform "data display" into "actionable insights"
 */

import { useState, useEffect } from 'react';
import './App.css';
import { 
  CognitiveLoadCard, 
  NextStepsCard, 
  PlanDriftCard, 
  RisksCard 
} from './components';
import { 
  parseContextRL4, 
  getMockKPIData,
  type CognitiveLoadData,
  type NextTasksData,
  type PlanDriftData,
  type RisksData
} from './utils/contextParser';

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

type DeviationMode = 'strict' | 'flexible' | 'exploratory' | 'free' | 'firstUse';

// FileLink component (defined outside to avoid re-creation on each render)
const FileLink = ({ fileName }: { fileName: string }) => {
  const handleOpenFile = (fileName: string) => {
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'openFile',
        fileName
      });
    } else {
      console.error('[RL4] vscode API not available');
    }
  };

  return (
    <code 
      onClick={() => handleOpenFile(fileName)}
      style={{ 
        cursor: 'pointer', 
        color: 'var(--vscode-textLink-foreground)',
        textDecoration: 'underline'
      }}
      title={`Click to open ${fileName} in editor`}
    >
      {fileName}
    </code>
  );
};

export default function App() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deviationMode, setDeviationMode] = useState<DeviationMode>('flexible');
  
  // KPI States
  const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoadData | null>(null);
  const [nextTasks, setNextTasks] = useState<NextTasksData | null>(null);
  const [planDrift, setPlanDrift] = useState<PlanDriftData | null>(null);
  const [risks, setRisks] = useState<RisksData | null>(null);
  const [showKPIs, setShowKPIs] = useState(false);
  
  // GitHub connection state
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; repo?: string; reason?: string } | null>(null);
  
  // Commit prompt state
  const [commitPrompt, setCommitPrompt] = useState<string | null>(null);
  const [commitCommand, setCommitCommand] = useState<string | null>(null);
  const [commitWhy, setCommitWhy] = useState<string | null>(null);
  const [commitPreview, setCommitPreview] = useState<{ title?: string; body?: string } | null>(null);

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
          
        case 'kpisUpdated':
          console.log('[RL4 WebView] KPIs updated:', message.payload);
          if (message.payload) {
            const parsed = parseContextRL4(message.payload);
            setCognitiveLoad(parsed.cognitiveLoad);
            setNextTasks(parsed.nextSteps);
            setPlanDrift(parsed.planDrift);
            setRisks(parsed.risks);
            setShowKPIs(true);
            setFeedback('✅ KPIs updated from Context.RL4');
            setTimeout(() => setFeedback(null), 3000);
          }
          break;
          
        case 'githubStatus':
          console.log('[RL4 WebView] GitHub status:', message.payload);
          setGithubStatus(message.payload);
          break;
          
        case 'githubConnected':
          setFeedback('✅ GitHub connected successfully!');
          setTimeout(() => setFeedback(null), 3000);
          // Request updated status
          if (window.vscode) {
            window.vscode.postMessage({ type: 'checkGitHubStatus' });
          }
          break;
          
        case 'githubError':
          setFeedback(`❌ GitHub connection failed: ${message.payload || 'Unknown error'}`);
          setTimeout(() => setFeedback(null), 5000);
          break;
          
        case 'commitPromptGenerated':
          setCommitPrompt(message.payload);
          setFeedback('✅ Commit prompt copied to clipboard!');
          setTimeout(() => setFeedback(null), 3000);
          break;
          
        case 'commitCommandReceived':
          setCommitCommand(message.payload);
          setFeedback('✅ GH CLI command received from LLM');
          setTimeout(() => setFeedback(null), 3000);
          break;
          
        case 'commitExecuted':
          setFeedback('✅ Commit created successfully!');
          setCommitCommand(null);
          setCommitPrompt(null);
          setCommitWhy(null);
          setCommitPreview(null);
          setTimeout(() => setFeedback(null), 3000);
          break;
          
        case 'commitError':
          setFeedback(`❌ Commit failed: ${message.payload || 'Unknown error'}`);
          setTimeout(() => setFeedback(null), 5000);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);
  
  // Load mock KPIs on mount for development
  useEffect(() => {
    const mockData = getMockKPIData();
    setCognitiveLoad(mockData.cognitiveLoad);
    setNextTasks(mockData.nextTasks);
    setPlanDrift(mockData.planDrift);
    setRisks(mockData.risks);
    setShowKPIs(true);
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

  // Connect GitHub handler
  const handleConnectGitHub = () => {
    if (window.vscode) {
      window.vscode.postMessage({ 
        type: 'connectGitHub'
      });
      setFeedback('🔗 Opening GitHub token setup...');
    } else {
      console.error('[RL4] vscode API not available');
      setFeedback('❌ VS Code API unavailable');
    }
  };

  // Check GitHub status on mount
  useEffect(() => {
    if (window.vscode) {
      window.vscode.postMessage({ type: 'checkGitHubStatus' });
    }
  }, []);

  // Generate commit prompt handler
  const handleGenerateCommitPrompt = () => {
    if (window.vscode) {
      window.vscode.postMessage({ type: 'generateCommitPrompt' });
      setFeedback('🔍 Collecting commit context...');
    }
  };

  // Validate and execute commit
  const handleValidateCommit = () => {
    if (!commitCommand) return;
    
    // Extract command from RL4 validation token if present
    let commandToExecute = commitCommand;
    
    if (commitCommand.includes('RL4_COMMIT_VALIDATE')) {
      // Parse the validation token block (handle both single-line and multi-line formats)
      const tokenMatch = commitCommand.match(/RL4_COMMIT_VALIDATE\s*(.+?)\s*RL4_COMMIT_END/s);
      if (tokenMatch) {
        const tokenContent = tokenMatch[1];
        const commandMatch = tokenContent.match(/COMMAND:\s*(.+?)(?:\s*RL4_COMMIT_END|$)/s);
        if (commandMatch) {
          commandToExecute = commandMatch[1].trim().replace(/\s+/g, ' ');
        } else {
          setFeedback('❌ Could not extract command from validation token');
          setTimeout(() => setFeedback(null), 3000);
          return;
        }
      } else {
        setFeedback('❌ Invalid validation token format');
        setTimeout(() => setFeedback(null), 3000);
        return;
      }
    }
    
    // Validate command format
    if (!commandToExecute.includes('gh pr create')) {
      setFeedback('❌ Invalid command format. Must be a gh pr create command.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    
    if (window.vscode) {
      window.vscode.postMessage({ 
        type: 'executeCommitCommand',
        command: commandToExecute
      });
      setFeedback('⏳ Creating commit...');
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
              className={deviationMode === 'firstUse' ? 'first-use-mode' : ''}
            >
              <optgroup label="Standard Modes">
                <option value="strict">🔴 Strict (0%) — P0 only</option>
                <option value="flexible">🟡 Flexible (25%) — P0+P1 OK</option>
                <option value="exploratory">🟢 Exploratory (50%) — New ideas welcome</option>
                <option value="free">⚪ Free (100%) — Creative mode</option>
              </optgroup>
              <optgroup label="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━">
                <option value="firstUse">
                  🔍 First Use — Analyze project history (~5s)
                </option>
              </optgroup>
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

          {/* GitHub Connection */}
          <div className="github-connection" style={{ marginTop: '20px', padding: '15px', border: '1px solid var(--vscode-input-border)', borderRadius: '4px', backgroundColor: 'var(--vscode-input-background)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <strong>🔗 GitHub Integration</strong>
                {githubStatus && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: githubStatus.connected ? '#4caf50' : '#ff9800' }}>
                    {githubStatus.connected 
                      ? `✅ Connected to ${githubStatus.repo || 'repository'}`
                      : `⚠️ ${githubStatus.reason === 'no_repo' ? 'No repository detected' : githubStatus.reason === 'missing_token' ? 'No token configured' : 'Not connected'}`
                    }
                  </span>
                )}
              </div>
              <button
                onClick={handleConnectGitHub}
                style={{
                  padding: '6px 12px',
                  backgroundColor: githubStatus?.connected ? 'var(--vscode-button-secondaryBackground)' : 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {githubStatus?.connected ? '🔄 Reconnect' : '🔗 Connect GitHub'}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', margin: 0 }}>
              Connect your GitHub repository to enable PR/Issue tracking and cognitive analysis.
            </p>
          </div>

          {/* Commit with WHY */}
          {githubStatus?.connected && (
            <div className="commit-enrichment" style={{ marginTop: '20px', padding: '15px', border: '1px solid var(--vscode-input-border)', borderRadius: '4px', backgroundColor: 'var(--vscode-input-background)' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>📝 Generate Commit with WHY</strong>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginBottom: '10px' }}>
                Generate a commit prompt with RL4 context. Paste it in your LLM to get WHY + GH CLI command.
              </p>
              <button
                onClick={handleGenerateCommitPrompt}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '10px'
                }}
              >
                📋 Generate Commit Prompt
              </button>
              
              {commitPrompt && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'var(--vscode-textBlockQuote-background)', borderRadius: '4px' }}>
                  <strong>✅ Prompt copied! Paste it in your LLM, then paste the RL4 validation token below:</strong>
                  <textarea
                    placeholder="Paste the RL4_COMMIT_VALIDATE block from your LLM response here..."
                    value={commitCommand || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setCommitCommand(text);
                      
                      // Auto-detect and parse RL4 validation token
                      if (text.includes('RL4_COMMIT_VALIDATE') && text.includes('RL4_COMMIT_END')) {
                        // Extract token block (handle both single-line and multi-line formats)
                        const tokenMatch = text.match(/RL4_COMMIT_VALIDATE\s*(.+?)\s*RL4_COMMIT_END/s);
                        if (tokenMatch) {
                          const tokenContent = tokenMatch[1];
                          
                          // Extract WHY (handle both \n and spaces as separators)
                          const whyMatch = tokenContent.match(/WHY:\s*(.+?)(?:\s+COMMAND:|COMMAND:)/s);
                          if (whyMatch) {
                            setCommitWhy(whyMatch[1].trim().replace(/\s+/g, ' '));
                          }
                          
                          // Extract command (handle both \n and spaces as separators)
                          const commandMatch = tokenContent.match(/COMMAND:\s*(.+?)(?:\s*RL4_COMMIT_END|$)/s);
                          if (commandMatch) {
                            const extractedCommand = commandMatch[1].trim().replace(/\s+/g, ' ');
                            
                            // Extract title and body from command for preview
                            const titleMatch = extractedCommand.match(/--title\s+"((?:[^"\\]|\\.)+)"/);
                            const bodyMatch = extractedCommand.match(/--body\s+"((?:[^"\\]|\\.)+)"/);
                            
                            setCommitPreview({
                              title: titleMatch ? titleMatch[1].replace(/\\(.)/g, '$1') : undefined,
                              body: bodyMatch ? bodyMatch[1].replace(/\\n/g, '\n').replace(/\\(.)/g, '$1') : undefined
                            });
                          }
                        }
                      } else if (text.includes('gh pr create')) {
                        // Direct command without token - try to extract preview
                        const titleMatch = text.match(/--title\s+"([^"]+)"/);
                        const bodyMatch = text.match(/--body\s+"([^"]+)"/);
                        
                        setCommitPreview({
                          title: titleMatch ? titleMatch[1] : undefined,
                          body: bodyMatch ? bodyMatch[1].replace(/\\n/g, '\n') : undefined
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      marginTop: '10px',
                      padding: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      backgroundColor: 'var(--vscode-editor-background)',
                      color: 'var(--vscode-editor-foreground)',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '2px',
                      resize: 'vertical'
                    }}
                  />
                  <p style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '5px', marginBottom: '0' }}>
                    💡 Tip: Paste the entire RL4_COMMIT_VALIDATE block from your LLM. The command will be extracted automatically.
                  </p>
                  {commitCommand && commitCommand.includes('gh pr create') && (
                    <div style={{ marginTop: '15px' }}>
                      {/* WHY Display */}
                      {commitWhy && (
                        <div style={{ 
                          padding: '10px', 
                          backgroundColor: 'var(--vscode-textBlockQuote-background)', 
                          borderRadius: '4px',
                          marginBottom: '10px',
                          borderLeft: '3px solid #4caf50'
                        }}>
                          <strong style={{ fontSize: '11px', color: '#4caf50' }}>💡 WHY:</strong>
                          <p style={{ fontSize: '11px', marginTop: '5px', marginBottom: '0' }}>
                            {commitWhy}
                          </p>
                        </div>
                      )}
                      
                      {/* Commit Preview */}
                      {commitPreview && (
                        <div style={{ 
                          padding: '10px', 
                          backgroundColor: 'var(--vscode-editor-background)', 
                          borderRadius: '4px',
                          marginBottom: '10px'
                        }}>
                          <strong style={{ fontSize: '11px' }}>🔍 Commit Preview:</strong>
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong style={{ fontSize: '10px', color: 'var(--vscode-textLink-foreground)' }}>Title:</strong>
                              <div style={{ 
                                fontSize: '10px', 
                                marginTop: '3px',
                                padding: '5px',
                                backgroundColor: 'var(--vscode-input-background)',
                                borderRadius: '2px'
                              }}>
                                {commitPreview.title || 'N/A'}
                              </div>
                            </div>
                            {commitPreview.body && (
                              <div>
                                <strong style={{ fontSize: '10px', color: 'var(--vscode-textLink-foreground)' }}>Body:</strong>
                                <pre style={{ 
                                  fontSize: '9px', 
                                  marginTop: '3px',
                                  padding: '5px',
                                  backgroundColor: 'var(--vscode-input-background)',
                                  borderRadius: '2px',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                  wordBreak: 'break-word'
                                }}>
                                  {commitPreview.body}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Validation Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={handleValidateCommit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✅ Validate & Execute
                        </button>
                        <button
                          onClick={() => {
                            setCommitCommand(null);
                            setCommitPrompt(null);
                            setCommitWhy(null);
                            setCommitPreview(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rl4-instructions">
            <p><strong>How it works:</strong></p>
            <ol>
              <li>Click button → Prompt generated & copied</li>
              <li>Paste in Cursor/Claude → Agent analyzes</li>
              <li>Agent updates <FileLink fileName="Plan.RL4" />, <FileLink fileName="Tasks.RL4" />, <FileLink fileName="Context.RL4" />, <FileLink fileName="ADRs.RL4" /></li>
              <li>RL4 detects changes → Updates internal state</li>
              <li>Next snapshot includes your updates ✅</li>
            </ol>
          </div>
        </div>

        {/* KPI Dashboard */}
        {showKPIs && (
          <div className="kpi-dashboard">
            <div className="kpi-dashboard-header">
              <h2>📊 Workspace Insights</h2>
              <p className="kpi-disclaimer">
                ✅ Real-time metrics from your workspace activity
              </p>
            </div>
            
            <div className="kpi-grid">
              {cognitiveLoad && (
                <CognitiveLoadCard 
                  percentage={cognitiveLoad.percentage}
                  level={cognitiveLoad.level}
                  metrics={cognitiveLoad.metrics}
                />
              )}
              
              {nextTasks && (
                <NextStepsCard 
                  mode={nextTasks.mode}
                  steps={nextTasks.steps}
                />
              )}
              
              {planDrift && (
                <PlanDriftCard 
                  percentage={planDrift.percentage}
                  threshold={planDrift.threshold}
                  changes={planDrift.changes}
                />
              )}
              
              {risks && (
                <RisksCard risks={risks.risks} />
              )}
            </div>
          </div>
        )}

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
            <p>Agent updates <FileLink fileName="Plan.RL4" />, <FileLink fileName="Tasks.RL4" />, <FileLink fileName="Context.RL4" />, <FileLink fileName="ADRs.RL4" /> → RL4 parses → Next snapshot reflects changes.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="rl4-footer">
        <p>RL4 — Development Context Snapshot</p>
        <p style={{ fontSize: '11px', color: '#666' }}>
          Files: <FileLink fileName="Plan.RL4" />, <FileLink fileName="Tasks.RL4" />, <FileLink fileName="Context.RL4" />, <FileLink fileName="ADRs.RL4" />
        </p>
      </footer>
    </div>
  );
}