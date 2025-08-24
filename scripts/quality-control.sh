#!/bin/bash

# Quality Control - Opens QA Verifier in New Shell Window
# Usage: ./scripts/quality-control.sh

PROJECT_DIR=$(pwd)
QA_SCRIPT="$PROJECT_DIR/scripts/qa-verifier.js"

echo "🔍 Launching Quality Control in new shell window..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - Open new Terminal window  
    PROJECT_NAME=$(basename "$PROJECT_DIR")
    osascript -e 'tell application "Terminal"' \
              -e 'activate' \
              -e "do script \"clear && echo '🔍 QUALITY CONTROL AGENT - $PROJECT_NAME' && echo '════════════════════════════════════════════' && echo '' && cd '$PROJECT_DIR' && node '$QA_SCRIPT'\"" \
              -e "set custom title of result to \"Quality Control - $PROJECT_NAME\"" \
              -e 'end tell'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - Try different terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "clear && echo '🔍 QUALITY CONTROL AGENT - $(basename $PROJECT_DIR)' && echo '════════════════════════════════════════════' && echo '' && cd '$PROJECT_DIR' && node '$QA_SCRIPT'; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -title "Quality Control - $(basename $PROJECT_DIR)" -e "bash -c 'clear && echo \"🔍 QUALITY CONTROL AGENT - $(basename $PROJECT_DIR)\" && echo \"════════════════════════════════════════════\" && echo \"\" && cd \"$PROJECT_DIR\" && node \"$QA_SCRIPT\"; exec bash'"
    else
        echo "❌ No supported terminal emulator found"
        exit 1
    fi
else
    # Windows/Other - Fallback to current shell
    echo "⚠️  New window not supported on this platform, running in current shell:"
    node "$QA_SCRIPT"
fi

echo "✅ Quality Control launched in new window"