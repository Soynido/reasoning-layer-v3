# ✅ Synchronisation Backend → WebView React

**Date**: 11 novembre 2025  
**Statut**: ✅ **COMPLET**

---

## 🎯 Objectif

Adapter le backend RL4 Kernel pour envoyer des snapshots JSON structurés (compatibles avec `useRL4Store()`) au lieu de Markdown.

---

## 📝 Modifications effectuées

### 1. ✅ Interface `CognitiveSnapshot` nettoyée

**Fichier**: `extension/kernel/api/WhereAmISnapshot.ts`

**Avant** : Interface enrichie avec des champs supplémentaires (adrs, goals, correlations, biases)

**Après** : Interface minimale compatible avec ton store Zustand

```typescript
export interface CognitiveSnapshot {
  cycleId: number;
  timestamp: string;
  focusedFile?: string;
  recentlyViewed?: string[];
  patterns?: { id: string; confidence: number; trend?: string }[];
  forecasts?: { predicted: string; confidence: number }[];
  mood?: string;
  confidence?: number;
}
```

✅ **Cette interface correspond exactement à ce qu'attend `useRL4Store()`**

---

### 2. ✅ Fonction `generateSnapshotJSON()` simplifiée

**Fichier**: `extension/kernel/api/WhereAmISnapshot.ts`

La fonction charge maintenant uniquement les données essentielles :

- ✅ **cycleId** (depuis `cycles.jsonl`)
- ✅ **timestamp** (généré ou depuis cycle)
- ✅ **focusedFile** (depuis `ide_activity.jsonl`)
- ✅ **recentlyViewed** (depuis `ide_activity.jsonl`, limité à 5)
- ✅ **patterns** (depuis `patterns.json`, derniers 5)
- ✅ **forecasts** (depuis `forecasts.json`, derniers 5)
- ✅ **mood + confidence** (depuis `mental_state.json`, optionnel)

---

### 3. ✅ Backend `extension.ts` adapté

**Fichier**: `extension/extension.ts`

#### Import
```typescript
import { generateSnapshotJSON } from './kernel/api/WhereAmISnapshot';
```

#### Message `updateStore`
```typescript
const snapshot = await generateSnapshotJSON(path.join(workspaceRoot, '.reasoning_rl4'));

webviewPanel.webview.postMessage({ 
    type: 'updateStore', 
    payload: snapshot
});

logWithTime(`📤 JSON snapshot pushed (cycle ${snapshot.cycleId})`);
```

#### Fréquence
- **10 secondes** (comme demandé)

---

### 4. ✅ Frontend `App.tsx` adapté

**Fichier**: `extension/webview/ui/src/App.tsx`

#### Écoute des messages
```typescript
useEffect(() => {
  const messageHandler = (event: MessageEvent) => {
    const message = event.data;
    
    switch (message.type) {
      case 'updateStore':
        // Snapshot pushed from kernel every 10 seconds
        setCognitiveState(message.payload);
        console.log('[RL4 WebView] Snapshot received:', message.payload.cycleId);
        break;
    }
  };
  
  window.addEventListener('message', messageHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}, [vscode]);
```

✅ **Plus de polling** — Le kernel push automatiquement  
✅ **Type: 'updateStore'** — Format compatible avec ton store  
✅ **Payload: CognitiveSnapshot** — Structure propre

---

## 🔧 Architecture finale

```
┌─────────────────────────────────────────────────────┐
│  RL4 Kernel (extension.ts)                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ setInterval(() => {                           │  │
│  │   const snapshot = await generateSnapshotJSON │  │
│  │   webviewPanel.postMessage({                  │  │
│  │     type: 'updateStore',                      │  │
│  │     payload: snapshot                         │  │
│  │   })                                          │  │
│  │ }, 10_000)                                    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          ↓ JSON (CognitiveSnapshot)
┌─────────────────────────────────────────────────────┐
│  WebView React (App.tsx)                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ window.addEventListener('message')            │  │
│  │ ↓                                             │  │
│  │ case 'updateStore':                           │  │
│  │   setCognitiveState(message.payload)          │  │
│  │ ↓                                             │  │
│  │ useRL4Store() ← snapshot                      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Données envoyées (exemple)

```json
{
  "cycleId": 95,
  "timestamp": "2025-11-11T14:30:00.000Z",
  "focusedFile": "extension/extension.ts",
  "recentlyViewed": [
    "extension/kernel/api/WhereAmISnapshot.ts",
    "extension/extension.ts",
    "docs/README_ARCHITECTURE.md"
  ],
  "patterns": [
    {
      "id": "pattern-001",
      "confidence": 0.85,
      "trend": "increasing"
    },
    {
      "id": "pattern-002",
      "confidence": 0.72,
      "trend": "stable"
    }
  ],
  "forecasts": [],
  "mood": "focused",
  "confidence": 0.89
}
```

---

## 🚀 Comment tester

### 1. Recharger l'extension

```bash
# Dans VSCode
Cmd+Shift+P > "Developer: Reload Window"
```

### 2. Ouvrir le Dashboard RL4

- Cliquer sur "🧠 RL4 Dashboard" dans la barre d'état
- OU : `Cmd+Shift+P` > "RL4: Toggle Webview"

### 3. Ouvrir la console du WebView

```bash
# Dans VSCode
Cmd+Shift+P > "Developer: Toggle Developer Tools"
```

### 4. Vérifier les logs

Dans la console WebView, tu devrais voir toutes les 10 secondes :

```
[RL4 WebView] Snapshot received: 95
```

Dans l'Output Channel "RL4 Kernel", tu devrais voir :

```
[14:30:15.123] 📤 JSON snapshot pushed (cycle 95)
```

---

## 🔗 Intégration avec ton store Zustand

Maintenant que le backend envoie `type: 'updateStore'` avec un `payload` propre, tu peux le connecter directement à ton `useRL4Store()` :

```typescript
// Dans ton store Zustand (RL4-WV/src/api/useRL4Store.ts)
window.addEventListener('message', (event) => {
  const message = event.data;
  
  if (message.type === 'updateStore') {
    // Message vient du kernel VSCode
    useRL4Store.getState().updateSnapshot(message.payload);
  }
});
```

---

## ✅ Checklist de validation

- [x] `CognitiveSnapshot` interface minimaliste ✅
- [x] `generateSnapshotJSON()` charge les données essentielles ✅
- [x] Backend envoie `type: 'updateStore'` + `payload` ✅
- [x] Frontend écoute `updateStore` et met à jour le state ✅
- [x] Fréquence : 10 secondes ✅
- [x] Logs clairs dans Output Channel ✅
- [x] Compilation sans erreurs ✅

---

## 📦 Fichiers modifiés

1. ✅ `extension/kernel/api/WhereAmISnapshot.ts` — Interface + fonction nettoyées
2. ✅ `extension/extension.ts` — Message `updateStore` avec `payload`
3. ✅ `extension/webview/ui/src/App.tsx` — Écoute `updateStore`

---

## 🎨 Prochaine étape

Maintenant que le contrat backend/frontend est propre, tu peux :

1. **Importer ton vrai App.tsx** depuis `/RL4 - WV/src/`
2. **Connecter `useRL4Store()`** pour recevoir les snapshots
3. **Afficher les composants React** (Timeline, Dashboard, etc.)
4. **Ajouter Tailwind CSS** pour le style

---

**Version**: 2.0.9  
**Auteur**: RL4 Cognitive System

