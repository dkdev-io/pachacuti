#!/bin/bash

# Second Brain Database Population Script
# Populates SQLite database from JSON files

JSON_DIR="$HOME/.claude/second-brain/projects/pachacuti/shell"
DB_PATH="/Users/Danallovertheplace/pachacuti/shell-viewer/backend/data/shell-viewer.db"

echo "🔄 Starting Second Brain database population..."
echo "📂 JSON directory: $JSON_DIR"
echo "🗄️  Database: $DB_PATH"

# Check current database state
CURRENT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM shell_commands;" 2>/dev/null || echo "0")
echo "📊 Current commands in database: $CURRENT_COUNT"

if [ "$CURRENT_COUNT" -gt "0" ]; then
    echo "⚠️  Database already contains data. Proceeding will add to existing data."
fi

# Count JSON files
JSON_COUNT=$(ls -1 "$JSON_DIR"/*.json 2>/dev/null | wc -l)
echo "📁 Found $JSON_COUNT JSON files to process"

TOTAL_COMMANDS=0
TOTAL_SESSIONS=0

# Process each JSON file
for json_file in "$JSON_DIR"/*.json; do
    if [ -f "$json_file" ]; then
        filename=$(basename "$json_file")
        echo -n "📄 Processing: $filename..."
        
        # Use Node.js to parse JSON and generate SQL
        node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$json_file', 'utf8'));
        
        // Generate session insert
        const sessionId = data.sessionId;
        const userName = process.env.USER || 'unknown';
        const startTime = data.startTime || '';
        const endTime = data.endTime || '';
        const duration = endTime && startTime ? new Date(endTime) - new Date(startTime) : 'NULL';
        const commandCount = data.commandCount || 0;
        const workingDir = (data.commands && data.commands[0] && data.commands[0].workingDirectory) || '/Users/Danallovertheplace/pachacuti';
        
        // Escape single quotes for SQL
        const escapeSQL = (str) => String(str).replace(/'/g, \"''\");
        
        console.log(\`
        INSERT OR REPLACE INTO shell_sessions (
            id, recorder_session_id, start_time, end_time, duration,
            command_count, user_name, working_directory, environment, metadata
        ) VALUES (
            '\${sessionId}',
            '\${sessionId}',
            '\${startTime}',
            '\${endTime}',
            \${duration},
            \${commandCount},
            '\${userName}',
            '\${escapeSQL(workingDir)}',
            '{}',
            '{\\"project\\": \\"pachacuti\\", \\"sourceFile\\": \\"$filename\\"}'
        );
        \`);
        
        // Generate command inserts
        if (data.commands && Array.isArray(data.commands)) {
            data.commands.forEach((cmd, i) => {
                let commandText = '';
                if (typeof cmd.command === 'string') {
                    commandText = cmd.command;
                } else if (cmd.command && typeof cmd.command === 'object') {
                    commandText = JSON.stringify(cmd.command);
                }
                
                let outputText = '';
                if (typeof cmd.output === 'string') {
                    outputText = cmd.output;
                } else if (cmd.output && typeof cmd.output === 'object') {
                    outputText = JSON.stringify(cmd.output);
                }
                
                const exitCode = cmd.exitCode !== undefined ? cmd.exitCode : 'NULL';
                const duration = cmd.duration || 'NULL';
                const workingDirectory = cmd.workingDirectory || '/Users/Danallovertheplace/pachacuti';
                
                console.log(\`
                INSERT INTO shell_commands (
                    session_id, sequence_number, timestamp, command, output,
                    exit_code, duration, working_directory, environment_vars
                ) VALUES (
                    '\${sessionId}',
                    \${cmd.sequenceNumber || i},
                    '\${cmd.timestamp || ''}',
                    '\${escapeSQL(commandText)}',
                    '\${escapeSQL(outputText)}',
                    \${exitCode},
                    \${duration},
                    '\${escapeSQL(workingDirectory)}',
                    '{}'
                );
                \`);
            });
            
            // Output count for tracking
            console.error(data.commands.length);
        } else {
            console.error('0');
        }
        " 2>&1 | {
            # Capture stderr (command count) and stdout (SQL)
            SQL_OUTPUT=$(cat)
            CMD_COUNT=$(echo "$SQL_OUTPUT" | tail -1)
            SQL_COMMANDS=$(echo "$SQL_OUTPUT" | head -n -1)
            
            # Execute SQL in a transaction
            echo "BEGIN TRANSACTION;" > /tmp/batch.sql
            echo "$SQL_COMMANDS" >> /tmp/batch.sql
            echo "COMMIT;" >> /tmp/batch.sql
            
            sqlite3 "$DB_PATH" < /tmp/batch.sql 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo " ✅ Imported $CMD_COUNT commands"
                TOTAL_COMMANDS=$((TOTAL_COMMANDS + CMD_COUNT))
                TOTAL_SESSIONS=$((TOTAL_SESSIONS + 1))
            else
                echo " ❌ Error processing file"
            fi
            
            rm -f /tmp/batch.sql
        }
    fi
done

echo ""
echo "✅ Database population complete!"
echo "📊 Summary:"
echo "  - Sessions imported: $TOTAL_SESSIONS"
echo "  - Commands imported: $TOTAL_COMMANDS"

# Verify final count
FINAL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM shell_commands;")
echo "  - Total commands in database: $FINAL_COUNT"

echo ""
echo "🎉 Second Brain database population complete!"