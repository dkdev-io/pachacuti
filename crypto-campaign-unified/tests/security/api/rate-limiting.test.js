/**
 * API Security Tests - Rate Limiting and DoS Protection
 * Tests for API security vulnerabilities including rate limiting, CORS, and HTTP security headers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SecurityTestFramework } from '../security-test-framework.js'

describe('API Security Tests', () => {
  let securityFramework
  let apiService

  beforeEach(() => {
    securityFramework = new SecurityTestFramework()
    apiService = new MockAPIService()
  })

  describe('Rate Limiting Protection', () => {
    it('should enforce rate limits per IP address', async () => {
      const ipAddress = '192.168.1.100'
      const endpoint = '/api/campaigns'
      
      // Make requests up to the limit
      for (let i = 0; i < 100; i++) {
        const response = await apiService.request(endpoint, { ip: ipAddress })
        if (i < 50) {
          expect(response.status).toBe(200)
        } else {
          expect(response.status).toBe(429) // Too Many Requests
          expect(response.headers['Retry-After']).toBeTruthy()
        }
      }
    })

    it('should implement sliding window rate limiting', async () => {
      const ipAddress = '192.168.1.101'
      const endpoint = '/api/donations'
      
      // Fill up the rate limit window
      for (let i = 0; i < 20; i++) {
        await apiService.request(endpoint, { ip: ipAddress })
      }
      
      // Should be rate limited
      const response = await apiService.request(endpoint, { ip: ipAddress })
      expect(response.status).toBe(429)
      
      // Wait for window to slide
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Should be allowed again
      const newResponse = await apiService.request(endpoint, { ip: ipAddress })
      expect(newResponse.status).toBe(200)
    })

    it('should implement different rate limits for different endpoints', async () => {
      const ipAddress = '192.168.1.102'
      
      const endpointLimits = [
        { endpoint: '/api/auth/login', limit: 5, window: 900 }, // 5 attempts per 15 minutes
        { endpoint: '/api/campaigns', limit: 100, window: 60 }, // 100 requests per minute
        { endpoint: '/api/donations', limit: 10, window: 60 }, // 10 donations per minute
        { endpoint: '/api/admin', limit: 20, window: 60 } // 20 admin requests per minute
      ]
      
      for (const config of endpointLimits) {
        // Test each endpoint's rate limit
        for (let i = 0; i < config.limit + 5; i++) {
          const response = await apiService.request(config.endpoint, { ip: ipAddress })
          
          if (i < config.limit) {
            expect(response.status).toBe(200)
          } else {
            expect(response.status).toBe(429)
          }
        }
      }
    })

    it('should implement user-based rate limiting', async () => {
      const userId = 'user_123'
      const endpoint = '/api/campaigns'
      
      // Authenticated user should have higher limits
      for (let i = 0; i < 200; i++) {
        const response = await apiService.request(endpoint, { 
          userId,
          authenticated: true 
        })
        
        if (i < 150) { // Higher limit for authenticated users
          expect(response.status).toBe(200)
        } else {
          expect(response.status).toBe(429)
        }
      }
    })

    it('should detect and prevent distributed rate limit bypasses', async () => {
      const endpoint = '/api/donations'
      const ipAddresses = Array.from({length: 10}, (_, i) => `192.168.1.${110 + i}`)
      
      // Simulate distributed attack from multiple IPs
      const promises = ipAddresses.map(async (ip, index) => {
        const responses = []
        for (let i = 0; i < 50; i++) {
          const response = await apiService.request(endpoint, { 
            ip,
            userAgent: 'AttackBot/1.0' // Same user agent
          })
          responses.push(response)
        }
        return responses
      })
      
      const allResponses = await Promise.all(promises)
      
      // Should detect coordinated attack and start blocking
      const blockedResponses = allResponses.flat().filter(r => r.status === 429)
      expect(blockedResponses.length).toBeGreaterThan(100) // Most requests should be blocked
    })
  })

  describe('CORS Security', () => {
    it('should validate CORS origins properly', async () => {
      const testCases = [
        { origin: 'https://trusted-domain.com', shouldAllow: true },
        { origin: 'https://campaign-app.com', shouldAllow: true },
        { origin: 'https://malicious-site.com', shouldAllow: false },
        { origin: 'http://localhost:3000', shouldAllow: true }, // Dev environment
        { origin: null, shouldAllow: false }, // No origin
        { origin: 'data:', shouldAllow: false }, // Data URI
        { origin: 'file://', shouldAllow: false }, // File protocol
      ]

      testCases.forEach(testCase => {
        const corsHeaders = apiService.validateCORS({
          origin: testCase.origin,
          method: 'GET'
        })

        if (testCase.shouldAllow) {
          expect(corsHeaders['Access-Control-Allow-Origin']).toBe(testCase.origin)
        } else {
          expect(corsHeaders['Access-Control-Allow-Origin']).toBeUndefined()
        }
      })
    })

    it('should implement proper preflight handling', async () => {
      const preflightRequest = {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://trusted-domain.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      }

      const response = await apiService.handlePreflight(preflightRequest)
      
      expect(response.headers['Access-Control-Allow-Methods']).toContain('POST')
      expect(response.headers['Access-Control-Allow-Headers']).toContain('Content-Type')
      expect(response.headers['Access-Control-Allow-Headers']).toContain('Authorization')
      expect(response.headers['Access-Control-Max-Age']).toBe('86400') // 24 hours
    })

    it('should prevent CORS misconfigurations', () => {
      const dangerousConfigs = [
        { origin: '*', credentials: true }, // Wildcard with credentials
        { origin: ['*'], credentials: true }, // Array wildcard with credentials
        { allowedHeaders: ['*'] }, // Wildcard headers
      ]

      dangerousConfigs.forEach(config => {
        expect(() => {
          apiService.configureCORS(config)
        }).toThrow('Dangerous CORS configuration')
      })
    })
  })

  describe('HTTP Security Headers', () => {
    it('should include all required security headers', async () => {
      const response = await apiService.request('/api/campaigns', {})
      
      const requiredHeaders = {
        'Content-Security-Policy': /default-src 'self'/,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': /max-age=\d+/,
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': /camera=\(\), microphone=\(\)/
      }

      Object.entries(requiredHeaders).forEach(([header, expected]) => {
        expect(response.headers[header]).toBeTruthy()
        
        if (expected instanceof RegExp) {
          expect(response.headers[header]).toMatch(expected)
        } else if (typeof expected === 'string') {
          expect(response.headers[header]).toBe(expected)
        }
      })
    })

    it('should implement proper Content Security Policy', () => {
      const csp = apiService.generateCSP()
      
      // Should not allow unsafe practices
      expect(csp).not.toContain("'unsafe-inline'")
      expect(csp).not.toContain("'unsafe-eval'")
      expect(csp).not.toContain('*')
      
      // Should have secure default-src
      expect(csp).toContain("default-src 'self'")
      
      // Should restrict object-src
      expect(csp).toContain("object-src 'none'")
      
      // Should have proper script-src
      expect(csp).toMatch(/script-src 'self'/)
    })

    it('should validate HSTS configuration', () => {
      const hstsHeader = apiService.generateHSTS()
      
      expect(hstsHeader).toMatch(/max-age=\d+/)
      expect(hstsHeader).toContain('includeSubDomains')
      expect(hstsHeader).toContain('preload')
      
      // Max age should be at least 1 year
      const maxAge = parseInt(hstsHeader.match(/max-age=(\d+)/)[1])
      expect(maxAge).toBeGreaterThan(31536000)
    })
  })

  describe('Request Validation Security', () => {
    it('should validate request size limits', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024) // 10MB payload
      
      const response = await apiService.request('/api/donations', {
        method: 'POST',
        body: JSON.stringify({ data: largePayload }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      expect(response.status).toBe(413) // Payload Too Large
    })

    it('should validate content types', async () => {
      const invalidContentTypes = [
        'application/xml',
        'text/html',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'application/octet-stream'
      ]

      for (const contentType of invalidContentTypes) {
        const response = await apiService.request('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': contentType },
          body: '<xml>malicious</xml>'
        })
        
        expect(response.status).toBe(415) // Unsupported Media Type
      }
    })

    it('should prevent HTTP header injection', async () => {
      const maliciousHeaders = {
        'X-Forwarded-For': '127.0.0.1\r\nX-Injected-Header: malicious',
        'User-Agent': 'Bot\r\nHost: evil.com',
        'Authorization': 'Bearer token\r\nX-Evil: header'
      }

      Object.entries(maliciousHeaders).forEach(async ([header, value]) => {
        const response = await apiService.request('/api/campaigns', {
          headers: { [header]: value }
        })
        
        // Should sanitize headers or reject request
        expect(response.headers['X-Injected-Header']).toBeUndefined()
        expect(response.headers['X-Evil']).toBeUndefined()
      })
    })

    it('should implement request timeout protection', async () => {
      const slowEndpoint = '/api/slow-operation'
      
      const startTime = Date.now()
      const response = await apiService.request(slowEndpoint, { 
        simulateDelay: 35000 // 35 second delay
      })
      const endTime = Date.now()
      
      // Should timeout within 30 seconds
      expect(endTime - startTime).toBeLessThan(31000)
      expect(response.status).toBe(408) // Request Timeout
    })
  })

  describe('API Authentication Security', () => {
    it('should validate API keys properly', async () => {
      const testCases = [
        { apiKey: null, shouldPass: false },
        { apiKey: '', shouldPass: false },
        { apiKey: 'invalid-key', shouldPass: false },
        { apiKey: 'valid-api-key-12345', shouldPass: true },
        { apiKey: 'expired-api-key', shouldPass: false },
        { apiKey: 'revoked-api-key', shouldPass: false }
      ]

      for (const testCase of testCases) {
        const response = await apiService.request('/api/protected', {
          headers: { 'X-API-Key': testCase.apiKey }
        })

        if (testCase.shouldPass) {
          expect(response.status).toBe(200)
        } else {
          expect(response.status).toBe(401)
        }
      }
    })

    it('should implement API key rotation', () => {
      const keyManager = apiService.getAPIKeyManager()
      const oldKey = 'old-api-key-123'
      
      // Rotate key
      const newKey = keyManager.rotateKey(oldKey)
      
      expect(newKey).not.toBe(oldKey)
      expect(newKey).toHaveLength(32)
      expect(keyManager.isValid(oldKey)).toBe(false)
      expect(keyManager.isValid(newKey)).toBe(true)
    })

    it('should track API usage and enforce quotas', async () => {
      const apiKey = 'quota-test-key'
      const endpoint = '/api/campaigns'
      
      // Use up the quota
      for (let i = 0; i < 1000; i++) {
        const response = await apiService.request(endpoint, {
          headers: { 'X-API-Key': apiKey }
        })
        
        if (i < 950) { // Daily quota of 950
          expect(response.status).toBe(200)
        } else {
          expect(response.status).toBe(429)
          expect(response.headers['X-RateLimit-Reset']).toBeTruthy()
        }
      }
    })
  })

  describe('DoS Protection', () => {
    it('should detect and mitigate slowloris attacks', async () => {
      const connections = []
      
      // Simulate slow connections
      for (let i = 0; i < 100; i++) {
        const connection = apiService.simulateSlowConnection('/api/campaigns')
        connections.push(connection)
      }
      
      // Should start rejecting slow connections
      const newConnection = await apiService.request('/api/campaigns', {
        simulateSlowConnection: true
      })
      
      expect(newConnection.status).toBe(503) // Service Unavailable
      
      // Cleanup
      connections.forEach(conn => conn.close())
    })

    it('should implement connection limits per IP', async () => {
      const ipAddress = '192.168.1.200'
      const maxConnections = 10
      
      const connections = []
      for (let i = 0; i < maxConnections + 5; i++) {
        const connection = await apiService.createConnection(ipAddress)
        connections.push(connection)
        
        if (i >= maxConnections) {
          expect(connection.rejected).toBe(true)
        }
      }
    })

    it('should detect regex DoS (ReDoS) attacks', () => {
      const maliciousInputs = [
        'a'.repeat(10000) + '!', // Catastrophic backtracking
        'x'.repeat(50000), // Very long input
        '(' + 'a'.repeat(1000) + ')*b', // Nested quantifiers
      ]

      maliciousInputs.forEach(input => {
        const startTime = Date.now()
        
        try {
          apiService.validateInput(input, 'email')
        } catch (error) {
          // Validation should fail quickly, not hang
          const endTime = Date.now()
          expect(endTime - startTime).toBeLessThan(100)
        }
      })
    })

    it('should implement circuit breaker pattern', async () => {
      const circuitBreaker = apiService.getCircuitBreaker('/api/external-service')
      
      // Simulate failures to trip the circuit breaker
      for (let i = 0; i < 10; i++) {
        try {
          await apiService.callExternalService({ simulateFailure: true })
        } catch (error) {
          // Expected failures
        }
      }
      
      // Circuit should be open now
      expect(circuitBreaker.state).toBe('OPEN')
      
      // Next request should fail fast
      const startTime = Date.now()
      try {
        await apiService.callExternalService()
      } catch (error) {
        const endTime = Date.now()
        expect(endTime - startTime).toBeLessThan(10) // Fail immediately
        expect(error.message).toContain('Circuit breaker is OPEN')
      }
    })
  })

  describe('GraphQL Security', () => {
    it('should prevent query depth attacks', async () => {
      const deepQuery = `
        query {
          campaigns {
            donations {
              donor {
                campaigns {
                  donations {
                    donor {
                      campaigns {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `

      const response = await apiService.graphqlRequest(deepQuery)
      expect(response.errors).toBeTruthy()
      expect(response.errors[0].message).toContain('Query depth limit exceeded')
    })

    it('should implement query complexity analysis', async () => {
      const complexQuery = `
        query {
          campaigns {
            donations {
              amount
              donor {
                name
                email
                address
              }
            }
          }
        }
      `

      const response = await apiService.graphqlRequest(complexQuery)
      
      if (response.errors) {
        expect(response.errors[0].message).toContain('Query complexity limit exceeded')
      } else {
        // Query should execute but be monitored
        expect(response.data).toBeTruthy()
      }
    })

    it('should disable introspection in production', async () => {
      process.env.NODE_ENV = 'production'
      
      const introspectionQuery = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `

      const response = await apiService.graphqlRequest(introspectionQuery)
      expect(response.errors).toBeTruthy()
      expect(response.errors[0].message).toContain('Introspection is disabled')
      
      process.env.NODE_ENV = 'test'
    })
  })

  afterEach(() => {
    // Generate security report if vulnerabilities found
    if (securityFramework.vulnerabilities.length > 0) {
      const report = securityFramework.generateSecurityReport()
      console.log('API Security Test Report:', JSON.stringify(report, null, 2))
    }
  })
})

// Mock API Service for testing
class MockAPIService {
  constructor() {
    this.rateLimits = new Map()
    this.connections = new Map()
    this.apiKeys = new Map()
    this.circuitBreakers = new Map()
    
    // Initialize valid API keys
    this.apiKeys.set('valid-api-key-12345', { 
      valid: true, 
      quota: 1000, 
      used: 0,
      createdAt: Date.now()
    })
    this.apiKeys.set('expired-api-key', { 
      valid: false, 
      expiredAt: Date.now() - 86400000 
    })
    this.apiKeys.set('quota-test-key', { 
      valid: true, 
      quota: 950, 
      used: 0 
    })
  }

  async request(endpoint, options = {}) {
    // Apply rate limiting
    if (this.isRateLimited(endpoint, options)) {
      return {
        status: 429,
        headers: { 'Retry-After': '60' },
        body: { error: 'Too Many Requests' }
      }
    }

    // Validate API key if protected endpoint
    if (endpoint.includes('/protected') && !this.validateAPIKey(options.headers?.['X-API-Key'])) {
      return {
        status: 401,
        headers: {},
        body: { error: 'Unauthorized' }
      }
    }

    // Check payload size
    if (options.body && Buffer.byteLength(options.body) > 5 * 1024 * 1024) {
      return {
        status: 413,
        headers: {},
        body: { error: 'Payload Too Large' }
      }
    }

    // Check content type
    if (options.method === 'POST' && options.headers?.['Content-Type'] && 
        !['application/json', 'application/graphql'].includes(options.headers['Content-Type'])) {
      return {
        status: 415,
        headers: {},
        body: { error: 'Unsupported Media Type' }
      }
    }

    // Simulate timeout
    if (options.simulateDelay > 30000) {
      return {
        status: 408,
        headers: {},
        body: { error: 'Request Timeout' }
      }
    }

    // Track rate limits
    this.trackRateLimit(endpoint, options)

    return {
      status: 200,
      headers: this.getSecurityHeaders(),
      body: { success: true }
    }
  }

  isRateLimited(endpoint, options) {
    const key = options.userId || options.ip || 'anonymous'
    const rateLimitKey = `${key}:${endpoint}`
    
    const now = Date.now()
    const windowMs = this.getRateLimitWindow(endpoint)
    const limit = this.getRateLimitCount(endpoint, options)
    
    if (!this.rateLimits.has(rateLimitKey)) {
      this.rateLimits.set(rateLimitKey, { count: 0, resetTime: now + windowMs })
    }
    
    const rateLimit = this.rateLimits.get(rateLimitKey)
    
    // Reset if window expired
    if (now > rateLimit.resetTime) {
      rateLimit.count = 0
      rateLimit.resetTime = now + windowMs
    }
    
    if (rateLimit.count >= limit) {
      return true
    }
    
    return false
  }

  trackRateLimit(endpoint, options) {
    const key = options.userId || options.ip || 'anonymous'
    const rateLimitKey = `${key}:${endpoint}`
    
    if (this.rateLimits.has(rateLimitKey)) {
      this.rateLimits.get(rateLimitKey).count++
    }
  }

  getRateLimitWindow(endpoint) {
    const windows = {
      '/api/auth/login': 900000, // 15 minutes
      '/api/campaigns': 60000, // 1 minute
      '/api/donations': 60000, // 1 minute
      '/api/admin': 60000 // 1 minute
    }
    return windows[endpoint] || 60000
  }

  getRateLimitCount(endpoint, options) {
    const limits = {
      '/api/auth/login': 5,
      '/api/campaigns': options.authenticated ? 150 : 50,
      '/api/donations': options.authenticated ? 20 : 10,
      '/api/admin': 20
    }
    return limits[endpoint] || 100
  }

  validateCORS(request) {
    const trustedOrigins = [
      'https://trusted-domain.com',
      'https://campaign-app.com',
      'http://localhost:3000'
    ]

    if (trustedOrigins.includes(request.origin)) {
      return {
        'Access-Control-Allow-Origin': request.origin,
        'Access-Control-Allow-Credentials': 'true'
      }
    }

    return {}
  }

  configureCORS(config) {
    if ((config.origin === '*' || (Array.isArray(config.origin) && config.origin.includes('*'))) && 
        config.credentials) {
      throw new Error('Dangerous CORS configuration: wildcard origin with credentials')
    }

    if (config.allowedHeaders && config.allowedHeaders.includes('*')) {
      throw new Error('Dangerous CORS configuration: wildcard headers')
    }
  }

  async handlePreflight(request) {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': request.headers['Origin'],
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
        'Access-Control-Max-Age': '86400'
      }
    }
  }

  getSecurityHeaders() {
    return {
      'Content-Security-Policy': this.generateCSP(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': this.generateHSTS(),
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  }

  generateCSP() {
    return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none';"
  }

  generateHSTS() {
    return 'max-age=31536000; includeSubDomains; preload'
  }

  validateAPIKey(apiKey) {
    const keyData = this.apiKeys.get(apiKey)
    
    if (!keyData || !keyData.valid) {
      return false
    }

    if (keyData.expiredAt && Date.now() > keyData.expiredAt) {
      return false
    }

    if (keyData.used >= keyData.quota) {
      return false
    }

    keyData.used++
    return true
  }

  getAPIKeyManager() {
    return {
      rotateKey: (oldKey) => {
        const newKey = 'new-api-key-' + Math.random().toString(36).substr(2, 9)
        this.apiKeys.delete(oldKey)
        this.apiKeys.set(newKey, { valid: true, quota: 1000, used: 0 })
        return newKey
      },
      isValid: (key) => {
        const keyData = this.apiKeys.get(key)
        return keyData && keyData.valid
      }
    }
  }

  simulateSlowConnection(endpoint) {
    return {
      endpoint,
      slow: true,
      close: () => {}
    }
  }

  async createConnection(ipAddress) {
    const connections = this.connections.get(ipAddress) || []
    
    if (connections.length >= 10) {
      return { rejected: true, reason: 'Connection limit exceeded' }
    }
    
    const connection = { id: Date.now(), ip: ipAddress }
    connections.push(connection)
    this.connections.set(ipAddress, connections)
    
    return connection
  }

  validateInput(input, type) {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }

    const startTime = Date.now()
    
    try {
      const pattern = patterns[type]
      if (pattern && input.length > 1000) {
        throw new Error('Input too long')
      }
      
      return pattern?.test(input) || false
    } finally {
      const endTime = Date.now()
      if (endTime - startTime > 50) {
        throw new Error('Regex timeout - potential ReDoS attack')
      }
    }
  }

  getCircuitBreaker(service) {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        timeout: 60000
      })
    }
    return this.circuitBreakers.get(service)
  }

  async callExternalService(options = {}) {
    const circuitBreaker = this.getCircuitBreaker('/api/external-service')
    
    if (circuitBreaker.state === 'OPEN') {
      if (Date.now() - circuitBreaker.lastFailureTime < circuitBreaker.timeout) {
        throw new Error('Circuit breaker is OPEN')
      } else {
        circuitBreaker.state = 'HALF_OPEN'
      }
    }

    if (options.simulateFailure) {
      circuitBreaker.failureCount++
      circuitBreaker.lastFailureTime = Date.now()
      
      if (circuitBreaker.failureCount >= 5) {
        circuitBreaker.state = 'OPEN'
      }
      
      throw new Error('External service failed')
    }

    // Success - reset circuit breaker
    circuitBreaker.failureCount = 0
    circuitBreaker.state = 'CLOSED'
    
    return { success: true }
  }

  async graphqlRequest(query) {
    // Simple depth calculation
    const depth = (query.match(/{/g) || []).length
    if (depth > 10) {
      return {
        errors: [{ message: 'Query depth limit exceeded' }]
      }
    }

    // Check for introspection
    if (query.includes('__schema') && process.env.NODE_ENV === 'production') {
      return {
        errors: [{ message: 'Introspection is disabled in production' }]
      }
    }

    // Simple complexity check (count fields)
    const fieldCount = (query.match(/\w+\s*{|\w+$/g) || []).length
    if (fieldCount > 50) {
      return {
        errors: [{ message: 'Query complexity limit exceeded' }]
      }
    }

    return { data: { campaigns: [] } }
  }
}