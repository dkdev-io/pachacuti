/**
 * Socket Service
 * Handles WebSocket connections for real-time features
 */

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return;
    }

    console.log('Connecting to socket server...');
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set up default event handlers
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    // Terminal events
    this.socket.on('terminal-created', (data) => {
      this.emit('terminal-created', data);
    });

    this.socket.on('terminal-output', (data) => {
      this.emit('terminal-output', data);
    });

    this.socket.on('terminal-exit', (data) => {
      this.emit('terminal-exit', data);
    });

    // Session events
    this.socket.on('sessionProcessed', (data) => {
      this.emit('sessionProcessed', data);
    });

    this.socket.on('terminal-activity', (data) => {
      this.emit('terminal-activity', data);
    });

    // Search events
    this.socket.on('search-results', (data) => {
      this.emit('search-results', data);
    });

    this.socket.on('search-error', (data) => {
      this.emit('search-error', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Terminal methods
  startTerminal(options = {}) {
    if (this.socket?.connected) {
      this.socket.emit('start-terminal', options);
    }
  }

  sendTerminalInput(terminalId, input) {
    if (this.socket?.connected) {
      this.socket.emit('terminal-input', { terminalId, input });
    }
  }

  resizeTerminal(terminalId, cols, rows) {
    if (this.socket?.connected) {
      this.socket.emit('terminal-resize', { terminalId, cols, rows });
    }
  }

  closeTerminal(terminalId) {
    if (this.socket?.connected) {
      this.socket.emit('terminal-close', { terminalId });
    }
  }

  // Session monitoring
  monitorSession(sessionId) {
    if (this.socket?.connected) {
      this.socket.emit('monitor-session', sessionId);
    }
  }

  // Live search
  liveSearch(query, filters = {}) {
    if (this.socket?.connected) {
      this.socket.emit('live-search', { query, filters });
    }
  }

  // Connection status
  isConnected() {
    return this.socket?.connected || false;
  }

  getId() {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();