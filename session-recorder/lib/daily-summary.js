#!/usr/bin/env node

/**
 * Daily Summary Generator
 * Automatically generates daily summaries
 */

const cron = require('node-cron');
const ReportGenerator = require('./report-generator');
const KnowledgeBase = require('./knowledge-base');
const { logger } = require('./logger');

class DailySummaryGenerator {
  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.knowledgeBase = new KnowledgeBase();
    this.isRunning = false;
  }

  async initialize() {
    await this.knowledgeBase.initialize();
    
    // Schedule daily summary at 11:59 PM
    cron.schedule('59 23 * * *', async () => {
      await this.generateDailySummary();
    });
    
    logger.info('Daily summary generator initialized');
  }

  async generateDailySummary() {
    if (this.isRunning) {
      logger.warn('Daily summary generation already in progress');
      return;
    }
    
    this.isRunning = true;
    
    try {
      logger.info('Generating daily summary...');
      
      // Generate the report
      const reportPath = await this.reportGenerator.generateDailyReport(new Date());
      
      // Index in knowledge base
      const sessions = await this.knowledgeBase.getSessionHistory(1);
      
      for (const session of sessions) {
        await this.knowledgeBase.indexSession(session);
      }
      
      // Send notification (if configured)
      await this.notifyCompletion(reportPath);
      
      logger.info(`Daily summary completed: ${reportPath}`);
    } catch (error) {
      logger.error('Error generating daily summary:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async notifyCompletion(reportPath) {
    // Could integrate with Slack, email, etc.
    logger.info(`Daily summary available at: ${reportPath}`);
  }

  async generateOnDemand() {
    return await this.generateDailySummary();
  }
}

// Run standalone
if (require.main === module) {
  const generator = new DailySummaryGenerator();
  
  if (process.argv[2] === '--now') {
    // Generate immediately
    generator.generateOnDemand()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    // Run scheduled
    generator.initialize();
  }
}

module.exports = DailySummaryGenerator;