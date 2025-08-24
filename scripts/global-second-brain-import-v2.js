#!/usr/bin/env node

/**
 * Global Second Brain Import System V2
 * Simplified, robust import focusing on readable command data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SECOND_BRAIN_DIR = path.join(process.env.HOME, '.claude/second-brain');
const DB_PATH = path.join(SECOND_BRAIN_DIR, 'database/global-shell-brain.db');
const PROJECTS_DIR = path.join(SECOND_BRAIN_DIR, 'projects');

console.log('🧠 Global Second Brain Import System V2 (Robust)');
console.log(`📂 Projects directory: ${PROJECTS_DIR}`);
console.log(`🗄️  Global database: ${DB_PATH}`);

// Get current command count
function getCurrentCount() {
  try {
    const result = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM shell_commands;"`, { encoding: 'utf8' });
    return parseInt(result.trim());
  } catch (err) {
    return 0;
  }
}

// Execute simple SQL
function executeSQL(sql) {
  try {
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
    return true;
  } catch (err) {
    console.error(`SQL Error: ${err.message.substring(0, 100)}...`);
    return false;
  }
}

// Safe string for SQL - removes all problematic characters
function safeString(str, maxLength = 500) {
  if (str === null || str === undefined) return 'NULL';
  if (str === '') return "''";
  
  // Convert to string and clean it thoroughly
  const cleaned = String(str)
    .substring(0, maxLength)
    .replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')  // Remove control characters
    .replace(/'/g, "''")                    // Escape single quotes
    .replace(/\\/g, '\\\\')                 // Escape backslashes
    .trim();
  
  return "'" + cleaned + "'";
}

// Extract readable command text from complex objects
function extractCommandText(cmd) {
  if (!cmd || typeof cmd !== 'object') return 'Invalid command';
  
  // Handle string commands
  if (typeof cmd.command === 'string') {
    return cmd.command.substring(0, 300);
  }
  
  // Handle complex command objects
  if (cmd.command && typeof cmd.command === 'object') {
    if (cmd.command.mode) {
      return `Tool: ${cmd.command.mode}`;
    }
    if (cmd.command.stdout) {
      return cmd.command.stdout.substring(0, 300);
    }
    if (cmd.command.type) {
      return `Action: ${cmd.command.type}`;
    }
    return 'Complex command object';
  }
  
  // Fallback - look for any readable text in the command object
  const cmdStr = JSON.stringify(cmd);
  if (cmdStr.includes('git ')) return 'Git command';
  if (cmdStr.includes('npm ')) return 'NPM command';
  if (cmdStr.includes('node ')) return 'Node command';
  if (cmdStr.includes('cd ')) return 'Directory change';
  if (cmdStr.includes('ls ')) return 'List files';
  
  return 'Tool or action command';
}

// Extract readable output text from complex objects
function extractOutputText(output) {
  if (!output) return '';
  if (typeof output === 'string') {
    return output.substring(0, 500);
  }
  
  if (typeof output === 'object') {
    if (output.stdout) {
      return output.stdout.substring(0, 500);
    }
    if (output.type === 'text' && output.text) {
      return output.text.substring(0, 500);
    }
    if (Array.isArray(output) && output.length > 0) {
      return `Array output (${output.length} items)`;
    }
    return 'Structured output';
  }
  
  return String(output).substring(0, 500);
}

// Process single project
function processProject(projectName) {
  console.log(`\n📁 Processing project: ${projectName}`);
  
  const shellDir = path.join(PROJECTS_DIR, projectName, 'shell');
  
  if (!fs.existsSync(shellDir)) {
    console.log(`  ⚠️  No shell directory found`);
    return { sessions: 0, commands: 0 };
  }
  
  const jsonFiles = fs.readdirSync(shellDir)
    .filter(f => f.endsWith('-commands.json'))
    .sort();
  
  console.log(`  📄 Found ${jsonFiles.length} command files`);
  
  let projectSessions = 0;
  let projectCommands = 0;
  
  for (const file of jsonFiles) {
    const filePath = path.join(shellDir, file);
    process.stdout.write(`    ${file}... `);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Insert session with basic info
      const sessionId = data.sessionId || file.replace('-commands.json', '');
      const sessionSQL = `
        INSERT OR REPLACE INTO shell_sessions (
          id, project_name, recorder_session_id, start_time, end_time, 
          command_count, user_name, working_directory, environment, metadata
        ) VALUES (
          ${safeString(sessionId)},
          ${safeString(projectName)},
          ${safeString(sessionId)},
          ${safeString(data.startTime || '')},
          ${safeString(data.endTime || '')},
          ${data.commands ? data.commands.length : 0},
          ${safeString(process.env.USER || 'unknown')},
          ${safeString(`~/projects/${projectName}`)},
          '{}',
          ${safeString(`{"file": "${file}"}`)}
        );
      `;
      
      if (!executeSQL(sessionSQL)) {
        console.log('❌ Session failed');
        continue;
      }
      
      projectSessions++;
      
      // Process commands with robust parsing
      let fileCommands = 0;
      if (data.commands && Array.isArray(data.commands)) {
        for (let i = 0; i < data.commands.length; i++) {
          const cmd = data.commands[i];
          
          if (!cmd) continue;
          
          const commandText = extractCommandText(cmd);
          const outputText = extractOutputText(cmd.output);
          
          const commandSQL = `
            INSERT INTO shell_commands (
              project_name, session_id, sequence_number, timestamp, command, output,
              exit_code, duration, working_directory, environment_vars
            ) VALUES (
              ${safeString(projectName)},
              ${safeString(sessionId)},
              ${i},
              ${safeString(cmd.timestamp || '')},
              ${safeString(commandText, 300)},
              ${safeString(outputText, 500)},
              ${cmd.exitCode || 0},
              NULL,
              ${safeString(cmd.workingDirectory || `~/projects/${projectName}`)},
              '{}'
            );
          `;
          
          if (executeSQL(commandSQL)) {
            fileCommands++;
          }
        }
      }
      
      projectCommands += fileCommands;
      console.log(`✅ ${fileCommands} commands`);
      
    } catch (err) {
      console.log(`❌ Error: ${err.message.substring(0, 50)}...`);
    }
  }
  
  console.log(`  📊 Project totals: ${projectSessions} sessions, ${projectCommands} commands`);
  return { sessions: projectSessions, commands: projectCommands };
}

// Discover all projects
function discoverProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error('❌ Projects directory not found');
    return [];
  }
  
  const projects = fs.readdirSync(PROJECTS_DIR)
    .filter(item => {
      const projectPath = path.join(PROJECTS_DIR, item);
      return fs.statSync(projectPath).isDirectory();
    });
  
  console.log(`\n📋 Discovered ${projects.length} projects:`);
  projects.forEach(project => console.log(`  • ${project}`));
  
  return projects;
}

// Main execution
function main() {
  const startTime = Date.now();
  const initialCount = getCurrentCount();
  
  console.log(`\n📊 Initial database state:`);
  console.log(`  Commands: ${initialCount}`);
  
  const projects = discoverProjects();
  
  if (projects.length === 0) {
    console.log('❌ No projects found to import');
    return;
  }
  
  let totalSessions = 0;
  let totalCommands = 0;
  
  // Process each project
  for (const project of projects) {
    const result = processProject(project);
    totalSessions += result.sessions;
    totalCommands += result.commands;
  }
  
  // Final verification
  const finalCount = getCurrentCount();
  const importedCommands = finalCount - initialCount;
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n✅ Global import complete!`);
  console.log(`📊 Import Summary:`);
  console.log(`  • Projects processed: ${projects.length}`);
  console.log(`  • Sessions imported: ${totalSessions}`);
  console.log(`  • Commands imported: ${importedCommands}`);
  console.log(`  • Total commands in database: ${finalCount}`);
  console.log(`  • Import time: ${duration}s`);
  
  console.log(`\n🧠 Global Second Brain V2 is now operational!`);
}

main();