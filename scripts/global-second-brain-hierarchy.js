#!/usr/bin/env node

/**
 * Global Second Brain Complete Hierarchy Display
 * Shows full project → session → shell command structure
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
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

class SecondBrainHierarchyDisplay {
  constructor() {
    this.totalProjects = 0;
    this.totalSessions = 0;
    this.totalCommands = 0;
    this.projectData = [];
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

  // Scan source files for complete structure
  scanSourceStructure() {
    console.log(`${colors.bright}${colors.cyan}🧠 COMPLETE SECOND BRAIN HIERARCHY${colors.reset}`);
    console.log(`${colors.dim}Scanning project → session → shell command structure...${colors.reset}\n`);

    if (!fs.existsSync(PROJECTS_DIR)) {
      console.log(`${colors.red}❌ Projects directory not found${colors.reset}`);
      return;
    }

    const projects = fs.readdirSync(PROJECTS_DIR).filter(item => {
      return fs.statSync(path.join(PROJECTS_DIR, item)).isDirectory();
    });

    this.totalProjects = projects.length;

    projects.forEach((projectName, projectIndex) => {
      const projectPath = path.join(PROJECTS_DIR, projectName);
      const shellDir = path.join(projectPath, 'shell');
      
      let projectSessions = [];
      let projectCommandCount = 0;

      console.log(`${colors.bright}${colors.blue}📁 PROJECT ${projectIndex + 1}: ${projectName.toUpperCase()}${colors.reset}`);
      console.log(`${colors.dim}   └─ ${shellDir}${colors.reset}`);

      if (fs.existsSync(shellDir)) {
        const jsonFiles = fs.readdirSync(shellDir)
          .filter(f => f.endsWith('-commands.json'))
          .sort();

        jsonFiles.forEach((file, sessionIndex) => {
          const sessionId = file.replace('-commands.json', '');
          const filePath = path.join(shellDir, file);
          
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const commands = data.commands || [];
            const sessionInfo = data.session || {};
            
            projectCommandCount += commands.length;
            
            // Get some sample commands (first 3 and last 1)
            const sampleCommands = [];
            if (commands.length > 0) {
              sampleCommands.push(...commands.slice(0, Math.min(3, commands.length)));
              if (commands.length > 3) {
                sampleCommands.push(commands[commands.length - 1]);
              }
            }

            const sessionData = {
              sessionId,
              file,
              commandCount: commands.length,
              sampleCommands: sampleCommands,
              sessionInfo: sessionInfo,
              timestamp: sessionInfo.startTime || 0
            };

            projectSessions.push(sessionData);

            // Display session
            const isLast = sessionIndex === jsonFiles.length - 1;
            const connector = isLast ? '└──' : '├──';
            
            console.log(`${colors.cyan}   ${connector} 📋 SESSION: ${sessionId}${colors.reset}`);
            console.log(`${colors.dim}   ${isLast ? '    ' : '│   '}    Commands: ${commands.length}${colors.reset}`);
            
            if (sessionInfo.startTime) {
              const date = new Date(sessionInfo.startTime).toISOString().split('T')[0];
              console.log(`${colors.dim}   ${isLast ? '    ' : '│   '}    Date: ${date}${colors.reset}`);
            }

            // Show sample commands
            if (sampleCommands.length > 0) {
              console.log(`${colors.dim}   ${isLast ? '    ' : '│   '}    Sample Commands:${colors.reset}`);
              sampleCommands.forEach((cmd, cmdIndex) => {
                const cmdConnector = cmdIndex === sampleCommands.length - 1 ? '└─' : '├─';
                const cmdPrefix = `   ${isLast ? '    ' : '│   '}      ${cmdConnector}`;
                
                // Truncate long commands
                const cmdText = cmd.command && cmd.command.length > 60 
                  ? cmd.command.substring(0, 57) + '...'
                  : (cmd.command || 'No command text');
                
                console.log(`${colors.green}${cmdPrefix} ${cmdText}${colors.reset}`);
                
                if (cmd.output && cmd.output.trim() && cmdIndex === 0) {
                  // Show first line of output for context
                  const outputLine = cmd.output.split('\n')[0];
                  if (outputLine.length > 0) {
                    const outputText = outputLine.length > 50 
                      ? outputLine.substring(0, 47) + '...'
                      : outputLine;
                    console.log(`${colors.dim}${cmdPrefix.replace('├─', '│ ').replace('└─', '  ')}   ↳ ${outputText}${colors.reset}`);
                  }
                }
              });
            }

            if (sessionIndex < jsonFiles.length - 1) {
              console.log(`${colors.dim}   │${colors.reset}`);
            }

          } catch (err) {
            const isLast = sessionIndex === jsonFiles.length - 1;
            const connector = isLast ? '└──' : '├──';
            console.log(`${colors.red}   ${connector} ❌ ERROR: ${file} (${err.message})${colors.reset}`);
          }
        });

        this.totalSessions += jsonFiles.length;
        this.totalCommands += projectCommandCount;

        console.log(`${colors.dim}   └─ Total: ${jsonFiles.length} sessions, ${projectCommandCount} commands${colors.reset}\n`);

        // Store project data
        this.projectData.push({
          name: projectName,
          sessions: projectSessions,
          commandCount: projectCommandCount
        });

      } else {
        console.log(`${colors.dim}   └── No shell directory found${colors.reset}\n`);
      }
    });
  }

  // Show database mapping
  showDatabaseMapping() {
    console.log(`${colors.bright}${colors.magenta}🗄️  DATABASE MAPPING${colors.reset}`);
    console.log(`${colors.dim}Cross-referencing with global database...${colors.reset}\n`);

    // Get database statistics per project
    const dbStats = this.executeQuery(`
      SELECT 
        project_name,
        COUNT(*) as db_commands,
        COUNT(DISTINCT session_id) as db_sessions,
        MIN(timestamp) as first_cmd,
        MAX(timestamp) as last_cmd
      FROM shell_commands 
      WHERE project_name IS NOT NULL
      GROUP BY project_name 
      ORDER BY db_commands DESC
    `);

    if (dbStats && dbStats.length > 0) {
      dbStats.forEach(project => {
        const sourceProject = this.projectData.find(p => p.name === project.project_name);
        const sourceCommands = sourceProject ? sourceProject.commandCount : 0;
        const sourceSessions = sourceProject ? sourceProject.sessions.length : 0;
        
        const coverage = sourceCommands > 0 ? 
          ((project.db_commands / sourceCommands) * 100).toFixed(1) : '0.0';

        console.log(`${colors.cyan}📊 ${project.project_name}${colors.reset}`);
        console.log(`   Database: ${project.db_commands} commands, ${project.db_sessions} sessions`);
        console.log(`   Source:   ${sourceCommands} commands, ${sourceSessions} sessions`);
        console.log(`   Coverage: ${coverage}%`);
        
        if (coverage < 90) {
          console.log(`   ${colors.yellow}⚠️  Some data may not be imported${colors.reset}`);
        } else {
          console.log(`   ${colors.green}✅ Good data coverage${colors.reset}`);
        }
        console.log();
      });
    }
  }

  // Show global summary
  showGlobalSummary() {
    console.log(`${colors.bright}${'═'.repeat(70)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}📊 GLOBAL SECOND BRAIN SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${'═'.repeat(70)}${colors.reset}`);
    
    console.log(`${colors.bright}Architecture:${colors.reset} Project → Session → Shell Commands`);
    console.log(`${colors.bright}Database:${colors.reset}    ${DB_PATH}`);
    console.log(`${colors.bright}Source:${colors.reset}      ${PROJECTS_DIR}`);
    console.log();
    
    console.log(`${colors.bright}Global Totals:${colors.reset}`);
    console.log(`  📁 Projects: ${this.totalProjects}`);
    console.log(`  📋 Sessions: ${this.totalSessions}`);
    console.log(`  🐚 Commands: ${this.totalCommands}`);
    console.log();

    // Database totals
    const dbTotal = this.executeQuery(`SELECT COUNT(*) as total FROM shell_commands`);
    const dbSessions = this.executeQuery(`SELECT COUNT(DISTINCT session_id) as sessions FROM shell_commands`);
    
    if (dbTotal && dbTotal[0]) {
      console.log(`${colors.bright}Database Status:${colors.reset}`);
      console.log(`  📊 Imported Commands: ${dbTotal[0].total}`);
      console.log(`  📊 Imported Sessions: ${dbSessions[0].sessions}`);
      
      const globalCoverage = this.totalCommands > 0 ? 
        ((dbTotal[0].total / this.totalCommands) * 100).toFixed(1) : '0.0';
      console.log(`  📈 Global Coverage: ${globalCoverage}%`);
    }

    console.log(`${colors.bright}${'═'.repeat(70)}${colors.reset}`);
    console.log(`${colors.green}🧠 Second Brain Intelligence System Active${colors.reset}`);
    console.log(`${colors.dim}Complete command history across all development projects${colors.reset}`);
  }

  // Run complete hierarchy display
  run() {
    this.scanSourceStructure();
    this.showDatabaseMapping();
    this.showGlobalSummary();
  }
}

// Execute hierarchy display
const display = new SecondBrainHierarchyDisplay();
display.run();