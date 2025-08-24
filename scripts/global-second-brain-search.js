#!/usr/bin/env node

/**
 * Global Second Brain Search System
 * Cross-project command history search and analysis
 */

const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');

// Configuration
const DB_PATH = path.join(process.env.HOME, '.claude/second-brain/database/global-shell-brain.db');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

class GlobalSecondBrainSearch {
  constructor() {
    this.dbPath = DB_PATH;
  }

  // Execute SQL query safely
  executeQuery(query) {
    try {
      const result = execSync(`sqlite3 -json "${this.dbPath}" "${query}"`, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      return result ? JSON.parse(result) : [];
    } catch (err) {
      console.error(`${colors.red}Database error: ${err.message}${colors.reset}`);
      return [];
    }
  }

  // Format timestamp for display
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `Today ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Display search results with project context
  displayResults(results, query, showProject = true) {
    if (results.length === 0) {
      console.log(`${colors.yellow}No results found for: "${query}"${colors.reset}`);
      return;
    }
    
    console.log(`\n${colors.green}Found ${results.length} results across projects for: "${query}"${colors.reset}\n`);
    
    let currentProject = '';
    results.forEach((row, index) => {
      // Show project header if changed
      if (showProject && row.project_name && row.project_name !== currentProject) {
        currentProject = row.project_name;
        console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
        console.log(`${colors.cyan}📁 PROJECT: ${currentProject}${colors.reset}`);
        console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
      }
      
      const time = this.formatTime(row.timestamp);
      const dir = row.working_directory ? row.working_directory.replace(process.env.HOME, '~') : '~/';
      const exitStatus = row.exit_code === 0 ? 
        `${colors.green}✓${colors.reset}` : 
        row.exit_code !== null ?
        `${colors.red}✗ (${row.exit_code})${colors.reset}` :
        `${colors.dim}?${colors.reset}`;
      
      const projectTag = showProject ? `${colors.magenta}[${row.project_name || 'unknown'}]${colors.reset} ` : '';
      
      console.log(`${colors.bright}[${index + 1}]${colors.reset} ${projectTag}${colors.cyan}${time}${colors.reset} ${colors.dim}${dir}${colors.reset}`);
      
      // Display command (truncate if too long)
      const commandText = row.command || '';
      if (commandText.length > 120) {
        console.log(`    ${colors.bright}$${colors.reset} ${commandText.slice(0, 120)}...`);
      } else {
        console.log(`    ${colors.bright}$${colors.reset} ${commandText}`);
      }
      console.log(`    ${exitStatus}\n`);
    });
  }

  // Get system statistics
  getStats() {
    const stats = this.executeQuery(`
      SELECT 
        COUNT(DISTINCT project_name) as project_count,
        COUNT(DISTINCT session_id) as session_count,
        COUNT(*) as command_count,
        MIN(timestamp) as first_command,
        MAX(timestamp) as last_command
      FROM shell_commands
    `)[0];
    
    return stats || {};
  }

  // Get project breakdown
  getProjectStats() {
    return this.executeQuery(`
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
  }

  // Search commands across all projects
  searchCommands(query, limit = 50, project = null) {
    let sql = `
      SELECT 
        c.id, c.project_name, c.session_id, c.timestamp, 
        c.command, c.output, c.exit_code, c.working_directory
      FROM shell_commands c
      WHERE c.command LIKE '%${query.replace(/'/g, "''")}%'
    `;
    
    if (project) {
      sql += ` AND c.project_name = '${project.replace(/'/g, "''")}'`;
    }
    
    sql += ` ORDER BY c.timestamp DESC LIMIT ${limit}`;
    
    return this.executeQuery(sql);
  }

  // Get recent commands across all projects
  getRecentCommands(limit = 20, project = null) {
    let sql = `
      SELECT 
        c.id, c.project_name, c.session_id, c.timestamp, 
        c.command, c.exit_code, c.working_directory
      FROM shell_commands c
    `;
    
    if (project) {
      sql += ` WHERE c.project_name = '${project.replace(/'/g, "''")}'`;
    }
    
    sql += ` ORDER BY c.timestamp DESC LIMIT ${limit}`;
    
    return this.executeQuery(sql);
  }

  // Interactive search mode
  interactiveSearch() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(`${colors.bright}🧠 Global Second Brain Search${colors.reset}`);
    console.log(`${colors.dim}Search across all projects and sessions${colors.reset}\n`);
    
