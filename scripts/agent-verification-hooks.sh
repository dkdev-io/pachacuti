#!/bin/bash

# Agent Verification Hooks
# Prevents agents from claiming completion without proof

VERIFICATION_LOG="$HOME/.claude-flow/verification.log"
ACTIVE_VERIFICATIONS="$HOME/.claude-flow/active-verifications.json"

# Initialize verification system
init_verification() {
    mkdir -p "$(dirname "$VERIFICATION_LOG")"
    touch "$VERIFICATION_LOG"
    echo '{}' > "$ACTIVE_VERIFICATIONS" 2>/dev/null || true
    echo "$(date): Verification system initialized" >> "$VERIFICATION_LOG"
}

# Pre-task verification setup
pre_task_verification() {
    local agent_id="$1"
    local task_description="$2"
    local verification_level="${3:-visual}"
    
    local task_id="task_$(date +%s)_$(openssl rand -hex 4)"
    
    # Log verification requirement
    echo "$(date): VERIFICATION_REQUIRED agent=$agent_id task=$task_id level=$verification_level desc=$task_description" >> "$VERIFICATION_LOG"
    
    # Add to active verifications
    local temp_file=$(mktemp)
    jq --arg aid "$agent_id" --arg tid "$task_id" --arg level "$verification_level" --arg desc "$task_description" \
        '. + {($aid + "-" + $tid): {agentId: $aid, taskId: $tid, level: $level, description: $desc, timestamp: now, verified: false}}' \
        "$ACTIVE_VERIFICATIONS" > "$temp_file" && mv "$temp_file" "$ACTIVE_VERIFICATIONS"
    
    echo "VERIFICATION: Agent $agent_id must provide $verification_level evidence for: $task_description"
    echo "Task ID: $task_id"
    
    return 0
}

# Post-task verification check
post_task_verification() {
    local agent_id="$1"
    local task_id="$2"
    local evidence_file="$3"
    
    local verification_key="${agent_id}-${task_id}"
    
    # Check if verification exists
    if ! jq -e --arg key "$verification_key" 'has($key)' "$ACTIVE_VERIFICATIONS" >/dev/null 2>&1; then
        echo "WARNING: No verification requirement found for $verification_key"
        return 1
    fi
    
    # Get verification level
    local level=$(jq -r --arg key "$verification_key" '.[$key].level' "$ACTIVE_VERIFICATIONS")
    
    # Validate evidence based on level
    local verified=false
    case "$level" in
        "visual")
            if [[ -f "$evidence_file" ]] && [[ -s "$evidence_file" ]]; then
                verified=true
            fi
            ;;
        "tested")
            if grep -q "PASS\|✓\|Success" "$evidence_file" 2>/dev/null; then
                verified=true
            fi
            ;;
        "executed")
            if grep -q "exit code: 0\|Exit Status: 0" "$evidence_file" 2>/dev/null; then
                verified=true
            fi
            ;;
    esac
    
    # Update verification status
    local temp_file=$(mktemp)
    jq --arg key "$verification_key" --argjson verified "$verified" \
        '.[$key].verified = $verified | .[$key].completedAt = now' \
        "$ACTIVE_VERIFICATIONS" > "$temp_file" && mv "$temp_file" "$ACTIVE_VERIFICATIONS"
    
    # Log result
    echo "$(date): VERIFICATION_RESULT agent=$agent_id task=$task_id verified=$verified level=$level" >> "$VERIFICATION_LOG"
    
    if [[ "$verified" == "true" ]]; then
        echo "✅ VERIFIED: Agent $agent_id task $task_id"
        return 0
    else
        echo "❌ UNVERIFIED: Agent $agent_id task $task_id - insufficient evidence"
        return 1
    fi
}

