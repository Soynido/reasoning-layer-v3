#!/bin/bash

# Test script for Reasoning Shell

echo "🧪 Testing Reasoning Shell..."
echo ""

# Test 1: Single command execution
echo "📝 Test 1: Single synthesis command"
echo "Où en est le moteur cognitif ?" | ./rl3 shell &
PID=$!
sleep 3
kill $PID 2>/dev/null
echo ""

echo "✅ Tests completed!"
echo ""
echo "Pour tester manuellement:"
echo "  ./rl3"
echo ""
echo "Puis essayer:"
echo "  help"
echo "  context"
echo "  où en est la phase 2 ?"
echo "  exit"

