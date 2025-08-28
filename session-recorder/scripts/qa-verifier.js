#!/usr/bin/env node

/**
 * QA Verifier - Session Quality Assessment and Validation System
 * Implements comprehensive quality control for session-recorder data
 * 
 * Features:
 * - Session completeness validation
 * - Corruption detection and recovery
 * - Quality scoring and reporting
 * - Batch processing capabilities
 * - Integration with existing session-recorder components
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { logger } = require('../lib/logger');
const SafeSerializer = require('../lib/safe-serializer');

class QAVerifier extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.sessionDir = options.sessionDir || path.join(__dirname, '../data/sessions');
    this.reportsDir = options.reportsDir || path.join(__dirname, '../reports/qa');
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeout = options.circuitBreakerTimeout || 60000; // 1 minute
    
    // Circuit breaker state
    this.failures = 0;
    this.circuitOpen = false;
    this.circuitOpenTime = null;
    
    // Initialize safe serializer
    this.serializer = new SafeSerializer({
      maxStringLength: 10 * 1024 * 1024, // 10MB
      maxContentLength: 5 * 1024, // 5KB
      maxArrayItems: 100
    });
    
    // Quality assessment weights
    this.qualityWeights = {
      completeness: 0.3,
      consistency: 0.2,
      activity_level: 0.25,
      problem_resolution: 0.15,
      file_integrity: 0.1
    };
  }

  /**
   * Main quality assessment function - analyzes a single session
   */
  async analyzeSession(sessionId) {
    if (this.isCircuitOpen()) {
      logger.warn('Quality check circuit breaker activated - skipping analysis');
      return this.createCircuitBreakerResponse(sessionId);
    }

    try {
      const sessionPath = path.join(this.sessionDir, `${sessionId}.json`);
      logger.info(`Analyzing session: ${sessionId}`);
      
      // Attempt to load session data
      const sessionData = await this.loadSessionData(sessionPath);
      
      if (!sessionData) {
        return this.handleSessionLoadFailure(sessionId, sessionPath);
      }

      // Perform comprehensive quality assessment
      const assessment = await this.performQualityAssessment(sessionData);
      
      // Reset failure count on success
      this.failures = 0;
      
      logger.info(`Session analysis complete: ${sessionId}, score: ${assessment.qualityScore.overall}`);
      return assessment;

    } catch (error) {
      this.handleAnalysisError(error, sessionId);
      return this.createErrorAssessment(sessionId, error);
    }
  }

  /**
   * Validate session integrity - checks for corruption and completeness
   */
  async validateSessionIntegrity(sessionId) {
    try {
      const sessionPath = path.join(this.sessionDir, `${sessionId}.json`);
      const corruptedPath = path.join(this.sessionDir, `${sessionId}.json.corrupted`);
      
      let targetPath = sessionPath;
      let isCorrupted = false;
      
      // Check if main file exists, otherwise check for corrupted version
      try {
        await fs.access(sessionPath);
      } catch (error) {
        try {
          await fs.access(corruptedPath);
          targetPath = corruptedPath;
          isCorrupted = true;
          logger.warn(`Using corrupted file for validation: ${sessionId}`);
        } catch (corruptedError) {
          logger.error(`Session file not found: ${sessionId}`);
          return {
            isValid: false,
            errors: [{
              type: 'file_not_found',
              severity: 'critical',
              message: `Session file does not exist: ${sessionPath} or ${corruptedPath}`
            }]
          };
        }
      }

      // Check file size
      const stats = await fs.stat(targetPath);
      if (stats.size === 0) {
        logger.warn(`Empty session file detected: ${sessionId}`);
        return {
          isValid: false,
          errors: [{
            type: 'empty_file',
            severity: 'critical',
            message: 'Session file is empty'
          }]
        };
      }

      // Attempt to parse JSON
      const rawData = await fs.readFile(targetPath, 'utf-8');
      let sessionData;
      
      try {
        sessionData = JSON.parse(rawData);
      } catch (parseError) {
        logger.error(`Failed to parse session ${sessionId}:`, parseError);
        return {
          isValid: false,
          errors: [{
            type: 'corruption',
            severity: 'critical',
            message: `JSON parsing failed: ${parseError.message}`
          }]
        };
      }

      // Validate session structure
      const structureValidation = this.validateSessionStructure(sessionData);
      
      return {
        isValid: structureValidation.isValid && !isCorrupted,
        errors: isCorrupted ? 
          [{ type: 'file_corrupted', severity: 'critical', message: 'Using .corrupted file' }].concat(structureValidation.errors || []) :
          structureValidation.errors || [],
        warnings: structureValidation.warnings || [],
        metadata: {
          fileSize: stats.size,
          lastModified: stats.mtime,
          hasBackup: await this.checkBackupExists(sessionId),
          isCorrupted,
          filePath: targetPath
        }
      };

    } catch (error) {
      logger.error(`Session integrity validation failed for ${sessionId}:`, error);
      return {
        isValid: false,
        errors: [{
          type: 'validation_error',
          severity: 'critical',
          message: `Validation failed: ${error.message}`
        }]
      };
    }
  }

  /**
   * Generate comprehensive quality report
   */
  async generateQualityReport(assessmentResults, options = {}) {
    try {
      const reportId = `qa-report-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
      const reportPath = path.join(this.reportsDir, `${reportId}.json`);
      
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDir, { recursive: true });

      // Create comprehensive report
      const report = {
        reportId,
        timestamp: new Date().toISOString(),
        summary: {
          totalSessions: assessmentResults.totalSessions || 0,
          averageQualityScore: assessmentResults.averageQualityScore || 0,
          healthySessions: assessmentResults.healthySessions || 0,
          problematicSessions: assessmentResults.problematicSessions || 0,
          corruptedSessions: assessmentResults.corruptedSessions || 0
        },
        details: assessmentResults.details || [],
        recommendations: this.generateRecommendations(assessmentResults),
        systemHealth: {
          circuitBreakerStatus: this.circuitOpen ? 'OPEN' : 'CLOSED',
          recentFailures: this.failures,
          lastAssessment: new Date().toISOString()
        }
      };

      // Generate markdown report if requested
      if (options.generateMarkdown !== false) {
        await this.generateMarkdownReport(report, reportPath.replace('.json', '.md'));
      }

      // Write JSON report
      const reportJson = this.serializer.safeStringify(report, null, 2);
      await fs.writeFile(reportPath, reportJson);

      logger.info(`Quality report generated: ${reportPath}`);
      
      return {
        success: true,
        reportPath,
        reportId,
        summary: report.summary
      };

    } catch (error) {
      logger.error('Failed to generate quality report:', error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Process multiple sessions in batch
   */
  async processSessionBatch(sessionDirectory = null) {
    const targetDir = sessionDirectory || this.sessionDir;
    
    try {
      // Get all session files
      const files = await fs.readdir(targetDir);
      const sessionFiles = files.filter(f => f.endsWith('.json') && !f.includes('.backup'));
      
      logger.info(`Processing batch of ${sessionFiles.length} sessions from ${targetDir}`);

      const results = {
        totalSessions: sessionFiles.length,
        processedSessions: 0,
        healthySessions: 0,
        problematicSessions: 0,
        corruptedSessions: 0,
        emptySession: 0,
        details: [],
        totalQualityScore: 0
      };

      // Process each session
      for (const fileName of sessionFiles) {
        const sessionId = fileName.replace('.json', '');
        
        try {
          logger.debug(`Processing session: ${sessionId}`);
          
          const assessment = await this.analyzeSession(sessionId);
          results.details.push(assessment);
          results.processedSessions++;

          // Categorize session
          if (assessment.errors && assessment.errors.length > 0) {
            const hasCorruption = assessment.errors.some(e => e.type === 'corruption');
            if (hasCorruption) {
              results.corruptedSessions++;
            } else {
              results.problematicSessions++;
            }
          } else if (assessment.qualityScore && assessment.qualityScore.overall > 0.7) {
            results.healthySessions++;
          } else if (assessment.qualityScore && assessment.qualityScore.overall < 0.3) {
            results.emptySession++;
          } else {
            results.problematicSessions++;
          }

          // Accumulate quality scores
          if (assessment.qualityScore) {
            results.totalQualityScore += assessment.qualityScore.overall || 0;
          }

        } catch (error) {
          logger.error(`Failed to process session ${sessionId}:`, error);
          results.details.push({
            sessionId,
            errors: [{ type: 'processing_error', message: error.message }]
          });
          results.problematicSessions++;
        }
      }

      // Calculate average quality score
      results.averageQualityScore = results.processedSessions > 0 
        ? results.totalQualityScore / results.processedSessions 
        : 0;

      logger.info(`Batch processing complete: ${results.processedSessions}/${results.totalSessions} sessions`);
      return results;

    } catch (error) {
      logger.error('Batch processing failed:', error);
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Attempt session recovery for corrupted files
   */
  async attemptSessionRecovery(sessionId) {
    logger.info(`Attempting recovery for session: ${sessionId}`);
    
    try {
      const mainPath = path.join(this.sessionDir, `${sessionId}.json`);
      const backupPath = path.join(this.sessionDir, `${sessionId}.backup.json`);
      const corruptedPath = path.join(this.sessionDir, `${sessionId}.json.corrupted`);

      // Check if backup exists
      try {
        await fs.access(backupPath);
        logger.info(`Backup file found for ${sessionId}, attempting recovery`);
        
        const backupData = await fs.readFile(backupPath, 'utf-8');
        const sessionData = JSON.parse(backupData);
        
        // Validate backup data
        const validation = this.validateSessionStructure(sessionData);
        
        if (validation.isValid) {
          // Recovery successful
          logger.info(`Successfully recovered session ${sessionId} from backup`);
          return {
            recoverable: true,
            status: 'recovered_from_backup',
            data: sessionData,
            source: 'backup'
          };
        } else {
          logger.warn(`Backup file for ${sessionId} is also corrupted`);
        }
      } catch (backupError) {
        logger.debug(`No backup available for ${sessionId}: ${backupError.message}`);
      }

      // Check for corrupted file (might have partial data)
      try {
        await fs.access(corruptedPath);
        logger.info(`Corrupted file found for ${sessionId}, attempting partial recovery`);
        
        const corruptedData = await fs.readFile(corruptedPath, 'utf-8');
        const partialData = this.attemptPartialRecovery(corruptedData, sessionId);
        
        if (partialData) {
          return {
            recoverable: true,
            status: 'partial_recovery',
            data: partialData,
            source: 'corrupted_file'
          };
        }
      } catch (corruptedError) {
        logger.debug(`No corrupted file found for ${sessionId}`);
      }

      // Complete loss
      logger.error(`Complete session loss detected for ${sessionId}`, {
        sessionId,
        mainPath,
        backupPath,
        corruptedPath
      });

      return {
        recoverable: false,
        status: 'complete_loss',
        data: null,
        attempts: ['backup', 'corrupted_file', 'partial_recovery']
      };

    } catch (error) {
      logger.error(`Recovery attempt failed for ${sessionId}:`, error);
      return {
        recoverable: false,
        status: 'recovery_failed',
        error: error.message
      };
    }
  }

  /**
   * Calculate comprehensive quality score
   */
  async calculateQualityScore(sessionData) {
    const factors = {
      completeness: this.assessCompleteness(sessionData),
      consistency: this.assessConsistency(sessionData),
      activity_level: this.assessActivityLevel(sessionData),
      problem_resolution: this.assessProblemResolution(sessionData),
      file_integrity: this.assessFileIntegrity(sessionData)
    };

    // Calculate weighted overall score
    let overall = 0;
    for (const [factor, score] of Object.entries(factors)) {
      overall += score * (this.qualityWeights[factor] || 0);
    }

    return {
      overall: Math.round(overall * 100) / 100, // Round to 2 decimal places
      factors,
      weights: this.qualityWeights,
      grade: this.getQualityGrade(overall)
    };
  }

  // Private helper methods

  async loadSessionData(sessionPath) {
    try {
      const rawData = await fs.readFile(sessionPath, 'utf-8');
      return JSON.parse(rawData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Session file not found: ${sessionPath}`);
        return null;
      }
      throw error;
    }
  }

  async performQualityAssessment(sessionData) {
    const qualityScore = await this.calculateQualityScore(sessionData);
    const integrity = await this.validateSessionIntegrity(sessionData.sessionId);
    
    return {
      sessionId: sessionData.sessionId,
      timestamp: new Date().toISOString(),
      qualityScore,
      integrity,
      completeness: {
        hasActivities: Array.isArray(sessionData.activities) && sessionData.activities.length > 0,
        hasFileChanges: Array.isArray(sessionData.fileChanges) && sessionData.fileChanges.length > 0,
        hasCommits: Array.isArray(sessionData.gitCommits) && sessionData.gitCommits.length > 0,
        hasDecisions: Array.isArray(sessionData.decisions) && sessionData.decisions.length > 0
      },
      metadata: {
        activitiesCount: sessionData.activities?.length || 0,
        fileChangesCount: sessionData.fileChanges?.length || 0,
        commitsCount: sessionData.gitCommits?.length || 0,
        assessmentTime: new Date().toISOString()
      },
      errors: integrity.errors || [],
      warnings: integrity.warnings || []
    };
  }

  validateSessionStructure(sessionData) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!sessionData.sessionId) {
      errors.push({ type: 'missing_field', field: 'sessionId', severity: 'critical' });
    }
    
    if (!sessionData.start) {
      errors.push({ type: 'missing_field', field: 'start', severity: 'high' });
    }

    // Array fields should be arrays
    const arrayFields = ['activities', 'fileChanges', 'gitCommits', 'commands', 'decisions'];
    for (const field of arrayFields) {
      if (sessionData[field] && !Array.isArray(sessionData[field])) {
        errors.push({ type: 'invalid_type', field, expected: 'array', severity: 'high' });
      }
    }

    // Warn about empty session
    if (!sessionData.activities || sessionData.activities.length === 0) {
      warnings.push({ type: 'empty_activities', severity: 'medium', message: 'Session has no activities' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async checkBackupExists(sessionId) {
    try {
      const backupPath = path.join(this.sessionDir, `${sessionId}.backup.json`);
      await fs.access(backupPath);
      return true;
    } catch {
      return false;
    }
  }

  assessCompleteness(sessionData) {
    let score = 0;
    
    if (sessionData.sessionId) score += 0.2;
    if (sessionData.start && sessionData.lastUpdate) score += 0.2;
    if (sessionData.activities && sessionData.activities.length > 0) score += 0.3;
    if (sessionData.fileChanges && sessionData.fileChanges.length > 0) score += 0.2;
    if (sessionData.gitCommits && sessionData.gitCommits.length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  assessConsistency(sessionData) {
    let score = 1.0;
    
    // Check timestamp consistency
    if (sessionData.activities) {
      for (const activity of sessionData.activities.slice(0, 10)) {
        if (!activity.timestamp) {
          score -= 0.1;
        }
      }
    }

    return Math.max(score, 0);
  }

  assessActivityLevel(sessionData) {
    const activities = sessionData.activities?.length || 0;
    if (activities === 0) return 0;
    if (activities < 5) return 0.3;
    if (activities < 20) return 0.6;
    if (activities < 50) return 0.8;
    return 1.0;
  }

  assessProblemResolution(sessionData) {
    const problems = sessionData.problems?.length || 0;
    const solutions = sessionData.solutions?.length || 0;
    
    if (problems === 0) return solutions > 0 ? 0.8 : 0.5;
    
    const resolutionRatio = solutions / problems;
    return Math.min(resolutionRatio, 1.0);
  }

  assessFileIntegrity(sessionData) {
    // Basic file integrity based on structure completeness
    let score = 1.0;
    
    if (!sessionData.metadata) score -= 0.3;
    if (sessionData.activities && sessionData.metadata?.activitiesCount !== sessionData.activities.length) {
      score -= 0.2;
    }
    
    return Math.max(score, 0);
  }

  getQualityGrade(score) {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }

  attemptPartialRecovery(corruptedData, sessionId) {
    try {
      // Try to extract basic session info even from corrupted JSON
      const sessionIdMatch = corruptedData.match(/"sessionId":\s*"([^"]+)"/);
      const startMatch = corruptedData.match(/"start":\s*"([^"]+)"/);
      const activitiesMatch = corruptedData.match(/"activities":\s*\[/);
      
      if (sessionIdMatch || startMatch) {
        logger.info(`Partial recovery possible for ${sessionId}`);
        return {
          sessionId: sessionIdMatch?.[1] || sessionId,
          start: startMatch?.[1] || new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          activities: [],
          fileChanges: [],
          gitCommits: [],
          metadata: {
            recovered: true,
            partialRecovery: true,
            originalCorrupted: true
          }
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Partial recovery failed for ${sessionId}:`, error);
      return null;
    }
  }

  generateRecommendations(assessmentResults) {
    const recommendations = [];
    
    if (assessmentResults.corruptedSessions > 0) {
      recommendations.push({
        priority: 'high',
        category: 'data_integrity',
        message: `${assessmentResults.corruptedSessions} corrupted sessions detected. Consider implementing more robust backup strategies.`
      });
    }
    
    if (assessmentResults.averageQualityScore < 0.7) {
      recommendations.push({
        priority: 'medium',
        category: 'quality_improvement',
        message: 'Low average quality score. Review session capture processes and data validation.'
      });
    }
    
    if (assessmentResults.emptySession > 0) {
      recommendations.push({
        priority: 'low',
        category: 'session_monitoring',
        message: `${assessmentResults.emptySession} empty sessions found. Consider improving session lifecycle management.`
      });
    }

    return recommendations;
  }

  async generateMarkdownReport(report, markdownPath) {
    const markdown = `# QA Report - ${report.reportId}

## Summary
- **Total Sessions**: ${report.summary.totalSessions}
- **Average Quality Score**: ${report.summary.averageQualityScore.toFixed(2)}
- **Healthy Sessions**: ${report.summary.healthySessions}
- **Problematic Sessions**: ${report.summary.problematicSessions}
- **Corrupted Sessions**: ${report.summary.corruptedSessions}

## System Health
- **Circuit Breaker**: ${report.systemHealth.circuitBreakerStatus}
- **Recent Failures**: ${report.systemHealth.recentFailures}
- **Last Assessment**: ${report.systemHealth.lastAssessment}

## Recommendations
${report.recommendations.map(r => `- **${r.category}** (${r.priority}): ${r.message}`).join('\n')}

Generated on: ${report.timestamp}
`;

    await fs.writeFile(markdownPath, markdown);
  }

  // Circuit breaker methods
  
  isCircuitOpen() {
    if (!this.circuitOpen) return false;

    // Reset circuit breaker after timeout
    if (Date.now() - this.circuitOpenTime > this.circuitBreakerTimeout) {
      this.circuitOpen = false;
      this.circuitOpenTime = null;
      this.failures = 0;
      logger.info('Quality check circuit breaker reset');
      return false;
    }

    return true;
  }

  handleAnalysisError(error, sessionId) {
    this.failures++;
    
    logger.error(`Quality analysis failed for ${sessionId}:`, {
      error: error.message,
      type: error.constructor.name,
      failures: this.failures,
      sessionId
    });

    // Open circuit breaker if too many failures
    if (this.failures >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitOpenTime = Date.now();
      logger.warn('Quality check circuit breaker activated due to repeated failures');
    }
  }

  createCircuitBreakerResponse(sessionId) {
    return {
      sessionId,
      circuitBreakerActive: true,
      timestamp: new Date().toISOString(),
      message: 'Quality assessment skipped - circuit breaker is open',
      errors: [{
        type: 'circuit_breaker_open',
        severity: 'warning',
        message: 'Too many recent failures, circuit breaker activated'
      }]
    };
  }

  handleSessionLoadFailure(sessionId, sessionPath) {
    logger.error(`Failed to load session ${sessionId} from ${sessionPath}`);
    return {
      sessionId,
      errors: [{
        type: 'load_failure',
        severity: 'critical',
        message: `Could not load session data from ${sessionPath}`
      }],
      recovery: null
    };
  }

  createErrorAssessment(sessionId, error) {
    return {
      sessionId,
      timestamp: new Date().toISOString(),
      errors: [{
        type: 'assessment_error',
        severity: 'critical',
        message: error.message,
        stack: error.stack
      }],
      qualityScore: { overall: 0, factors: {} }
    };
  }
}

// CLI Interface
async function main() {
  if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const qaVerifier = new QAVerifier();

    try {
      switch (command) {
        case 'analyze':
          if (!args[1]) {
            console.error('Usage: qa-verifier.js analyze <sessionId>');
            process.exit(1);
          }
          const result = await qaVerifier.analyzeSession(args[1]);
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'batch':
          const batchResults = await qaVerifier.processSessionBatch(args[1]);
          console.log(JSON.stringify(batchResults, null, 2));
          break;

        case 'validate':
          if (!args[1]) {
            console.error('Usage: qa-verifier.js validate <sessionId>');
            process.exit(1);
          }
          const validation = await qaVerifier.validateSessionIntegrity(args[1]);
          console.log(JSON.stringify(validation, null, 2));
          break;

        case 'recover':
          if (!args[1]) {
            console.error('Usage: qa-verifier.js recover <sessionId>');
            process.exit(1);
          }
          const recovery = await qaVerifier.attemptSessionRecovery(args[1]);
          console.log(JSON.stringify(recovery, null, 2));
          break;

        case 'report':
          const reportResults = await qaVerifier.processSessionBatch();
          const report = await qaVerifier.generateQualityReport(reportResults);
          console.log(JSON.stringify(report, null, 2));
          break;

        default:
          console.log(`
QA Verifier - Session Quality Assessment Tool

Usage:
  qa-verifier.js analyze <sessionId>     - Analyze single session
  qa-verifier.js batch [directory]       - Process all sessions in directory
  qa-verifier.js validate <sessionId>    - Validate session integrity
  qa-verifier.js recover <sessionId>     - Attempt session recovery
  qa-verifier.js report                  - Generate quality report

Examples:
  qa-verifier.js analyze session-2025-08-27-abc123
  qa-verifier.js batch /path/to/sessions
  qa-verifier.js validate session-2025-08-27-abc123
  qa-verifier.js recover corrupted-session-id
  qa-verifier.js report
          `);
          break;
      }
    } catch (error) {
      logger.error('QA Verifier error:', error);
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Export for require() usage
module.exports = QAVerifier;

// Run CLI if called directly
if (require.main === module) {
  main();
}