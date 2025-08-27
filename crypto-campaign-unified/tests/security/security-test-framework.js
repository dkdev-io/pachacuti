/**
 * Security Testing Framework
 * Comprehensive security testing infrastructure for crypto-campaign-unified
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

export class SecurityTestFramework {
  constructor() {
    this.vulnerabilities = []
    this.testResults = new Map()
    this.attackPatterns = new Map()
    this.complianceChecks = new Map()
  }

  /**
   * Record a security vulnerability
   */
  recordVulnerability(type, severity, description, evidence) {
    const vulnerability = {
      id: crypto.randomUUID(),
      type,
      severity, // LOW, MEDIUM, HIGH, CRITICAL
      description,
      evidence,
      timestamp: new Date().toISOString(),
      status: 'OPEN'
    }
    this.vulnerabilities.push(vulnerability)
    return vulnerability
  }

  /**
   * Test for XSS vulnerabilities
   */
  testXSSVulnerabilities(input, sanitizeFunction) {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<object data="javascript:alert(\'XSS\')"></object>',
      '<embed src="javascript:alert(\'XSS\')">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<%2Fscript><script>alert(\'XSS\')</script>',
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      '<img src="javascript:alert(\'XSS\')">'
    ]

    const results = []
    
    for (const payload of xssPayloads) {
      try {
        const sanitized = sanitizeFunction ? sanitizeFunction(payload) : payload
        const isVulnerable = sanitized.includes('<script>') || 
                            sanitized.includes('javascript:') || 
                            sanitized.includes('onerror=') ||
                            sanitized.includes('onload=')
        
        results.push({
          payload,
          sanitized,
          vulnerable: isVulnerable,
          safe: !isVulnerable
        })

        if (isVulnerable) {
          this.recordVulnerability(
            'XSS',
            'HIGH',
            `XSS vulnerability detected with payload: ${payload}`,
            { input: payload, output: sanitized }
          )
        }
      } catch (error) {
        results.push({
          payload,
          error: error.message,
          vulnerable: false,
          safe: true
        })
      }
    }

    return results
  }

  /**
   * Test for SQL injection vulnerabilities
   */
  testSQLInjection(queryBuilder, params) {
    const sqlPayloads = [
      "' OR '1'='1",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --",
      "' OR EXISTS(SELECT * FROM users WHERE username='admin') --",
      "' OR 1=1 LIMIT 1 OFFSET 0 --",
      "' OR SLEEP(5) --",
      "'; INSERT INTO users VALUES('hacker','password'); --",
      "' OR '1'='1' ORDER BY 1 --"
    ]

    const results = []

    for (const payload of sqlPayloads) {
      try {
        const testParams = { ...params, maliciousInput: payload }
        const query = queryBuilder(testParams)
        
        // Check if payload is properly escaped/sanitized
        const isVulnerable = query.includes(payload) && 
                            !query.includes(`'${payload}'`) // Not properly quoted
        
        results.push({
          payload,
          query,
          vulnerable: isVulnerable,
          safe: !isVulnerable
        })

        if (isVulnerable) {
          this.recordVulnerability(
            'SQL_INJECTION',
            'CRITICAL',
            `SQL injection vulnerability detected with payload: ${payload}`,
            { payload, generatedQuery: query }
          )
        }
      } catch (error) {
        results.push({
          payload,
          error: error.message,
          vulnerable: false,
          safe: true
        })
      }
    }

    return results
  }

  /**
   * Test authentication bypass attempts
   */
  testAuthenticationBypass(authenticateFunction) {
    const bypassPayloads = [
      { username: 'admin', password: '' },
      { username: 'admin', password: null },
      { username: 'admin', password: undefined },
      { username: '', password: '' },
      { username: null, password: null },
      { username: 'admin\x00', password: 'password' },
      { username: 'admin', password: 'password\x00' },
      { username: 'admin/*', password: 'password' },
      { username: 'admin', password: '*/' },
      { username: ['admin'], password: 'password' },
      { username: 'admin', password: ['password'] },
      { username: { $ne: null }, password: { $ne: null } },
      { username: 'admin" --', password: 'anything' }
    ]

    const results = []

    for (const payload of bypassPayloads) {
      try {
        const result = authenticateFunction(payload.username, payload.password)
        const bypassSuccessful = result === true || (result && result.authenticated)
        
        results.push({
          payload,
          result,
          bypassSuccessful,
          secure: !bypassSuccessful
        })

        if (bypassSuccessful) {
          this.recordVulnerability(
            'AUTH_BYPASS',
            'CRITICAL',
            `Authentication bypass successful with payload: ${JSON.stringify(payload)}`,
            { payload, result }
          )
        }
      } catch (error) {
        results.push({
          payload,
          error: error.message,
          bypassSuccessful: false,
          secure: true
        })
      }
    }

    return results
  }

  /**
   * Test rate limiting effectiveness
   */
  async testRateLimit(endpoint, requestsPerSecond = 100, duration = 1000) {
    const results = {
      requestsSent: 0,
      requestsBlocked: 0,
      averageResponseTime: 0,
      rateLimitTriggered: false,
      timestamps: []
    }

    const startTime = Date.now()
    const promises = []

    for (let i = 0; i < requestsPerSecond; i++) {
      const requestStart = performance.now()
      promises.push(
        fetch(endpoint)
          .then(response => {
            const requestEnd = performance.now()
            results.requestsSent++
            results.timestamps.push(requestEnd - requestStart)
            
            if (response.status === 429 || response.status === 503) {
              results.requestsBlocked++
              results.rateLimitTriggered = true
            }
            return response
          })
          .catch(error => {
            results.requestsBlocked++
            return { error: error.message }
          })
      )

      // Space out requests slightly to simulate real traffic
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    await Promise.all(promises)
    
    results.averageResponseTime = results.timestamps.reduce((a, b) => a + b, 0) / results.timestamps.length
    results.duration = Date.now() - startTime

    if (!results.rateLimitTriggered && results.requestsBlocked === 0) {
      this.recordVulnerability(
        'RATE_LIMIT_BYPASS',
        'MEDIUM',
        `Rate limiting not effective: ${results.requestsSent} requests completed without blocking`,
        results
      )
    }

    return results
  }

  /**
   * Test for cryptographic vulnerabilities
   */
  testCryptographicSecurity(encryptFunction, decryptFunction, keyGenFunction) {
    const results = {
      weakKeys: [],
      predictablePatterns: [],
      cryptoVulnerabilities: []
    }

    // Test for weak key generation
    const keys = []
    for (let i = 0; i < 100; i++) {
      keys.push(keyGenFunction())
    }

    // Check for predictable patterns
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size < keys.length * 0.95) {
      results.predictablePatterns.push('Key generation shows predictable patterns')
      this.recordVulnerability(
        'WEAK_CRYPTO',
        'HIGH',
        'Cryptographic key generation shows predictable patterns',
        { keysGenerated: keys.length, uniqueKeys: uniqueKeys.size }
      )
    }

    // Test encryption/decryption consistency
    const testData = 'sensitive_test_data_' + crypto.randomBytes(32).toString('hex')
    try {
      const key = keyGenFunction()
      const encrypted = encryptFunction(testData, key)
      const decrypted = decryptFunction(encrypted, key)

      if (decrypted !== testData) {
        results.cryptoVulnerabilities.push('Encryption/decryption inconsistency')
        this.recordVulnerability(
          'CRYPTO_INCONSISTENCY',
          'HIGH',
          'Encryption and decryption do not produce consistent results',
          { original: testData, decrypted }
        )
      }

      // Test for weak encryption (same input produces same output without IV/salt)
      const encrypted2 = encryptFunction(testData, key)
      if (encrypted === encrypted2) {
        results.cryptoVulnerabilities.push('Deterministic encryption detected')
        this.recordVulnerability(
          'DETERMINISTIC_ENCRYPTION',
          'MEDIUM',
          'Encryption is deterministic - same input produces same output',
          { testData, encrypted1: encrypted, encrypted2: encrypted2 }
        )
      }
    } catch (error) {
      results.cryptoVulnerabilities.push(`Crypto operation failed: ${error.message}`)
    }

    return results
  }

  /**
   * Generate security assessment report
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalVulnerabilities: this.vulnerabilities.length,
        criticalVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        highVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        mediumVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        lowVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'LOW').length
      },
      vulnerabilities: this.vulnerabilities,
      recommendations: this.generateRecommendations(),
      complianceStatus: this.assessCompliance()
    }

    return report
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = []
    const vulnTypes = new Set(this.vulnerabilities.map(v => v.type))

    if (vulnTypes.has('XSS')) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Input Validation',
        recommendation: 'Implement proper input sanitization and output encoding to prevent XSS attacks',
        implementation: 'Use libraries like DOMPurify for client-side sanitization and HTML encoding for server-side'
      })
    }

    if (vulnTypes.has('SQL_INJECTION')) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Database Security',
        recommendation: 'Use parameterized queries and input validation to prevent SQL injection',
        implementation: 'Replace string concatenation with prepared statements or ORM query builders'
      })
    }

    if (vulnTypes.has('AUTH_BYPASS')) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Authentication',
        recommendation: 'Implement robust authentication mechanisms with proper input validation',
        implementation: 'Use secure authentication libraries and validate all authentication parameters'
      })
    }

    if (vulnTypes.has('RATE_LIMIT_BYPASS')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'API Security',
        recommendation: 'Implement effective rate limiting to prevent DoS attacks',
        implementation: 'Use sliding window or token bucket algorithms with proper configuration'
      })
    }

    if (vulnTypes.has('WEAK_CRYPTO')) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Cryptography',
        recommendation: 'Use cryptographically secure random number generators and strong encryption',
        implementation: 'Use crypto.randomBytes() for key generation and industry-standard encryption algorithms'
      })
    }

    return recommendations
  }

  /**
   * Assess compliance status
   */
  assessCompliance() {
    return {
      PCI_DSS: {
        status: 'PARTIAL',
        requirements: [
          { requirement: 'Secure data transmission', status: 'UNKNOWN' },
          { requirement: 'Access control measures', status: 'UNKNOWN' },
          { requirement: 'Regular security testing', status: 'IN_PROGRESS' }
        ]
      },
      GDPR: {
        status: 'PARTIAL',
        requirements: [
          { requirement: 'Data encryption', status: 'UNKNOWN' },
          { requirement: 'Access controls', status: 'UNKNOWN' },
          { requirement: 'Data breach notification', status: 'UNKNOWN' }
        ]
      },
      FEC: {
        status: 'PARTIAL',
        requirements: [
          { requirement: 'Contribution tracking', status: 'UNKNOWN' },
          { requirement: 'Reporting mechanisms', status: 'UNKNOWN' },
          { requirement: 'Record keeping', status: 'UNKNOWN' }
        ]
      }
    }
  }
}

