#!/bin/bash
# Terminal.app Window Naming for macOS
# Format: TERMINAL #-DIRECTORY-TASK

# Set Terminal.app window title using AppleScript
set_terminal_title() {
    local window_num="$1"
    local title="$2"
    
    osascript <<EOF
tell application "Terminal"
    try
        set custom title of window $window_num to "$title"
    on error
        -- Window doesn't exist
    end try
end tell
EOF
}

# Set current window title (finds the frontmost window)
set_current_window() {
    local title="$1"
    
    osascript <<EOF
tell application "Terminal"
    set custom title of front window to "$title"
end tell
EOF
}

# Name all windows with default names
name_all_windows() {
    echo "Setting Terminal window names..."
    
    set_terminal_title 1 "TERMINAL 1-DEVOPS-MONITOR"
    set_terminal_title 2 "TERMINAL 2-CRYPTO-MAINDEV"
    set_terminal_title 3 "TERMINAL 3-VOTER-ANALYTICS"
    set_terminal_title 4 "TERMINAL 4-TOOLS-SETUP"
    set_terminal_title 5 "TERMINAL 5-AGENTIC-TESTING"
    
    echo "✓ Terminal windows named"
}

# Quick naming for specific windows
t1() {
    local dir="${1:-DEVOPS}"
    local task="${2:-MONITOR}"
    set_terminal_title 1 "TERMINAL 1-$dir-$task"
    echo "✓ Window 1: TERMINAL 1-$dir-$task"
}

t2() {
    local dir="${1:-CRYPTO}"
    local task="${2:-MAINDEV}"
    set_terminal_title 2 "TERMINAL 2-$dir-$task"
    echo "✓ Window 2: TERMINAL 2-$dir-$task"
}

t3() {
    local dir="${1:-VOTER}"
    local task="${2:-ANALYTICS}"
    set_terminal_title 3 "TERMINAL 3-$dir-$task"
    echo "✓ Window 3: TERMINAL 3-$dir-$task"
}

t4() {
    local dir="${1:-TOOLS}"
    local task="${2:-SETUP}"
    set_terminal_title 4 "TERMINAL 4-$dir-$task"
    echo "✓ Window 4: TERMINAL 4-$dir-$task"
}

t5() {
    local dir="${1:-AGENTIC}"
    local task="${2:-TESTING}"
    set_terminal_title 5 "TERMINAL 5-$dir-$task"
    echo "✓ Window 5: TERMINAL 5-$dir-$task"
}

# Name current window (frontmost)
name_this() {
    local num="${1:-1}"
    local dir="${2:-WORK}"
    local task="${3:-GENERAL}"
    set_current_window "TERMINAL $num-$dir-$task"
    echo "✓ Current window: TERMINAL $num-$dir-$task"
}

# List all Terminal windows
list_windows() {
    osascript <<EOF
tell application "Terminal"
    set windowList to {}
    repeat with w in windows
        set windowTitle to custom title of w
        if windowTitle is missing value then
            set windowTitle to "Untitled"
        end if
        set end of windowList to windowTitle
    end repeat
    return windowList
end tell
EOF
}

# Show help
terminal_help() {
    echo "🎯 Terminal.app Window Naming"
    echo "Format: TERMINAL #-DIRECTORY-TASK"
    echo ""
    echo "COMMANDS:"
    echo "  name_all_windows  - Set default names for all 5 windows"
    echo "  t1 [DIR] [TASK]   - Name window 1"
    echo "  t2 [DIR] [TASK]   - Name window 2"
    echo "  t3 [DIR] [TASK]   - Name window 3"
    echo "  t4 [DIR] [TASK]   - Name window 4"
    echo "  t5 [DIR] [TASK]   - Name window 5"
    echo "  name_this # DIR TASK - Name current window"
    echo "  list_windows      - List all window titles"
    echo ""
    echo "EXAMPLES:"
    echo "  t1 CRYPTO BUGFIX"
    echo "  t2 VOTER FEATURE"
    echo "  name_this 1 DEVOPS MONITOR"
    echo ""
    echo "DIRECTORIES: CRYPTO, VOTER, TOOLS, DEVOPS, AGENTIC, VISUAL"
    echo "TASKS: MAINDEV, BUGFIX, FEATURE, TESTING, MONITOR, SETUP"
}

# Export functions
export -f set_terminal_title
export -f set_current_window
export -f name_this

echo "✅ Terminal.app Naming System Loaded!"
echo "Run 'terminal_help' for commands"