# 🎯 Terminal Naming Quick Reference

## Automatic Commands
```bash
auto-name           # Auto-detect project & session type
smart-name          # Use git branch for context
claude-init         # Initialize Claude Code session
```

## Manual Naming
```bash
name-window "Custom-Title"    # Set any custom title
```

## Project Shortcuts
```bash
# Crypto Campaign
name-crypto-main    # Crypto-MainDev
name-crypto-bug     # Crypto-BugFix
name-crypto-feature # Crypto-Feature

# Voter Analytics
name-voter-main     # Voter-MainDev
name-voter-bugs     # Voter-BugFix
name-voter-analytics # Voter-Analytics

# Other Projects
name-tools-main     # Tools-MainDev
name-agentic-arch   # Agentic-Architecture
name-agentic-test   # Agentic-Testing
name-devops         # DevOps-Monitor
```

## Session Types
```bash
name-feature        # [Current-Project]-Feature
name-bugfix         # [Current-Project]-BugFix
name-testing        # [Current-Project]-Testing
name-review         # [Current-Project]-Review
name-refactor       # [Current-Project]-Refactor
```

## Task Management
```bash
start-task feature "User authentication"  # Start & name
start-task bugfix "Fix login issue"      # Start & name
end-task                                  # Complete & reset
```

## Project Switching
```bash
switch-project crypto     # Switch to crypto-campaign
switch-project tools      # Switch to productivity-tools
switch-project voter      # Switch to VoterAnalytics
```

## Help
```bash
name-help          # Show all naming commands
```

## Auto-Activation
To automatically name terminals on startup, add to your shell profile:
```bash
source ~/devops/claude-session-init.sh
```
