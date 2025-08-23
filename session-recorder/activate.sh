#!/bin/bash

# Pachacuti Session Recorder Activation Script
# Activates the second brain system for immediate use

echo "🧠 Activating Pachacuti Second Brain System..."

# Navigate to session recorder directory
cd "$(dirname "$0")"

# Ensure setup is complete
if [ ! -f ".env" ]; then
    echo "⚠️  System not initialized. Running setup..."
    ./setup.sh
fi

# Create systemd service for auto-start (Linux)
if command -v systemctl >/dev/null 2>&1; then
    echo "🔧 Installing systemd service..."
    sudo cp pachacuti-session-recorder.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable pachacuti-session-recorder
    echo "✅ Systemd service installed and enabled"
fi

# Create LaunchAgent for macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Creating macOS LaunchAgent..."
    
    PLIST_PATH="$HOME/Library/LaunchAgents/com.pachacuti.session-recorder.plist"
    CURRENT_DIR="$(pwd)"
    
    cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pachacuti.session-recorder</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$CURRENT_DIR/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$CURRENT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$CURRENT_DIR/logs/session-recorder.log</string>
    <key>StandardErrorPath</key>
    <string>$CURRENT_DIR/logs/session-recorder-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

    # Load the service
    launchctl load "$PLIST_PATH"
    echo "✅ macOS LaunchAgent created and loaded"
fi

# Start the session recorder
echo "🚀 Starting session recorder..."
npm start &
SESSION_PID=$!

# Wait a moment for startup
sleep 3

# Check if it's running
if ps -p $SESSION_PID > /dev/null; then
    echo "✅ Session recorder started successfully (PID: $SESSION_PID)"
    echo "$SESSION_PID" > .recorder_pid
else
    echo "❌ Failed to start session recorder"
    exit 1
fi

# Run initial history recovery
echo "🔍 Running initial history recovery..."
node lib/history-recovery.js &

# Generate initial reports
echo "📊 Generating initial reports..."
node lib/daily-summary.js --now &
node lib/weekly-summary.js --now &

# Test the integration
echo "🧪 Testing Pachacuti integration..."
node lib/pachacuti-integration.js &

# Wait for background tasks
wait

# Display activation summary
echo ""
echo "🎉 PACHACUTI SECOND BRAIN SYSTEM ACTIVATED!"
echo ""
echo "🎯 System Status:"
echo "  📡 Session Recorder: Running (PID: $SESSION_PID)"
echo "  🗃️  Knowledge Base: Initialized"
echo "  📊 Reports: Auto-generating"
echo "  🔗 Pachacuti Integration: Active"
echo ""
echo "🚀 Quick Commands:"
echo "  node cli.js status     - Check system status"
echo "  node cli.js search     - Search knowledge base"
echo "  node cli.js report     - Generate reports"
echo "  npm run daily         - Daily summary"
echo "  npm run weekly        - Weekly analysis"
echo ""
echo "📚 The system is now capturing all development sessions automatically."
echo "    Your work history, decisions, and solutions are being documented."
echo ""
echo "🔍 Access your second brain:"
echo "  - Search past work: node cli.js search 'keyword'"
echo "  - View daily progress: cat reports/daily/$(date +%Y-%m-%d).md"
echo "  - CTO insights: ls reports/cto/"
echo ""
echo "✨ Happy coding! Your second brain is watching and learning."