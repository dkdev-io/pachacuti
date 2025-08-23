#!/usr/bin/env node

/**
 * Weekly Summary Generator
 * Automatically generates weekly summaries
 */

const cron = require('node-cron');
const moment = require('moment');
const ReportGenerator = require('./report-generator');
const KnowledgeBase = require('./knowledge-base');
const { logger } = require('./logger');

class WeeklySummaryGenerator {
  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.knowledgeBase = new KnowledgeBase();
    this.isRunning = false;
  }

  async initialize() {
    await this.knowledgeBase.initialize();
    
    // Schedule weekly summary on Sundays at 11:59 PM
    cron.schedule('59 23 * * 0', async () => {
      await this.generateWeeklySummary();
    });
    
    logger.info('Weekly summary generator initialized');
  }

  async generateWeeklySummary() {
    if (this.isRunning) {
      logger.warn('Weekly summary generation already in progress');
      return;
    }
    
    this.isRunning = true;
    
    try {
      logger.info('Generating weekly summary...');
      
      // Generate the report
      const weekStart = moment().startOf('week');
      const reportPath = await this.reportGenerator.generateWeeklyReport(weekStart);
      
      // Analyze weekly patterns
      const analysis = await this.analyzeWeeklyPatterns(weekStart);
      
      // Store insights
      await this.storeWeeklyInsights(analysis);
      
      logger.info(`Weekly summary completed: ${reportPath}`);
      
      return {
        reportPath,
        analysis
      };
    } catch (error) {
      logger.error('Error generating weekly summary:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async analyzeWeeklyPatterns(weekStart) {
    const sessions = await this.knowledgeBase.getSessionHistory(7);
    
    const analysis = {
      totalSessions: sessions.length,
      totalDuration: 0,
      peakDay: null,
      peakHour: null,
      technologies: {},
      patterns: []
    };
    
    // Analyze session patterns
    const dayActivity = {};
    const hourActivity = {};
    
    sessions.forEach(session => {
      const startTime = new Date(session.start_time);
      const day = startTime.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = startTime.getHours();
      
      dayActivity[day] = (dayActivity[day] || 0) + 1;
      hourActivity[hour] = (hourActivity[hour] || 0) + 1;
      
      analysis.totalDuration += session.duration || 0;
    });
    
    // Find peak times
    analysis.peakDay = Object.entries(dayActivity)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    analysis.peakHour = Object.entries(hourActivity)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    // Identify patterns
    if (analysis.totalSessions > 10) {
      analysis.patterns.push('High activity week');
    }
    if (analysis.peakHour >= 20) {
      analysis.patterns.push('Evening development preference');
    }
    if (analysis.peakHour <= 10) {
      analysis.patterns.push('Morning development preference');
    }
    
    return analysis;
  }

  async storeWeeklyInsights(analysis) {
    const insights = {
      week: moment().format('YYYY-[W]WW'),
      ...analysis,
      timestamp: new Date().toISOString()
    };
    
    // Store in knowledge base
    await this.knowledgeBase.addToSearchIndex({
      id: `weekly-insights-${insights.week}`,
      type: 'weekly-insights',
      title: `Week ${insights.week} Insights`,
      content: JSON.stringify(insights),
      tags: ['weekly', 'insights', 'patterns']
    });
  }

  async generateOnDemand() {
    return await this.generateWeeklySummary();
  }
}

// Run standalone
if (require.main === module) {
  const generator = new WeeklySummaryGenerator();
  
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

module.exports = WeeklySummaryGenerator;