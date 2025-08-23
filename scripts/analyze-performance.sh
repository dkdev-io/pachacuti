#!/bin/bash

# Performance Data Analyzer for Claude Code Monitor Logs
# Analyzes CSV logs and provides insights

LOG_DIR="/Users/Danallovertheplace/pachacuti/performance-logs"

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo -e "${RED}No performance logs found. Run claude-monitor-logger.sh first.${NC}"
    exit 1
fi

# Get the latest log file or specified file
if [ -z "$1" ]; then
    LOG_FILE=$(ls -t "$LOG_DIR"/*.csv 2>/dev/null | head -1)
else
    LOG_FILE="$1"
fi

if [ ! -f "$LOG_FILE" ]; then
    echo -e "${RED}No log file found.${NC}"
    echo "Usage: $0 [log-file.csv]"
    echo "Available logs:"
    ls -la "$LOG_DIR"/*.csv 2>/dev/null
    exit 1
fi

echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  CLAUDE CODE PERFORMANCE ANALYSIS REPORT${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Analyzing: ${NC}$LOG_FILE"

# Get basic statistics
TOTAL_SAMPLES=$(tail -n +2 "$LOG_FILE" | wc -l)
if [ $TOTAL_SAMPLES -eq 0 ]; then
    echo -e "${RED}No data samples found in log file.${NC}"
    exit 1
fi

# Extract time range
FIRST_TIME=$(tail -n +2 "$LOG_FILE" | head -1 | cut -d',' -f1)
LAST_TIME=$(tail -1 "$LOG_FILE" | cut -d',' -f1)

echo -e "${CYAN}Time Range:${NC} $FIRST_TIME to $LAST_TIME"
echo -e "${CYAN}Total Samples:${NC} $TOTAL_SAMPLES"
echo ""

# CPU Analysis
echo -e "${BOLD}${CYAN}CPU USAGE ANALYSIS:${NC}"
CPU_AVG=$(tail -n +2 "$LOG_FILE" | awk -F',' '{sum+=$2; count++} END {printf "%.1f", sum/count}')
CPU_MAX=$(tail -n +2 "$LOG_FILE" | awk -F',' '{if($2>max) max=$2} END {print max}')
CPU_MIN=$(tail -n +2 "$LOG_FILE" | awk -F',' 'NR==1{min=$2} {if($2<min) min=$2} END {print min}')
CPU_HIGH_COUNT=$(tail -n +2 "$LOG_FILE" | awk -F',' '$2>=70 {count++} END {print count+0}')

echo "  Average: ${CPU_AVG}%"
echo "  Maximum: ${CPU_MAX}%"
echo "  Minimum: ${CPU_MIN}%"
echo "  Time above 70%: $((CPU_HIGH_COUNT * 5)) seconds ($CPU_HIGH_COUNT samples)"
echo ""

# Memory Analysis
echo -e "${BOLD}${CYAN}MEMORY USAGE ANALYSIS:${NC}"
MEM_AVG=$(tail -n +2 "$LOG_FILE" | awk -F',' '{sum+=$3; count++} END {printf "%.1f", sum/count}')
MEM_MAX=$(tail -n +2 "$LOG_FILE" | awk -F',' '{if($3>max) max=$3} END {print max}')
MEM_MIN=$(tail -n +2 "$LOG_FILE" | awk -F',' 'NR==1{min=$3} {if($3<min) min=$3} END {print min}')
MEM_HIGH_COUNT=$(tail -n +2 "$LOG_FILE" | awk -F',' '$3>=75 {count++} END {print count+0}')

echo "  Average: ${MEM_AVG}%"
echo "  Maximum: ${MEM_MAX}%"
echo "  Minimum: ${MEM_MIN}%"
echo "  Time above 75%: $((MEM_HIGH_COUNT * 5)) seconds ($MEM_HIGH_COUNT samples)"
echo ""

# Swap Analysis
echo -e "${BOLD}${CYAN}SWAP USAGE ANALYSIS:${NC}"
SWAP_AVG=$(tail -n +2 "$LOG_FILE" | awk -F',' '{sum+=$6; count++} END {printf "%.1f", sum/count}')
SWAP_MAX=$(tail -n +2 "$LOG_FILE" | awk -F',' '{if($6>max) max=$6} END {print max}')
SWAP_ACTIVE=$(tail -n +2 "$LOG_FILE" | awk -F',' '$6>0 {count++} END {print count+0}')

echo "  Average: ${SWAP_AVG}MB"
echo "  Maximum: ${SWAP_MAX}MB"
echo "  Time with swap active: $((SWAP_ACTIVE * 5)) seconds ($SWAP_ACTIVE samples)"
echo ""

# Performance Score Analysis
echo -e "${BOLD}${CYAN}PERFORMANCE SCORE ANALYSIS:${NC}"
SCORE_AVG=$(tail -n +2 "$LOG_FILE" | awk -F',' '{sum+=$10; count++} END {printf "%.0f", sum/count}')
SCORE_MIN=$(tail -n +2 "$LOG_FILE" | awk -F',' 'NR==1{min=$10} {if($10<min) min=$10} END {print min}')
POOR_PERF=$(tail -n +2 "$LOG_FILE" | awk -F',' '$10<50 {count++} END {print count+0}')

echo "  Average Score: ${SCORE_AVG}/100"
echo "  Minimum Score: ${SCORE_MIN}/100"
echo "  Time with poor performance (<50): $((POOR_PERF * 5)) seconds"
echo ""

# Alert Summary
echo -e "${BOLD}${CYAN}ALERT SUMMARY:${NC}"
CRITICAL_MEM=$(tail -n +2 "$LOG_FILE" | grep -c "CRITICAL_MEM" || true)
HIGH_CPU=$(tail -n +2 "$LOG_FILE" | grep -c "HIGH_CPU" || true)
HIGH_SWAP=$(tail -n +2 "$LOG_FILE" | grep -c "HIGH_SWAP" || true)
MEM_PRESSURE=$(tail -n +2 "$LOG_FILE" | grep -c "MEM_PRESSURE" || true)

if [ $CRITICAL_MEM -gt 0 ]; then
    echo -e "  ${RED}● Critical Memory Events: $CRITICAL_MEM${NC}"
fi
if [ $HIGH_CPU -gt 0 ]; then
    echo -e "  ${YELLOW}● High CPU Events: $HIGH_CPU${NC}"
fi
if [ $HIGH_SWAP -gt 0 ]; then
    echo -e "  ${RED}● High Swap Events: $HIGH_SWAP${NC}"
fi
if [ $MEM_PRESSURE -gt 0 ]; then
    echo -e "  ${YELLOW}● Memory Pressure Events: $MEM_PRESSURE${NC}"
fi

# Recommendations
echo ""
echo -e "${BOLD}${CYAN}RECOMMENDATIONS:${NC}"

if (( $(echo "$SWAP_AVG > 100" | bc -l) )); then
    echo -e "${RED}⚠ HIGH SWAP USAGE DETECTED${NC}"
    echo "  Your system is consistently using swap memory."
    echo "  → Consider adding more RAM (minimum 32GB recommended)"
fi

if (( $(echo "$MEM_AVG > 80" | bc -l) )); then
    echo -e "${YELLOW}⚡ HIGH MEMORY USAGE${NC}"
    echo "  Average memory usage is above 80%"
    echo "  → Close unnecessary applications during Claude Code sessions"
    echo "  → Consider upgrading to 32GB RAM"
fi

if (( $(echo "$CPU_AVG > 60" | bc -l) )); then
    echo -e "${YELLOW}⚡ HIGH CPU USAGE${NC}"
    echo "  Average CPU usage is elevated"
    echo "  → Check for background processes"
    echo "  → Consider a faster processor for complex projects"
fi

if [ $POOR_PERF -gt $((TOTAL_SAMPLES / 4)) ]; then
    echo -e "${RED}⚠ FREQUENT PERFORMANCE ISSUES${NC}"
    echo "  Performance was poor for >25% of the monitoring period"
    echo "  → Hardware upgrade strongly recommended"
fi

# Export options
echo ""
echo -e "${BOLD}${CYAN}DATA EXPORT OPTIONS:${NC}"
echo "  View raw CSV: cat $LOG_FILE"
echo "  Import to Excel/Numbers for graphs"
echo "  Generate JSON: cat $LOG_FILE | python3 -c 'import csv,json,sys; print(json.dumps(list(csv.DictReader(sys.stdin))))'"
echo ""

# Summary
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
if [ $SCORE_AVG -ge 70 ]; then
    echo -e "${GREEN}Overall: System performance is GOOD for Claude Code${NC}"
elif [ $SCORE_AVG -ge 50 ]; then
    echo -e "${YELLOW}Overall: System performance is ADEQUATE but could be improved${NC}"
else
    echo -e "${RED}Overall: System performance is POOR - upgrade recommended${NC}"
fi
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"