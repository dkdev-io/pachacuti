#!/bin/bash

# Performance Data Viewer - Shows recent performance trends
# Provides quick snapshot of last N minutes of data

LOG_DIR="/Users/Danallovertheplace/pachacuti/performance-logs"
DEFAULT_MINUTES=10

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Get minutes to display from argument or use default
MINUTES=${1:-$DEFAULT_MINUTES}

# Find today's log file
LOG_FILE="$LOG_DIR/claude-performance-$(date +%Y%m%d).csv"

if [ ! -f "$LOG_FILE" ]; then
    echo -e "${RED}No log file found for today. Start logging first:${NC}"
    echo "  ./scripts/claude-monitor-logger.sh"
    exit 1
fi

# Calculate number of lines to show (5 second intervals)
LINES_TO_SHOW=$((MINUTES * 60 / 5))

echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}        PERFORMANCE DATA - LAST $MINUTES MINUTES${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Get the last N lines of data
RECENT_DATA=$(tail -n $LINES_TO_SHOW "$LOG_FILE")

if [ -z "$RECENT_DATA" ]; then
    echo -e "${YELLOW}No data available for the last $MINUTES minutes.${NC}"
    exit 1
fi

# Create simple ASCII graph for CPU and Memory
echo -e "${BOLD}${CYAN}CPU & MEMORY USAGE TREND:${NC}"
echo ""

# Create scaled bar chart
echo "$RECENT_DATA" | awk -F',' '
BEGIN {
    print "Time         CPU%  Memory%  Swap(MB)  Score  Status"
    print "─────────────────────────────────────────────────────────────"
}
{
    time = substr($1, 12, 8)
    cpu = $2
    mem = $3
    swap = $6
    score = $10
    status = $11
    
    # Create bar representation
    cpu_bars = int(cpu / 5)
    mem_bars = int(mem / 5)
    
    cpu_bar = ""
    mem_bar = ""
    
    for(i=0; i<cpu_bars && i<20; i++) cpu_bar = cpu_bar "█"
    for(i=0; i<mem_bars && i<20; i++) mem_bar = mem_bar "█"
    
    # Determine color code based on values
    if(cpu >= 85 || mem >= 90 || swap > 500)
        color = "!"
    else if(cpu >= 70 || mem >= 75)
        color = "*"
    else
        color = " "
    
    printf "%s %s %5.1f %6.1f %8.1f %5d  %s\n", 
        time, color, cpu, mem, swap, score, status
}'

echo ""
echo -e "${BOLD}${CYAN}STATISTICAL SUMMARY:${NC}"
echo ""

# Quick stats for recent period
STATS=$(echo "$RECENT_DATA" | awk -F',' '
{
    cpu_sum += $2; cpu_count++
    if($2 > cpu_max) cpu_max = $2
    
    mem_sum += $3; mem_count++
    if($3 > mem_max) mem_max = $3
    
    swap_sum += $6; swap_count++
    if($6 > swap_max) swap_max = $6
    
    score_sum += $10; score_count++
    if($10 < score_min || score_min == 0) score_min = $10
    
    if($11 ~ /CRITICAL/) critical++
    if($11 ~ /HIGH/) high++
    if($11 ~ /WARN/) warn++
}
END {
    printf "CPU:    Avg: %.1f%%  Max: %.1f%%\n", cpu_sum/cpu_count, cpu_max
    printf "Memory: Avg: %.1f%%  Max: %.1f%%\n", mem_sum/mem_count, mem_max
    printf "Swap:   Avg: %.0fMB  Max: %.0fMB\n", swap_sum/swap_count, swap_max
    printf "Score:  Avg: %.0f    Min: %.0f\n", score_sum/score_count, score_min
    printf "\nAlerts: Critical:%d  High:%d  Warnings:%d\n", critical, high, warn
}')

echo "$STATS"

echo ""
echo -e "${BOLD}${CYAN}QUICK ASSESSMENT:${NC}"

# Analyze recent performance
RECENT_AVG_SCORE=$(echo "$RECENT_DATA" | awk -F',' '{sum+=$10; count++} END {printf "%.0f", sum/count}')

if [ $RECENT_AVG_SCORE -ge 70 ]; then
    echo -e "${GREEN}✅ Performance is GOOD${NC}"
elif [ $RECENT_AVG_SCORE -ge 50 ]; then
    echo -e "${YELLOW}⚡ Performance is MODERATE - Some slowdowns possible${NC}"
else
    echo -e "${RED}⚠ Performance is POOR - Significant impact on Claude Code${NC}"
fi

echo ""
echo -e "${CYAN}Options:${NC}"
echo "  View last 30 min:  $0 30"
echo "  View last hour:    $0 60"
echo "  Full analysis:     ./scripts/analyze-performance.sh"
echo "  Start logging:     ./scripts/claude-monitor-logger.sh"
echo ""