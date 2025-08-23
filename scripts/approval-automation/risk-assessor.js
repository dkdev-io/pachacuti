#!/usr/bin/env node

/**
 * Pachacuti Risk Assessment Framework
 * Intelligent risk scoring for development operations
 */

class RiskAssessor {
  constructor() {
    this.riskFactors = {
      // File type risks
      production: 0.85,
      configuration: 0.65,
      environment: 0.75,
      security: 0.90,
      authentication: 0.88,
      database: 0.70,
      deployment: 0.72,
      infrastructure: 0.80,
      
      // Operation risks
      dependency: 0.68,
      external: 0.85,
      deletion: 0.60,
      migration: 0.75,
      schema: 0.70,
      
      // Safe operations
      test: 0.10,
      documentation: 0.05,
      styling: 0.08,
      comment: 0.02,
      formatting: 0.05,
      example: 0.08,
      mock: 0.10
    };
    
    this.contextModifiers = {
      batchOperation: -0.1,    // Lower risk for batch ops
      userRequested: -0.15,    // Lower risk for explicit user requests
      automatedFix: -0.05,     // Lower risk for automated fixes
      firstTime: 0.2,          // Higher risk for first-time operations
      recentFailure: 0.15,     // Higher risk if recent failures
      criticalPath: 0.25       // Higher risk for critical path code
    };
    
    this.operationHistory = new Map();
    this.failureHistory = new Map();
  }
  
  /**
   * Calculate comprehensive risk score for an operation
   */
  calculateRisk(operation) {
    let baseScore = this.getBaseRiskScore(operation);
    let contextScore = this.getContextModifiers(operation);
    let historyScore = this.getHistoryScore(operation);
    
    // Combine scores with weights
    let finalScore = (baseScore * 0.6) + (contextScore * 0.25) + (historyScore * 0.15);
    
    // Clamp between 0 and 1
    finalScore = Math.max(0, Math.min(1, finalScore));
    
    // Record in history
    this.recordOperation(operation, finalScore);
    
    return {
      score: finalScore,
      level: this.getRiskLevel(finalScore),
      factors: this.getContributingFactors(operation, baseScore, contextScore, historyScore),
      recommendation: this.getRecommendation(finalScore)
    };
  }
  
  /**
   * Get base risk score from operation characteristics
   */
  getBaseRiskScore(operation) {
    const { type, filePath, action, command } = operation;
    let score = 0;
    let factorCount = 0;
    
    // Check file path risks
    if (filePath) {
      Object.entries(this.riskFactors).forEach(([key, value]) => {
        if (filePath.toLowerCase().includes(key)) {
          score += value;
          factorCount++;
        }
      });
    }
    
    // Check action risks
    if (action) {
      Object.entries(this.riskFactors).forEach(([key, value]) => {
        if (action.toLowerCase().includes(key)) {
          score += value;
          factorCount++;
        }
      });
    }
    
    // Check command risks
    if (command) {
      // High risk commands
      if (command.includes('rm -rf')) score += 0.9;
      if (command.includes('DROP')) score += 0.85;
      if (command.includes('DELETE')) score += 0.7;
      if (command.includes('sudo')) score += 0.8;
      if (command.includes('chmod 777')) score += 0.75;
      
      // Medium risk commands
      if (command.includes('npm install')) score += 0.4;
      if (command.includes('pip install')) score += 0.4;
      if (command.includes('apt-get')) score += 0.5;
      
      // Low risk commands
      if (command.includes('git status')) score += 0.05;
      if (command.includes('ls')) score += 0.02;
      if (command.includes('echo')) score += 0.02;
    }
    
    // Average the scores if multiple factors
    if (factorCount > 0) {
      score = score / factorCount;
    }
    
    return score;
  }
  
  /**
   * Get context-based modifiers
   */
  getContextModifiers(operation) {
    const { context = {} } = operation;
    let modifier = 0;
    
    // Apply context modifiers
    if (context.isBatch) modifier += this.contextModifiers.batchOperation;
    if (context.userRequested) modifier += this.contextModifiers.userRequested;
    if (context.isAutomatedFix) modifier += this.contextModifiers.automatedFix;
    if (context.isFirstTime) modifier += this.contextModifiers.firstTime;
    if (context.hasRecentFailure) modifier += this.contextModifiers.recentFailure;
    if (context.isCriticalPath) modifier += this.contextModifiers.criticalPath;
    
    // Time-based modifiers
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      modifier += 0.1; // Higher risk during off-hours
    }
    
