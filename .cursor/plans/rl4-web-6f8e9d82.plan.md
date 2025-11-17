<!-- 6f8e9d82-2c7e-4cf7-b8e2-0f89ae1740c8 fea83a1f-6f69-4cb2-ac3d-629059e08452 -->
# RL4 WebView UI - Migration Vite + Design System Violet (Execution Ready)

## Phase 0: Stabilisation Git (Commit avant migration)

### 0.1 Commit État Stable

Sauvegarder l'état actuel avant modifications majeures:

```bash
git add -A
git commit -m "chore: stable state before Vite migration - WebView UI baseline"
git push origin main
```

Vérifier status propre avec `git status`

## Phase 1: Migration Build System (Webpack → Vite)

### 1.1 Suppression Webpack

Dans `extension/webview/ui/`:

- Supprimer fichier `webpack.config.js`
- Dans `package.json`, supprimer devDependencies: webpack, webpack-cli, ts-loader, html-webpack-plugin, css-loader, style-loader

### 1.2 Configuration Vite

Créer `extension/webview/ui/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

### 1.3 Scripts Build

Mettre à jour `extension/webview/ui/package.json` scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "link:dev": "npm run build && rsync -a dist/ ../extension/webview/ui/dist/"
}
```

### 1.4 Installation Dépendances

```bash
cd extension/webview/ui
npm install vite @vitejs/plugin-react tailwindcss postcss autoprefixer zustand framer-motion lucide-react
```

## Phase 2: Design System Violet/Néon

### 2.1 Tailwind Configuration

Initialiser: `npx tailwindcss init -p`

Créer `extension/webview/ui/tailwind.config.ts`:

