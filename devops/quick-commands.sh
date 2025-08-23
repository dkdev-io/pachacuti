#!/bin/bash
# Pachactui DevOps Quick Commands
# Source this file to add DevOps shortcuts to your shell

# Project Navigation
alias crypto="cd ~/crypto-campaign-unified && git status"
alias tools="cd ~/claude-productivity-tools && git status"
alias visual="cd ~/visual-verification && git status"
alias notes="cd ~/unfinished-apps-workspace/note-clarify-organizer && git status"

# DevOps Commands
alias devops="cd ~/devops"
alias devops-status="cat ~/devops/PROJECT_PORTFOLIO_DASHBOARD.md"
alias devops-monitor="bash ~/devops/monitor.sh"
alias devops-optimize="cat ~/devops/OPTIMIZATION_SYSTEM.md"

# Development Server Management
alias dev-servers="ps aux | grep -E 'vite|webpack|next' | grep -v grep"
alias kill-servers="pkill -f vite; pkill -f webpack; pkill -f 'react-scripts'"
alias dev-cleanup="kill-servers && echo 'Development servers terminated'"

# Resource Monitoring
alias node-count="ps aux | grep node | grep -v grep | wc -l"
alias node-memory="ps aux | grep node | grep -v grep | awk '{sum+=\$4} END {print \"Total Node Memory: \" sum \"%\"}'"
alias dev-resources="echo 'Node Processes:' && node-count && node-memory"

# Git Operations (Batch)
alias git-status-all="for d in ~/*/; do [ -d \"\$d/.git\" ] && echo \"\$(basename \$d):\" && (cd \"\$d\" && git status -s); done"
alias git-pull-all="for d in ~/*/; do [ -d \"\$d/.git\" ] && echo \"Pulling \$(basename \$d)...\" && (cd \"\$d\" && git pull); done"

# Project State Management
project-pause() {
    if [ -z "$1" ]; then
        echo "Usage: project-pause <project-name>"
        return 1
    fi
    echo "Pausing project: $1"
    cd ~/"$1" 2>/dev/null || { echo "Project not found"; return 1; }
    git add . && git commit -m "WIP: Pausing project for context switch" && echo "Project $1 paused successfully"
}

project-resume() {
    if [ -z "$1" ]; then
        echo "Usage: project-resume <project-name>"
        return 1
    fi
    echo "Resuming project: $1"
    cd ~/"$1" 2>/dev/null || { echo "Project not found"; return 1; }
    git status && echo "Project $1 resumed. Current status shown above."
}

# Context Switching Helper
switch-context() {
    echo "Current Development Context:"
    dev-servers
    echo ""
    echo "Active Projects:"
    git-status-all | grep -B1 "M \|A \|D " | grep -v "^--$"
    echo ""
    echo "Use 'project-pause <name>' before switching contexts"
}

# Quick Health Check
dev-health() {
    echo "🏥 Development Environment Health Check"
    echo "======================================="
    echo "Node Processes: $(node-count)"
    node-memory
    echo "Dev Servers: $(ps aux | grep -E 'vite|webpack' | grep -v grep | wc -l)"
    echo "Git Repos with changes: $(git-status-all | grep -c 'M \|A \|D ')"
    echo ""
    
    LOAD=$(node-count)
    if [ "$LOAD" -gt 10 ]; then
        echo "⚠️  Status: OVERLOADED - Consider cleanup"
    elif [ "$LOAD" -gt 5 ]; then
        echo "🟡 Status: MODERATE - Monitor closely"
    else
        echo "✅ Status: HEALTHY"
    fi
}

# Memory Store Helper
devops-remember() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo "Usage: devops-remember <key> <value>"
        return 1
    fi
    npx claude-flow@alpha memory store --key "devops/$1" --value "$2" --namespace devops
}

devops-recall() {
    if [ -z "$1" ]; then
        echo "Usage: devops-recall <key>"
        return 1
    fi
    npx claude-flow@alpha memory retrieve --key "devops/$1" --namespace devops
}

echo "✅ Pachactui DevOps Commands Loaded!"
echo "Commands: devops-monitor, dev-health, switch-context, project-pause, project-resume"