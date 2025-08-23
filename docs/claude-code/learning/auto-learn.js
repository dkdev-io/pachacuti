#!/usr/bin/env node

/**
 * Claude Code Session-Based Learning System
 * Automatically captures and documents learning from each session
 */

const fs = require('fs');
const path = require('path');

class SessionLearningTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.discoveries = [];
    this.problems = [];
    this.patterns = [];
    this.updates = [];
  }

  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track new technique discovery
  trackDiscovery(discovery) {
    this.discoveries.push({
      timestamp: new Date().toISOString(),
      type: discovery.type,
      description: discovery.description,
      code: discovery.code,
      impact: discovery.impact,
      documentationTarget: discovery.documentationTarget || 'workflow-patterns.md'
    });
    
    console.log(`✨ Discovery tracked: ${discovery.description}`);
  }

  // Track problem and solution
  trackProblem(problem) {
    this.problems.push({
      timestamp: new Date().toISOString(),
      description: problem.description,
      symptoms: problem.symptoms,
      rootCause: problem.rootCause,
      solution: problem.solution,
      workaround: problem.workaround,
      documentationTarget: 'troubleshooting.md'
    });
    
    console.log(`🔧 Problem solution tracked: ${problem.description}`);
  }

  // Track successful pattern
  trackPattern(pattern) {
    this.patterns.push({
      timestamp: new Date().toISOString(),
      name: pattern.name,
      category: pattern.category,
      description: pattern.description,
      implementation: pattern.code,
      useCase: pattern.useCase,
      performance: pattern.performance,
      documentationTarget: 'workflow-patterns.md'
    });
    
    console.log(`📋 Pattern tracked: ${pattern.name}`);
  }

  // Track capability update
  trackCapability(capability) {
    this.updates.push({
      timestamp: new Date().toISOString(),
      tool: capability.tool,
      feature: capability.feature,
      description: capability.description,
      example: capability.example,
      limitations: capability.limitations,
      documentationTarget: capability.documentationTarget || 'capabilities.md'
    });
    
    console.log(`🚀 Capability tracked: ${capability.tool} - ${capability.feature}`);
  }

  // Analyze session for insights
  analyzeSession() {
    const insights = {
      totalDiscoveries: this.discoveries.length,
      totalProblems: this.problems.length,
      totalPatterns: this.patterns.length,
      totalUpdates: this.updates.length,
      sessionDuration: Date.now() - this.sessionStart.getTime(),
      
      topCategories: this.getTopCategories(),
      documentationImpact: this.getDocumentationImpact(),
      performanceImprovements: this.getPerformanceImprovements()
    };
    
    return insights;
  }

  // Get top discovery categories
  getTopCategories() {
    const categories = {};
    
    [...this.discoveries, ...this.patterns].forEach(item => {
      const cat = item.category || item.type || 'general';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  // Calculate documentation impact
  getDocumentationImpact() {
    const impact = {};
    
    [...this.discoveries, ...this.problems, ...this.patterns, ...this.updates]
      .forEach(item => {
        const target = item.documentationTarget;
        impact[target] = (impact[target] || 0) + 1;
      });
    
    return impact;
  }

  // Extract performance improvements
  getPerformanceImprovements() {
    return this.patterns
      .filter(p => p.performance)
      .map(p => ({
        name: p.name,
        improvement: p.performance
      }));
  }

  // Generate documentation updates
  generateDocumentationUpdates() {
    const updates = {};
    
    // Group by target documentation file
    [...this.discoveries, ...this.problems, ...this.patterns, ...this.updates]
      .forEach(item => {
        const target = item.documentationTarget;
        if (!updates[target]) {
          updates[target] = [];
        }
        updates[target].push(item);
      });
    
    return updates;
  }

  // Save session learning
  saveSession() {
    const sessionData = {
      sessionId: this.sessionId,
      startTime: this.sessionStart.toISOString(),
      endTime: new Date().toISOString(),
      discoveries: this.discoveries,
      problems: this.problems,
      patterns: this.patterns,
      updates: this.updates,
      insights: this.analyzeSession()
    };
    
    // Save to learning directory
    const learningDir = path.join(__dirname);
    const sessionFile = path.join(learningDir, `session-${this.sessionId}.json`);
    
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    // Update cumulative learning log
    this.updateCumulativeLog(sessionData);
    
    // Generate update recommendations
    this.generateUpdateRecommendations(sessionData);
    
    return sessionFile;
  }

  // Update cumulative learning log
  updateCumulativeLog(sessionData) {
    const logFile = path.join(__dirname, 'cumulative-learning.json');
    
    let cumulativeData = {};
    if (fs.existsSync(logFile)) {
      cumulativeData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    // Initialize if needed
    if (!cumulativeData.sessions) cumulativeData.sessions = [];
    if (!cumulativeData.totalDiscoveries) cumulativeData.totalDiscoveries = 0;
    if (!cumulativeData.totalProblems) cumulativeData.totalProblems = 0;
    if (!cumulativeData.totalPatterns) cumulativeData.totalPatterns = 0;
    
    // Add session summary
    cumulativeData.sessions.push({
      id: sessionData.sessionId,
      date: sessionData.startTime,
      discoveries: sessionData.discoveries.length,
      problems: sessionData.problems.length,
      patterns: sessionData.patterns.length
    });
    
    // Update totals
    cumulativeData.totalDiscoveries += sessionData.discoveries.length;
    cumulativeData.totalProblems += sessionData.problems.length;
    cumulativeData.totalPatterns += sessionData.patterns.length;
    cumulativeData.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(logFile, JSON.stringify(cumulativeData, null, 2));
  }

  // Generate update recommendations
  generateUpdateRecommendations(sessionData) {
    const updates = this.generateDocumentationUpdates();
    const recommendationsFile = path.join(__dirname, `recommendations-${this.sessionId}.md`);
    
    let content = `# Documentation Update Recommendations\n\n`;
    content += `**Session ID:** ${this.sessionId}\n`;
    content += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    
    for (const [file, items] of Object.entries(updates)) {
      content += `## Updates for ${file}\n\n`;
      
      items.forEach(item => {
        if (item.description) {
          content += `### ${item.name || item.description}\n\n`;
          
          if (item.code || item.implementation) {
            content += `\`\`\`javascript\n${item.code || item.implementation}\n\`\`\`\n\n`;
          }
          
          if (item.solution) {
            content += `**Solution:**\n${item.solution}\n\n`;
          }
          
          if (item.useCase) {
            content += `**Use Case:** ${item.useCase}\n\n`;
          }
        }
      });
    }
    
    fs.writeFileSync(recommendationsFile, content);
    console.log(`📝 Recommendations saved to ${recommendationsFile}`);
  }

  // Auto-apply documentation updates
  async autoApplyUpdates() {
    const updates = this.generateDocumentationUpdates();
    
    for (const [targetFile, items] of Object.entries(updates)) {
      const fullPath = path.join(__dirname, '..', targetFile);
      
      if (fs.existsSync(fullPath)) {
        console.log(`📝 Updating ${targetFile}...`);
        
        // Read current content
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Add new sections
        items.forEach(item => {
          // This is simplified - in practice, you'd want more sophisticated merging
          const newSection = this.formatUpdateSection(item);
          
          // Find appropriate place to insert
          if (content.includes('## Session Learning Updates')) {
            content = content.replace(
              '## Session Learning Updates',
              `## Session Learning Updates\n\n${newSection}\n`
            );
          } else {
            // Add new section at the end
            content += `\n\n## Session Learning Updates\n\n${newSection}`;
          }
        });
        
        // Save updated file
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated ${targetFile}`);
      }
    }
  }

  // Format update section for documentation
  formatUpdateSection(item) {
    let section = `### ${item.name || item.description || 'Update'}\n`;
    section += `*Added: ${new Date().toLocaleDateString()}*\n\n`;
    
    if (item.description) {
      section += `${item.description}\n\n`;
    }
    
    if (item.code || item.implementation) {
      section += `\`\`\`javascript\n${item.code || item.implementation}\n\`\`\`\n\n`;
    }
    
    if (item.solution) {
      section += `**Solution:** ${item.solution}\n\n`;
    }
    
    if (item.useCase) {
      section += `**Use Case:** ${item.useCase}\n\n`;
    }
    
    if (item.performance) {
      section += `**Performance:** ${item.performance}\n\n`;
    }
    
    return section;
  }
}

// Export for use in other scripts
module.exports = SessionLearningTracker;

// CLI interface
if (require.main === module) {
  const tracker = new SessionLearningTracker();
  
  // Example usage
  console.log('🎓 Session Learning Tracker Started');
  console.log(`📝 Session ID: ${tracker.sessionId}`);
  
  // Example: Track a discovery
  tracker.trackDiscovery({
    type: 'performance',
    description: 'Batch file operations reduce time by 70%',
    code: 'Read(file1); Read(file2); Read(file3); // All in one message',
    impact: 'high',
    documentationTarget: 'best-practices.md'
  });
  
  // Example: Track a problem solution
  tracker.trackProblem({
    description: 'Edit fails with spaces in path',
    symptoms: ['Command not found', 'Path error'],
    rootCause: 'Unquoted paths with spaces',
    solution: 'Always quote paths: cd "/My Documents"',
    workaround: 'Use escaped spaces: /My\\ Documents'
  });
  
  // Save session
  const savedFile = tracker.saveSession();
  console.log(`\n✅ Session learning saved to ${savedFile}`);
}