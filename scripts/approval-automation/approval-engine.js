#!/usr/bin/env node

/**
 * Pachacuti Approval Engine - Smart Approval Filtering System
 * Optimizes development workflow by auto-approving routine operations
 */

const fs = require('fs');
const path = require('path');

class ApprovalEngine {
  constructor() {
    this.rulesPath = path.join(__dirname, '../../config/approval-system/approval-rules.json');
    this.rules = this.loadRules();
    this.sessionState = {
      autonomousMode: false,
      startTime: null,
      endTime: null,
      approvedOperations: [],
      blockedOperations: [],
      riskScores: new Map()
    };
  }

  loadRules() {
    try {
      const rulesContent = fs.readFileSync(this.rulesPath, 'utf8');
      return JSON.parse(rulesContent);
    } catch (error) {
      console.error('Failed to load approval rules:', error);
      return this.getDefaultRules();
    }
  }

  getDefaultRules() {
    return {
      autoApprove: {
        gitOperations: { enabled: true },
        developmentCommands: { enabled: true },
        fileOperations: { enabled: true },
        readOperations: { enabled: true }
      },
      requireApproval: {
        critical: true,
        categories: {}
      }
    };
  }

  /**
   * Main approval decision function
   */
  shouldAutoApprove(operation) {
    // If in autonomous mode, be more permissive
    if (this.sessionState.autonomousMode) {
      return this.autonomousApproval(operation);
    }

    // Check if operation matches auto-approve patterns
    if (this.matchesAutoApprovePattern(operation)) {
      this.logApproval(operation, 'auto-approved');
      return true;
    }

    // Check if operation requires approval
    if (this.requiresApproval(operation)) {
      this.logApproval(operation, 'requires-approval');
      return false;
    }

    // Context-aware decision
    return this.contextAwareDecision(operation);
  }

