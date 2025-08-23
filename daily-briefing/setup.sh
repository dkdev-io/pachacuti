#!/bin/bash

# Daily Briefing Setup Script
# Sets up automatic daily briefing when opening pachacuti

echo "🚀 Setting up Claude Code Daily Briefing..."

# Get the directory of this script
BRIEFING_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create shell configuration based on detected shell
setup_shell_config() {
    local shell_rc=""
    
    # Detect shell
    if [ -n "$ZSH_VERSION" ]; then
        shell_rc="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        shell_rc="$HOME/.bashrc"
    else
        echo "⚠️  Unknown shell. Please add manually to your shell config."
        return 1
    fi
    
    # Check if already configured
    if grep -q "daily-briefing" "$shell_rc" 2>/dev/null; then
        echo "✅ Already configured in $shell_rc"
        return 0
    fi
    
    # Add briefing to shell config
    cat >> "$shell_rc" << EOF

# Claude Code Daily Briefing
# Auto-run when entering pachacuti directory
claude-briefing() {
    if [ "\$(basename \"\$PWD\")" = "pachacuti" ]; then
        if [ -f "$BRIEFING_DIR/daily-briefing.js" ]; then
            # Check if already run today
            TODAY=\$(date +%Y-%m-%d)
            LAST_RUN_FILE="$BRIEFING_DIR/data/.last-run"
            
            if [ -f "\$LAST_RUN_FILE" ]; then
                LAST_RUN=\$(cat "\$LAST_RUN_FILE")
                if [ "\$LAST_RUN" = "\$TODAY" ]; then
                    echo "📅 Daily briefing already shown today. Run 'briefing' to see it again."
                    return
                fi
            fi
            
            # Run briefing
            node "$BRIEFING_DIR/daily-briefing.js"
            
            # Mark as run
            echo "\$TODAY" > "\$LAST_RUN_FILE"
        fi
    fi
}

# Add to cd command
cd() {
    builtin cd "\$@" && claude-briefing
}

# Manual briefing command
alias briefing='node $BRIEFING_DIR/daily-briefing.js'
alias brief='briefing'

# Quick access to recommendations
alias recs='node $BRIEFING_DIR/daily-briefing.js | grep -A 20 "Recommendations"'
EOF
    
    echo "✅ Added to $shell_rc"
    echo "   Briefing will auto-run when entering pachacuti"
    echo "   Use 'briefing' or 'brief' command to run manually"
}

# Create VS Code task
setup_vscode_task() {
    local vscode_dir="$BRIEFING_DIR/../.vscode"
    local tasks_file="$vscode_dir/tasks.json"
    
    # Create .vscode directory if it doesn't exist
    mkdir -p "$vscode_dir"
    
    # Create or update tasks.json
    if [ -f "$tasks_file" ]; then
        echo "⚠️  .vscode/tasks.json exists. Please add task manually."
    else
        cat > "$tasks_file" << 'EOF'
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Daily Briefing",
            "type": "shell",
            "command": "node",
            "args": ["${workspaceFolder}/daily-briefing/daily-briefing.js"],
            "group": "none",
            "presentation": {
                "reveal": "always",
                "panel": "new"
            },
            "problemMatcher": [],
            "runOptions": {
                "runOn": "folderOpen"
            }
        }
    ]
}
EOF
        echo "✅ Created VS Code task (runs on folder open)"
    fi
}

# Create cron job for daily updates
setup_cron() {
    local cron_cmd="0 9 * * * cd $BRIEFING_DIR && node daily-briefing.js > $BRIEFING_DIR/reports/daily-\$(date +\%Y-\%m-\%d).log 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "daily-briefing"; then
        echo "✅ Cron job already configured"
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$cron_cmd") | crontab -
        echo "✅ Added daily cron job (9 AM)"
    fi
}

# Create launch agent for macOS
setup_launchd() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local plist_file="$HOME/Library/LaunchAgents/com.claude.daily-briefing.plist"
        
        cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.daily-briefing</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$BRIEFING_DIR/daily-briefing.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$BRIEFING_DIR/reports/daily.log</string>
    <key>StandardErrorPath</key>
    <string>$BRIEFING_DIR/reports/error.log</string>
</dict>
</plist>
EOF
        
        launchctl load "$plist_file" 2>/dev/null
        echo "✅ Created macOS launch agent"
    fi
}

# Main setup
main() {
    echo ""
    echo "Setting up automatic daily briefing..."
    echo ""
    
    # Create required directories
    mkdir -p "$BRIEFING_DIR/data"
    mkdir -p "$BRIEFING_DIR/reports"
    
    # Make scripts executable
    chmod +x "$BRIEFING_DIR/daily-briefing.js"
    chmod +x "$BRIEFING_DIR/scripts/"*.js
    
    # Setup based on environment
    setup_shell_config
    setup_vscode_task
    
    # Ask about scheduled runs
    read -p "Set up daily automatic run at 9 AM? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            setup_launchd
        else
            setup_cron
        fi
    fi
    
    echo ""
    echo "✨ Setup complete!"
    echo ""
    echo "Usage:"
    echo "  • Auto-runs when you cd into pachacuti"
    echo "  • Run manually: 'briefing' or 'brief'"
    echo "  • View recommendations: 'recs'"
    echo ""
    echo "Please restart your terminal or run: source ~/.zshrc (or ~/.bashrc)"
}

# Run main setup
main