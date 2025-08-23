/**
 * History Recovery Module
 * Recovers and reconstructs development history from various sources
 */

const fs = require('fs').promises;
const path = require('path');
const GitAnalyzer = require('./git-analyzer');
const { logger } = require('./logger');

class HistoryRecovery {
  constructor() {
    this.gitAnalyzer = new GitAnalyzer();
    this.sources = {
      git: true,
      files: true,
      logs: true,
      documentation: true
    };
  }

  async recoverHistory() {
    logger.info('🔍 Starting comprehensive history recovery...');
    
    const history = {
      projects: {},
      timeline: {},
      developers: {},
      technologies: {},
      milestones: [],
      insights: {}
    };
    
    // Recover from Git
    if (this.sources.git) {
      const gitHistory = await this.recoverFromGit();
      this.mergeHistory(history, gitHistory);
    }
    
    // Recover from existing files
    if (this.sources.files) {
      const fileHistory = await this.recoverFromFiles();
      this.mergeHistory(history, fileHistory);
    }
    
    // Recover from logs
    if (this.sources.logs) {
      const logHistory = await this.recoverFromLogs();
      this.mergeHistory(history, logHistory);
    }
    
    // Recover from documentation
    if (this.sources.documentation) {
      const docHistory = await this.recoverFromDocumentation();
      this.mergeHistory(history, docHistory);
    }
    
    // Generate insights
    history.insights = this.generateInsights(history);
    
    // Save recovered history
    await this.saveHistory(history);
    
    logger.info('✅ History recovery complete');
    return history;
  }

  async recoverFromGit() {
    logger.info('Recovering from Git history...');
    
    const gitHistory = {
      projects: {},
      timeline: {},
      developers: {},
      technologies: new Set()
    };
    
    // Get all commits
    const analysis = await this.gitAnalyzer.analyzeHistory(365); // Last year
    const projectHistory = await this.gitAnalyzer.recoverProjectHistory();
    
    // Process commits by project
    for (const [projectName, project] of Object.entries(projectHistory)) {
      gitHistory.projects[projectName] = {
        name: projectName,
        created: project.firstCommit,
        lastUpdated: project.lastCommit,
        commits: project.commits.length,
        contributors: project.contributors,
        milestones: project.milestones,
        timeline: this.createProjectTimeline(project.commits)
      };
      
      // Extract technologies from commit messages and files
      project.commits.forEach(commit => {
        this.extractTechnologies(commit.message, gitHistory.technologies);
      });
    }
    
    // Process timeline
    gitHistory.timeline = analysis.timeline;
    
    // Process developers
    analysis.authors.forEach(author => {
      gitHistory.developers[author.email] = {
        name: author.name,
        email: author.email,
        commits: author.commits,
        projects: this.getAuthorProjects(author.email, projectHistory)
      };
    });
    
    gitHistory.technologies = Array.from(gitHistory.technologies);
    
    return gitHistory;
  }

