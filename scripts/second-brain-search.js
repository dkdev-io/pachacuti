#!/usr/bin/env node

const Database = require('better-sqlite3');
const readline = require('readline');
const path = require('path');

// Configuration
const DB_PATH = '/Users/Danallovertheplace/pachacuti/shell-viewer/backend/data/shell-viewer.db';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

// Initialize database
const db = new Database(DB_PATH, { readonly: true });

// Prepare queries
const searchCommands = db.prepare(`
  SELECT 
    c.id,
    c.session_id,
    c.timestamp,
    c.command,
    c.output,
    c.exit_code,
    c.working_directory,
    s.start_time as session_start,
    s.metadata
  FROM shell_commands c
  JOIN shell_sessions s ON c.session_id = s.id
  WHERE c.command LIKE ?
  ORDER BY c.timestamp DESC
  LIMIT ?
`);

const getRecentCommands = db.prepare(`
  SELECT 
    c.id,
    c.session_id,
    c.timestamp,
    c.command,
    c.exit_code,
    c.working_directory
  FROM shell_commands c
  ORDER BY c.timestamp DESC
  LIMIT ?
`);

const getSessionCommands = db.prepare(`
  SELECT 
    c.id,
    c.timestamp,
    c.command,
    c.exit_code,
    c.working_directory
  FROM shell_commands c
  WHERE c.session_id = ?
  ORDER BY c.sequence_number
`);

const getStats = db.prepare(`
  SELECT 
    COUNT(DISTINCT session_id) as session_count,
    COUNT(*) as command_count,
    MIN(timestamp) as first_command,
    MAX(timestamp) as last_command
  FROM shell_commands
`);

// Format timestamp for display
function formatTime(timestamp) {
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

// Display search results
function displayResults(results, query) {
  if (results.length === 0) {
    console.log(`${colors.yellow}No results found for: "${query}"${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.green}Found ${results.length} results for: "${query}"${colors.reset}\n`);
  
  results.forEach((row, index) => {
    const time = formatTime(row.timestamp);
    const dir = row.working_directory.replace(process.env.HOME, '~');
    const exitStatus = row.exit_code === 0 ? 
      `${colors.green}✓${colors.reset}` : 
      `${colors.red}✗ (${row.exit_code})${colors.reset}`;
    
    console.log(`${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}${time}${colors.reset} ${colors.dim}${dir}${colors.reset}`);
    console.log(`    ${colors.bright}$${colors.reset} ${row.command.slice(0, 100)}`);
    if (row.command.length > 100) {
      console.log(`    ${colors.dim}...${colors.reset}`);
    }
    console.log(`    ${exitStatus}\n`);
  });
}

// Interactive search mode
function interactiveSearch() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log(`${colors.bright}🔍 Second Brain Command Search${colors.reset}`);
  console.log(`${colors.dim}Type 'help' for commands, 'exit' to quit${colors.reset}\n`);
  
  // Show stats
  const stats = getStats.get();
  console.log(`${colors.cyan}📊 Database Stats:${colors.reset}`);
  console.log(`  • Total commands: ${colors.bright}${stats.command_count}${colors.reset}`);
  console.log(`  • Total sessions: ${colors.bright}${stats.session_count}${colors.reset}`);
  console.log(`  • First command: ${formatTime(stats.first_command)}`);
  console.log(`  • Last command: ${formatTime(stats.last_command)}\n`);
  
  const prompt = () => {
    rl.question(`${colors.blue}search>${colors.reset} `, (input) => {
      const trimmed = input.trim();
      
      if (trimmed === 'exit' || trimmed === 'quit') {
        console.log('Goodbye!');
        rl.close();
        db.close();
        return;
      }
      
      if (trimmed === 'help') {
        console.log(`\n${colors.bright}Available commands:${colors.reset}`);
        console.log('  recent [n]     - Show n most recent commands (default: 20)');
        console.log('  session <id>   - Show all commands from a session');
        console.log('  stats          - Show database statistics');
        console.log('  help           - Show this help');
        console.log('  exit           - Exit the search tool');
        console.log('  <query>        - Search for commands containing query\n');
        prompt();
        return;
      }
      
      if (trimmed.startsWith('recent')) {
        const parts = trimmed.split(' ');
        const limit = parts[1] ? parseInt(parts[1]) : 20;
        const results = getRecentCommands.all(limit);
        displayResults(results, 'recent commands');
        prompt();
        return;
      }
      
      if (trimmed.startsWith('session ')) {
        const sessionId = trimmed.substring(8);
        const results = getSessionCommands.all(sessionId);
        displayResults(results, `session ${sessionId}`);
        prompt();
        return;
      }
      
      if (trimmed === 'stats') {
        const stats = getStats.get();
        console.log(`\n${colors.cyan}📊 Database Statistics:${colors.reset}`);
        console.log(`  • Total commands: ${colors.bright}${stats.command_count}${colors.reset}`);
        console.log(`  • Total sessions: ${colors.bright}${stats.session_count}${colors.reset}`);
        console.log(`  • Date range: ${formatTime(stats.first_command)} to ${formatTime(stats.last_command)}\n`);
        prompt();
        return;
      }
      
      if (trimmed) {
        const results = searchCommands.all(`%${trimmed}%`, 50);
        displayResults(results, trimmed);
      }
      
      prompt();
    });
  };
  
  prompt();
}

// Command-line argument mode
function cliSearch(query) {
  console.log(`${colors.bright}🔍 Searching for: "${query}"${colors.reset}\n`);
  
  const results = searchCommands.all(`%${query}%`, 50);
  displayResults(results, query);
  
  db.close();
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  // Interactive mode
  interactiveSearch();
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log(`${colors.bright}Second Brain Search Tool${colors.reset}`);
  console.log('\nUsage:');
  console.log('  node second-brain-search.js           - Interactive search mode');
  console.log('  node second-brain-search.js <query>   - Search for specific query');
  console.log('  node second-brain-search.js --help    - Show this help\n');
  db.close();
} else {
  // Direct search mode
  cliSearch(args.join(' '));
}