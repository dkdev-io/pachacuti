#!/bin/bash
# Pachactui Terminal Naming System v1.0
# Automatic terminal window organization for Claude Code sessions

# Function to set terminal title
set_terminal_title() {
    echo -ne "\033]0;$1\007"
}

# Function to detect current project
detect_project() {
    local current_dir=$(pwd)
    
    if [[ "$current_dir" == *"crypto-campaign"* ]]; then
        echo "Crypto"
    elif [[ "$current_dir" == *"voter"* ]] || [[ "$current_dir" == *"VoterAnalytics"* ]]; then
        echo "Voter"
    elif [[ "$current_dir" == *"claude-productivity-tools"* ]]; then
        echo "Tools"
    elif [[ "$current_dir" == *"visual-verification"* ]]; then
        echo "Visual"
    elif [[ "$current_dir" == *"agentic"* ]]; then
        echo "Agentic"
    elif [[ "$current_dir" == *"note-clarify"* ]]; then
        echo "Notes"
    elif [[ "$current_dir" == *"habit-tracker"* ]]; then
        echo "Habits"
    elif [[ "$current_dir" == *"api_request_bot"* ]]; then
        echo "ApiBot"
    elif [[ "$current_dir" == *"devops"* ]]; then
        echo "DevOps"
    else
        echo "Dev"
    fi
}

# Function to detect session type based on git status and recent commands
detect_session_type() {
    # Check if we're in a git repo
    if [ -d .git ]; then
        # Check for uncommitted changes
        changes=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
        
        # Check recent git operations
        last_command=$(history | tail -1 | awk '{$1=""; print $0}')
        
        if [[ "$last_command" == *"fix"* ]] || [[ "$last_command" == *"bug"* ]]; then
            echo "BugFix"
        elif [[ "$last_command" == *"test"* ]]; then
            echo "Testing"
        elif [[ "$last_command" == *"feature"* ]] || [[ "$changes" -gt 5 ]]; then
            echo "Feature"
        elif [[ "$last_command" == *"refactor"* ]]; then
            echo "Refactor"
        elif [[ "$last_command" == *"deploy"* ]] || [[ "$last_command" == *"build"* ]]; then
            echo "Deploy"
        elif [[ "$last_command" == *"review"* ]]; then
            echo "Review"
        else
            echo "MainDev"
        fi
    else
        echo "Setup"
    fi
}

# Automatic naming function
auto_name_terminal() {
    local project=$(detect_project)
    local session_type=$(detect_session_type)
    local title="${project}-${session_type}"
    
    set_terminal_title "$title"
    echo "✓ Terminal named: $title"
}

# Manual naming shortcuts
name_window() {
    if [ -z "$1" ]; then
        echo "Usage: name-window <title>"
        echo "Example: name-window Crypto-MainDev"
        return 1
    fi
    set_terminal_title "$1"
    echo "✓ Terminal renamed to: $1"
}

# Project-specific quick names
name_crypto_main() {
    set_terminal_title "Crypto-MainDev"
    echo "✓ Terminal: Crypto-MainDev"
}

name_crypto_bug() {
    set_terminal_title "Crypto-BugFix"
    echo "✓ Terminal: Crypto-BugFix"
}

name_crypto_feature() {
    set_terminal_title "Crypto-Feature"
    echo "✓ Terminal: Crypto-Feature"
}

name_voter_main() {
    set_terminal_title "Voter-MainDev"
    echo "✓ Terminal: Voter-MainDev"
}

name_voter_bugs() {
    set_terminal_title "Voter-BugFix"
    echo "✓ Terminal: Voter-BugFix"
}

name_voter_analytics() {
    set_terminal_title "Voter-Analytics"
    echo "✓ Terminal: Voter-Analytics"
}

name_tools_main() {
    set_terminal_title "Tools-MainDev"
    echo "✓ Terminal: Tools-MainDev"
}

