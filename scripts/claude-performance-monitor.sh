#!/bin/bash

# Claude Code Performance Monitor
# Monitors system resources and alerts when thresholds might impact Claude Code performance

# Color codes for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Performance thresholds optimized for Claude Code
CPU_WARNING=70      # Claude Code needs CPU for code analysis
CPU_CRITICAL=85     # Performance degradation likely
MEM_WARNING=75      # Memory pressure affects file operations
MEM_CRITICAL=90     # Risk of swap usage, severe slowdown
DISK_WARNING=85     # Limited space for temp files/caches
DISK_CRITICAL=95    # Critical - may prevent operations
SWAP_WARNING=500    # MB - Swap usage indicates memory pressure

# Check interval in seconds
REFRESH_INTERVAL=2

# Clear screen and move cursor to top
clear_screen() {
    clear
    printf "\033[H"
}

# Get CPU usage percentage
get_cpu_usage() {
    # Using top in non-interactive mode
    local cpu_idle=$(top -l 2 -n 0 -F | grep "CPU usage" | tail -1 | awk '{print $7}' | sed 's/%//')
    local cpu_used=$(echo "100 - $cpu_idle" | bc)
    echo "$cpu_used"
}

# Get memory statistics
get_memory_stats() {
    local vm_stat=$(vm_stat)
    local pages_free=$(echo "$vm_stat" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local pages_active=$(echo "$vm_stat" | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
    local pages_inactive=$(echo "$vm_stat" | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
    local pages_wired=$(echo "$vm_stat" | grep "Pages wired" | awk '{print $4}' | sed 's/\.//')
    local pages_compressed=$(echo "$vm_stat" | grep "Pages compressed" | awk '{print $3}' | sed 's/\.//')
    
    # Calculate in MB (page size is 4096 bytes)
    local total_ram=$(sysctl -n hw.memsize | awk '{print $1/1024/1024}')
    local free_mb=$((pages_free * 4096 / 1024 / 1024))
    local active_mb=$((pages_active * 4096 / 1024 / 1024))
    local inactive_mb=$((pages_inactive * 4096 / 1024 / 1024))
    local wired_mb=$((pages_wired * 4096 / 1024 / 1024))
    local compressed_mb=$((pages_compressed * 4096 / 1024 / 1024))
    local used_mb=$((active_mb + wired_mb + compressed_mb))
    
    local percent_used=$(echo "scale=1; $used_mb * 100 / $total_ram" | bc)
    
    echo "$percent_used|$used_mb|$total_ram|$free_mb|$compressed_mb"
}

# Get swap usage
get_swap_usage() {
    local swap_usage=$(sysctl vm.swapusage | awk '{print $7}' | sed 's/M//')
    echo "$swap_usage"
}

# Get disk usage for current directory
get_disk_usage() {
    df -h . | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Get number of Claude Code processes
get_claude_processes() {
    local node_processes=$(ps aux | grep -E "node.*claude|claude.*node" | grep -v grep | wc -l)
    local electron_processes=$(ps aux | grep -i "electron.*claude" | grep -v grep | wc -l)
    echo $((node_processes + electron_processes))
}

# Check memory pressure (macOS specific)
check_memory_pressure() {
    local pressure=$(memory_pressure | grep "System-wide memory" | awk '{print $5}')
    echo "$pressure"
}

# Format size with appropriate unit
format_size() {
    local size=$1
    if [ $size -gt 1024 ]; then
        echo "$(echo "scale=1; $size/1024" | bc)G"
    else
        echo "${size}M"
    fi
}

# Get status color based on value and thresholds
get_status_color() {
    local value=$1
    local warning=$2
    local critical=$3
    
    if (( $(echo "$value >= $critical" | bc -l) )); then
        echo "$RED"
    elif (( $(echo "$value >= $warning" | bc -l) )); then
        echo "$YELLOW"
    else
        echo "$GREEN"
    fi
}

# Print performance assessment
print_assessment() {
    local cpu_usage=$1
    local mem_percent=$2
    local swap_mb=$3
    local disk_percent=$4
    local pressure=$5
    
    echo ""
    echo -e "${BOLD}${CYAN}═══ CLAUDE CODE PERFORMANCE ASSESSMENT ═══${NC}"
    echo ""
    
    local issues=0
    local warnings=0
    
    # CPU Assessment
    if (( $(echo "$cpu_usage >= $CPU_CRITICAL" | bc -l) )); then
        echo -e "${RED}⚠ CRITICAL:${NC} High CPU usage ($cpu_usage%) - Claude Code may be slow"
        echo -e "  ${YELLOW}→ Consider closing other applications${NC}"
        ((issues++))
    elif (( $(echo "$cpu_usage >= $CPU_WARNING" | bc -l) )); then
        echo -e "${YELLOW}⚡ WARNING:${NC} Moderate CPU usage ($cpu_usage%)"
        ((warnings++))
    fi
    
    # Memory Assessment
    if (( $(echo "$mem_percent >= $MEM_CRITICAL" | bc -l) )); then
        echo -e "${RED}⚠ CRITICAL:${NC} Very high memory usage ($mem_percent%) - Severe impact expected"
        echo -e "  ${YELLOW}→ Close memory-intensive apps immediately${NC}"
        echo -e "  ${YELLOW}→ Consider restarting Claude Code${NC}"
        ((issues++))
    elif (( $(echo "$mem_percent >= $MEM_WARNING" | bc -l) )); then
        echo -e "${YELLOW}⚡ WARNING:${NC} High memory usage ($mem_percent%)"
        echo -e "  ${YELLOW}→ File operations may be slower${NC}"
        ((warnings++))
    fi
    
    # Swap Assessment
    swap_int=${swap_mb%.*}
    if [ -z "$swap_int" ]; then swap_int=0; fi
    if (( swap_int >= SWAP_WARNING )); then
        echo -e "${RED}⚠ CRITICAL:${NC} Significant swap usage (${swap_mb}MB)"
        echo -e "  ${YELLOW}→ System is using disk as memory - expect major slowdowns${NC}"
        echo -e "  ${YELLOW}→ Restart recommended${NC}"
        ((issues++))
    fi
    
    # Memory Pressure Assessment
    if [ "$pressure" != "normal" ] && [ "$pressure" != "" ]; then
        echo -e "${YELLOW}⚡ WARNING:${NC} Memory pressure is $pressure"
        echo -e "  ${YELLOW}→ macOS is actively managing memory constraints${NC}"
        ((warnings++))
    fi
    
    # Disk Assessment
    if (( disk_percent >= DISK_CRITICAL )); then
        echo -e "${RED}⚠ CRITICAL:${NC} Very low disk space ($disk_percent% used)"
        echo -e "  ${YELLOW}→ Claude Code may fail to create temp files${NC}"
        ((issues++))
    elif (( disk_percent >= DISK_WARNING )); then
        echo -e "${YELLOW}⚡ WARNING:${NC} Low disk space ($disk_percent% used)"
        ((warnings++))
    fi
    
    # Overall Status
    echo ""
    if [ $issues -gt 0 ]; then
        echo -e "${RED}${BOLD}⛔ PERFORMANCE IMPACT DETECTED${NC}"
        echo -e "${RED}Claude Code performance is likely degraded${NC}"
        echo -e "${YELLOW}Recommendation: Address critical issues above${NC}"
    elif [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}${BOLD}⚡ MINOR PERFORMANCE IMPACT${NC}"
        echo -e "${YELLOW}Claude Code may experience occasional slowdowns${NC}"
    else
        echo -e "${GREEN}${BOLD}✅ OPTIMAL PERFORMANCE${NC}"
        echo -e "${GREEN}System resources are sufficient for Claude Code${NC}"
    fi
}

# Main monitoring loop
main() {
    echo -e "${BOLD}${BLUE}Claude Code Performance Monitor${NC}"
    echo -e "${CYAN}Monitoring system resources...${NC}"
    echo -e "${CYAN}Press Ctrl+C to stop${NC}"
    echo ""
    sleep 2
    
    while true; do
        clear_screen
        
        # Get current timestamp
        timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        
        # Gather metrics
        cpu_usage=$(get_cpu_usage)
        mem_stats=$(get_memory_stats)
        swap_mb=$(get_swap_usage)
        disk_percent=$(get_disk_usage)
        claude_processes=$(get_claude_processes)
        memory_pressure=$(check_memory_pressure)
        
        # Parse memory stats
        IFS='|' read -r mem_percent mem_used_mb total_ram_mb free_mb compressed_mb <<< "$mem_stats"
        
        # Get colors based on thresholds
        cpu_color=$(get_status_color "$cpu_usage" "$CPU_WARNING" "$CPU_CRITICAL")
        mem_color=$(get_status_color "$mem_percent" "$MEM_WARNING" "$MEM_CRITICAL")
        disk_color=$(get_status_color "$disk_percent" "$DISK_WARNING" "$DISK_CRITICAL")
        
        swap_int=${swap_mb%.*}
        if [ -z "$swap_int" ]; then swap_int=0; fi
        if (( swap_int >= SWAP_WARNING )); then
            swap_color="$RED"
        else
            swap_color="$GREEN"
        fi
        
        # Display header
        echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BOLD}${BLUE}║     CLAUDE CODE PERFORMANCE MONITOR - $timestamp     ║${NC}"
        echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        
        # Display metrics
        echo -e "${BOLD}${CYAN}SYSTEM RESOURCES:${NC}"
        cpu_int=${cpu_usage%.*}
        if [ -z "$cpu_int" ]; then cpu_int=0; fi
        bar_length=$((cpu_int/5))
        if [ $bar_length -gt 0 ]; then
            cpu_bar=$(printf '█%.0s' $(seq 1 $bar_length))
        else
            cpu_bar=""
        fi
        echo -e "├─ ${BOLD}CPU Usage:${NC}      ${cpu_color}${cpu_usage}%${NC} ${cpu_color}${cpu_bar}${NC}"
        echo -e "├─ ${BOLD}Memory:${NC}         ${mem_color}${mem_percent}%${NC} ($(format_size $mem_used_mb) / $(format_size $total_ram_mb))"
        echo -e "│  ├─ Free:       $(format_size $free_mb)"
        echo -e "│  ├─ Compressed: $(format_size $compressed_mb)"
        echo -e "│  └─ Pressure:   ${memory_pressure:-normal}"
        echo -e "├─ ${BOLD}Swap Used:${NC}      ${swap_color}${swap_mb}MB${NC}"
        echo -e "└─ ${BOLD}Disk Usage:${NC}     ${disk_color}${disk_percent}%${NC}"
        
        echo ""
        echo -e "${BOLD}${CYAN}CLAUDE CODE STATUS:${NC}"
        if [ $claude_processes -gt 0 ]; then
            echo -e "├─ ${GREEN}● Active${NC} ($claude_processes processes detected)"
        else
            echo -e "├─ ${YELLOW}○ Not detected${NC} (0 processes)"
        fi
        
        # Performance assessment
        print_assessment "$cpu_usage" "$mem_percent" "$swap_mb" "$disk_percent" "$memory_pressure"
        
        echo ""
        echo -e "${CYAN}Refreshing every ${REFRESH_INTERVAL} seconds... (Ctrl+C to stop)${NC}"
        
        sleep $REFRESH_INTERVAL
    done
}

# Trap Ctrl+C to clean exit
trap 'echo -e "\n${GREEN}Monitor stopped.${NC}"; exit 0' INT

# Run main function
main