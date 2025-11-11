# 🖥️ WhereAmI Snapshot — WebView Integration Guide

## Vue d'ensemble

Ce document décrit comment intégrer le module **WhereAmISnapshot** dans une WebView React/Preact pour afficher un tableau de bord cognitif en temps réel.

---

## 🎯 Objectifs de la WebView

1. **Visualisation en temps réel** : Afficher l'état cognitif actuel du workspace
2. **Auto-refresh** : Mettre à jour automatiquement toutes les 10-30 secondes
3. **Interactivité** : Permettre de cliquer sur les éléments pour plus de détails
4. **Performance** : Charger et renderer rapidement sans bloquer l'extension

---

## 📂 Architecture proposée

```
extension/webview/
├── ui/
│   ├── components/
│   │   ├── CognitiveSnapshot.tsx       ← Composant principal
│   │   ├── PatternsList.tsx            ← Liste des patterns
│   │   ├── ForecastsList.tsx           ← Liste des forecasts
│   │   ├── ContextPanel.tsx            ← Panel fichiers actifs
│   │   └── MentalStateIndicator.tsx    ← Indicateur d'état mental
│   ├── hooks/
│   │   └── useSnapshotData.ts          ← Hook pour charger les données
│   └── index.tsx
```

---

## 🛠️ Exemple d'implémentation

### 1. **Hook pour charger les données**

```typescript
// extension/webview/ui/hooks/useSnapshotData.ts

import { useState, useEffect } from 'react';
import { CognitiveSnapshot } from '../../../kernel/api/WhereAmISnapshot';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

export function useSnapshotData(refreshIntervalMs: number = 10000) {
  const [snapshot, setSnapshot] = useState<CognitiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = () => {
    // Envoyer une requête à l'extension backend
    vscode.postMessage({ type: 'requestSnapshot' });
  };

  useEffect(() => {
    // Écouter les réponses de l'extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'snapshotData') {
        setSnapshot(message.data);
        setLoading(false);
        setError(null);
      } else if (message.type === 'snapshotError') {
        setError(message.error);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Charger initial
    fetchSnapshot();

    // Auto-refresh
    const interval = setInterval(fetchSnapshot, refreshIntervalMs);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [refreshIntervalMs]);

  return { snapshot, loading, error, refresh: fetchSnapshot };
}
```

### 2. **Composant principal CognitiveSnapshot**

```tsx
// extension/webview/ui/components/CognitiveSnapshot.tsx

import React from 'react';
import { useSnapshotData } from '../hooks/useSnapshotData';
import { PatternsList } from './PatternsList';
import { ForecastsList } from './ForecastsList';
import { ContextPanel } from './ContextPanel';
import { MentalStateIndicator } from './MentalStateIndicator';

export function CognitiveSnapshot() {
  const { snapshot, loading, error, refresh } = useSnapshotData(10000);

  if (loading) {
    return (
      <div className="snapshot-loading">
        <div className="spinner"></div>
        <p>Chargement du snapshot cognitif...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="snapshot-error">
        <p>❌ Erreur : {error}</p>
        <button onClick={refresh}>Réessayer</button>
      </div>
    );
  }

  if (!snapshot) {
    return <div className="snapshot-empty">Aucun snapshot disponible</div>;
  }

  return (
    <div className="cognitive-snapshot">
      <header className="snapshot-header">
        <h1>🧠 Where Am I?</h1>
        <div className="snapshot-meta">
          <span className="cycle-badge">Cycle {snapshot.cycleId}</span>
          <span className="timestamp">{new Date(snapshot.timestamp).toLocaleString('fr-FR')}</span>
          <button className="refresh-btn" onClick={refresh}>🔄 Refresh</button>
        </div>
      </header>

      {snapshot.mood && snapshot.confidence && (
        <MentalStateIndicator mood={snapshot.mood} confidence={snapshot.confidence} />
      )}

      <div className="snapshot-grid">
        <section className="snapshot-section context-section">
          <h2>📍 Current Context</h2>
          <ContextPanel 
            focusedFile={snapshot.focusedFile} 
            recentlyViewed={snapshot.recentlyViewed || []} 
          />
        </section>

        <section className="snapshot-section patterns-section">
          <h2>🔍 Cognitive Patterns</h2>
          <PatternsList patterns={snapshot.patterns || []} />
        </section>

        <section className="snapshot-section forecasts-section">
          <h2>📈 Forecasts</h2>
          <ForecastsList forecasts={snapshot.forecasts || []} />
        </section>
      </div>
    </div>
  );
}
```

### 3. **Composant PatternsList**