# Filter agent communication for false confidence
filter_agent_communication() {
    local message="$1"
    local agent_id="$2"
    
    # Check for confidence claims
    local confidence_words="completed|finished|done|successful|working|fixed|implemented|created|deployed|built"
    
    if echo "$message" | grep -iE "$confidence_words" >/dev/null; then
        # Check if agent has recent verification
        local recent_verifications=$(jq --arg aid "$agent_id" '[.[] | select(.agentId == $aid and .verified == true and (now - .timestamp) < 300)] | length' "$ACTIVE_VERIFICATIONS")
        
        if [[ "$recent_verifications" == "0" ]]; then
            echo "FILTERED: Confidence claim without verification"
            
            # Replace confidence words with uncertainty markers
            echo "$message" | sed -E 's/completed/attempted to complete/gi' \
                           | sed -E 's/finished/worked on/gi' \
                           | sed -E 's/done/processed/gi' \
                           | sed -E 's/successful/ran/gi' \
                           | sed -E 's/working/appears to be working/gi' \
                           | sed -E 's/fixed/attempted to fix/gi' \
                           | sed -E 's/implemented/worked on implementing/gi' \
                           | sed -E 's/created/attempted to create/gi' \
                           | sed -E 's/deployed/attempted to deploy/gi' \
                           | sed -E 's/built/attempted to build/gi'
            
            return 1
        fi
    fi
    
    echo "$message"
    return 0
}

# Get agent confidence score based on verifications
get_agent_confidence() {
    local agent_id="$1"
    local task_id="$2"
    
    local verification_key="${agent_id}-${task_id}"
    
    if jq -e --arg key "$verification_key" 'has($key)' "$ACTIVE_VERIFICATIONS" >/dev/null 2>&1; then
        local verified=$(jq -r --arg key "$verification_key" '.[$key].verified' "$ACTIVE_VERIFICATIONS")
        local level=$(jq -r --arg key "$verification_key" '.[$key].level' "$ACTIVE_VERIFICATIONS")
        
        if [[ "$verified" == "true" ]]; then
            case "$level" in
                "tested"|"executed"|"confirmed") echo "95" ;;
                "visual") echo "80" ;;
                *) echo "60" ;;
            esac
        else
            echo "40"
        fi
    else
        echo "20"  # No verification at all
    fi
}

# Clean up old verifications
cleanup_verifications() {
    local temp_file=$(mktemp)
    local cutoff_time=$(($(date +%s) - 3600))  # 1 hour ago
    
    jq --arg cutoff "$cutoff_time" 'with_entries(select(.value.timestamp > ($cutoff | tonumber)))' \
        "$ACTIVE_VERIFICATIONS" > "$temp_file" && mv "$temp_file" "$ACTIVE_VERIFICATIONS"
    
    echo "$(date): Cleaned up old verifications" >> "$VERIFICATION_LOG"
}

# Generate verification report
generate_verification_report() {
    local agent_id="$1"
    
    echo "=== Verification Report for $agent_id ==="
    echo "Active Verifications:"
    jq --arg aid "$agent_id" '[.[] | select(.agentId == $aid)]' "$ACTIVE_VERIFICATIONS"
    
    echo "Recent Verification History:"
    grep "$agent_id" "$VERIFICATION_LOG" | tail -10
    
    echo "Overall Confidence Score:"
    local verified_count=$(jq --arg aid "$agent_id" '[.[] | select(.agentId == $aid and .verified == true)] | length' "$ACTIVE_VERIFICATIONS")
    local total_count=$(jq --arg aid "$agent_id" '[.[] | select(.agentId == $aid)] | length' "$ACTIVE_VERIFICATIONS")
    
    if [[ "$total_count" -gt 0 ]]; then
        echo "scale=2; $verified_count * 100 / $total_count" | bc
    else
        echo "No verification data"
    fi
}

# Main command handler
case "$1" in
    "init")
        init_verification
        ;;
    "pre-task")
        pre_task_verification "$2" "$3" "$4"
        ;;
    "post-task")
        post_task_verification "$2" "$3" "$4"
        ;;
    "filter")
        filter_agent_communication "$2" "$3"
        ;;
    "confidence")
        get_agent_confidence "$2" "$3"
        ;;
    "cleanup")
        cleanup_verifications
        ;;
    "report")
        generate_verification_report "$2"
        ;;
    *)
        echo "Usage: $0 {init|pre-task|post-task|filter|confidence|cleanup|report}"
        echo "  init                              - Initialize verification system"
        echo "  pre-task AGENT_ID TASK_DESC LEVEL - Set up verification requirement"
        echo "  post-task AGENT_ID TASK_ID FILE   - Verify task completion"
        echo "  filter MESSAGE AGENT_ID           - Filter overconfident claims"
        echo "  confidence AGENT_ID TASK_ID       - Get confidence score"
        echo "  cleanup                           - Clean old verifications"
        echo "  report AGENT_ID                   - Generate verification report"
        exit 1
        ;;
esac