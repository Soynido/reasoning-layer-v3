# 🧪 Checklist de Tests Manuels — v3.5.10

**Date:** 2025-11-17  
**Version:** 3.5.10  
**Objectif:** Valider toutes les fonctionnalités implémentées

---

## 📋 Prérequis

- [ ] Extension v3.5.10 installée
- [ ] Cursor rechargé (Cmd+R ou Cmd+Shift+P → "Developer: Reload Window")
- [ ] Workspace ouvert avec `.reasoning_rl4/` initialisé
- [ ] Terminal VS Code disponible

---

## 🔴 1. Memory Safety Fix (Sprint E4.1)

### Test 1.1: Vérifier retainContextWhenHidden
- [ ] Ouvrir `extension/extension.ts`
- [ ] Chercher `retainContextWhenHidden` (2 occurrences)
- [ ] **Attendu:** `retainContextWhenHidden: false` avec commentaire `// ✅ FIXED`
- [ ] **Résultat:** ✅ Les 2 occurrences sont à `false`

### Test 1.2: Memory Watchdog
- [ ] Ouvrir la console RL4 Kernel (Output → "RL4 Kernel")
- [ ] **Attendu:** Message `🐕 Memory Watchdog started (threshold: 500 MB, interval: 300s)`
- [ ] Attendre 5 minutes
- [ ] **Attendu:** Logs périodiques `[RL4 Memory] Heap: XXX MB`
- [ ] **Résultat:** ✅ Watchdog actif et log toutes les 5 min

### Test 1.3: Memory Baseline
- [ ] Ouvrir Activity Monitor (macOS) ou Task Manager
- [ ] Filtrer "Cursor Helper (Renderer)"
- [ ] **Attendu:** RAM < 500 MB au démarrage
- [ ] Ouvrir Dashboard RL4
- [ ] Fermer Dashboard RL4
- [ ] **Attendu:** RAM libérée (réduction ~100-200 MB)
- [ ] **Résultat:** ✅ Pas de fuite mémoire majeure

---

## 🖥️ 2. Terminal RL4 Dédié

### Test 2.1: Commande "Open RL4 Terminal"
- [ ] Cmd+Shift+P → "RL4: Open Terminal"
- [ ] **Attendu:** Terminal "RL4 Terminal" créé/révélé
- [ ] **Attendu:** Message `[RL4] Terminal helper loaded. Available functions:`
- [ ] **Résultat:** ✅ Terminal créé avec helpers chargés

### Test 2.2: Helper Functions Disponibles
- [ ] Dans le Terminal RL4, taper `rl4_` puis Tab
- [ ] **Attendu:** Autocomplétion propose:
  - `rl4_task_start`
  - `rl4_task_result`
  - `rl4_file_created`
  - `rl4_git_commit`
  - `rl4_run`
  - `rl4_action`
- [ ] **Résultat:** ✅ Toutes les fonctions disponibles

### Test 2.3: Test rl4_run
- [ ] Dans Terminal RL4, exécuter:
  ```bash
  rl4_run test-manual-001 "echo 'Test successful'"
  ```
- [ ] Vérifier `.reasoning_rl4/terminal-events.jsonl`
- [ ] **Attendu:** 2 événements (task_start + task_result)
- [ ] **Résultat:** ✅ Événements loggés correctement

### Test 2.4: Test rl4_action
- [ ] Dans Terminal RL4, exécuter:
  ```bash
  npm install axios  # RL4_ACTION: Add HTTP client for API calls
  ```
- [ ] OU utiliser:
  ```bash
  rl4_action "Add HTTP client for API calls"
  ```
- [ ] Vérifier `.reasoning_rl4/terminal-events.jsonl`
- [ ] **Attendu:** Événement `type: "ad_hoc_action"`
- [ ] **Résultat:** ✅ Ad-hoc action loggée

---

## 🧠 3. Pattern Learning UI (Sprint E5)

### Test 3.1: Patterns Tab dans Insights
- [ ] Ouvrir Dashboard RL4
- [ ] Cliquer sur onglet "📊 Insights"
- [ ] **Attendu:** Sub-tabs "📊 KPIs" et "🧠 Patterns"
- [ ] Cliquer sur "🧠 Patterns"
- [ ] **Attendu:** Section "Learned Patterns" avec table
- [ ] **Résultat:** ✅ Patterns Tab visible