    // Day-based modifiers
    const day = new Date().getDay();
    if (day === 5) { // Friday
      modifier += 0.05; // Slightly higher risk on Fridays
    }
    
    return modifier;
  }
  
  /**
   * Get history-based risk score
   */
  getHistoryScore(operation) {
    const key = this.getOperationKey(operation);
    
    // Check failure history
    if (this.failureHistory.has(key)) {
      const failures = this.failureHistory.get(key);
      const recentFailures = failures.filter(f => 
        Date.now() - f.timestamp < 3600000 // Within last hour
      );
      
      if (recentFailures.length > 0) {
        return 0.2 * recentFailures.length; // Increase risk per recent failure
      }
    }
    
    // Check success history
    if (this.operationHistory.has(key)) {
      const history = this.operationHistory.get(key);
      const successRate = history.filter(h => h.success).length / history.length;
      
      if (successRate > 0.95 && history.length > 10) {
        return -0.1; // Lower risk for consistently successful operations
      }
    }
    
    return 0;
  }
  
  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score < 0.2) return 'LOW';
    if (score < 0.4) return 'LOW_MEDIUM';
    if (score < 0.6) return 'MEDIUM';
    if (score < 0.8) return 'HIGH';
    return 'CRITICAL';
  }
  
  /**
   * Get contributing factors for transparency
   */
  getContributingFactors(operation, baseScore, contextScore, historyScore) {
    const factors = [];
    
    // Identify main risk factors
    if (operation.filePath) {
      if (operation.filePath.includes('production')) {
        factors.push('Production code modification');
      }
      if (operation.filePath.includes('config')) {
        factors.push('Configuration file change');
      }
      if (operation.filePath.includes('.env')) {
        factors.push('Environment variable modification');
      }
    }
    
    // Context factors
    if (operation.context?.isFirstTime) {
      factors.push('First-time operation');
    }
    if (operation.context?.hasRecentFailure) {
      factors.push('Recent failure detected');
    }
    
    // History factors
    if (historyScore > 0.1) {
      factors.push('Previous failures recorded');
    }
    
    return {
      primary: factors,
      scores: {
        base: baseScore.toFixed(2),
        context: contextScore.toFixed(2),
        history: historyScore.toFixed(2)
      }
    };
  }
  
  /**
   * Get recommendation based on risk score
   */
  getRecommendation(score) {
    if (score < 0.2) {
      return {
        action: 'AUTO_APPROVE',
        message: 'Safe operation - automatic approval recommended'
      };
    }
    if (score < 0.4) {
      return {
        action: 'AUTO_APPROVE_WITH_LOG',
        message: 'Low risk - approve but log for audit'
      };
    }
    if (score < 0.6) {
      return {
        action: 'CONTEXTUAL_APPROVAL',
        message: 'Medium risk - check context and recent history'
      };
    }
    if (score < 0.8) {
      return {
        action: 'REQUIRE_APPROVAL',
        message: 'High risk - user approval required'
      };
    }
    return {
      action: 'BLOCK_WITH_WARNING',
      message: 'Critical risk - requires explicit confirmation'
    };
  }
  
  /**
   * Record operation for history tracking
   */
  recordOperation(operation, score) {
    const key = this.getOperationKey(operation);
    
    if (!this.operationHistory.has(key)) {
      this.operationHistory.set(key, []);
    }
    
    this.operationHistory.get(key).push({
      timestamp: Date.now(),
      score: score,
      success: true // Will be updated if operation fails
    });
    
    // Keep only last 100 operations per key
    const history = this.operationHistory.get(key);
    if (history.length > 100) {
      this.operationHistory.set(key, history.slice(-100));
    }
  }
  
  /**
   * Record operation failure
   */
  recordFailure(operation, error) {
    const key = this.getOperationKey(operation);
    
    if (!this.failureHistory.has(key)) {
      this.failureHistory.set(key, []);
    }
    
    this.failureHistory.get(key).push({
      timestamp: Date.now(),
      error: error.message || error
    });
    
    // Update success status in operation history
    if (this.operationHistory.has(key)) {
      const history = this.operationHistory.get(key);
      if (history.length > 0) {
        history[history.length - 1].success = false;
      }
    }
  }
  
  /**
   * Generate unique key for operation
   */
  getOperationKey(operation) {
    return `${operation.type || 'unknown'}-${operation.action || 'unknown'}-${operation.filePath || operation.command || 'unknown'}`;
  }
  
  /**
   * Analyze batch of operations for combined risk
   */
  analyzeBatch(operations) {
    const individualRisks = operations.map(op => this.calculateRisk(op));
    
    // Calculate combined risk
    const maxRisk = Math.max(...individualRisks.map(r => r.score));
    const avgRisk = individualRisks.reduce((sum, r) => sum + r.score, 0) / individualRisks.length;
    
    // Batch operations generally have lower risk
    const batchRisk = (maxRisk * 0.7) + (avgRisk * 0.3);
    
    return {
      batchRisk: batchRisk,
      level: this.getRiskLevel(batchRisk),
      individualRisks: individualRisks,
      recommendation: this.getBatchRecommendation(batchRisk, individualRisks)
    };
  }
  
  /**
   * Get batch-specific recommendation
   */
  getBatchRecommendation(batchRisk, individualRisks) {
    const highRiskOps = individualRisks.filter(r => r.score >= 0.6);
    
    if (highRiskOps.length > 0) {
      return {
        action: 'PARTIAL_APPROVAL',
        message: `Approve ${individualRisks.length - highRiskOps.length} safe operations, review ${highRiskOps.length} high-risk operations`
      };
    }
    
    if (batchRisk < 0.3) {
      return {
        action: 'BATCH_AUTO_APPROVE',
        message: 'All operations in batch are safe'
      };
    }
    
    return {
      action: 'BATCH_REVIEW',
      message: 'Review batch for combined impact'
    };
  }
  
  /**
   * Export risk assessment report
   */
  exportReport() {
    return {
      timestamp: new Date().toISOString(),
      totalOperations: Array.from(this.operationHistory.values()).flat().length,
      failureRate: this.calculateFailureRate(),
      riskDistribution: this.getRiskDistribution(),
      topRisks: this.getTopRisks(),
      recommendations: this.getSystemRecommendations()
    };
  }
  
  /**
   * Calculate overall failure rate
   */
  calculateFailureRate() {
    let total = 0;
    let failures = 0;
    
    this.operationHistory.forEach(history => {
      total += history.length;
      failures += history.filter(h => !h.success).length;
    });
    
    return total > 0 ? (failures / total).toFixed(3) : 0;
  }
  
  /**
   * Get risk distribution
   */
  getRiskDistribution() {
    const distribution = {
      LOW: 0,
      LOW_MEDIUM: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    this.operationHistory.forEach(history => {
      history.forEach(op => {
        const level = this.getRiskLevel(op.score);
        distribution[level]++;
      });
    });
    
    return distribution;
  }
  
  /**
   * Get top risk operations
   */
  getTopRisks() {
    const risks = [];
    
    this.operationHistory.forEach((history, key) => {
      const avgScore = history.reduce((sum, h) => sum + h.score, 0) / history.length;
      risks.push({ operation: key, avgRisk: avgScore, count: history.length });
    });
    
    return risks.sort((a, b) => b.avgRisk - a.avgRisk).slice(0, 10);
  }
  
  /**
   * Get system-wide recommendations
   */
  getSystemRecommendations() {
    const recommendations = [];
    const failureRate = this.calculateFailureRate();
    
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected - review approval thresholds');
    }
    
    const distribution = this.getRiskDistribution();
    if (distribution.CRITICAL > distribution.LOW) {
      recommendations.push('Many critical operations - consider stricter controls');
    }
    
    if (distribution.LOW > distribution.CRITICAL * 10) {
      recommendations.push('Mostly safe operations - consider relaxing controls');
    }
    
    return recommendations;
  }
}

// Export for use
module.exports = RiskAssessor;

// CLI interface
if (require.main === module) {
  const assessor = new RiskAssessor();
  const args = process.argv.slice(2);
  
  if (args[0] === 'assess') {
    const operation = JSON.parse(args[1]);
    const result = assessor.calculateRisk(operation);
    console.log(JSON.stringify(result, null, 2));
  } else if (args[0] === 'batch') {
    const operations = JSON.parse(args[1]);
    const result = assessor.analyzeBatch(operations);
    console.log(JSON.stringify(result, null, 2));
  } else if (args[0] === 'report') {
    const report = assessor.exportReport();
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('Usage:');
    console.log('  node risk-assessor.js assess \'{"type":"file","filePath":"src/index.js","action":"edit"}\'');
    console.log('  node risk-assessor.js batch \'[{"type":"file","filePath":"src/index.js"},{"type":"git","command":"git push"}]\'');
    console.log('  node risk-assessor.js report');
  }
}