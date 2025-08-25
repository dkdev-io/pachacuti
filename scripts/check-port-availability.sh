#!/bin/bash

# Port Availability Checker for Claude Agents
# Prevents port conflicts when assigning localhost destinations

PORT_REGISTRY="/Users/Danallovertheplace/pachacuti/config/port-registry.json"

check_port() {
    local port=$1
    local project=$2
    
    # Check if port is in use by a process
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $port is currently in use by a running process"
        return 1
    fi
    
    # Check port registry for conflicts
    if [ -f "$PORT_REGISTRY" ]; then
        local assigned_project=$(jq -r ".port_assignments.\"$port\".project // \"available\"" "$PORT_REGISTRY")
        if [ "$assigned_project" != "available" ] && [ "$assigned_project" != "$project" ]; then
            echo "⚠️  Port $port is assigned to: $assigned_project"
            return 1
        fi
    fi
    
    echo "✅ Port $port is available"
    return 0
}

suggest_port() {
    local project_type=$1
    
    # Suggest ports based on project type
    case $project_type in
        frontend)
            for port in 3000 3003 3004 3005 5173 5174 5175 8080 8081 8082; do
                if check_port $port "test" >/dev/null 2>&1; then
                    echo $port
                    return 0
                fi
            done
            ;;
        backend)
            for port in 3001 3006 3007 3008 4000 4001 4002 5000 5001 5002; do
                if check_port $port "test" >/dev/null 2>&1; then
                    echo $port
                    return 0
                fi
            done
            ;;
        *)
            for port in 3003 3004 3005 3006 3007 3008 3009 3010 4000 4001; do
                if check_port $port "test" >/dev/null 2>&1; then
                    echo $port
                    return 0
                fi
            done
            ;;
    esac
    
    echo "9999"  # Fallback port
}

register_port() {
    local port=$1
    local project=$2
    local type=$3
    local path=$4
    
    if [ ! -f "$PORT_REGISTRY" ]; then
        echo "{}" > "$PORT_REGISTRY"
    fi
    
    # Update registry
    jq --arg port "$port" \
       --arg project "$project" \
       --arg type "$type" \
       --arg path "$path" \
       '.port_assignments[$port] = {
           project: $project,
           type: $type,
           status: "active",
           path: $path
       }' "$PORT_REGISTRY" > "${PORT_REGISTRY}.tmp" && mv "${PORT_REGISTRY}.tmp" "$PORT_REGISTRY"
    
    echo "📝 Registered port $port for $project"
}

list_ports() {
    if [ ! -f "$PORT_REGISTRY" ]; then
        echo "No port registry found"
        return 1
    fi
    
    echo "🌐 Port Assignments:"
    echo "===================="
    jq -r '.port_assignments | to_entries[] | 
        "Port \(.key): \(.value.project) (\(.value.type)) - \(.value.status)"' "$PORT_REGISTRY"
    
    echo ""
    echo "🚨 Conflicts:"
    jq -r '.port_assignments | to_entries[] | 
        select(.value.status == "conflict") | 
        "Port \(.key): \(.value.conflicts | join(", "))"' "$PORT_REGISTRY"
}

# Main script logic
case "$1" in
    check)
        check_port "$2" "${3:-unknown}"
        ;;
    suggest)
        suggest_port "${2:-general}"
        ;;
    register)
        register_port "$2" "$3" "${4:-general}" "${5:-unknown}"
        ;;
    list)
        list_ports
        ;;
    *)
        echo "Usage: $0 {check|suggest|register|list} [args...]"
        echo "  check <port> [project]     - Check if a port is available"
        echo "  suggest [type]              - Suggest an available port"
        echo "  register <port> <project> [type] [path] - Register a port assignment"
        echo "  list                        - List all port assignments"
        exit 1
        ;;
esac