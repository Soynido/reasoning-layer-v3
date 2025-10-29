#!/bin/bash

# 🧠 Reasoning Shell (RL3) - Installation Script
# 
# Installe le binaire global 'rl3' pour un accès universel

echo "🧠 Installing Reasoning Shell (RL3)..."
echo ""

# Check if rl3 binary exists
if [ ! -f "rl3" ]; then
    echo "❌ Error: rl3 binary not found in current directory"
    exit 1
fi

# Make rl3 executable
chmod +x rl3
echo "✅ Made rl3 executable"

# Copy to /usr/local/bin (requires sudo)
echo "📦 Installing to /usr/local/bin/rl3 (requires sudo)..."
sudo cp rl3 /usr/local/bin/rl3

if [ $? -eq 0 ]; then
    echo "✅ rl3 installed successfully!"
    echo ""
    echo "🎉 You can now use 'rl3' from anywhere:"
    echo ""
    echo "   $ rl3                    # Start interactive shell"
    echo "   $ rl3 synthesize --goal='your goal'"
    echo "   $ rl3 analyze"
    echo "   $ rl3 report"
    echo ""
else
    echo "❌ Installation failed"
    exit 1
fi