    // Show global stats
    const stats = this.getStats();
    if (stats.command_count) {
      console.log(`${colors.cyan}📊 Global Statistics:${colors.reset}`);
      console.log(`  • Total commands: ${colors.bright}${stats.command_count}${colors.reset}`);
      console.log(`  • Total projects: ${colors.bright}${stats.project_count}${colors.reset}`);
      console.log(`  • Total sessions: ${colors.bright}${stats.session_count}${colors.reset}`);
      console.log(`  • Date range: ${this.formatTime(stats.first_command)} to ${this.formatTime(stats.last_command)}\n`);
    }
    
    const prompt = () => {
      rl.question(`${colors.blue}global-search>${colors.reset} `, (input) => {
        const trimmed = input.trim();
        
        if (trimmed === 'exit' || trimmed === 'quit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }
        
        if (trimmed === 'help') {
          this.showHelp();
          prompt();
          return;
        }
        
        if (trimmed.startsWith('recent')) {
          const parts = trimmed.split(' ');
          const limit = parts[1] ? parseInt(parts[1]) : 20;
          const results = this.getRecentCommands(limit);
          this.displayResults(results, 'recent commands');
          prompt();
          return;
        }
        
        if (trimmed === 'projects') {
          const projectStats = this.getProjectStats();
          console.log(`\n${colors.cyan}📊 Project Statistics:${colors.reset}`);
          projectStats.forEach((project, index) => {
            const firstCmd = this.formatTime(project.first_command);
            const lastCmd = this.formatTime(project.last_command);
            console.log(`${colors.bright}${index + 1}. ${project.project_name}${colors.reset}`);
            console.log(`   Commands: ${project.command_count}, Sessions: ${project.session_count}`);
            console.log(`   Active: ${firstCmd} to ${lastCmd}\n`);
          });
          prompt();
          return;
        }
        
        if (trimmed.startsWith('project ')) {
          const projectName = trimmed.substring(8);
          const results = this.getRecentCommands(30, projectName);
          this.displayResults(results, `project: ${projectName}`, false);
          prompt();
          return;
        }
        
        if (trimmed === 'stats') {
          const stats = this.getStats();
          const projectStats = this.getProjectStats();
          
          console.log(`\n${colors.cyan}📊 Global Second Brain Statistics:${colors.reset}`);
          console.log(`  • Total commands: ${colors.bright}${stats.command_count}${colors.reset}`);
          console.log(`  • Total projects: ${colors.bright}${stats.project_count}${colors.reset}`);
          console.log(`  • Total sessions: ${colors.bright}${stats.session_count}${colors.reset}`);
          console.log(`  • Date range: ${this.formatTime(stats.first_command)} to ${this.formatTime(stats.last_command)}`);
          
          console.log(`\n${colors.cyan}📈 Project Breakdown:${colors.reset}`);
          projectStats.forEach(project => {
            console.log(`  • ${colors.bright}${project.project_name}${colors.reset}: ${project.command_count} commands`);
          });
          console.log();
          
          prompt();
          return;
        }
        
        if (trimmed) {
          const results = this.searchCommands(trimmed);
          this.displayResults(results, trimmed);
        }
        
        prompt();
      });
    };
    
    prompt();
  }

  // Show help
  showHelp() {
    console.log(`\n${colors.bright}Available commands:${colors.reset}`);
    console.log('  recent [n]        - Show n most recent commands (default: 20)');
    console.log('  projects          - Show all projects with statistics');
    console.log('  project <name>    - Show recent commands from specific project');
    console.log('  stats             - Show detailed global statistics');
    console.log('  help              - Show this help');
    console.log('  exit              - Exit the search tool');
    console.log('  <query>           - Search for commands containing query\n');
  }

  // Command-line search mode
  cliSearch(query) {
    console.log(`${colors.bright}🧠 Searching globally for: "${query}"${colors.reset}\n`);
    
    const results = this.searchCommands(query);
    this.displayResults(results, query);
  }
}

// Main execution
const args = process.argv.slice(2);
const searcher = new GlobalSecondBrainSearch();

if (args.length === 0) {
  // Interactive mode
  searcher.interactiveSearch();
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log(`${colors.bright}Global Second Brain Search Tool${colors.reset}`);
  console.log('\nUsage:');
  console.log('  node global-second-brain-search.js           - Interactive search mode');
  console.log('  node global-second-brain-search.js <query>   - Search for specific query');
  console.log('  node global-second-brain-search.js --help    - Show this help\n');
} else {
  // Direct search mode
  searcher.cliSearch(args.join(' '));
}