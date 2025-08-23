/**
 * Git Analyzer Module
 * Analyzes git history and monitors git activity
 */

const simpleGit = require('simple-git');
const EventEmitter = require('events');
const path = require('path');
const { logger } = require('./logger');

class GitAnalyzer extends EventEmitter {
  constructor(repoPath = process.cwd()) {
    super();
    this.git = simpleGit(repoPath);
    this.repoPath = repoPath;
    this.lastCommitHash = null;
    this.watchInterval = null;
  }

  async analyzeHistory(days = 30) {
    logger.info(`Analyzing git history for last ${days} days...`);
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const log = await this.git.log({
      '--since': since.toISOString(),
      '--stat': true
    });
    
    const analysis = {
      totalCommits: log.total,
      timeRange: {
        start: since.toISOString(),
        end: new Date().toISOString()
      },
      authors: this.analyzeAuthors(log.all),
      patterns: this.analyzePatterns(log.all),
      files: await this.analyzeFiles(log.all),
      timeline: this.createTimeline(log.all),
      insights: this.extractInsights(log.all)
    };
    
    return analysis;
  }

  analyzeAuthors(commits) {
    const authors = {};
    
    commits.forEach(commit => {
      const author = commit.author_email;
      if (!authors[author]) {
        authors[author] = {
          name: commit.author_name,
          email: author,
          commits: 0,
          lines: { added: 0, deleted: 0 }
        };
      }
      authors[author].commits++;
    });
    
    return Object.values(authors).sort((a, b) => b.commits - a.commits);
  }

  analyzePatterns(commits) {
    const patterns = {
      features: 0,
      bugFixes: 0,
      refactoring: 0,
      documentation: 0,
      tests: 0,
      other: 0
    };
    
    commits.forEach(commit => {
      const message = commit.message.toLowerCase();
      
      if (message.includes('feat') || message.includes('add')) {
        patterns.features++;
      } else if (message.includes('fix') || message.includes('bug')) {
        patterns.bugFixes++;
      } else if (message.includes('refactor')) {
        patterns.refactoring++;
      } else if (message.includes('doc') || message.includes('readme')) {
        patterns.documentation++;
      } else if (message.includes('test')) {
        patterns.tests++;
      } else {
        patterns.other++;
      }
    });
    
    return patterns;
  }

  async analyzeFiles(commits) {
    const fileStats = {};
    
    for (const commit of commits) {
      const diff = await this.git.show([commit.hash, '--stat']);
      const files = this.parseFilesFromDiff(diff);
      
      files.forEach(file => {
        if (!fileStats[file.name]) {
          fileStats[file.name] = {
            changes: 0,
            additions: 0,
            deletions: 0,
            commits: []
          };
        }
        fileStats[file.name].changes++;
        fileStats[file.name].additions += file.additions;
        fileStats[file.name].deletions += file.deletions;
        fileStats[file.name].commits.push(commit.hash);
      });
    }
    
    return Object.entries(fileStats)
      .sort((a, b) => b[1].changes - a[1].changes)
      .slice(0, 20)
      .map(([name, stats]) => ({ name, ...stats }));
  }

