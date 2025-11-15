#!/bin/bash
# Try to install VSIX extension in VS Code or Cursor

VSIX="reasoning-layer-rl4-3.4.0.vsix"
VSIX_PATH="$(pwd)/$VSIX"

# Try VS Code
if [ -d "/Applications/Visual Studio Code.app" ]; then
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension "$VSIX_PATH"
    exit $?
fi

# Try Cursor
if [ -d "/Applications/Cursor.app" ]; then
    "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" --install-extension "$VSIX_PATH"
    exit $?
fi

echo "❌ VS Code or Cursor not found in /Applications/"
echo "📦 VSIX ready: $VSIX_PATH"
echo "💡 Install manually: Open VS Code/Cursor → Extensions → ... → Install from VSIX"
exit 1
