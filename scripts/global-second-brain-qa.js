#!/usr/bin/env node

/**
 * Global Second Brain Quality Control System
 * Comprehensive validation across all projects and sessions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SECOND_BRAIN_DIR = path.join(process.env.HOME, '.claude/second-brain');
const DB_PATH = path.join(SECOND_BRAIN_DIR, 'database/global-shell-brain.db');
const PROJECTS_DIR = path.join(SECOND_BRAIN_DIR, 'projects');

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

class GlobalSecondBrainQA {
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
        maxBuffer: 10 * 1024 * 1024
      });
      return result ? JSON.parse(result) : [];
    } catch (err) {
      return null;
    }
  }

  // Test 1: Global Database Health
  testGlobalDatabaseHealth() {
    console.log(`\n${colors.cyan}1️⃣  GLOBAL DATABASE HEALTH CHECK${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Check database exists
    if (!fs.existsSync(DB_PATH)) {
      console.log(`  ❌ Global database not found`);
      this.results.failed.push('Global database missing');
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
      this.results.passed.push('Global database structure verified');
    } else {
      console.log(`  ❌ No tables found`);
      this.results.failed.push('Database empty');
    }
  }

  // Test 2: Multi-Project Data Verification
  testMultiProjectData() {
    console.log(`\n${colors.cyan}2️⃣  MULTI-PROJECT DATA VERIFICATION${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Get project statistics
    const projectStats = this.executeQuery(`
      SELECT 
        project_name,
        COUNT(*) as command_count,
        COUNT(DISTINCT session_id) as session_count,
        MIN(timestamp) as first_command,
        MAX(timestamp) as last_command
      FROM shell_commands 
      WHERE project_name IS NOT NULL
      GROUP BY project_name 
      ORDER BY command_count DESC
    `);
    
    if (projectStats && projectStats.length > 0) {
      console.log(`  📊 Found ${projectStats.length} projects in database:`);
      
      let totalCommands = 0;
      let totalSessions = 0;
      
      projectStats.forEach((project, index) => {
        const cmdCount = project.command_count;
        const sessCount = project.session_count;
        totalCommands += cmdCount;
        totalSessions += sessCount;
        
        console.log(`    ${index + 1}. ${project.project_name}`);
        console.log(`       Commands: ${cmdCount}, Sessions: ${sessCount}`);
      });
      
      this.metrics.totalProjects = projectStats.length;
      this.metrics.totalCommands = totalCommands;
      this.metrics.totalSessions = totalSessions;
      
      console.log(`  📈 Grand totals: ${totalCommands} commands, ${totalSessions} sessions`);
      
      // Verify expected minimum
      if (projectStats.length >= 5 && totalCommands >= 1000) {
        console.log(`  ✅ Multi-project system operational`);
        this.results.passed.push(`${projectStats.length} projects with ${totalCommands} commands`);
      } else {
        console.log(`  ⚠️  Limited project coverage`);
        this.results.warnings.push(`Only ${projectStats.length} projects, ${totalCommands} commands`);
      }
      
    } else {
      console.log(`  ❌ No project data found`);
      this.results.failed.push('No multi-project data');
    }
  }

  // Test 3: Cross-Project Search Functionality
  testCrossProjectSearch() {
    console.log(`\n${colors.cyan}3️⃣  CROSS-PROJECT SEARCH TEST${colors.reset}`);
    console.log('─'.repeat(50));
    
    const searchTests = [
      { pattern: 'npm', expected: 10, description: 'npm commands across projects' },
      { pattern: 'git', expected: 5, description: 'git commands across projects' },
      { pattern: 'node', expected: 5, description: 'node commands across projects' },
      { pattern: 'cd', expected: 3, description: 'cd commands across projects' }
    ];
    
    let searchesPassed = 0;
    let projectsWithResults = new Set();
    
    searchTests.forEach(test => {
      const results = this.executeQuery(`
        SELECT project_name, COUNT(*) as count 
        FROM shell_commands 
        WHERE command LIKE '%${test.pattern}%'
        GROUP BY project_name
      `);
      
      if (results && results.length > 0) {
        let totalMatches = results.reduce((sum, r) => sum + r.count, 0);
        
        if (totalMatches >= test.expected) {
          console.log(`  ✅ "${test.pattern}": ${totalMatches} matches across ${results.length} projects`);
          results.forEach(r => {
            projectsWithResults.add(r.project_name);
            console.log(`     • ${r.project_name}: ${r.count}`);
          });
          searchesPassed++;
        } else {
          console.log(`  ⚠️  "${test.pattern}": ${totalMatches} matches (<${test.expected})`);
        }
      } else {
        console.log(`  ❌ "${test.pattern}": no matches`);
      }
    });
    
    console.log(`  🌐 Cross-project coverage: ${projectsWithResults.size} projects have searchable data`);
    
    if (searchesPassed === searchTests.length && projectsWithResults.size >= 3) {
      this.results.passed.push('Cross-project search fully functional');
    } else if (searchesPassed > 0) {
      this.results.warnings.push(`${searchesPassed}/${searchTests.length} searches working across ${projectsWithResults.size} projects`);
    } else {
      this.results.failed.push('Cross-project search not working');
    }
  }

  // Test 4: Source Data Integrity
  testSourceDataIntegrity() {
    console.log(`\n${colors.cyan}4️⃣  SOURCE DATA INTEGRITY CHECK${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Check source JSON files
    if (!fs.existsSync(PROJECTS_DIR)) {
      console.log(`  ❌ Projects directory not found`);
      this.results.failed.push('Source projects directory missing');
      return;
    }
    
    const projects = fs.readdirSync(PROJECTS_DIR).filter(item => {
      return fs.statSync(path.join(PROJECTS_DIR, item)).isDirectory();
    });
    
    console.log(`  📁 Source projects: ${projects.length}`);
    
    let totalSourceFiles = 0;
    let totalSourceCommands = 0;
    
    projects.forEach(project => {
      const shellDir = path.join(PROJECTS_DIR, project, 'shell');
      if (fs.existsSync(shellDir)) {
        const jsonFiles = fs.readdirSync(shellDir).filter(f => f.endsWith('-commands.json'));
        totalSourceFiles += jsonFiles.length;
        
        // Count commands in source files
        let projectCommands = 0;
        jsonFiles.forEach(file => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(shellDir, file), 'utf8'));
            if (data.commands && Array.isArray(data.commands)) {
              projectCommands += data.commands.length;
            }
          } catch (err) {
            // Skip bad files
          }
        });
        
        totalSourceCommands += projectCommands;
        console.log(`    ${project}: ${jsonFiles.length} files, ~${projectCommands} commands`);
      }
    });
    
    console.log(`  📊 Source totals: ${totalSourceFiles} files, ~${totalSourceCommands} commands`);
    
    // Compare with database
    const dbTotal = this.metrics.totalCommands || 0;
    const coverage = dbTotal > 0 ? ((dbTotal / totalSourceCommands) * 100).toFixed(1) : 0;
    
    console.log(`  📈 Database coverage: ${coverage}% (${dbTotal}/${totalSourceCommands})`);
    
    if (coverage >= 80) {
      console.log(`  ✅ Excellent data import coverage`);
      this.results.passed.push(`${coverage}% data coverage achieved`);
    } else if (coverage >= 50) {
      console.log(`  ⚠️  Partial data import coverage`);
      this.results.warnings.push(`${coverage}% data coverage (needs improvement)`);
    } else {
      console.log(`  ❌ Poor data import coverage`);
      this.results.failed.push(`Only ${coverage}% data coverage`);
    }
  }

  // Test 5: Performance Across Projects
  testGlobalPerformance() {
    console.log(`\n${colors.cyan}5️⃣  GLOBAL PERFORMANCE BENCHMARK${colors.reset}`);
    console.log('─'.repeat(50));
    
    const tests = [
      { name: 'Global command count', query: `SELECT COUNT(*) as count FROM shell_commands` },
      { name: 'Cross-project search', query: `SELECT project_name, COUNT(*) FROM shell_commands WHERE command LIKE '%test%' GROUP BY project_name LIMIT 10` },
      { name: 'Recent commands', query: `SELECT * FROM shell_commands ORDER BY timestamp DESC LIMIT 20` },
      { name: 'Project statistics', query: `SELECT project_name, COUNT(*) as commands FROM shell_commands GROUP BY project_name ORDER BY commands DESC` }
    ];
    
    let allFast = true;
    
    tests.forEach(test => {
      const start = Date.now();
      const result = this.executeQuery(test.query);
      const duration = Date.now() - start;
      
      if (result !== null) {
        if (duration < 100) {
          console.log(`  ✅ ${test.name}: ${duration}ms`);
        } else if (duration < 500) {
          console.log(`  ⚠️  ${test.name}: ${duration}ms (acceptable)`);
          allFast = false;
        } else {
          console.log(`  ❌ ${test.name}: ${duration}ms (slow)`);
          allFast = false;
        }
      } else {
        console.log(`  ❌ ${test.name}: failed`);
        allFast = false;
      }
    });
    
    if (allFast) {
      this.results.passed.push('Excellent global query performance');
    } else {
      this.results.warnings.push('Some global queries are slow');
    }
  }

  // Test 6: System Architecture Validation
  testSystemArchitecture() {
    console.log(`\n${colors.cyan}6️⃣  SYSTEM ARCHITECTURE VALIDATION${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Check global scripts
    const globalScripts = [
      '/Users/Danallovertheplace/pachacuti/scripts/global-second-brain-import.js',
      '/Users/Danallovertheplace/pachacuti/scripts/global-second-brain-search.js',
      '/Users/Danallovertheplace/pachacuti/scripts/global-second-brain-qa.js'
    ];
    
    let scriptsFound = 0;
    globalScripts.forEach(script => {
      if (fs.existsSync(script)) {
        console.log(`  ✅ ${path.basename(script)} (available)`);
        scriptsFound++;
      } else {
        console.log(`  ❌ ${path.basename(script)} (missing)`);
      }
    });
    
    // Check directory structure
    const requiredDirs = [
      SECOND_BRAIN_DIR,
      path.join(SECOND_BRAIN_DIR, 'database'),
      PROJECTS_DIR
    ];
    
    let dirsFound = 0;
    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        dirsFound++;
      }
    });
    
    console.log(`  📁 Directory structure: ${dirsFound}/${requiredDirs.length} required directories found`);
    console.log(`  🛠️  Global scripts: ${scriptsFound}/${globalScripts.length} scripts available`);
    
    if (scriptsFound === globalScripts.length && dirsFound === requiredDirs.length) {
      this.results.passed.push('Complete global system architecture');
    } else {
      this.results.failed.push('Incomplete global system architecture');
    }
  }

  // Generate comprehensive report
  generateGlobalReport() {
    console.log(`\n${colors.bright}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}       🧠 GLOBAL SECOND BRAIN QA REPORT${colors.reset}`);
    console.log(`${colors.bright}${'═'.repeat(60)}${colors.reset}\n`);
    
    // Calculate score
    const total = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const score = total > 0 ? Math.round((this.results.passed.length / total) * 100) : 0;
    
    // Display global metrics
    console.log(`${colors.cyan}Global System Metrics:${colors.reset}`);
    console.log(`  • Total Projects: ${this.metrics.totalProjects || 0}`);
    console.log(`  • Total Commands: ${this.metrics.totalCommands || 0}`);
    console.log(`  • Total Sessions: ${this.metrics.totalSessions || 0}`);
    console.log(`  • Global Quality Score: ${score}%`);
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
    console.log(`${colors.bright}${'═'.repeat(60)}${colors.reset}`);
    
    if (this.results.failed.length === 0 && score >= 85) {
      console.log(`${colors.green}${colors.bright}🧠 GLOBAL SECOND BRAIN OPERATIONAL${colors.reset}`);
      console.log(`${colors.green}Multi-project command intelligence system fully functional!${colors.reset}`);
    } else if (this.results.failed.length === 0) {
      console.log(`${colors.yellow}${colors.bright}⚠️  GLOBAL SYSTEM FUNCTIONAL${colors.reset}`);
      console.log(`${colors.yellow}Minor issues detected but cross-project system is usable.${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}❌ GLOBAL SYSTEM NEEDS ATTENTION${colors.reset}`);
      console.log(`${colors.red}Critical issues found. Please fix before full deployment.${colors.reset}`);
    }
    
    console.log(`${colors.bright}${'═'.repeat(60)}${colors.reset}\n`);
  }

  // Run all global tests
  async run() {
    console.log(`${colors.bright}${colors.cyan}🧠 GLOBAL SECOND BRAIN QUALITY CONTROL${colors.reset}`);
    console.log(`${colors.dim}Validating multi-project command intelligence system...${colors.reset}`);
    
    this.testGlobalDatabaseHealth();
    this.testMultiProjectData();
    this.testCrossProjectSearch();
    this.testSourceDataIntegrity();
    this.testGlobalPerformance();
    this.testSystemArchitecture();
    
    this.generateGlobalReport();
  }
}

// Execute global QA
const qa = new GlobalSecondBrainQA();
qa.run();