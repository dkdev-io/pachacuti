#!/bin/bash
# Claude Code Session Initializer
# Automatically configures terminal on session start

# Source terminal naming system
source ~/devops/terminal-naming.sh

# Source DevOps commands
source ~/devops/quick-commands.sh

# Function to initialize Claude Code session
init_claude_session() {
    echo "═══════════════════════════════════════════════════════════"
    echo "          🚀 CLAUDE CODE SESSION STARTING"
    echo "═══════════════════════════════════════════════════════════"
    
    # Detect and set terminal name
    echo "📍 Detecting project context..."
    auto_name_terminal
    
    # Show current status
    echo ""
    echo "📊 Current Environment:"
    echo "  • Directory: $(pwd)"
    echo "  • Project: $(detect_project)"
    echo "  • Session: $(detect_session_type)"
    
    # Check for active dev servers
    local server_count=$(ps aux | grep -E "vite|webpack|next" | grep -v grep | wc -l | tr -d ' ')
    if [ "$server_count" -gt 0 ]; then
        echo ""
        echo "⚠️  Active dev servers detected: $server_count"
        echo "  Run 'dev-servers' to see details"
    fi
    
    # Check git status if in repo
    if [ -d .git ]; then
        local changes=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
        local branch=$(git branch --show-current 2>/dev/null)
        echo ""
        echo "📁 Git Status:"
        echo "  • Branch: $branch"
        echo "  • Uncommitted changes: $changes"
    fi
    
    # Load recent context from memory
    echo ""
    echo "💾 Loading session context..."
    npx claude-flow@alpha memory retrieve --key "devops/last-session" --namespace devops 2>/dev/null || echo "  • No previous session data"
    
    # Save current session start
    npx claude-flow@alpha memory store --key "devops/last-session" --value "Project: $(detect_project), Time: $(date '+%Y-%m-%d %H:%M')" --namespace devops 2>/dev/null
    
    echo ""
    echo "✅ Session ready! Commands available:"
    echo "  • 'name-help' - Terminal naming commands"
    echo "  • 'devops-monitor' - System status"
    echo "  • 'dev-health' - Quick health check"
    echo "═══════════════════════════════════════════════════════════"
}

# Hook for project switching
switch_project() {
    local target_project=$1
    
    if [ -z "$target_project" ]; then
        echo "Usage: switch-project <project-name>"
        echo "Available projects:"
        echo "  • crypto-campaign-unified"
        echo "  • claude-productivity-tools"
        echo "  • visual-verification"
        echo "  • VoterAnalytics"
        return 1
    fi
    
    # Find and navigate to project
    case "$target_project" in
        crypto|crypto-campaign)
            cd ~/crypto-campaign-unified 2>/dev/null || cd ~/crypto-campaign-setup 2>/dev/null
            ;;
        tools|productivity)
            cd ~/claude-productivity-tools
            ;;
        visual|verification)
            cd ~/visual-verification
            ;;
        voter|analytics)
            cd ~/VoterAnalytics 2>/dev/null || cd ~/voter-analytics 2>/dev/null
            ;;
        agentic|testing)
            cd ~/agentic-testing-tool 2>/dev/null || cd ~/agentic 2>/dev/null
            ;;
        *)
            cd ~/"$target_project" 2>/dev/null || { echo "Project not found: $target_project"; return 1; }
            ;;
    esac
    
    # Update terminal name
    auto_name_terminal
    
    # Show new context
    echo "Switched to: $(pwd)"
    git status --short 2>/dev/null | head -5
}

# Automatic naming on common operations
hook_git_operations() {
    # Override git commands to update terminal name
    git() {
        command git "$@"
        local result=$?
        
        # Update terminal name after certain git operations
        case "$1" in
            checkout|switch|pull|merge)
                auto_name_terminal
                ;;
        esac
        
        return $result
    }
}

# Task-based naming
start_task() {
    local task_type=$1
    local description=$2
    
    if [ -z "$task_type" ]; then
        echo "Usage: start-task <type> [description]"
        echo "Types: feature, bugfix, testing, refactor, review"
        return 1
    fi
    
    # Update terminal name
    local project=$(detect_project)
    case "$task_type" in
        feature|feat)
            set_terminal_title "${project}-Feature"
            ;;
        bugfix|bug|fix)
            set_terminal_title "${project}-BugFix"
            ;;
        test|testing)
            set_terminal_title "${project}-Testing"
            ;;
        refactor|refact)
            set_terminal_title "${project}-Refactor"
            ;;
        review)
            set_terminal_title "${project}-Review"
            ;;
        *)
            set_terminal_title "${project}-${task_type}"
            ;;
    esac
    
    # Store task context
    if [ -n "$description" ]; then
        npx claude-flow@alpha memory store --key "devops/current-task" --value "Type: $task_type, Desc: $description, Project: $project" --namespace devops 2>/dev/null
        echo "✓ Started task: $task_type - $description"
    else
        echo "✓ Started task: $task_type"
    fi
}

# End task and update terminal
end_task() {
    local project=$(detect_project)
    set_terminal_title "${project}-MainDev"
    npx claude-flow@alpha memory delete --key "devops/current-task" --namespace devops 2>/dev/null
    echo "✓ Task completed. Terminal reset to: ${project}-MainDev"
}

# Export new functions
export -f init_claude_session
export -f switch_project
export -f hook_git_operations
export -f start_task
export -f end_task

# Create aliases
alias claude-init='init_claude_session'
alias switch-project='switch_project'
alias start-task='start_task'
alias end-task='end_task'

# Auto-initialize on source
if [ -z "$CLAUDE_SESSION_INITIALIZED" ]; then
    export CLAUDE_SESSION_INITIALIZED=1
    init_claude_session
fi