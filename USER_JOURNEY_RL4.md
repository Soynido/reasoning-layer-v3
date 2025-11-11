# 🎬 User Journey - RL4 Extension

> **Parcours utilisateur complet depuis l'installation jusqu'à l'utilisation avancée**
>
> Date: 2025-11-10  
> Version: 1.0  
> Audience: Développeurs, Product Managers, UX Designers

---

## 📋 Table des matières

1. [Pré-requis](#pré-requis)
2. [Installation](#installation)
3. [Premier Démarrage (Workspace Vierge)](#premier-démarrage-workspace-vierge)
4. [Sessions Suivantes](#sessions-suivantes)
5. [Interaction Quotidienne](#interaction-quotidienne)
6. [Utilisation Avancée](#utilisation-avancée)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## 🎯 Pré-requis

### Environnement Minimum
- ✅ **VS Code**: v1.80+
- ✅ **Node.js**: v18+
- ✅ **Git**: v2.30+ (optionnel mais recommandé)
- ✅ **Workspace**: Dossier projet ouvert dans VS Code

### Permissions Système
- ✅ **Lecture/Écriture**: Accès au workspace pour créer `.reasoning_rl4/`
- ✅ **Git**: Accès aux commandes `git log`, `git diff` (si dépôt Git)
- ✅ **File System**: Watcher pour détecter modifications en temps réel

---

## 📦 Installation

### Étape 1: Installation de l'extension

**Via VS Code Marketplace:**
```
1. Ouvrir VS Code
2. Panneau Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Rechercher "RL4" ou "Reasoning Layer"
4. Cliquer sur "Install"
5. Recharger VS Code si demandé
```

**Via fichier VSIX (développement local):**
```bash
# Depuis le dossier du projet RL4
code --install-extension reasoning-layer-rl4-2.0.7.vsix
```

**Vérification de l'installation:**
```
1. Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Taper "RL4"
3. Voir la liste des commandes RL4 disponibles
```

### Étape 2: Redémarrage VS Code

⚠️ **Important**: Après installation, redémarrer complètement VS Code (pas juste recharger la fenêtre)

```
File > Quit (macOS)
File > Exit (Windows/Linux)
```

Puis relancer VS Code.

---

## 🌟 Premier Démarrage (Workspace Vierge)

### Timeline: T+0s - Ouverture du Workspace

**Action utilisateur:**
```
1. Ouvrir VS Code
2. File > Open Folder...
3. Sélectionner un dossier projet (vierge ou existant)
```

### Timeline: T+0.5s - Activation de l'extension

**Ce qui se passe (invisible à l'utilisateur):**

```typescript
// extension.ts:33-58
1. Détection du workspace root
2. Création du Output Channel "RL4 Kernel"
3. Affichage automatique du Output Channel
4. Logging initial
```

**Output visible (Output Channel):**
```
[16:30:45.123] === RL4 KERNEL — Minimal Mode ===
[16:30:45.124] Workspace: /Users/user/my-project
[16:30:45.125] ==================================
```

### Timeline: T+0.8s - Chargement de la configuration

**Ce qui se passe:**
```typescript
// extension.ts:56-58
Recherche du fichier: .reasoning_rl4/kernel_config.json
Si absent: Création avec valeurs par défaut
```

**Configuration par défaut:**
```json
{
  "USE_TIMER_REGISTRY": true,
  "USE_HEALTH_MONITOR": true,
  "cognitive_cycle_interval_ms": 10000
}
```

**Output visible:**
```
[16:30:45.200] ⚙️ Config: {
  "USE_TIMER_REGISTRY": true,
  "USE_HEALTH_MONITOR": true,
  "cognitive_cycle_interval_ms": 10000
}
```

### Timeline: T+1.0s - Initialisation des composants

**Ce qui se passe:**
```typescript
// extension.ts:60-93
1. Création TimerRegistry
2. Création StateRegistry
3. Création HealthMonitor
4. Chargement des artefacts kernel (KernelBootstrap)
5. Création CognitiveScheduler avec métriques forecast
6. Création ExecPool
7. Création KernelAPI
```

**Output visible:**
```
[16:30:45.300] 🔧 Initializing RL4 Kernel...
[16:30:45.350] ✅ RL4 Kernel components created
```

### Timeline: T+1.2s - Bootstrap des artefacts

**Ce qui se passe:**
```typescript
// KernelBootstrap.ts:69-103
Recherche de: .reasoning_rl4/kernel/
  - state.json.gz (état kernel précédent)
  - universals.json.gz (patterns universels)
  - forecast_metrics.json.gz (baseline forecast)
  - universals_analysis.json.gz (analyse patterns)
```

**Cas 1: Workspace vierge (première fois)**
```
[16:30:45.400] ⚠️ No kernel artifacts found, starting with default baseline (0.73)
```

**Cas 2: Workspace existant (retour)**
```
[16:30:45.400] ✅ Bootstrap complete: 42 universals loaded
[16:30:45.401] 📦 Kernel state restored from artifacts
[16:30:45.402] 📊 Forecast precision baseline: 0.847 (Phase E1 active)
```

### Timeline: T+1.5s - Démarrage du Health Monitor

**Ce qui se passe:**
```typescript
// extension.ts:114-117
Si USE_HEALTH_MONITOR = true:
  - Démarrage du monitoring (CPU, Mémoire, Timers)
  - Log périodique dans: .reasoning_rl4/diagnostics/health.jsonl
```

**Output visible:**
```
[16:30:45.500] ❤️ Health Monitor started
```

### Timeline: T+2.0s - Annonce démarrage du Scheduler

**Ce qui se passe:**
```typescript
// extension.ts:119-121
Prépare le démarrage du CognitiveScheduler
Délai volontaire de 3s pour stabilité Extension Host
```

**Output visible:**
```
[16:30:45.600] 🧠 Starting CognitiveScheduler (delayed start in 3s)...
```

### Timeline: T+5.0s - Démarrage effectif du Scheduler

**Ce qui se passe:**
```typescript
// extension.ts:124-129
1. Démarrage du CognitiveScheduler
2. Activation du watchdog
3. Premier cycle cognitif schedulé (T+10s)
```

**Output visible:**
```
[16:30:48.600] ⏳ Scheduler: Starting delayed initialization...
[16:30:48.650] ✅ Scheduler started successfully
[16:30:48.651] 🛡️ Watchdog active (10000ms cycles)
```

### Timeline: T+5.1s - Démarrage de l'Input Layer

**Ce qui se passe:**
```typescript
// extension.ts:131-149
1. GitCommitListener (si dépôt Git détecté)
2. FileChangeWatcher (toujours actif)
```

**Output visible (cas Git repository):**
```
[16:30:48.700] 📥 Starting Input Layer...
[16:30:48.750] ✅ GitCommitListener active
[16:30:48.800] ✅ FileChangeWatcher active
```

**Output visible (cas non-Git):**
```
[16:30:48.700] 📥 Starting Input Layer...
[16:30:48.750] ⚠️ Not a Git repository, GitCommitListener disabled
[16:30:48.800] ✅ FileChangeWatcher active
```

### Timeline: T+5.2s - Création de la structure `.reasoning_rl4/`

**Ce qui se passe (automatique):**
```
Création de la hiérarchie de dossiers:

.reasoning_rl4/
├── kernel/               # Artefacts kernel compressés
├── ledger/               # Logs immuables (cycles, rbom, adr)
├── traces/               # Événements capturés (git, files)
├── adrs/                 # ADRs auto-générées
│   └── auto/
├── diagnostics/          # Health monitoring, git pool
└── patterns.json         # Patterns actifs
└── correlations.json     # Corrélations détectées
└── forecasts.json        # Forecasts générés
└── kernel_config.json    # Configuration
```

**Pas d'output visible** (création silencieuse)

### Timeline: T+15.0s - Premier Cycle Cognitif

**Ce qui se passe:**
```typescript
// CognitiveScheduler.ts (cycle automatique toutes les 10s)

1. Lecture des traces capturées
2. Extraction des patterns (PatternLearningEngine)
3. Calcul des corrélations (CorrelationEngine)
4. Génération des forecasts (ForecastEngine)
5. Proposition ADRs si seuils atteints (ADRGeneratorV2)
6. Écriture dans cycles.jsonl
7. Calcul Merkle Root pour intégrité
```

**Output visible:**
```
[16:30:58.650] 🔄 Cycle #1 started
[16:30:58.750] 📊 Patterns detected: 0
[16:30:58.800] 🔗 Correlations found: 0
[16:30:58.850] 🔮 Forecasts generated: 0
[16:30:58.900] 📋 ADRs proposed: 0
[16:30:58.950] ✅ Cycle #1 complete (merkle: 3a2f5b...)
```

### Timeline: T+16s - État Stable

**Résultat final:**
- ✅ Extension activée et fonctionnelle
- ✅ Output Channel visible avec logs
- ✅ Structure `.reasoning_rl4/` créée
- ✅ Cycles cognitifs toutes les 10 secondes
- ✅ Capture d'événements active (Git + Files)
- ✅ Système prêt à observer le développeur

---

## 🔄 Sessions Suivantes

### Timeline: T+0s - Ouverture du Workspace (session N)

**Action utilisateur:**
```
1. Ouvrir VS Code
2. File > Open Recent > my-project
```

### Timeline: T+0.5s - Activation avec mémoire

**Ce qui se passe:**
```typescript
// extension.ts:33-111
Même séquence qu'au premier démarrage MAIS:
- .reasoning_rl4/ existe déjà
- kernel_config.json existe
- Artefacts kernel chargés depuis .reasoning_rl4/kernel/
```

**Output visible (différence clé):**
```
[10:15:30.123] === RL4 KERNEL — Minimal Mode ===
[10:15:30.124] Workspace: /Users/user/my-project
[10:15:30.200] ⚙️ Config: { ... }
[10:15:30.300] 🔧 Initializing RL4 Kernel...
[10:15:30.350] ✅ RL4 Kernel components created

🎯 DIFFÉRENCE ICI:
[10:15:30.400] ✅ Bootstrap complete: 42 universals loaded
[10:15:30.401] 📦 Kernel state restored from artifacts
[10:15:30.402] 📊 Forecast precision baseline: 0.847 (Phase E1 active)
```

### Timeline: T+1.0s - Continuation du ledger

**Ce qui se passe:**
```typescript
// AppendOnlyWriter.ts
Lecture des fichiers existants:
- cycles.jsonl (reprise depuis cycle N)
- git_commits.jsonl (historique conservé)
- file_changes.jsonl (historique conservé)
```

**Dernier cycle chargé:**
```json
{
  "cycleId": 442,
  "timestamp": "2025-11-09T18:30:45.123Z",
  "phases": {
    "patterns": { "hash": "...", "count": 4 },
    "correlations": { "hash": "...", "count": 1 },
    "forecasts": { "hash": "...", "count": 4 }
  }
}
```

### Timeline: T+5.0s - Reprise des cycles

**Output visible:**
```
[10:15:33.650] ✅ Scheduler started successfully
[10:15:33.651] 🛡️ Watchdog active (10000ms cycles)
[10:15:33.700] 📥 Starting Input Layer...
[10:15:33.750] ✅ GitCommitListener active
[10:15:33.800] ✅ FileChangeWatcher active
```

### Timeline: T+15.0s - Nouveau cycle (cycle #443)

**Output visible:**
```
[10:15:43.650] 🔄 Cycle #443 started
[10:15:43.750] 📊 Patterns detected: 4 (stable)
[10:15:43.800] 🔗 Correlations found: 1
[10:15:43.850] 🔮 Forecasts generated: 4
[10:15:43.900] 📋 ADRs proposed: 0
[10:15:43.950] ✅ Cycle #443 complete (merkle: 7f1e2d...)
```

**Continuité assurée:**
- ✅ Numéro de cycle incrémenté automatiquement
- ✅ Merkle chain maintenue (prevMerkleRoot → merkleRoot)
- ✅ Patterns persistés depuis sessions précédentes
- ✅ Historique Git complet accessible

---

## 💼 Interaction Quotidienne

### Scénario 1: Modification de fichier

**Action utilisateur:**
```
1. Ouvrir src/app.ts
2. Ajouter 10 lignes de code
3. Sauvegarder (Cmd+S / Ctrl+S)
```

**Ce qui se passe (instant T):**
```typescript
// FileChangeWatcher.ts
1. Détection du changement par VS Code Workspace FileSystem Watcher
2. Analyse du pattern (refactor, fix, feature, config, docs)
3. Calcul cognitive_relevance basé sur:
   - Extension du fichier (.ts = 0.9)
   - Type de changement (code = élevé, docs = moyen)
   - Taille de modification
4. Écriture dans traces/file_changes.jsonl
```

**Entrée créée (file_changes.jsonl):**
```json
{
  "id": "a1b2c3d4-...",
  "type": "file_change",
  "timestamp": "2025-11-10T10:30:45.123Z",
  "source": "FileChangeWatcher",
  "metadata": {
    "burst": false,
    "changes": [
      {
        "type": "change",
        "path": "src/app.ts",
        "extension": ".ts",
        "size": 5432
      }
    ],
    "pattern": {
      "type": "feature",
      "confidence": 0.75,
      "indicators": ["single_file"]
    },
    "cognitive_relevance": 0.9
  }
}
```

**Impact sur le prochain cycle (T+10s max):**
```
[10:30:53.650] 🔄 Cycle #444 started
[10:30:53.750] 📊 Patterns detected: 4 → 5 (nouveau pattern feature-development)
[10:30:53.800] 🔗 Correlations found: 1 → 2
[10:30:53.850] 🔮 Forecasts generated: 4 → 5
[10:30:53.950] ✅ Cycle #444 complete
```

### Scénario 2: Commit Git

**Action utilisateur:**
```bash
git add .
git commit -m "feat(app): Add user authentication"
```

**Ce qui se passe (instant T+0.5s après commit):**
```typescript
// GitCommitListener.ts
1. Détection du nouveau commit via polling (toutes les 5s)
2. Extraction des métadonnées:
   - Hash, message, author, timestamp
   - Files changed, insertions, deletions
3. Détection intent (feat/fix/docs/test/refactor)
4. Calcul cognitive_relevance
5. Écriture dans traces/git_commits.jsonl
```

**Entrée créée (git_commits.jsonl):**
```json
{
  "id": "e5f6g7h8-...",
  "type": "git_commit",
  "timestamp": "2025-11-10T10:35:22+01:00",
  "source": "git:a1b2c3d4...",
  "metadata": {
    "commit": {
      "hash": "a1b2c3d4...",
      "message": "feat(app): Add user authentication",
      "author": "John Doe",
      "timestamp": "2025-11-10T10:35:22+01:00",
      "files_changed": 5,
      "insertions": 142,
      "deletions": 8
    },
    "intent": {
      "type": "feature",
      "keywords": ["authentication", "user"]
    },
    "cognitive_relevance": 0.85
  }
}
```

**Impact sur le prochain cycle:**
```
[10:35:33.650] 🔄 Cycle #445 started
[10:35:33.750] 📊 Patterns detected: 5 → 6 (nouveau pattern auth-implementation)
[10:35:33.800] 🔗 Correlations found: 2 → 3 (commit ↔ file changes)
[10:35:33.850] 🔮 Forecasts generated: 5 → 6 (forecast: "Document authentication flow")
[10:35:33.900] 📋 ADRs proposed: 1 (seuil atteint pour authentication)
[10:35:33.950] ✅ Cycle #445 complete
```

### Scénario 3: Modification rapide en burst

**Action utilisateur:**
```
1. Ouvrir app.ts
2. Modifier ligne 10 → Sauvegarder
3. Modifier ligne 15 → Sauvegarder
4. Modifier ligne 20 → Sauvegarder
5. Total: 3 modifications en 30 secondes
```

**Ce qui se passe:**
```typescript
// FileChangeWatcher.ts (debouncing intelligent)
1. Détection burst (multiple modifs rapides)
2. Agrégation des événements
3. Pattern "refactor" détecté (multiple modifs = itération)
4. Cognitive_relevance augmenté (0.9 → 0.95)
```

**Entrée créée:**
```json
{
  "id": "i9j0k1l2-...",
  "type": "file_change",
  "timestamp": "2025-11-10T10:40:15.456Z",
  "source": "FileChangeWatcher",
  "metadata": {
    "burst": true,
    "changes": [
      {
        "type": "change",
        "path": "src/app.ts",
        "extension": ".ts",
        "size": 5567
      }
    ],
    "pattern": {
      "type": "refactor",
      "confidence": 0.85,
      "indicators": ["single_file", "burst"]
    },
    "cognitive_relevance": 0.95
  }
}
```

**⚠️ Alerte Anti-Pattern (si répété sur 7 jours):**
```
Si plus de 5 bursts sur le même fichier en 7 jours:
→ Génération d'une alerte dans diagnostics/
→ Pattern "refactor_loop" détecté
→ Forecast généré: "Review architecture of app.ts"
```

### Scénario 4: Consultation des données

**Action utilisateur:**
```
Command Palette > RL4: Show Cycle History
```

**Ce qui se passe:**
```typescript
// Commande VS Code (future implémentation webview)
1. Lecture de cycles.jsonl
2. Affichage des derniers cycles
3. Drill-down sur patterns/correlations/forecasts
```

**Output visible (actuellement via fichiers):**
```bash
# Utilisateur peut directement consulter:
.reasoning_rl4/patterns.json
.reasoning_rl4/correlations.json
.reasoning_rl4/forecasts.json
.reasoning_rl4/ledger/cycles.jsonl
```

---

## 🚀 Utilisation Avancée

### Commandes VS Code disponibles

#### 1. `RL4: Show Kernel Status`
**Usage:** Voir l'état actuel du kernel

**Ce qui s'affiche:**
```
🧠 RL4 Kernel Status
━━━━━━━━━━━━━━━━━━━━━━
✅ Scheduler: Running
❤️  Health Monitor: Active
📊 Last Cycle: #445 (10s ago)
🔗 Git Listener: Active
📁 File Watcher: Active

📈 Metrics:
  • Total cycles: 445
  • Patterns active: 6
  • Forecasts: 6
  • ADRs proposed: 1

💾 Storage:
  • cycles.jsonl: 2.8 MB
  • git_commits.jsonl: 18 KB
  • file_changes.jsonl: 145 KB
```

#### 2. `RL4: Export Snapshot`
**Usage:** Exporter un snapshot complet pour analyse externe

**Ce qui se passe:**
```typescript
// scripts/export-rl4-snapshot.js
1. Agrégation de toutes les données
2. Génération d'un fichier JSON complet
3. Sauvegarde dans .reasoning_rl4/rl4-snapshot.json
```

**Fichier généré:**
```json
{
  "generated_at": "2025-11-10T16:45:00Z",
  "workspace": "/Users/user/my-project",
  "summary": {
    "total_cycles": 445,
    "total_commits": 12,
    "total_file_changes": 287,
    "patterns_active": 6,
    "forecasts_generated": 6,
    "adrs_proposed": 1
  },
  "patterns": [...],
  "correlations": [...],
  "forecasts": [...],
  "adrs": [...],
  "cycles": [...]
}
```

#### 3. `RL4: Validate Data Integrity`
**Usage:** Vérifier l'intégrité de la chaîne Merkle

**Ce qui se passe:**
```typescript
// Validation de la chaîne cycles.jsonl
1. Lecture de tous les cycles
2. Recalcul des Merkle Roots
3. Vérification de la chaîne (prevMerkleRoot → merkleRoot)
4. Rapport d'intégrité
```

**Output:**
```
🔐 Integrity Check
━━━━━━━━━━━━━━━━━━━━━━
✅ All 445 cycles validated
✅ Merkle chain intact
✅ No corruption detected

First cycle: #1 (2025-11-01T09:00:00Z)
Last cycle: #445 (2025-11-10T10:35:33Z)
Duration: 9 days, 1h 35m
```

#### 4. `RL4: Generate PR Summary`
**Usage:** Générer un résumé cognitif pour une PR (future feature)

**Ce qui se passerait:**
```typescript
1. Détection du dernier commit
2. Analyse des patterns pré-commit
3. Extraction des forecasts alignés
4. Génération markdown
5. Copy to clipboard
```

**Markdown généré:**
```markdown
## 🧠 Cognitive Context

**Patterns Pre-PR:**
- Feature development (12 commits)
- Authentication implementation (5 commits)

**Forecasts Aligned:**
- ✅ "Document authentication flow" (confidence: 75%)

**Anti-Patterns Detected:**
- ⚠️ app.ts (6 modifications, 0.86/day)

**Recommendation:** APPROVE with tests on authentication
```

### Configuration Avancée

#### Ajuster l'intervalle des cycles

**Fichier:** `.reasoning_rl4/kernel_config.json`

```json
{
  "USE_TIMER_REGISTRY": true,
  "USE_HEALTH_MONITOR": true,
  "cognitive_cycle_interval_ms": 10000  // 10 secondes (défaut)
}
```

**Options:**
- `5000` (5s) - Haute fréquence (développement actif)
- `10000` (10s) - Fréquence normale (défaut)
- `30000` (30s) - Basse fréquence (économie ressources)
- `60000` (1min) - Très basse fréquence (background)

**Redémarrage requis:** Oui (recharger la fenêtre VS Code)

#### Désactiver le Health Monitor

**Pourquoi ?** Économiser des ressources CPU/Mémoire

**Comment:**
```json
{
  "USE_HEALTH_MONITOR": false
}
```

#### Ignorer certains fichiers

**Fichier:** `.reasoning_rl4/.gitignore` (à créer)

```
# Ignorer node_modules
node_modules/

# Ignorer fichiers temporaires
*.tmp
*.log

# Ignorer builds
dist/
build/
```

### Analyse Manuelle des Données

#### Lire les patterns

```bash
cd .reasoning_rl4
cat patterns.json | jq '.patterns[] | {pattern, frequency, confidence}'
```

**Output:**
```json
{
  "pattern": "Frequent kernel commits (21 commits)",
  "frequency": 21,
  "confidence": 0.83
}
{
  "pattern": "Feature development (12 commits)",
  "frequency": 12,
  "confidence": 0.78
}
```

#### Analyser un cycle spécifique

```bash
cat ledger/cycles.jsonl | jq 'select(.cycleId == 445)'
```

**Output:**
```json
{
  "cycleId": 445,
  "timestamp": "2025-11-10T10:35:33.650Z",
  "phases": {
    "patterns": { "hash": "7f1e2d...", "count": 6 },
    "correlations": { "hash": "a3c5e7...", "count": 3 },
    "forecasts": { "hash": "d9f1h3...", "count": 6 },
    "adrs": { "hash": "k5m7o9...", "count": 1 }
  },
  "merkleRoot": "p1r3t5...",
  "prevMerkleRoot": "q2s4u6..."
}
```

#### Compter les événements par type

```bash
cat traces/file_changes.jsonl | jq -r '.metadata.pattern.type' | sort | uniq -c
```

**Output:**
```
  45 feature
  32 refactor
  18 fix
  12 docs
   8 config
```

---

## 🐛 Debugging & Troubleshooting

### Problème 1: Output Channel ne s'affiche pas

**Symptôme:** Pas de logs visibles dans VS Code

**Solution:**
```
1. View > Output (Cmd+Shift+U / Ctrl+Shift+U)
2. Dropdown: Sélectionner "RL4 Kernel"
3. Si absent: Extension pas activée → vérifier workspace ouvert
```

### Problème 2: Cycles ne démarrent pas

**Symptôme:** Aucun cycle dans cycles.jsonl après 1 minute

**Diagnostic:**
```bash
# Vérifier que le scheduler est bien démarré
cat .reasoning_rl4/ledger/cycles.jsonl | wc -l
# Devrait être > 0 après 1 minute
```

**Causes possibles:**
1. **Workspace root non détecté**
   - Solution: Ouvrir un dossier (pas juste des fichiers)
2. **Kernel config invalide**
   - Solution: Supprimer `.reasoning_rl4/kernel_config.json`, relancer
3. **Erreur silencieuse**
   - Solution: Consulter VS Code Developer Tools (Help > Toggle Developer Tools > Console)

### Problème 3: GitCommitListener ne détecte pas les commits

**Symptôme:** `git_commits.jsonl` vide malgré des commits

**Diagnostic:**
```bash
# Vérifier que c'est bien un dépôt Git
git status
# Si erreur "not a git repository" → normal que GitListener soit disabled
```

**Solution:**
```bash
# Initialiser Git si nécessaire
git init
git add .
git commit -m "Initial commit"

# Recharger VS Code
```

### Problème 4: Trop de logs / Performance dégradée

**Symptôme:** VS Code ralentit, Output Channel surchargé

**Causes:**
- Intervalle de cycles trop court (< 5s)
- Trop d'événements capturés (gros projet)

**Solutions:**

**Option 1: Augmenter l'intervalle**
```json
// .reasoning_rl4/kernel_config.json
{
  "cognitive_cycle_interval_ms": 30000  // 30s au lieu de 10s
}
```

**Option 2: Désactiver Health Monitor**
```json
{
  "USE_HEALTH_MONITOR": false
}
```

**Option 3: Nettoyer les anciens logs**
```bash
# Archiver les anciens cycles
cd .reasoning_rl4/ledger
mv cycles.jsonl cycles.$(date +%Y%m%d).jsonl
touch cycles.jsonl

# Les cycles recommenceront à 1
```

### Problème 5: Corruption de données

**Symptôme:** Erreurs dans Output Channel type "Invalid JSON"

**Diagnostic:**
```bash
# Vérifier l'intégrité des fichiers JSON
jq '.' .reasoning_rl4/patterns.json
jq '.' .reasoning_rl4/correlations.json
jq '.' .reasoning_rl4/forecasts.json

# Vérifier les JSONL (chaque ligne doit être JSON valide)
cat .reasoning_rl4/ledger/cycles.jsonl | while read line; do echo "$line" | jq '.' > /dev/null || echo "Invalid JSON"; done
```

**Solution:**
```bash
# Backup des données
cp -r .reasoning_rl4 .reasoning_rl4.backup.$(date +%Y%m%d)

# Réinitialisation propre
rm -rf .reasoning_rl4
# Recharger VS Code → reconstruction automatique
```

### Problème 6: Merkle Chain brisée

**Symptôme:** `prevMerkleRoot` ne correspond pas au `merkleRoot` du cycle précédent

**Diagnostic:**
```bash
# Script de validation (à créer)
node scripts/validate-merkle-chain.js
```

**Causes:**
- Édition manuelle de `cycles.jsonl` (❌ INTERDIT)
- Corruption de fichier
- Bug dans le kernel

**Solution:**
```bash
# Impossible de réparer → conserver pour analyse forensique
mv .reasoning_rl4/ledger/cycles.jsonl .reasoning_rl4/ledger/cycles.corrupted.jsonl

# Nouveau départ
touch .reasoning_rl4/ledger/cycles.jsonl
# Les cycles recommenceront avec une nouvelle chaîne
```

---

## 📊 Métriques & KPIs

### Pour l'utilisateur développeur

**Métriques visibles:**
- ✅ Nombre de cycles exécutés
- ✅ Patterns détectés et leur fréquence
- ✅ Forecasts générés avec confidence
- ✅ ADRs proposées et leur statut
- ✅ Commits capturés et analysés
- ✅ Fichiers modifiés avec patterns détectés

**Où les trouver:**
```bash
# Résumé rapide
cat .reasoning_rl4/patterns.json | jq '.patterns | length'
cat .reasoning_rl4/forecasts.json | jq '. | length'
cat .reasoning_rl4/ledger/cycles.jsonl | wc -l
```

### Pour l'équipe

**Métriques avancées:**
- ✅ Forecast accuracy (precision, recall)
- ✅ Pattern evolution over time
- ✅ Correlation strength trends
- ✅ Anti-pattern detection rate
- ✅ ADR acceptance rate

**Où les trouver:**
```bash
# Export snapshot complet
RL4: Export Snapshot
# Analyser avec outils externes (Jupyter, Excel, etc.)
```

---

## 🎯 Best Practices

### DO ✅

1. **Laisser tourner en permanence**
   - RL4 apprend au fil du temps
   - Plus de cycles = meilleure précision

2. **Consulter régulièrement l'Output Channel**
   - Détecter les patterns émergents
   - Identifier les anti-patterns tôt

3. **Utiliser Git**
   - GitCommitListener enrichit les patterns
   - Meilleure corrélation entre code et décisions

4. **Exporter des snapshots régulièrement**
   - Backup des données cognitives
   - Analyse externe possible

5. **Committer avec des messages structurés**
   - `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
   - Meilleure détection d'intent

### DON'T ❌

1. **Ne pas éditer manuellement les fichiers `.reasoning_rl4/`**
   - Risque de corruption
   - Bris de la chaîne Merkle

2. **Ne pas désactiver l'extension pendant le développement**
   - Perte de contexte cognitif
   - Trous dans l'historique

3. **Ne pas ignorer les alertes anti-pattern**
   - Indicateurs précoces de dette technique
   - Prévention de problèmes futurs

4. **Ne pas commit `.reasoning_rl4/` dans Git**
   - Données locales au développeur
   - Ajouter à `.gitignore`

5. **Ne pas forcer des cycles trop fréquents (< 5s)**
   - Surcharge du système
   - Diminution de la qualité des patterns

---

## 🚀 Roadmap Features Utilisateur

### Phase 1: WebView (Q1 2026)
- ✅ Dashboard interactif dans VS Code
- ✅ Replay cognitif cycle par cycle
- ✅ Génération automatique PR summaries
- ✅ Alertes anti-pattern en temps réel

### Phase 2: AI Augmentation (Q2 2026)
- 🔄 Intégration Claude/GPT pour analyse
- 🔄 Natural language queries ("Show me all refactors last week")
- 🔄 Suggestions proactives ("Consider documenting authentication")

### Phase 3: Team Collaboration (Q3 2026)
- 🔄 Partage de patterns entre développeurs
- 🔄 Cognitive graph du repository
- 🔄 Team insights dashboard

### Phase 4: OSS Observatory (Q4 2026)
- 🔄 Observation passive de repos GitHub
- 🔄 Detection de patterns cross-repo
- 🔄 Cognitive reports publics

---

## 📚 Ressources Complémentaires

### Documentation Technique
- `RL4_DATA_STRUCTURE_GUIDE.md` - Structure des données
- `WEBVIEW_DATA_READINESS.md` - Préparation WebView
- `PerplexityTest.md` - Tests cognitifs avancés

### Scripts Utiles
- `scripts/validate-webview-data.sh` - Validation des données
- `scripts/export-rl4-snapshot.js` - Export complet
- `scripts/generate-kernel-artifacts.js` - Génération artefacts

### Support
- GitHub Issues: [reasoning-layer-v3/issues](https://github.com/Soynido/reasoning-layer-v3/issues)
- Documentation: [README.md](README.md)
- TASKS: [TASKS_RL4.md](TASKS_RL4.md)

---

**Document créé:** 2025-11-10  
**Version:** 1.0  
**Maintenu par:** Reasoning Layer Team  
**Next Review:** 2025-12-01