// Security test utilities
export const SecurityUtils = {
  /**
   * Generate malicious input patterns
   */
  generateMaliciousInputs() {
    return {
      xss: [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        "'><script>alert('XSS')</script>",
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">'
      ],
      sqlInjection: [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "'; EXEC xp_cmdshell('dir'); --"
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ],
      commandInjection: [
        '; cat /etc/passwd',
        '| ls -la',
        '& dir',
        '`whoami`',
        '$(id)'
      ]
    }
  },

  /**
   * Validate security headers
   */
  validateSecurityHeaders(headers) {
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Strict-Transport-Security',
      'X-XSS-Protection'
    ]

    const missingHeaders = requiredHeaders.filter(header => !headers[header])
    return {
      present: requiredHeaders.filter(header => headers[header]),
      missing: missingHeaders,
      score: ((requiredHeaders.length - missingHeaders.length) / requiredHeaders.length) * 100
    }
  },

  /**
   * Test password strength
   */
  testPasswordStrength(password) {
    const tests = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password),
      noCommon: !['password', '123456', 'qwerty', 'admin'].includes(password.toLowerCase())
    }

    const score = Object.values(tests).filter(Boolean).length
    return {
      score,
      maxScore: Object.keys(tests).length,
      strength: score < 3 ? 'WEAK' : score < 5 ? 'MEDIUM' : 'STRONG',
      tests
    }
  }
}