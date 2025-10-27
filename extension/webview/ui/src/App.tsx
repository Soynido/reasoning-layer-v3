/**
 * Reasoning Layer V3 - Main App Component
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import GoalBoard from './views/GoalBoard';
import './App.css';

interface AppProps {
  vscode: any;
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [cognitiveState, setCognitiveState] = useState<any>(null);

  useEffect(() => {
    // Request cognitive state from extension
    vscode.postMessage({
      command: 'requestCognitiveState'
    });

    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      switch (message.command) {
        case 'cognitiveStateUpdate':
          setCognitiveState(message.data);
          break;
      }
    });

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      vscode.postMessage({
        command: 'requestCognitiveState'
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [vscode]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard cognitiveState={cognitiveState} />;
      case 'goals':
        // Load goals - using goals_list if available from extension
        const goalsList = cognitiveState?.goals_list || [];
        return <GoalBoard goals={goalsList} />;
      default:
        return <div>View not implemented yet</div>;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="status-bar">
          <span className="live-indicator">🔴 LIVE</span>
          {cognitiveState && (
            <>
              <span>{cognitiveState.adrs?.total || 0} ADRs</span>
              <span>{cognitiveState.patterns?.total || 0} Patterns</span>
              <span>{cognitiveState.biases?.total || 0} Biases</span>
              <span>{cognitiveState.goals?.active || 0} Goals</span>
            </>
          )}
        </div>
      </header>
      
      <nav className="app-nav">
        <button onClick={() => setCurrentView('dashboard')}>Dashboard</button>
        <button onClick={() => setCurrentView('goals')}>Goals</button>
        <button>Patterns</button>
        <button>Correlations</button>
        <button>Memory</button>
        <button>Tasks</button>
        <button>System</button>
        <button>Logs</button>
      </nav>

      <main className="app-main">
        {cognitiveState ? (
          renderCurrentView()
        ) : (
          <div className="loading">Loading cognitive state...</div>
        )}
      </main>

      <footer className="app-footer">
        <button>▶ Execute Pipeline</button>
        <button>📊 Generate Report</button>
        <button>⚙️ Settings</button>
      </footer>
    </div>
  );
};

export default App;
