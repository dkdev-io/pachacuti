/**
 * Report Generator Module
 * Generates various reports from session data
 */

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const { logger } = require('./logger');

class ReportGenerator {
  constructor() {
    this.templates = {
      daily: this.dailyTemplate,
      weekly: this.weeklyTemplate,
      monthly: this.monthlyTemplate,
      session: this.sessionTemplate
    };
  }

  async generateDailyReport(date = new Date()) {
    logger.info(`Generating daily report for ${moment(date).format('YYYY-MM-DD')}`);
    
    const reportData = await this.collectDailyData(date);
    const report = this.dailyTemplate(reportData);
    
    const reportPath = path.join(
      __dirname,
      '../reports/daily',
      `${moment(date).format('YYYY-MM-DD')}.md`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    logger.info(`Daily report saved to ${reportPath}`);
    return reportPath;
  }

  async generateWeeklyReport(weekStart = moment().startOf('week')) {
    logger.info(`Generating weekly report for week of ${weekStart.format('YYYY-MM-DD')}`);
    
    const reportData = await this.collectWeeklyData(weekStart);
    const report = this.weeklyTemplate(reportData);
    
    const reportPath = path.join(
      __dirname,
      '../reports/weekly',
      `week-${weekStart.format('YYYY-MM-DD')}.md`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    logger.info(`Weekly report saved to ${reportPath}`);
    return reportPath;
  }

  async generateMonthlyReport(month = moment().startOf('month')) {
    logger.info(`Generating monthly report for ${month.format('MMMM YYYY')}`);
    
    const reportData = await this.collectMonthlyData(month);
    const report = this.monthlyTemplate(reportData);
    
    const reportPath = path.join(
      __dirname,
      '../reports/monthly',
      `${month.format('YYYY-MM')}.md`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    logger.info(`Monthly report saved to ${reportPath}`);
    return reportPath;
  }

  async generateSessionReport(sessionData) {
    logger.info(`Generating report for session ${sessionData.sessionId}`);
    
    const report = this.sessionTemplate(sessionData);
    
    const reportPath = path.join(
      __dirname,
      '../reports/sessions',
      `${sessionData.sessionId}.md`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    logger.info(`Session report saved to ${reportPath}`);
    return reportPath;
  }

  async generateProjectTimeline(projectName) {
    logger.info(`Generating timeline for project ${projectName}`);
    
    const timeline = await this.collectProjectTimeline(projectName);
    const report = this.timelineTemplate(projectName, timeline);
    
    const reportPath = path.join(
      __dirname,
      '../reports/timelines',
      `${projectName}-timeline.md`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    logger.info(`Project timeline saved to ${reportPath}`);
    return reportPath;
  }

  async collectDailyData(date) {
    // Collect all session data for the specified date
    const sessionsPath = path.join(__dirname, '../data/sessions');
    const dateStr = moment(date).format('YYYY-MM-DD');
    
    const data = {
      date: dateStr,
      sessions: [],
      totalCommits: 0,
      totalFileChanges: 0,
      totalProblems: 0,
      totalSolutions: 0,
      totalDuration: 0,
      keyAchievements: [],
      topFiles: []
    };
    
    try {
      const files = await fs.readdir(sessionsPath);
      
      for (const file of files) {
        if (file.includes(dateStr)) {
          const sessionData = JSON.parse(
            await fs.readFile(path.join(sessionsPath, file), 'utf-8')
          );
          
          data.sessions.push(sessionData);
          data.totalCommits += sessionData.gitCommits?.length || 0;
          data.totalFileChanges += sessionData.fileChanges?.length || 0;
          data.totalProblems += sessionData.problems?.length || 0;
          data.totalSolutions += sessionData.solutions?.length || 0;
          
          if (sessionData.start && sessionData.lastUpdate) {
            const duration = new Date(sessionData.lastUpdate) - new Date(sessionData.start);
            data.totalDuration += duration;
          }
        }
      }
      
      // Aggregate top files
      const fileCount = {};
      data.sessions.forEach(session => {
        session.fileChanges?.forEach(change => {
          fileCount[change.file] = (fileCount[change.file] || 0) + 1;
        });
      });
      
      data.topFiles = Object.entries(fileCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([file, count]) => ({ file, count }));
        
    } catch (error) {
      logger.error(`Error collecting daily data: ${error}`);
    }
    
    return data;
  }

  async collectWeeklyData(weekStart) {
    const data = {
      weekStart: weekStart.format('YYYY-MM-DD'),
      weekEnd: moment(weekStart).add(6, 'days').format('YYYY-MM-DD'),
      dailyReports: [],
      totalSessions: 0,
      totalCommits: 0,
      totalFileChanges: 0,
      totalDuration: 0,
      trends: {},
      highlights: []
    };
    
    // Collect data for each day of the week
    for (let i = 0; i < 7; i++) {
      const date = moment(weekStart).add(i, 'days');
      const dailyData = await this.collectDailyData(date);
      
      data.dailyReports.push(dailyData);
      data.totalSessions += dailyData.sessions.length;
      data.totalCommits += dailyData.totalCommits;
      data.totalFileChanges += dailyData.totalFileChanges;
      data.totalDuration += dailyData.totalDuration;
    }
    
    // Calculate trends
    data.trends = this.calculateTrends(data.dailyReports);
    
    // Extract highlights
    data.highlights = this.extractHighlights(data.dailyReports);
    
    return data;
  }

  async collectMonthlyData(month) {
    const data = {
      month: month.format('MMMM YYYY'),
      weeklyReports: [],
      totalSessions: 0,
      totalCommits: 0,
      totalProjects: new Set(),
      totalDevelopers: new Set(),
      monthlyTrends: {},
      majorMilestones: []
    };
    
    // Collect data for each week of the month
    const weeksInMonth = Math.ceil(month.daysInMonth() / 7);
    
    for (let i = 0; i < weeksInMonth; i++) {
      const weekStart = moment(month).add(i * 7, 'days');
      if (weekStart.month() === month.month()) {
        const weeklyData = await this.collectWeeklyData(weekStart);
        data.weeklyReports.push(weeklyData);
        data.totalSessions += weeklyData.totalSessions;
        data.totalCommits += weeklyData.totalCommits;
      }
    }
    
    return data;
  }

  async collectProjectTimeline(projectName) {
    const timeline = {
      events: [],
      milestones: [],
      phases: []
    };
    
    // Read all session files and extract project-related events
    const sessionsPath = path.join(__dirname, '../data/sessions');
    
    try {
      const files = await fs.readdir(sessionsPath);
      
      for (const file of files) {
        const sessionData = JSON.parse(
          await fs.readFile(path.join(sessionsPath, file), 'utf-8')
        );
        
        // Check if session is related to the project
        const isRelated = sessionData.gitCommits?.some(commit => 
          commit.message.toLowerCase().includes(projectName.toLowerCase())
        );
        
        if (isRelated) {
          timeline.events.push({
            date: sessionData.start,
            type: 'session',
            description: `Development session: ${sessionData.sessionId}`,
            commits: sessionData.gitCommits?.length || 0,
            files: sessionData.fileChanges?.length || 0
          });
          
          // Extract milestones from commits
          sessionData.gitCommits?.forEach(commit => {
            if (commit.message.match(/release|v\d+\.\d+|milestone/i)) {
              timeline.milestones.push({
                date: commit.timestamp,
                description: commit.message,
                commit: commit.hash
              });
            }
          });
        }
      }
      
      // Sort events by date
      timeline.events.sort((a, b) => new Date(a.date) - new Date(b.date));
      timeline.milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
      
    } catch (error) {
      logger.error(`Error collecting project timeline: ${error}`);
    }
    
    return timeline;
  }

  calculateTrends(dailyReports) {
    const trends = {
      productivity: 'stable',
      momentum: 'steady',
      focus: 'balanced'
    };
    
    if (dailyReports.length < 2) return trends;
    
    // Calculate productivity trend
    const avgCommits = dailyReports.reduce((sum, d) => sum + d.totalCommits, 0) / dailyReports.length;
    const recentCommits = dailyReports.slice(-3).reduce((sum, d) => sum + d.totalCommits, 0) / 3;
    
    if (recentCommits > avgCommits * 1.2) {
      trends.productivity = 'increasing';
    } else if (recentCommits < avgCommits * 0.8) {
      trends.productivity = 'decreasing';
    }
    
    // Calculate momentum
    const activeDays = dailyReports.filter(d => d.sessions.length > 0).length;
    if (activeDays >= 6) {
      trends.momentum = 'high';
    } else if (activeDays <= 2) {
      trends.momentum = 'low';
    }
    
    // Calculate focus
    const uniqueFiles = new Set();
    dailyReports.forEach(d => {
      d.topFiles?.forEach(f => uniqueFiles.add(f.file));
    });
    
    if (uniqueFiles.size < 10) {
      trends.focus = 'focused';
    } else if (uniqueFiles.size > 30) {
      trends.focus = 'scattered';
    }
    
    return trends;
  }

  extractHighlights(dailyReports) {
    const highlights = [];
    
    dailyReports.forEach(report => {
      // Major commits
      if (report.totalCommits > 10) {
        highlights.push(`High activity day with ${report.totalCommits} commits on ${report.date}`);
      }
      
      // Problem solving
      if (report.totalSolutions > report.totalProblems && report.totalProblems > 0) {
        highlights.push(`Solved ${report.totalSolutions} problems on ${report.date}`);
      }
    });
    
    return highlights;
  }

  dailyTemplate(data) {
    return `# Daily Development Report
**Date:** ${data.date}

## Summary
- **Sessions:** ${data.sessions.length}
- **Total Duration:** ${this.formatDuration(data.totalDuration)}
- **Commits:** ${data.totalCommits}
- **Files Changed:** ${data.totalFileChanges}
- **Problems Solved:** ${data.totalSolutions}/${data.totalProblems}

## Sessions
${data.sessions.map(session => `
### ${session.sessionId}
- **Duration:** ${this.formatDuration(session.lastUpdate ? new Date(session.lastUpdate) - new Date(session.start) : 0)}
- **Activities:** ${session.activities?.length || 0}
- **Commits:** ${session.gitCommits?.length || 0}
- **Files:** ${session.fileChanges?.length || 0}
`).join('\n')}

## Top Modified Files
${data.topFiles.map(f => `- \`${f.file}\` (${f.count} changes)`).join('\n')}

## Key Achievements
${data.sessions.flatMap(s => s.keyAchievements || []).map(a => `- ${a}`).join('\n')}

---
*Generated by Pachacuti Session Recorder*`;
  }

  weeklyTemplate(data) {
    return `# Weekly Development Report
**Week:** ${data.weekStart} to ${data.weekEnd}

## Summary
- **Total Sessions:** ${data.totalSessions}
- **Total Duration:** ${this.formatDuration(data.totalDuration)}
- **Total Commits:** ${data.totalCommits}
- **Files Changed:** ${data.totalFileChanges}

## Trends
- **Productivity:** ${data.trends.productivity}
- **Momentum:** ${data.trends.momentum}
- **Focus:** ${data.trends.focus}

## Daily Breakdown
${data.dailyReports.map(d => `
### ${d.date}
- Sessions: ${d.sessions.length}
- Commits: ${d.totalCommits}
- Duration: ${this.formatDuration(d.totalDuration)}
`).join('\n')}

## Highlights
${data.highlights.map(h => `- ${h}`).join('\n')}

## Recommendations
${this.generateRecommendations(data.trends)}

---
*Generated by Pachacuti Session Recorder*`;
  }

  monthlyTemplate(data) {
    return `# Monthly Development Report
**Month:** ${data.month}

## Executive Summary
- **Total Sessions:** ${data.totalSessions}
- **Total Commits:** ${data.totalCommits}
- **Active Projects:** ${data.totalProjects.size}
- **Contributors:** ${data.totalDevelopers.size}

## Weekly Performance
${data.weeklyReports.map(w => `
### Week of ${w.weekStart}
- Sessions: ${w.totalSessions}
- Commits: ${w.totalCommits}
- Productivity: ${w.trends.productivity}
`).join('\n')}

## Major Milestones
${data.majorMilestones.map(m => `- ${m}`).join('\n')}

## Strategic Insights
${this.generateStrategicInsights(data)}

---
*Generated by Pachacuti Session Recorder*`;
  }

  sessionTemplate(data) {
    return `# Session Report: ${data.sessionId}

## Overview
- **Start:** ${data.start}
- **End:** ${data.end}
- **Duration:** ${data.durationFormatted}

## Statistics
- **Total Activities:** ${data.statistics.totalActivities}
- **File Changes:** ${data.statistics.fileChanges}
- **Commits:** ${data.statistics.gitCommits}
- **Commands:** ${data.statistics.commands}
- **Decisions:** ${data.statistics.decisions}
- **Problems Solved:** ${data.statistics.problemsSolved}

## Git Commits
${data.commits.map(c => `
### ${c.message}
- **Hash:** ${c.hash}
- **Author:** ${c.author}
- **Date:** ${c.timestamp}
- **Files:** ${c.files?.length || 0}
`).join('\n')}

## Top Modified Files
${data.topFiles.map(f => `- \`${f.file}\` (${f.changes} changes)`).join('\n')}

## Decisions Made
${data.decisions.map(d => `
### ${d.description}
- **Category:** ${d.category}
- **Reasoning:** ${d.reasoning}
- **Impact:** ${d.impact}
`).join('\n')}

## Problems & Solutions
${data.problems.map((p, i) => `
### Problem ${i + 1}: ${p.description}
- **Category:** ${p.category}
- **Severity:** ${p.severity}
- **Solution:** ${data.solutions.find(s => s.problemId === p.id)?.description || 'Pending'}
`).join('\n')}

## Key Achievements
${data.keyAchievements.map(a => `- ${a}`).join('\n')}

---
*Generated by Pachacuti Session Recorder*`;
  }

  timelineTemplate(projectName, timeline) {
    return `# Project Timeline: ${projectName}

## Overview
- **Total Events:** ${timeline.events.length}
- **Milestones:** ${timeline.milestones.length}
- **Duration:** ${this.calculateProjectDuration(timeline)}

## Milestones
${timeline.milestones.map(m => `
### ${moment(m.date).format('YYYY-MM-DD')} - ${m.description}
- **Commit:** ${m.commit}
`).join('\n')}

## Development Timeline
${timeline.events.map(e => `
### ${moment(e.date).format('YYYY-MM-DD HH:mm')}
- **Type:** ${e.type}
- **Description:** ${e.description}
- **Commits:** ${e.commits}
- **Files:** ${e.files}
`).join('\n')}

## Project Phases
${this.identifyProjectPhases(timeline)}

---
*Generated by Pachacuti Session Recorder*`;
  }

  formatDuration(ms) {
    if (!ms || ms < 0) return 'N/A';
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  calculateProjectDuration(timeline) {
    if (!timeline.events.length) return 'N/A';
    
    const start = new Date(timeline.events[0].date);
    const end = new Date(timeline.events[timeline.events.length - 1].date);
    const days = Math.ceil((end - start) / 86400000);
    
    return `${days} days`;
  }

  identifyProjectPhases(timeline) {
    const phases = [];
    
    // Simple phase identification based on commit patterns
    let currentPhase = null;
    let phaseStart = null;
    
    timeline.events.forEach(event => {
      if (event.type === 'session') {
        if (!currentPhase) {
          currentPhase = 'Development';
          phaseStart = event.date;
        }
      }
    });
    
    if (currentPhase) {
      phases.push(`- **${currentPhase}**: Started ${moment(phaseStart).format('YYYY-MM-DD')}`);
    }
    
    return phases.join('\n');
  }

  generateRecommendations(trends) {
    const recommendations = [];
    
    if (trends.productivity === 'decreasing') {
      recommendations.push('- Consider reviewing current blockers and technical debt');
    }
    if (trends.momentum === 'low') {
      recommendations.push('- Schedule regular development sessions to maintain momentum');
    }
    if (trends.focus === 'scattered') {
      recommendations.push('- Consider prioritizing and focusing on fewer concurrent tasks');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Continue current development practices');
    }
    
    return recommendations.join('\n');
  }

  generateStrategicInsights(data) {
    const insights = [];
    
    if (data.totalSessions > 20) {
      insights.push('- High development activity indicates strong project momentum');
    }
    if (data.totalProjects.size > 3) {
      insights.push('- Multiple active projects suggest need for resource allocation review');
    }
    if (data.totalDevelopers.size > 1) {
      insights.push('- Team collaboration patterns detected - consider coordination improvements');
    }
    
    return insights.join('\n');
  }
}

module.exports = ReportGenerator;