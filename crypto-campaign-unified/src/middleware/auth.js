/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */

import jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/supabaseClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const dbService = new DatabaseService();

/**
 * Middleware to authenticate JWT tokens
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if user exists in database
    const user = await dbService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive'
      });
    }

    // Add user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication error'
    });
  }
}

/**
 * Middleware to check specific permissions
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!req.user.permissions.includes(permission) && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
}

/**
 * Middleware to check user role
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' required`
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await dbService.getUserById(decoded.userId);
      
      if (user && user.status === 'active') {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || []
        };
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }
  );
}

/**
 * Verify and decode JWT token without middleware
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}