# Pachacuti Session Recorder

The "Second Brain" for Pachacuti development operations - comprehensive Claude Code session recording and knowledge management system.

## Features

### 🎯 Automatic Session Capture
- Real-time monitoring of file changes
- Git activity tracking
- Command history recording
- Problem/solution documentation

### 🧠 Knowledge Base
- Searchable session index
- Cross-session memory
- Pattern recognition
- Insight generation

### 📊 Reporting & Analytics
- Daily development summaries
- Weekly trend analysis
- Project timelines
- Strategic insights

### 🔗 Pachacuti Integration
- CTO reporting
- Approval system coordination
- DevOps monitoring
- Resource optimization

## Quick Start

```bash
# Setup
./setup.sh

# Start recording
npm start

# Search knowledge
npm run search "authentication bug"

# Generate reports
npm run daily
npm run weekly
```

## Architecture

```
session-recorder/
├── lib/                 # Core modules
│   ├── session-capture.js    # Activity recording
│   ├── git-analyzer.js       # Git history analysis
│   ├── knowledge-base.js     # Search & indexing
│   ├── report-generator.js   # Report creation
│   └── pachacuti-integration.js # System integration
├── data/               # Persistent storage
├── reports/            # Generated reports
└── hooks/              # Git integration
```

## Usage Examples

### Search Development History
```bash
npm run search "database migration"
npm run search "React component"
npm run search "performance issue"
```

### Generate Strategic Reports
```bash
# Daily summary
npm run daily

# Weekly analysis
npm run weekly

# Project timeline
node lib/report-generator.js --timeline pachacuti
```

### API Integration
```javascript
const SessionRecorder = require('./session-recorder');

const recorder = new SessionRecorder();
await recorder.initialize();

// Search knowledge
const results = await recorder.searchKnowledge('authentication');

// Generate CTO report
const report = await recorder.generateCTOReport(sessionData);
```

## Configuration

Environment variables in `.env`:
- `NODE_ENV` - Runtime environment
- `LOG_LEVEL` - Logging verbosity
- `SESSION_RECORDER_PORT` - API port
- `AUTO_DAILY_SUMMARY` - Enable automated summaries

## Integration Points

### Daily Briefing System
```javascript
const sessionData = await recorder.getTodaysSessions();
// Integrated into daily briefing reports
```

### Approval System
```javascript
const riskAssessment = await recorder.assessSessionRisk(sessionData);
// Feeds into approval optimization
```

### DevOps Monitoring
```bash
# Get development metrics
./devops/session-metrics.sh
```

## Commands

- `npm start` - Start session recorder
- `npm run capture` - Manual capture
- `npm run search` - Interactive search
- `npm run daily` - Daily summary
- `npm run weekly` - Weekly analysis
- `npm run monitor` - Real-time monitoring

## Data Storage

### SQLite Database
- Sessions, commits, files, problems/solutions
- Searchable with full-text indexing
- Exportable to JSON/Markdown

### File System
- Session snapshots: `data/sessions/`
- Reports: `reports/daily/`, `reports/weekly/`
- Archives: `archive/`

## Automation

### Scheduled Tasks
- Daily summaries at 11:59 PM
- Weekly reports on Sundays
- Automated knowledge indexing

### Git Hooks
- Post-commit capture
- Pre-push analysis
- Automatic session linking

## Security & Privacy

- All data stored locally
- No external API calls for sensitive data
- Configurable data retention
- Secure git hook integration

## Contributing

The session recorder is part of the Pachacuti development ecosystem. See main project documentation for contribution guidelines.

## Support

For issues or questions:
1. Check existing session logs
2. Review knowledge base
3. Generate diagnostic report
4. Contact development team

---

*Part of the Pachacuti Development Operations Suite*
