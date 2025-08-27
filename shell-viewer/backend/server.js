/**
 * Pachacuti Shell Viewer Backend
 * Express.js server with AI-powered search for shell sessions
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

const SessionManager = require('./lib/session-manager');
const ShellController = require('./lib/shell-controller');
const AISearchController = require('./lib/ai-search-controller');
const WebTerminal = require('./lib/web-terminal');
const logger = require('./lib/logger');

class PachacutiShellViewerServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3002",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3001;
    
    // Initialize components
    this.sessionManager = new SessionManager();
    this.shellController = new ShellController();
    this.aiSearchController = new AISearchController();
    this.webTerminal = new WebTerminal(this.io);
    
    // Inject dependencies
    this.aiSearchController.setSessionManager(this.sessionManager);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3002",
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Root endpoint - API documentation
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Pachacuti Shell Viewer API',
        version: '1.0.0',
        description: 'AI-powered shell session viewer and search API',
        timestamp: new Date().toISOString(),
        endpoints: {
          'GET /': 'API documentation (this endpoint)',
          'GET /api/health': 'Health check',
          'GET /api/sessions': 'List all sessions',
          'GET /api/sessions/:id': 'Get specific session',
          'GET /api/sessions/:id/commands': 'Get session commands',
          'GET /api/sessions/:id/timeline': 'Get session timeline',
          'GET /api/sessions/:id/export': 'Export session data',
          'GET /api/search?query=term': 'Search sessions, commands, and logs',
          'POST /api/search': 'Advanced search with filters',
          'POST /api/ask': 'Ask AI questions about sessions',
          'POST /api/analyze-command': 'Analyze command output',
          'GET /api/stats': 'Get session statistics'
        },
        websocket: `ws://localhost:${this.port}`,
        status: 'running'
      });
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Session routes
    this.app.get('/api/sessions', async (req, res) => {
      try {
        const sessions = await this.sessionManager.getAllSessions();
        res.json(sessions);
      } catch (error) {
        logger.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
      }
    });

    this.app.get('/api/sessions/:id', async (req, res) => {
      try {
        const session = await this.sessionManager.getSession(req.params.id);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
      } catch (error) {
        logger.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
      }
    });

    // Shell command routes
    this.app.get('/api/sessions/:id/commands', async (req, res) => {
      try {
        const commands = await this.shellController.getSessionCommands(req.params.id);
        res.json(commands);
      } catch (error) {
        logger.error('Error fetching commands:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
      }
    });

    this.app.get('/api/sessions/:id/timeline', async (req, res) => {
      try {
        const timeline = await this.shellController.getSessionTimeline(req.params.id);
        res.json(timeline);
      } catch (error) {
        logger.error('Error fetching timeline:', error);
        res.status(500).json({ error: 'Failed to fetch timeline' });
      }
    });

    // AI Search routes
    // GET version for simple query parameter searches
    this.app.get('/api/search', async (req, res) => {
      try {
        const { query, sessionIds, limit = 50, type } = req.query;
        
        if (!query) {
          return res.status(400).json({ 
            error: 'Query parameter is required',
            usage: 'GET /api/search?query=your-search-term&limit=50&type=commands'
          });
        }

        const filters = {};
        if (type) {
          filters.type = type; // commands, sessions, logs
        }
        if (limit) {
          filters.limit = parseInt(limit);
        }

        const searchOptions = {
          query,
          filters
        };

        if (sessionIds) {
          searchOptions.sessionIds = sessionIds.split(',');
        }

        const results = await this.aiSearchController.search(searchOptions);

        res.json({
          query,
          resultCount: results.length || 0,
          results,
          searchParams: searchOptions
        });
      } catch (error) {
        logger.error('GET search error:', error);
        res.status(500).json({ error: 'Search failed' });
      }
    });

    // POST version for advanced searches with complex filters
    this.app.post('/api/search', async (req, res) => {
      try {
        const { query, sessionIds, filters } = req.body;
        
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }

        const results = await this.aiSearchController.search({
          query,
          sessionIds,
          filters
        });

        res.json(results);
      } catch (error) {
        logger.error('AI search error:', error);
        res.status(500).json({ error: 'Search failed' });
      }
    });

    this.app.post('/api/ask', async (req, res) => {
      try {
        const { question, context } = req.body;
        
        if (!question) {
          return res.status(400).json({ error: 'Question is required' });
        }

        const answer = await this.aiSearchController.askQuestion({
          question,
          context
        });

        res.json({ answer });
      } catch (error) {
        logger.error('AI question error:', error);
        res.status(500).json({ error: 'Question processing failed' });
      }
    });

    // Command analysis
    this.app.post('/api/analyze-command', async (req, res) => {
      try {
        const { command, output, context } = req.body;
        
        const analysis = await this.aiSearchController.analyzeCommand({
          command,
          output,
          context
        });

        res.json(analysis);
      } catch (error) {
        logger.error('Command analysis error:', error);
        res.status(500).json({ error: 'Command analysis failed' });
      }
    });

    // Session statistics
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.sessionManager.getStatistics();
        res.json(stats);
      } catch (error) {
        logger.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
      }
    });

    // Export routes
    this.app.get('/api/sessions/:id/export', async (req, res) => {
      try {
        const format = req.query.format || 'json';
        const exported = await this.sessionManager.exportSession(req.params.id, format);
        
        res.setHeader('Content-Disposition', `attachment; filename=session-${req.params.id}.${format}`);
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/plain');
        res.send(exported);
      } catch (error) {
        logger.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
      }
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../frontend/build')));
      
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
      });
    }
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Terminal connection
      socket.on('start-terminal', async (data) => {
        try {
          await this.webTerminal.createTerminal(socket, data);
        } catch (error) {
          logger.error('Terminal creation error:', error);
          socket.emit('terminal-error', { error: error.message });
        }
      });

      // Session monitoring
      socket.on('monitor-session', (sessionId) => {
        socket.join(`session-${sessionId}`);
        logger.info(`Client ${socket.id} monitoring session ${sessionId}`);
      });

      // Real-time search
      socket.on('live-search', async (data) => {
        try {
          const results = await this.aiSearchController.liveSearch(data);
          socket.emit('search-results', results);
        } catch (error) {
          logger.error('Live search error:', error);
          socket.emit('search-error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.webTerminal.cleanup(socket);
      });
    });
  }

  async start() {
    try {
      // Initialize components
      await this.sessionManager.initialize();
      await this.aiSearchController.initialize();
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`🚀 Pachacuti Shell Viewer Server running on port ${this.port}`);
        logger.info(`📊 Dashboard: http://localhost:${this.port}`);
        logger.info(`🤖 AI Search: http://localhost:${this.port}/api/search`);
        logger.info(`💻 Web Terminal: ws://localhost:${this.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Server startup error:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down server...');
    
    this.webTerminal.cleanup();
    this.server.close(() => {
      logger.info('Server shut down successfully');
      process.exit(0);
    });
  }
}

// Start server
if (require.main === module) {
  const server = new PachacutiShellViewerServer();
  server.start();
}

module.exports = PachacutiShellViewerServer;