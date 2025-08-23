#!/bin/bash
# Pachactui DevOps Monitor v1.0
# Real-time development environment monitoring

echo "═══════════════════════════════════════════════════════════"
echo "          🎯 PACHACTUI DEVOPS MONITOR"
echo "          $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Active Development Servers
echo "📡 ACTIVE DEVELOPMENT SERVERS:"
echo "----------------------------"
SERVER_COUNT=$(ps aux | grep -E "vite|webpack|next|react-scripts" | grep -v grep | wc -l | tr -d ' ')
if [ "$SERVER_COUNT" -gt 0 ]; then
    ps aux | grep -E "vite|webpack|next|react-scripts" | grep -v grep | awk '{print "  • " $11 " " $12 " (PID: " $2 ", CPU: " $3 "%, MEM: " $4 "%)"}'
else
    echo "  No active development servers"
fi
echo ""

# Node Process Summary
echo "🔧 NODE PROCESS SUMMARY:"
echo "------------------------"
NODE_COUNT=$(ps aux | grep node | grep -v grep | wc -l | tr -d ' ')
NODE_MEM=$(ps aux | grep node | grep -v grep | awk '{sum+=$4} END {printf "%.1f", sum}')
echo "  • Total Node Processes: $NODE_COUNT"
echo "  • Combined Memory Usage: ${NODE_MEM}%"
echo ""

# Git Repository Status
echo "📂 PROJECT STATUS:"
echo "------------------"
for dir in ~/*/; do
    if [ -d "$dir/.git" ]; then
        PROJECT_NAME=$(basename "$dir")
        cd "$dir" 2>/dev/null
        if [ $? -eq 0 ]; then
            CHANGES=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
            BRANCH=$(git branch --show-current 2>/dev/null)
            LAST_COMMIT=$(git log -1 --format="%ar" 2>/dev/null)
            
            if [ "$CHANGES" -gt 0 ]; then
                STATUS="🟡 $CHANGES uncommitted changes"
            else
                STATUS="🟢 Clean"
            fi
            
            echo "  $PROJECT_NAME:"
            echo "    Branch: $BRANCH | Status: $STATUS"
            echo "    Last commit: $LAST_COMMIT"
        fi
    fi
done
echo ""

# System Resources
echo "💻 SYSTEM RESOURCES:"
echo "--------------------"
CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
MEM_PRESSURE=$(memory_pressure | grep "System-wide memory free percentage" | awk '{print $5}' | sed 's/%//')
echo "  • CPU Usage: ${CPU_USAGE}"
echo "  • Memory Free: ${MEM_PRESSURE}"
echo ""

# Capacity Alerts
echo "⚠️  CAPACITY ALERTS:"
echo "-------------------"
if [ "$NODE_COUNT" -gt 10 ]; then
    echo "  🔴 HIGH: Too many Node processes ($NODE_COUNT) - Consider cleanup"
elif [ "$NODE_COUNT" -gt 5 ]; then
    echo "  🟡 MODERATE: Multiple Node processes ($NODE_COUNT) - Monitor resource usage"
else
    echo "  🟢 OPTIMAL: Node process count normal ($NODE_COUNT)"
fi

if [ "$SERVER_COUNT" -gt 2 ]; then
    echo "  🔴 HIGH: Multiple dev servers running - Consider consolidation"
elif [ "$SERVER_COUNT" -eq 2 ]; then
    echo "  🟡 MODERATE: 2 dev servers active - May impact performance"
else
    echo "  🟢 OPTIMAL: Development server load normal"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  💡 Run 'source ~/devops/quick-commands.sh' for shortcuts"
echo "═══════════════════════════════════════════════════════════"