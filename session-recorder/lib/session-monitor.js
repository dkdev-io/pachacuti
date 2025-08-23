/**
 * Session Monitor Module
 * Real-time monitoring of development activity
 */

const chokidar = require('chokidar');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('./logger');

class SessionMonitor extends EventEmitter {
  constructor() {
    super();
    this.watchers = [];
    this.ignoredPaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.cache',
      'coverage',
      '*.log'
    ];
    this.watchedExtensions = [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.go', '.rs', '.java',
      '.html', '.css', '.scss',
      '.json', '.yaml', '.yml',
      '.md', '.txt'
    ];
  }

  async start() {
    logger.info('Starting session monitoring...');
    
    // Watch project directory
    await this.watchDirectory(process.cwd());
    
    // Monitor git hooks
    await this.setupGitHooks();
    
    // Monitor terminal commands
    await this.setupCommandMonitoring();
    
    logger.info('Session monitoring active');
  }

  async watchDirectory(dirPath) {
    const watcher = chokidar.watch(dirPath, {
      ignored: this.ignoredPaths,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });
    
    watcher.on('add', (filePath) => this.handleFileEvent('add', filePath));
    watcher.on('change', (filePath) => this.handleFileEvent('change', filePath));
    watcher.on('unlink', (filePath) => this.handleFileEvent('delete', filePath));
    
    this.watchers.push(watcher);
  }

  async handleFileEvent(action, filePath) {
    const ext = path.extname(filePath);
    
    if (!this.watchedExtensions.includes(ext)) {
      return;
    }
    
    const event = {
      type: 'file',
      action: action,
      path: filePath,
      timestamp: new Date().toISOString()
    };
    
    // Read file content for add/change events
    if (action !== 'delete') {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        event.content = content;
        event.lines = content.split('\n').length;
        event.size = Buffer.byteLength(content);
      } catch (error) {
        logger.error(`Error reading file ${filePath}:`, error);
      }
    }
    
    this.emit('fileChange', event);
    logger.debug(`File ${action}: ${filePath}`);
  }

  async setupGitHooks() {
    // Create git hooks directory if it doesn't exist
    const hooksDir = path.join(process.cwd(), '.git', 'hooks');
    
    try {
      await fs.mkdir(hooksDir, { recursive: true });
      
      // Create post-commit hook
      const postCommitHook = `#!/bin/sh
# Pachacuti Session Recorder Hook
node ${path.join(__dirname, 'git-hook-handler.js')} post-commit "$@"
`;
      
      const postCommitPath = path.join(hooksDir, 'post-commit');
      await fs.writeFile(postCommitPath, postCommitHook);
      await fs.chmod(postCommitPath, '755');
      
      // Create pre-push hook
      const prePushHook = `#!/bin/sh
# Pachacuti Session Recorder Hook
node ${path.join(__dirname, 'git-hook-handler.js')} pre-push "$@"
`;
      
      const prePushPath = path.join(hooksDir, 'pre-push');
      await fs.writeFile(prePushPath, prePushHook);
      await fs.chmod(prePushPath, '755');
      
      logger.info('Git hooks installed');
    } catch (error) {
      logger.error('Error setting up git hooks:', error);
    }
  }

  async setupCommandMonitoring() {
    // Monitor bash history
    const historyFile = path.join(process.env.HOME, '.bash_history');
    
    try {
      const watcher = chokidar.watch(historyFile, {
        persistent: true,
        ignoreInitial: true
      });
      
      let lastSize = 0;
      
      watcher.on('change', async () => {
        try {
          const content = await fs.readFile(historyFile, 'utf-8');
          const lines = content.split('\n');
          const newCommands = lines.slice(lastSize);
          
          newCommands.forEach(command => {
            if (command.trim()) {
              this.emit('commandExecuted', {
                command: command,
                timestamp: new Date().toISOString()
              });
            }
          });
          
          lastSize = lines.length;
        } catch (error) {
          logger.error('Error reading bash history:', error);
        }
      });
      
      this.watchers.push(watcher);
      logger.info('Command monitoring active');
    } catch (error) {
      logger.warn('Could not set up command monitoring:', error.message);
    }
  }

  async detectSessionStart() {
    // Detect Claude Code session start
    const indicators = [
      'claude-code',
      'claude mcp',
      'npx claude-flow'
    ];
    
    // Check running processes
    const processes = await this.getRunningProcesses();
    
    for (const indicator of indicators) {
      if (processes.some(p => p.includes(indicator))) {
        this.emit('sessionStarted', {
          timestamp: new Date().toISOString(),
          type: 'claude-code',
          processes: processes.filter(p => p.includes(indicator))
        });
        return true;
      }
    }
    
    return false;
  }

  async getRunningProcesses() {
    try {
      const { exec } = require('child_process').promises;
      const { stdout } = await exec('ps aux | grep -E "claude|flow"');
      return stdout.split('\n').filter(line => line.trim());
    } catch (error) {
      return [];
    }
  }

  async stop() {
    logger.info('Stopping session monitoring...');
    
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    
    this.watchers = [];
    logger.info('Session monitoring stopped');
  }
}

module.exports = SessionMonitor;