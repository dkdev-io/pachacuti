#!/bin/bash

# Quality Control Shell Spawner
# Opens new terminal window and runs QA verifier

PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "🔍 Starting Quality Control Agent..."
echo "📁 Project: $PROJECT_NAME"
echo "📂 Directory: $PROJECT_DIR"
echo ""

# Detect OS and open appropriate terminal
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - Use AppleScript to open new Terminal window
    osascript -e "
    tell application \"Terminal\"
        do script \"cd '$PROJECT_DIR' && clear && echo '🎯 QA VERIFICATION AGENT - $PROJECT_NAME' && echo '═══════════════════════════════════════════' && echo '' && node '$PROJECT_DIR/scripts/qa-verifier.js'\"
        activate
    end tell"
    
    echo "✅ QA Agent opened in new Terminal window"
    echo ""
    echo "📋 Next steps:"
    echo "1. Wait for initial analysis to complete"
    echo "2. Copy your agent's work summary"
    echo "3. In the new window, type: qc confirm \"[paste summary]\""
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - Try various terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$PROJECT_DIR' && node '$PROJECT_DIR/scripts/qa-verifier.js'; exec bash"
    elif command -v konsole &> /dev/null; then
        konsole -e bash -c "cd '$PROJECT_DIR' && node '$PROJECT_DIR/scripts/qa-verifier.js'; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e bash -c "cd '$PROJECT_DIR' && node '$PROJECT_DIR/scripts/qa-verifier.js'; exec bash"
    else
        echo "⚠️  No supported terminal emulator found"
        echo "Run manually: node $PROJECT_DIR/scripts/qa-verifier.js"
    fi
    
    echo "✅ QA Agent opened in new terminal window"
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start cmd.exe /k "cd /d $PROJECT_DIR && node scripts/qa-verifier.js"
    echo "✅ QA Agent opened in new window"
    
else
    echo "⚠️  Unsupported OS: $OSTYPE"
    echo "Run manually: node $PROJECT_DIR/scripts/qa-verifier.js"
fi