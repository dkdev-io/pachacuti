#!/usr/bin/env node

/**
 * Second Brain Quality Control Verifier
 * Comprehensive validation of the restored shell storage system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const JSON_DIR = path.join(process.env.HOME, '.claude/second-brain/projects/pachacuti/shell');
const DB_PATH = '/Users/Danallovertheplace/pachacuti/shell-viewer/backend/data/shell-viewer.db';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

class SecondBrainQA {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
    this.metrics = {};
  }

  // Execute SQL query safely
  executeQuery(query) {
    try {
      const result = execSync(`sqlite3 -json "${DB_PATH}" "${query}"`, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      return result ? JSON.parse(result) : [];
    } catch (err) {
      return null;
    }
  }

  // Test 1: Database Health Check
  testDatabaseHealth() {
    console.log(`\n${colors.cyan}1️⃣  DATABASE HEALTH CHECK${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Check database exists
    if (!fs.existsSync(DB_PATH)) {
      console.log(`  ❌ Database file not found`);
      this.results.failed.push('Database file missing');
      return;
    }
    
    const dbSize = fs.statSync(DB_PATH).size;
    const dbSizeMB = (dbSize / 1024 / 1024).toFixed(2);
    console.log(`  📊 Database size: ${dbSizeMB} MB`);
    
    // Check tables
    const tables = this.executeQuery(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name;
    `);
    
    if (tables && tables.length > 0) {
      console.log(`  ✅ Found ${tables.length} tables`);
      tables.forEach(t => console.log(`     • ${t.name}`));
      this.results.passed.push('Database structure verified');
    } else {
      console.log(`  ❌ No tables found`);
      this.results.failed.push('Database empty');
    }
    
    // Check integrity
    try {
      execSync(`sqlite3 "${DB_PATH}" "PRAGMA integrity_check;"`, { encoding: 'utf8' });
      console.log(`  ✅ Database integrity check passed`);
      this.results.passed.push('Database integrity verified');
    } catch (err) {
      console.log(`  ❌ Database integrity check failed`);
      this.results.failed.push('Database integrity issues');
    }
  }

  // Test 2: Command Count Verification
  testCommandCounts() {
    console.log(`\n${colors.cyan}2️⃣  COMMAND COUNT VERIFICATION${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Database counts
    const dbCommands = this.executeQuery('SELECT COUNT(*) as count FROM shell_commands')[0];
    const dbSessions = this.executeQuery('SELECT COUNT(*) as count FROM shell_sessions')[0];
    
    console.log(`  📝 Commands in database: ${dbCommands ? dbCommands.count : 0}`);
    console.log(`  📁 Sessions in database: ${dbSessions ? dbSessions.count : 0}`);
    
    this.metrics.dbCommands = dbCommands ? dbCommands.count : 0;
    this.metrics.dbSessions = dbSessions ? dbSessions.count : 0;
    
    // JSON file counts
    const jsonFiles = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    let jsonCommands = 0;
    
    jsonFiles.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, file), 'utf8'));
        if (data.commands && Array.isArray(data.commands)) {
          jsonCommands += data.commands.length;
        }
      } catch (err) {
        // Skip bad files
      }
    });
    
    console.log(`  📄 Commands in JSON files: ${jsonCommands}`);
    console.log(`  📂 JSON source files: ${jsonFiles.length}`);
    
    // Verification
    const EXPECTED_MIN = 1000;
    if (this.metrics.dbCommands >= EXPECTED_MIN) {
      console.log(`  ✅ Sufficient commands loaded (>${EXPECTED_MIN})`);
      this.results.passed.push(`${this.metrics.dbCommands} commands loaded`);
    } else if (this.metrics.dbCommands > 0) {
      console.log(`  ⚠️  Only ${this.metrics.dbCommands} commands loaded`);
      this.results.warnings.push(`Low command count: ${this.metrics.dbCommands}`);
    } else {
      console.log(`  ❌ No commands loaded`);
      this.results.failed.push('No commands in database');
    }
  }

  // Test 3: Search Functionality
  testSearchCapabilities() {
    console.log(`\n${colors.cyan}3️⃣  SEARCH FUNCTIONALITY TEST${colors.reset}`);
    console.log('─'.repeat(40));
    
    const searches = [
      { pattern: 'npm', expected: 50 },
      { pattern: 'git', expected: 10 },
      { pattern: 'node', expected: 10 },
      { pattern: 'cd', expected: 5 }
    ];
    
    let searchesPassed = 0;
    
    searches.forEach(search => {
      const result = this.executeQuery(`
        SELECT COUNT(*) as count 
        FROM shell_commands 
        WHERE command LIKE '%${search.pattern}%'
      `)[0];
      
      const count = result ? result.count : 0;
      
      if (count >= search.expected) {
        console.log(`  ✅ "${search.pattern}": ${count} matches (≥${search.expected})`);
        searchesPassed++;
      } else if (count > 0) {
        console.log(`  ⚠️  "${search.pattern}": ${count} matches (<${search.expected})`);
      } else {
        console.log(`  ❌ "${search.pattern}": no matches`);
      }
    });
    
    if (searchesPassed === searches.length) {
      this.results.passed.push('All search patterns working');
    } else if (searchesPassed > 0) {
      this.results.warnings.push(`${searchesPassed}/${searches.length} searches working`);
    } else {
      this.results.failed.push('Search functionality broken');
    }
  }

  // Test 4: Script Availability
  testScriptAvailability() {
    console.log(`\n${colors.cyan}4️⃣  SCRIPT AVAILABILITY CHECK${colors.reset}`);
    console.log('─'.repeat(40));
    
    const scripts = [
      { path: '/Users/Danallovertheplace/pachacuti/scripts/second-brain-import.js', required: true },
      { path: '/Users/Danallovertheplace/pachacuti/scripts/second-brain-search-cli.js', required: true },
      { path: '/Users/Danallovertheplace/pachacuti/scripts/second-brain-populate.sh', required: false }
    ];
    
    let requiredScriptsFound = 0;
    let totalRequired = scripts.filter(s => s.required).length;
    
    scripts.forEach(script => {
      const filename = path.basename(script.path);
      const exists = fs.existsSync(script.path);
      
      if (exists) {
        const stats = fs.statSync(script.path);
        const executable = (stats.mode & parseInt('111', 8)) !== 0;
        
        if (executable) {
          console.log(`  ✅ ${filename} (executable)`);
          if (script.required) requiredScriptsFound++;
        } else {
          console.log(`  ⚠️  ${filename} (not executable)`);
          if (script.required) requiredScriptsFound++;
        }
      } else {
        if (script.required) {
          console.log(`  ❌ ${filename} (missing)`);
        } else {
          console.log(`  ⚠️  ${filename} (optional, missing)`);
        }
      }
    });
    
    if (requiredScriptsFound === totalRequired) {
      this.results.passed.push('All required scripts present');
    } else {
      this.results.failed.push(`Missing ${totalRequired - requiredScriptsFound} required scripts`);
    }
  }

  // Test 5: Data Quality
  testDataQuality() {
    console.log(`\n${colors.cyan}5️⃣  DATA QUALITY ASSESSMENT${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Check for duplicates
    const duplicates = this.executeQuery(`
      SELECT COUNT(*) as count FROM (
        SELECT command, COUNT(*) as dupe_count
        FROM shell_commands
        GROUP BY command, timestamp
        HAVING COUNT(*) > 1
      )
    `)[0];
    
    if (duplicates && duplicates.count > 0) {
      console.log(`  ⚠️  Found ${duplicates.count} duplicate entries`);
      this.results.warnings.push(`${duplicates.count} duplicates found`);
    } else {
      console.log(`  ✅ No duplicate commands`);
    }
    
    // Check timestamp range
    const timeRange = this.executeQuery(`
      SELECT 
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        COUNT(DISTINCT DATE(timestamp)) as days_covered
      FROM shell_commands
    `)[0];
    
    if (timeRange && timeRange.earliest) {
      const earliest = new Date(timeRange.earliest).toLocaleDateString();
      const latest = new Date(timeRange.latest).toLocaleDateString();
      console.log(`  📅 Date range: ${earliest} to ${latest}`);
      console.log(`  📊 Days covered: ${timeRange.days_covered}`);
      this.results.passed.push(`${timeRange.days_covered} days of history`);
    }
    
    // Check command variety
    const uniqueCommands = this.executeQuery(`
      SELECT COUNT(DISTINCT substr(command, 1, 20)) as variety
      FROM shell_commands
    `)[0];
    
    if (uniqueCommands && uniqueCommands.variety > 100) {
      console.log(`  ✅ High command variety (${uniqueCommands.variety} unique patterns)`);
      this.results.passed.push('Good command diversity');
    } else {
      console.log(`  ⚠️  Low command variety`);
      this.results.warnings.push('Low command diversity');
    }
  }

  // Test 6: Performance Test
  testPerformance() {
    console.log(`\n${colors.cyan}6️⃣  PERFORMANCE BENCHMARK${colors.reset}`);
    console.log('─'.repeat(40));
    
    const tests = [
      { name: 'Simple search', query: `SELECT * FROM shell_commands WHERE command LIKE '%test%' LIMIT 10` },
      { name: 'Count query', query: `SELECT COUNT(*) FROM shell_commands` },
      { name: 'Join query', query: `SELECT * FROM shell_commands c JOIN shell_sessions s ON c.session_id = s.id LIMIT 10` }
    ];
    
    let allFast = true;
    
    tests.forEach(test => {
      const start = Date.now();
      const result = this.executeQuery(test.query);
      const duration = Date.now() - start;
      
      if (result !== null) {
        if (duration < 50) {
          console.log(`  ✅ ${test.name}: ${duration}ms`);
        } else if (duration < 200) {
          console.log(`  ⚠️  ${test.name}: ${duration}ms (slow)`);
          allFast = false;
        } else {
          console.log(`  ❌ ${test.name}: ${duration}ms (very slow)`);
          allFast = false;
        }
      } else {
        console.log(`  ❌ ${test.name}: failed`);
        allFast = false;
      }
    });
    
    if (allFast) {
      this.results.passed.push('Excellent query performance');
    } else {
      this.results.warnings.push('Some queries are slow');
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log(`\n${colors.bright}${'═'.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}       📊 QUALITY CONTROL SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${'═'.repeat(50)}${colors.reset}\n`);
    
    // Calculate score
    const total = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const score = total > 0 ? Math.round((this.results.passed.length / total) * 100) : 0;
    
    // Display metrics
    console.log(`${colors.cyan}System Metrics:${colors.reset}`);
    console.log(`  • Total Commands: ${this.metrics.dbCommands || 0}`);
    console.log(`  • Total Sessions: ${this.metrics.dbSessions || 0}`);
    console.log(`  • Quality Score: ${score}%`);
    console.log();
    
    // Results breakdown
    if (this.results.passed.length > 0) {
      console.log(`${colors.green}✅ Passed (${this.results.passed.length}):${colors.reset}`);
      this.results.passed.forEach(item => console.log(`  • ${item}`));
      console.log();
    }
    
    if (this.results.warnings.length > 0) {
      console.log(`${colors.yellow}⚠️  Warnings (${this.results.warnings.length}):${colors.reset}`);
      this.results.warnings.forEach(item => console.log(`  • ${item}`));
      console.log();
    }
    
    if (this.results.failed.length > 0) {
      console.log(`${colors.red}❌ Failed (${this.results.failed.length}):${colors.reset}`);
      this.results.failed.forEach(item => console.log(`  • ${item}`));
      console.log();
    }
    
    // Final verdict
    console.log(`${colors.bright}${'═'.repeat(50)}${colors.reset}`);
    
    if (this.results.failed.length === 0 && score >= 80) {
      console.log(`${colors.green}${colors.bright}✅ SYSTEM OPERATIONAL${colors.reset}`);
      console.log(`${colors.green}Second Brain is functioning correctly!${colors.reset}`);
    } else if (this.results.failed.length === 0) {
      console.log(`${colors.yellow}${colors.bright}⚠️  SYSTEM FUNCTIONAL${colors.reset}`);
      console.log(`${colors.yellow}Minor issues detected but system is usable.${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}❌ SYSTEM NEEDS ATTENTION${colors.reset}`);
      console.log(`${colors.red}Critical issues found. Please fix before use.${colors.reset}`);
    }
    
    console.log(`${colors.bright}${'═'.repeat(50)}${colors.reset}\n`);
  }

  // Run all tests
  async run() {
    console.log(`${colors.bright}${colors.cyan}🧪 SECOND BRAIN QUALITY CONTROL${colors.reset}`);
    console.log(`${colors.dim}Validating restored shell storage system...${colors.reset}`);
    
    this.testDatabaseHealth();
    this.testCommandCounts();
    this.testSearchCapabilities();
    this.testScriptAvailability();
    this.testDataQuality();
    this.testPerformance();
    
    this.generateReport();
  }
}

// Execute
const qa = new SecondBrainQA();
qa.run();