  /**
   * Check for dangerous commands that should NEVER be auto-approved
   */
  isDangerousCommand(command) {
    const dangerousPatterns = [
      /^rm -rf \/$/,           // Delete root
      /^rm -rf \//,            // Delete from root
      /^sudo rm -rf/,          // Sudo delete
      /^dd if=.*of=\/dev/,     // Disk operations
      /^mkfs/,                 // Format filesystem
      /^fdisk/,                // Partition management
      /^chmod 777 \//,         // Make root world-writable
      /curl.*\|\s*(?:bash|sh)/, // Curl to shell
      /wget.*\|\s*(?:bash|sh)/  // Wget to shell
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Check if operation matches auto-approve patterns
   */
  matchesAutoApprovePattern(operation) {
    const { type, command, filePath, action } = operation;
    
    // ALWAYS block dangerous commands
    if (type === 'command' && this.isDangerousCommand(command)) {
      return false;
    }

    // Git operations
    if (type === 'git' && this.rules.autoApprove.gitOperations.enabled) {
      const gitCommands = this.rules.autoApprove.gitOperations.commands;
      return gitCommands.some(cmd => command.startsWith(cmd));
    }

    // Development commands
    if (type === 'command' && this.rules.autoApprove.developmentCommands.enabled) {
      const patterns = this.rules.autoApprove.developmentCommands.patterns;
      return patterns.some(pattern => command.includes(pattern));
    }

    // Supabase operations - FULL AUTONOMY
    if (type === 'command' && this.rules.autoApprove.supabaseOperations?.enabled) {
      const supabaseCommands = this.rules.autoApprove.supabaseOperations.commands;
      if (supabaseCommands.some(cmd => command.startsWith(cmd))) {
        return true;
      }
      // Check PostgreSQL operations
      const psqlPatterns = this.rules.autoApprove.supabaseOperations.psqlOperations?.patterns || [];
      if (psqlPatterns.some(pattern => command.includes(pattern))) {
        return true;
      }
    }

    // File operations
    if (type === 'file' && this.rules.autoApprove.fileOperations.enabled) {
      const allowedPaths = this.rules.autoApprove.fileOperations.autoApprovePaths;
      const allowedActions = this.rules.autoApprove.fileOperations.autoApproveActions;
      
      const pathMatch = allowedPaths.some(pattern => this.matchesPath(filePath, pattern));
      const actionMatch = allowedActions.includes(action);
      
      return pathMatch && actionMatch;
    }

    // Read operations
    if (type === 'read' && this.rules.autoApprove.readOperations.enabled) {
      return this.rules.autoApprove.readOperations.alwaysAutoApprove;
    }

    return false;
  }

  /**
   * Check if operation requires approval
   */
  requiresApproval(operation) {
    const { type, filePath, action } = operation;
    
    if (!this.rules.requireApproval.critical) {
      return false;
    }

    const categories = this.rules.requireApproval.categories;

    // System configuration files
    if (categories.systemConfiguration) {
      const criticalFiles = categories.systemConfiguration.files;
      if (criticalFiles.some(pattern => this.matchesPath(filePath, pattern))) {
        return true;
      }
    }

    // Security sensitive operations
    if (categories.securitySensitive && action) {
      const patterns = categories.securitySensitive.patterns;
      if (patterns.some(pattern => action.includes(pattern))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Context-aware approval decision
   */
  contextAwareDecision(operation) {
    const riskScore = this.calculateRiskScore(operation);
    this.sessionState.riskScores.set(operation.id, riskScore);

    if (!this.rules.smartFiltering?.enabled) {
      return riskScore < 0.5;
    }

    const { riskAssessment } = this.rules.smartFiltering;
    
    if (riskScore <= riskAssessment.lowRisk.threshold) {
      return true; // Auto-approve
    }
    
    if (riskScore >= riskAssessment.highRisk.threshold) {
      return false; // Require approval
    }
    
    // Medium risk - contextual decision
    return this.evaluateContext(operation);
  }

  /**
   * Calculate risk score for an operation
   */
  calculateRiskScore(operation) {
    let score = 0;
    const factors = {
      production: 0.8,
      configuration: 0.6,
      dependency: 0.7,
      external: 0.9,
      test: 0.1,
      documentation: 0.05,
      styling: 0.1,
      dangerousCommand: 1.0  // Maximum risk
    };

    // Check for dangerous commands FIRST
    if (operation.type === 'command' && operation.command) {
      if (this.isDangerousCommand(operation.command)) {
        return 1.0; // Maximum risk score
      }
    }

    // Check each factor
    if (operation.filePath?.includes('production')) score += factors.production;
    if (operation.filePath?.includes('config')) score += factors.configuration;
    if (operation.action?.includes('dependency')) score += factors.dependency;
    if (operation.type === 'external') score += factors.external;
    if (operation.filePath?.includes('test')) score = Math.min(score, factors.test);
    if (operation.filePath?.includes('.md')) score = Math.min(score, factors.documentation);
    if (operation.action === 'styling') score = Math.min(score, factors.styling);

    return Math.min(1, score);
  }

  /**
   * Evaluate context for medium-risk operations
   */
  evaluateContext(operation) {
    const contextRules = this.rules.contextAwareRules?.rules || [];
    
    for (const rule of contextRules) {
      if (this.matchesPath(operation.filePath, rule.pattern)) {
        return rule.approval === 'autoApprove';
      }
    }
    
    // Default to requiring approval for medium risk
    return false;
  }

  /**
   * Autonomous mode approval logic
   */
  autonomousApproval(operation) {
    const riskScore = this.calculateRiskScore(operation);
    
    // In autonomous mode, only block high-risk operations
    if (riskScore >= 0.8) {
      this.logApproval(operation, 'blocked-high-risk');
      return false;
    }
    
    this.logApproval(operation, 'auto-approved-autonomous');
    return true;
  }

  /**
   * Start autonomous development session
   */
  startAutonomousSession(duration = 7200000) { // 2 hours default
    this.sessionState.autonomousMode = true;
    this.sessionState.startTime = Date.now();
    this.sessionState.endTime = Date.now() + duration;
    
    console.log(`🚀 Autonomous development session started`);
    console.log(`Duration: ${duration / 1000 / 60} minutes`);
    console.log(`Auto-approving routine operations...`);
    
    // Set timer to end session
    setTimeout(() => this.endAutonomousSession(), duration);
  }

  /**
   * End autonomous session and provide summary
   */
  endAutonomousSession() {
    if (!this.sessionState.autonomousMode) return;
    
    this.sessionState.autonomousMode = false;
    
    const summary = {
      duration: Date.now() - this.sessionState.startTime,
      approvedCount: this.sessionState.approvedOperations.length,
      blockedCount: this.sessionState.blockedOperations.length,
      operations: {
        approved: this.sessionState.approvedOperations,
        blocked: this.sessionState.blockedOperations
      }
    };
    
    console.log('\n📊 Autonomous Session Summary:');
    console.log(`Duration: ${summary.duration / 1000 / 60} minutes`);
    console.log(`Operations auto-approved: ${summary.approvedCount}`);
    console.log(`Operations requiring approval: ${summary.blockedCount}`);
    
    // Reset session state
    this.sessionState = {
      autonomousMode: false,
      startTime: null,
      endTime: null,
      approvedOperations: [],
      blockedOperations: [],
      riskScores: new Map()
    };
    
    return summary;
  }

  /**
   * Batch operation handling
   */
  processBatch(operations) {
    const results = {
      approved: [],
      requiresApproval: []
    };
    
    // Group similar operations
    const grouped = this.groupOperations(operations);
    
    for (const group of grouped) {
      if (this.shouldAutoApproveBatch(group)) {
        results.approved.push(...group);
      } else {
        results.requiresApproval.push(...group);
      }
    }
    
    return results;
  }

  /**
   * Group similar operations for batch processing
   */
  groupOperations(operations) {
    const groups = new Map();
    
    operations.forEach(op => {
      const key = `${op.type}-${op.action}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(op);
    });
    
    return Array.from(groups.values());
  }

  /**
   * Check if batch should be auto-approved
   */
  shouldAutoApproveBatch(batch) {
    if (!this.rules.batchOperations?.enabled) {
      return false;
    }
    
    const autoApproveBatches = this.rules.batchOperations.autoApproveBatches;
    const batchType = this.identifyBatchType(batch);
    
    return autoApproveBatches.includes(batchType);
  }

  /**
   * Identify batch type from operations
   */
  identifyBatchType(batch) {
    const firstOp = batch[0];
    
    if (batch.every(op => op.type === 'file' && op.action === 'create')) {
      return 'multipleFileCreation';
    }
    if (batch.every(op => op.action === 'format')) {
      return 'bulkCodeFormatting';
    }
    if (batch.every(op => op.filePath?.includes('test'))) {
      return 'testSuiteCreation';
    }
    if (batch.every(op => op.filePath?.includes('.md'))) {
      return 'documentationUpdates';
    }
    if (batch.every(op => op.action === 'styling')) {
      return 'stylingChanges';
    }
    
    return 'unknown';
  }

  /**
   * Path matching utility
   */
  matchesPath(filePath, pattern) {
    if (!filePath) return false;
    
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Log approval decision
   */
  logApproval(operation, decision) {
    const log = {
      timestamp: new Date().toISOString(),
      operation: operation,
      decision: decision,
      riskScore: this.sessionState.riskScores.get(operation.id)
    };
    
    if (decision.includes('approved')) {
      this.sessionState.approvedOperations.push(log);
    } else {
      this.sessionState.blockedOperations.push(log);
    }
    
    // Optional: Write to log file
    if (process.env.LOG_APPROVALS === 'true') {
      this.writeToLog(log);
    }
  }

  /**
   * Write to log file
   */
  writeToLog(log) {
    const logPath = path.join(__dirname, '../../logs/approval-decisions.log');
    const logEntry = JSON.stringify(log) + '\n';
    
    fs.appendFileSync(logPath, logEntry, 'utf8');
  }
}

// Export for use in other modules
module.exports = ApprovalEngine;

// CLI interface
if (require.main === module) {
  const engine = new ApprovalEngine();
  const args = process.argv.slice(2);
  
  if (args[0] === 'start-autonomous') {
    const duration = args[1] ? parseInt(args[1]) * 60 * 1000 : 7200000;
    engine.startAutonomousSession(duration);
  } else if (args[0] === 'check') {
    const operation = JSON.parse(args[1]);
    const result = engine.shouldAutoApprove(operation);
    console.log(result ? 'AUTO_APPROVE' : 'REQUIRE_APPROVAL');
  } else {
    console.log('Usage:');
    console.log('  node approval-engine.js start-autonomous [minutes]');
    console.log('  node approval-engine.js check \'{"type":"git","command":"git status"}\'');
  }
}