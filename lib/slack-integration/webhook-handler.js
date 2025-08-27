#!/usr/bin/env node

/**
 * Slack Webhook Handler
 * Express server to handle Slack interactive callbacks
 */

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const SlackChannelManager = require('./channel-manager');
const SlackApprovalBot = require('./approval-bot');

class SlackWebhookServer {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.channelManager = null;
    this.approvalBot = null;
    this.signingSecret = process.env.SLACK_SIGNING_SECRET;
    
    // Store for inter-process communication
    this.approvalCallbacks = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  setupMiddleware() {
    // Raw body needed for signature verification
    this.app.use('/slack/*', bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
  }

  /**
   * Set up routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        slack: this.channelManager ? this.channelManager.isHealthy : false,
        timestamp: new Date().toISOString()
      });
    });

    // Slack interactive endpoint
    this.app.post('/slack/interactive', async (req, res) => {
      // Verify Slack signature
      if (!this.verifySlackSignature(req)) {
        return res.status(401).send('Unauthorized');
      }
      
      // Parse payload
      const payload = JSON.parse(req.body.toString());
      
      // Handle different interaction types
      switch (payload.type) {
        case 'block_actions':
          await this.handleBlockActions(payload, res);
          break;
          
        case 'view_submission':
          await this.handleViewSubmission(payload, res);
          break;
          
        case 'shortcut':
          await this.handleShortcut(payload, res);
          break;
          
        default:
          res.status(200).send();
      }
    });

    // Slack slash commands
    this.app.post('/slack/commands', async (req, res) => {
      // Verify Slack signature
      if (!this.verifySlackSignature(req)) {
        return res.status(401).send('Unauthorized');
      }
      
      const { command, text, user_id, channel_id } = req.body;
      
      switch (command) {
        case '/approval-status':
          await this.handleApprovalStatus(text, user_id, channel_id, res);
          break;
          
        case '/approval-cleanup':
          await this.handleCleanupCommand(user_id, channel_id, res);
          break;
          
        default:
          res.send('Unknown command');
      }
    });

    // Slack events (for future use)
    this.app.post('/slack/events', async (req, res) => {
      // Verify Slack signature
      if (!this.verifySlackSignature(req)) {
        return res.status(401).send('Unauthorized');
      }
      
      const event = req.body;
      
      // URL verification challenge
      if (event.type === 'url_verification') {
        return res.send(event.challenge);
      }
      
      // Handle events
      if (event.event) {
        await this.handleEvent(event.event);
      }
      
      res.status(200).send();
    });

    // Local API for shell integration
    this.app.post('/api/register-callback', (req, res) => {
      const { approvalId, callback } = req.body;
      this.approvalCallbacks.set(approvalId, callback);
      res.json({ success: true });
    });

    this.app.get('/api/pending-approvals', (req, res) => {
      if (!this.approvalBot) {
        return res.json([]);
      }
      
      const pending = Array.from(this.approvalBot.pendingApprovals.values());
      res.json(pending);
    });
  }

  /**
   * Verify Slack request signature
   */
  verifySlackSignature(req) {
    if (!this.signingSecret) {
      console.warn('No signing secret configured');
      return true; // Allow in development
    }
    
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    
    if (!signature || !timestamp) {
      return false;
    }
    
    // Check timestamp to prevent replay attacks
    const time = Math.floor(Date.now() / 1000);
    if (Math.abs(time - timestamp) > 60 * 5) {
      return false;
    }
    
    // Verify signature
    const sigBasestring = `v0:${timestamp}:${req.body.toString()}`;
    const mySignature = 'v0=' + crypto
      .createHmac('sha256', this.signingSecret)
      .update(sigBasestring)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }

  /**
   * Handle block actions (button clicks)
   */
  async handleBlockActions(payload, res) {
    const action = payload.actions[0];
    const user = payload.user;
    const responseUrl = payload.response_url;
    
    switch (action.action_id) {
      case 'approve_command':
        await this.handleApproval(action.value, true, user.id, responseUrl);
        res.status(200).send();
        break;
        
      case 'deny_command':
        await this.handleApproval(action.value, false, user.id, responseUrl);
        res.status(200).send();
        break;
        
      case 'add_note':
        // Open a modal for adding notes
        await this.openNoteModal(payload.trigger_id, action.value);
        res.status(200).send();
        break;
        
      default:
        res.status(200).send();
    }
  }

  /**
   * Handle Slack events
   */
  async handleEvent(event) {
    console.log('Received Slack event:', event.type);
    
    switch (event.type) {
      case 'message':
        // Handle message events if needed
        break;
      case 'app_mention':
        // Handle app mentions if needed
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
  }

  /**
   * Handle approval action
   */
  async handleApproval(approvalId, approved, userId, responseUrl) {
    if (!this.approvalBot) {
      console.error('Approval bot not initialized');
      return;
    }
    
    // Process approval
    const result = await this.approvalBot.handleApprovalResponse(
      approvalId,
      approved,
      userId,
      responseUrl
    );
    
    // Trigger local callback if registered
    const callback = this.approvalCallbacks.get(approvalId);
    if (callback) {
      try {
        // Execute callback (this would be an IPC mechanism in production)
        await fetch(callback, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId, approved, userId })
        });
      } catch (error) {
        console.error('Failed to trigger callback:', error);
      }
      
      this.approvalCallbacks.delete(approvalId);
    }
    
