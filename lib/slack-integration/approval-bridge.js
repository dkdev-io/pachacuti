#!/usr/bin/env node

/**
 * Slack-Terminal Approval Bridge
 * Connects Slack DM responses to Claude Code terminal approvals
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const fs = require('fs').promises;
const path = require('path');

class SlackApprovalBridge {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.webhookUrl = 'https://hooks.slack.com/services/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';
    this.pendingApprovals = new Map(); // approvalId -> terminal info
    this.lastMessageCheck = 0;
  }

  /**
   * Send approval request to Slack
   */
  async sendApprovalRequest(approvalData) {
    const { 
      approvalId, 
      command, 
      options = ['Approve', 'Deny', 'Always approve'],
      terminalInfo = {}
    } = approvalData;

    // Store approval for response processing
    this.pendingApprovals.set(approvalId, {
      command,
      options,
      terminalInfo,
      timestamp: Date.now()
    });

    // Build option buttons
    const optionText = options.map((opt, i) => `[${i+1}] ${opt}`).join('  ');

    const message = {
      text: `🔐 Claude Code Approval Required: ${command}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔐 Claude Code Approval Required',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Command:*\n\`\`\`${command}\`\`\``
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Options:*\n${optionText}\n\n💬 **Reply with just the number (1, 2, or 3)**`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Approval ID: ${approvalId} | Terminal: ${terminalInfo.tty || 'unknown'}`
            }
          ]
        }
      ]
    };

    // Send via webhook since we have that working
    return this.sendWebhookMessage(message);
  }

  /**
   * Check for approval responses in DMs
   */
  async checkForApprovalResponses() {
    try {
      const convs = await this.client.conversations.list({ types: 'im' });
      
      // Check messages since last check
      const checkTime = this.lastMessageCheck || (Date.now() - 300000) / 1000; // 5 minutes ago if first run
      
      for (const conv of convs.channels) {
        try {
          const history = await this.client.conversations.history({
            channel: conv.id,
            oldest: checkTime.toString(),
            limit: 10
          });
          
          if (history.messages && history.messages.length > 0) {
            for (const message of history.messages) {
              await this.processMessage(message, conv.id);
            }
          }
          
        } catch (e) {
          // Skip inaccessible conversations
        }
      }
      
      this.lastMessageCheck = Date.now() / 1000;
      
    } catch (error) {
      console.error('Error checking DMs:', error.message);
    }
  }

  /**
   * Process a single message for approval responses
   */
  async processMessage(message, channelId) {
    // Skip bot's own messages
    const auth = await this.client.auth.test();
    if (message.user === auth.user_id) return;

    const text = message.text?.trim();
    if (!text) return;

    // Check if it's a number response (1, 2, 3, etc.)
    const numberMatch = text.match(/^(\d+)$/);
    if (!numberMatch) return;

    const choice = parseInt(numberMatch[1]);
    console.log(`📱 Received approval response: ${choice}`);

    // Find the most recent pending approval (simple approach)
    const recentApprovals = Array.from(this.pendingApprovals.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);

    if (recentApprovals.length === 0) {
      console.log('⚠️ No pending approvals found');
      return;
    }

    const [approvalId, approvalData] = recentApprovals[0];
    
    if (choice < 1 || choice > approvalData.options.length) {
      console.log(`⚠️ Invalid choice: ${choice}`);
      return;
    }

    // Process the approval
    await this.processApprovalChoice(approvalId, choice, approvalData);
    
    // Send confirmation via webhook
    await this.sendConfirmation(approvalId, choice, approvalData);
  }

  /**
   * Process the approval choice (simulate terminal input)
   */
  async processApprovalChoice(approvalId, choice, approvalData) {
    console.log(`✅ Processing approval ${approvalId}: Choice ${choice} (${approvalData.options[choice-1]})`);
    
    // Here you would integrate with the actual Claude Code terminal approval system
    // For now, we'll simulate it by writing to a file that the terminal can monitor
    
    const approvalFile = `/tmp/claude-approval-${approvalId}`;
    const approvalResult = {
      approvalId,
      choice,
      option: approvalData.options[choice-1],
      command: approvalData.command,
      timestamp: new Date().toISOString(),
      processed: true
    };
    
    await fs.writeFile(approvalFile, JSON.stringify(approvalResult, null, 2));
    console.log(`📁 Approval result written to: ${approvalFile}`);
    
    // Remove from pending
    this.pendingApprovals.delete(approvalId);
  }

  /**
   * Send confirmation back to Slack
   */
  async sendConfirmation(approvalId, choice, approvalData) {
    const selectedOption = approvalData.options[choice-1];
    
    const message = {
      text: `✅ Approval processed: ${selectedOption}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ **Approval Processed**\n\n*Your choice:* **${choice} - ${selectedOption}**\n*Command:* \`${approvalData.command}\`\n*Status:* Processing in terminal...`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Processed at ${new Date().toLocaleTimeString()} | ID: ${approvalId}`
            }
          ]
        }
      ]
    };

    return this.sendWebhookMessage(message);
  }

  /**
   * Send message via webhook (since this works reliably)
   */
  async sendWebhookMessage(message) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const postData = JSON.stringify(message);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(this.webhookUrl, options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Start monitoring for approval responses
   */
  startMonitoring() {
    console.log('🔍 Starting Slack approval monitoring...');
    
    // Check every 5 seconds for new messages
    setInterval(() => {
      this.checkForApprovalResponses();
    }, 5000);
    
    console.log('✅ Monitoring active - respond with numbers in Slack DMs');
  }
}

// Demo usage
if (require.main === module) {
  const bridge = new SlackApprovalBridge();
  
  // Send a test approval request
  bridge.sendApprovalRequest({
    approvalId: 'test-' + Date.now(),
    command: 'rm -rf important-files/',
    options: ['Approve', 'Deny', 'Always approve'],
    terminalInfo: { tty: 's007' }
  }).then(() => {
    console.log('✅ Test approval sent to Slack');
    console.log('📱 Reply with 1, 2, or 3 in your Slack DMs');
    
    // Start monitoring
    bridge.startMonitoring();
  });
}

module.exports = SlackApprovalBridge;