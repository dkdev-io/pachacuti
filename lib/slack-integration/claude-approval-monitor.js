#!/usr/bin/env node

/**
 * Claude Code Approval Monitor
 * Monitors Slack for approval responses and writes them for Claude Code to read
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const fs = require('fs').promises;
const path = require('path');

class ClaudeApprovalMonitor {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.lastCheck = Math.floor(Date.now() / 1000);
    this.monitoring = true;
    this.approvalFile = '/tmp/claude-slack-approval.txt';
  }

  /**
   * Start monitoring for approval responses
   */
  async startMonitoring() {
    console.log('🔍 Claude Approval Monitor started...');
    
    // Clear any old approval file
    try {
      await fs.unlink(this.approvalFile);
    } catch (e) {
      // File doesn't exist, that's fine
    }
    
    while (this.monitoring) {
      await this.checkForResponses();
      await this.sleep(5000); // Check every 5 seconds
    }
  }

  /**
   * Check Slack for user responses
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
            await this.processMessage(msg);
          }
        } catch (e) {
          // Skip inaccessible conversations
        }
      }
      
      this.lastCheck = Math.floor(Date.now() / 1000);
      
    } catch (error) {
      console.error('❌ Error checking Slack:', error.message);
    }
  }

  /**
   * Process messages for approval responses
   */
  async processMessage(message) {
    // Skip bot messages
    const auth = await this.client.auth.test();
    if (message.user === auth.user_id) return;

    const text = message.text?.trim();
    if (!text) return;

    // Check if it's a valid approval response (1, 2, or 3)
    if (text === '1' || text === '2' || text === '3') {
      console.log(`📱 Received approval response: ${text}`);
      
      // Write response to file for Claude Code to read
      await fs.writeFile(this.approvalFile, text);
      
      // Send confirmation to Slack
      const choiceNames = ['', 'Yes, proceed', 'No, cancel', 'Always approve'];
      const choiceName = choiceNames[parseInt(text)];
      
      await this.sendConfirmation(text, choiceName);
      
      // Stop monitoring after getting response
      this.monitoring = false;
    }
  }

  /**
   * Send confirmation message to Slack
   */
  async sendConfirmation(choice, choiceName) {
    const webhookUrl = 'https://hooks.slack.com/services/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';
    const https = require('https');
    
    const message = {
      text: `✅ Choice received: ${choice} - ${choiceName}`
    };
    
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(message);
      
      const req = https.request(webhookUrl, {
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
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start monitoring
if (require.main === module) {
  const monitor = new ClaudeApprovalMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitor...');
    monitor.monitoring = false;
    process.exit(0);
  });
  
  monitor.startMonitoring().catch(console.error);
}

module.exports = ClaudeApprovalMonitor;