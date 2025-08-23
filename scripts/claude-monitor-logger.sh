#!/bin/bash

# Claude Code Performance Monitor - Data Logger Version
# Logs system metrics to CSV for analysis

# Configuration
LOG_DIR="/Users/Danallovertheplace/pachacuti/performance-logs"
LOG_FILE="$LOG_DIR/claude-performance-$(date +%Y%m%d).csv"
INTERVAL=5  # Log every 5 seconds

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Initialize CSV with headers if new file
init_csv() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "timestamp,cpu_percent,memory_percent,memory_used_mb,memory_total_mb,swap_mb,disk_percent,memory_pressure,claude_processes,performance_score,alerts" > "$LOG_FILE"
        echo "Created new log file: $LOG_FILE"
    fi
}

# Get CPU usage percentage
get_cpu_usage() {
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
    
    # Calculate in MB
    local total_ram=$(sysctl -n hw.memsize | awk '{print $1/1024/1024}')
    local free_mb=$((pages_free * 4096 / 1024 / 1024))
    local active_mb=$((pages_active * 4096 / 1024 / 1024))
    local inactive_mb=$((pages_inactive * 4096 / 1024 / 1024))
    local wired_mb=$((pages_wired * 4096 / 1024 / 1024))
    local compressed_mb=$((pages_compressed * 4096 / 1024 / 1024))
    local used_mb=$((active_mb + wired_mb + compressed_mb))
    
    local percent_used=$(echo "scale=1; $used_mb * 100 / $total_ram" | bc)
    
    echo "$percent_used|$used_mb|$total_ram"
}

# Get swap usage
get_swap_usage() {
    local swap_usage=$(sysctl vm.swapusage | awk '{print $7}' | sed 's/M//')
    echo "$swap_usage"
}

# Get disk usage
get_disk_usage() {
    df -h . | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Get Claude processes
get_claude_processes() {
    local node_processes=$(ps aux | grep -E "node.*claude|claude.*node" | grep -v grep | wc -l)
    local electron_processes=$(ps aux | grep -i "electron.*claude" | grep -v grep | wc -l)
    echo $((node_processes + electron_processes))
}

# Check memory pressure
check_memory_pressure() {
    local pressure=$(memory_pressure | grep "System-wide memory" | awk '{print $5}')
    echo "${pressure:-normal}"
}

# Calculate performance score (0-100, lower is worse)
calculate_performance_score() {
    local cpu=$1
    local mem=$2
    local swap=$3
    
    # Convert to integers for calculation
    cpu_int=${cpu%.*}
    mem_int=${mem%.*}
    swap_int=${swap%.*}
    
    if [ -z "$cpu_int" ]; then cpu_int=0; fi
    if [ -z "$mem_int" ]; then mem_int=0; fi
    if [ -z "$swap_int" ]; then swap_int=0; fi
    
    # Score calculation (weighted)
    # CPU: 30 points max (100% - usage * 0.3)
    # Memory: 40 points max (100% - usage * 0.4)
    # Swap: 30 points max (heavily penalized)
    
    local cpu_score=$(echo "scale=0; (100 - $cpu_int) * 0.3" | bc)
    local mem_score=$(echo "scale=0; (100 - $mem_int) * 0.4" | bc)
    
    local swap_score=30
    if [ $swap_int -gt 0 ]; then
        if [ $swap_int -lt 100 ]; then
            swap_score=25
        elif [ $swap_int -lt 500 ]; then
            swap_score=15
        elif [ $swap_int -lt 1000 ]; then
            swap_score=5
        else
            swap_score=0
        fi
    fi
    
    local total_score=$(echo "$cpu_score + $mem_score + $swap_score" | bc)
    echo "${total_score%.*}"
}

# Generate alerts
generate_alerts() {
    local cpu=$1
    local mem=$2
    local swap=$3
    local pressure=$4
    
    local alerts=""
    
    cpu_int=${cpu%.*}
    mem_int=${mem%.*}
    swap_int=${swap%.*}
    
    if [ -z "$cpu_int" ]; then cpu_int=0; fi
    if [ -z "$mem_int" ]; then mem_int=0; fi
    if [ -z "$swap_int" ]; then swap_int=0; fi
    
    if [ $cpu_int -ge 85 ]; then
        alerts="${alerts}HIGH_CPU;"
    elif [ $cpu_int -ge 70 ]; then
        alerts="${alerts}WARN_CPU;"
    fi
    
    if [ $mem_int -ge 90 ]; then
        alerts="${alerts}CRITICAL_MEM;"
    elif [ $mem_int -ge 75 ]; then
        alerts="${alerts}WARN_MEM;"
    fi
    
    if [ $swap_int -ge 500 ]; then
        alerts="${alerts}HIGH_SWAP;"
    elif [ $swap_int -gt 0 ]; then
        alerts="${alerts}SWAP_ACTIVE;"
    fi
    
    if [ "$pressure" != "normal" ] && [ "$pressure" != "" ]; then
        alerts="${alerts}MEM_PRESSURE;"
    fi
    
    echo "${alerts:-OK}"
}

# Main logging function
log_metrics() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local cpu_usage=$(get_cpu_usage)
    local mem_stats=$(get_memory_stats)
    local swap_mb=$(get_swap_usage)
    local disk_percent=$(get_disk_usage)
    local claude_processes=$(get_claude_processes)
    local memory_pressure=$(check_memory_pressure)
    
    # Parse memory stats
    IFS='|' read -r mem_percent mem_used_mb total_ram_mb <<< "$mem_stats"
    
    # Calculate performance score
    local perf_score=$(calculate_performance_score "$cpu_usage" "$mem_percent" "$swap_mb")
    
    # Generate alerts
    local alerts=$(generate_alerts "$cpu_usage" "$mem_percent" "$swap_mb" "$memory_pressure")
    
    # Write to CSV
    echo "$timestamp,$cpu_usage,$mem_percent,$mem_used_mb,$total_ram_mb,$swap_mb,$disk_percent,$memory_pressure,$claude_processes,$perf_score,$alerts" >> "$LOG_FILE"
    
    # Display current status
    printf "\r[%s] CPU: %.1f%% | Mem: %.1f%% | Swap: %sMB | Score: %d/100 | Status: %s" \
        "$timestamp" "$cpu_usage" "$mem_percent" "$swap_mb" "$perf_score" "$alerts"
}

# Signal handler for clean exit
cleanup() {
    echo -e "\n\nLogging stopped. Data saved to: $LOG_FILE"
    echo "Total lines logged: $(wc -l < "$LOG_FILE")"
    exit 0
}

trap cleanup INT TERM

# Main execution
main() {
    echo "Claude Code Performance Logger"
    echo "==============================="
    echo "Logging to: $LOG_FILE"
    echo "Interval: ${INTERVAL} seconds"
    echo "Press Ctrl+C to stop"
    echo ""
    
    init_csv
    
    while true; do
        log_metrics
        sleep $INTERVAL
    done
}

main