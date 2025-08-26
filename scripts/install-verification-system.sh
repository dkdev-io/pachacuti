#!/bin/bash

# Install Agent Verification System
# Sets up guardrails to prevent agents from claiming completion without proof

set -e

echo "🔧 Installing Agent Verification System..."

# Initialize verification system
echo "📋 Initializing verification system..."
./scripts/agent-verification-hooks.sh init

# Create verification config directory
echo "📁 Setting up configuration..."
mkdir -p ~/.claude-flow/verification
mkdir -p ~/.claude-flow/hooks

# Install verification hooks
echo "🎣 Installing verification hooks..."

# Pre-task verification hook
cat > ~/.claude-flow/hooks/pre-task-verification.js << 'EOF'
const { createPreTaskHook } = require('/Users/Danallovertheplace/pachacuti/config/verification-enhanced-prompts');
const { VerificationSystem } = require('/Users/Danallovertheplace/pachacuti/config/agent-verification-system');

const verificationSystem = new VerificationSystem();

module.exports = {
  name: 'pre-task-verification',
  description: 'Require verification before allowing completion claims',
  
  async execute(context) {
    const { agentId, taskDescription, verificationType = 'visual' } = context;
    
    // Create verification requirement
    const verification = verificationSystem.requireVerification(agentId, taskDescription, verificationType);
    
    console.log(`⚠️ VERIFICATION REQUIRED: Agent ${agentId} must provide ${verificationType} evidence`);
    console.log(`Task: ${taskDescription}`);
    console.log(`Verification ID: ${verification.taskId}`);
    
    return {
      success: true,
      verification,
      instructions: [
        'You must provide evidence before claiming task completion',
        'Do not use confident language without proof',
        'Show output, test results, or file contents to verify success'
      ]
    };
  }
};
EOF

# Post-task verification hook
cat > ~/.claude-flow/hooks/post-task-verification.js << 'EOF'
const { createPostTaskHook, filterAgentResponse } = require('/Users/Danallovertheplace/pachacuti/config/verification-enhanced-prompts');
const { VerificationSystem } = require('/Users/Danallovertheplace/pachacuti/config/agent-verification-system');

const verificationSystem = new VerificationSystem();

module.exports = {
  name: 'post-task-verification',
  description: 'Verify task completion claims with evidence',
  
  async execute(context) {
    const { agentId, taskId, response, evidence } = context;
    
    // Filter response for false confidence
    const filtered = filterAgentResponse(response, agentId);
    
    if (filtered.filtered) {
      console.log(`❌ FILTERED: ${filtered.warning}`);
      console.log(`Suggestion: ${filtered.suggestion}`);
      
      return {
        success: false,
        filtered: true,
        originalResponse: filtered.originalResponse,
        warning: filtered.warning,
        suggestion: filtered.suggestion
      };
    }
    
    // Add evidence if provided
    if (evidence && taskId) {
      const verified = verificationSystem.addEvidence(agentId, taskId, evidence);
      
      if (verified) {
        console.log(`✅ VERIFIED: Agent ${agentId} task ${taskId}`);
      } else {
        console.log(`❌ UNVERIFIED: Agent ${agentId} task ${taskId} - insufficient evidence`);
      }
      
      return {
        success: verified,
        verified,
        evidence
      };
    }
    
    return {
      success: true,
      response
    };
  }
};
EOF

# Communication filter hook
cat > ~/.claude-flow/hooks/communication-filter.js << 'EOF'
const { filterAgentResponse } = require('/Users/Danallovertheplace/pachacuti/config/verification-enhanced-prompts');

module.exports = {
  name: 'communication-filter',
  description: 'Filter overconfident agent communications',
  
  async execute(context) {
    const { agentId, message } = context;
    
    const filtered = filterAgentResponse(message, agentId);
    
    if (filtered.filtered) {
      console.log(`🔇 Communication filtered for agent ${agentId}`);
      console.log(`Reason: ${filtered.warning}`);
      
      return {
        success: false,
        filtered: true,
        originalMessage: message,
        filteredMessage: filtered.suggestion,
        warning: filtered.warning
      };
    }
    
    return {
      success: true,
      message
    };
  }
};
EOF