    return result;
  }

  /**
   * Handle approval status command
   */
  async handleApprovalStatus(text, userId, channelId, res) {
    if (!this.approvalBot) {
      return res.send('Approval system not initialized');
    }
    
    const shellId = text.trim();
    
    if (shellId) {
      // Get approvals for specific shell
      const approvals = this.approvalBot.getPendingApprovalsForShell(shellId);
      
      if (approvals.length === 0) {
        return res.send(`No pending approvals for shell ${shellId}`);
      }
      
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Pending approvals for shell ${shellId}:*`
          }
        }
      ];
      
      approvals.forEach(approval => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• \`${approval.command}\`\n  _Waiting since ${approval.createdAt.toLocaleTimeString()}_`
          }
        });
      });
      
      return res.json({ blocks });
    } else {
      // Get all pending approvals
      const allPending = Array.from(this.approvalBot.pendingApprovals.values());
      
      if (allPending.length === 0) {
        return res.send('No pending approvals');
      }
      
      return res.send(`${allPending.length} pending approvals across all shells`);
    }
  }

  /**
   * Handle cleanup command
   */
  async handleCleanupCommand(userId, channelId, res) {
    if (!this.channelManager) {
      return res.send('Channel manager not initialized');
    }
    
    const count = await this.channelManager.cleanupArchivedChannels(30);
    res.send(`Found ${count} archived channels (cleanup requires Enterprise Grid)`);
  }

  /**
   * Open modal for adding notes
   */
  async openNoteModal(triggerId, approvalId) {
    // This would open a Slack modal for adding notes
    // Implementation depends on specific requirements
    console.log(`Opening note modal for approval ${approvalId}`);
  }

  /**
   * Initialize Slack components
   */
  async initialize() {
    try {
      // Initialize channel manager
      this.channelManager = new SlackChannelManager();
      await this.channelManager.initialize();
      
      // Initialize approval bot
      this.approvalBot = new SlackApprovalBot(this.channelManager);
      
      console.log('✅ Slack components initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Slack components:', error);
      return false;
    }
  }

  /**
   * Start the server
   */
  async start() {
    // Initialize Slack components
    await this.initialize();
    
    // Start Express server
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 Webhook server listening on port ${this.port}`);
      console.log(`📡 Interactive endpoint: http://localhost:${this.port}/slack/interactive`);
      console.log(`📡 Commands endpoint: http://localhost:${this.port}/slack/commands`);
      console.log(`📡 Events endpoint: http://localhost:${this.port}/slack/events`);
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      console.log('🛑 Webhook server stopped');
    }
    
    if (this.approvalBot) {
      this.approvalBot.cleanup();
    }
  }
}

// Export the class
module.exports = SlackWebhookServer;

// Run if executed directly
if (require.main === module) {
  const port = process.env.SLACK_WEBHOOK_PORT || 3000;
  const server = new SlackWebhookServer(port);
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    await server.stop();
    process.exit(0);
  });
  
  // Start server
  server.start().catch(console.error);
}