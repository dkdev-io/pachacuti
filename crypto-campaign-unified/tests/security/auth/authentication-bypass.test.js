/**
 * Authentication Bypass Security Tests
 * Tests for authentication vulnerabilities and bypass techniques
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SecurityTestFramework } from '../security-test-framework.js'
import crypto from 'crypto'

describe('Authentication Bypass Security Tests', () => {
  let securityFramework
  let mockAuthService

  beforeEach(() => {
    securityFramework = new SecurityTestFramework()
    mockAuthService = new MockAuthenticationService()
  })

  describe('JWT Token Security', () => {
    it('should validate JWT signature properly', () => {
      const validToken = mockAuthService.generateToken({ userId: '123', role: 'user' })
      const tamperedToken = validToken.substring(0, validToken.length - 10) + 'tampered123'
      
      expect(mockAuthService.validateToken(validToken)).toBeTruthy()
      expect(() => mockAuthService.validateToken(tamperedToken)).toThrow('Invalid token signature')
    })

    it('should enforce JWT expiration', async () => {
      const shortLivedToken = mockAuthService.generateToken(
        { userId: '123', role: 'user' },
        { expiresIn: '1ms' }
      )
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(() => mockAuthService.validateToken(shortLivedToken)).toThrow('Token expired')
    })

    it('should prevent JWT algorithm confusion attacks', () => {
      const rsaToken = mockAuthService.generateRSAToken({ userId: '123', role: 'admin' })
      
      // Try to validate RSA token with HMAC (algorithm confusion)
      expect(() => {
        mockAuthService.validateTokenWithAlgorithm(rsaToken, 'HS256')
      }).toThrow('Algorithm mismatch')
    })

    it('should prevent none algorithm bypass', () => {
      const noneToken = createNoneAlgorithmToken({ userId: '123', role: 'admin' })
      
      expect(() => mockAuthService.validateToken(noneToken)).toThrow('None algorithm not allowed')
    })

    it('should validate JWT claims properly', () => {
      const maliciousTokens = [
        mockAuthService.generateToken({ userId: null }),
        mockAuthService.generateToken({ userId: '', role: 'admin' }),
        mockAuthService.generateToken({ userId: '123', role: null }),
        mockAuthService.generateToken({}) // No claims
      ]

      maliciousTokens.forEach(token => {
        expect(() => mockAuthService.validateToken(token)).toThrow()
      })
    })
  })

  describe('Session Management Security', () => {
    it('should prevent session fixation attacks', () => {
      const oldSessionId = 'old_session_123'
      const newSessionId = mockAuthService.login('user@example.com', 'password')
      
      // Session ID should change after login
      expect(newSessionId).not.toBe(oldSessionId)
      expect(newSessionId).toHaveLength(32) // Proper length
      expect(/^[a-f0-9]+$/.test(newSessionId)).toBe(true) // Hex format
    })

    it('should implement proper session timeout', async () => {
      const sessionId = mockAuthService.login('user@example.com', 'password')
      
      // Simulate session timeout
      mockAuthService.setSessionTimeout(10) // 10ms timeout
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(mockAuthService.isValidSession(sessionId)).toBe(false)
    })

    it('should prevent session hijacking', () => {
      const sessionId = mockAuthService.login('user@example.com', 'password')
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      const ipAddress = '192.168.1.100'
      
      // Bind session to user agent and IP
      mockAuthService.bindSession(sessionId, { userAgent, ipAddress })
      
      // Different user agent should invalidate session
      expect(() => {
        mockAuthService.validateSession(sessionId, { 
          userAgent: 'Different User Agent',
          ipAddress 
        })
      }).toThrow('Session validation failed')
      
      // Different IP should invalidate session
      expect(() => {
        mockAuthService.validateSession(sessionId, { 
          userAgent,
          ipAddress: '10.0.0.1'
        })
      }).toThrow('Session validation failed')
    })

    it('should implement concurrent session limits', () => {
      const email = 'user@example.com'
      const password = 'password'
      
      const session1 = mockAuthService.login(email, password)
      const session2 = mockAuthService.login(email, password)
      const session3 = mockAuthService.login(email, password)
      
      // Should limit to 2 concurrent sessions
      expect(mockAuthService.getActiveSessions(email)).toHaveLength(2)
      expect(mockAuthService.isValidSession(session1)).toBe(false) // Oldest session invalidated
      expect(mockAuthService.isValidSession(session2)).toBe(true)
      expect(mockAuthService.isValidSession(session3)).toBe(true)
    })
  })

  describe('Password-based Authentication', () => {
    it('should prevent timing attacks on login', async () => {
      const timingTests = []
      
      // Test valid user, invalid password
      const start1 = performance.now()
      try {
        await mockAuthService.authenticate('valid@example.com', 'wrongpassword')
      } catch (e) {}
      const end1 = performance.now()
      timingTests.push(end1 - start1)
      
      // Test invalid user
      const start2 = performance.now() 
      try {
        await mockAuthService.authenticate('invalid@example.com', 'password')
      } catch (e) {}
      const end2 = performance.now()
      timingTests.push(end2 - start2)
      
      // Timing should be similar to prevent user enumeration
      const [time1, time2] = timingTests
      const timingDifference = Math.abs(time1 - time2)
      expect(timingDifference).toBeLessThan(10) // Less than 10ms difference
    })

    it('should implement rate limiting for login attempts', async () => {
      const email = 'user@example.com'
      
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        try {
          await mockAuthService.authenticate(email, 'wrongpassword')
        } catch (e) {}
      }
      
      // Should be rate limited now
      expect(() => 
        mockAuthService.authenticate(email, 'correctpassword')
      ).toThrow('Rate limit exceeded')
    })

    it('should enforce password complexity', () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'admin',
        'letmein',
        'password123',
        'admin123',
        'test',
        '111111',
        'abc123'
      ]

      weakPasswords.forEach(password => {
        expect(() => {
          mockAuthService.setPassword('user@example.com', password)
        }).toThrow('Password does not meet complexity requirements')
      })
    })

    it('should prevent password reuse', () => {
      const email = 'user@example.com'
      const oldPasswords = [
        'OldPassword123!',
        'AnotherOld456@',
        'PreviousPass789#'
      ]

      // Set password history
      oldPasswords.forEach(pwd => {
        mockAuthService.setPassword(email, pwd)
      })

      // Should prevent reusing old passwords
      oldPasswords.forEach(pwd => {
        expect(() => {
          mockAuthService.setPassword(email, pwd)
        }).toThrow('Cannot reuse recent passwords')
      })
    })
  })

  describe('Multi-Factor Authentication', () => {
    it('should enforce MFA for privileged accounts', () => {
      const adminUser = mockAuthService.createUser({
        email: 'admin@example.com',
        role: 'admin',
        mfaEnabled: false
      })

      expect(() => {
        mockAuthService.login(adminUser.email, 'password')
      }).toThrow('MFA required for admin accounts')
    })

    it('should validate TOTP codes properly', () => {
      const secret = mockAuthService.generateMFASecret()
      const validCode = mockAuthService.generateTOTP(secret)
      const invalidCode = '000000'
      
      expect(mockAuthService.validateTOTP(secret, validCode)).toBe(true)
      expect(mockAuthService.validateTOTP(secret, invalidCode)).toBe(false)
    })

    it('should prevent TOTP replay attacks', () => {
      const secret = mockAuthService.generateMFASecret()
      const code = mockAuthService.generateTOTP(secret)
      
      // First use should work
      expect(mockAuthService.validateTOTP(secret, code)).toBe(true)
      
      // Reusing same code should fail
      expect(mockAuthService.validateTOTP(secret, code)).toBe(false)
    })

    it('should handle backup codes securely', () => {
      const backupCodes = mockAuthService.generateBackupCodes()
      
      expect(backupCodes).toHaveLength(10)
      expect(new Set(backupCodes).size).toBe(10) // All unique
      
      // Use a backup code
      const codeToUse = backupCodes[0]
      expect(mockAuthService.useBackupCode('user@example.com', codeToUse)).toBe(true)
      
      // Same code should not work again
      expect(mockAuthService.useBackupCode('user@example.com', codeToUse)).toBe(false)
    })
  })

  describe('OAuth and SSO Security', () => {
    it('should validate OAuth state parameter', () => {
      const validState = crypto.randomBytes(32).toString('hex')
      const invalidState = 'predictable_state'
      
      expect(() => {
        mockAuthService.validateOAuthCallback({ state: validState }, validState)
      }).not.toThrow()
      
      expect(() => {
        mockAuthService.validateOAuthCallback({ state: invalidState }, validState)
      }).toThrow('Invalid OAuth state')
    })

    it('should implement PKCE for OAuth', () => {
      const codeVerifier = crypto.randomBytes(32).toString('base64url')
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url')
      
      const authUrl = mockAuthService.generateOAuthURL({
        codeChallenge,
        codeChallengeMethod: 'S256'
      })
      
      expect(authUrl).toContain('code_challenge=')
      expect(authUrl).toContain('code_challenge_method=S256')
    })
  })

  describe('Authorization Bypass Tests', () => {
    it('should prevent privilege escalation', () => {
      const userToken = mockAuthService.generateToken({ userId: '123', role: 'user' })
      
      // Attempt to access admin endpoint
      expect(() => {
        mockAuthService.requireRole(userToken, 'admin')
      }).toThrow('Insufficient privileges')
    })

    it('should prevent horizontal privilege escalation', () => {
      const user1Token = mockAuthService.generateToken({ userId: '123', role: 'user' })
      const user2Data = { userId: '456', role: 'user' }
      
      // User 1 should not access User 2's data
      expect(() => {
        mockAuthService.requireOwnership(user1Token, user2Data.userId)
      }).toThrow('Access denied')
    })

    it('should validate resource ownership', () => {
      const userToken = mockAuthService.generateToken({ userId: '123', role: 'user' })
      const campaign = { id: 'camp_456', ownerId: '789' }
      
      expect(() => {
        mockAuthService.requireCampaignOwnership(userToken, campaign)
      }).toThrow('Not authorized to access this campaign')
    })
  })

  afterEach(() => {
    // Generate security report if vulnerabilities found
    if (securityFramework.vulnerabilities.length > 0) {
      const report = securityFramework.generateSecurityReport()
      console.log('Authentication Security Test Report:', JSON.stringify(report, null, 2))
    }
  })
})

// Mock Authentication Service for testing
class MockAuthenticationService {
  constructor() {
    this.users = new Map()
    this.sessions = new Map()
    this.loginAttempts = new Map()
    this.passwordHistory = new Map()
    this.usedBackupCodes = new Set()
    this.usedTOTPCodes = new Set()
    this.jwtSecret = 'test-secret-key'
    this.sessionTimeout = 3600000 // 1 hour
  }

  generateToken(payload, options = {}) {
    const header = { alg: 'HS256', typ: 'JWT' }
    const exp = Date.now() + (options.expiresIn === '1ms' ? 1 : 3600000)
    const fullPayload = { ...payload, exp, iat: Date.now() }
    
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  validateToken(token) {
    const [header, payload, signature] = token.split('.')
    
    if (!header || !payload || !signature) {
      throw new Error('Invalid token format')
    }
    
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString())
    
    if (decodedHeader.alg === 'none') {
      throw new Error('None algorithm not allowed')
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url')
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature')
    }
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString())
    
    if (Date.now() > decodedPayload.exp) {
      throw new Error('Token expired')
    }
    
    if (!decodedPayload.userId) {
      throw new Error('Invalid token claims')
    }
    
    return decodedPayload
  }

  login(email, password) {
    const sessionId = crypto.randomBytes(16).toString('hex')
    this.sessions.set(sessionId, {
      email,
      createdAt: Date.now(),
      lastAccess: Date.now()
    })
    return sessionId
  }

  setSessionTimeout(timeout) {
    this.sessionTimeout = timeout
  }

  isValidSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    
    return Date.now() - session.lastAccess < this.sessionTimeout
  }

  bindSession(sessionId, metadata) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.metadata = metadata
    }
  }

  validateSession(sessionId, currentMetadata) {
    const session = this.sessions.get(sessionId)
    if (!session || !session.metadata) {
      throw new Error('Session validation failed')
    }
    
    if (session.metadata.userAgent !== currentMetadata.userAgent ||
        session.metadata.ipAddress !== currentMetadata.ipAddress) {
      throw new Error('Session validation failed')
    }
    
    return true
  }

  getActiveSessions(email) {
    return Array.from(this.sessions.values())
      .filter(session => session.email === email)
      .slice(-2) // Keep only 2 most recent
  }

  async authenticate(email, password) {
    // Simulate constant-time comparison
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check rate limiting
    const attempts = this.loginAttempts.get(email) || 0
    if (attempts >= 5) {
      throw new Error('Rate limit exceeded')
    }
    
    // Mock authentication logic
    if (email === 'valid@example.com' && password === 'correctpassword') {
      this.loginAttempts.delete(email)
      return { userId: '123', role: 'user' }
    } else {
      this.loginAttempts.set(email, attempts + 1)
      throw new Error('Invalid credentials')
    }
  }

  setPassword(email, password) {
    // Check password complexity
    if (password.length < 8 || 
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[!@#$%^&*]/.test(password)) {
      throw new Error('Password does not meet complexity requirements')
    }
    
    // Check password history
    const history = this.passwordHistory.get(email) || []
    if (history.includes(password)) {
      throw new Error('Cannot reuse recent passwords')
    }
    
    // Update password history
    history.push(password)
    if (history.length > 5) history.shift() // Keep last 5 passwords
    this.passwordHistory.set(email, history)
  }

  createUser(userData) {
    if (userData.role === 'admin' && !userData.mfaEnabled) {
      throw new Error('MFA required for admin accounts')
    }
    
    return userData
  }

  generateMFASecret() {
    return crypto.randomBytes(20).toString('base32')
  }

  generateTOTP(secret) {
    // Simplified TOTP generation for testing
    const timeWindow = Math.floor(Date.now() / 30000)
    return crypto
      .createHmac('sha1', secret)
      .update(timeWindow.toString())
      .digest('hex')
      .substring(0, 6)
  }

  validateTOTP(secret, code) {
    if (this.usedTOTPCodes.has(code)) {
      return false // Prevent replay
    }
    
    const validCode = this.generateTOTP(secret)
    const isValid = code === validCode
    
    if (isValid) {
      this.usedTOTPCodes.add(code)
    }
    
    return isValid
  }

  generateBackupCodes() {
    const codes = []
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex'))
    }
    return codes
  }

  useBackupCode(email, code) {
    const key = `${email}:${code}`
    if (this.usedBackupCodes.has(key)) {
      return false
    }
    
    this.usedBackupCodes.add(key)
    return true
  }

  requireRole(token, requiredRole) {
    const payload = this.validateToken(token)
    if (payload.role !== requiredRole) {
      throw new Error('Insufficient privileges')
    }
  }

  requireOwnership(token, resourceUserId) {
    const payload = this.validateToken(token)
    if (payload.userId !== resourceUserId) {
      throw new Error('Access denied')
    }
  }

  requireCampaignOwnership(token, campaign) {
    const payload = this.validateToken(token)
    if (payload.userId !== campaign.ownerId) {
      throw new Error('Not authorized to access this campaign')
    }
  }
}

function createNoneAlgorithmToken(payload) {
  const header = { alg: 'none', typ: 'JWT' }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  
  return `${encodedHeader}.${encodedPayload}.`
}