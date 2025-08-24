#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class QAVerifier {
  constructor() {
    this.projectDir = process.cwd();
    this.projectName = path.basename(this.projectDir);
    this.recentChanges = [];
    this.codeIssues = [];
    this.testResults = null;
    this.agentSummary = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  header(title) {
    console.log('');
    console.log('═'.repeat(50));
    this.log(`       ${title}`, 'bright');
    console.log('═'.repeat(50));
    console.log('');
  }

  async initialize() {
    this.header('QA VERIFICATION AGENT');
    this.log(`🎯 Project: ${this.projectName}`, 'cyan');
    this.log(`📁 Directory: ${this.projectDir}`, 'cyan');
    console.log('');
    
    // Start automatic analysis
    await this.runAutomaticAnalysis();
    
    // Wait for summary input
    await this.waitForCommand();
  }

  async runAutomaticAnalysis() {
    this.log('🔍 Starting automatic code analysis...', 'yellow');
    console.log('─'.repeat(50));
    
    // Get recent git changes
    this.analyzeGitChanges();
    
    // Check for code quality issues
    this.checkCodeQuality();
    
    // Run tests if available
    this.runTests();
    
    // Scan for common issues
    this.scanForIssues();
    
    console.log('─'.repeat(50));
    this.log('✅ Initial analysis complete', 'green');
    console.log('');
    this.log('📋 Ready for agent summary verification', 'bright');
    this.log('Use: qc confirm "[paste agent summary]"', 'cyan');
    console.log('');
  }

  analyzeGitChanges() {
    try {
      this.log('\n📊 Recent Git Activity:', 'blue');
      
      // Get recent commits
      const commits = execSync('git log --oneline -5 2>/dev/null', { encoding: 'utf8' });
      console.log(commits);
      
      // Get changed files
      const changes = execSync('git diff --name-status HEAD~1 2>/dev/null || git status --short', { encoding: 'utf8' });
      if (changes) {
        this.log('Changed files:', 'blue');
        console.log(changes);
        this.recentChanges = changes.split('\n').filter(line => line.trim());
      }
    } catch (error) {
      this.log('⚠️  Git analysis skipped (not a git repo or no commits)', 'yellow');
    }
  }

  checkCodeQuality() {
    this.log('\n🔧 Code Quality Checks:', 'blue');
    
    // Check for linting
    if (fs.existsSync('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (pkg.scripts && pkg.scripts.lint) {
          this.log('Running linter...', 'cyan');
          try {
            execSync('npm run lint', { encoding: 'utf8', stdio: 'pipe' });
            this.log('✅ Linting passed', 'green');
          } catch (e) {
            this.log('❌ Linting issues found', 'red');
            this.codeIssues.push('Linting errors detected');
          }
        }
        
        if (pkg.scripts && pkg.scripts.typecheck) {
          this.log('Running type check...', 'cyan');
          try {
            execSync('npm run typecheck', { encoding: 'utf8', stdio: 'pipe' });
            this.log('✅ Type check passed', 'green');
          } catch (e) {
            this.log('❌ Type errors found', 'red');
            this.codeIssues.push('Type errors detected');
          }
        }
      } catch (e) {
        this.log('⚠️  Could not run quality checks', 'yellow');
      }
    }
  }

  runTests() {
    this.log('\n🧪 Test Execution:', 'blue');
    
    if (fs.existsSync('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (pkg.scripts && pkg.scripts.test) {
          this.log('Running tests...', 'cyan');
          try {
            const testOutput = execSync('npm test 2>&1', { encoding: 'utf8', stdio: 'pipe' });
            this.log('✅ All tests passing', 'green');
            this.testResults = { passed: true, output: testOutput };
          } catch (e) {
            this.log('❌ Some tests failing', 'red');
            this.testResults = { passed: false, output: e.stdout || e.message };
            this.codeIssues.push('Failing tests detected');
          }
        } else {
          this.log('⚠️  No test script found', 'yellow');
        }
      } catch (e) {
        this.log('⚠️  Could not run tests', 'yellow');
      }
    }
  }

  scanForIssues() {
    this.log('\n🔍 Scanning for common issues:', 'blue');
    
    const issues = [];
    
    // Check for console.log statements
    try {
      const consoleLogs = execSync('grep -r "console.log" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . 2>/dev/null | wc -l', { encoding: 'utf8' });
      const count = parseInt(consoleLogs.trim());
      if (count > 0) {
        issues.push(`${count} console.log statements found`);
        this.log(`⚠️  Found ${count} console.log statements`, 'yellow');
      }
    } catch (e) {}
    
    // Check for TODOs
    try {
      const todos = execSync('grep -r "TODO\|FIXME" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . 2>/dev/null | wc -l', { encoding: 'utf8' });
      const todoCount = parseInt(todos.trim());
      if (todoCount > 0) {
        issues.push(`${todoCount} TODO/FIXME comments found`);
        this.log(`⚠️  Found ${todoCount} TODO/FIXME comments`, 'yellow');
      }
    } catch (e) {}
    
    // Check for large files
    try {
      const largeFiles = execSync('find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | awk \'$1 > 500\' | wc -l', { encoding: 'utf8' });
      const largeCount = parseInt(largeFiles.trim());
      if (largeCount > 0) {
        issues.push(`${largeCount} files over 500 lines`);
        this.log(`⚠️  Found ${largeCount} files over 500 lines`, 'yellow');
      }
    } catch (e) {}
    
    if (issues.length === 0) {
      this.log('✅ No common issues detected', 'green');
    }
    
    this.codeIssues = [...this.codeIssues, ...issues];
  }

  async waitForCommand() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const processCommand = (input) => {
      const trimmed = input.trim();
      
      if (trimmed.startsWith('qc confirm')) {
        const summary = trimmed.replace('qc confirm', '').trim();
        this.verifySummary(summary);
        rl.close();
      } else if (trimmed === 'qc report') {
        this.generateReport();
        rl.question('\n> ', processCommand);
      } else if (trimmed === 'qc help') {
        this.showHelp();
        rl.question('\n> ', processCommand);
      } else if (trimmed === 'exit' || trimmed === 'quit') {
        this.log('\n👋 QA verification complete', 'green');
        rl.close();
      } else {
        this.log('Unknown command. Use "qc help" for available commands', 'yellow');
        rl.question('\n> ', processCommand);
      }
    };
    
    rl.question('> ', processCommand);
  }

  verifySummary(summary) {
    this.header('VERIFICATION REPORT');
    
    if (!summary) {
      this.log('❌ No summary provided', 'red');
      return;
    }
    
    this.agentSummary = summary;
    
    // Display full summary intelligently
    this.displaySummaryIntelligently(summary);
    
    // Extract quantitative metrics from summary
    const claimedMetrics = this.extractQuantitativeMetrics(summary);
    
    // Get actual git diff for verification
    this.gitDiff = this.getGitDiff();
    
    // Parse and verify claims with enhanced verification
    const verification = this.performEnhancedVerification(summary, claimedMetrics);
    
    // Calculate trust score
    const trustScore = this.calculateTrustScore(verification);
    
    // Generate detailed report with trust score
    this.generateEnhancedReport(verification, trustScore, claimedMetrics);
  }

  performEnhancedVerification(summary, claimedMetrics) {
    const results = {
      confirmed: [],
      missing: [],
      partial: [],
      exaggerated: [],
      issues: this.codeIssues,
      fileVerification: {},
      testVerification: {},
      metricsVerification: {}
    };
    
    // Verify file operations
    const fileOps = this.verifyFileOperations(summary, claimedMetrics);
    results.fileVerification = fileOps;
    results.confirmed.push(...fileOps.confirmed);
    results.missing.push(...fileOps.missing);
    results.exaggerated.push(...fileOps.exaggerated);
    
    // Verify test claims
    const testClaims = this.analyzeTestClaims(summary, claimedMetrics);
    results.testVerification = testClaims;
    results.confirmed.push(...testClaims.confirmed);
    results.partial.push(...testClaims.partial);
    results.exaggerated.push(...testClaims.exaggerated);
    
    // Verify quantitative metrics
    const metricsVerification = this.verifyQuantitativeMetrics(claimedMetrics);
    results.metricsVerification = metricsVerification;
    results.confirmed.push(...metricsVerification.confirmed);
    results.exaggerated.push(...metricsVerification.exaggerated);
    
    // Check for task completion patterns
    const taskPatterns = this.extractTaskPatterns(summary);
    taskPatterns.completed.forEach(task => {
      if (this.verifyTaskCompletion(task)) {
        results.confirmed.push(`Task completed: ${task}`);
      } else {
        results.partial.push(`Task claimed but not verified: ${task}`);
      }
    });
    
    return results;
  }

  // Keep old method for backward compatibility
  performVerification(summary) {
    const results = {
      confirmed: [],
      missing: [],
      partial: [],
      issues: this.codeIssues
    };
    
    // Extract file mentions from summary
    const filePattern = /([\w\/\-\.]+\.(js|ts|jsx|tsx|json|md|css|html))/gi;
    const mentionedFiles = summary.match(filePattern) || [];
    
    // Verify each mentioned file
    mentionedFiles.forEach(file => {
      const fullPath = path.join(this.projectDir, file);
      if (fs.existsSync(fullPath)) {
        results.confirmed.push(`File exists: ${file}`);
      } else if (fs.existsSync(file)) {
        results.confirmed.push(`File exists: ${file}`);
      } else {
        results.missing.push(`File not found: ${file}`);
      }
    });
    
    // Check for test mentions
    if (summary.toLowerCase().includes('test')) {
      if (this.testResults) {
        if (this.testResults.passed) {
          results.confirmed.push('Tests mentioned and passing');
        } else {
          results.partial.push('Tests mentioned but some failing');
        }
      } else {
        results.partial.push('Tests mentioned but no test suite found');
      }
    }
    
    // Check git status alignment
    if (this.recentChanges.length > 0) {
      results.confirmed.push(`${this.recentChanges.length} files modified in git`);
    }
    
    return results;
  }

  // Add all the new verification methods here
  displaySummaryIntelligently(summary) {
    this.log('AGENT SUMMARY:', 'bright');
    console.log('─'.repeat(50));
    
    // Parse structured content
    const lines = summary.split('\n');
    let displayedLines = 0;
    const maxInitialLines = 10;
    
    // Display first portion
    for (let i = 0; i < Math.min(lines.length, maxInitialLines); i++) {
      console.log(lines[i]);
      displayedLines++;
    }
    
    if (lines.length > maxInitialLines) {
      // Intelligently summarize remaining content
      const remaining = lines.slice(maxInitialLines);
      const taskCount = remaining.filter(l => l.includes('✅')).length;
      const errorCount = remaining.filter(l => l.includes('❌')).length;
      const fileCount = remaining.filter(l => l.match(/\.(js|ts|jsx|tsx|json|md)/)).length;
      
      console.log(`\n... [${remaining.length} more lines]`);
      if (taskCount > 0) console.log(`    • ${taskCount} completed tasks`);
      if (errorCount > 0) console.log(`    • ${errorCount} errors/issues`);
      if (fileCount > 0) console.log(`    • ${fileCount} file references`);
    }
    
    console.log('─'.repeat(50));
    console.log('');
  }

  extractQuantitativeMetrics(summary) {
    const metrics = {
      errors: [],
      files: [],
      tests: [],
      coverage: null,
      tokens: null,
      percentages: [],
      numbers: []
    };
    
    // Extract error counts (e.g., "Fixed 327 TypeScript errors")
    const errorPatterns = [
      /(?:fixed|resolved|corrected)\s+(\d+)\s+(?:typescript\s+)?errors?/gi,
      /(\d+)\s+(?:typescript\s+)?errors?\s+(?:fixed|resolved|corrected)/gi
    ];
    
    errorPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(summary)) !== null) {
        metrics.errors.push({ count: parseInt(match[1]), context: match[0] });
      }
    });
    
    // Extract file counts (e.g., "across 45 files", "Created 15 new test files")
    const filePatterns = [
      /(?:created|modified|updated|across)\s+(\d+)\s+(?:new\s+)?(?:test\s+)?files?/gi,
      /(\d+)\s+files?\s+(?:created|modified|updated)/gi
    ];
    
    filePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(summary)) !== null) {
        metrics.files.push({ count: parseInt(match[1]), context: match[0] });
      }
    });
    
    // Extract test counts (e.g., "500+ test cases", "15 new test files")
    const testPatterns = [
      /(\d+)\+?\s+test(?:s|\s+cases?)/gi,
      /(\d+)\s+(?:passing|failing)\s+tests?/gi
    ];
    
    testPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(summary)) !== null) {
        metrics.tests.push({ count: parseInt(match[1]), context: match[0] });
      }
    });
    
    // Extract coverage percentage (e.g., "99.8% test coverage")
    const coveragePattern = /(\d+(?:\.\d+)?)%\s+(?:test\s+)?coverage/gi;
    const coverageMatch = coveragePattern.exec(summary);
    if (coverageMatch) {
      metrics.coverage = parseFloat(coverageMatch[1]);
    }
    
    // Extract token usage (e.g., "Reduced token usage by 67.3%")
    const tokenPattern = /(?:reduced|decreased|saved).*?tokens?.*?(\d+(?:\.\d+)?)%/gi;
    const tokenMatch = tokenPattern.exec(summary);
    if (tokenMatch) {
      metrics.tokens = parseFloat(tokenMatch[1]);
    }
    
    // Extract all percentages
    const percentagePattern = /(\d+(?:\.\d+)?)%/g;
    let match;
    while ((match = percentagePattern.exec(summary)) !== null) {
      metrics.percentages.push({ value: parseFloat(match[1]), context: match[0] });
    }
    
    // Extract all numbers for general verification
    const numberPattern = /\b(\d+)\b/g;
    while ((match = numberPattern.exec(summary)) !== null) {
      const num = parseInt(match[1]);
      if (num > 0 && num < 100000) { // Reasonable range
        metrics.numbers.push(num);
      }
    }
    
    return metrics;
  }

  getGitDiff() {
    try {
      const diff = execSync('git diff --stat HEAD~1 2>/dev/null || git diff --stat --cached', { encoding: 'utf8' });
      const diffDetails = execSync('git diff --name-status HEAD~1 2>/dev/null || git diff --name-status --cached', { encoding: 'utf8' });
      
      return {
        summary: diff,
        details: diffDetails,
        files: this.parseGitDiffFiles(diffDetails)
      };
    } catch (e) {
      return null;
    }
  }

  parseGitDiffFiles(diffDetails) {
    const files = {
      added: [],
      modified: [],
      deleted: []
    };
    
    const lines = diffDetails.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const status = parts[0];
        const file = parts[1];
        
        if (status === 'A') files.added.push(file);
        else if (status === 'M') files.modified.push(file);
        else if (status === 'D') files.deleted.push(file);
      }
    });
    
    return files;
  }

  verifyFileOperations(summary, claimedMetrics) {
    const results = {
      confirmed: [],
      missing: [],
      exaggerated: []
    };
    
    if (!this.gitDiff) {
      results.missing.push('Unable to verify file operations (no git diff available)');
      return results;
    }
    
    const actualFiles = this.gitDiff.files;
    const totalActualFiles = actualFiles.added.length + actualFiles.modified.length;
    
    // Check claimed file counts
    claimedMetrics.files.forEach(claim => {
      if (claim.context.toLowerCase().includes('created')) {
        if (actualFiles.added.length > 0) {
          if (Math.abs(actualFiles.added.length - claim.count) <= 2) {
            results.confirmed.push(`File creation claim verified: ${actualFiles.added.length} files actually created`);
          } else if (actualFiles.added.length < claim.count) {
            results.exaggerated.push(`Claimed ${claim.count} files created, actually ${actualFiles.added.length}`);
          }
        } else if (claim.count > 0) {
          results.exaggerated.push(`Claimed ${claim.count} files created, but none found in git`);
        }
      } else if (claim.context.toLowerCase().includes('modified') || claim.context.toLowerCase().includes('across')) {
        if (Math.abs(totalActualFiles - claim.count) <= 5) {
          results.confirmed.push(`File modification claim verified: ${totalActualFiles} files actually changed`);
        } else if (totalActualFiles < claim.count) {
          results.exaggerated.push(`Claimed ${claim.count} files modified, actually ${totalActualFiles}`);
        }
      }
    });
    
    // Verify specific file mentions
    const filePattern = /([\w\/\-\.]+\.(js|ts|jsx|tsx|json|md|css|html))/gi;
    const mentionedFiles = summary.match(filePattern) || [];
    
    mentionedFiles.forEach(file => {
      const fileName = path.basename(file);
      const found = [...actualFiles.added, ...actualFiles.modified].some(f => 
        f.includes(fileName) || f.endsWith(file)
      );
      
      if (found) {
        results.confirmed.push(`File verified: ${file}`);
      } else if (fs.existsSync(path.join(this.projectDir, file))) {
        results.confirmed.push(`File exists: ${file}`);
      } else {
        results.missing.push(`File not found in git or filesystem: ${file}`);
      }
    });
    
    return results;
  }

  analyzeTestClaims(summary, claimedMetrics) {
    const results = {
      confirmed: [],
      partial: [],
      exaggerated: []
    };
    
    // Run actual tests to get real numbers
    let actualTestCount = 0;
    let actualCoverage = 0;
    
    try {
      const testOutput = execSync('npm test -- --reporter=json 2>/dev/null || npm test 2>&1', { 
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
      });
      
      // Try to parse test count from output
      const passingMatch = testOutput.match(/(\d+)\s+passing/i);
      const failingMatch = testOutput.match(/(\d+)\s+failing/i);
      
      if (passingMatch) {
        actualTestCount = parseInt(passingMatch[1]);
        this.actualMetrics.testsPassing = actualTestCount;
      }
      if (failingMatch) {
        this.actualMetrics.testsFailing = parseInt(failingMatch[1]);
      }
      
      // Try to extract coverage
      const coverageMatch = testOutput.match(/(?:coverage|statements)\s*:\s*(\d+(?:\.\d+)?)%/i);
      if (coverageMatch) {
        actualCoverage = parseFloat(coverageMatch[1]);
        this.actualMetrics.coverage = actualCoverage;
      }
    } catch (e) {
      // Tests failed or not available
    }
    
    // Verify test count claims
    claimedMetrics.tests.forEach(claim => {
      if (actualTestCount > 0) {
        const difference = Math.abs(actualTestCount - claim.count);
        const percentDiff = (difference / claim.count) * 100;
        
        if (percentDiff <= 10) {
          results.confirmed.push(`Test count verified: ~${actualTestCount} tests`);
        } else if (actualTestCount < claim.count) {
          results.exaggerated.push(`Claimed ${claim.count} tests, found ${actualTestCount}`);
        } else {
          results.confirmed.push(`More tests than claimed: ${actualTestCount} actual vs ${claim.count} claimed`);
        }
      } else {
        results.partial.push(`Cannot verify ${claim.count} tests claimed (tests not running)`);
      }
    });
    
    // Verify coverage claims
    if (claimedMetrics.coverage !== null) {
      if (actualCoverage > 0) {
        const coverageDiff = Math.abs(actualCoverage - claimedMetrics.coverage);
        
        if (coverageDiff <= 2) {
          results.confirmed.push(`Coverage verified: ${actualCoverage}%`);
        } else if (actualCoverage < claimedMetrics.coverage) {
          results.exaggerated.push(`Claimed ${claimedMetrics.coverage}% coverage, actual ${actualCoverage}%`);
        }
      } else {
        results.partial.push(`Cannot verify ${claimedMetrics.coverage}% coverage claim`);
      }
    }
    
    return results;
  }

  verifyQuantitativeMetrics(claimedMetrics) {
    const results = {
      confirmed: [],
      exaggerated: []
    };
    
    // Verify error fix claims
    if (claimedMetrics.errors.length > 0) {
      // Try to run linting/type checking to see current error count
      let currentErrors = 0;
      
      try {
        execSync('npm run typecheck 2>&1', { encoding: 'utf8', stdio: 'pipe' });
        // If it passes, no errors
        currentErrors = 0;
      } catch (e) {
        // Count errors in output
        const errorMatches = (e.stdout || '').match(/error/gi);
        currentErrors = errorMatches ? errorMatches.length : 0;
      }
      
      claimedMetrics.errors.forEach(claim => {
        if (currentErrors === 0) {
          results.confirmed.push(`Error fixes verified: No TypeScript errors remaining`);
        } else {
          results.exaggerated.push(`Claimed to fix ${claim.count} errors, but ${currentErrors} remain`);
        }
      });
    }
    
    // Verify token reduction claims
    if (claimedMetrics.tokens !== null) {
      // Check if there's actual evidence of optimization
      const hasOptimization = this.checkForOptimizations();
      
      if (hasOptimization) {
        results.confirmed.push(`Code optimization detected (token reduction claim plausible)`);
      } else {
        results.exaggerated.push(`Token reduction of ${claimedMetrics.tokens}% claimed but no clear optimizations found`);
      }
    }
    
    return results;
  }

  checkForOptimizations() {
    try {
      // Check git diff for signs of optimization
      const diff = execSync('git diff HEAD~1 2>/dev/null || git diff --cached', { encoding: 'utf8' });
      
      // Look for optimization patterns
      const optimizationPatterns = [
        /\-.*?\n\+[^\n]*?(?:reduce|optimize|simplif|compact|minif)/i,
        /removed?\s+unused/i,
        /consolidat/i,
        /refactor/i
      ];
      
      return optimizationPatterns.some(pattern => pattern.test(diff));
    } catch (e) {
      return false;
    }
  }

  extractTaskPatterns(summary) {
    const patterns = {
      completed: [],
      partial: [],
      failed: []
    };
    
    // Look for task completion markers
    const lines = summary.split('\n');
    lines.forEach(line => {
      if (line.includes('✅')) {
        patterns.completed.push(line.replace('✅', '').trim());
      } else if (line.includes('⚠️')) {
        patterns.partial.push(line.replace('⚠️', '').trim());
      } else if (line.includes('❌')) {
        patterns.failed.push(line.replace('❌', '').trim());
      }
    });
    
    return patterns;
  }

  verifyTaskCompletion(task) {
    // Basic verification - check if related files exist or were modified
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('test')) {
      return this.testResults && this.testResults.passed;
    }
    
    if (taskLower.includes('fix') && taskLower.includes('error')) {
      return this.codeIssues.length === 0;
    }
    
    if (taskLower.includes('implement') || taskLower.includes('create')) {
      // Check if files were actually created/modified
      return this.gitDiff && this.gitDiff.files.added.length > 0;
    }
    
    // Default: assume completed if marked as such
    return true;
  }

  calculateTrustScore(verification) {
    const totalClaims = 
      verification.confirmed.length + 
      verification.missing.length + 
      verification.partial.length + 
      verification.exaggerated.length;
    
    if (totalClaims === 0) return 100;
    
    // Weight different verification types
    const confirmedScore = verification.confirmed.length * 1.0;
    const partialScore = verification.partial.length * 0.5;
    const missingScore = verification.missing.length * 0;
    const exaggeratedScore = verification.exaggerated.length * 0.25;
    
    const totalScore = confirmedScore + partialScore + missingScore + exaggeratedScore;
    const trustPercentage = Math.round((totalScore / totalClaims) * 100);
    
    return Math.max(0, Math.min(100, trustPercentage));
  }

  getTrustScoreColor(score) {
    if (score >= 90) return 'green';
    if (score >= 70) return 'cyan';
    if (score >= 50) return 'yellow';
    return 'red';
  }

  getTrustScoreEmoji(score) {
    if (score >= 90) return '🏆';
    if (score >= 70) return '✅';
    if (score >= 50) return '⚠️';
    return '❌';
  }

  generateEnhancedReport(verification, trustScore, claimedMetrics) {
    console.log('═'.repeat(50));
    
    // Trust Score Display
    const scoreColor = this.getTrustScoreColor(trustScore);
    const scoreEmoji = this.getTrustScoreEmoji(trustScore);
    
    this.log(`\n${scoreEmoji} TRUST SCORE: ${trustScore}%`, scoreColor);
    this.drawProgressBar(trustScore);
    console.log('');
    
    // Detailed Verification Results
    this.log('VERIFICATION BREAKDOWN:', 'bright');
    console.log('─'.repeat(50));
    
    // Confirmed items
    if (verification.confirmed.length > 0) {
      this.log(`\n✅ CONFIRMED (${verification.confirmed.length}):`, 'green');
      verification.confirmed.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Exaggerated claims
    if (verification.exaggerated.length > 0) {
      this.log(`\n🔍 EXAGGERATED (${verification.exaggerated.length}):`, 'magenta');
      verification.exaggerated.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Partial verifications
    if (verification.partial.length > 0) {
      this.log(`\n⚠️  PARTIAL (${verification.partial.length}):`, 'yellow');
      verification.partial.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Missing items
    if (verification.missing.length > 0) {
      this.log(`\n❌ MISSING/UNVERIFIED (${verification.missing.length}):`, 'red');
      verification.missing.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Issues found
    if (verification.issues.length > 0) {
      this.log(`\n🔧 ISSUES DETECTED (${verification.issues.length}):`, 'yellow');
      verification.issues.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Quantitative Analysis
    console.log('');
    this.log('QUANTITATIVE ANALYSIS:', 'bright');
    console.log('─'.repeat(50));
    
    // Display claimed vs actual metrics
    console.log('\nClaimed vs Actual:');
    
    if (claimedMetrics.files.length > 0) {
      const totalClaimed = Math.max(...claimedMetrics.files.map(f => f.count));
      const totalActual = this.gitDiff ? 
        this.gitDiff.files.added.length + this.gitDiff.files.modified.length : 0;
      console.log(`  Files: ${totalClaimed} claimed → ${totalActual} actual`);
    }
    
    if (claimedMetrics.tests.length > 0) {
      const testsClaimed = Math.max(...claimedMetrics.tests.map(t => t.count));
      const actualTests = this.actualMetrics ? this.actualMetrics.testsPassing : 0;
      console.log(`  Tests: ${testsClaimed} claimed → ${actualTests} actual`);
    }
    
    if (claimedMetrics.coverage !== null) {
      const actualCoverage = this.actualMetrics ? this.actualMetrics.coverage : 0;
      console.log(`  Coverage: ${claimedMetrics.coverage}% claimed → ${actualCoverage}% actual`);
    }
    
    if (claimedMetrics.errors.length > 0) {
      const errorsClaimed = Math.max(...claimedMetrics.errors.map(e => e.count));
      console.log(`  Errors Fixed: ${errorsClaimed} claimed`);
    }
    
    // Category Breakdown
    console.log('\nCategory Analysis:');
    const categories = {
      'File Operations': verification.fileVerification,
      'Test Claims': verification.testVerification,
      'Metrics': verification.metricsVerification
    };
    
    Object.entries(categories).forEach(([category, data]) => {
      if (data.confirmed || data.exaggerated) {
        const confirmed = (data.confirmed || []).length;
        const exaggerated = (data.exaggerated || []).length;
        const accuracy = confirmed > 0 ? Math.round((confirmed / (confirmed + exaggerated)) * 100) : 0;
        console.log(`  ${category}: ${accuracy}% accurate (${confirmed} confirmed, ${exaggerated} exaggerated)`);
      }
    });
    
    // Recommendations
    console.log('');
    this.generateRecommendations(verification);
    
    // Final Verdict
    console.log('');
    const readyForProd = trustScore >= 70 && 
                         verification.missing.length === 0 && 
                         verification.issues.length === 0;
    
    if (readyForProd) {
      this.log(`${scoreEmoji} VERIFICATION PASSED - Ready for Production`, 'green');
    } else if (trustScore >= 50) {
      this.log('⚠️  PARTIAL VERIFICATION - Needs Review', 'yellow');
    } else {
      this.log('❌ VERIFICATION FAILED - Significant Issues', 'red');
    }
    
    console.log(`\nOverall Trust Score: ${trustScore}%`);
    console.log(`Required fixes: ${verification.missing.length + verification.issues.length}`);
    console.log(`Exaggerated claims: ${verification.exaggerated.length}`);
    
    console.log('═'.repeat(50));
  }

  drawProgressBar(percentage) {
    const barLength = 40;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    
    const filledChar = '█';
    const emptyChar = '░';
    
    const color = this.getTrustScoreColor(percentage);
    
    process.stdout.write(colors[color]);
    process.stdout.write('[');
    process.stdout.write(filledChar.repeat(filled));
    process.stdout.write(emptyChar.repeat(empty));
    process.stdout.write(']');
    process.stdout.write(colors.reset);
    console.log(` ${percentage}%`);
  }

  generateDetailedReport(verification) {
    console.log('─'.repeat(50));
    
    // Confirmed items
    if (verification.confirmed.length > 0) {
      this.log(`\n✅ CONFIRMED (${verification.confirmed.length}):`, 'green');
      verification.confirmed.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Missing items
    if (verification.missing.length > 0) {
      this.log(`\n❌ MISSING (${verification.missing.length}):`, 'red');
      verification.missing.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Partial items
    if (verification.partial.length > 0) {
      this.log(`\n⚠️  PARTIAL (${verification.partial.length}):`, 'yellow');
      verification.partial.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Issues found
    if (verification.issues.length > 0) {
      this.log(`\n🔧 ISSUES FOUND (${verification.issues.length}):`, 'yellow');
      verification.issues.forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    // Quality metrics
    console.log('');
    this.log('QUALITY METRICS:', 'bright');
    console.log(`  • Recent commits: ${this.recentChanges.length > 0 ? 'Yes' : 'No'}`);
    console.log(`  • Tests status: ${this.testResults ? (this.testResults.passed ? 'Passing' : 'Failing') : 'Not run'}`);
    console.log(`  • Code issues: ${this.codeIssues.length}`);
    
    // Recommendations
    console.log('');
    this.generateRecommendations(verification);
    
    // Final verdict
    console.log('');
    const readyForProd = verification.missing.length === 0 && 
                         verification.issues.length === 0 && 
                         (!this.testResults || this.testResults.passed);
    
    if (readyForProd) {
      this.log('✅ READY FOR PRODUCTION', 'green');
    } else {
      this.log('❌ NOT READY FOR PRODUCTION', 'red');
      console.log(`Required fixes: ${verification.missing.length + verification.issues.length}`);
    }
    
    console.log('═'.repeat(50));
  }

  generateRecommendations(verification) {
    const recommendations = [];
    
    if (verification.missing.length > 0) {
      recommendations.push("Task('coder', 'Complete missing files implementation')");
    }
    
    if (this.testResults && !this.testResults.passed) {
      recommendations.push("Task('tester', 'Fix failing tests')");
    }
    
    if (this.codeIssues.includes('Linting errors detected')) {
      recommendations.push("Bash('npm run lint --fix')");
    }
    
    if (this.codeIssues.includes('Type errors detected')) {
      recommendations.push("Task('coder', 'Fix TypeScript errors')");
    }
    
    if (recommendations.length > 0) {
      this.log('🔧 RECOMMENDED FIXES:', 'cyan');
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. Run: ${rec}`);
      });
    } else {
      this.log('✅ No immediate fixes required', 'green');
    }
  }

  showHelp() {
    this.log('\nAvailable Commands:', 'bright');
    console.log('  qc confirm "[summary]" - Verify agent work summary');
    console.log('  qc report             - Regenerate last report');
    console.log('  qc help               - Show this help');
    console.log('  exit/quit             - Exit QA verifier');
  }

  generateReport() {
    if (!this.agentSummary) {
      this.log('No summary to report on. Use "qc confirm" first', 'yellow');
      return;
    }
    const verification = this.performVerification(this.agentSummary);
    this.generateDetailedReport(verification);
  }
}

// Main execution
(async () => {
  const qa = new QAVerifier();
  const args = process.argv.slice(2);
  
  // Handle command line arguments
  if (args[0] === 'confirm') {
    // If data is being piped in (from qc command)
    if (!process.stdin.isTTY) {
      let summary = '';
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (chunk) => {
        summary += chunk;
      });
      
      process.stdin.on('end', () => {
        if (summary.trim()) {
          qa.verifySummary(summary.trim());
        } else {
          console.log('⚠️  No summary provided');
        }
        process.exit(0);
      });
    } else {
      // Interactive mode - ask for summary
      console.log('\n📝 Paste the agent work summary below, then press Ctrl+D when done:');
      console.log('─'.repeat(50));
      
      let summary = '';
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (chunk) => {
        summary += chunk;
      });
      
      process.stdin.on('end', () => {
        qa.verifySummary(summary);
        process.exit(0);
      });
    }
  } else if (args[0] === 'help') {
    qa.showHelp();
    process.exit(0);
  } else {
    // Default interactive mode
    qa.initialize().catch(console.error);
  }
})();