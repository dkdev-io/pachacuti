#!/bin/bash

# Direct QA launcher - runs in current terminal if new window fails

echo "🎯 QA VERIFICATION AGENT"
echo "═══════════════════════════════════════════"
echo ""

# Try to open in new window first
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Try to open new Terminal tab instead of window (more reliable)
    osascript -e 'tell application "Terminal"' \
              -e 'tell application "System Events" to keystroke "t" using command down' \
              -e 'delay 0.5' \
              -e "do script \"cd $(pwd) && node scripts/qa-verifier.js\" in selected tab of the front window" \
              -e 'end tell' 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ QA Agent opened in new Terminal tab"
        echo "Look for the new tab in your Terminal window"
    else
        # If that fails, just run it here
        echo "Running QA Agent in current terminal..."
        echo ""
        node scripts/qa-verifier.js
    fi
else
    # For other systems, run directly
    node scripts/qa-verifier.js
fi