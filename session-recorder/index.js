#!/usr/bin/env node

/**
 * Pachacuti Session Recorder - Main Entry Point
 * The "Second Brain" for development operations
 */

const SessionCapture = require('./lib/session-capture');
const GitAnalyzer = require('./lib/git-analyzer');
const ReportGenerator = require('./lib/report-generator');
const KnowledgeBase = require('./lib/knowledge-base');
const SessionMonitor = require('./lib/session-monitor');
const HistoryRecovery = require('./lib/history-recovery');
const { logger } = require('./lib/logger');

class PachacutiSessionRecorder {
  constructor() {
    this.sessionCapture = new SessionCapture();
    this.gitAnalyzer = new GitAnalyzer();
    this.reportGenerator = new ReportGenerator();
    this.knowledgeBase = new KnowledgeBase();
    this.sessionMonitor = new SessionMonitor();
    this.historyRecovery = new HistoryRecovery();
    
    this.config = {
      autoCapture: true,
      realTimeMonitoring: true,
      gitIntegration: true,
      searchableIndex: true,
      autoSummaries: true,
      pachacutiIntegration: true
    };
  }

  async initialize() {
    logger.info('🚀 Initializing Pachacuti Session Recorder...');
    
    // Initialize all components
    await this.knowledgeBase.initialize();
    await this.sessionMonitor.start();
    await this.historyRecovery.recoverHistory();
    
    // Set up automatic capture
    if (this.config.autoCapture) {
      this.setupAutoCapture();
    }
    
    // Set up real-time monitoring
    if (this.config.realTimeMonitoring) {
      this.setupRealTimeMonitoring();
    }
    
    // Set up git integration
    if (this.config.gitIntegration) {
      this.setupGitIntegration();
    }
    
    logger.info('✅ Session Recorder initialized successfully');
  }

  setupAutoCapture() {
    // Capture session start
    process.on('SIGINT', () => this.captureSessionEnd());
    process.on('SIGTERM', () => this.captureSessionEnd());
    
    // Capture periodic snapshots
    setInterval(() => {
      this.captureSnapshot();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  setupRealTimeMonitoring() {
    this.sessionMonitor.on('fileChange', (event) => {
      this.sessionCapture.recordFileChange(event);
    });
    
    this.sessionMonitor.on('gitActivity', (event) => {
      this.sessionCapture.recordGitActivity(event);
    });
    
    this.sessionMonitor.on('commandExecuted', (event) => {
      this.sessionCapture.recordCommand(event);
    });
  }

  setupGitIntegration() {
    this.gitAnalyzer.on('commitDetected', (commit) => {
      this.sessionCapture.recordCommit(commit);
      this.knowledgeBase.indexCommit(commit);
    });
    
    this.gitAnalyzer.startWatching();
  }

  async captureSnapshot() {
    const snapshot = await this.sessionCapture.createSnapshot();
    await this.knowledgeBase.indexSnapshot(snapshot);
    logger.info('📸 Session snapshot captured');
  }

  async captureSessionEnd() {
    logger.info('📝 Capturing session end...');
    const summary = await this.sessionCapture.generateSummary();
    await this.reportGenerator.generateSessionReport(summary);
    await this.knowledgeBase.indexSession(summary);
    logger.info('✅ Session recorded successfully');
    process.exit(0);
  }

  async searchKnowledge(query) {
    return await this.knowledgeBase.search(query);
  }

  async generateReports() {
    await this.reportGenerator.generateDailyReport();
    await this.reportGenerator.generateWeeklyReport();
    await this.reportGenerator.generateProjectTimeline();
  }
}

// Start the recorder
if (require.main === module) {
  const recorder = new PachacutiSessionRecorder();
  recorder.initialize().catch(console.error);
  
  // Keep process alive
  process.stdin.resume();
}

module.exports = PachacutiSessionRecorder;