#!/usr/bin/env node

/**
 * Global Second Brain Import System
 * Imports all shell command data from all projects into unified database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SECOND_BRAIN_DIR = path.join(process.env.HOME, '.claude/second-brain');
const DB_PATH = path.join(SECOND_BRAIN_DIR, 'database/global-shell-brain.db');
const PROJECTS_DIR = path.join(SECOND_BRAIN_DIR, 'projects');

console.log('🧠 Global Second Brain Import System');
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

// Execute SQL safely with parameter binding for complex data
function executeSQL(sql, params = []) {
  try {
    if (params.length > 0) {
      // Use parameter binding for complex data
      const tempFile = `/tmp/sql_params_${Date.now()}.json`;
      fs.writeFileSync(tempFile, JSON.stringify(params));
      
      const result = execSync(`node -e "
        const fs = require('fs');
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database('${DB_PATH}');
        const params = JSON.parse(fs.readFileSync('${tempFile}', 'utf8'));
        db.run(\`${sql}\`, params, function(err) {
          if (err) {
            console.error('SQL Error:', err.message);
            process.exit(1);
          }
          db.close();
          fs.unlinkSync('${tempFile}');
        });
      "`, { encoding: 'utf8' });
      
      return true;
    } else {
      // Simple SQL without parameters
      execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
      return true;
    }
  } catch (err) {
    console.error(`SQL Error: ${err.message}`);
    return false;
  }
}

// Escape SQL strings with proper JSON handling
const escapeSQL = (str) => {
  if (str === null || str === undefined) return 'NULL';
  if (str === '') return "''";
  
  // Convert to string and handle all problematic characters
  const cleaned = String(str)
    .replace(/\\/g, '\\\\')     // Escape backslashes first
    .replace(/'/g, "''")       // Escape single quotes for SQL
    .replace(/\n/g, '\\n')     // Escape newlines
    .replace(/\r/g, '\\r')     // Escape carriage returns
    .replace(/\t/g, '\\t')     // Escape tabs
    .replace(/\x00/g, '');     // Remove null bytes
  
  return "'" + cleaned + "'";
};

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
      
      // Insert session
      const sessionId = data.sessionId;
      const userName = process.env.USER || 'unknown';
      const startTime = data.startTime || '';
      const endTime = data.endTime || '';
      const duration = endTime && startTime ? new Date(endTime) - new Date(startTime) : 'NULL';
      const commandCount = data.commandCount || 0;
      const workingDir = (data.commands && data.commands[0] && data.commands[0].workingDirectory) || `~/projects/${projectName}`;
      
      const sessionSQL = `
        INSERT OR REPLACE INTO shell_sessions (
          id, project_name, recorder_session_id, start_time, end_time, duration,
          command_count, user_name, working_directory, environment, metadata
        ) VALUES (
          ${escapeSQL(sessionId)},
          ${escapeSQL(projectName)},
          ${escapeSQL(sessionId)},
          ${escapeSQL(startTime)},
          ${escapeSQL(endTime)},
          ${duration},
          ${commandCount},
          ${escapeSQL(userName)},
          ${escapeSQL(workingDir)},
          '{}',
          '{"sourceFile": "${file}", "project": "${projectName}"}'
        );
      `;
      
      if (!executeSQL(sessionSQL)) {
        console.log('❌ Failed');
        continue;
      }
      
      projectSessions++;
      
      // Insert commands
      let fileCommands = 0;
      if (data.commands && Array.isArray(data.commands)) {
        for (let i = 0; i < data.commands.length; i++) {
          const cmd = data.commands[i];
          
          // Skip malformed commands
          if (!cmd || typeof cmd !== 'object') {
            console.log(`    Skipping malformed command ${i}`);
            continue;
          }
          
          // Handle command field - improved parsing for complex structures
          let commandText = '';
          if (typeof cmd.command === 'string') {
            commandText = cmd.command;
          } else if (cmd.command && typeof cmd.command === 'object') {
            // Handle complex command objects with mode/filenames structure
            if (cmd.command.mode && cmd.command.filenames) {
              commandText = `Command mode: ${cmd.command.mode} (${cmd.command.filenames.length} files)`;
            } else if (cmd.command.stdout) {
              // Handle output-style command objects
              commandText = cmd.command.stdout || 'Complex command output';
            } else {
              // Fallback to JSON string for other complex objects (truncated for safety)
              const jsonStr = JSON.stringify(cmd.command);
              commandText = jsonStr.length > 200 ? jsonStr.substring(0, 197) + '...' : jsonStr;
            }
          } else {
            commandText = 'Empty command';
          }
          
          // Handle output - improved parsing for complex structures
          let outputText = '';
          if (typeof cmd.output === 'string') {
            outputText = cmd.output;
          } else if (cmd.output && typeof cmd.output === 'object') {
            // Handle structured output objects with stdout/stderr
            if (cmd.output.stdout !== undefined) {
              outputText = cmd.output.stdout || '';
              if (cmd.output.stderr && cmd.output.stderr.trim()) {
                outputText += '\n[STDERR]: ' + cmd.output.stderr;
              }
            } else if (cmd.output.filenames && Array.isArray(cmd.output.filenames)) {
              // Handle file list outputs
              outputText = `File list (${cmd.output.filenames.length} files): ${cmd.output.filenames.slice(0, 3).join(', ')}${cmd.output.filenames.length > 3 ? '...' : ''}`;
            } else {
              // Fallback to JSON string for other complex objects (truncated for safety)
              const jsonStr = JSON.stringify(cmd.output);
              outputText = jsonStr.length > 500 ? jsonStr.substring(0, 497) + '...' : jsonStr;
            }
          } else {
            outputText = '';
          }
          
          const commandSQL = `
            INSERT INTO shell_commands (
              project_name, session_id, sequence_number, timestamp, command, output,
              exit_code, duration, working_directory, environment_vars
            ) VALUES (
              ${escapeSQL(projectName)},
              ${escapeSQL(sessionId)},
              ${cmd.sequenceNumber || i},
              ${escapeSQL(cmd.timestamp)},
              ${escapeSQL(commandText)},
              ${escapeSQL(outputText)},
              ${cmd.exitCode !== undefined ? cmd.exitCode : 'NULL'},
              ${cmd.duration || 'NULL'},
              ${escapeSQL(cmd.workingDirectory || workingDir)},
              '{}'
            );
          `;
          
          if (executeSQL(commandSQL)) {
            fileCommands++;
          } else {
            console.log(`    Failed to import command ${i}: ${commandText.substring(0, 50)}...`);
          }
        }
      }
      
      projectCommands += fileCommands;
      console.log(`✅ ${fileCommands} commands`);
      
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      console.log(`    File: ${file}`);
      console.log(`    Attempting to continue with next file...`);
    }
  }
  
  console.log(`  📊 Project totals: ${projectSessions} sessions, ${projectCommands} commands`);
  return { sessions: projectSessions, commands: projectCommands };
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
  
  // Show project breakdown
  console.log(`\n📈 Project Statistics:`);
  try {
    const stats = execSync(`sqlite3 "${DB_PATH}" "SELECT project_name, COUNT(*) as commands FROM shell_commands GROUP BY project_name ORDER BY commands DESC;"`, { encoding: 'utf8' });
    const lines = stats.trim().split('\n');
    lines.forEach(line => {
      if (line) {
        const [project, count] = line.split('|');
        console.log(`  • ${project}: ${count} commands`);
      }
    });
  } catch (err) {
    console.log('  (Could not generate project statistics)');
  }
  
  console.log(`\n🧠 Global Second Brain is now operational!`);
}

main();