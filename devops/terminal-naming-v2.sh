#!/bin/bash
# Pachactui Terminal Naming System v2.0
# Format: TERMINAL #-DIRECTORY-TASK

# Terminal counter (increment for each new terminal)
TERMINAL_NUMBER=${TERMINAL_NUMBER:-1}

# Force set terminal title with all methods
force_set_title() {
    local title="$1"
    # Try all escape sequences
    echo -ne "\033]0;${title}\007"
    echo -ne "\033]1;${title}\007"
    echo -ne "\033]2;${title}\007"
    printf '\033]0;%s\007' "$title"
    printf '\033]2;%s\033\\' "$title"
    echo -e "\033]0;${title}\a"
}

# Detect current directory (shortened)
get_directory() {
    local dir=$(basename $(pwd))
    case "$dir" in
        crypto-campaign*) echo "CRYPTO";;
        voter*|VoterAnalytics*) echo "VOTER";;
        claude-productivity-tools) echo "TOOLS";;
        visual-verification) echo "VISUAL";;
        agentic*) echo "AGENTIC";;
        devops) echo "DEVOPS";;
        note-clarify*) echo "NOTES";;
        habit-tracker) echo "HABITS";;
        api_request_bot) echo "APIBOT";;
        ~|Danallovertheplace) echo "HOME";;
        *) echo "${dir^^}" | cut -c1-10;;  # Uppercase, max 10 chars
    esac
}

# Detect current task type
get_task() {
    local task="${1:-WORK}"
    case "$task" in
        main|dev) echo "MAINDEV";;
        bug|fix|bugfix) echo "BUGFIX";;
        feature|feat) echo "FEATURE";;
        test|testing) echo "TESTING";;
        refactor|refact) echo "REFACTOR";;
        review) echo "REVIEW";;
        deploy) echo "DEPLOY";;
        monitor) echo "MONITOR";;
        setup) echo "SETUP";;
        *) echo "${task^^}" | cut -c1-10;;
    esac
}

# Main naming function
name_terminal() {
    local num="${1:-1}"
    local dir="${2:-$(get_directory)}"
    local task="${3:-WORK}"
    
    local title="TERMINAL ${num}-${dir}-$(get_task $task)"
    force_set_title "$title"
    echo "✓ Terminal set to: $title"
}

# Quick naming commands
name1() {
    name_terminal 1 "$(get_directory)" "${1:-WORK}"
}

name2() {
    name_terminal 2 "$(get_directory)" "${1:-WORK}"
}

name3() {
    name_terminal 3 "$(get_directory)" "${1:-WORK}"
}

# Project-specific quick names with terminal numbers
t1_crypto() {
    name_terminal 1 "CRYPTO" "${1:-MAINDEV}"
}

t1_voter() {
    name_terminal 1 "VOTER" "${1:-MAINDEV}"
}

t1_tools() {
    name_terminal 1 "TOOLS" "${1:-MAINDEV}"
}

t1_devops() {
    name_terminal 1 "DEVOPS" "MONITOR"
}

t2_crypto() {
    name_terminal 2 "CRYPTO" "${1:-MAINDEV}"
}

t2_voter() {
    name_terminal 2 "VOTER" "${1:-MAINDEV}"
}

t2_tools() {
    name_terminal 2 "TOOLS" "${1:-MAINDEV}"
}

t2_devops() {
    name_terminal 2 "DEVOPS" "MONITOR"
}

# Auto name based on current directory
auto_name() {
    local num="${1:-1}"
    local task="${2:-WORK}"
    name_terminal "$num" "$(get_directory)" "$task"
}

# Manual full control
set_terminal() {
    if [ $# -lt 3 ]; then
        echo "Usage: set_terminal <number> <directory> <task>"
        echo "Example: set_terminal 1 CRYPTO BUGFIX"
        return 1
    fi
    name_terminal "$1" "$2" "$3"
}

# Help function
terminal_help() {
    echo "🎯 Terminal Naming System v2.0"
    echo "Format: TERMINAL #-DIRECTORY-TASK"
    echo ""
    echo "QUICK COMMANDS:"
    echo "  name1 [task]     - Name as Terminal 1 (auto-detect dir)"
    echo "  name2 [task]     - Name as Terminal 2 (auto-detect dir)"
    echo "  name3 [task]     - Name as Terminal 3 (auto-detect dir)"
    echo ""
    echo "  t1_crypto [task] - Terminal 1 for Crypto project"
    echo "  t1_voter [task]  - Terminal 1 for Voter project"
    echo "  t1_tools [task]  - Terminal 1 for Tools project"
    echo "  t1_devops        - Terminal 1 for DevOps monitoring"
    echo ""
    echo "  t2_crypto [task] - Terminal 2 for Crypto project"
    echo "  t2_voter [task]  - Terminal 2 for Voter project"
    echo "  t2_tools [task]  - Terminal 2 for Tools project"
    echo "  t2_devops        - Terminal 2 for DevOps monitoring"
    echo ""
    echo "MANUAL CONTROL:"
    echo "  set_terminal <num> <dir> <task>"
    echo "  Example: set_terminal 1 CRYPTO BUGFIX"
    echo ""
    echo "TASK TYPES:"
    echo "  MAINDEV, BUGFIX, FEATURE, TESTING, REFACTOR, REVIEW, DEPLOY, MONITOR, SETUP"
    echo ""
    echo "DIRECTORIES:"
    echo "  CRYPTO, VOTER, TOOLS, VISUAL, AGENTIC, DEVOPS, NOTES, HABITS, APIBOT"
}

# Export all functions
export -f force_set_title
export -f get_directory
export -f get_task
export -f name_terminal
export -f auto_name
export -f set_terminal

# Aliases
alias tname='name_terminal'
alias thelp='terminal_help'

echo "✅ Terminal Naming v2.0 Loaded! (Format: TERMINAL #-DIRECTORY-TASK)"
echo "Use 'thelp' for commands"