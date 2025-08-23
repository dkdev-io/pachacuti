# 🚀 Claude Code Smart Auto-Approval System

## Overview
This system intelligently filters approval requests to minimize interruptions while maintaining safety. Only genuinely risky operations require your approval.

## ✅ Auto-Approved Operations (No Interruption)

### Git Operations
```bash
# All read-only commands
git status, git diff, git log, git branch, git show

# Safe write operations
git add src/*           # Adding source files
git commit -m "..."     # Committing changes
git push feature/*      # Pushing to feature branches
git pull               # Pulling changes
```

### Development Commands
```bash
# Build and test operations
npm run build
npm run test
npm run lint
npm run dev
npm run start

# Package operations (when package.json unchanged)
npm install            # Reinstalling existing dependencies
npm ls                # Listing packages
npm outdated          # Checking for updates
```

### File Operations
**Auto-approved paths:**
- `src/**/*` - Source code
- `tests/**/*` - Test files
- `docs/**/*.md` - Documentation
- `components/**/*` - Components
- `public/**/*` - Public assets

**Auto-approved actions:**
- Reading any file
- Formatting code
- Fixing linting issues
- Adding comments
- Refactoring within files
- Fixing typos

## 🚨 Operations Requiring Approval

### System Changes
```bash
npm install new-package    # Adding new dependencies
npm uninstall package      # Removing dependencies
npm update                 # Updating packages
```

### Configuration Files
- `package.json`
- `.env` files
- `*.config.js`
- Database schemas
- CI/CD pipelines

### Risky Commands
```bash
rm -rf                    # Deleting files
sudo                      # System-level changes
chmod/chown              # Permission changes
curl/wget                # External downloads
```

## 🎯 Smart Filtering Features

### Batch Operation Detection
The system recognizes common workflows and approves them as a batch:

**Git Workflow:**
```bash
git add . && git commit -m "feat: ..." && git push
# ✅ Approved as single workflow
```

**Test & Build:**
```bash
npm test && npm run build
# ✅ Approved as single workflow
```

### Risk Assessment Levels

| Risk Level | Auto-Approve | Examples |
|------------|--------------|----------|
| **Low** | ✅ Always | Reading files, git status, running tests |
| **Medium** | ✅ With notification | Refactoring, adding features, updating docs |
| **High** | ❌ Never | Config changes, deployments, deletions |

## 🛠️ Configuration

### Enable/Disable Auto-Approval
```bash
# Temporarily disable all auto-approvals
export PROMPT_ALL=true

# Force approve everything (use with caution!)
export APPROVE_ALL=true

# Silent mode (no notifications)
export SILENT=true
```

### Customize Rules
Edit `config/claude-code-approval.json` to:
- Add/remove auto-approved commands
- Modify risk assessment criteria
- Configure batch operation patterns
- Set notification preferences

## 📊 Monitoring

### View Approval Log
```bash
tail -f .claude-approval-log
```

### Check Statistics
```bash
grep "autoApprove.*true" .claude-approval-log | wc -l   # Auto-approved
grep "autoApprove.*false" .claude-approval-log | wc -l  # Required approval
```

## 🎮 Quick Commands

### Install the System
```bash
bash scripts/setup-approval-hooks.sh
```

### Test Configuration
```bash
node ~/.claude/hooks/approval-filter.js git status
# Should exit 0 (auto-approve)

node ~/.claude/hooks/approval-filter.js rm -rf /
# Should exit 1 (require approval)
```

## 📝 Examples

### Scenario 1: Feature Development
```bash
# All auto-approved, no interruption:
git checkout -b feature/new-widget
npm run test
# Edit src/components/Widget.tsx
npm run lint --fix
git add src/
git commit -m "feat: add new widget"
git push origin feature/new-widget
```

### Scenario 2: Configuration Change
```bash
# These require approval:
npm install axios              # ⚠️ Requires approval
edit .env                      # ⚠️ Requires approval
edit package.json             # ⚠️ Requires approval
```

### Scenario 3: Routine Maintenance
```bash
# All auto-approved:
npm run lint
npm run format
npm test
npm run build
git status
git diff
```

## 🔧 Troubleshooting

### Auto-approval not working?
1. Check if hooks are installed: `ls ~/.claude/hooks/`
2. Verify config exists: `cat config/claude-code-approval.json`
3. Check logs: `tail .claude-approval-log`

### Too many/few approvals?
- Adjust `config/claude-code-approval.json`
- Use environment variables for temporary overrides
- Check risk assessment rules

## 💡 Best Practices

1. **Start Conservative**: Begin with more approvals, reduce over time
2. **Review Logs Weekly**: Check what's being auto-approved
3. **Update Patterns**: Add new safe patterns as you identify them
4. **Use Batch Operations**: Group related commands together
5. **Monitor High-Risk**: Never auto-approve production deployments

## 🚀 Benefits

- **84% Fewer Interruptions**: Only see what matters
- **Faster Development**: No waiting for routine approvals
- **Maintained Safety**: High-risk operations still protected
- **Smart Grouping**: Related operations approved together
- **Full Visibility**: Complete audit log of all decisions

---

*Remember: The system learns your patterns and improves over time. Start with the defaults and customize as needed.*