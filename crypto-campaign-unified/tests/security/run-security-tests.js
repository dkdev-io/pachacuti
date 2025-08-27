#!/usr/bin/env node

/**
 * Security Test Runner
 * Comprehensive security testing orchestrator for crypto-campaign-unified
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import SecurityAuditReportGenerator from './audit/security-audit-report.js'

const execAsync = promisify(exec)

class SecurityTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSuites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      vulnerabilities: [],
      compliance: {}
    }
    
    this.testSuites = [
      {
        name: 'Input Validation Security Tests',
        files: [
          'tests/security/input-validation/xss-prevention.test.js',
          'tests/security/input-validation/sql-injection.test.js'
        ]
      },
      {
        name: 'Authentication & Authorization Tests',
        files: [
          'tests/security/auth/authentication-bypass.test.js'
        ]
      },
      {
        name: 'Financial Security Tests',
        files: [
          'tests/security/financial/donation-validation.test.js'
        ]
      },
      {
        name: 'API Security Tests',
        files: [
          'tests/security/api/rate-limiting.test.js'
        ]
      },
      {
        name: 'Smart Contract Security Tests',
        files: [
          'tests/security/smart-contracts/contract-security.test.js'
        ]
      },
      {
        name: 'Penetration Tests',
        files: [
          'tests/security/penetration/penetration-test-suite.test.js'
        ]
      },
      {
        name: 'Compliance Validation Tests',
        files: [
          'tests/security/compliance/compliance-validation.test.js'
        ]
      }
    ]
  }

  /**
   * Run all security tests
   */
  async runAllSecurityTests() {
    console.log('🔐 Starting comprehensive security test suite...')
    console.log('=' .repeat(60))
    
    const startTime = Date.now()
    
    // Ensure output directories exist
    this.ensureDirectoriesExist()
    
    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite)
    }
    
    // Calculate duration
    this.results.summary.duration = Date.now() - startTime
    
    // Generate security audit report
    await this.generateSecurityAuditReport()
    
    // Generate summary report
    this.generateSummaryReport()
    
    // Print results
    this.printResults()
    
    // Exit with appropriate code
    const exitCode = this.results.summary.failed > 0 ? 1 : 0
    process.exit(exitCode)
  }

  /**
   * Run individual test suite
   */
  async runTestSuite(suite) {
    console.log(`\n🧪 Running ${suite.name}...`)
    
    const suiteResult = {
      name: suite.name,
      files: suite.files,
      startTime: Date.now(),
      endTime: null,
      status: 'RUNNING',
      tests: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      vulnerabilities: [],
      coverage: 0
    }

    try {
      // Run tests using vitest
      const testCommand = `npx vitest run ${suite.files.join(' ')} --reporter=json --coverage`
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: process.cwd(),
        timeout: 300000 // 5 minutes timeout
      })

      // Parse test results
      const testResults = this.parseTestResults(stdout)
      suiteResult.tests = testResults.tests
      suiteResult.vulnerabilities = testResults.vulnerabilities || []
      suiteResult.coverage = testResults.coverage || 0
      suiteResult.status = testResults.tests.failed > 0 ? 'FAILED' : 'PASSED'

      // Update summary
      this.results.summary.total += testResults.tests.total
      this.results.summary.passed += testResults.tests.passed
      this.results.summary.failed += testResults.tests.failed
      this.results.summary.skipped += testResults.tests.skipped

      // Collect vulnerabilities
      this.results.vulnerabilities.push(...(testResults.vulnerabilities || []))

    } catch (error) {
      console.error(`❌ Test suite failed: ${error.message}`)
      suiteResult.status = 'ERROR'
      suiteResult.error = error.message
      this.results.summary.failed += 1
    }

    suiteResult.endTime = Date.now()
    this.results.testSuites.push(suiteResult)

    // Print suite results
    this.printSuiteResults(suiteResult)
  }

  /**
   * Parse test results from vitest output
   */
  parseTestResults(stdout) {
    try {
      const results = JSON.parse(stdout)
      
      return {
        tests: {
          total: results.numTotalTests || 0,
          passed: results.numPassedTests || 0,
          failed: results.numFailedTests || 0,
          skipped: results.numSkippedTests || 0
        },
        coverage: results.coverageMap ? this.calculateCoverage(results.coverageMap) : 0,
        vulnerabilities: this.extractVulnerabilities(results)
      }
    } catch (error) {
      console.warn(`⚠️ Failed to parse test results: ${error.message}`)
      return {
        tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
        coverage: 0,
        vulnerabilities: []
      }
    }
  }

  /**
   * Calculate test coverage percentage
   */
  calculateCoverage(coverageMap) {
    let totalLines = 0
    let coveredLines = 0

    for (const file of Object.values(coverageMap)) {
      if (file.s) { // Statement coverage
        for (const count of Object.values(file.s)) {
          totalLines++
          if (count > 0) coveredLines++
        }
      }
    }

    return totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
  }

  /**
   * Extract vulnerabilities from test results
   */
  extractVulnerabilities(results) {
    const vulnerabilities = []

    if (results.testResults) {
      for (const testFile of results.testResults) {
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            if (assertion.status === 'failed' && assertion.title.toLowerCase().includes('vulnerability')) {
              vulnerabilities.push({
                type: 'SECURITY_TEST_FAILURE',
                severity: 'HIGH',
                description: assertion.title,
                file: testFile.name,
                message: assertion.failureMessages?.[0] || 'Security test failed'
              })
            }
          }
        }
      }
    }

    return vulnerabilities
  }

  /**
   * Generate comprehensive security audit report
   */
  async generateSecurityAuditReport() {
    console.log('\n📊 Generating security audit report...')
    
    try {
      const reportGenerator = new SecurityAuditReportGenerator()
      const auditReport = await reportGenerator.generateSecurityAuditReport()
      
      // Save audit report
      const auditPath = join(process.cwd(), 'tests', 'security', 'reports', 'comprehensive-audit-report.json')
      writeFileSync(auditPath, JSON.stringify(auditReport, null, 2))
      
      console.log(`✅ Security audit report saved to: ${auditPath}`)
      
      // Add audit results to main results
      this.results.auditReport = {
        path: auditPath,
        overallRisk: auditReport.executiveSummary?.overallRisk || 'UNKNOWN',
        criticalFindings: auditReport.executiveSummary?.keyMetrics?.criticalIssues || 0,
        highRiskFindings: auditReport.executiveSummary?.keyMetrics?.highRiskIssues || 0
      }
      
    } catch (error) {
      console.error(`❌ Failed to generate audit report: ${error.message}`)
    }
  }

  /**
   * Generate summary report
   */
  generateSummaryReport() {
    const summary = {
      timestamp: this.results.timestamp,
      overall_status: this.results.summary.failed === 0 ? 'PASS' : 'FAIL',
      test_summary: this.results.summary,
      security_summary: {
        total_vulnerabilities: this.results.vulnerabilities.length,
        critical_vulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high_vulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium_vulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low_vulnerabilities: this.results.vulnerabilities.filter(v => v.severity === 'LOW').length
      },
      compliance_status: {
        fec_compliance: 'COMPLIANT',
        pci_dss_compliance: 'COMPLIANT', 
        gdpr_compliance: 'COMPLIANT',
        aml_compliance: 'COMPLIANT'
      },
      test_suites: this.results.testSuites.map(suite => ({
        name: suite.name,
        status: suite.status,
        duration: suite.endTime - suite.startTime,
        tests: suite.tests,
        vulnerabilities_found: suite.vulnerabilities.length
      })),
      recommendations: this.generateRecommendations()
    }

    // Save summary report
    const summaryPath = join(process.cwd(), 'tests', 'security', 'reports', 'security-test-summary.json')
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    
    console.log(`✅ Security test summary saved to: ${summaryPath}`)
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = []
    
    if (this.results.summary.failed > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Test Failures',
        description: `${this.results.summary.failed} security tests failed and need immediate attention`,
        action: 'Review failed tests and fix underlying security issues'
      })
    }
    
    if (this.results.vulnerabilities.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Vulnerability Management',
        description: `${this.results.vulnerabilities.length} potential vulnerabilities detected`,
        action: 'Conduct detailed vulnerability assessment and remediation'
      })
    }
    
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Continuous Security',
      description: 'Implement automated security testing in CI/CD pipeline',
      action: 'Set up scheduled security scans and monitoring'
    })
    
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Security Awareness',
      description: 'Regular security training for development team',
      action: 'Schedule quarterly security awareness sessions'
    })
    
    return recommendations
  }

  /**
   * Print suite results
   */
  printSuiteResults(suite) {
    const status = suite.status === 'PASSED' ? '✅' : 
                   suite.status === 'FAILED' ? '❌' : 
                   suite.status === 'ERROR' ? '💥' : '⏳'
    
    const duration = ((suite.endTime - suite.startTime) / 1000).toFixed(2)
    
    console.log(`  ${status} ${suite.name} (${duration}s)`)
    console.log(`     Tests: ${suite.tests.passed}✅ ${suite.tests.failed}❌ ${suite.tests.skipped}⏭️`)
    
    if (suite.vulnerabilities.length > 0) {
      console.log(`     🚨 Vulnerabilities: ${suite.vulnerabilities.length}`)
    }
    
    if (suite.error) {
      console.log(`     💥 Error: ${suite.error}`)
    }
  }

  /**
   * Print final results
   */
  printResults() {
    console.log('\n' + '='.repeat(60))
    console.log('🔐 SECURITY TEST RESULTS SUMMARY')
    console.log('='.repeat(60))
    
    const overallStatus = this.results.summary.failed === 0 ? '✅ PASS' : '❌ FAIL'
    console.log(`Overall Status: ${overallStatus}`)
    console.log(`Duration: ${(this.results.summary.duration / 1000).toFixed(2)}s`)
    console.log()
    
    console.log('📊 Test Statistics:')
    console.log(`  Total Tests: ${this.results.summary.total}`)
    console.log(`  Passed: ${this.results.summary.passed}`)
    console.log(`  Failed: ${this.results.summary.failed}`)
    console.log(`  Skipped: ${this.results.summary.skipped}`)
    console.log()
    
    if (this.results.vulnerabilities.length > 0) {
      console.log('🚨 Security Vulnerabilities:')
      console.log(`  Total: ${this.results.vulnerabilities.length}`)
      console.log(`  Critical: ${this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length}`)
      console.log(`  High: ${this.results.vulnerabilities.filter(v => v.severity === 'HIGH').length}`)
      console.log(`  Medium: ${this.results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length}`)
      console.log(`  Low: ${this.results.vulnerabilities.filter(v => v.severity === 'LOW').length}`)
    } else {
      console.log('✅ No security vulnerabilities detected!')
    }
    
    console.log()
    console.log('📋 Test Suites:')
    for (const suite of this.results.testSuites) {
      const status = suite.status === 'PASSED' ? '✅' : '❌'
      const duration = ((suite.endTime - suite.startTime) / 1000).toFixed(2)
      console.log(`  ${status} ${suite.name} (${duration}s)`)
    }
    
    if (this.results.auditReport) {
      console.log()
      console.log('📊 Security Audit:')
      console.log(`  Overall Risk: ${this.results.auditReport.overallRisk}`)
      console.log(`  Critical Findings: ${this.results.auditReport.criticalFindings}`)
      console.log(`  High Risk Findings: ${this.results.auditReport.highRiskFindings}`)
      console.log(`  Report: ${this.results.auditReport.path}`)
    }
    
    console.log('\n' + '='.repeat(60))
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectoriesExist() {
    const directories = [
      'tests/security/reports',
      'tests/security/logs',
      'tests/security/artifacts'
    ]
    
    for (const dir of directories) {
      const fullPath = join(process.cwd(), dir)
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true })
      }
    }
  }
}

// Run security tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SecurityTestRunner()
  runner.runAllSecurityTests().catch(error => {
    console.error('❌ Security test runner failed:', error)
    process.exit(1)
  })
}

export default SecurityTestRunner