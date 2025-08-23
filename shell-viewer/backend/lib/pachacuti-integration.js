/**
 * Pachacuti Integration Adapter
 * Seamless integration between Shell Viewer and Session Recorder
 */

const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const logger = require('./logger');

class PachacutiIntegration extends EventEmitter {
  constructor(sessionManager) {
    super();
    this.sessionManager = sessionManager;
    this.sessionRecorderPath = process.env.SESSION_RECORDER_PATH || 
                              path.join(__dirname, '../../../session-recorder');
    this.knowledgeDbPath = path.join(this.sessionRecorderPath, 'data/knowledge.db');
    this.sessionsPath = path.join(this.sessionRecorderPath, 'data/sessions');
    this.connected = false;
  }

  async initialize() {
    logger.info('🔗 Initializing Pachacuti Integration...');
    
    try {
      // Check if Pachacuti Session Recorder is available
      await this.checkSessionRecorderAvailability();
      
      // Set up real-time sync
      await this.setupRealTimeSync();
      
      // Import existing sessions
      await this.importExistingSessions();
      
      this.connected = true;
      logger.info('✅ Pachacuti Integration initialized successfully');
      
      return true;
    } catch (error) {
      logger.warn('⚠️ Pachacuti Session Recorder not available:', error.message);
      logger.info('📝 Shell Viewer will operate in standalone mode');
      return false;
    }
  }

  async checkSessionRecorderAvailability() {
    // Check if session recorder directory exists
    try {
      await fs.access(this.sessionRecorderPath);
    } catch (error) {
      throw new Error(`Session recorder path not found: ${this.sessionRecorderPath}`);
    }

    // Check if knowledge database exists
    try {
      await fs.access(this.knowledgeDbPath);
      logger.info('📊 Found Pachacuti knowledge database');
    } catch (error) {
      logger.warn('📊 Pachacuti knowledge database not found');
    }

    // Check if sessions directory exists
    try {
      await fs.access(this.sessionsPath);
      logger.info('📁 Found Pachacuti sessions directory');
    } catch (error) {
      throw new Error(`Sessions directory not found: ${this.sessionsPath}`);
    }
  }

  async setupRealTimeSync() {
    // This would be called by the session manager's file watcher
    this.sessionManager.on('session-processed', (sessionData) => {
      this.emit('session-updated', sessionData);
    });

    this.sessionManager.on('command-executed', (commandData) => {
      this.emit('command-captured', commandData);
    });
  }

  async importExistingSessions() {
    logger.info('📥 Importing existing Pachacuti sessions...');
    
    try {
      const sessionFiles = await fs.readdir(this.sessionsPath);
      const jsonFiles = sessionFiles.filter(file => file.endsWith('.json'));
      
      let importCount = 0;
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.sessionsPath, file);
          const sessionData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          
          // Check if session already exists
          const existingSession = await this.sessionManager.getSession(sessionData.sessionId);
          if (!existingSession) {
            await this.sessionManager.extractShellCommands(sessionData);
            importCount++;
          }
        } catch (error) {
          logger.error(`Error importing session ${file}:`, error.message);
        }
      }
      
      logger.info(`📥 Imported ${importCount} new sessions from Pachacuti`);
      return importCount;
      
    } catch (error) {
      logger.error('Error importing sessions:', error);
      throw error;
    }
  }

  async exportSessionToRecorder(sessionId, commands) {
    if (!this.connected) {
      throw new Error('Pachacuti Integration not connected');
    }

    const sessionData = {
      sessionId: sessionId,
      start: commands[0]?.timestamp || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      activities: commands.map((cmd, index) => ({
        type: 'command',
        timestamp: cmd.timestamp,
        sequence: index,
        details: {
          command: cmd.command,
          output: cmd.output,
          exitCode: cmd.exit_code,
          duration: cmd.duration,
          workingDirectory: cmd.working_directory
        }
      })),
      commands: commands,
      metadata: {
        source: 'shell-viewer',
        exportedAt: new Date().toISOString()
      }
    };

    const filePath = path.join(this.sessionsPath, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));
    
    logger.info(`📤 Exported session ${sessionId} to Pachacuti`);
  }

  async syncWithKnowledgeBase() {
    if (!this.connected) return;

    try {
      // This would integrate with Pachacuti's knowledge base
      // For now, we'll just log the sync attempt
      logger.info('🧠 Syncing with Pachacuti knowledge base...');
      
      // In a full implementation, this would:
      // 1. Query the SQLite knowledge database
      // 2. Extract relevant command patterns and insights
      // 3. Update our AI search index
      // 4. Share learned patterns between systems
      
    } catch (error) {
      logger.error('Knowledge base sync error:', error);
    }
  }

  async getSessionRecorderStatus() {
    const status = {
      connected: this.connected,
      sessionRecorderPath: this.sessionRecorderPath,
      knowledgeDbExists: false,
      sessionsPathExists: false,
      lastSync: null
    };

    try {
      await fs.access(this.knowledgeDbPath);
      status.knowledgeDbExists = true;
    } catch (error) {
      // Knowledge DB doesn't exist
    }

    try {
      await fs.access(this.sessionsPath);
      status.sessionsPathExists = true;
    } catch (error) {
      // Sessions path doesn't exist
    }

    return status;
  }

  async createLiveSession() {
    // Create a new live session that can be monitored in real-time
    const sessionId = this.generateSessionId();
    const sessionData = {
      id: sessionId,
      start_time: new Date().toISOString(),
      user_name: process.env.USER || 'unknown',
      working_directory: process.cwd(),
      is_live: true,
      created_by: 'shell-viewer'
    };

    await this.sessionManager.createSession(sessionData);
    
    this.emit('live-session-created', sessionData);
    return sessionId;
  }

  generateSessionId() {
    const date = new Date().toISOString().split('T')[0];
    const time = Date.now().toString(36);
    return `shell-viewer-${date}-${time}`;
  }

  isConnected() {
    return this.connected;
  }

  async cleanup() {
    // Clean up any resources
    this.removeAllListeners();
    logger.info('🧹 Pachacuti Integration cleaned up');
  }
}

module.exports = PachacutiIntegration;