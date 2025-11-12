/**
 * Cognitive Load Card — Displays factual cognitive load metrics
 * NO predictions, NO judgments. Just observable data.
 */

import React from 'react';

interface CognitiveLoadProps {
  percentage: number;
  level: 'normal' | 'high' | 'critical';
  metrics: {
    bursts: number;
    switches: number;
    parallelTasks: number;
    uncommittedFiles: number;
  };
}

export const CognitiveLoadCard: React.FC<CognitiveLoadProps> = ({ 
  percentage, 
  level, 
  metrics 
}) => {
  const getLevelColor = () => {
    switch (level) {
      case 'critical': return '#ff4d4d';
      case 'high': return '#ff9500';
      case 'normal': return '#00c864';
      default: return '#667eea';
    }
  };

  const getLevelEmoji = () => {
    switch (level) {
      case 'critical': return '🔴';
      case 'high': return '🟡';
      case 'normal': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="kpi-card cognitive-load-card">
      <div className="kpi-header">
        <h3>🧠 Cognitive Load</h3>
        <div className="tooltip">
          <span className="tooltip-icon">ℹ️</span>
          <div className="tooltip-content">
            <strong>Factual Calculation:</strong><br/>
            Based on observable data only:<br/>
            • Bursts: Rapid edit sessions (&gt;30 edits in &lt;2min)<br/>
            • Switches: File jumps in timeline<br/>
            • Parallel Tasks: Tasks with status "in_progress"<br/>
            • Uncommitted Files: Files changed but not committed<br/><br/>
            <strong>Formula:</strong><br/>
            (bursts/10 × 0.3) + (switches/50 × 0.2) + (parallel/3 × 0.3) + (uncommitted/20 × 0.2)
          </div>
        </div>
      </div>

      <div className="kpi-value">
        <span className="kpi-percentage" style={{ color: getLevelColor() }}>
          {percentage}%
        </span>
        <span className="kpi-level" style={{ color: getLevelColor() }}>
          {getLevelEmoji()} {level.charAt(0).toUpperCase() + level.slice(1)}
        </span>
      </div>

      <div className="kpi-metrics">
        <div className="metric-item">
          <span className="metric-label">Bursts:</span>
          <span className="metric-value">{metrics.bursts}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Switches:</span>
          <span className="metric-value">{metrics.switches}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Parallel Tasks:</span>
          <span className="metric-value">{metrics.parallelTasks}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Uncommitted Files:</span>
          <span className="metric-value" style={{ 
            color: metrics.uncommittedFiles > 15 ? '#ff4d4d' : 'inherit' 
          }}>
            {metrics.uncommittedFiles}
          </span>
        </div>
      </div>
    </div>
  );
};

