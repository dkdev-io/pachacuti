/**
 * Cloud-Powered Session Recorder
 * Enhanced version using Supabase for team collaboration
 */

const PachacutiSessionRecorder = require('../index');
const SupabaseAdapter = require('./supabase-adapter');
const RealTimeSessionMonitor = require('./realtime-monitor');
const { logger } = require('./logger');

class CloudSessionRecorder extends PachacutiSessionRecorder {
  constructor() {
    super();
    
    // Override with cloud components
    this.supabaseAdapter = new SupabaseAdapter();
    this.realTimeMonitor = new RealTimeSessionMonitor();
    
    this.config.cloudEnabled = process.env.SUPABASE_ENABLED === 'true';
    this.config.realTimeCollaboration = true;
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      logger.warn('⚠️  Supabase credentials not found - falling back to local mode');
      this.config.cloudEnabled = false;
    }
  }

  async initialize() {
    logger.info('🚀 Initializing Cloud-Powered Session Recorder...');
    
    if (this.config.cloudEnabled) {
      logger.info('☁️  Cloud mode enabled - using Supabase backend');
      
      // Initialize parent components
      await super.initialize();
      
      // Replace knowledge base with Supabase adapter
      this.knowledgeBase = this.supabaseAdapter;
      
      // Start real-time monitoring
      await this.realTimeMonitor.start();
      
      // Set up real-time event handlers
      this.setupRealTimeHandlers();
      
    } else {
      logger.info('💻 Local mode - using SQLite backend');
      await super.initialize();
    }
    
    logger.info('✅ Cloud Session Recorder initialized successfully');
  }

  setupRealTimeHandlers() {
    this.realTimeMonitor.on('activity', (activity) => {
      logger.info(`📊 Live team activity: ${activity.type} in ${activity.sessionId}`);
    });
    
    this.realTimeMonitor.on('session-started', (session) => {
      logger.info(`🎯 New team session: ${session.sessionId} (${session.projectName})`);
    });
    
    this.realTimeMonitor.on('commit', (commit) => {
      logger.info(`💾 Team commit: ${commit.hash.substring(0, 7)} by ${commit.author}`);
    });
    
    this.realTimeMonitor.on('important-activity', (activity) => {
      if (activity.type === 'problem') {
        logger.warn(`🚨 Team problem detected: ${activity.details?.description}`);
      } else if (activity.type === 'solution') {
        logger.info(`✅ Team solution found: ${activity.details?.description}`);
      }
    });
  }

  async captureSnapshot() {
    const snapshot = await super.captureSnapshot();
    
    if (this.config.cloudEnabled) {
      // Add cloud-specific metadata
      snapshot.cloudMetadata = {
        timestamp: new Date().toISOString(),
        realtimeEnabled: this.config.realTimeCollaboration,
        teamVisible: true
      };
      
      // Store in cloud
      await this.supabaseAdapter.addToKnowledgeBase({
        session_id: snapshot.sessionId,
        title: `Snapshot ${snapshot.sessionId}`,
        content: JSON.stringify(snapshot),
        category: 'snapshot',
        doc_type: 'session_snapshot',
        tags: ['snapshot', 'real-time']
      });
    }
    
    return snapshot;
  }

  async captureSessionEnd() {
    logger.info('📝 Capturing cloud session end...');
    
    const summary = await this.sessionCapture.generateSummary();
    
    if (this.config.cloudEnabled) {
      // Store in Supabase
      await this.supabaseAdapter.indexSession(summary);
      
      // Generate team report
      const teamReport = await this.generateTeamReport(summary);
      logger.info(`📊 Team report generated: ${teamReport.insights.length} insights`);
    }
    
    // Generate regular reports
    await this.reportGenerator.generateSessionReport(summary);
    
    logger.info('✅ Cloud session recorded successfully');
    
    if (!this.config.cloudEnabled) {
      process.exit(0);
    }
  }

  async generateTeamReport(sessionData) {
    const teamReport = {
      sessionId: sessionData.sessionId,
      timestamp: new Date().toISOString(),
      teamImpact: await this.assessTeamImpact(sessionData),
      insights: await this.generateTeamInsights(sessionData),
      collaboration: await this.assessCollaborationNeeds(sessionData),
      recommendations: await this.generateTeamRecommendations(sessionData)
    };
    
    return teamReport;
  }

  async assessTeamImpact(sessionData) {
    const impact = {
      scope: 'individual', // individual, team, organization
      affectedProjects: [],
      stakeholders: [],
      riskLevel: 'low'
    };
    
    // Analyze file changes for cross-project impact
    const criticalFiles = sessionData.fileChanges?.filter(change => 
      change.file.includes('config') || 
      change.file.includes('shared') ||
      change.file.includes('common')
    ) || [];
    
    if (criticalFiles.length > 0) {
      impact.scope = 'team';
      impact.riskLevel = 'medium';
    }
    
    // Analyze commits for breaking changes
    const breakingChanges = sessionData.commits?.filter(c => 
      c.message.includes('BREAKING') || 
      c.message.includes('breaking change')
    ) || [];
    
    if (breakingChanges.length > 0) {
      impact.scope = 'organization';
      impact.riskLevel = 'high';
    }
    
    return impact;
  }

  async generateTeamInsights(sessionData) {
    const insights = [];
    
    // Pattern analysis
    if (sessionData.statistics.problemsSolved > 3) {
      insights.push({
        type: 'productivity',
        message: 'High problem-solving activity - consider documenting solutions for team',
        actionable: true,
        priority: 'medium'
      });
    }
    
    // Technology insights
    const technologies = new Set();
    sessionData.fileChanges?.forEach(change => {
      const ext = change.file.split('.').pop();
      if (ext) technologies.add(ext);
    });
    
    if (technologies.size > 5) {
      insights.push({
        type: 'technology',
        message: `Working across ${technologies.size} technologies - consider specialization`,
        actionable: true,
        priority: 'low'
      });
    }
    
    // Decision insights
    if (sessionData.decisions?.length > 0) {
      const architecturalDecisions = sessionData.decisions.filter(d => 
        d.category === 'architecture' || d.impact === 'high'
      );
      
      if (architecturalDecisions.length > 0) {
        insights.push({
          type: 'architecture',
          message: `${architecturalDecisions.length} architectural decisions - team review recommended`,
          actionable: true,
          priority: 'high'
        });
      }
    }
    
    return insights;
  }

  async assessCollaborationNeeds(sessionData) {
    return {
      reviewRequired: sessionData.statistics.fileChanges > 10,
      pairProgramming: sessionData.statistics.problemsSolved > 5,
      teamSync: sessionData.decisions?.some(d => d.impact === 'high'),
      documentation: sessionData.solutions?.some(s => s.reusable)
    };
  }

  async generateTeamRecommendations(sessionData) {
    const recommendations = [];
    
    const impact = await this.assessTeamImpact(sessionData);
    const collaboration = await this.assessCollaborationNeeds(sessionData);
    
    if (impact.riskLevel === 'high') {
      recommendations.push({
        type: 'risk-mitigation',
        action: 'Schedule immediate team review for breaking changes',
        priority: 'urgent'
      });
    }
    
    if (collaboration.reviewRequired) {
      recommendations.push({
        type: 'code-review',
        action: 'Request code review for large changeset',
        priority: 'high'
      });
    }
    
    if (collaboration.documentation) {
      recommendations.push({
        type: 'knowledge-sharing',
        action: 'Document reusable solutions in team knowledge base',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  async searchKnowledge(query) {
    if (this.config.cloudEnabled) {
      return await this.supabaseAdapter.search(query);
    } else {
      return await super.searchKnowledge(query);
    }
  }

  async getTeamActivity() {
    if (this.config.cloudEnabled) {
      return await this.realTimeMonitor.getTeamActivity();
    } else {
      return [];
    }
  }

  async getTeamMetrics() {
    if (this.config.cloudEnabled) {
      return await this.realTimeMonitor.getLiveTeamMetrics();
    } else {
      return { message: 'Team metrics require cloud mode' };
    }
  }
}

module.exports = CloudSessionRecorder;