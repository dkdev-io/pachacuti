/**
 * Web Terminal
 * Real-time terminal interface with session recording
 */

// const pty = require('node-pty'); // Disabled for compatibility
const logger = require('./logger');

class WebTerminal {
  constructor(io) {
    this.io = io;
    this.terminals = new Map();
    this.sessionRecorder = null;
  }

  async createTerminal(socket, options = {}) {
    const terminalId = `term-${socket.id}-${Date.now()}`;
    
    logger.info(`Creating terminal ${terminalId} for socket ${socket.id}`);
    
    try {
      // Create simulated terminal (node-pty disabled for compatibility)
      const terminal = {
        cols: options.cols || 80,
        rows: options.rows || 24,
        write: (data) => {
          // Simulate terminal response
          socket.emit('terminal-output', {
            terminalId: terminalId,
            data: `Simulated terminal response: ${data}`
          });
        },
        on: (event, callback) => {
          // Simulate terminal events
          if (event === 'data') {
            setTimeout(() => callback('Welcome to simulated terminal\r\n'), 100);
          }
        }
      };
      
      // Terminal session data
      const terminalSession = {
        id: terminalId,
        socket: socket,
        pty: terminal,
        startTime: new Date(),
        commands: [],
        currentCommand: '',
        commandBuffer: '',
        options: options
      };
      
      // Store terminal
      this.terminals.set(terminalId, terminalSession);
      
      // Set up event handlers
      this.setupTerminalHandlers(terminalSession);
      
      // Send terminal ID to client
      socket.emit('terminal-created', {
        terminalId: terminalId,
        cols: terminal.cols,
        rows: terminal.rows
      });
      
      return terminalId;
      
    } catch (error) {
      logger.error(`Failed to create terminal: ${error}`);
      throw error;
    }
  }

  setupTerminalHandlers(terminalSession) {
    const { socket, pty: terminal } = terminalSession;
    
    // Handle data from PTY (send to client)
    terminal.on('data', (data) => {
      socket.emit('terminal-output', {
        terminalId: terminalSession.id,
        data: data
      });
      
      // Record output
      this.recordTerminalActivity(terminalSession, 'output', data);
    });
    
    // Handle PTY exit
    terminal.on('exit', (code, signal) => {
      logger.info(`Terminal ${terminalSession.id} exited with code ${code}`);
      
      socket.emit('terminal-exit', {
        terminalId: terminalSession.id,
        exitCode: code,
        signal: signal
      });
      
      this.recordTerminalActivity(terminalSession, 'exit', { code, signal });
      this.closeTerminal(terminalSession.id);
    });
    
    // Handle input from client
    socket.on('terminal-input', (data) => {
      if (data.terminalId === terminalSession.id) {
        terminal.write(data.input);
        this.recordTerminalActivity(terminalSession, 'input', data.input);
        
        // Track commands
        this.trackCommand(terminalSession, data.input);
      }
    });
    
    // Handle terminal resize
    socket.on('terminal-resize', (data) => {
      if (data.terminalId === terminalSession.id) {
        terminal.resize(data.cols, data.rows);
        this.recordTerminalActivity(terminalSession, 'resize', { cols: data.cols, rows: data.rows });
      }
    });
    
    // Handle terminal close
    socket.on('terminal-close', (data) => {
      if (data.terminalId === terminalSession.id) {
        this.closeTerminal(terminalSession.id);
      }
    });
  }

  trackCommand(terminalSession, input) {
    // Simple command tracking (can be enhanced)
    terminalSession.commandBuffer += input;
    
    // Check for command completion (Enter key)
    if (input.includes('\r') || input.includes('\n')) {
      const command = terminalSession.commandBuffer.trim().replace(/\r?\n/g, '');
      
      if (command && !command.startsWith('\x1b')) { // Ignore escape sequences
        terminalSession.commands.push({
          timestamp: new Date().toISOString(),
          command: command,
          sequence: terminalSession.commands.length
        });
        
        logger.info(`Command executed in ${terminalSession.id}: ${command}`);
      }
      
      terminalSession.commandBuffer = '';
    }
  }

  recordTerminalActivity(terminalSession, type, data) {
    const activity = {
      terminalId: terminalSession.id,
      timestamp: new Date().toISOString(),
      type: type,
      data: data
    };
    
    // Emit to session monitoring
    this.io.to(`session-${terminalSession.id}`).emit('terminal-activity', activity);
    
    // Could integrate with session recorder here
    if (this.sessionRecorder) {
      this.sessionRecorder.recordTerminalActivity(activity);
    }
  }

  closeTerminal(terminalId) {
    const terminalSession = this.terminals.get(terminalId);
    
    if (terminalSession) {
      try {
        terminalSession.pty.kill();
      } catch (error) {
        logger.warn(`Error killing terminal ${terminalId}:`, error);
      }
      
      // Record session summary
      const summary = {
        terminalId: terminalId,
        startTime: terminalSession.startTime,
        endTime: new Date(),
        duration: Date.now() - terminalSession.startTime.getTime(),
        commandCount: terminalSession.commands.length,
        commands: terminalSession.commands
      };
      
      logger.info(`Terminal session summary:`, summary);
      
      this.terminals.delete(terminalId);
    }
  }

  getTerminal(terminalId) {
    return this.terminals.get(terminalId);
  }

  getActiveTerminals() {
    return Array.from(this.terminals.values()).map(session => ({
      id: session.id,
      startTime: session.startTime,
      commandCount: session.commands.length,
      socketId: session.socket.id
    }));
  }

  cleanup(socket) {
    // Clean up terminals for disconnected socket
    const terminalsToClose = [];
    
    for (const [terminalId, session] of this.terminals) {
      if (session.socket === socket) {
        terminalsToClose.push(terminalId);
      }
    }
    
    terminalsToClose.forEach(terminalId => {
      this.closeTerminal(terminalId);
    });
    
    logger.info(`Cleaned up ${terminalsToClose.length} terminals for socket ${socket.id}`);
  }

  // Set session recorder for integration
  setSessionRecorder(recorder) {
    this.sessionRecorder = recorder;
  }
}

module.exports = WebTerminal;