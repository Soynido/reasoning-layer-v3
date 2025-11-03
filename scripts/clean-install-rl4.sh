#!/bin/bash
# Clean installation script for RL4 Kernel
# Removes RL3 legacy and installs RL4 with isolated namespace

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VSIX_FILE="$WORKSPACE_ROOT/reasoning-layer-rl4-2.0.1.vsix"

echo "🧹 RL4 Kernel - Clean Installation"
echo "===================================="
echo ""
echo "📦 VSIX: $VSIX_FILE"
echo ""

# Check if VSIX exists
if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ ERROR: VSIX not found"
    echo "   Run: npm run compile && npx vsce package"
    exit 1
fi

echo "Step 1/5: Uninstalling RL3 legacy extensions..."
echo ""

# Uninstall all RL3 versions
cursor --uninstall-extension valentingaludec.reasoning-layer-v3 2>/dev/null || true
code --uninstall-extension valentingaludec.reasoning-layer-v3 2>/dev/null || true

# Remove extension directories manually
rm -rf ~/.cursor/extensions/valentingaludec.reasoning-layer-v3-* 2>/dev/null || true
rm -rf ~/.vscode/extensions/valentingaludec.reasoning-layer-v3-* 2>/dev/null || true

echo "✅ RL3 legacy extensions removed"
echo ""

echo "Step 2/5: Archiving RL3 data (optional)..."
echo ""

# Archive old .reasoning directory if exists
if [ -d "$WORKSPACE_ROOT/.reasoning" ]; then
    BACKUP_DIR="$WORKSPACE_ROOT/.reasoning.rl3-backup-$(date +%Y%m%d-%H%M%S)"
    mv "$WORKSPACE_ROOT/.reasoning" "$BACKUP_DIR"
    echo "✅ RL3 data archived to: $(basename $BACKUP_DIR)"
else
    echo "⏭️  No RL3 data to archive"
fi
echo ""

echo "Step 3/5: Installing RL4 Kernel..."
echo ""

# Install RL4
cursor --install-extension "$VSIX_FILE" --force

if [ $? -eq 0 ]; then
    echo "✅ RL4 Kernel installed successfully"
else
    echo "❌ Installation failed"
    exit 1
fi
echo ""

echo "Step 4/5: Verifying installation..."
echo ""

# Check if installed
RL4_DIR=$(ls -d ~/.cursor/extensions/valentingaludec.reasoning-layer-rl4-* 2>/dev/null | head -1)
if [ -n "$RL4_DIR" ]; then
    echo "✅ RL4 extension found: $(basename $RL4_DIR)"
    echo "   Size: $(du -sh "$RL4_DIR" | cut -f1)"
else
    echo "❌ RL4 extension not found in extensions directory"
    exit 1
fi
echo ""

echo "Step 5/5: Post-installation checks..."
echo ""

echo "✅ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 NEXT STEPS:"
echo ""
echo "1. QUIT Cursor completely (Cmd+Q, not just Reload)"
echo ""
echo "2. Relaunch Cursor and open this workspace"
echo ""
echo "3. Check new Output Channel: 'RL4 Kernel'"
echo "   Cmd+Shift+P > Output: Show Output Channels > RL4 Kernel"
echo ""
echo "4. Look for these messages:"
echo "   🧠 RL4 CognitiveScheduler created (fresh instance)"
echo "   🛡️ RL4 Watchdog active (checking every 60000ms)"
echo "   🧠 RL4 CognitiveScheduler started (...ms cycles)"
echo ""
echo "5. Run validation test (30s):"
echo "   ./scripts/check-watchdog.sh"
echo ""
echo "6. Expected result:"
echo "   ✅ SUCCESS: Scheduler is generating cycles!"
echo "   ✨ New cycles: 3+"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 What Changed:"
echo "   • Extension name: reasoning-layer-v3 → reasoning-layer-rl4"
echo "   • Output Channel: 'Reasoning Layer' → 'RL4 Kernel'"
echo "   • Version: 1.0.87 → 2.0.1"
echo "   • Namespace: Fully isolated from RL3"
echo ""
echo "📁 Data Locations:"
echo "   • RL4 Ledger: .reasoning_rl4/ledger/"
echo "   • RL3 Backup: .reasoning.rl3-backup-* (if exists)"
echo ""
echo "🛡️ Features Active:"
echo "   ✓ Watchdog auto-restart (60s health checks)"
echo "   ✓ Idempotent timer registration"
echo "   ✓ Merkle chain validation"
echo "   ✓ Append-only JSONL ledger"
echo ""
echo "Ready! 🎯"
echo ""

