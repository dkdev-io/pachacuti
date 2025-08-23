# Claude Code Daily Briefing System

## Overview

Automatic daily briefing system that provides:
- Claude Code capability updates
- Project analysis and optimization opportunities  
- Smart recommendations using new features
- Time estimates and quick wins

## Features

### 1. Claude Code Updates
- Detects changes in Claude Code capabilities
- Tracks new tools, agents, and features
- Shows performance improvements
- Displays "No changes today" when nothing new

### 2. Project Analysis
- Scans all projects in pachacuti and parent directories
- Identifies:
  - Uncommitted changes
  - TODOs and FIXMEs
  - Missing test coverage
  - Complex files (>500 lines)
  - Performance bottlenecks

### 3. Smart Recommendations
- Suggests optimal Claude Code features for each project
- Prioritizes by impact and time required
- Shows exact commands to implement
- Identifies quick wins (<5 minutes)

### 4. Time Optimization
- Estimates time savings using parallel agents
- Shows efficiency gains from batch operations
- Recommends swarm coordination for large projects

## Installation

```bash
# Run setup script
chmod +x daily-briefing/setup.sh
./daily-briefing/setup.sh
```

This will:
- Add auto-run to your shell config (.zshrc/.bashrc)
- Create VS Code task (optional)
- Set up daily cron job (optional)
- Create command aliases

## Usage

### Automatic Mode
Briefing runs automatically when you:
- Open terminal and cd into pachacuti
- Open pachacuti in VS Code (if configured)
- At 9 AM daily (if cron configured)

### Manual Commands
```bash
# Full briefing
briefing  # or 'brief'

# Just recommendations
recs

# Run specific component
node daily-briefing/scripts/claude-updates.js
node daily-briefing/scripts/project-analyzer.js
```

## Sample Output

```
============================================================
📅 CLAUDE CODE DAILY BRIEFING
📆 Friday, August 23, 2024
============================================================

1️⃣ Claude Code Updates
------------------------------
• No Claude Code changes today

2️⃣ Project Analysis
------------------------------
📊 Found 3 projects:
  ⚠️ pachacuti (12 TODOs)
  ✅ daily-briefing
  ⚠️ my-app (uncommitted changes)

3️⃣ Recommendations
------------------------------

🎯 Quick Wins (< 5 minutes):
  • pachacuti: Use batch file operations (5 minutes)
    → Read(f1); Read(f2); Edit(f3) // All in one message
  • my-app: Commit pending changes (2 minutes)
    → git add -A && git commit -m "chore: Clean up"

🟡 High Priority:
  • Add test coverage to my-app
    Time: 20 minutes | Benefit: Prevent regressions
  • Complete 12 TODOs in pachacuti
    Time: 60 minutes with parallel agents | Benefit: Reduce technical debt

4️⃣ Today's Focus
------------------------------

🎯 Recommended Task:
   Add test coverage to my-app
   Time: 20 minutes
   Benefit: Prevent regressions

   How to implement:
   ```
   Task("tdd-london-swarm", "Create test suite with mocks")
   Task("tester", "Add integration tests")
   Bash("npm test -- --coverage")
   ```

5️⃣ Summary
------------------------------
  • Total optimization opportunities: 8
  • Estimated time to complete all: 1h 45m
  • Potential efficiency gain: 70%

============================================================
💡 Tip: Use parallel agents (Task tool) for 2.8x faster execution!
📚 Full docs: /docs/claude-code/README.md
============================================================
```

## Components

### claude-updates.js
- Checks Claude version
- Detects tool changes
- Tracks new agents
- Monitors performance improvements

### project-analyzer.js
- Discovers all projects
- Analyzes code metrics
- Finds optimization opportunities
- Identifies applicable Claude features

### recommendation-engine.js
- Generates smart recommendations
- Prioritizes by impact
- Provides implementation code
- Calculates time estimates

### daily-briefing.js
- Main orchestrator
- Generates formatted output
- Saves reports
- Calculates statistics

## Configuration

### Customize Analysis
Edit `daily-briefing/config/settings.json`:
```json
{
  "scanDepth": 3,
  "includePaths": ["~/projects"],
  "excludePaths": ["node_modules", ".git"],
  "todoPatterns": ["TODO", "FIXME", "HACK"],
  "complexityThreshold": 500,
  "quickWinMaxMinutes": 5
}
```

### Schedule
Modify cron timing in setup.sh:
```bash
# Default: 9 AM daily
0 9 * * *

# Every morning at 8:30 AM
30 8 * * *

# Monday-Friday at 9 AM
0 9 * * 1-5
```

## Data Storage

### Reports
- `/daily-briefing/reports/` - Daily briefing logs
- `/daily-briefing/data/` - Analysis data
- `latest-briefing.json` - Most recent briefing

### Tracking Files
- `last-check.json` - Last Claude update check
- `projects.json` - Project inventory
- `analysis.json` - Latest analysis
- `.last-run` - Prevents duplicate daily runs

## Troubleshooting

### Briefing not running automatically
```bash
# Check shell config
grep "claude-briefing" ~/.zshrc

# Reload shell
source ~/.zshrc

# Test function
claude-briefing
```

### No projects found
```bash
# Check project discovery
node daily-briefing/scripts/project-analyzer.js

# Verify git repos
find . -name ".git" -type d
```

### Missing recommendations
```bash
# Run components individually
node daily-briefing/scripts/claude-updates.js
node daily-briefing/scripts/recommendation-engine.js
```

## Benefits

### Time Savings
- Identifies quick wins immediately
- Shows exact time estimates
- Recommends parallel execution
- Prevents wasted effort

### Code Quality
- Finds technical debt
- Suggests test coverage
- Identifies complex code
- Recommends refactoring

### Productivity
- Daily focus recommendation
- Prioritized task list
- New feature awareness
- Optimization opportunities

## Future Enhancements

Planned features:
- AI-powered code review summaries
- Team collaboration features
- Progress tracking over time
- Custom recommendation rules
- Integration with GitHub issues
- Slack/Discord notifications

## Contributing

To add new analysis features:
1. Add analyzer in `scripts/`
2. Integrate in `daily-briefing.js`
3. Update recommendation engine
4. Add to documentation

## License

Part of the pachacuti project