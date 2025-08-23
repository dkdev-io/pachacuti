#!/usr/bin/env node

/**
 * Test Suite for Pachacuti Approval Optimization System
 */

const ApprovalEngine = require('../scripts/approval-automation/approval-engine');
const RiskAssessor = require('../scripts/approval-automation/risk-assessor');

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class TestRunner {
  constructor() {
    this.engine = new ApprovalEngine();
    this.assessor = new RiskAssessor();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }
  
  /**
   * Run all tests
   */
  async runTests() {
    console.log(`${colors.blue}Starting Pachacuti Approval System Tests${colors.reset}\n`);
    
    // Test auto-approve operations
    await this.testAutoApproveOperations();
    
    // Test require-approval operations
    await this.testRequireApprovalOperations();
    
    // Test risk assessment
    await this.testRiskAssessment();
    
    // Test batch operations
    await this.testBatchOperations();
    
    // Test autonomous sessions
    await this.testAutonomousSessions();
    
    // Display results
    this.displayResults();
  }
  
  /**
   * Test auto-approve operations
   */
  async testAutoApproveOperations() {
    console.log(`${colors.yellow}Testing Auto-Approve Operations...${colors.reset}`);
    
    const autoApproveTests = [
      {
        name: 'Git status command',
        operation: { type: 'git', command: 'git status' },
        expected: true
      },
      {
        name: 'NPM build command',
        operation: { type: 'command', command: 'npm run build' },
        expected: true
      },
      {
        name: 'Source file edit',
        operation: { type: 'file', filePath: 'src/components/Button.js', action: 'edit' },
        expected: true
      },
      {
        name: 'Test file creation',
        operation: { type: 'file', filePath: 'tests/unit/helper.test.js', action: 'create' },
        expected: true
      },
      {
        name: 'Documentation update',
        operation: { type: 'file', filePath: 'docs/README.md', action: 'edit' },
        expected: true
      },
      {
        name: 'Read operation',
        operation: { type: 'read', filePath: 'package.json', action: 'read' },
        expected: true
      }
    ];
    
    for (const test of autoApproveTests) {
      const result = this.engine.shouldAutoApprove(test.operation);
      this.assertTest(test.name, result, test.expected);
    }
  }
  
  /**
   * Test require-approval operations
   */
  async testRequireApprovalOperations() {
    console.log(`\n${colors.yellow}Testing Require-Approval Operations...${colors.reset}`);
    
    const requireApprovalTests = [
      {
        name: 'Package.json modification',
        operation: { type: 'file', filePath: 'package.json', action: 'edit' },
        expected: false
      },
      {
        name: 'Environment file change',
        operation: { type: 'file', filePath: '.env', action: 'edit' },
        expected: false
      },
      {
        name: 'Webpack config change',
        operation: { type: 'file', filePath: 'webpack.config.js', action: 'edit' },
        expected: false
      },
      {
        name: 'Security operation',
        operation: { type: 'file', filePath: 'src/auth/security.js', action: 'authenticationLogic' },
        expected: false
      }
    ];
    
    for (const test of requireApprovalTests) {
      const result = this.engine.shouldAutoApprove(test.operation);
      this.assertTest(test.name, result, test.expected);
    }
  }
  
  /**
   * Test risk assessment
   */
  async testRiskAssessment() {
    console.log(`\n${colors.yellow}Testing Risk Assessment...${colors.reset}`);
    
    const riskTests = [
      {
        name: 'Low risk test file',
        operation: { type: 'file', filePath: 'tests/example.test.js', action: 'edit' },
        expectedLevel: 'LOW'
      },
      {
        name: 'High risk production file',
        operation: { type: 'file', filePath: 'production/api/payments.js', action: 'edit' },
        expectedLevel: 'HIGH'
      },
      {
        name: 'Critical security operation',
        operation: { type: 'file', filePath: 'auth/encryption.js', action: 'security' },
        expectedLevel: 'CRITICAL'
      },
      {
        name: 'Medium risk config file',
        operation: { type: 'file', filePath: 'config/app.config.js', action: 'edit' },
        expectedLevel: 'MEDIUM'
      }
    ];
    
    for (const test of riskTests) {
      const result = this.assessor.calculateRisk(test.operation);
      this.assertTest(test.name, result.level, test.expectedLevel);
    }
  }
  
  /**
   * Test batch operations
   */
  async testBatchOperations() {
    console.log(`\n${colors.yellow}Testing Batch Operations...${colors.reset}`);
    
    const batchOps = [
      { type: 'file', filePath: 'src/components/Button.js', action: 'create' },
      { type: 'file', filePath: 'src/components/Input.js', action: 'create' },
      { type: 'file', filePath: 'src/components/Card.js', action: 'create' }
    ];
    
    const result = this.engine.processBatch(batchOps);
    
    this.assertTest(
      'Batch file creation auto-approval',
      result.approved.length,
      3
    );
    
    const mixedBatch = [
      { type: 'file', filePath: 'src/index.js', action: 'edit' },
      { type: 'file', filePath: 'package.json', action: 'edit' },
      { type: 'file', filePath: '.env', action: 'edit' }
    ];
    
    const mixedResult = this.engine.processBatch(mixedBatch);
    
    this.assertTest(
      'Mixed batch partial approval',
      mixedResult.requiresApproval.length,
      2
    );
  }
  
  /**
   * Test autonomous sessions
   */
  async testAutonomousSessions() {
    console.log(`\n${colors.yellow}Testing Autonomous Sessions...${colors.reset}`);
    
    // Start session
    this.engine.startAutonomousSession(1000); // 1 second for testing
    
    this.assertTest(
      'Autonomous session active',
      this.engine.sessionState.autonomousMode,
      true
    );
    
    // Test operation in autonomous mode
    const operation = {
      type: 'file',
      filePath: 'config/settings.js',
      action: 'edit'
    };
    
    const result = this.engine.shouldAutoApprove(operation);
    
    this.assertTest(
      'Medium-risk auto-approved in autonomous mode',
      result,
      true
    );
    
    // Wait for session to end
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    this.assertTest(
      'Autonomous session ended',
      this.engine.sessionState.autonomousMode,
      false
    );
  }
  
  /**
   * Assert test result
   */
  assertTest(name, actual, expected) {
    const passed = actual === expected;
    
    if (passed) {
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
      this.results.passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      console.log(`    Expected: ${expected}, Got: ${actual}`);
      this.results.failed++;
    }
    
    this.results.tests.push({
      name,
      passed,
      actual,
      expected
    });
  }
  
  /**
   * Display test results
   */
  displayResults() {
    console.log(`\n${colors.blue}Test Results${colors.reset}`);
    console.log('═'.repeat(50));
    
    const total = this.results.passed + this.results.failed;
    const percentage = ((this.results.passed / total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${total}`);
    console.log(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`Success Rate: ${percentage}%`);
    
    if (this.results.failed === 0) {
      console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}Some tests failed. Review the output above.${colors.reset}`);
    }
  }
}

// Run tests
const runner = new TestRunner();
runner.runTests().catch(console.error);