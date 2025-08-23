/**
 * Shell Controller
 * Handles shell-specific operations and analysis
 */

const logger = require('./logger');

class ShellController {
  constructor() {
    this.sessionManager = null;
  }

  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
  }

  async getSessionCommands(sessionId) {
    if (!this.sessionManager) {
      throw new Error('Session manager not initialized');
    }
    
    return await this.sessionManager.getSessionCommands(sessionId);
  }

  async getSessionTimeline(sessionId) {
    if (!this.sessionManager) {
      throw new Error('Session manager not initialized');
    }
    
    const timeline = await this.sessionManager.getSessionTimeline(sessionId);
    
    // Enhance timeline with shell-specific analysis
    return this.enhanceTimeline(timeline);
  }

  enhanceTimeline(timeline) {
    return timeline.map(item => {
      if (item.type === 'command') {
        return {
          ...item,
          analysis: this.analyzeCommand(item),
          category: this.categorizeCommand(item.command)
        };
      }
      return item;
    });
  }

  analyzeCommand(commandItem) {
    const { command, output, exit_code, duration } = commandItem;
    const analysis = {
      isSuccessful: exit_code === 0,
      isLongRunning: duration > 5000,
      hasError: exit_code !== 0,
      isInteractive: this.isInteractiveCommand(command),
      isDestructive: this.isDestructiveCommand(command),
      complexity: this.assessComplexity(command)
    };
    
    // Add specific insights
    if (analysis.hasError) {
      analysis.errorType = this.categorizeError(output);
    }
    
    if (analysis.isLongRunning) {
      analysis.performanceNote = 'Command took significant time to execute';
    }
    
    return analysis;
  }

  categorizeCommand(command) {
    if (!command) return 'unknown';
    
    const cmd = command.toLowerCase().trim();
    
    // Git commands
    if (cmd.startsWith('git ')) {
      return 'version-control';
    }
    
    // Package managers
    if (cmd.match(/^(npm|yarn|pip|gem|cargo|go get)/)) {
      return 'package-management';
    }
    
    // Build tools
    if (cmd.match(/^(make|cmake|gradle|mvn|docker)/)) {
      return 'build-tools';
    }
    
    // File operations
    if (cmd.match(/^(ls|find|grep|cat|less|more|head|tail|sort|uniq)/)) {
      return 'file-operations';
    }
    
    // System operations
    if (cmd.match(/^(ps|top|htop|kill|systemctl|service)/)) {
      return 'system-operations';
    }
    
    // Network operations
    if (cmd.match(/^(curl|wget|ssh|scp|ping|netstat)/)) {
      return 'network-operations';
    }
    
    // Directory navigation
    if (cmd.match(/^(cd|pwd|mkdir|rmdir)/)) {
      return 'navigation';
    }
    
    // Text processing
    if (cmd.match(/^(sed|awk|tr|cut|paste)/)) {
      return 'text-processing';
    }
    
    // Development
    if (cmd.match(/^(node|python|ruby|java|go run)/)) {
      return 'development';
    }
    
    return 'general';
  }

  isInteractiveCommand(command) {
    const interactiveCommands = [
      'vi', 'vim', 'nano', 'emacs',
      'less', 'more',
      'top', 'htop',
      'ssh',
      'mysql', 'psql',
      'python', 'node', 'irb',
      'ftp', 'sftp'
    ];
    
    const baseCommand = command.split(' ')[0];
    return interactiveCommands.includes(baseCommand);
  }

  isDestructiveCommand(command) {
    const destructivePatterns = [
      /^rm\s+.*-rf/,
      /^rm\s+.*\*/,
      /^sudo rm/,
      /truncate/i,
      /drop\s+database/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /format/i
    ];
    
    return destructivePatterns.some(pattern => pattern.test(command));
  }

  assessComplexity(command) {
    let score = 0;
    
    // Pipe operations
    const pipeCount = (command.match(/\|/g) || []).length;
    score += pipeCount * 2;
    
    // Redirection
    const redirectionCount = (command.match(/[<>]/g) || []).length;
    score += redirectionCount;
    
    // Background processes
    if (command.includes('&')) score += 1;
    
    // Conditional execution
    if (command.includes('&&') || command.includes('||')) score += 2;
    
    // Command substitution
    if (command.includes('$(') || command.includes('`')) score += 3;
    
    // Length-based complexity
    if (command.length > 100) score += 2;
    if (command.length > 200) score += 3;
    
    // Multiple commands
    const commandCount = (command.match(/;/g) || []).length + 1;
    score += commandCount - 1;
    
    if (score <= 2) return 'simple';
    if (score <= 6) return 'moderate';
    return 'complex';
  }

  categorizeError(output) {
    if (!output) return 'unknown';
    
    const outputLower = output.toLowerCase();
    
    if (outputLower.includes('permission denied')) {
      return 'permission';
    }
    
    if (outputLower.includes('no such file or directory')) {
      return 'file-not-found';
    }
    
    if (outputLower.includes('command not found')) {
      return 'command-not-found';
    }
    
    if (outputLower.includes('connection refused')) {
      return 'connection-error';
    }
    
    if (outputLower.includes('timeout')) {
      return 'timeout';
    }
    
    if (outputLower.includes('out of memory')) {
      return 'memory-error';
    }
    
    if (outputLower.includes('disk full') || outputLower.includes('no space left')) {
      return 'disk-error';
    }
    
    return 'general-error';
  }

  async getCommandPatterns(sessionId) {
    const commands = await this.getSessionCommands(sessionId);
    
    const patterns = {
      mostUsed: this.getMostUsedCommands(commands),
      commandSequences: this.findCommandSequences(commands),
      errorPatterns: this.analyzeErrorPatterns(commands),
      timePatterns: this.analyzeTimePatterns(commands)
    };
    
    return patterns;
  }

  getMostUsedCommands(commands) {
    const commandCounts = {};
    
    commands.forEach(cmd => {
      const baseCommand = cmd.command.split(' ')[0];
      commandCounts[baseCommand] = (commandCounts[baseCommand] || 0) + 1;
    });
    
    return Object.entries(commandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([command, count]) => ({ command, count }));
  }

  findCommandSequences(commands) {
    const sequences = [];
    
    for (let i = 0; i < commands.length - 1; i++) {
      const current = commands[i];
      const next = commands[i + 1];
      
      // Check if commands are close in time (within 30 seconds)
      const timeDiff = new Date(next.timestamp) - new Date(current.timestamp);
      if (timeDiff < 30000) {
        const sequence = `${current.command.split(' ')[0]} → ${next.command.split(' ')[0]}`;
        sequences.push({
          sequence,
          firstCommand: current.command,
          secondCommand: next.command,
          timeDiff: timeDiff
        });
      }
    }
    
    // Find most common sequences
    const sequenceCounts = {};
    sequences.forEach(seq => {
      sequenceCounts[seq.sequence] = (sequenceCounts[seq.sequence] || 0) + 1;
    });
    
    return Object.entries(sequenceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sequence, count]) => ({ sequence, count }));
  }

  analyzeErrorPatterns(commands) {
    const errorCommands = commands.filter(cmd => cmd.exit_code !== 0);
    const patterns = {};
    
    errorCommands.forEach(cmd => {
      const category = this.categorizeError(cmd.output);
      patterns[category] = (patterns[category] || 0) + 1;
    });
    
    return {
      totalErrors: errorCommands.length,
      errorRate: (errorCommands.length / commands.length) * 100,
      patterns: Object.entries(patterns)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }))
    };
  }

  analyzeTimePatterns(commands) {
    const hourCounts = {};
    const dayCounts = {};
    
    commands.forEach(cmd => {
      const date = new Date(cmd.timestamp);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    
    return {
      mostActiveHour: Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0],
      mostActiveDay: Object.entries(dayCounts)
        .sort((a, b) => b[1] - a[1])[0],
      hourDistribution: hourCounts,
      dayDistribution: dayCounts
    };
  }
}

module.exports = ShellController;