  async recoverFromFiles() {
    logger.info('Recovering from existing files...');
    
    const fileHistory = {
      projects: {},
      sessionLogs: [],
      workHistory: []
    };
    
    // Look for session logs
    const sessionPaths = [
      'session-logs',
      'logs',
      '.claude-flow/sessions',
      'daily-briefing/data'
    ];
    
    for (const sessionPath of sessionPaths) {
      const fullPath = path.join(process.cwd(), sessionPath);
      
      try {
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.md')) {
            const content = await fs.readFile(
              path.join(fullPath, file), 
              'utf-8'
            );
            
            fileHistory.sessionLogs.push({
              file: file,
              path: sessionPath,
              content: this.parseSessionContent(content),
              timestamp: await this.getFileTimestamp(path.join(fullPath, file))
            });
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }
    
    // Look for work history in markdown files
    const workFiles = await this.findWorkFiles();
    for (const workFile of workFiles) {
      const content = await fs.readFile(workFile, 'utf-8');
      fileHistory.workHistory.push({
        file: workFile,
        content: this.parseWorkContent(content),
        timestamp: await this.getFileTimestamp(workFile)
      });
    }
    
    return fileHistory;
  }

  async recoverFromLogs() {
    logger.info('Recovering from system logs...');
    
    const logHistory = {
      bashHistory: [],
      npmHistory: [],
      gitLogs: []
    };
    
    // Read bash history
    try {
      const bashHistoryPath = path.join(process.env.HOME, '.bash_history');
      const bashContent = await fs.readFile(bashHistoryPath, 'utf-8');
      
      logHistory.bashHistory = bashContent
        .split('\n')
        .filter(cmd => cmd.includes('claude') || cmd.includes('git') || cmd.includes('npm'))
        .map(cmd => ({
          command: cmd,
          category: this.categorizeCommand(cmd)
        }));
    } catch (error) {
      logger.warn('Could not read bash history');
    }
    
    // Read npm logs
    try {
      const npmLogPath = path.join(process.env.HOME, '.npm/_logs');
      const logs = await fs.readdir(npmLogPath);
      
      for (const log of logs.slice(-10)) { // Last 10 logs
        const content = await fs.readFile(path.join(npmLogPath, log), 'utf-8');
        logHistory.npmHistory.push({
          file: log,
          timestamp: log.split('-')[0],
          events: this.parseNpmLog(content)
        });
      }
    } catch (error) {
      logger.warn('Could not read npm logs');
    }
    
    return logHistory;
  }

  async recoverFromDocumentation() {
    logger.info('Recovering from documentation...');
    
    const docHistory = {
      readmes: [],
      guides: [],
      apis: [],
      decisions: []
    };
    
    // Find all documentation files
    const docFiles = await this.findDocumentationFiles();
    
    for (const docFile of docFiles) {
      const content = await fs.readFile(docFile, 'utf-8');
      const category = this.categorizeDocumentation(docFile, content);
      
      const doc = {
        file: docFile,
        category: category,
        title: this.extractTitle(content),
        sections: this.extractSections(content),
        timestamp: await this.getFileTimestamp(docFile)
      };
      
      switch (category) {
        case 'readme':
          docHistory.readmes.push(doc);
          break;
        case 'guide':
          docHistory.guides.push(doc);
          break;
        case 'api':
          docHistory.apis.push(doc);
          break;
        case 'decision':
          docHistory.decisions.push(doc);
          break;
      }
    }
    
    return docHistory;
  }

  createProjectTimeline(commits) {
    const timeline = {};
    
    commits.forEach(commit => {
      const date = commit.date.split('T')[0];
      if (!timeline[date]) {
        timeline[date] = [];
      }
      timeline[date].push({
        time: commit.date.split('T')[1],
        message: commit.message,
        hash: commit.hash
      });
    });
    
    return timeline;
  }

  extractTechnologies(text, technologies) {
    const techPatterns = [
      /node|npm|javascript|js/i,
      /python|py|pip/i,
      /react|vue|angular/i,
      /docker|kubernetes|k8s/i,
      /aws|azure|gcp/i,
      /postgres|mysql|mongodb/i,
      /redis|elasticsearch/i,
      /github|gitlab|bitbucket/i,
      /claude|openai|anthropic/i
    ];
    
    const techMap = {
      'node': 'Node.js',
      'npm': 'NPM',
      'javascript': 'JavaScript',
      'python': 'Python',
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'aws': 'AWS',
      'azure': 'Azure',
      'gcp': 'Google Cloud',
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis',
      'elasticsearch': 'Elasticsearch',
      'github': 'GitHub',
      'claude': 'Claude AI'
    };
    
    techPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        const tech = match[0].toLowerCase();
        technologies.add(techMap[tech] || tech);
      }
    });
  }

  getAuthorProjects(email, projectHistory) {
    const projects = [];
    
    for (const [projectName, project] of Object.entries(projectHistory)) {
      if (project.contributors.includes(email)) {
        projects.push(projectName);
      }
    }
    
    return projects;
  }

  parseSessionContent(content) {
    try {
      if (content.startsWith('{')) {
        return JSON.parse(content);
      } else {
        // Parse markdown content
        return {
          text: content,
          lines: content.split('\n').length,
          headings: content.match(/^#+\s+.+$/gm) || []
        };
      }
    } catch (error) {
      return { raw: content };
    }
  }

  parseWorkContent(content) {
    const sections = {};
    let currentSection = 'general';
    
    content.split('\n').forEach(line => {
      if (line.startsWith('#')) {
        currentSection = line.replace(/^#+\s+/, '').toLowerCase();
        sections[currentSection] = [];
      } else if (line.trim()) {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push(line);
      }
    });
    
    return sections;
  }

  async getFileTimestamp(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.toISOString();
    } catch (error) {
      return null;
    }
  }

  async findWorkFiles() {
    const patterns = [
      '**/work-history*.md',
      '**/session-*.md',
      '**/daily-*.md',
      '**/weekly-*.md'
    ];
    
    const files = [];
    
    for (const pattern of patterns) {
      // Simple file search (would use glob in production)
      const searchPath = process.cwd();
      // Implement recursive search
    }
    
    return files;
  }

  async findDocumentationFiles() {
    const docPaths = [
      'docs',
      'documentation',
      'README.md',
      'CONTRIBUTING.md',
      'ARCHITECTURE.md'
    ];
    
    const files = [];
    
    for (const docPath of docPaths) {
      const fullPath = path.join(process.cwd(), docPath);
      
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          const dirFiles = await this.findMarkdownFiles(fullPath);
          files.push(...dirFiles);
        } else if (stats.isFile()) {
          files.push(fullPath);
        }
      } catch (error) {
        // Path doesn't exist
      }
    }
    
    return files;
  }

  async findMarkdownFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subFiles = await this.findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  categorizeCommand(cmd) {
    if (cmd.includes('git')) return 'git';
    if (cmd.includes('npm') || cmd.includes('node')) return 'node';
    if (cmd.includes('claude')) return 'claude';
    if (cmd.includes('docker')) return 'docker';
    if (cmd.includes('test')) return 'testing';
    return 'other';
  }

  parseNpmLog(content) {
    const events = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.includes('error') || line.includes('warn') || line.includes('info')) {
        events.push(line);
      }
    });
    
    return events;
  }

  categorizeDocumentation(file, content) {
    if (file.includes('README')) return 'readme';
    if (file.includes('guide') || file.includes('GUIDE')) return 'guide';
    if (file.includes('api') || file.includes('API')) return 'api';
    if (content.includes('ADR') || content.includes('Decision')) return 'decision';
    return 'general';
  }

  extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled';
  }

  extractSections(content) {
    const sections = [];
    const headings = content.match(/^##\s+(.+)$/gm) || [];
    
    headings.forEach(heading => {
      sections.push(heading.replace(/^##\s+/, ''));
    });
    
    return sections;
  }

  mergeHistory(target, source) {
    // Merge projects
    if (source.projects) {
      Object.assign(target.projects, source.projects);
    }
    
    // Merge timeline
    if (source.timeline) {
      Object.entries(source.timeline).forEach(([date, events]) => {
        if (!target.timeline[date]) {
          target.timeline[date] = [];
        }
        target.timeline[date].push(...(Array.isArray(events) ? events : [events]));
      });
    }
    
    // Merge developers
    if (source.developers) {
      Object.assign(target.developers, source.developers);
    }
    
    // Merge technologies
    if (source.technologies) {
      if (!target.technologies) {
        target.technologies = {};
      }
      source.technologies.forEach(tech => {
        target.technologies[tech] = (target.technologies[tech] || 0) + 1;
      });
    }
    
    // Merge other data
    if (source.sessionLogs) {
      if (!target.sessionLogs) target.sessionLogs = [];
      target.sessionLogs.push(...source.sessionLogs);
    }
    
    if (source.workHistory) {
      if (!target.workHistory) target.workHistory = [];
      target.workHistory.push(...source.workHistory);
    }
  }

  generateInsights(history) {
    const insights = {
      summary: {
        totalProjects: Object.keys(history.projects).length,
        totalDevelopers: Object.keys(history.developers).length,
        totalCommits: Object.values(history.projects).reduce((sum, p) => sum + (p.commits || 0), 0),
        technologies: Object.keys(history.technologies || {}).length
      },
      trends: {
        mostActiveProject: this.getMostActiveProject(history.projects),
        mostActiveDeveloper: this.getMostActiveDeveloper(history.developers),
        popularTechnologies: this.getPopularTechnologies(history.technologies)
      },
      patterns: {
        developmentVelocity: this.calculateVelocity(history.timeline),
        collaborationLevel: this.calculateCollaboration(history.projects)
      }
    };
    
    return insights;
  }

  getMostActiveProject(projects) {
    let maxCommits = 0;
    let mostActive = null;
    
    Object.entries(projects).forEach(([name, project]) => {
      if (project.commits > maxCommits) {
        maxCommits = project.commits;
        mostActive = name;
      }
    });
    
    return mostActive;
  }

  getMostActiveDeveloper(developers) {
    let maxCommits = 0;
    let mostActive = null;
    
    Object.entries(developers).forEach(([email, dev]) => {
      if (dev.commits > maxCommits) {
        maxCommits = dev.commits;
        mostActive = dev.name || email;
      }
    });
    
    return mostActive;
  }

  getPopularTechnologies(technologies) {
    if (!technologies) return [];
    
    return Object.entries(technologies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tech]) => tech);
  }

  calculateVelocity(timeline) {
    const dates = Object.keys(timeline).sort();
    if (dates.length < 2) return 'insufficient data';
    
    const recentDates = dates.slice(-30); // Last 30 days
    const totalCommits = recentDates.reduce((sum, date) => {
      return sum + (Array.isArray(timeline[date]) ? timeline[date].length : 1);
    }, 0);
    
    const avgPerDay = totalCommits / recentDates.length;
    
    if (avgPerDay > 10) return 'high';
    if (avgPerDay > 5) return 'medium';
    if (avgPerDay > 1) return 'low';
    return 'minimal';
  }

  calculateCollaboration(projects) {
    let totalContributors = 0;
    let projectCount = 0;
    
    Object.values(projects).forEach(project => {
      if (project.contributors) {
        totalContributors += project.contributors.length;
        projectCount++;
      }
    });
    
    if (projectCount === 0) return 'none';
    
    const avgContributors = totalContributors / projectCount;
    
    if (avgContributors > 5) return 'high';
    if (avgContributors > 2) return 'medium';
    return 'low';
  }

  async saveHistory(history) {
    const historyPath = path.join(
      __dirname,
      '../archive',
      `history-${new Date().toISOString().split('T')[0]}.json`
    );
    
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    
    logger.info(`History saved to ${historyPath}`);
  }
}

module.exports = HistoryRecovery;