/**
 * Risks Card — Displays observable risks only
 * NO speculation. Only factual observations from system data.
 */

import React from 'react';

interface Risk {
  emoji: string;
  severity: 'critical' | 'warning' | 'ok';
  description: string;
}

interface RisksProps {
  risks: Risk[];
}

export const RisksCard: React.FC<RisksProps> = ({ risks }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff4d4d';
      case 'warning': return '#ff9500';
      case 'ok': return '#00c864';
      default: return '#667eea';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'CRITICAL';
      case 'warning': return 'WARNING';
      case 'ok': return 'OK';
      default: return 'INFO';
    }
  };

  // Count risks by severity
  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  const warningCount = risks.filter(r => r.severity === 'warning').length;
  const okCount = risks.filter(r => r.severity === 'ok').length;

  return (
    <div className="kpi-card risks-card">
      <div className="kpi-header">
        <h3>⚠️ Risks</h3>
        <div className="tooltip">
          <span className="tooltip-icon">ℹ️</span>
          <div className="tooltip-content">
            <strong>Observable Risks Only:</strong><br/>
            NO speculation, NO predictions. Just facts.<br/><br/>
            <strong>Detected From:</strong><br/>
            • 🔴 Uncommitted files: Count from timeline (if &gt;15 files)<br/>
            • 🟡 Burst activity: Files with &gt;30 edits in &lt;2min<br/>
            • 🟡 Long gaps: Breaks &gt;30min (potential blocker?)<br/>
            • 🟢 System health: Memory &gt;400MB or event loop &gt;1ms p95<br/><br/>
            All thresholds are configurable and based on observable data.
          </div>
        </div>
      </div>

      <div className="risks-summary">
        {criticalCount > 0 && (
          <span className="risk-count critical">
            🔴 {criticalCount} Critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="risk-count warning">
            🟡 {warningCount} Warning
          </span>
        )}
        {okCount > 0 && (
          <span className="risk-count ok">
            🟢 {okCount} OK
          </span>
        )}
        {risks.length === 0 && (
          <span className="risk-count ok">
            ✅ No risks detected
          </span>
        )}
      </div>

      <div className="kpi-risks">
        {risks.length > 0 ? (
          <ul className="risks-list">
            {risks.map((risk, index) => (
              <li 
                key={index} 
                className="risk-item"
                style={{ borderLeftColor: getSeverityColor(risk.severity) }}
              >
                <div className="risk-header">
                  <span className="risk-emoji">{risk.emoji}</span>
                  <span 
                    className="risk-severity" 
                    style={{ color: getSeverityColor(risk.severity) }}
                  >
                    {getSeverityLabel(risk.severity)}
                  </span>
                </div>
                <p className="risk-description">{risk.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-risks">
            ✅ No observable risks detected. System health excellent.
          </p>
        )}
      </div>
    </div>
  );
};

