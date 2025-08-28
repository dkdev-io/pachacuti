#!/usr/bin/env node

/**
 * SIMPLE Claude Code Approval Integration
 * 1. Send approval request (exact terminal format + project context)
 * 2. User replies with number → pass to terminal
 * 3. User replies with non-number → error
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const fs = require('fs').promises;

class SimpleApprovalIntegration {
  constructor() {
    this.webhookUrl = 'https://hooks.slack.com/services/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';
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.lastCheck = Math.floor(Date.now() / 1000);
    this.currentApproval = null;
  }

  /**
   * Send approval request - EXACT terminal format with required summary
   */
  async sendApprovalRequest(data) {
    const { project, userPrompt, toolName, description, command, workingDir } = data;
    
    // Store current approval
    this.currentApproval = data;
    
    // Get directory name from workingDir or project
    const directoryName = workingDir ? workingDir.split('/').pop() : project;
    
    // Format required summary: "Directory Name/Last prompt"
    const summaryHeader = `${directoryName}/${userPrompt}`;
    
    // EXACT terminal format message with summary
    const message = {
      text: `Claude Code needs approval: ${toolName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `**${summaryHeader}**`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Claude wants to run: ${toolName}\n\n${description}\n\nCommand: \`${command}\``
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`[1] Yes, proceed\n[2] No, cancel\n[3] Always approve this tool\n\nChoose (1-3):\`\`\``
          }
        }
      ]
    };

    return this.sendToSlack(message);
  }

  /**
   * Check for user responses
   */
  async checkForResponses() {
    try {
      const convs = await this.client.conversations.list({ types: 'im' });
      
      for (const conv of convs.channels) {
        try {
          const history = await this.client.conversations.history({
            channel: conv.id,
            oldest: this.lastCheck.toString(),
            limit: 5
          });
          
          for (const msg of history.messages || []) {
            await this.processResponse(msg);
          }
        } catch (e) {
          // Skip
        }
      }
      
      this.lastCheck = Math.floor(Date.now() / 1000);
      
    } catch (error) {
      console.error('Check error:', error.message);
    }
  }

  /**
   * Process user response
   */
  async processResponse(message) {
    // Skip bot messages
    const auth = await this.client.auth.test();
    if (message.user === auth.user_id || !this.currentApproval) return;

    const text = message.text?.trim();
    if (!text) return;

    // Check if it's a valid number (1, 2, or 3)
    if (text === '1' || text === '2' || text === '3') {
      const choice = parseInt(text);
      
      console.log(`✅ User chose: ${choice}`);
      
      // Write result for terminal
      const result = {
        choice,
        approved: choice === 1,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile('/tmp/claude-approval-result.json', JSON.stringify(result));
      
      // Confirm to user
      const choiceNames = ['', 'Yes, proceed', 'No, cancel', 'Always approve'];
      await this.sendToSlack({
        text: `✅ Choice received: ${choice} - ${choiceNames[choice]}`
      });
      
      // Clear current approval
      this.currentApproval = null;
      
    } else {
      // Error - not a valid number
      console.log(`❌ Invalid response: ${text}`);
      
      await this.sendToSlack({
        text: `❌ Please reply with 1, 2, or 3 only. You sent: "${text}"`
      });
    }
  }

  /**
   * Send to Slack via webhook
   */
  async sendToSlack(message) {
    const https = require('https');
    const data = JSON.stringify(message);
    
    return new Promise((resolve, reject) => {
      const req = https.request(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`Status: ${res.statusCode}`));
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Start monitoring - reduced frequency to avoid rate limits
   */
  startMonitoring() {
    console.log('🔍 Monitoring Slack for responses...');
    // Check every 10 seconds instead of 2 to avoid rate limits
    setInterval(() => this.checkForResponses(), 10000);
  }
}

// Test it
if (require.main === module) {
  const approval = new SimpleApprovalIntegration();
  
  // Send test approval
  approval.sendApprovalRequest({
    project: 'pachacuti-slack-integration',
    userPrompt: 'fix simple approval integration format',
    toolName: 'Bash',
    description: 'Execute shell command to remove temporary files',
    command: 'rm -rf /tmp/test-files/*',
    workingDir: '/Users/Danallovertheplace/pachacuti/lib/slack-integration'
  }).then(() => {
    console.log('✅ Approval sent! Reply with 1, 2, or 3 in Slack');
    approval.startMonitoring();
  });
}

module.exports = SimpleApprovalIntegration;