### Test 3.2: Affichage Patterns
- [ ] Dans Patterns Tab, vérifier la table
- [ ] **Attendu:** Colonnes:
  - Task Title
  - Runs
  - Success Rate
  - Avg Duration
  - Last Run
- [ ] **Attendu:** Au moins 1 pattern affiché (si terminal-events.jsonl contient des données)
- [ ] **Résultat:** ✅ Patterns affichés correctement

### Test 3.3: Détails Pattern (Expandable)
- [ ] Cliquer sur un pattern dans la table
- [ ] **Attendu:** Détails expandés:
  - Typical Commands
  - Success/Failure breakdown
  - Duration stats
- [ ] **Résultat:** ✅ Détails affichés

### Test 3.4: Anomalies Détectées
- [ ] Dans Patterns Tab, vérifier section "⚠️ Pattern Anomalies"
- [ ] **Attendu:** Liste d'anomalies (si présentes):
  - Success rate drops
  - Unusual durations
  - Command changes
- [ ] **Résultat:** ✅ Anomalies affichées (ou message "No anomalies")

---

## 💡 4. Auto-Suggestions UI

### Test 4.1: Détection Tâches sans @rl4:completeWhen
- [ ] Ouvrir `.reasoning_rl4/Tasks.RL4`
- [ ] Ajouter une tâche SANS `@rl4:completeWhen`:
  ```markdown
  - [ ] [P0] Test manual task @rl4:id=test-manual-002
  ```
- [ ] Sauvegarder
- [ ] Ouvrir Dashboard RL4 → Dev Tab
- [ ] **Attendu:** Section "💡 Suggested Conditions"
- [ ] **Attendu:** Tâche "Test manual task" avec suggestion
- [ ] **Résultat:** ✅ Suggestion détectée et affichée

### Test 4.2: Affichage Suggestion
- [ ] Dans Dev Tab, vérifier la suggestion
- [ ] **Attendu:** Badge de confiance (HIGH/MEDIUM/LOW)
- [ ] **Attendu:** Condition suggérée (ex: `exitCode 0`)
- [ ] **Attendu:** Raison (ex: "Based on similar task...")
- [ ] **Résultat:** ✅ Suggestion complète affichée

### Test 4.3: Appliquer Suggestion
- [ ] Cliquer sur bouton "✅ Apply" sur une suggestion
- [ ] **Attendu:** Message de confirmation
- [ ] Ouvrir `.reasoning_rl4/Tasks.RL4`
- [ ] **Attendu:** Tâche mise à jour avec `@rl4:completeWhen="..."`
- [ ] **Résultat:** ✅ Suggestion appliquée automatiquement

### Test 4.4: Refresh Suggestions
- [ ] Après avoir appliqué une suggestion
- [ ] **Attendu:** Section "💡 Suggested Conditions" mise à jour
- [ ] **Attendu:** Tâche traitée disparaît de la liste
- [ ] **Résultat:** ✅ Suggestions rafraîchies

---

## 🔍 5. Ad-Hoc Actions Tracker

### Test 5.1: Détection Ad-Hoc Actions
- [ ] Dans Terminal RL4, exécuter plusieurs actions non planifiées:
  ```bash
  npm install lodash  # RL4_ACTION: Add utility library
  touch test-file.txt
  git commit -m "Test commit"
  ```
- [ ] Attendre 30 secondes
- [ ] Ouvrir Dashboard RL4 → Dev Tab
- [ ] **Attendu:** Section "🔍 Suggested from Activity"
- [ ] **Attendu:** Actions détectées listées
- [ ] **Résultat:** ✅ Ad-hoc actions détectées

### Test 5.2: Affichage Ad-Hoc Actions
- [ ] Dans Dev Tab, vérifier la section "🔍 Suggested from Activity"
- [ ] **Attendu:** Pour chaque action:
  - Description
  - Badge de confiance (HIGH/MEDIUM/LOW)
  - Timestamp
  - Boutons "Create Task" et "Ignore"
- [ ] **Résultat:** ✅ Actions affichées avec détails

