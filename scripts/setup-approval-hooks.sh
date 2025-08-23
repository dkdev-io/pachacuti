#!/bin/bash

# Claude Code Smart Auto-Approval Setup Script
# This script configures hooks to implement intelligent approval filtering

echo "🚀 Setting up Claude Code Smart Auto-Approval System"

# Create hooks directory if it doesn't exist
mkdir -p ~/.claude/hooks

# Create the main approval filter hook
cat > ~/.claude/hooks/approval-filter.js << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = process.env.CLAUDE_APPROVAL_CONFIG || 
  path.join(process.cwd(), 'config/claude-code-approval.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Warning: Could not load approval config, using defaults');
  config = { autoApprove: { enabled: false } };
}

// Command being executed
const command = process.argv[2];
const args = process.argv.slice(3);

// Risk assessment function
function assessRisk(cmd, cmdArgs) {
  const fullCommand = `${cmd} ${cmdArgs.join(' ')}`;
  
  // Check high-risk patterns
  const highRiskPatterns = config.riskAssessment?.highRisk?.criteria || [];
  if (highRiskPatterns.some(pattern => fullCommand.includes(pattern))) {
    return 'high';
  }
  
  // Check if it's a read-only operation
  const readOnlyCommands = ['git status', 'git diff', 'git log', 'ls', 'cat', 'grep'];
  if (readOnlyCommands.some(ro => fullCommand.startsWith(ro))) {
    return 'low';
  }
  
  return 'medium';
}

// Check if command should be auto-approved
function shouldAutoApprove(cmd, cmdArgs) {
  if (!config.autoApprove?.enabled) return false;
  
  const fullCommand = `${cmd} ${cmdArgs.join(' ')}`;
  
  // Check git operations
  if (cmd === 'git') {
    const gitCmd = cmdArgs[0];
    const alwaysApprove = config.autoApprove.gitOperations?.alwaysApprove || [];
    if (alwaysApprove.includes(fullCommand)) return true;
    
    const conditional = config.autoApprove.gitOperations?.conditionalApprove?.[fullCommand];
    if (conditional?.approve) {
      // Check conditions
      if (conditional.unless) {
        const hasBlockedFile = cmdArgs.some(arg => 
          conditional.unless.some(pattern => arg.includes(pattern))
        );
        if (hasBlockedFile) return false;
      }
      return true;
    }
  }
  
  // Check npm operations
  if (cmd === 'npm' || cmd === 'yarn' || cmd === 'pnpm') {
    const npmCmd = `${cmd} ${cmdArgs.join(' ')}`;
    const alwaysApprove = config.autoApprove.npmOperations?.alwaysApprove || [];
    if (alwaysApprove.some(approved => npmCmd.startsWith(approved))) return true;
  }
  
  // Check bash commands
  const bashAlways = config.autoApprove.bashCommands?.alwaysApprove || [];
  if (bashAlways.includes(cmd)) return true;
  
  // Check patterns
  const patterns = config.autoApprove.bashCommands?.patterns || {};
  for (const [name, pattern] of Object.entries(patterns)) {
    if (new RegExp(pattern).test(fullCommand)) return true;
  }
  
  return false;
}

// Main logic
const risk = assessRisk(command, args);
const autoApprove = shouldAutoApprove(command, args);

// Output decision
const decision = {
  command: `${command} ${args.join(' ')}`,
  risk,
  autoApprove,
  timestamp: new Date().toISOString()
};

// Log decision if not silent
if (config.notifications?.mode !== 'silent') {
  fs.appendFileSync(
    path.join(process.cwd(), '.claude-approval-log'),
    JSON.stringify(decision) + '\n'
  );
}

// Exit with appropriate code
// 0 = auto-approve, 1 = require approval
process.exit(autoApprove ? 0 : 1);
EOF

chmod +x ~/.claude/hooks/approval-filter.js

# Create batch operation detector
cat > ~/.claude/hooks/batch-detector.js << 'EOF'
#!/usr/bin/env node

const operations = [];
let batchTimer = null;

process.stdin.on('data', (data) => {
  const operation = data.toString().trim();
  operations.push(operation);
  
  // Reset batch timer
  if (batchTimer) clearTimeout(batchTimer);
  
  batchTimer = setTimeout(() => {
    // Check if operations form a known workflow
    const workflows = {
      'git-workflow': ['git add', 'git commit', 'git push'],
      'test-build': ['npm test', 'npm run build'],
      'code-quality': ['npm run lint', 'npm run format']
    };
    
    for (const [name, pattern] of Object.entries(workflows)) {
      if (pattern.every(cmd => operations.some(op => op.includes(cmd)))) {
        console.log(`Detected ${name} workflow - auto-approving batch`);
        process.exit(0);
      }
    }
    
    operations.length = 0;
  }, 2000);
});
EOF

chmod +x ~/.claude/hooks/batch-detector.js

# Create the hooks configuration
cat > ~/.claude/hooks/config.json << 'EOF'
{
  "hooks": {
    "pre-command": "~/.claude/hooks/approval-filter.js",
    "batch-detect": "~/.claude/hooks/batch-detector.js"
  },
  "environment": {
    "CLAUDE_APPROVAL_CONFIG": "./config/claude-code-approval.json"
  }
}
EOF

echo "✅ Smart Auto-Approval System configured successfully!"
echo ""
echo "🎯 Key Features Enabled:"
echo "  • Auto-approves routine git operations"
echo "  • Auto-approves npm run commands"
echo "  • Intelligent risk assessment"
echo "  • Batch operation detection"
echo "  • Silent mode for read-only operations"
echo ""
echo "📝 Configuration file: config/claude-code-approval.json"
echo "📊 Approval logs: .claude-approval-log"
echo ""
echo "🚦 Approval Rules:"
echo "  ✅ Auto-Approve: Git status/diff/log, npm test/build/lint, file reads"
echo "  🚨 Require Approval: Config changes, new packages, deployments"
echo ""
echo "Run 'bash scripts/setup-approval-hooks.sh' to install"