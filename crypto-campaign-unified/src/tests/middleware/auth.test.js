/**
 * Authentication Middleware Tests
 * Tests JWT authentication, authorization, and security features
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  authMiddleware, 
  requirePermission, 
  requireRole, 
  optionalAuth, 
  generateToken, 
  verifyToken 
} from '../../middleware/auth.js';
import { DatabaseService } from '../../database/supabaseClient.js';

// Mock DatabaseService
vi.mock('../../database/supabaseClient.js');

const app = express();
app.use(express.json());

// Test routes
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Protected resource', user: req.user });
});

app.get('/admin-only', authMiddleware, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin only resource' });
});

app.get('/create-campaigns', authMiddleware, requirePermission('create_campaigns'), (req, res) => {
  res.json({ message: 'Can create campaigns' });
});

app.get('/optional-auth', optionalAuth, (req, res) => {
  res.json({ message: 'Optional auth', user: req.user });
});

describe('Authentication Middleware', () => {
  let mockDbService;
  const JWT_SECRET = 'test-secret';
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    permissions: ['read_campaigns', 'create_campaigns']
  };

  beforeAll(() => {
    // Set JWT secret for testing
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    // Mock DatabaseService methods
    mockDbService = {
      getUserById: vi.fn()
    };
    vi.mocked(DatabaseService).mockImplementation(() => mockDbService);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate valid JWT token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDbService.getUserById.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        permissions: testUser.permissions
      });
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid token format');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should reject request with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should reject request for non-existent user', async () => {
      const token = jwt.sign(
        { userId: 'non-existent-user', email: 'test@example.com', role: 'user' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDbService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('User not found');
    });

    it('should reject request for inactive user', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const inactiveUser = { ...testUser, status: 'inactive' };
      mockDbService.getUserById.mockResolvedValue(inactiveUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('Account is inactive');
    });

    it('should handle database errors gracefully', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDbService.getUserById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.message).toBe('Authentication error');
    });
  });

  describe('requireRole', () => {
    it('should allow access for correct role', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const adminUser = { ...testUser, role: 'admin' };
      mockDbService.getUserById.mockResolvedValue(adminUser);

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Admin only resource');
    });

    it('should deny access for incorrect role', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDbService.getUserById.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe("Role 'admin' required");
    });

    it('should allow admin role access to any role-protected route', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const adminUser = { ...testUser, role: 'admin' };
      mockDbService.getUserById.mockResolvedValue(adminUser);

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Admin only resource');
    });
  });

  describe('requirePermission', () => {
    it('should allow access for correct permission', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDbService.getUserById.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/create-campaigns')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Can create campaigns');
    });

    it('should deny access for missing permission', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const userWithoutPermission = {
        ...testUser,
        permissions: ['read_campaigns'] // Missing 'create_campaigns'
      };
      mockDbService.getUserById.mockResolvedValue(userWithoutPermission);

      const response = await request(app)
        .get('/create-campaigns')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe("Permission 'create_campaigns' required");
    });

    it('should allow admin role access regardless of permissions', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const adminUser = {
        ...testUser,
        role: 'admin',
        permissions: [] // No specific permissions
      };
      mockDbService.getUserById.mockResolvedValue(adminUser);

      const response = await request(app)
        .get('/create-campaigns')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Can create campaigns');
    });
  });

  describe('optionalAuth', () => {
    it('should work without authorization header', async () => {
      const response = await request(app)
        .get('/optional-auth')
        .expect(200);

      expect(response.body.user).toBeNull();
    });

    it('should authenticate valid token when provided', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDbService.getUserById.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        permissions: testUser.permissions
      });
    });

    it('should set user to null for invalid token', async () => {
      const response = await request(app)
        .get('/optional-auth')
        .set('Authorization', 'Bearer invalid.token')
        .expect(200);

      expect(response.body.user).toBeNull();
    });

    it('should set user to null for inactive user', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const inactiveUser = { ...testUser, status: 'inactive' };
      mockDbService.getUserById.mockResolvedValue(inactiveUser);

      const response = await request(app)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token content
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should include expiration time', () => {
      const token = generateToken(testUser);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should use custom expiration from environment', () => {
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '2h';

      const token = generateToken(testUser);
      const decoded = jwt.verify(token, JWT_SECRET);

      // Token should be valid for approximately 2 hours (7200 seconds)
      const expectedExp = decoded.iat + 7200;
      expect(Math.abs(decoded.exp - expectedExp)).toBeLessThanOrEqual(5);

      // Restore original environment
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      } else {
        delete process.env.JWT_EXPIRES_IN;
      }
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid.token.here');

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const result = verifyToken(expiredToken);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const result = verifyToken('not-a-jwt-token');

      expect(result).toBeNull();
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive user data in JWT', () => {
      const userWithSensitiveData = {
        ...testUser,
        password_hash: 'hashed-password',
        ssn: '123-45-6789'
      };

      const token = generateToken(userWithSensitiveData);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.password_hash).toBeUndefined();
      expect(decoded.ssn).toBeUndefined();
    });

    it('should handle token injection attempts', async () => {
      const maliciousPayload = {
        userId: testUser.id,
        role: 'admin', // Trying to escalate privileges
        permissions: ['*'] // Trying to get all permissions
      };

      const maliciousToken = jwt.sign(maliciousPayload, 'wrong-secret');

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should validate token signature', async () => {
      // Create token with wrong secret
      const wrongSecretToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should prevent timing attacks on token verification', async () => {
      const validToken = generateToken(testUser);
      const invalidToken = 'invalid.token.here';

      mockDbService.getUserById.mockResolvedValue(testUser);

      // Measure time for valid token
      const startValid = Date.now();
      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);
      const validTime = Date.now() - startValid;

      // Measure time for invalid token
      const startInvalid = Date.now();
      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`);
      const invalidTime = Date.now() - startInvalid;

      // Time difference should be minimal (within reasonable bounds)
      // This is a basic test - in practice, more sophisticated timing analysis might be needed
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(100); // 100ms tolerance
    });
  });
});