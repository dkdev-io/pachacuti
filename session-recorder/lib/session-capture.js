/**
 * Session Capture Module
 * Captures all development activity during Claude Code sessions
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { logger } = require('./logger');

class SessionCapture extends EventEmitter {
  constructor() {
    super();
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.activities = [];
    this.fileChanges = [];
    this.gitCommits = [];
    this.commands = [];
    this.decisions = [];
    this.problems = [];
    this.solutions = [];
  }

  generateSessionId() {
    const date = new Date().toISOString().split('T')[0];
    const time = Date.now().toString(36);
    return `session-${date}-${time}`;
  }

  async recordFileChange(event) {
    const change = {
      timestamp: new Date().toISOString(),
      type: event.type,
      file: event.path,
      action: event.action,
      content: event.content || null,
      diff: event.diff || null
    };
    
    this.fileChanges.push(change);
    this.activities.push({
      type: 'file_change',
      timestamp: change.timestamp,
      details: change
    });
    
    await this.persist();
  }

  async recordGitActivity(event) {
    const activity = {
      timestamp: new Date().toISOString(),
      command: event.command,
      output: event.output,
      branch: event.branch,
      files: event.files || []
    };
    
    this.activities.push({
      type: 'git_activity',
      timestamp: activity.timestamp,
      details: activity
    });
    
    await this.persist();
  }

  async recordCommit(commit) {
    const commitRecord = {
      timestamp: new Date().toISOString(),
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      files: commit.files,
      stats: commit.stats
    };
    
    this.gitCommits.push(commitRecord);
    this.activities.push({
      type: 'git_commit',
      timestamp: commitRecord.timestamp,
      details: commitRecord
    });
    
    // Extract problems and solutions from commit message
    this.extractInsights(commit.message);
    
    await this.persist();
  }

  async recordCommand(event) {
    const command = {
      timestamp: new Date().toISOString(),
      command: event.command,
      output: event.output,
      exitCode: event.exitCode,
      duration: event.duration
    };
    
    this.commands.push(command);
    this.activities.push({
      type: 'command',
      timestamp: command.timestamp,
      details: command
    });
    
    await this.persist();
  }

  async recordDecision(decision) {
    const decisionRecord = {
      timestamp: new Date().toISOString(),
      category: decision.category,
      description: decision.description,
      reasoning: decision.reasoning,
      alternatives: decision.alternatives || [],
      impact: decision.impact
    };
    
    this.decisions.push(decisionRecord);
    this.activities.push({
      type: 'decision',
      timestamp: decisionRecord.timestamp,
      details: decisionRecord
    });
    
    await this.persist();
  }

  async recordProblem(problem) {
    const problemRecord = {
      timestamp: new Date().toISOString(),
      description: problem.description,
      category: problem.category,
      severity: problem.severity,
      context: problem.context,
      stackTrace: problem.stackTrace || null
    };
    
    this.problems.push(problemRecord);
    this.activities.push({
      type: 'problem',
      timestamp: problemRecord.timestamp,
      details: problemRecord
    });
    
    await this.persist();
  }

  async recordSolution(solution) {
    const solutionRecord = {
      timestamp: new Date().toISOString(),
      problemId: solution.problemId,
      description: solution.description,
      implementation: solution.implementation,
      effectiveness: solution.effectiveness,
      reusable: solution.reusable
    };
    
    this.solutions.push(solutionRecord);
    this.activities.push({
      type: 'solution',
      timestamp: solutionRecord.timestamp,
      details: solutionRecord
    });
    
    await this.persist();
  }

  extractInsights(text) {
    // Extract bug fixes
    if (text.match(/fix|bug|issue|error/i)) {
      this.recordProblem({
        description: text,
        category: 'bug',
        severity: 'medium',
        context: 'Extracted from commit message'
      });
    }
    
    // Extract features
    if (text.match(/feat|add|implement|create/i)) {
      this.recordDecision({
        category: 'feature',
        description: text,
        reasoning: 'New functionality added',
        impact: 'medium'
      });
    }
  }

  async createSnapshot() {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.sessionStart.getTime(),
      activities: this.activities.length,
      fileChanges: this.fileChanges.length,
      commits: this.gitCommits.length,
      commands: this.commands.length,
      recentActivity: this.activities.slice(-10)
    };
  }

  async generateSummary() {
    const sessionEnd = new Date();
    const duration = sessionEnd - this.sessionStart;
    
    return {
      sessionId: this.sessionId,
      start: this.sessionStart.toISOString(),
      end: sessionEnd.toISOString(),
      duration: duration,
      durationFormatted: this.formatDuration(duration),
      statistics: {
        totalActivities: this.activities.length,
        fileChanges: this.fileChanges.length,
        gitCommits: this.gitCommits.length,
        commands: this.commands.length,
        decisions: this.decisions.length,
        problemsSolved: this.solutions.length
      },
      fileChanges: this.fileChanges,
      commits: this.gitCommits,
      decisions: this.decisions,
      problems: this.problems,
      solutions: this.solutions,
      topFiles: this.getTopFiles(),
      keyAchievements: this.extractKeyAchievements()
    };
  }

  getTopFiles() {
    const fileCount = {};
    this.fileChanges.forEach(change => {
      fileCount[change.file] = (fileCount[change.file] || 0) + 1;
    });
    
    return Object.entries(fileCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, changes: count }));
  }

  extractKeyAchievements() {
    const achievements = [];
    
    // Features added
    const features = this.gitCommits.filter(c => 
      c.message.match(/feat|add|implement/i)
    );
    if (features.length > 0) {
      achievements.push(`Added ${features.length} new features`);
    }
    
    // Bugs fixed
    const fixes = this.gitCommits.filter(c => 
      c.message.match(/fix|bug|issue/i)
    );
    if (fixes.length > 0) {
      achievements.push(`Fixed ${fixes.length} bugs`);
    }
    
    // Files modified
    if (this.fileChanges.length > 0) {
      achievements.push(`Modified ${this.fileChanges.length} files`);
    }
    
    return achievements;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async persist() {
    const sessionFile = path.join(
      __dirname, 
      '../data/sessions', 
      `${this.sessionId}.json`
    );
    
    const sessionData = {
      sessionId: this.sessionId,
      start: this.sessionStart,
      lastUpdate: new Date().toISOString(),
      activities: this.activities,
      fileChanges: this.fileChanges,
      gitCommits: this.gitCommits,
      commands: this.commands,
      decisions: this.decisions,
      problems: this.problems,
      solutions: this.solutions
    };
    
    await fs.mkdir(path.dirname(sessionFile), { recursive: true });
    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
  }
}

module.exports = SessionCapture;