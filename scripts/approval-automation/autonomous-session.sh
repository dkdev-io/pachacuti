#!/bin/bash

# Pachacuti Autonomous Development Session Manager
# Enables focused development without unnecessary interruptions

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DEFAULT_DURATION=120  # 2 hours in minutes
SESSION_ID=""
LOG_DIR="logs/autonomous-sessions"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to display help
show_help() {
    echo -e "${CYAN}Pachacuti Autonomous Session Manager${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Usage: ./autonomous-session.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [duration]    Start autonomous session (default: 120 minutes)"
    echo "  stop               Stop current autonomous session"
    echo "  status             Show current session status"
    echo "  history            Show session history"
    echo "  config             Show current approval configuration"
    echo ""
    echo "Options:"
    echo "  --focus            Enable deep focus mode (3 hours)"
    echo "  --quick            Quick session (30 minutes)"
    echo "  --marathon         Marathon session (4 hours)"
    echo "  --custom [mins]    Custom duration in minutes"
    echo ""
    echo "Examples:"
    echo "  ./autonomous-session.sh start              # Start 2-hour session"
    echo "  ./autonomous-session.sh start --focus      # Start 3-hour focus session"
    echo "  ./autonomous-session.sh start --custom 90  # Start 90-minute session"
    echo "  ./autonomous-session.sh status             # Check current session"
    echo ""
}