  parseFilesFromDiff(diff) {
    const files = [];
    const lines = diff.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^\s*(\S+)\s+\|\s+(\d+)\s+(\+*)(-*)/);
      if (match) {
        files.push({
          name: match[1],
          changes: parseInt(match[2]),
          additions: match[3].length,
          deletions: match[4].length
        });
      }
    });
    
    return files;
  }

  createTimeline(commits) {
    const timeline = {};
    
    commits.forEach(commit => {
      const date = commit.date.split('T')[0];
      if (!timeline[date]) {
        timeline[date] = {
          commits: 0,
          features: [],
          fixes: [],
          other: []
        };
      }
      
      timeline[date].commits++;
      
      const message = commit.message.toLowerCase();
      if (message.includes('feat') || message.includes('add')) {
        timeline[date].features.push(commit.message);
      } else if (message.includes('fix') || message.includes('bug')) {
        timeline[date].fixes.push(commit.message);
      } else {
        timeline[date].other.push(commit.message);
      }
    });
    
    return timeline;
  }

  extractInsights(commits) {
    const insights = {
      mostProductiveDay: null,
      mostProductiveHour: null,
      averageCommitsPerDay: 0,
      longestStreak: 0,
      currentStreak: 0,
      topFeatures: [],
      criticalFixes: []
    };
    
    // Calculate productive times
    const dayActivity = {};
    const hourActivity = {};
    
    commits.forEach(commit => {
      const date = new Date(commit.date);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      
      dayActivity[day] = (dayActivity[day] || 0) + 1;
      hourActivity[hour] = (hourActivity[hour] || 0) + 1;
    });
    
    insights.mostProductiveDay = Object.entries(dayActivity)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    insights.mostProductiveHour = Object.entries(hourActivity)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    // Calculate streaks
    const dates = commits.map(c => c.date.split('T')[0]);
    insights.currentStreak = this.calculateCurrentStreak(dates);
    insights.longestStreak = this.calculateLongestStreak(dates);
    
    // Extract top features and fixes
    commits.forEach(commit => {
      if (commit.message.match(/feat/i)) {
        insights.topFeatures.push(commit.message);
      }
      if (commit.message.match(/critical|urgent|hotfix/i)) {
        insights.criticalFixes.push(commit.message);
      }
    });
    
    insights.topFeatures = insights.topFeatures.slice(0, 5);
    insights.criticalFixes = insights.criticalFixes.slice(0, 5);
    
    return insights;
  }

  calculateCurrentStreak(dates) {
    if (!dates.length) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (!dates.includes(today) && !dates.includes(yesterday)) {
      return 0;
    }
    
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  calculateLongestStreak(dates) {
    if (!dates.length) return 0;
    
    const uniqueDates = [...new Set(dates)].sort();
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const dayDiff = (currDate - prevDate) / 86400000;
      
      if (dayDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }

  async startWatching() {
    logger.info('Starting git repository monitoring...');
    
    // Get initial commit
    const log = await this.git.log({ n: 1 });
    this.lastCommitHash = log.latest?.hash;
    
    // Check for new commits every 30 seconds
    this.watchInterval = setInterval(async () => {
      await this.checkForNewCommits();
    }, 30000);
  }

  async checkForNewCommits() {
    const log = await this.git.log({ n: 1 });
    const latestHash = log.latest?.hash;
    
    if (latestHash && latestHash !== this.lastCommitHash) {
      const commit = log.latest;
      const diff = await this.git.show([commit.hash, '--stat']);
      
      this.emit('commitDetected', {
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: commit.date,
        files: this.parseFilesFromDiff(diff),
        stats: {
          additions: commit.diff?.insertions || 0,
          deletions: commit.diff?.deletions || 0
        }
      });
      
      this.lastCommitHash = latestHash;
    }
  }

  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      logger.info('Stopped git repository monitoring');
    }
  }

  async recoverProjectHistory() {
    logger.info('Recovering complete project history...');
    
    const allCommits = await this.git.log();
    const projects = {};
    
    for (const commit of allCommits.all) {
      // Determine project from commit
      const project = this.identifyProject(commit);
      
      if (!projects[project]) {
        projects[project] = {
          name: project,
          firstCommit: commit.date,
          lastCommit: commit.date,
          commits: [],
          milestones: [],
          contributors: new Set()
        };
      }
      
      projects[project].commits.push({
        hash: commit.hash,
        message: commit.message,
        date: commit.date,
        author: commit.author_name
      });
      
      projects[project].lastCommit = commit.date;
      projects[project].contributors.add(commit.author_email);
      
      // Identify milestones
      if (commit.message.match(/release|v\d+\.\d+|milestone|launch/i)) {
        projects[project].milestones.push({
          date: commit.date,
          description: commit.message,
          commit: commit.hash
        });
      }
    }
    
    // Convert sets to arrays
    Object.values(projects).forEach(project => {
      project.contributors = Array.from(project.contributors);
    });
    
    return projects;
  }

  identifyProject(commit) {
    // Try to identify project from commit message or files
    if (commit.message.includes('pachacuti')) return 'pachacuti';
    if (commit.message.includes('crypto')) return 'crypto-main';
    if (commit.message.includes('voter')) return 'voter-app';
    if (commit.message.includes('visual')) return 'visual-verification';
    
    // Default to main project
    return 'pachacuti';
  }
}

module.exports = GitAnalyzer;