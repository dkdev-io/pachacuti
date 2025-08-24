#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Configuration
const JSON_DIR = path.join(process.env.HOME, '.claude/second-brain/projects/pachacuti/shell');
const DB_PATH = '/Users/Danallovertheplace/pachacuti/shell-viewer/backend/data/shell-viewer.db';

// Initialize database
const db = new Database(DB_PATH);

// Prepare statements
const insertSession = db.prepare(`
  INSERT OR REPLACE INTO shell_sessions (
    id, recorder_session_id, start_time, end_time, duration,
    command_count, user_name, working_directory, environment, metadata
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertCommand = db.prepare(`
  INSERT INTO shell_commands (
    session_id, sequence_number, timestamp, command, output,
    exit_code, duration, working_directory, environment_vars
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Get existing command count
const getCommandCount = db.prepare('SELECT COUNT(*) as count FROM shell_commands');

// Process JSON files
function processJsonFiles() {
  console.log('🔄 Starting Second Brain database population...');
  console.log(`📂 JSON directory: ${JSON_DIR}`);
  console.log(`🗄️  Database: ${DB_PATH}`);
  
  // Check current database state
  const currentCount = getCommandCount.get().count;
  console.log(`📊 Current commands in database: ${currentCount}`);
  
  if (currentCount > 0) {
    console.log('⚠️  Database already contains data. Proceeding will add to existing data.');
  }
  
  // Read all JSON files
  const jsonFiles = fs.readdirSync(JSON_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  console.log(`📁 Found ${jsonFiles.length} JSON files to process`);
  
  let totalCommands = 0;
  let totalSessions = 0;
  
  // Begin transaction for performance
  const transaction = db.transaction(() => {
    for (const file of jsonFiles) {
      const filePath = path.join(JSON_DIR, file);
      console.log(`\n📄 Processing: ${file}`);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Insert session
        const sessionId = data.sessionId;
        const userName = process.env.USER || 'unknown';
        
        insertSession.run(
          sessionId,
          sessionId, // recorder_session_id same as id
          data.startTime,
          data.endTime,
          data.endTime ? new Date(data.endTime) - new Date(data.startTime) : null,
          data.commandCount,
          userName,
          data.commands?.[0]?.workingDirectory || '/Users/Danallovertheplace/pachacuti',
          JSON.stringify({}), // environment
          JSON.stringify({
            project: data.project,
            sourceFile: file
          })
        );
        
        totalSessions++;
        
        // Insert commands
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
            
            insertCommand.run(
              sessionId,
              cmd.sequenceNumber || i,
              cmd.timestamp,
              commandText,
              outputText,
              cmd.exitCode !== undefined ? cmd.exitCode : null,
              cmd.duration || null,
              cmd.workingDirectory || '/Users/Danallovertheplace/pachacuti',
              JSON.stringify({})
            );
            
            totalCommands++;
          }
          
          console.log(`  ✅ Imported ${data.commands.length} commands from session ${sessionId.slice(0, 8)}...`);
        }
        
      } catch (err) {
        console.error(`  ❌ Error processing ${file}: ${err.message}`);
      }
    }
  });
  
  // Execute transaction
  try {
    transaction();
    console.log('\n✅ Database population complete!');
    console.log(`📊 Summary:`);
    console.log(`  - Sessions imported: ${totalSessions}`);
    console.log(`  - Commands imported: ${totalCommands}`);
    
    // Verify final count
    const finalCount = getCommandCount.get().count;
    console.log(`  - Total commands in database: ${finalCount}`);
    
  } catch (err) {
    console.error(`\n❌ Transaction failed: ${err.message}`);
    process.exit(1);
  }
}

// Run migration
processJsonFiles();

// Close database
db.close();
console.log('\n🎉 Second Brain database population complete!');