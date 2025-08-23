#!/usr/bin/env node

/**
 * Daily Briefing Generator
 * Main script that runs daily to provide Claude Code updates and project recommendations
 */

const fs = require('fs');
const path = require('path');
const ClaudeUpdateDetector = require('./scripts/claude-updates');
const ProjectAnalyzer = require('./scripts/project-analyzer');
const RecommendationEngine = require('./scripts/recommendation-engine');

class DailyBriefing {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
    this.reportsPath = path.join(__dirname, 'reports');
    this.today = new Date().toISOString().split('T')[0];
    
    // Ensure directories exist
    [this.dataPath, this.reportsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateBriefing() {
    console.log('\n' + '='.repeat(60));
    console.log('📅 CLAUDE CODE DAILY BRIEFING');
    console.log(`📆 ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`);
    console.log('='.repeat(60) + '\n');

    // 1. Check for Claude Code updates
    console.log('1️⃣  Claude Code Updates\n' + '-'.repeat(30));
    const updateDetector = new ClaudeUpdateDetector();
    const claudeUpdates = await updateDetector.checkForUpdates();
    const updateSummary = updateDetector.formatBulletSummary(claudeUpdates);
    updateSummary.forEach(line => console.log(line));

    // 2. Analyze projects
    console.log('\n2️⃣  Project Analysis\n' + '-'.repeat(30));
    const analyzer = new ProjectAnalyzer();
    const projectAnalysis = await analyzer.analyzeProjects();
    
    // Show project summary
    console.log(`📊 Found ${projectAnalysis.projects.length} projects:`);
    projectAnalysis.projects.forEach(project => {
      const icon = project.status === 'clean' ? '✅' : '⚠️';
      const todos = project.todoCount > 0 ? ` (${project.todoCount} TODOs)` : '';
      console.log(`  ${icon} ${project.name}${todos}`);
    });

    // 3. Generate recommendations
    console.log('\n3️⃣  Recommendations\n' + '-'.repeat(30));
    const engine = new RecommendationEngine();
    const recommendations = engine.generateRecommendations(projectAnalysis, claudeUpdates);
    
    // Show quick wins first
    if (projectAnalysis.quickWins.length > 0) {
      console.log('\n🎯 Quick Wins (< 5 minutes):');
      projectAnalysis.quickWins.slice(0, 3).forEach(win => {
        console.log(`  • ${win.project}: ${win.task}`);
        console.log(`    → ${win.command}`);
      });
    }

    // Show top recommendations
    const formattedRecs = engine.formatRecommendations();
    formattedRecs.forEach(line => console.log(line));

    // 4. Today's focus
    console.log('\n4️⃣  Today\'s Focus\n' + '-'.repeat(30));
    const topRec = engine.getTopRecommendation();
    if (topRec) {
      console.log(`\n🎯 Recommended Task:`);
      console.log(`   ${topRec.title}`);
      console.log(`   Time: ${topRec.timeEstimate}`);
      console.log(`   Benefit: ${topRec.benefit}`);
      
      if (topRec.implementation) {
        console.log(`\n   How to implement:`);
        console.log('   ```');
        topRec.implementation.split('\n').forEach(line => {
          if (line.trim()) console.log(`   ${line}`);
        });
        console.log('   ```');
      }
    }

    // 5. Summary statistics
    console.log('\n5️⃣  Summary\n' + '-'.repeat(30));
    const stats = this.calculateStats(projectAnalysis, recommendations);
    console.log(`  • Total optimization opportunities: ${stats.totalOptimizations}`);
    console.log(`  • Estimated time to complete all: ${stats.totalTime}`);
    console.log(`  • Potential efficiency gain: ${stats.efficiencyGain}`);
    
    // Save briefing
    await this.saveBriefing({
      date: this.today,
      claudeUpdates,
      projectAnalysis,
      recommendations,
      stats
    });

    console.log('\n' + '='.repeat(60));
    console.log('💡 Tip: Use parallel agents (Task tool) for 2.8x faster execution!');
    console.log('📚 Full docs: /docs/claude-code/README.md');
    console.log('='.repeat(60) + '\n');
  }

  calculateStats(analysis, recommendations) {
    const totalOptimizations = analysis.projects.reduce((sum, p) => 
      sum + p.optimizations.length, 0
    );
    
    const totalMinutes = recommendations.reduce((sum, rec) => {
      const time = parseInt(rec.timeEstimate) || 0;
      return sum + time;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    // Calculate potential efficiency gain
    const hasParallel = recommendations.some(r => r.type === 'efficiency');
    const hasBatch = recommendations.some(r => r.type === 'batch-optimization');
    const efficiencyGain = hasParallel && hasBatch ? '70%' : 
                          hasParallel ? '50%' : 
                          hasBatch ? '30%' : '0%';
    
    return {
      totalOptimizations,
      totalTime,
      efficiencyGain
    };
  }

  async saveBriefing(briefingData) {
    const briefingFile = path.join(this.reportsPath, `briefing-${this.today}.json`);
    fs.writeFileSync(briefingFile, JSON.stringify(briefingData, null, 2));
    
    // Also save as latest
    const latestFile = path.join(this.reportsPath, 'latest-briefing.json');
    fs.writeFileSync(latestFile, JSON.stringify(briefingData, null, 2));
  }
}

// Run the briefing
if (require.main === module) {
  const briefing = new DailyBriefing();
  briefing.generateBriefing().catch(console.error);
}

module.exports = DailyBriefing;