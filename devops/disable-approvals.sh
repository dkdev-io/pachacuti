#!/bin/bash
# Pachactui Approval System Disabler
# Completely disables all approval mechanisms

echo "🔧 Disabling ALL approval systems..."

# 1. Kill any running Slack receiver processes
echo "Stopping Slack receivers..."
pkill -f slack-receiver 2>/dev/null && echo "  ✓ Slack receiver stopped" || echo "  • No Slack receiver running"

# 2. Disable Claude-Flow hooks
echo "Disabling Claude-Flow hooks..."
export CLAUDE_FLOW_HOOKS_ENABLED=false
echo "  ✓ Hooks disabled in current session"

# 3. Update shell profile to persist settings
SHELL_PROFILE=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
    [ ! -f "$SHELL_PROFILE" ] && SHELL_PROFILE="$HOME/.bash_profile"
fi

if [ -n "$SHELL_PROFILE" ] && [ -f "$SHELL_PROFILE" ]; then
    # Comment out any slack-receiver startup
    if grep -q "slack-receiver" "$SHELL_PROFILE"; then
        sed -i.backup 's/^[^#]*slack-receiver/# &/' "$SHELL_PROFILE"
        echo "  ✓ Disabled Slack receiver in $SHELL_PROFILE"
    fi
    
    # Add hook disable to profile if not present
    if ! grep -q "CLAUDE_FLOW_HOOKS_ENABLED=false" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Disable Claude-Flow hooks (added by Pachactui)" >> "$SHELL_PROFILE"
        echo "export CLAUDE_FLOW_HOOKS_ENABLED=false" >> "$SHELL_PROFILE"
        echo "  ✓ Added hook disable to $SHELL_PROFILE"
    fi
fi

# 4. Create a marker file to indicate approvals are disabled
mkdir -p ~/.claude
echo "$(date): Approvals disabled by Pachactui" > ~/.claude/.approvals-disabled
echo "  ✓ Created disable marker"

echo ""
echo "✅ APPROVAL SYSTEMS DISABLED!"
echo ""
echo "Changes made:"
echo "  • Slack receiver process killed"
echo "  • Claude-Flow hooks disabled"
echo "  • Shell profile updated to prevent re-enabling"
echo ""
echo "To re-enable approvals later, run:"
echo "  export CLAUDE_FLOW_HOOKS_ENABLED=true"
echo "  npm run slack-receiver (if needed)"