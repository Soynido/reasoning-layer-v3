# Installation Instructions

## GitHub Integration Setup - Manual Installation

### Step 1: Find your VS Code installation

Try one of these:

```bash
# Check if VS Code is in PATH
which code

# Or find the binary manually
find ~ -name "code" -type f 2>/dev/null | grep -i "visual\|vscode"
```

### Step 2: Install the extension manually

If you found the `code` binary:

```bash
code --install-extension reasoning-layer-v3-1.0.0.vsix --force
```

### Step 3: Alternative - Install via VS Code UI

1. Open VS Code
2. Go to Extensions view (Cmd+Shift+X)
3. Click the "..." menu (top right)
4. Select "Install from VSIX..."
5. Choose `reasoning-layer-v3-1.0.0.vsix`

## Testing the GitHub Integration

Once installed:

1. **Press** `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. **Type**: `Setup GitHub Integration`
3. **Select** the command
4. You should see a dialog with 3 options:
   - **Setup Token** - Enter your existing token
   - **Get Token** - Opens GitHub to create a new token
   - **Skip** - Cancel

## What's New

✅ **GitHubTokenManager** - Secure token storage in VS Code settings
✅ **Setup Dialog** - User-friendly GitHub integration setup
✅ **Clear Token Command** - Easy token removal
✅ **Auto-detect GitHub Repo** - Reads `.git/config`

## Troubleshooting

If the command doesn't appear:

1. **Reload VS Code**: `Cmd+Shift+P` → "Developer: Reload Window"
2. **Check extension is active**: Output panel → "Reasoning Layer V3"
3. **Verify command registration**: Extensions panel → search "Reasoning Layer V3"