# Function to start autonomous session
start_session() {
    local duration=$1
    SESSION_ID="session_$(date +%Y%m%d_%H%M%S)"
    local session_file="$LOG_DIR/current_session.json"
    
    echo -e "${GREEN}🚀 Starting Pachacuti Autonomous Development Session${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Session Configuration:${NC}"
    echo -e "  • Duration: ${GREEN}$duration minutes${NC}"
    echo -e "  • Session ID: ${BLUE}$SESSION_ID${NC}"
    echo -e "  • Start Time: ${BLUE}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "  • End Time: ${BLUE}$(date -d "+$duration minutes" '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    echo -e "${GREEN}✅ Auto-Approval Enabled For:${NC}"
    echo "  • All git operations (status, diff, commit, push)"
    echo "  • Development commands (build, test, lint)"
    echo "  • File operations in src/, tests/, docs/"
    echo "  • Code formatting and refactoring"
    echo "  • Bug fixes and documentation"
    echo ""
    echo -e "${YELLOW}⚠️  Approval Still Required For:${NC}"
    echo "  • Package.json modifications"
    echo "  • Environment variable changes"
    echo "  • External API integrations"
    echo "  • Major architectural changes"
    echo ""
    
    # Create session file
    cat > "$session_file" <<EOF
{
  "sessionId": "$SESSION_ID",
  "startTime": "$(date -Iseconds)",
  "endTime": "$(date -d "+$duration minutes" -Iseconds)",
  "duration": $duration,
  "status": "active",
  "settings": {
    "autoApproveRoutine": true,
    "silentMode": true,
    "batchOperations": true,
    "promptOnlyCritical": true
  }
}
EOF
    
    # Start the approval engine in autonomous mode
    node scripts/approval-automation/approval-engine.js start-autonomous $duration &
    local engine_pid=$!
    
    echo -e "${GREEN}✨ Session Started Successfully!${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Tips for productive autonomous development:"
    echo "  • Focus on implementation without approval interruptions"
    echo "  • Batch similar operations for efficiency"
    echo "  • Review summary at session end"
    echo ""
    echo -e "${BLUE}Happy coding! 🎯${NC}"
    
    # Save PID for later
    echo $engine_pid > "$LOG_DIR/engine.pid"
}

# Function to stop session
stop_session() {
    local session_file="$LOG_DIR/current_session.json"
    
    if [ ! -f "$session_file" ]; then
        echo -e "${RED}No active session found${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Stopping autonomous session...${NC}"
    
    # Kill the approval engine if running
    if [ -f "$LOG_DIR/engine.pid" ]; then
        local pid=$(cat "$LOG_DIR/engine.pid")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
        fi
        rm "$LOG_DIR/engine.pid"
    fi
    
    # Update session status
    local session_data=$(cat "$session_file")
    echo "$session_data" | jq '.status = "completed"' > "$session_file.tmp"
    mv "$session_file.tmp" "$session_file"
    
    # Archive session
    local session_id=$(echo "$session_data" | jq -r '.sessionId')
    mv "$session_file" "$LOG_DIR/${session_id}.json"
    
    echo -e "${GREEN}✅ Session stopped successfully${NC}"
    show_summary "$LOG_DIR/${session_id}.json"
}

# Function to show session status
show_status() {
    local session_file="$LOG_DIR/current_session.json"
    
    if [ ! -f "$session_file" ]; then
        echo -e "${YELLOW}No active autonomous session${NC}"
        echo ""
        echo "Start a new session with: ./autonomous-session.sh start"
        return 0
    fi
    
    local session_data=$(cat "$session_file")
    local start_time=$(echo "$session_data" | jq -r '.startTime')
    local end_time=$(echo "$session_data" | jq -r '.endTime')
    local duration=$(echo "$session_data" | jq -r '.duration')
    
    echo -e "${CYAN}Current Autonomous Session Status${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Session ID: ${BLUE}$(echo "$session_data" | jq -r '.sessionId')${NC}"
    echo -e "Status: ${GREEN}ACTIVE${NC}"
    echo -e "Started: $start_time"
    echo -e "Ends at: $end_time"
    echo -e "Duration: ${duration} minutes"
    echo ""
    
    # Calculate remaining time
    local now=$(date +%s)
    local end=$(date -d "$end_time" +%s)
    local remaining=$((($end - $now) / 60))
    
    if [ $remaining -gt 0 ]; then
        echo -e "Time remaining: ${GREEN}${remaining} minutes${NC}"
    else
        echo -e "Time remaining: ${RED}Session expired${NC}"
    fi
}

# Function to show session history
show_history() {
    echo -e "${CYAN}Autonomous Session History${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local count=0
    for session_file in $(ls -t "$LOG_DIR"/session_*.json 2>/dev/null | head -10); do
        if [ -f "$session_file" ]; then
            local session_data=$(cat "$session_file")
            local session_id=$(echo "$session_data" | jq -r '.sessionId')
            local duration=$(echo "$session_data" | jq -r '.duration')
            local start_time=$(echo "$session_data" | jq -r '.startTime')
            
            echo "• $session_id"
            echo "  Duration: ${duration} minutes"
            echo "  Started: $start_time"
            echo ""
            
            count=$((count + 1))
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo "No session history found"
    fi
}

# Function to show configuration
show_config() {
    echo -e "${CYAN}Current Approval Configuration${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ -f "config/approval-system/approval-rules.json" ]; then
        cat config/approval-system/approval-rules.json | jq '.autoApprove | keys'
        echo ""
        echo "Full configuration: config/approval-system/approval-rules.json"
    else
        echo -e "${RED}Configuration file not found${NC}"
    fi
}

# Function to show session summary
show_summary() {
    local session_file=$1
    
    if [ ! -f "$session_file" ]; then
        return 1
    fi
    
    echo ""
    echo -e "${CYAN}Session Summary${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local session_data=$(cat "$session_file")
    echo "$session_data" | jq '.'
}

# Main script logic
case "$1" in
    start)
        shift
        case "$1" in
            --focus)
                start_session 180
                ;;
            --quick)
                start_session 30
                ;;
            --marathon)
                start_session 240
                ;;
            --custom)
                shift
                start_session ${1:-$DEFAULT_DURATION}
                ;;
            *)
                start_session ${1:-$DEFAULT_DURATION}
                ;;
        esac
        ;;
    stop)
        stop_session
        ;;
    status)
        show_status
        ;;
    history)
        show_history
        ;;
    config)
        show_config
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac

exit 0