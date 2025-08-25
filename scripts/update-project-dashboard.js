#!/usr/bin/env node

/**
 * Auto-Update Script for DevOps Project Dashboard
 * Automatically updates project links, ports, and directories
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PORT_REGISTRY_PATH = '/Users/Danallovertheplace/pachacuti/config/port-registry.json';
const DASHBOARD_MD_PATH = '/Users/Danallovertheplace/pachacuti/devops/PROJECT_PORTFOLIO_DASHBOARD.md';
const HOME_DIR = '/Users/Danallovertheplace';

// Project directory mappings
const PROJECT_DIRECTORIES = {
  'crypto-campaign-unified': '/Users/Danallovertheplace/Desktop/crypto-campaign-setup',
  'note-clarify-organizer': '/Users/Danallovertheplace/unfinished-apps-workspace/note-clarify-organizer',
  'slack-integration': '/Users/Danallovertheplace/pachacuti/lib/slack-integration',
  'claude-productivity-tools': '/Users/Danallovertheplace/claude-productivity-tools',
  'visual-verification': '/Users/Danallovertheplace/visual-verification',
  'shell-viewer': '/Users/Danallovertheplace/pachacuti/shell-viewer',
  'api_request_bot': '/Users/Danallovertheplace/api_request_bot',
  'habit-tracker': '/Users/Danallovertheplace/habit-tracker',
  'replit-sync-project': '/Users/Danallovertheplace/replit-sync-project',
  'project-sessions': '/Users/Danallovertheplace/project-sessions',
  'voter-analytics-hub': '/Users/Danallovertheplace/unfinished-apps-workspace/voter-tools/voter-analytics-hub',
  'social-survey-secure-haven': '/Users/Danallovertheplace/social-survey-secure-haven',
  'minimalist-web-design': '/Users/Danallovertheplace/minimalist-web-design',
  'secure-send': '/Users/Danallovertheplace/secure-send',
  'pachacuti-devops': '/Users/Danallovertheplace/pachacuti/devops'
};

class DashboardUpdater {
  constructor() {
    this.portRegistry = this.loadPortRegistry();
    this.dashboardContent = this.loadDashboard();
    this.timestamp = new Date().toISOString().split('T')[0];
  }

  loadPortRegistry() {
    try {
      if (fs.existsSync(PORT_REGISTRY_PATH)) {
        return JSON.parse(fs.readFileSync(PORT_REGISTRY_PATH, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading port registry:', error.message);
    }
    return { port_assignments: {} };
  }

  loadDashboard() {
    try {
      return fs.readFileSync(DASHBOARD_MD_PATH, 'utf8');
    } catch (error) {
      console.error('Error loading dashboard:', error.message);
      return '';
    }
  }

  getProjectPort(projectName) {
    // Check port registry for assigned port
    for (const [port, data] of Object.entries(this.portRegistry.port_assignments)) {
      if (data.project === projectName || 
          data.project.includes(projectName) ||
          projectName.includes(data.project)) {
        return port;
      }
    }
    return null;
  }

  getProjectDirectory(projectName) {
    // Direct mapping first
    if (PROJECT_DIRECTORIES[projectName]) {
      return PROJECT_DIRECTORIES[projectName];
    }
    
    // Try to find by partial match
    for (const [key, dir] of Object.entries(PROJECT_DIRECTORIES)) {
      if (key.includes(projectName) || projectName.includes(key)) {
        return dir;
      }
    }
    
    // Try to find in registry
    for (const data of Object.values(this.portRegistry.port_assignments)) {
      if (data.project === projectName && data.path) {
        return data.path;
      }
    }
    
    return null;
  }

  formatProjectEntry(name, port, directory, status = 'Unknown') {
    let entry = `**${name}**\n`;
    entry += `   - Status: ${status}\n`;
    
    if (port) {
      entry += `   - Localhost: http://localhost:${port}\n`;
    } else {
      entry += `   - Localhost: Not assigned\n`;
    }
    
    if (directory && fs.existsSync(directory)) {
      entry += `   - Directory: [Open Folder](${directory})\n`;
    }
    
    return entry;
  }

  checkPortActive(port) {
    try {
      const result = execSync(`lsof -i :${port} -sTCP:LISTEN 2>/dev/null | head -1`, { encoding: 'utf8' });
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  generateProjectTable() {
    let table = `## 📊 PROJECT STATUS TABLE\n\n`;
    table += `| Project | Status | Port | Directory | Last Updated |\n`;
    table += `|---------|--------|------|-----------|-------------|\n`;
    
    for (const [projectName, directory] of Object.entries(PROJECT_DIRECTORIES)) {
      const port = this.getProjectPort(projectName);
      const status = port && this.checkPortActive(port) ? '🟢 Active' : '⚫ Inactive';
      const portDisplay = port ? `[${port}](http://localhost:${port})` : 'None';
      const dirDisplay = `[📁](${directory})`;
      
      table += `| ${projectName} | ${status} | ${portDisplay} | ${dirDisplay} | ${this.timestamp} |\n`;
    }
    
    return table;
  }

  updateDashboard() {
    // Update timestamp
    this.dashboardContent = this.dashboardContent.replace(
      /\*\*Last Updated:\*\* .+/,
      `**Last Updated:** ${new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })} | **DevOps Manager:** Pachacuti`
    );
    
    // Add or update project table at the end
    const tableMarker = '## 📊 PROJECT STATUS TABLE';
    const tableIndex = this.dashboardContent.indexOf(tableMarker);
    
    if (tableIndex > -1) {
      // Replace existing table
      const endIndex = this.dashboardContent.indexOf('\n## ', tableIndex + 1);
      const newTable = this.generateProjectTable();
      
      if (endIndex > -1) {
        this.dashboardContent = 
          this.dashboardContent.substring(0, tableIndex) +
          newTable +
          this.dashboardContent.substring(endIndex);
      } else {
        this.dashboardContent = 
          this.dashboardContent.substring(0, tableIndex) +
          newTable;
      }
    } else {
      // Add new table at the end
      this.dashboardContent += '\n\n' + this.generateProjectTable();
    }
    
    // Save updated dashboard
    fs.writeFileSync(DASHBOARD_MD_PATH, this.dashboardContent);
    console.log('✅ Dashboard updated successfully');
  }

  generateHTMLDashboard() {
    const htmlPath = '/Users/Danallovertheplace/pachacuti/devops/project-links.html';
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Quick Links - Pachacuti DevOps</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .project-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .project-card {
            background: #f7f7f7;
            border-radius: 8px;
            padding: 15px;
            border: 2px solid #e0e0e0;
            transition: all 0.3s ease;
        }
        .project-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            border-color: #667eea;
        }
        .project-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .project-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .link-btn {
            padding: 5px 10px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
            transition: background 0.3s;
        }
        .link-btn:hover {
            background: #764ba2;
        }
        .status-active {
            color: #4caf50;
            font-weight: bold;
        }
        .status-inactive {
            color: #999;
        }
        .updated {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Project Quick Links Dashboard</h1>
        <div class="project-grid">`;
    
    for (const [projectName, directory] of Object.entries(PROJECT_DIRECTORIES)) {
      const port = this.getProjectPort(projectName);
      const isActive = port && this.checkPortActive(port);
      
      html += `
            <div class="project-card">
                <div class="project-name">${projectName}</div>
                <div class="status ${isActive ? 'status-active' : 'status-inactive'}">
                    ${isActive ? '🟢 Active' : '⚫ Inactive'}
                </div>
                <div class="project-links">`;
      
      if (port) {
        html += `<a href="http://localhost:${port}" target="_blank" class="link-btn">Port ${port}</a>`;
      }
      
      if (directory && fs.existsSync(directory)) {
        html += `<a href="file://${directory}" class="link-btn">📁 Open Folder</a>`;
      }
      
      html += `
                </div>
            </div>`;
    }
    
    html += `
        </div>
        <div class="updated">Last Updated: ${new Date().toLocaleString()}</div>
    </div>
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
    
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML dashboard created at: ${htmlPath}`);
  }

  run() {
    console.log('🔄 Updating DevOps Dashboard...');
    this.updateDashboard();
    this.generateHTMLDashboard();
    console.log('📊 Dashboard update complete!');
    
    // Show current port status
    console.log('\n📍 Current Port Assignments:');
    for (const [port, data] of Object.entries(this.portRegistry.port_assignments)) {
      const active = this.checkPortActive(port) ? '✅' : '❌';
      console.log(`  ${active} Port ${port}: ${data.project}`);
    }
  }
}

// Run the updater
if (require.main === module) {
  const updater = new DashboardUpdater();
  updater.run();
  
  // Watch mode
  if (process.argv.includes('--watch')) {
    console.log('\n👁️ Watching for changes...');
    fs.watchFile(PORT_REGISTRY_PATH, () => {
      console.log('\n🔄 Port registry changed, updating...');
      const updater = new DashboardUpdater();
      updater.run();
    });
  }
}

module.exports = DashboardUpdater;