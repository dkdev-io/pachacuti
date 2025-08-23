#!/usr/bin/env node

/**
 * Claude Code Update Detector
 * Checks for changes in Claude Code capabilities daily
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class ClaudeUpdateDetector {
  constructor() {
    this.dataPath = path.join(__dirname, '..', 'data');
    this.lastCheckFile = path.join(this.dataPath, 'last-check.json');
    this.changesFile = path.join(this.dataPath, 'recent-changes.json');
    this.today = new Date().toISOString().split('T')[0];
  }

  async checkForUpdates() {
    const updates = {
      date: this.today,
      changes: [],
      newFeatures: [],
      improvements: [],
      fixes: []
    };

    // Check Claude version
    const currentVersion = this.getClaudeVersion();
    const lastCheck = this.getLastCheck();
    
    if (currentVersion !== lastCheck.version) {
      updates.changes.push(`Claude Code updated to ${currentVersion}`);
    }

    // Check for tool changes
    const toolChanges = this.detectToolChanges();
    updates.changes.push(...toolChanges);

    // Check for new agents
    const agentChanges = this.detectAgentChanges();
    updates.changes.push(...agentChanges);

    // Check for capability improvements
    const improvements = this.detectImprovements();
    updates.improvements.push(...improvements);

    // Save results
    this.saveCheck({ version: currentVersion, date: this.today });
    this.saveChanges(updates);

    return updates;
  }

  getClaudeVersion() {
    try {
      // Check if Claude CLI is available
      const version = execSync('claude --version 2>/dev/null', { encoding: 'utf8' }).trim();
      return version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  getLastCheck() {
    if (fs.existsSync(this.lastCheckFile)) {
      return JSON.parse(fs.readFileSync(this.lastCheckFile, 'utf8'));
    }
    return { version: 'unknown', date: null, tools: {}, agents: [] };
  }

  detectToolChanges() {
    const changes = [];
    const lastCheck = this.getLastCheck();
    
    // Known tools as of last documentation
    const currentTools = {
      'Read': { multimodal: true, pdf: true, notebooks: true },
      'Write': { validation: true },
      'Edit': { multiEdit: true },
      'Grep': { multiline: true, headLimit: true },
      'Glob': { sorted: true },
      'Bash': { timeout: 600000, background: true },
      'WebSearch': { usOnly: true },
      'WebFetch': { cache: '15min' },
      'Task': { agents: 54 },
      'TodoWrite': { activeForm: true }
    };

    // Compare with last check
    if (lastCheck.tools) {
      Object.keys(currentTools).forEach(tool => {
        if (!lastCheck.tools[tool]) {
          changes.push(`New tool available: ${tool}`);
        } else {
          // Check for feature changes
          const currentFeatures = currentTools[tool];
          const lastFeatures = lastCheck.tools[tool];
          
          Object.keys(currentFeatures).forEach(feature => {
            if (currentFeatures[feature] !== lastFeatures[feature]) {
              changes.push(`${tool}: ${feature} updated to ${currentFeatures[feature]}`);
            }
          });
        }
      });
    }

    // Update stored tools
    this.updateStoredTools(currentTools);
    
    return changes;
  }

  detectAgentChanges() {
    const changes = [];
    const lastCheck = this.getLastCheck();
    
    // Current known agents (54 total)
    const currentAgents = [
      'general-purpose', 'coder', 'reviewer', 'tester', 'planner', 'researcher',
      'sparc-coord', 'sparc-coder', 'specification', 'pseudocode', 'architecture',
      'refinement', 'backend-dev', 'mobile-dev', 'ml-developer', 'api-docs',
      'cicd-engineer', 'system-architect', 'code-analyzer', 'base-template-generator',
      'production-validator', 'tdd-london-swarm', 'perf-analyzer', 'task-orchestrator',
      'memory-coordinator', 'smart-agent', 'pr-manager', 'issue-tracker',
      'release-manager', 'github-modes', 'code-review-swarm', 'workflow-automation',
      'project-board-sync', 'repo-architect', 'multi-repo-swarm', 'sync-coordinator',
      'release-swarm', 'swarm-pr', 'swarm-issue', 'swarm-init',
      'hierarchical-coordinator', 'mesh-coordinator', 'adaptive-coordinator',
      'byzantine-coordinator', 'raft-manager', 'gossip-coordinator',
      'crdt-synchronizer', 'quorum-manager', 'security-manager',
      'performance-benchmarker', 'migration-planner', 'statusline-setup',
      'output-style-setup', 'refinement', 'pseudocode', 'architecture', 'specification'
    ];

    const lastAgents = lastCheck.agents || [];
    
    // Find new agents
    currentAgents.forEach(agent => {
      if (!lastAgents.includes(agent)) {
        changes.push(`New agent available: ${agent}`);
      }
    });

    // Find removed agents
    lastAgents.forEach(agent => {
      if (!currentAgents.includes(agent)) {
        changes.push(`Agent deprecated: ${agent}`);
      }
    });

    // Update stored agents
    this.updateStoredAgents(currentAgents);
    
    return changes;
  }

  detectImprovements() {
    const improvements = [];
    
    // Check for performance improvements from recent sessions
    const sessionData = this.getRecentSessionData();
    
    if (sessionData.performanceGains) {
      improvements.push(`Performance: ${sessionData.performanceGains}% faster execution detected`);
    }
    
    if (sessionData.newPatterns) {
      improvements.push(`Discovered ${sessionData.newPatterns} new workflow patterns`);
    }
    
    if (sessionData.tokenReduction) {
      improvements.push(`Token usage: ${sessionData.tokenReduction}% reduction achieved`);
    }
    
    return improvements;
  }

  getRecentSessionData() {
    // Analyze recent session logs
    const learningDir = path.join(__dirname, '..', '..', 'docs', 'claude-code', 'learning');
    
    if (!fs.existsSync(learningDir)) {
      return { performanceGains: 0, newPatterns: 0, tokenReduction: 0 };
    }
    
    // Get session files from last 7 days
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const sessionFiles = fs.readdirSync(learningDir)
      .filter(f => f.startsWith('session-') && f.endsWith('.json'))
      .filter(f => {
        const stats = fs.statSync(path.join(learningDir, f));
        return stats.mtime.getTime() > weekAgo;
      });
    
    let totalPerformance = 0;
    let patternCount = 0;
    let tokenSavings = 0;
    
    sessionFiles.forEach(file => {
      try {
        const session = JSON.parse(fs.readFileSync(path.join(learningDir, file), 'utf8'));
        if (session.insights) {
          if (session.insights.performanceImprovement) {
            totalPerformance += session.insights.performanceImprovement;
          }
          patternCount += session.patterns?.length || 0;
          if (session.insights.tokenReduction) {
            tokenSavings += session.insights.tokenReduction;
          }
        }
      } catch (e) {
        // Skip invalid files
      }
    });
    
    return {
      performanceGains: sessionFiles.length > 0 ? Math.round(totalPerformance / sessionFiles.length) : 0,
      newPatterns: patternCount,
      tokenReduction: sessionFiles.length > 0 ? Math.round(tokenSavings / sessionFiles.length) : 0
    };
  }

  saveCheck(checkData) {
    fs.writeFileSync(this.lastCheckFile, JSON.stringify(checkData, null, 2));
  }

  saveChanges(changes) {
    fs.writeFileSync(this.changesFile, JSON.stringify(changes, null, 2));
  }

  updateStoredTools(tools) {
    const lastCheck = this.getLastCheck();
    lastCheck.tools = tools;
    this.saveCheck(lastCheck);
  }

  updateStoredAgents(agents) {
    const lastCheck = this.getLastCheck();
    lastCheck.agents = agents;
    this.saveCheck(lastCheck);
  }

  formatBulletSummary(updates) {
    const bullets = [];
    
    if (updates.changes.length === 0 && 
        updates.newFeatures.length === 0 && 
        updates.improvements.length === 0 && 
        updates.fixes.length === 0) {
      return ['No Claude Code changes today'];
    }
    
    // Add changes
    updates.changes.forEach(change => {
      bullets.push(`• ${change}`);
    });
    
    // Add new features
    updates.newFeatures.forEach(feature => {
      bullets.push(`• NEW: ${feature}`);
    });
    
    // Add improvements
    updates.improvements.forEach(improvement => {
      bullets.push(`• IMPROVED: ${improvement}`);
    });
    
    // Add fixes
    updates.fixes.forEach(fix => {
      bullets.push(`• FIXED: ${fix}`);
    });
    
    return bullets;
  }
}

// Export for use in other scripts
module.exports = ClaudeUpdateDetector;

// Run if executed directly
if (require.main === module) {
  const detector = new ClaudeUpdateDetector();
  detector.checkForUpdates().then(updates => {
    const summary = detector.formatBulletSummary(updates);
    console.log('\n📊 Claude Code Updates:');
    summary.forEach(bullet => console.log(bullet));
  });
}