```tsx
// extension/webview/ui/components/PatternsList.tsx

import React from 'react';

interface Pattern {
  id: string;
  confidence: number;
  trend?: string;
}

interface PatternsListProps {
  patterns: Pattern[];
}

export function PatternsList({ patterns }: PatternsListProps) {
  if (patterns.length === 0) {
    return <p className="empty-state">No recent patterns detected.</p>;
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  };

  const getTrendClass = (trend?: string) => {
    if (trend === 'increasing') return 'trend-up';
    if (trend === 'decreasing') return 'trend-down';
    return 'trend-stable';
  };

  return (
    <ul className="patterns-list">
      {patterns.map((pattern, index) => (
        <li key={index} className={`pattern-item ${getTrendClass(pattern.trend)}`}>
          <div className="pattern-header">
            <span className="pattern-name">{pattern.id}</span>
            <span className="pattern-trend">{getTrendIcon(pattern.trend)}</span>
          </div>
          <div className="pattern-confidence">
            <div 
              className="confidence-bar" 
              style={{ width: `${pattern.confidence * 100}%` }}
            />
            <span className="confidence-label">
              {Math.round(pattern.confidence * 100)}%
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

### 4. **Backend handler dans extension.ts**

```typescript
// extension/extension.ts (ajout)

import { generateSnapshotJSON } from './kernel/api/WhereAmISnapshot';

// Dans la fonction activate()
context.subscriptions.push(
  vscode.commands.registerCommand('reasoning.kernel.openWebview', () => {
    const panel = vscode.window.createWebviewPanel(
      'rl4CognitiveSnapshot',
      '🧠 RL4 Cognitive Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // Envoyer le HTML initial
    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    // Gérer les messages de la WebView
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.type === 'requestSnapshot') {
          try {
            const snapshot = await generateSnapshotJSON(
              path.join(workspaceRoot, '.reasoning_rl4')
            );
            panel.webview.postMessage({ type: 'snapshotData', data: snapshot });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({ type: 'snapshotError', error: errorMsg });
          }
        }
      },
      undefined,
      context.subscriptions
    );
  })
);
```

---

## 🎨 Styles CSS recommandés

```css
/* extension/webview/ui/styles/CognitiveSnapshot.css */

.cognitive-snapshot {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}

.snapshot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.snapshot-meta {
  display: flex;
  gap: 15px;
  align-items: center;
}

.cycle-badge {
  padding: 5px 12px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.refresh-btn {
  padding: 6px 12px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.refresh-btn:hover {
  opacity: 0.9;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.snapshot-section {
  padding: 20px;
  background: var(--vscode-sideBar-background);
  border-radius: 8px;
  border: 1px solid var(--vscode-panel-border);
}

.patterns-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pattern-item {
  padding: 12px;
  margin-bottom: 10px;
  background: var(--vscode-editor-background);
  border-radius: 6px;
  transition: transform 0.2s;
}

.pattern-item:hover {
  transform: translateX(5px);
}

.confidence-bar {
  height: 8px;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.trend-up .confidence-bar {
  background: linear-gradient(90deg, #2196F3, #4CAF50);
}

.trend-down .confidence-bar {
  background: linear-gradient(90deg, #FF9800, #F44336);
}
```

---

## 🚀 Plan de déploiement

### Phase 1 : Proof of Concept (1-2 jours)
- [ ] Créer WebView basique avec Preact
- [ ] Intégrer `useSnapshotData` hook
- [ ] Afficher snapshot brut (JSON)
- [ ] Tester auto-refresh

### Phase 2 : UI Components (2-3 jours)
- [ ] Créer `PatternsList` component
- [ ] Créer `ForecastsList` component
- [ ] Créer `ContextPanel` component
- [ ] Créer `MentalStateIndicator` component
- [ ] Ajouter styles CSS

### Phase 3 : Interactivité (2-3 jours)
- [ ] Clic sur pattern → détails étendus
- [ ] Clic sur fichier → ouvrir dans éditeur
- [ ] Timeline interactive des cycles
- [ ] Graphiques avec Chart.js ou D3.js

### Phase 4 : Production (1-2 jours)
- [ ] Tests d'intégration
- [ ] Optimisation performance
- [ ] Documentation utilisateur
- [ ] Packaging et déploiement

---

## 📊 Métriques de succès

1. **Performance** : WebView se charge en < 500ms
2. **Réactivité** : Refresh en < 100ms
3. **UX** : Interface intuitive, pas besoin de formation
4. **Adoption** : Utilisé quotidiennement par 80%+ des utilisateurs

---

## 🤝 Contribution

Pour implémenter cette intégration :

1. Lire `docs/WHEREAMI_SNAPSHOT_API.md` pour comprendre l'API
2. Forker le repo et créer une branche `feature/whereami-webview`
3. Suivre le plan de déploiement ci-dessus
4. Créer une PR avec screenshots et vidéo de démo

---

**Auteur** : RL4 Kernel Team  
**Version** : 1.0.0 (Blueprint)  
**Dernière mise à jour** : 11 novembre 2025

