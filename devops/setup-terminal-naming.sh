#!/bin/bash
# One-time setup script for terminal naming system

echo "🔧 Setting up Terminal Naming System..."

# Make scripts executable
chmod +x ~/devops/terminal-naming.sh
chmod +x ~/devops/claude-session-init.sh

# Add to shell profile for automatic loading
SHELL_PROFILE=""

# Detect shell and profile file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
    echo "Detected Zsh shell"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
    if [ ! -f "$SHELL_PROFILE" ]; then
        SHELL_PROFILE="$HOME/.bash_profile"
    fi
    echo "Detected Bash shell"
fi

# Add terminal naming to shell profile
if [ -n "$SHELL_PROFILE" ] && [ -f "$SHELL_PROFILE" ]; then
    # Check if already added
    if ! grep -q "devops/terminal-naming.sh" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Pachactui Terminal Naming System" >> "$SHELL_PROFILE"
        echo "[ -f ~/devops/terminal-naming.sh ] && source ~/devops/terminal-naming.sh" >> "$SHELL_PROFILE"
        echo "✅ Added terminal naming to $SHELL_PROFILE"
    else
        echo "✓ Terminal naming already in $SHELL_PROFILE"
    fi
    
    # Add Claude session init
    if ! grep -q "devops/claude-session-init.sh" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Claude Code Session Initializer" >> "$SHELL_PROFILE"
        echo "# Uncomment the line below to auto-initialize Claude sessions" >> "$SHELL_PROFILE"
        echo "# [ -f ~/devops/claude-session-init.sh ] && source ~/devops/claude-session-init.sh" >> "$SHELL_PROFILE"
        echo "✅ Added Claude session init to $SHELL_PROFILE (commented)"
    else
        echo "✓ Claude session init already in $SHELL_PROFILE"
    fi
fi

# Create quick reference card
cat > ~/devops/TERMINAL_NAMING_GUIDE.md << 'EOF'
# 🎯 Terminal Naming Quick Reference

## Automatic Commands
```bash
auto-name           # Auto-detect project & session type
smart-name          # Use git branch for context
claude-init         # Initialize Claude Code session
```

## Manual Naming
```bash
name-window "Custom-Title"    # Set any custom title
```

## Project Shortcuts
```bash
# Crypto Campaign
name-crypto-main    # Crypto-MainDev
name-crypto-bug     # Crypto-BugFix
name-crypto-feature # Crypto-Feature

# Voter Analytics
name-voter-main     # Voter-MainDev
name-voter-bugs     # Voter-BugFix
name-voter-analytics # Voter-Analytics

# Other Projects
name-tools-main     # Tools-MainDev
name-agentic-arch   # Agentic-Architecture
name-agentic-test   # Agentic-Testing
name-devops         # DevOps-Monitor
```

## Session Types
```bash
name-feature        # [Current-Project]-Feature
name-bugfix         # [Current-Project]-BugFix
name-testing        # [Current-Project]-Testing
name-review         # [Current-Project]-Review
name-refactor       # [Current-Project]-Refactor
```

## Task Management
```bash
start-task feature "User authentication"  # Start & name
start-task bugfix "Fix login issue"      # Start & name
end-task                                  # Complete & reset
```

## Project Switching
```bash
switch-project crypto     # Switch to crypto-campaign
switch-project tools      # Switch to productivity-tools
switch-project voter      # Switch to VoterAnalytics
```

## Help
```bash
name-help          # Show all naming commands
```

## Auto-Activation
To automatically name terminals on startup, add to your shell profile:
```bash
source ~/devops/claude-session-init.sh
```
EOF

echo "✅ Created terminal naming guide"

# Test the system
echo ""
echo "🧪 Testing terminal naming system..."
source ~/devops/terminal-naming.sh
auto_name_terminal

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ TERMINAL NAMING SYSTEM INSTALLED!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🚀 Quick Start:"
echo "  1. Run: source ~/devops/terminal-naming.sh"
echo "  2. Try: auto-name"
echo "  3. See guide: cat ~/devops/TERMINAL_NAMING_GUIDE.md"
echo ""
echo "📝 For automatic loading in new terminals:"
echo "  Add to your shell profile (~/.zshrc or ~/.bashrc):"
echo "  source ~/devops/terminal-naming.sh"
echo ""
echo "💡 Commands now available:"
echo "  • auto-name - Auto-detect and name"
echo "  • name-help - Show all commands"
echo "  • name-window 'Title' - Custom name"
echo "═══════════════════════════════════════════════════════════"