```typescript
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rl4: {
          dark: '#181625',
          darker: '#0D1117',
          violet: '#8920FE',
          magenta: '#BB2CFF',
          turquoise: '#16F7B5',
          light: '#EEF2FB',
        },
      },
      boxShadow: {
        glow: '0 0 12px #8920FE',
        glowHover: '0 0 18px #16F7B5',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

### 2.2 Design Tokens CSS

Créer `extension/webview/ui/src/styles/design-tokens.css`:

```css
:root {
  --rl4-bg-dark: #181625;
  --rl4-bg-darker: #0D1117;
  --rl4-accent-violet: #8920FE;
  --rl4-accent-magenta: #BB2CFF;
  --rl4-accent-turquoise: #16F7B5;
  --rl4-text-primary: #EEF2FB;
  --rl4-gradient: linear-gradient(90deg, #8920FE 10%, #38FFDB 100%);
}

.rl4-glow {
  box-shadow: 0 0 12px #8920FE;
  transition: box-shadow 0.3s ease;
}
.rl4-glow:hover { box-shadow: 0 0 18px #16F7B5; }

.rl4-btn-primary {
  background: var(--rl4-accent-violet);
  color: var(--rl4-text-primary);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 0 12px #8920FE;
}
.rl4-btn-primary:hover {
  background: var(--rl4-accent-magenta);
  box-shadow: 0 0 16px var(--rl4-accent-turquoise);
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px #8920FE; }
  50% { box-shadow: 0 0 25px #16F7B5; }
}
.rl4-pulse { animation: pulse-glow 2s infinite; }
```

### 2.3 Global Styles

Mettre à jour `extension/webview/ui/src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import './design-tokens.css';

body {
  background: radial-gradient(circle at 30% 30%, #1F1A2C 0%, #0D1117 70%);
  font-family: Inter, sans-serif;
  color: var(--rl4-text-primary);
}
```

## Phase 3: State Management (Zustand)

### 3.1 Store Principal

Créer `extension/webview/ui/src/api/useRL4Store.ts`:

```typescript
import { create } from 'zustand';

export const useRL4Store = create((set) => ({
  snapshot: null,
  updateSnapshot: (snapshot) => set({ snapshot }),
  getFocusedFile: (state) => state.snapshot?.focusedFile,
  getPatterns: (state) => state.snapshot?.patterns || [],
  getMood: (state) => state.snapshot?.mood || 'Unknown',
}));
```

### 3.2 Hook Synchronisation

Créer `extension/webview/ui/src/api/rl4Hooks.ts`:

```typescript
import { useEffect } from 'react';
import { useRL4Store } from './useRL4Store';

export function useStoreSync() {
  const updateSnapshot = useRL4Store((s) => s.updateSnapshot);
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'updateStore') {
        updateSnapshot(event.data.payload);
        console.log('[RL4 WebView] Snapshot received:', event.data.payload?.cycleId);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [updateSnapshot]);
}
```

## Phase 4: Nouveaux Composants Cognitifs

### 4.1 WhereAmI Component

Créer `extension/webview/ui/src/components/WhereAmI.tsx`:

```typescript
import { useRL4Store } from '@/api/useRL4Store';
import { useState } from 'react';

export function WhereAmI() {
  const snapshot = useRL4Store((s) => s.snapshot);
  const [copied, setCopied] = useState(false);
  
  if (!snapshot) return <div>Chargement du contexte...</div>;
  
  const prompt = `# 🧠 RL4 — Where Am I?
Current file: ${snapshot.focusedFile || 'N/A'}
Recently viewed: ${snapshot.recentlyViewed?.slice(0, 3).join(', ')}
Patterns: ${snapshot.patterns?.map(p => \`- \${p.id} (\${Math.round(p.confidence * 100)}%)\`).join('\\n') || 'None'}
Mood: ${snapshot.mood || 'Unknown'} (${Math.round((snapshot.confidence || 0) * 100)}% confidence)`;

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-lg bg-rl4-darker text-rl4-light rl4-glow">
      <h2 className="text-2xl font-bold text-rl4-violet mb-4">🧠 Where Am I?</h2>
      <pre className="p-4 rounded-md bg-rl4-dark text-sm overflow-x-auto font-mono">{prompt}</pre>
      <div className="flex gap-2 mt-4">
        <button onClick={copy} className="rl4-btn-primary rl4-pulse">
          {copied ? '✅ Copié !' : '📋 Copier le prompt'}
        </button>
        <button onClick={() => window.open('cursor://new?text=' + encodeURIComponent(prompt))} 
                className="rl4-btn-primary bg-rl4-turquoise">
          🚀 Ouvrir dans Cursor
        </button>
      </div>
    </div>
  );
}
```

### 4.2 Timeline, Replay, Restore (Placeholders)

Créer `extension/webview/ui/src/components/CognitiveTimeline.tsx`:

```typescript
export function CognitiveTimeline() {
  return <div className="p-4 text-gray-400">📊 Timeline coming soon...</div>;
}
```

Créer `extension/webview/ui/src/components/ReplayDay.tsx`:

```typescript
export function ReplayDay() {
  return <div className="p-4 text-gray-400">🎬 Replay simulation coming soon</div>;
}
```

Créer `extension/webview/ui/src/components/RestorePoint.tsx`:

```typescript
export function RestorePoint() {
  return <div className="p-4 text-gray-400">💾 RestorePoint JSON generator</div>;
}
```

## Phase 5: Système de Tabs

### 5.1 Tabs Component

Créer `extension/webview/ui/src/components/ui/Tabs.tsx`:

```typescript
import { useState, Children, cloneElement } from 'react';

export function Tabs({ children, defaultValue }) {
  const [active, setActive] = useState(defaultValue);
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 border-b border-rl4-violet px-4">
        {Children.map(children, (child) => cloneElement(child, { active, setActive }))}
      </div>
      <div className="flex-1 p-4">{children.find(c => c.props.value === active)?.props.children}</div>
    </div>
  );
}

export function Tab({ value, label, active, setActive }) {
  const isActive = active === value;
  return (
    <button onClick={() => setActive(value)} 
            className={\`px-4 py-2 rounded-t-md transition-all \${
              isActive
                ? 'bg-rl4-violet text-white shadow-glow'
                : 'text-rl4-light hover:text-rl4-turquoise'
            }\`}>
      {label}
    </button>
  );
}
```

## Phase 6: Refactor UI Existante

### 6.1 App.tsx Complet

Refactorer `extension/webview/ui/src/App.tsx`:

```typescript
import { useStoreSync } from '@/api/rl4Hooks';
import { useRL4Store } from '@/api/useRL4Store';
import Dashboard from './views/Dashboard';
import GoalBoard from './views/GoalBoard';
import { WhereAmI } from './components/WhereAmI';
import { CognitiveTimeline } from './components/CognitiveTimeline';
import { ReplayDay } from './components/ReplayDay';
import { RestorePoint } from './components/RestorePoint';
import { Tabs, Tab } from './components/ui/Tabs';
import '@/styles/globals.css';

export default function App() {
  useStoreSync();
  const snapshot = useRL4Store((s) => s.snapshot);

  return (
    <div className="min-h-screen bg-rl4-dark text-rl4-light">
      <header className="p-4 border-b border-rl4-violet flex justify-between items-center">
        <h1 className="font-bold text-lg bg-gradient-to-r from-rl4-violet to-rl4-turquoise bg-clip-text text-transparent">
          🧠 RL4 Cognitive Replay
        </h1>
        <div className="flex gap-3 items-center">
          <span className="rl4-pulse text-sm">🔴 LIVE</span>
          {snapshot && (
            <>
              <span className="text-sm">{snapshot.adrs?.total || 0} ADRs</span>
              <span className="text-sm">{snapshot.patterns?.total || 0} Patterns</span>
              <span className="text-sm">{snapshot.goals?.active || 0} Goals</span>
            </>
          )}
        </div>
      </header>
      
      <Tabs defaultValue="dashboard">
        <Tab value="dashboard" label="📊 Dashboard"><Dashboard cognitiveState={snapshot} /></Tab>
        <Tab value="goals" label="🎯 Goals"><GoalBoard goals={snapshot?.goals_list || []} /></Tab>
        <Tab value="whereami" label="🧠 Where Am I?"><WhereAmI /></Tab>
        <Tab value="timeline" label="⏱️ Timeline"><CognitiveTimeline /></Tab>
        <Tab value="replay" label="🎬 Replay"><ReplayDay /></Tab>
        <Tab value="restore" label="💾 Restore"><RestorePoint /></Tab>
      </Tabs>
    </div>
  );
}
```

### 6.2 Dashboard & GoalBoard

Dans `extension/webview/ui/src/views/Dashboard.tsx` et `GoalBoard.tsx`:

- Remplacer classes CSS vanilla par Tailwind avec palette RL4
- Ajouter `className="rl4-glow"` sur éléments interactifs
- Conserver toute la logique métier existante

## Phase 7: Configuration Finale

### 7.1 TypeScript Config

Mettre à jour `extension/webview/ui/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 7.2 Index Entry Point

Vérifier `extension/webview/ui/src/index.tsx` importe bien:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
```

## Phase 8: Tests & Validation

### 8.1 Dev Server Local

```bash
cd extension/webview/ui
npm run dev
```

Vérifier sur http://localhost:5173: tabs, design violet, navigation

### 8.2 Build & Integration VSCode

```bash
npm run build
```

Recharger l'extension VSCode → WebView doit s'ouvrir automatiquement

### 8.3 Validation Visuelle

- Palette violet/turquoise appliquée partout
- Glow effects sur hover
- Typography Inter/JetBrains Mono
- Animation pulse sur badge LIVE
- WhereAmI: bouton "Copy Prompt" fonctionnel
- Console logs: "Snapshot received" à chaque update

### To-dos

- [ ] Migrer build system de Webpack vers Vite (config + scripts)
- [ ] Installer Tailwind, Zustand, Framer Motion, Lucide React
- [ ] Créer design tokens CSS et configuration Tailwind avec palette violet/néon
- [ ] Implémenter useRL4Store et useStoreSync pour synchronisation backend
- [ ] Créer WhereAmI, CognitiveTimeline, ReplayDay, RestorePoint
- [ ] Créer système de Tabs avec Framer Motion pour navigation
- [ ] Refactorer App.tsx avec nouveau layout et intégration Tabs
- [ ] Appliquer design system violet aux vues Dashboard et GoalBoard existantes
- [ ] Tester dev server, build, et synchronisation avec VSCode extension