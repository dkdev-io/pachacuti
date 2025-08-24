#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const JSON_DIR = path.join(process.env.HOME, '.claude/second-brain/projects/pachacuti/shell');
const DB_PATH = '/Users/Danallovertheplace/pachacuti/shell-viewer/backend/data/shell-viewer.db';

console.log('🔄 Starting Second Brain database population...');
console.log(`📂 JSON directory: ${JSON_DIR}`);
console.log(`🗄️  Database: ${DB_PATH}`);

// Check current database state
try {
  const currentCount = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM shell_commands;"`, { encoding: 'utf8' }).trim();
  console.log(`📊 Current commands in database: ${currentCount}`);
  
  if (parseInt(currentCount) > 0) {
    console.log('⚠️  Database already contains data. Proceeding will add to existing data.');
  }
} catch (err) {
  console.log('📊 Current commands in database: 0');
}

// Read all JSON files
const jsonFiles = fs.readdirSync(JSON_DIR)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`📁 Found ${jsonFiles.length} JSON files to process`);

let totalCommands = 0;
let totalSessions = 0;

// Escape single quotes for SQL
const escapeSQL = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

// Process each JSON file
for (const file of jsonFiles) {
  const filePath = path.join(JSON_DIR, file);
  process.stdout.write(`\n📄 Processing: ${file}...`);
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Prepare SQL statements
    let sqlStatements = [];
    
    // Insert session
    const sessionId = data.sessionId;
    const userName = process.env.USER || 'unknown';
    const startTime = data.startTime || '';
    const endTime = data.endTime || '';
    const duration = endTime && startTime ? new Date(endTime) - new Date(startTime) : 'NULL';
    const commandCount = data.commandCount || 0;
    const workingDir = (data.commands && data.commands[0] && data.commands[0].workingDirectory) || '/Users/Danallovertheplace/pachacuti';
    
    sqlStatements.push(`
      INSERT OR REPLACE INTO shell_sessions (
        id, recorder_session_id, start_time, end_time, duration,
        command_count, user_name, working_directory, environment, metadata
      ) VALUES (
        ${escapeSQL(sessionId)},
        ${escapeSQL(sessionId)},
        ${escapeSQL(startTime)},
        ${escapeSQL(endTime)},
        ${duration},
        ${commandCount},
        ${escapeSQL(userName)},
        ${escapeSQL(workingDir)},
        '{}',
        '{"project": "pachacuti", "sourceFile": "${file}"}'
      );
    `);
    
    // Insert commands
    let fileCommandCount = 0;
    if (data.commands && Array.isArray(data.commands)) {
      for (let i = 0; i < data.commands.length; i++) {
        const cmd = data.commands[i];
        
        // Handle command field which might be string or object
        let commandText = '';
        if (typeof cmd.command === 'string') {
          commandText = cmd.command;
        } else if (cmd.command && typeof cmd.command === 'object') {
          commandText = JSON.stringify(cmd.command);
        }
        
        // Handle output similarly
        let outputText = '';
        if (typeof cmd.output === 'string') {
          outputText = cmd.output;
        } else if (cmd.output && typeof cmd.output === 'object') {
          outputText = JSON.stringify(cmd.output);
        }
        
        const exitCode = cmd.exitCode !== undefined ? cmd.exitCode : 'NULL';
        const duration = cmd.duration || 'NULL';
        const workingDirectory = cmd.workingDirectory || '/Users/Danallovertheplace/pachacuti';
        
        sqlStatements.push(`
          INSERT INTO shell_commands (
            session_id, sequence_number, timestamp, command, output,
            exit_code, duration, working_directory, environment_vars
          ) VALUES (
            ${escapeSQL(sessionId)},
            ${cmd.sequenceNumber || i},
            ${escapeSQL(cmd.timestamp)},
            ${escapeSQL(commandText)},
            ${escapeSQL(outputText)},
            ${exitCode},
            ${duration},
            ${escapeSQL(workingDirectory)},
            '{}'
          );
        `);
        
        fileCommandCount++;
      }
    }
    
    // Write SQL to temp file and execute
    const tempFile = `/tmp/second-brain-import-${Date.now()}.sql`;
    const sqlContent = 'BEGIN TRANSACTION;\n' + sqlStatements.join('\n') + '\nCOMMIT;';
    fs.writeFileSync(tempFile, sqlContent);
    
    try {
      execSync(`sqlite3 "${DB_PATH}" < "${tempFile}"`, { encoding: 'utf8' });
      console.log(` ✅ Imported ${fileCommandCount} commands`);
      totalCommands += fileCommandCount;
      totalSessions++;
    } catch (sqlErr) {
      console.log(` ❌ Error: ${sqlErr.message}`);
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempFile);
    }
    
  } catch (err) {
    console.log(` ❌ Error processing file: ${err.message}`);
  }
}

console.log('\n\n✅ Database population complete!');
console.log(`📊 Summary:`);
console.log(`  - Sessions imported: ${totalSessions}`);
console.log(`  - Commands imported: ${totalCommands}`);

// Verify final count
try {
  const finalCount = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM shell_commands;"`, { encoding: 'utf8' }).trim();
  console.log(`  - Total commands in database: ${finalCount}`);
} catch (err) {
  console.log('  - Could not verify final count');
}

console.log('\n🎉 Second Brain database population complete!');