### Test 5.3: Créer Task depuis Ad-Hoc
- [ ] Cliquer sur "Create Task" sur une ad-hoc action
- [ ] **Attendu:** Dialogue ou confirmation
- [ ] Ouvrir `.reasoning_rl4/Tasks.RL4`
- [ ] **Attendu:** Nouvelle tâche ajoutée (format standard)
- [ ] **Résultat:** ✅ Task créée depuis ad-hoc

### Test 5.4: Ignorer Ad-Hoc Action
- [ ] Cliquer sur "Ignore" sur une ad-hoc action
- [ ] **Attendu:** Action disparaît de la liste
- [ ] **Attendu:** Action marquée comme ignorée (pas de re-détection)
- [ ] **Résultat:** ✅ Action ignorée correctement

---

## 📝 6. Snapshot Enrichissement

### Test 6.1: Ad-Hoc Actions dans Snapshot
- [ ] Générer un snapshot (Control Tab → "Generate Snapshot")
- [ ] Copier le prompt généré
- [ ] Chercher dans le prompt: "🔍 Ad-Hoc Actions"
- [ ] **Attendu:** Section avec actions détectées (si présentes)
- [ ] **Attendu:** Groupement par confiance (HIGH/MEDIUM/LOW)
- [ ] **Résultat:** ✅ Ad-hoc actions dans snapshot

### Test 6.2: Instructions Terminal RL4 dans Snapshot
- [ ] Dans le prompt snapshot, chercher: "🖥️ RL4 Terminal"
- [ ] **Attendu:** Section "Usage Instructions for LLM Agent"
- [ ] **Attendu:** Instructions pour utiliser Terminal RL4
- [ ] **Attendu:** Exemples d'enrichissement avec contexte
- [ ] **Résultat:** ✅ Instructions Terminal RL4 présentes

### Test 6.3: Exemple Workflow Enrichi
- [ ] Dans le prompt snapshot, chercher: "Example Workflow (avec enrichissement)"
- [ ] **Attendu:** Exemple avec commentaires contextuels
- [ ] **Attendu:** Format enrichi:
  ```bash
  # Context: Running unit tests for authentication module
  # Expected: All 42 tests pass, coverage >80%
  rl4_run task-001 'npm test'
  ```
- [ ] **Résultat:** ✅ Exemple workflow enrichi présent

---

## 🎯 7. Task Verification (Fonctionnalité Existante)

### Test 7.1: Vérification Automatique
- [ ] Dans `.reasoning_rl4/Tasks.RL4`, créer une tâche:
  ```markdown
  - [ ] [P0] Test verification @rl4:id=test-verify-001 @rl4:completeWhen="exitCode 0"
  ```
- [ ] Dans Terminal RL4, exécuter:
  ```bash
  rl4_run test-verify-001 "echo 'success'"
  ```
- [ ] Attendre 10 secondes
- [ ] Ouvrir Dashboard RL4 → Dev Tab
- [ ] **Attendu:** Badge "✅ Verified by RL4" sur la tâche
- [ ] **Résultat:** ✅ Vérification automatique fonctionne

### Test 7.2: Mark as Done
- [ ] Sur une tâche vérifiée, cliquer "Mark as Done"
- [ ] **Attendu:** Confirmation
- [ ] Ouvrir `.reasoning_rl4/Tasks.RL4`
- [ ] **Attendu:** Tâche cochée `- [x]` avec timestamp
- [ ] **Résultat:** ✅ Mark as Done fonctionne

---

## 🔧 8. Cursor Rules (Calibration LLM)

### Test 8.1: Règle RL4 Terminal
- [ ] Ouvrir `.cursor/rules/RL4_STRICT_MODE_ENFORCEMENT.mdc`
- [ ] Chercher: "🖥️ RL4 TERMINAL — POUR TÂCHES À TRACKER"
- [ ] **Attendu:** Section avec règle nuancée
- [ ] **Attendu:** Exemples bon/mauvais
- [ ] **Attendu:** Section "ENRICHISSEMENT DES COMMANDES"
- [ ] **Résultat:** ✅ Règles présentes et complètes

### Test 8.2: Workflow Complet Documenté
- [ ] Dans la Cursor Rule, vérifier section "🔄 WORKFLOW COMPLET"
- [ ] **Attendu:** 6 étapes documentées:
  1. Tu enrichis le prompt
  2. Tu ENRICHIS les commandes avec du contexte
  3. L'utilisateur exécute dans RL4 Terminal
  4. Le Kernel RL4 parse les logs
  5. Le Kernel apprend mieux
  6. Le prochain snapshot inclut les données enrichies