name_agentic_arch() {
    set_terminal_title "Agentic-Architecture"
    echo "✓ Terminal: Agentic-Architecture"
}

name_agentic_test() {
    set_terminal_title "Agentic-Testing"
    echo "✓ Terminal: Agentic-Testing"
}

name_devops() {
    set_terminal_title "DevOps-Monitor"
    echo "✓ Terminal: DevOps-Monitor"
}

# Session type shortcuts
name_feature() {
    local project=$(detect_project)
    set_terminal_title "${project}-Feature"
    echo "✓ Terminal: ${project}-Feature"
}

name_bugfix() {
    local project=$(detect_project)
    set_terminal_title "${project}-BugFix"
    echo "✓ Terminal: ${project}-BugFix"
}

name_testing() {
    local project=$(detect_project)
    set_terminal_title "${project}-Testing"
    echo "✓ Terminal: ${project}-Testing"
}

name_review() {
    local project=$(detect_project)
    set_terminal_title "${project}-Review"
    echo "✓ Terminal: ${project}-Review"
}

name_refactor() {
    local project=$(detect_project)
    set_terminal_title "${project}-Refactor"
    echo "✓ Terminal: ${project}-Refactor"
}

# Update terminal title on directory change
update_on_cd() {
    # Override the cd command
    cd() {
        builtin cd "$@"
        auto_name_terminal
    }
}

# Smart context-aware naming
smart_name() {
    local git_branch=$(git branch --show-current 2>/dev/null)
    local project=$(detect_project)
    
    if [[ "$git_branch" == *"feature"* ]]; then
        set_terminal_title "${project}-Feature"
    elif [[ "$git_branch" == *"fix"* ]] || [[ "$git_branch" == *"bug"* ]]; then
        set_terminal_title "${project}-BugFix"
    elif [[ "$git_branch" == *"refactor"* ]]; then
        set_terminal_title "${project}-Refactor"
    elif [[ "$git_branch" == *"test"* ]]; then
        set_terminal_title "${project}-Testing"
    else
        auto_name_terminal
    fi
}

# List available naming commands
name_help() {
    echo "🎯 Terminal Naming Commands"
    echo "=========================="
    echo ""
    echo "AUTOMATIC:"
    echo "  auto-name         - Auto-detect and name terminal"
    echo "  smart-name        - Context-aware naming (uses git branch)"
    echo ""
    echo "MANUAL:"
    echo "  name-window <title>  - Set custom title"
    echo ""
    echo "PROJECT SHORTCUTS:"
    echo "  name-crypto-main     - Crypto-MainDev"
    echo "  name-crypto-bug      - Crypto-BugFix"
    echo "  name-crypto-feature  - Crypto-Feature"
    echo "  name-voter-main      - Voter-MainDev"
    echo "  name-voter-bugs      - Voter-BugFix"
    echo "  name-voter-analytics - Voter-Analytics"
    echo "  name-tools-main      - Tools-MainDev"
    echo "  name-agentic-arch    - Agentic-Architecture"
    echo "  name-agentic-test    - Agentic-Testing"
    echo "  name-devops          - DevOps-Monitor"
    echo ""
    echo "SESSION TYPE:"
    echo "  name-feature      - [Project]-Feature"
    echo "  name-bugfix       - [Project]-BugFix"
    echo "  name-testing      - [Project]-Testing"
    echo "  name-review       - [Project]-Review"
    echo "  name-refactor     - [Project]-Refactor"
    echo ""
    echo "Current Terminal: $(echo -ne '\033]0;\007')"
}

# Export functions for use in shell
export -f set_terminal_title
export -f detect_project
export -f detect_session_type
export -f auto_name_terminal
export -f name_window
export -f smart_name

# Create aliases
alias auto-name='auto_name_terminal'
alias smart-name='smart_name'
alias name-help='name_help'

echo "✅ Terminal Naming System Loaded!"
echo "Run 'name-help' for available commands"