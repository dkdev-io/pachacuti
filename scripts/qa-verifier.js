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
    
    this.log('AGENT CLAIMED:', 'bright');
    console.log(summary.substring(0, 200) + (summary.length > 200 ? '...' : ''));
    console.log('');
    
    // Parse and verify claims
    const verification = this.performVerification(summary);
    
    // Generate detailed report
    this.generateDetailedReport(verification);
  }

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

// Start the QA Verifier
const qa = new QAVerifier();
qa.initialize().catch(console.error);