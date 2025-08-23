/**
 * Session Manager
 * Manages shell sessions and integrates with Pachacuti Session Recorder
 */

const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');
const logger = require('./logger');

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.localDb = null;
    this.supabase = null;
    this.sessionRecorderPath = path.join(__dirname, '../../../session-recorder');
    this.watchers = [];
    this.sessions = new Map();
  }

  async initialize() {
    logger.info('🚀 Initializing Session Manager...');
    
    // Initialize local SQLite connection
    await this.initializeLocalDb();
    
    // Initialize Supabase if available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.initializeSupabase();
    }
    
    // Set up session recorder integration
    await this.setupSessionRecorderIntegration();
    
    // Load existing sessions
    await this.loadExistingSessions();
    
    logger.info('✅ Session Manager initialized');
  }

  async initializeLocalDb() {
    const dbPath = path.join(__dirname, '../data/shell-viewer.db');
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    
    this.localDb = new sqlite3.Database(dbPath);
    
    // Create tables
    const schema = `
      CREATE TABLE IF NOT EXISTS shell_sessions (
        id TEXT PRIMARY KEY,
        recorder_session_id TEXT,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER,
        command_count INTEGER,
        user_name TEXT,
        working_directory TEXT,
        environment JSONB,
        metadata JSONB,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shell_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT REFERENCES shell_sessions(id),
        sequence_number INTEGER,
        timestamp TEXT,
        command TEXT,
        output TEXT,
        exit_code INTEGER,
        duration INTEGER,
        working_directory TEXT,
        environment_vars JSONB,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT REFERENCES shell_sessions(id),
        timestamp TEXT,
        event_type TEXT,
        event_data JSONB,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_commands_session ON shell_commands(session_id);
      CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON shell_commands(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON shell_sessions(start_time);
    `;
    
    await new Promise((resolve, reject) => {
      this.localDb.exec(schema, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    logger.info('📊 Local database initialized');
  }

  initializeSupabase() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    logger.info('☁️ Supabase connection initialized');
  }

  async setupSessionRecorderIntegration() {
    logger.info('🔗 Setting up Session Recorder integration...');
    
    // Watch for new session files
    const sessionsPath = path.join(this.sessionRecorderPath, 'data/sessions');
    
    try {
      await fs.access(sessionsPath);
      
      const watcher = chokidar.watch(sessionsPath, {
        ignoreInitial: false,
        persistent: true
      });
      
      watcher.on('add', (filePath) => this.processNewSessionFile(filePath));
      watcher.on('change', (filePath) => this.processUpdatedSessionFile(filePath));
      
      this.watchers.push(watcher);
      
      logger.info('👀 Watching session recorder files');
    } catch (error) {
      logger.warn('Session recorder path not found, skipping file watching');
    }
  }

  async processNewSessionFile(filePath) {
    try {
      const sessionData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      await this.extractShellCommands(sessionData);
      
      logger.info(`📝 Processed new session: ${sessionData.sessionId}`);
    } catch (error) {
      logger.error(`Error processing session file ${filePath}:`, error);
    }
  }

  async processUpdatedSessionFile(filePath) {
    try {
      const sessionData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      await this.updateShellSession(sessionData);
      
      logger.info(`🔄 Updated session: ${sessionData.sessionId}`);
    } catch (error) {
      logger.error(`Error updating session file ${filePath}:`, error);
    }
  }

  async extractShellCommands(sessionData) {
    const shellSession = {
      id: sessionData.sessionId,
      recorder_session_id: sessionData.sessionId,
      start_time: sessionData.start,
      end_time: sessionData.lastUpdate,
      duration: 0,
      command_count: 0,
      user_name: process.env.USER || 'unknown',
      working_directory: process.cwd(),
      environment: {},
      metadata: {
        source: 'pachacuti-session-recorder',
        version: '1.0.0'
      }
    };
    
    // Extract shell commands from activities
    const commands = [];
    let sequenceNumber = 0;
    
    if (sessionData.activities) {
      sessionData.activities
        .filter(activity => activity.type === 'command')
        .forEach(activity => {
          commands.push({
            session_id: sessionData.sessionId,
            sequence_number: sequenceNumber++,
            timestamp: activity.timestamp,
            command: activity.details?.command || '',
            output: activity.details?.output || '',
            exit_code: activity.details?.exitCode || 0,
            duration: activity.details?.duration || 0,
            working_directory: process.cwd(),
            environment_vars: {}
          });
        });
    }
    
    // Extract from commands array if available
    if (sessionData.commands) {
      sessionData.commands.forEach(cmd => {
        commands.push({
          session_id: sessionData.sessionId,
          sequence_number: sequenceNumber++,
          timestamp: cmd.timestamp,
          command: cmd.command,
          output: cmd.output,
          exit_code: cmd.exitCode || 0,
          duration: cmd.duration || 0,
          working_directory: process.cwd(),
          environment_vars: {}
        });
      });
    }
    
    shellSession.command_count = commands.length;
    
    // Store in database
    await this.storeShellSession(shellSession, commands);
    
    // Store in memory
    this.sessions.set(sessionData.sessionId, {
      ...shellSession,
      commands: commands
    });
    
    // Emit event
    this.emit('sessionProcessed', {
      sessionId: sessionData.sessionId,
      commandCount: commands.length
    });
  }

  async storeShellSession(session, commands) {
    // Store session
    await this.runQuery(`
      INSERT OR REPLACE INTO shell_sessions 
      (id, recorder_session_id, start_time, end_time, duration, command_count, 
       user_name, working_directory, environment, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session.id,
      session.recorder_session_id,
      session.start_time,
      session.end_time,
      session.duration,
      session.command_count,
      session.user_name,
      session.working_directory,
      JSON.stringify(session.environment),
      JSON.stringify(session.metadata)
    ]);
    
    // Store commands
    for (const cmd of commands) {
      await this.runQuery(`
        INSERT OR REPLACE INTO shell_commands
        (session_id, sequence_number, timestamp, command, output, exit_code,
         duration, working_directory, environment_vars)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cmd.session_id,
        cmd.sequence_number,
        cmd.timestamp,
        cmd.command,
        cmd.output,
        cmd.exit_code,
        cmd.duration,
        cmd.working_directory,
        JSON.stringify(cmd.environment_vars)
      ]);
    }
    
    // Store in Supabase if available
    if (this.supabase) {
      await this.storeInSupabase(session, commands);
    }
  }

  async storeInSupabase(session, commands) {
    try {
      // Store session
      const { error: sessionError } = await this.supabase
        .from('shell_sessions')
        .upsert(session);
      
      if (sessionError) throw sessionError;
      
      // Store commands in batches
      const batchSize = 100;
      for (let i = 0; i < commands.length; i += batchSize) {
        const batch = commands.slice(i, i + batchSize);
        
        const { error: commandError } = await this.supabase
          .from('shell_commands')
          .upsert(batch);
          
        if (commandError) throw commandError;
      }
      
      logger.info(`☁️ Stored session ${session.id} in Supabase`);
    } catch (error) {
      logger.error('Supabase storage error:', error);
    }
  }

  async getAllSessions() {
    const query = `
      SELECT s.*, COUNT(c.id) as actual_command_count
      FROM shell_sessions s
      LEFT JOIN shell_commands c ON s.id = c.session_id
      GROUP BY s.id
      ORDER BY s.start_time DESC
      LIMIT 50
    `;
    
    return await this.allQuery(query);
  }

  async getSession(sessionId) {
    const sessionQuery = `
      SELECT * FROM shell_sessions WHERE id = ?
    `;
    
    const commandsQuery = `
      SELECT * FROM shell_commands 
      WHERE session_id = ? 
      ORDER BY sequence_number ASC
    `;
    
    const [session] = await this.allQuery(sessionQuery, [sessionId]);
    if (!session) return null;
    
    const commands = await this.allQuery(commandsQuery, [sessionId]);
    
    return {
      ...session,
      commands: commands,
      environment: JSON.parse(session.environment || '{}'),
      metadata: JSON.parse(session.metadata || '{}')
    };
  }

  async getSessionCommands(sessionId, limit = 1000) {
    const query = `
      SELECT * FROM shell_commands 
      WHERE session_id = ? 
      ORDER BY sequence_number ASC 
      LIMIT ?
    `;
    
    return await this.allQuery(query, [sessionId, limit]);
  }

  async getSessionTimeline(sessionId) {
    const commandsQuery = `
      SELECT 
        timestamp,
        command,
        output,
        exit_code,
        duration,
        'command' as type
      FROM shell_commands 
      WHERE session_id = ?
    `;
    
    const eventsQuery = `
      SELECT 
        timestamp,
        event_type,
        event_data,
        'event' as type
      FROM session_events 
      WHERE session_id = ?
    `;
    
    const [commands, events] = await Promise.all([
      this.allQuery(commandsQuery, [sessionId]),
      this.allQuery(eventsQuery, [sessionId])
    ]);
    
    const timeline = [...commands, ...events]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return timeline;
  }

  async searchCommands(query, filters = {}) {
    let sql = `
      SELECT c.*, s.user_name, s.working_directory as session_dir
      FROM shell_commands c
      JOIN shell_sessions s ON c.session_id = s.id
      WHERE (c.command LIKE ? OR c.output LIKE ?)
    `;
    
    const params = [`%${query}%`, `%${query}%`];
    
    // Add filters
    if (filters.sessionId) {
      sql += ' AND c.session_id = ?';
      params.push(filters.sessionId);
    }
    
    if (filters.exitCode !== undefined) {
      sql += ' AND c.exit_code = ?';
      params.push(filters.exitCode);
    }
    
    if (filters.startDate) {
      sql += ' AND c.timestamp >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND c.timestamp <= ?';
      params.push(filters.endDate);
    }
    
    sql += ' ORDER BY c.timestamp DESC LIMIT 100';
    
    return await this.allQuery(sql, params);
  }

  async getStatistics() {
    const queries = {
      totalSessions: 'SELECT COUNT(*) as count FROM shell_sessions',
      totalCommands: 'SELECT COUNT(*) as count FROM shell_commands',
      avgCommandsPerSession: `
        SELECT AVG(command_count) as avg 
        FROM shell_sessions 
        WHERE command_count > 0
      `,
      topCommands: `
        SELECT 
          SUBSTR(command, 1, INSTR(command || ' ', ' ') - 1) as base_command,
          COUNT(*) as usage_count
        FROM shell_commands 
        WHERE command != ''
        GROUP BY base_command
        ORDER BY usage_count DESC
        LIMIT 10
      `,
      recentActivity: `
        SELECT DATE(timestamp) as date, COUNT(*) as commands
        FROM shell_commands
        WHERE timestamp >= datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `
    };
    
    const stats = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await this.allQuery(query);
        stats[key] = result;
      } catch (error) {
        logger.error(`Error fetching ${key}:`, error);
        stats[key] = [];
      }
    }
    
    return stats;
  }

  async exportSession(sessionId, format = 'json') {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    if (format === 'json') {
      return JSON.stringify(session, null, 2);
    } else if (format === 'txt') {
      let output = `Session: ${session.id}\n`;
      output += `Start: ${session.start_time}\n`;
      output += `Commands: ${session.commands.length}\n\n`;
      
      session.commands.forEach((cmd, i) => {
        output += `[${i + 1}] ${cmd.timestamp}\n`;
        output += `$ ${cmd.command}\n`;
        if (cmd.output) {
          output += `${cmd.output}\n`;
        }
        output += `Exit: ${cmd.exit_code}\n\n`;
      });
      
      return output;
    }
    
    throw new Error(`Unsupported format: ${format}`);
  }

  async loadExistingSessions() {
    logger.info('📂 Loading existing sessions...');
    
    const sessions = await this.getAllSessions();
    
    sessions.forEach(session => {
      this.sessions.set(session.id, session);
    });
    
    logger.info(`✅ Loaded ${sessions.length} sessions`);
  }

  // Database helper methods
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.localDb.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.localDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.localDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updateShellSession(sessionData) {
    // Update existing session with new data
    await this.extractShellCommands(sessionData);
  }

  cleanup() {
    this.watchers.forEach(watcher => watcher.close());
    if (this.localDb) {
      this.localDb.close();
    }
  }
}

module.exports = SessionManager;