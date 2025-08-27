/**
 * Express Server for Crypto Campaign API
 * Provides REST API endpoints for campaign management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { campaignRoutes } from '../api/campaigns.js';
import { contributionRoutes } from '../api/contributions.js';
import { userRoutes } from '../api/users.js';
import { analyticsRoutes } from '../api/analytics.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/contributions', authMiddleware, contributionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

let server;

export function startServer() {
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`Server running on port ${PORT}`);
      resolve(server);
    });
  });
}

export function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export default app;