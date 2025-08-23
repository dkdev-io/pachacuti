#!/bin/bash
# Launch Agent Dashboard in Browser

DASHBOARD_PATH="$HOME/pachacuti/devops/agent-dashboard.html"

if [ -f "$DASHBOARD_PATH" ]; then
    echo "🚀 Launching Claude Code Agent Dashboard..."
    open "$DASHBOARD_PATH"
    echo "✅ Dashboard opened in your default browser"
    echo ""
    echo "Features:"
    echo "  • Auto-refresh every 30 seconds"
    echo "  • Live agent status monitoring"
    echo "  • Project activity tracking"
    echo "  • Session statistics"
    echo ""
    echo "Dashboard URL: file://$DASHBOARD_PATH"
else
    echo "❌ Dashboard not found at $DASHBOARD_PATH"
    echo "Run this from the pachacuti directory"
fi