# Create verification validation rules
echo "📝 Creating validation rules..."
cat > ~/.claude-flow/verification/validation-rules.json << 'EOF'
{
  "rules": {
    "completion_claims": {
      "triggers": ["completed", "finished", "done", "successful", "working", "fixed", "implemented", "created", "deployed", "built"],
      "required_evidence": ["output", "test_result", "file_content", "command_success"],
      "confidence_threshold": 80,
      "action": "require_evidence"
    },
    "test_claims": {
      "triggers": ["tests pass", "all tests green", "testing successful"],
      "required_evidence": ["test_output", "pass_indicators"],
      "confidence_threshold": 95,
      "action": "require_test_output"
    },
    "deployment_claims": {
      "triggers": ["deployed", "live", "production", "published"],
      "required_evidence": ["deployment_log", "health_check", "url_response"],
      "confidence_threshold": 95,
      "action": "require_deployment_proof"
    },
    "build_claims": {
      "triggers": ["built successfully", "build complete", "compilation successful"],
      "required_evidence": ["build_log", "exit_code_0", "artifact_created"],
      "confidence_threshold": 90,
      "action": "require_build_output"
    }
  },
  "evidence_types": {
    "output": {
      "description": "Command output or console logs",
      "validation": "non_empty_text",
      "confidence_boost": 20
    },
    "test_result": {
      "description": "Test execution results showing pass/fail",
      "validation": "contains_pass_indicators",
      "confidence_boost": 30
    },
    "file_content": {
      "description": "Contents of created or modified files",
      "validation": "file_exists_and_readable",
      "confidence_boost": 15
    },
    "command_success": {
      "description": "Successful command execution (exit code 0)",
      "validation": "exit_code_zero",
      "confidence_boost": 25
    }
  }
}
EOF

# Create verification CLI tool
echo "🛠️ Installing verification CLI..."
cat > ~/.claude-flow/bin/verify << 'EOF'
#!/bin/bash

# Agent Verification CLI Tool
# Usage: verify [command] [options]

case "$1" in
    "status")
        /Users/Danallovertheplace/pachacuti/scripts/agent-verification-hooks.sh report "$2"
        ;;
    "init")
        /Users/Danallovertheplace/pachacuti/scripts/agent-verification-hooks.sh init
        ;;
    "check")
        agent_id="$2"
        task_id="$3"
        /Users/Danallovertheplace/pachacuti/scripts/agent-verification-hooks.sh confidence "$agent_id" "$task_id"
        ;;
    "filter")
        message="$2"
        agent_id="$3"
        /Users/Danallovertheplace/pachacuti/scripts/agent-verification-hooks.sh filter "$message" "$agent_id"
        ;;
    "cleanup")
        /Users/Danallovertheplace/pachacuti/scripts/agent-verification-hooks.sh cleanup
        ;;
    *)
        echo "Agent Verification System"
        echo "Usage: verify {status|init|check|filter|cleanup}"
        echo ""
        echo "Commands:"
        echo "  status [agent_id]           - Show verification status for agent"
        echo "  init                        - Initialize verification system"
        echo "  check agent_id task_id      - Check confidence score"
        echo "  filter message agent_id     - Filter overconfident claims"
        echo "  cleanup                     - Clean old verifications"
        ;;
esac
EOF

chmod +x ~/.claude-flow/bin/verify

# Add to PATH if not already there
if ! echo "$PATH" | grep -q "$HOME/.claude-flow/bin"; then
    echo 'export PATH="$HOME/.claude-flow/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/.claude-flow/bin:$PATH"' >> ~/.zshrc
fi

# Test installation
echo "🧪 Testing verification system..."
if ~/.claude-flow/bin/verify init; then
    echo "✅ Verification system initialized successfully"
else
    echo "❌ Failed to initialize verification system"
    exit 1
fi

echo ""
echo "🎉 Agent Verification System installed successfully!"
echo ""
echo "📋 Usage:"
echo "  verify status [agent_id]    - Check agent verification status"
echo "  verify check agent task     - Get confidence score"
echo "  verify filter message agent - Test communication filter"
echo ""
echo "🔧 Configuration files:"
echo "  ~/.claude-flow/verification/ - Verification logs and data"
echo "  ~/.claude-flow/hooks/        - Verification hooks"
echo ""
echo "🚨 IMPORTANT: Agents will now be required to provide evidence"
echo "   before claiming task completion!"
echo ""

# Show next steps
echo "📚 Next steps:"
echo "1. Test with: Task('coder', 'Create a simple function')"
echo "2. Agent should be forced to show proof before claiming completion"
echo "3. Use 'verify status agent-id' to monitor verification compliance"
echo ""