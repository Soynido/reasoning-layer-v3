# 🧠 Reasoning Layer V3 - Guide de Distribution

**Version**: 1.0.86  
**Date**: 2025-10-29  
**Auteur**: Valentin Galudec

---

## 📦 Installation Rapide

### Pour ton ami qui utilise Cursor

**1. Télécharge le fichier `.vsix`**
```
reasoning-layer-v3-1.0.86.vsix
```

**2. Installe l'extension**

**Méthode A - Ligne de commande (recommandé)** :
```bash
cursor --install-extension reasoning-layer-v3-1.0.86.vsix
```

**Méthode B - Interface graphique** :
1. Ouvre Cursor
2. `Cmd+Shift+P` (Mac) ou `Ctrl+Shift+P` (Windows/Linux)
3. Tape : `Extensions: Install from VSIX...`
4. Sélectionne le fichier `.vsix`
5. Recharge la fenêtre : `Cmd+Shift+P` → `Developer: Reload Window`

**3. Vérifie l'installation**
```bash
# Ouvre la palette de commandes
Cmd+Shift+P

# Tape "Reasoning"
# Tu devrais voir toutes les commandes RL3 disponibles
```

---

## 🚀 Fonctionnalités Principales

### 1. 🤖 AutoPackager (Nouveau !)

Le RL3 peut maintenant se compiler, packager et installer automatiquement :

```bash
# Dans Cursor :
Cmd+Shift+P → "Reasoning: Auto Package"
```

**3 commandes disponibles** :
- `🤖 Auto Package` : Compile + Package + Install
- `🔢 Auto Package with Version Bump` : Incrémente la version automatiquement
- `⚡ Quick Rebuild` : Compile + Package seulement (sans installation)

### 2. 🌐 LLM Bridge (Optionnel)

Compréhension sémantique du langage naturel avec LLM :

```bash
# Configuration optionnelle (0 coût sans ça)
export ANTHROPIC_API_KEY="sk-ant-..."
# ou
export OPENAI_API_KEY="sk-proj-..."
```

**Sans clé API** : Pattern matching offline (gratuit, rapide)  
**Avec clé API** : Compréhension sémantique profonde (~$5-10/mois)

### 3. 🧠 Reasoning Shell (REPL)

Terminal cognitif interactif :

```bash
node .reasoning/repl.js

# Exemples :
> Identifie les prochaines étapes
> Quel repo est connecté au projet ?
> Analyse l'état global
```

### 4. 🎧 Input Layer

Observation autonome de :
- Commits Git
- Modifications de fichiers
- Discussions GitHub
- Messages shell

### 5. 📊 Cognitive System

- **ADRs** : Décisions architecturales automatiques
- **Patterns** : Détection de motifs récurrents
- **Correlations** : Liens entre événements
- **Forecasts** : Prédictions de décisions futures

---

## 🛠️ Commandes Disponibles

### Observe
- `🔎 Observe Workspace` : Scan complet du workspace
- `👁️ Show Events` : Affiche les événements capturés
- `🌿 Show Git Status` : Statut Git enrichi

### Understand
- `🧠 Analyze Events` : Analyse cognitive des événements
- `🔍 Detect Patterns` : Détection de patterns
- `🔗 Calculate Correlations` : Calcul des corrélations
- `🔮 Generate Forecast` : Prédictions

### Execute
- `📋 Synthesize ADR` : Génération d'ADR
- `🎯 Execute Goals` : Exécution d'objectifs

### Agent (GitHub)
- `👁️ Observe Topics` : Observation de topics GitHub
- `📝 Preview Comment` : Aperçu de commentaire
- `💾 Show Memory` : Historique d'interactions

### System
- `🤖 Auto Package` : **Auto-compilation + packaging**
- `⚡ Quick Rebuild` : Rebuild rapide
- `🔢 Auto Package with Version Bump` : Avec incrémentation de version

---

## 📁 Structure du Projet

