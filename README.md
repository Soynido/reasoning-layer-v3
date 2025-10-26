# 🧠 Reasoning Layer V3

**Technical Decision Intelligence System** - Extension VS Code/Cursor

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Soynido/reasoning-layer-v3)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)](https://code.visualstudio.com/)

## 🎯 Vue d'Ensemble

Reasoning Layer V3 est une extension VS Code/Cursor qui capture automatiquement votre processus de développement et structure vos décisions techniques avec des ADRs (Architectural Decision Records).

**Philosophie** : "Simplicité, stabilité, sérialisation explicite, évolutivité par strates"

## 🏗️ Architecture Local-First JSON Persistence

**Décision technique fondamentale** : Pas de PostgreSQL, pas de base externe. Chaque projet gère son propre `.reasoning/` versionné.

**Pattern obligatoire** : Toute donnée doit pouvoir être :
1. ✅ Sérialisée avec `JSON.stringify()`
2. ✅ Lue directement depuis `.reasoning/` sans serveur
3. ✅ Exportée en un seul fichier `.reasonpack` portable

### Avantages

- ✅ **Zéro configuration** : fonctionne immédiatement
- ✅ **Versionnable avec Git** : `.reasoning/` dans le repo
- ✅ **Portable** : copier `.reasoning/` = copier toute l'intelligence
- ✅ **Pas de serveur** : pas de dépendance externe
- ✅ **Offline-first** : fonctionne sans connexion
- ✅ **Multi-projet** : chaque workspace est isolé

## 🚀 Installation

### Prérequis

- VS Code ou Cursor 1.85+
- Node.js 20.19.5+ (LTS)
- Git (pour capture des commits)

### Installation depuis le code source

```bash
# Cloner le repository
git clone https://github.com/Soynido/reasoning-layer-v3.git
cd reasoning-layer-v3

# Installer les dépendances
npm install

# Compiler l'extension
npm run build

# Installer l'extension dans VS Code
code --install-extension reasoning-layer-v3-1.0.0.vsix
```

### Installation depuis GitHub (bientôt disponible)

```bash
# Via VS Code Marketplace (bientôt)
# Ou via GitHub Releases (bientôt)
```

## 📁 Structure du Projet

```
Reasoning Layer V3/
├── extension/                    # Code source de l'extension
│   ├── core/                    # Couche Core (J+0 → J+10)
│   │   ├── PersistenceManager.ts # Gestion persistance JSON
│   │   ├── CaptureEngine.ts      # Capture événements + Git
│   │   └── types/
│   │       └── index.ts          # Types TypeScript
│   ├── commands/                # Commandes VS Code (Strate 2)
│   ├── webview/                 # Interface utilisateur (Strate 3)
│   └── extension.ts             # Point d'entrée principal
├── .reasoning/                  # Données du projet (créé automatiquement)
│   ├── manifest.json           # Métadonnées du projet
│   ├── traces/                 # Événements capturés par date
│   │   └── YYYY-MM-DD.json    # Fichiers de traces journaliers
│   └── adrs/                   # ADRs (Strate 2)
├── package.json                # Configuration extension
├── tsconfig.json               # Configuration TypeScript
├── webpack.config.js           # Configuration build
├── PLAN.md                     # Plan de construction détaillé
├── TASKS.md                    # Suivi des tâches
└── REASONING_LAYER_V2_V3_TRANSFER.md # Audit V2 → V3
```

## 🎮 Utilisation

### Commandes Disponibles

| Commande | Description | Statut |
|----------|-------------|--------|
| `🧠 Initialize Reasoning Layer` | Initialise l'extension | ✅ Strate 1 |
| `📋 Show Output Channel` | Affiche les logs | ✅ Strate 1 |
| `📸 Capture Now` | Capture manuelle | ✅ Strate 1 |
| `📝 Create ADR` | Créer un ADR | ⏳ Strate 2 |
| `📋 List ADRs` | Lister les ADRs | ⏳ Strate 2 |
| `🔍 Validate Project` | Valider le projet | ⏳ Strate 2 |

### Workflow Typique

1. **Ouverture d'un workspace** → Extension s'active automatiquement
2. **Développement normal** → Capture automatique des fichiers et commits Git
3. **Création d'ADR** → `Ctrl+Shift+P` → "Create ADR" (Strate 2)
4. **Consultation** → `Ctrl+Shift+P` → "Show Output Channel" pour voir les logs

## 📊 Fonctionnalités par Strate

### 🟢 Strate 1: Core Layer (J+0 → J+10) - ✅ EN COURS

**Objectif** : Extension installable avec capture événements et persistance fonctionnelle.

**Fonctionnalités** :
- ✅ Capture automatique des changements de fichiers (debounce 2s)
- ✅ Capture automatique des commits Git (polling 5s)
- ✅ Persistance dans `.reasoning/traces/YYYY-MM-DD.json`
- ✅ OutputChannel avec logs emoji
- ✅ Commandes de base VS Code
- ✅ Sérialisation explicite (0 erreur "An object could not be cloned")

### 🟡 Strate 2: Cognitive Layer (J+10 → J+20) - ⏳ EN ATTENTE

**Objectif** : Structuration des décisions techniques avec ADRs et validation Zod.

**Fonctionnalités prévues** :
- ⏳ Types RBOM & Validation Zod
- ⏳ RBOMEngine (CRUD simple)
- ⏳ Commandes VS Code RBOM
- ⏳ Lien evidenceIds entre ADRs et événements

### 🔵 Strate 3: Perceptual Layer (J+20 → J+30) - ⏳ EN ATTENTE

**Objectif** : Interface utilisateur simple, migration V2, et analytics basiques.

**Fonctionnalités prévues** :
- ⏳ Webview HTML/CSS/JS vanilla
- ⏳ Migration V2 → V3 (read-only)
- ⏳ Tests & Documentation
- ⏳ Export `.reasonpack`

## 🔧 Développement

### Scripts Disponibles

```bash
# Compilation TypeScript
npm run compile

# Build webpack
npm run build

# Watch mode développement
npm run dev

# Tests unitaires
npm run test

# Package extension
npm run package
```

### Configuration

L'extension utilise une architecture en 3 strates progressives :

1. **Core Layer** : Capture + Persistance (J+0 → J+10)
2. **Cognitive Layer** : RBOM Engine + ADRs (J+10 → J+20)
3. **Perceptual Layer** : Webview + Migration (J+20 → J+30)

### Tests

```bash
# Tests unitaires
npm test

# Tests manuels
npm run build
code --install-extension reasoning-layer-v3-1.0.0.vsix
```

## 📈 Métriques de Succès

### Strate 1 (J+10)
- ✅ Extension activable en < 2s
- ✅ Activation Phase 1 < 500ms
- ⏳ Capture Git fonctionnelle
- ⏳ Persistance `.reasoning/traces/`

### Strate 2 (J+20)
- ⏳ Création ADR en < 30s
- ⏳ Validation Zod 100% coverage
- ⏳ CRUD ADRs complet

### Strate 3 (J+30)
- ⏳ Webview load < 1s
- ⏳ Migration V2 sans perte
- ⏳ 0 erreur sérialisation
- ⏳ Package size < 5MB

## 🧠 Leçons de la V2

### ✅ Patterns Gardés de V2
- RepoPersistenceManager : OutputChannel, logging emoji, auto-save 30s
- EventAggregator : Debouncing par fichier avec Map<string, Timeout>
- Filtrage robuste : Patterns regex pour exclure `.git/`, `node_modules/`
- Sérialisation explicite : Fonction deepSanitize() pour Map, Set, Date, URI

### ❌ Erreurs Évitées de V2
- Passage d'objets VS Code au webview (cause "An object could not be cloned")
- ReasoningManager trop complexe (561 lignes, trop de responsabilités)
- Activation simultanée (créer 8 composants en même temps)
- AnalyticsEngine/MetricsCollector (Map, Timeout non-sérialisables)
- React Router (complexité inutile - commencer HTML/CSS/JS vanilla)

## 🤝 Contribution

### Workflow de Développement

1. **Fork** le repository
2. **Créer une branche** : `feature/nom-fonctionnalite`
3. **Développer** en suivant les strates définies
4. **Tester** avec `npm test`
5. **Commit** : `git commit -m "feat: description"`
6. **Push** : `git push origin feature/nom-fonctionnalite`
7. **Pull Request** vers `main`

### Standards de Code

- **TypeScript strict mode** obligatoire
- **Sérialisation explicite** partout
- **Tests unitaires** pour chaque composant
- **Documentation** des interfaces publiques
- **Logging emoji** pour la lisibilité

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 🔗 Liens Utiles

- [Plan de Construction](PLAN.md) - Architecture détaillée
- [Suivi des Tâches](TASKS.md) - État d'avancement
- [Audit V2 → V3](REASONING_LAYER_V2_V3_TRANSFER.md) - Leçons apprises
- [GitHub Repository](https://github.com/Soynido/reasoning-layer-v3)

---

**Développé avec ❤️ pour améliorer la qualité des décisions techniques**