- [ ] **Résultat:** ✅ Workflow complet documenté

---

## 📊 9. Console & Logs

### Test 9.1: Console RL4 Kernel
- [ ] Ouvrir Output → "RL4 Kernel"
- [ ] **Attendu:** Logs structurés:
  - `🐕 Memory Watchdog started`
  - `📊 Memory: XXX MB`
  - `[RL4] Terminal helper loaded`
- [ ] **Résultat:** ✅ Logs présents et lisibles

### Test 9.2: terminal-events.jsonl
- [ ] Ouvrir `.reasoning_rl4/terminal-events.jsonl`
- [ ] **Attendu:** Format JSONL valide
- [ ] **Attendu:** Événements avec champs:
  - `timestamp`
  - `type`
  - `taskId` (si applicable)
  - `terminal: "RL4"`
- [ ] **Résultat:** ✅ Format correct

### Test 9.3: terminal-patterns.json
- [ ] Ouvrir `.reasoning_rl4/terminal-patterns.json` (si existe)
- [ ] **Attendu:** Structure:
  ```json
  {
    "learned_at": "...",
    "patterns": { ... },
    "commandClassification": { ... }
  }
  ```
- [ ] **Résultat:** ✅ Format patterns correct

---

## 🚨 10. Edge Cases & Erreurs

### Test 10.1: Terminal RL4 Non Disponible
- [ ] Fermer tous les terminaux
- [ ] Cmd+Shift+P → "RL4: Open Terminal"
- [ ] **Attendu:** Terminal créé automatiquement
- [ ] **Résultat:** ✅ Terminal créé même si aucun terminal ouvert

### Test 10.2: Tasks.RL4 Vide
- [ ] Sauvegarder backup de Tasks.RL4
- [ ] Vider Tasks.RL4 (garder juste header)
- [ ] Ouvrir Dashboard RL4 → Dev Tab
- [ ] **Attendu:** Pas d'erreur
- [ ] **Attendu:** Message "No tasks" ou liste vide
- [ ] Restaurer backup
- [ ] **Résultat:** ✅ Gestion gracieuse du cas vide

### Test 10.3: terminal-events.jsonl Corrompu
- [ ] Sauvegarder backup de terminal-events.jsonl
- [ ] Ajouter ligne invalide: `{ invalid json }`
- [ ] Ouvrir Dashboard RL4 → Dev Tab
- [ ] **Attendu:** Pas de crash
- [ ] **Attendu:** Erreur loggée dans console
- [ ] Restaurer backup
- [ ] **Résultat:** ✅ Gestion d'erreur robuste

---

## ✅ Résumé des Tests

### Tests Critiques (P0)
- [ ] Memory Safety Fix (retainContextWhenHidden: false)
- [ ] Terminal RL4 Dédié (commande + helpers)
- [ ] Patterns Tab visible dans Insights
- [ ] Auto-Suggestions fonctionnelles
- [ ] Ad-Hoc Actions détectées

### Tests Importants (P1)
- [ ] Memory Watchdog actif
- [ ] Snapshot enrichi avec ad-hoc actions
- [ ] Instructions Terminal RL4 dans snapshot
- [ ] Cursor Rules complètes

### Tests Bonus (P2)
- [ ] Edge cases gérés
- [ ] Logs structurés
- [ ] Format JSONL valide

---

## 📝 Notes de Test

**Date de test:** _______________  
**Testeur:** _______________  
**Version testée:** 3.5.10

**Problèmes rencontrés:**
- 
- 
- 

**Suggestions d'amélioration:**
- 
- 
- 

---

## 🎯 Critères de Succès

✅ **Extension fonctionne sans crash**  
✅ **Memory Safety fix actif** (RAM < 500 MB)  
✅ **Terminal RL4 opérationnel**  
✅ **Pattern Learning UI visible**  
✅ **Auto-Suggestions fonctionnelles**  
✅ **Ad-Hoc Actions détectées**  
✅ **Snapshot enrichi correctement**  
✅ **Cursor Rules complètes**

**Si tous les tests P0 passent → ✅ v3.5.10 VALIDÉE**