```
Reasoning Layer V3/
├── extension/                  # Code source TypeScript
│   ├── core/
│   │   ├── auto/              # 🤖 AutoPackager
│   │   ├── inputs/            # 🎧 Input Layer + LLM Bridge
│   │   ├── agents/            # 🌐 GitHub Agent
│   │   └── rbom/              # 📋 RBOM Engine
│   └── commands/              # Commandes VS Code
├── .reasoning/                # Données cognitives
│   ├── traces/               # Événements quotidiens
│   ├── adrs/                 # Décisions architecturales
│   ├── reports/              # Rapports générés
│   ├── cli.js                # CLI autonome
│   └── repl.js               # 🧠 Shell interactif
└── out/                      # Code compilé JavaScript
```

---

## 🔧 Configuration Avancée

### Variables d'environnement

```bash
# LLM Bridge (optionnel)
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-proj-..."

# Langue préférée (auto-détecté sinon)
export RL3_LANG="fr"
```

### Fichiers de configuration

**`.reasoning/preferences.json`** :
```json
{
  "preferredLanguage": "fr",
  "detectedAt": "2025-10-29T16:00:00.000Z",
  "detectionMethod": "manual_correction"
}
```

**`.reasoning/manifest.json`** :
- Métadonnées du projet
- Compteurs d'événements
- Confiance cognitive

---

## 🧪 Tests

### Test 1: Commandes de base

```bash
# Ouvre Cursor
Cmd+Shift+P → "Reasoning: Observe Workspace"
```

Vérifie que la commande s'exécute sans erreur dans l'Output Panel "Reasoning Layer V3".

### Test 2: REPL

```bash
cd "Reasoning Layer V3"
node .reasoning/repl.js

> /help
> /status
> Identifie les prochaines étapes
```

### Test 3: AutoPackager

```bash
# Dans Cursor
Cmd+Shift+P → "Reasoning: Auto Package"
```

Vérifie que :
1. La compilation réussit
2. Le .vsix est créé
3. L'extension est installée
4. Pas d'erreurs dans l'Output Panel

---

## 🐛 Résolution de Problèmes

### Problème: "Command 'reasoning.autopackage' not found"

**Solution** :
1. Vérifie que l'extension est activée (icône RL3 dans la barre latérale)
2. Recharge la fenêtre : `Cmd+Shift+P` → `Developer: Reload Window`

### Problème: "vsce: command not found"

**Solution** :
```bash
npm install -g @vscode/vsce
```

### Problème: "TypeError: path argument must be string"

**Solution** : Extension déjà corrigée (v1.0.86+). Si le problème persiste :
1. Supprime le dossier `out/`
2. Recompile : `npm run compile`
3. Repackage : `vsce package --allow-package-all-secrets`

---

## 📊 Statistiques

- **Lignes de code** : ~50,000
- **Modules** : 60+
- **Commandes** : 40+
- **Événements capturés** : Illimité
- **ADRs générés** : Automatique
- **Patterns détectés** : En temps réel

---

## 🎯 Cas d'Usage

### Pour Développeur Solo

1. Observe automatiquement ton workflow
2. Génère des ADRs de tes décisions
3. Détecte des patterns dans ton code
4. Prédit tes prochaines décisions

### Pour Équipe

1. Partage le .vsix avec ton équipe
2. Observe les discussions GitHub
3. Commente automatiquement les PRs
4. Build un graphe cognitif collectif

### Pour Open Source

1. Observe des repos GitHub publics
2. Détecte des signaux cognitifs
3. Génère des insights architecturaux
4. Participe à des discussions

---

## 📝 Licence

**Propriétaire** : Valentin Galudec  
**Copyright** : © 2025 Valentin Galudec. Tous droits réservés.

Pour toute question de licence ou distribution commerciale, contactez Valentin Galudec.

---

## 🚀 Prochaines Étapes

Après installation :

1. **Familiarise-toi avec les commandes**
   ```
   Cmd+Shift+P → "Reasoning"
   ```

2. **Lance le REPL**
   ```
   node .reasoning/repl.js
   ```

3. **Observe ton workspace**
   ```
   Cmd+Shift+P → "Reasoning: Observe Workspace"
   ```

4. **Génère ton premier ADR**
   ```
   Cmd+Shift+P → "Reasoning: Synthesize ADR"
   ```

5. **(Optionnel) Configure un LLM**
   ```
   export ANTHROPIC_API_KEY="..."
   ```

---

**Enjoy the Cognitive Revolution! 🧠🚀**

_Généré par RL3 AutoPackager v1.0.86_

