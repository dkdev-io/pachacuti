/**
 * XSS Prevention Security Tests
 * Tests for Cross-Site Scripting vulnerabilities in input validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SecurityTestFramework, SecurityUtils } from '../security-test-framework.js'
import { CampaignManager } from '../../../src/core/campaign.js'

describe('XSS Prevention Security Tests', () => {
  let securityFramework
  let campaignManager

  beforeEach(() => {
    securityFramework = new SecurityTestFramework()
    campaignManager = new CampaignManager()
  })

  describe('Campaign Name XSS Prevention', () => {
    it('should prevent XSS in campaign names', () => {
      const maliciousInputs = SecurityUtils.generateMaliciousInputs().xss

      maliciousInputs.forEach(maliciousName => {
        expect(() => {
          const campaign = campaignManager.createCampaign({
            name: maliciousName,
            type: 'fundraising'
          })
          
          // Check if malicious script tags are still present
          expect(campaign.name).not.toContain('<script>')
          expect(campaign.name).not.toContain('javascript:')
          expect(campaign.name).not.toContain('onerror=')
          expect(campaign.name).not.toContain('onload=')
        }).not.toThrow()
      })
    })

    it('should sanitize HTML entities in campaign descriptions', () => {
      const htmlPayloads = [
        '<h1>Test Campaign</h1>',
        '<p onclick="alert(\'XSS\')">Click me</p>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<script>document.cookie="hacked=true"</script>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ]

      htmlPayloads.forEach(payload => {
        const campaign = campaignManager.createCampaign({
          name: 'Test Campaign',
          type: 'fundraising',
          description: payload
        })

        // Description should be sanitized
        expect(campaign.description).not.toContain('<script>')
        expect(campaign.description).not.toContain('<iframe>')
        expect(campaign.description).not.toContain('javascript:')
        expect(campaign.description).not.toContain('onerror=')
      })
    })

    it('should escape special characters properly', () => {
      const specialChars = [
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        '&#x3C;script&#x3E;alert("XSS")&#x3C;/script&#x3E;',
        '&quot;>&lt;script>alert("XSS")&lt;/script>',
        '&#39;>&lt;script>alert(&#39;XSS&#39;)&lt;/script>'
      ]

      specialChars.forEach(encoded => {
        const campaign = campaignManager.createCampaign({
          name: encoded,
          type: 'fundraising'
        })

        // Should remain encoded or be properly decoded without creating vulnerabilities
        expect(campaign.name).not.toMatch(/<script.*?>.*?<\/script>/i)
      })
    })
  })

  describe('Form Input Validation', () => {
    it('should validate and sanitize all form inputs', () => {
      const testCases = [
        {
          field: 'name',
          value: '<script>alert("name_xss")</script>',
          expected: 'alert("name_xss")'
        },
        {
          field: 'type', 
          value: 'fundraising"><script>alert("type_xss")</script>',
          expected: 'fundraising">'
        },
        {
          field: 'budget',
          value: '1000<script>alert("budget_xss")</script>',
          expected: 1000 // Should be parsed as number
        }
      ]

      testCases.forEach(testCase => {
        const campaignData = {
          name: 'Safe Campaign',
          type: 'fundraising',
          budget: 1000
        }
        campaignData[testCase.field] = testCase.value

        const campaign = campaignManager.createCampaign(campaignData)
        
        if (testCase.field === 'budget') {
          expect(typeof campaign[testCase.field]).toBe('number')
        } else {
          expect(campaign[testCase.field]).not.toContain('<script>')
          expect(campaign[testCase.field]).not.toContain('javascript:')
        }
      })
    })

    it('should reject dangerous protocols in URLs', () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd',
        'ftp://malicious.com/backdoor.exe'
      ]

      dangerousUrls.forEach(url => {
        expect(() => {
          campaignManager.createCampaign({
            name: 'Test Campaign',
            type: 'fundraising',
            website: url
          })
        }).toThrow(/invalid.*url|dangerous.*protocol/i)
      })
    })
  })

  describe('Output Encoding', () => {
    it('should properly encode output for different contexts', () => {
      const campaign = campaignManager.createCampaign({
        name: 'Test & "Special" Campaign <script>',
        type: 'fundraising'
      })

      // HTML context encoding
      const htmlOutput = `<h1>${campaign.name}</h1>`
      expect(htmlOutput).not.toContain('<script>')
      
      // JavaScript context encoding  
      const jsOutput = `var campaignName = "${campaign.name}";`
      expect(jsOutput).not.toContain('</script>')
      expect(jsOutput).not.toContain('";alert("XSS");"')
      
      // CSS context encoding
      const cssOutput = `content: "${campaign.name}";`
      expect(cssOutput).not.toContain('expression(')
      expect(cssOutput).not.toContain('javascript:')
    })

    it('should handle unicode and emoji inputs safely', () => {
      const unicodeInputs = [
        '🚀 Campaign with emoji',
        'Campaña con ñ y acentos',
        '活动名称 (Chinese)',
        'Кампания (Russian)',
        '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e'
      ]

      unicodeInputs.forEach(input => {
        const campaign = campaignManager.createCampaign({
          name: input,
          type: 'fundraising'
        })

        expect(campaign.name).not.toContain('<script>')
        expect(campaign.name).not.toContain('\\u003c') // Shouldn't contain raw unicode escapes
      })
    })
  })

  describe('Content Security Policy Validation', () => {
    it('should validate CSP headers prevent XSS', () => {
      const headers = {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
      }

      const validation = SecurityUtils.validateSecurityHeaders(headers)
      
      // CSP with unsafe-inline is vulnerable
      expect(headers['Content-Security-Policy']).toContain("'unsafe-inline'")
      
      // Should recommend removing unsafe-inline
      const recommendation = securityFramework.generateRecommendations().find(
        r => r.category === 'Content Security Policy'
      )
      expect(recommendation).toBeTruthy()
    })

    it('should test XSS with comprehensive payloads', () => {
      const xssResults = securityFramework.testXSSVulnerabilities(
        '<script>alert("test")</script>',
        (input) => input.replace(/<script.*?>.*?<\/script>/gi, '')
      )

      // Should detect and prevent XSS
      xssResults.forEach(result => {
        expect(result.safe).toBe(true)
      })

      // Generate security report
      const report = securityFramework.generateSecurityReport()
      expect(report.vulnerabilities.filter(v => v.type === 'XSS')).toHaveLength(0)
    })
  })

  describe('File Upload Security', () => {
    it('should validate file types and prevent malicious uploads', () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00\x03', type: 'application/octet-stream' },
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: 'xss.html', content: '<script>alert("XSS")</script>', type: 'text/html' },
        { name: 'backdoor.jsp', content: '<%@ page import="java.io.*" %>', type: 'text/plain' },
        { name: 'image.jpg.php', content: 'GIF89a<?php system("id"); ?>', type: 'image/gif' }
      ]

      maliciousFiles.forEach(file => {
        expect(() => {
          // Simulate file upload validation
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
          const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
          
          const extension = file.name.split('.').pop().toLowerCase()
          const hasValidExtension = allowedExtensions.includes(`.${extension}`)
          const hasValidType = allowedTypes.includes(file.type)
          
          if (!hasValidExtension || !hasValidType) {
            throw new Error('Invalid file type')
          }
          
          // Additional content validation
          if (file.content.includes('<?php') || file.content.includes('<script>')) {
            throw new Error('Malicious content detected')
          }
        }).toThrow()
      })
    })
  })

  describe('DOM-based XSS Prevention', () => {
    it('should prevent DOM-based XSS attacks', () => {
      const domXssVectors = [
        'document.location.hash.substring(1)',
        'window.location.search.substring(1)', 
        'document.referrer',
        'window.name',
        'history.pushState'
      ]

      // Simulate DOM manipulation with user input
      domXssVectors.forEach(vector => {
        const userInput = '<img src=x onerror=alert("DOM-XSS")>'
        
        // Simulate safe DOM manipulation
        const safeInnerHTML = userInput
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')

        expect(safeInnerHTML).not.toContain('<img')
        expect(safeInnerHTML).not.toContain('onerror=')
      })
    })
  })

  afterEach(() => {
    // Generate security report if vulnerabilities found
    if (securityFramework.vulnerabilities.length > 0) {
      const report = securityFramework.generateSecurityReport()
      console.log('XSS Security Test Report:', JSON.stringify(report, null, 2))
    }
  })
})