# 🔄 Auto-Update Dashboard Documentation

**Created:** 2025-08-25  
**Purpose:** Automatically maintain project links and port assignments in DevOps dashboard

## 📊 What's Been Added

### 1. **Enhanced PROJECT_PORTFOLIO_DASHBOARD.md**
- Added directory links for all projects
- Added localhost URLs for all assigned ports
- Added special projects section (SecureSend, DevOps Dashboard)
- Added auto-generated project status table

### 2. **Auto-Update Script**
**Location:** `/Users/Danallovertheplace/pachacuti/scripts/update-project-dashboard.js`

**Features:**
- Reads port registry to get current assignments
- Checks if ports are actively listening
- Updates markdown dashboard with current info
- Generates HTML dashboard with clickable links
- Supports watch mode for automatic updates

### 3. **HTML Quick Links Dashboard**
**Location:** `/Users/Danallovertheplace/pachacuti/devops/project-links.html`

**Features:**
- Visual grid of all projects
- Quick links to localhost and directories
- Auto-refreshes every 30 seconds
- Shows active/inactive status
- Mobile responsive design

## 🚀 How to Use

### Manual Update:
```bash
node scripts/update-project-dashboard.js
```

### Watch Mode (Auto-Update):
```bash
node scripts/update-project-dashboard.js --watch
```

### Add to Cron (Auto-Run Every 5 Minutes):
```bash
*/5 * * * * cd /Users/Danallovertheplace/pachacuti && node scripts/update-project-dashboard.js
```

### Open HTML Dashboard:
```bash
open /Users/Danallovertheplace/pachacuti/devops/project-links.html
```

Or serve it:
```bash
cd /Users/Danallovertheplace/pachacuti/devops
python3 -m http.server 8085
# Then visit: http://localhost:8085/project-links.html
```

## 📋 What Gets Updated

### Markdown Dashboard:
- Last updated timestamp
- Project status (active/inactive)
- Port assignments with links
- Directory paths with links
- Auto-generated status table

### HTML Dashboard:
- Real-time port status
- Clickable project cards
- Direct links to localhost
- Direct links to project folders
- Auto-refresh every 30 seconds

## 🔧 Configuration

### Adding New Projects:
Edit the `PROJECT_DIRECTORIES` object in the script:
```javascript
const PROJECT_DIRECTORIES = {
  'new-project-name': '/path/to/project',
  // ... other projects
};
```

### Changing Port Registry Location:
Update `PORT_REGISTRY_PATH` in the script:
```javascript
const PORT_REGISTRY_PATH = '/your/path/to/port-registry.json';
```

## 📊 Dashboard Locations

| Dashboard | Location | Access |
|-----------|----------|--------|
| Markdown | `/devops/PROJECT_PORTFOLIO_DASHBOARD.md` | View in editor |
| HTML | `/devops/project-links.html` | Open in browser |
| Port Registry | `/config/port-registry.json` | JSON data |
| Update Script | `/scripts/update-project-dashboard.js` | Node.js script |

## 🎯 Benefits

1. **Always Current:** Dashboard stays up-to-date automatically
2. **Quick Access:** One-click access to any project
3. **Port Visibility:** See all port assignments at a glance
4. **Conflict Prevention:** Quickly spot port conflicts
5. **Status Monitoring:** Know which projects are running

## 🔍 Troubleshooting

### Script Not Working:
```bash
# Check Node.js is installed
node --version

# Check file permissions
chmod +x scripts/update-project-dashboard.js

# Run with debug output
node scripts/update-project-dashboard.js --verbose
```

### Ports Not Showing Active:
```bash
# Check if port is actually listening
lsof -i :PORT_NUMBER

# Update port registry
./scripts/check-port-availability.sh list
```

### HTML Dashboard Not Opening:
```bash
# Check file exists
ls -la devops/project-links.html

# Open manually
open file:///Users/Danallovertheplace/pachacuti/devops/project-links.html
```

## 🚦 Integration with Port Management

The auto-update script works with:
- **Port Registry:** `/config/port-registry.json`
- **Port Checker:** `/scripts/check-port-availability.sh`
- **Project Dashboard:** `/devops/PROJECT_PORTFOLIO_DASHBOARD.md`

When you assign a new port:
1. Register it: `./scripts/check-port-availability.sh register PORT PROJECT`
2. Run update: `node scripts/update-project-dashboard.js`
3. View changes: Open HTML dashboard

## 📈 Future Enhancements

- [ ] Add project health metrics
- [ ] Include git status for each project
- [ ] Show last commit info
- [ ] Add project dependencies
- [ ] Include memory/CPU usage
- [ ] Add search/filter functionality
- [ ] Create REST API endpoint
- [ ] Add WebSocket for real-time updates

---

**Note:** The dashboard auto-updates when the port registry changes in watch mode!