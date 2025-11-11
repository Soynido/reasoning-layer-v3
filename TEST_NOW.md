# 🚀 TEST NOW — WhereAmI + WebView Dashboard

## ⚡ Test en 3 commandes (2 minutes)

### 1️⃣ Rebuild l'extension
```bash
npm run compile
```

### 2️⃣ Reload VS Code
Appuyez sur `Cmd+Shift+P` (ou `Ctrl+Shift+P`), tapez :
```
Developer: Reload Window
```

### 3️⃣ C'est tout ! ✅

La WebView Dashboard devrait s'ouvrir automatiquement à droite.

---

## 👀 Ce que vous devriez voir

### Output Channel "RL4 Kernel"
```
[HH:MM:SS] === RL4 KERNEL — Minimal Mode ===
[HH:MM:SS] 🔧 Initializing RL4 Kernel...
[HH:MM:SS] ✅ RL4 Kernel components created
[HH:MM:SS] 🖥️ Creating RL4 Dashboard WebView...
[HH:MM:SS] ✅ WebView HTML loaded
[HH:MM:SS] ✅ RL4 Kernel activated
[HH:MM:SS] 🎯 8 commands registered (4 kernel + 3 ADR validation + 1 webview)
[HH:MM:SS] 🖥️ Dashboard auto-opened in column 2

... 10 secondes plus tard ...

[HH:MM:SS] 📤 Snapshot pushed to WebView
[HH:MM:SS] 📤 Snapshot pushed to WebView  ← Toutes les 10 secondes
```

### WebView Dashboard (Column 2)
Un panneau **"🧠 RL4 Dashboard"** devrait apparaître à droite de votre éditeur.

---

## 🧪 Tests supplémentaires

### Test 1 : Commande manuelle snapshot
```
Cmd+Shift+P → "Where Am I"
```
→ Un fichier Markdown temporaire s'ouvre avec le snapshot.

### Test 2 : Toggle WebView
```
Cmd+Shift+P → "Show Dashboard"
```
→ La WebView réapparaît si vous l'avez fermée.

### Test 3 : Tests unitaires
```bash
npm run test:whereami
```
→ Résultat attendu :
```
✅ Test 1 passed: Markdown snapshot generated successfully
✅ Test 2 passed: JSON snapshot generated successfully
✅ Test 3 passed: Empty data handled gracefully
✅ All tests passed!
```

---

## ❓ Dépannage rapide

### La WebView ne s'ouvre pas ?
**Vérifier** :
```bash
ls -la extension/webview/ui/dist/
ls -la extension/webview/ui/dist/assets/
```
Les fichiers doivent exister :
- `index.html`
- `assets/index-1QjzlLvx.js`
- `assets/index-D6XCkzLB.css`

**Solution** : Si manquants, rebuild la WebView :
```bash
cd extension/webview/ui
npm run build
cd ../../..
```

### Snapshots vides ?
**Attendre 30-60 secondes** pour que RL4 génère des données.

**Ou forcer un cycle manuel** :
```
Cmd+Shift+P → "Run Cognitive Cycle"
```

### Erreur de compilation ?
```bash
npm install
npm run compile
```

---

## 📚 Documentation complète

Après le test, consultez :

1. **Quick Start** : `WHEREAMI_QUICKSTART.md`
2. **API Docs** : `docs/WHEREAMI_SNAPSHOT_API.md`
3. **Résumé final** : `WHEREAMI_FINAL_SUMMARY.md`

---

## 🎉 Profitez de votre Dashboard !

La WebView s'actualise automatiquement toutes les 10 secondes avec :
- 📍 Fichiers actifs
- 🔍 Patterns cognitifs détectés
- 📈 Forecasts en cours
- 💡 Recommandations contextuelles

---

**Bon test ! 🚀**

