# Pachacuti Slack Integration

Hierarchical Slack channel management for shell command approvals.

## Features

- **Dynamic Channel Creation**: Creates channels with pattern `#appr-{project}-{shell}-{subshell}`
- **15-Minute Reminders**: Never auto-denies, sends reminders every 15 minutes
- **Channel Archiving**: Archives channels when shells close (deletion requires Enterprise Grid)
- **Terminal Fallback**: Falls back to terminal approval when Slack is unavailable
- **Health Monitoring**: Automatic detection of Slack availability

## Setup

### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Pachacuti Approval Bot"
4. Select your workspace

### 2. Configure OAuth Scopes

Under "OAuth & Permissions", add these Bot Token Scopes:
- `channels:manage`
- `channels:read`
- `chat:write`
- `chat:write.public`
- `commands`
- `groups:write`
- `im:write`
- `users:read`

### 3. Enable Interactive Components

1. Go to "Interactivity & Shortcuts"
2. Toggle ON
3. Request URL: `https://your-domain.com/slack/interactive`

### 4. Add Slash Commands

Under "Slash Commands", add:
- `/approval-status` - Check pending approvals
- `/approval-cleanup` - Clean up archived channels

### 5. Install to Workspace

1. Go to "Install App"
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the Bot User OAuth Token (starts with `xoxb-`)

### 6. Configure Environment

```bash
cd /Users/Danallovertheplace/pachacuti/lib/slack-integration
cp .env.example .env
# Edit .env with your tokens

# Or use the setup script:
node setup-slack-app.js
```

### 7. Install Dependencies

```bash
npm install
```

### 8. Start Webhook Server

```bash
npm start
# Or directly:
node webhook-handler.js
```

## Usage

### In Claude Hooks

The integration is automatically used by the approval system:

```javascript
// Automatic usage when command needs approval
const hook = new SlackApprovalHook();
await hook.initialize();
await hook.startShellSession('my-project');

// Request approval
const result = await hook.requestApproval('git push origin main', {
  risk: 'high'
});

// End session (archives channel)
await hook.endShellSession();
```

### Channel Naming

Channels are created with this hierarchy:
- Project level: `#appr-pachacuti`
- Shell level: `#appr-pachacuti-a1b2c3d4`
- Subshell level: `#appr-pachacuti-a1b2c3d4-x9y8z7w6`

### Approval Flow

1. Shell starts → Channel created
2. Command needs approval → Message posted with buttons
3. No response in 15 min → Reminder sent (repeats every 15 min)
4. User clicks Approve/Deny → Command executed/blocked
5. Shell ends → Channel archived

### Terminal Fallback

When Slack is unavailable:
```
⚠️ SLACK OFFLINE - Terminal approval mode active
============================================================
🔐 COMMAND APPROVAL REQUIRED
============================================================
Project: pachacuti
Working Dir: /Users/Danallovertheplace/pachacuti
Risk Level: high
------------------------------------------------------------
Command:
  git push origin main
============================================================
Approve? [Y/n]: 
```

## API Endpoints

### Webhook Server

- `GET /health` - Health check
- `POST /slack/interactive` - Slack button interactions
- `POST /slack/commands` - Slash commands
- `POST /slack/events` - Event subscriptions
- `GET /api/pending-approvals` - List pending approvals

## Architecture

```
SlackChannelManager
  ├── Creates/archives channels
  ├── Manages channel lifecycle
  └── Health monitoring

SlackApprovalBot
  ├── Posts approval requests
  ├── Handles reminders (15 min)
  └── Processes responses

SlackWebhookServer
  ├── Express server
  ├── Signature verification
  └── Routes interactions

SlackApprovalHook
  ├── Shell integration
  ├── Terminal fallback
  └── Session management
```

## Testing

### Test Channel Creation
```bash
node channel-manager.js
```

### Test Approval Flow
```bash
node slack-approval-hook.js
```

### Test Webhook Server
```bash
curl http://localhost:3000/health
```

## Troubleshooting

### Slack Offline
- Check `SLACK_BOT_TOKEN` in .env
- Verify network connectivity
- Check Slack API status

### Channels Not Created
- Verify OAuth scopes
- Check rate limits
- Ensure unique channel names

### Reminders Not Working
- Check node-schedule is installed
- Verify server is running
- Check webhook URL in Slack app

## Limitations

- **Channel Deletion**: Requires Enterprise Grid (we archive instead)
- **Rate Limits**: Subject to Slack API limits
- **Channel Names**: Max 80 characters, lowercase only
- **Persistence**: Channels remain after archiving

## Future Enhancements

- Thread-based approvals within project channels
- Approval analytics and reporting
- Custom reminder intervals
- Bulk approval actions
- Integration with GitHub Actions