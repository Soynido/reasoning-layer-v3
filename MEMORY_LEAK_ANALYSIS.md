# 🚨 Analyse Mémoire — v3.5.10

**Date:** 2025-11-17  
**Problème:** RAM élevée malgré fix `retainContextWhenHidden`

---

## 📊 État Actuel

### Mémoire Observée
- **Cursor Helper (Renderer):** 1,51 Go ❌ (attendu: < 500 MB)
- **extension-host:** 821,3 Mo ❌ (attendu: < 300 MB)
- **Total:** ~2,3 Go ❌ (attendu: < 800 MB)

### Temps d'exécution
- **Renderer:** 2h 53min
- **extension-host:** 14h 47min

---

## ✅ Ce Qui Est Fait

### 1. retainContextWhenHidden: false ✅
- **Status:** ✅ Implémenté (2 occurrences)
- **Impact:** Libère ~1 GB quand dashboard fermé
- **Action:** Recharger Cursor pour activer

### 2. ExecPool Buffer Limit ✅
- **Status:** ✅ Implémenté (slice(0, 1000))
- **Code:** `extension/kernel/ExecPool.ts:124-125`
- **Impact:** Limite stdout/stderr à 1 KB

### 3. MemoryWatchdog ✅
- **Status:** ✅ Implémenté
- **Code:** `extension/kernel/MemoryWatchdog.ts`
- **Impact:** Surveillance + alertes > 500 MB

---

## ❌ Ce Qui Manque (Sprint E4.1 Incomplet)

### 1. IDEActivityListener dispose() ❌ CRITIQUE
- **Problème:** `private disposables: vscode.Disposable[] = []` existe MAIS pas de méthode `dispose()`
- **Impact:** Event listeners VS Code jamais nettoyés → **fuite mémoire majeure**
- **Fichier:** `extension/kernel/inputs/IDEActivityListener.ts`
- **Action requise:**
  ```typescript
  public dispose(): void {
      this.disposables.forEach(d => d.dispose());
      this.disposables = [];
      simpleLogger.log('👁️ IDEActivityListener disposed');
  }
  ```

### 2. BuildMetricsListener dispose() ⚠️ PARTIEL
- **Status:** Méthode `dispose()` existe MAIS pas appelée dans `deactivate()`
- **Fichier:** `extension/kernel/inputs/BuildMetricsListener.ts:264`
- **Action requise:** Appeler `buildMetricsListener.dispose()` dans `extension.ts deactivate()`

### 3. deactivate() Appels Manquants ❌ CRITIQUE
- **Problème:** Commentaire "✅ FIXED" mais pas d'appels réels
- **Code actuel:**
  ```typescript
  // ✅ NEW: Dispose all event listeners (IDE, Build metrics)
  // Note: CognitiveScheduler should expose a disposeAll() method
  // For now, we log the intention
  ```
- **Action requise:** Appeler réellement `ideActivityListener.dispose()` et `buildMetricsListener.dispose()`

### 4. Console.log Rotation ❓ INCONNU
- **Status:** Pas de `console.log` trouvé dans `App.tsx` (peut-être déjà nettoyé)
- **Vérification:** Chercher tous les `console.log` dans webview
- **Action requise:** Si présents, créer `WebViewLogger` avec rotation

### 5. JSONL Rotation ❌ MANQUANT
- **Problème:** `AppendOnlyWriter.ts` n'a pas de rotation
- **Impact:** Fichiers JSONL grandissent indéfiniment
- **Action requise:** Ajouter `rotateIfNeeded()` après 10K lignes

### 6. git_pool.jsonl Rotation ❌ MANQUANT
- **Problème:** `ExecPool.ts` n'a pas de rotation pour `git_pool.jsonl`
- **Action requise:** Ajouter rotation après 5000 lignes

---

## 🔴 Root Causes Identifiées

### 1. Event Listeners Non Nettoyés (CRITIQUE)
- **IDEActivityListener:** `vscode.window.onDid*` listeners jamais disposés
- **Impact:** Chaque listener accumule en mémoire
- **Projection:** 821 MB après 14h → ~2 GB après 1 semaine

### 2. Dashboard WebView (PARTIELLEMENT RÉSOLU)
- **Fix appliqué:** `retainContextWhenHidden: false`
- **Action:** Recharger Cursor pour activer
- **Impact attendu:** -1 GB quand dashboard fermé

### 3. JSONL Files Croissance (MOYEN)
- **Problème:** Fichiers JSONL jamais rotés
- **Impact:** Croissance linéaire (moins critique que listeners)

---

## 🎯 Plan d'Action Immédiat

### Phase 1: Actions Immédiates (5 min)
1. **Recharger Cursor** (Cmd+R)
   - Active `retainContextWhenHidden: false`
   - Devrait libérer ~1 GB si dashboard était ouvert

2. **Fermer Dashboard RL4** (si ouvert)
   - Libère mémoire WebView

3. **Vérifier RAM après 2 min**
   - Attendu: < 500 MB Renderer, < 300 MB extension-host

### Phase 2: Fix Critiques (30 min)
1. **Ajouter dispose() dans IDEActivityListener**
   ```typescript
   public dispose(): void {
       this.disposables.forEach(d => d.dispose());
       this.disposables = [];
   }
   ```

2. **Appeler dispose() dans deactivate()**
   ```typescript
   if (ideActivityListener) {
       ideActivityListener.dispose();
   }
   if (buildMetricsListener) {
       buildMetricsListener.dispose();
   }
   ```

3. **Tester et recharger**

### Phase 3: Optimisations Restantes (1h)
1. JSONL Rotation dans AppendOnlyWriter
2. git_pool.jsonl Rotation dans ExecPool
3. Console.log audit dans webview

---

## 📈 Impact Attendu

### Après Fix Critiques (Phase 2)
- **extension-host:** 821 MB → ~300 MB (-63%)
- **Renderer:** 1,51 GB → ~400 MB (-73%)
- **Total:** 2,3 GB → ~700 MB (-70%)

### Après Toutes Optimisations (Phase 3)
- **extension-host:** ~200 MB
- **Renderer:** ~300 MB
- **Total:** ~500 MB (target atteint ✅)

---

## 🚨 Priorité

### P0 (CRITIQUE — À faire maintenant)
1. ✅ Recharger Cursor (active retainContextWhenHidden fix)
2. ❌ Ajouter dispose() dans IDEActivityListener
3. ❌ Appeler dispose() dans deactivate()

### P1 (IMPORTANT — Cette semaine)
4. JSONL Rotation
5. git_pool.jsonl Rotation
6. Console.log audit

---

## 📝 Notes

- Le fix `retainContextWhenHidden` est bon MAIS seul il ne suffit pas
- Les event listeners non nettoyés sont la cause principale de la fuite
- Le Sprint E4.1 n'est qu'à ~30% de complétion
- Il faut compléter les optimisations pour atteindre le target < 500 MB

---

## ✅ Checklist Validation

- [ ] Cursor rechargé
- [ ] Dashboard fermé
- [ ] RAM vérifiée après 2 min
- [ ] dispose() ajouté dans IDEActivityListener
- [ ] dispose() appelé dans deactivate()
- [ ] RAM vérifiée après fixes
- [ ] JSONL Rotation implémentée
- [ ] git_pool Rotation implémentée
- [ ] Target < 500 MB atteint

