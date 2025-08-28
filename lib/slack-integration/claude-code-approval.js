#!/usr/bin/env node

/**
 * Claude Code Approval Integration
 * Matches exact terminal approval format with project context
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const fs = require('fs').promises;
const path = require('path');

class ClaudeCodeApprovalIntegration {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.webhookUrl = 'https://hooks.slack.com/services/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';
    this.pendingApprovals = new Map();
    this.lastMessageCheck = Math.floor(Date.now() / 1000);
    this.monitoring = false;
  }

  /**
   * Send approval request with exact Claude Code terminal format
   */
  async sendApprovalRequest(approvalData) {
    const { 
      approvalId,
      project,
      userPrompt,
      toolName,
      toolDescription,
      command,
      parameters = {},
      workingDir,
      riskLevel = 'medium'
    } = approvalData;

    // Store for response processing
    this.pendingApprovals.set(approvalId, {
      ...approvalData,
      timestamp: Date.now(),
      status: 'pending'
    });

    // Build exact terminal approval format
    const terminalPrompt = this.buildTerminalPrompt(approvalData);

    const message = {
      text: `Claude Code Approval Required: ${toolName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚡ Claude Code Approval Required',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Project:* ${project}\n*Your Request:* "${userPrompt}"`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Tool:* ${toolName}\n*Action:* ${toolDescription}`
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
            text: `*Working Directory:* \`${workingDir}\`\n*Risk Level:* ${this.getRiskEmoji(riskLevel)} ${riskLevel}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: terminalPrompt
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '💬 *Reply with the option number:*\n• `1` = Yes, proceed\n• `2` = No, cancel\n• `3` = Always approve this tool'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Approval ID: ${approvalId} | ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    console.log(`📤 Sending approval request for: ${toolName}`);
    console.log(`📋 Project: ${project}`);
    console.log(`💬 User prompt: "${userPrompt}"`);
    
    return this.sendWebhookMessage(message);
  }

  /**
   * Build exact terminal approval prompt format
   */
  buildTerminalPrompt(approvalData) {
    const { toolName, toolDescription, command, parameters } = approvalData;
    
    // Format parameters if present
    let paramString = '';
    if (parameters && Object.keys(parameters).length > 0) {
      paramString = Object.entries(parameters)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      paramString = ` (${paramString})`;
    }

    // Build the exact terminal format
    return `\`\`\`
Claude wants to run: ${toolName}${paramString}

${toolDescription}

Command: ${command}

[1] Yes, proceed
[2] No, cancel  
[3] Always approve this tool

Choose (1-3):
\`\`\``;
  }

  /**
   * Get risk level emoji
   */
  getRiskEmoji(risk) {
    const emojis = {
      low: '🟢',
      medium: '🟡', 
      high: '🔴',
      critical: '🚨'
    };
    return emojis[risk] || '🟡';
  }

  /**
   * Start monitoring for approval responses
   */
  async startMonitoring() {
    if (this.monitoring) {
      console.log('⚠️ Already monitoring');
      return;
    }

    this.monitoring = true;
    console.log('🔍 Starting Claude Code approval monitoring...');
    
    // Check every 3 seconds for responses
    this.monitorInterval = setInterval(async () => {
      await this.checkForResponses();
    }, 3000);

    // Initial check
    await this.checkForResponses();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitoring = false;
      console.log('🛑 Stopped approval monitoring');
    }
  }

  /**
   * Check for approval responses in Slack DMs
   */
  async checkForResponses() {
    try {
      const convs = await this.client.conversations.list({ types: 'im' });
      
      // Only check messages since last check
      for (const conv of convs.channels) {
        try {
          const history = await this.client.conversations.history({
            channel: conv.id,
            oldest: this.lastMessageCheck.toString(),
            limit: 10
          });
          
          if (history.messages && history.messages.length > 0) {
            for (const message of history.messages) {
              await this.processMessage(message);
            }
          }
        } catch (e) {
          // Skip inaccessible conversations
        }
      }
      
      this.lastMessageCheck = Math.floor(Date.now() / 1000);
      
    } catch (error) {
      console.error('❌ Error checking for responses:', error.message);
    }
  }

  /**
   * Process individual message for approval responses
   */
  async processMessage(message) {
    // Skip bot messages
    const auth = await this.client.auth.test();
    if (message.user === auth.user_id) return;

    const text = message.text?.trim();
    if (!text) return;

    // Look for number responses (1, 2, 3)
    const numberMatch = text.match(/^([123])$/);
    if (!numberMatch) return;

    const choice = parseInt(numberMatch[1]);
    const messageTime = new Date(parseFloat(message.ts) * 1000);
    
    console.log(`📱 Received approval response: ${choice} at ${messageTime.toLocaleTimeString()}`);

    // Find most recent pending approval
    const pendingApprovals = Array.from(this.pendingApprovals.entries())
      .filter(([id, data]) => data.status === 'pending')
      .sort((a, b) => b[1].timestamp - a[1].timestamp);

    if (pendingApprovals.length === 0) {
      console.log('⚠️ No pending approvals found for response');
      await this.sendErrorMessage('No pending approvals to respond to');
      return;
    }

    const [approvalId, approvalData] = pendingApprovals[0];
    
    // Process the approval
    await this.processApprovalChoice(approvalId, choice, approvalData);
  }

  /**
   * Process approval choice and execute corresponding action
   */
  async processApprovalChoice(approvalId, choice, approvalData) {
    const choices = ['proceed', 'cancel', 'always-approve'];
    const choiceNames = ['Yes, proceed', 'No, cancel', 'Always approve this tool'];
    const selectedChoice = choices[choice - 1];
    const selectedName = choiceNames[choice - 1];

    console.log(`✅ Processing approval ${approvalId}:`);
    console.log(`   Choice: ${choice} (${selectedName})`);
    console.log(`   Tool: ${approvalData.toolName}`);
    console.log(`   Command: ${approvalData.command}`);

    // Update approval status
    approvalData.status = selectedChoice;
    approvalData.processedAt = new Date().toISOString();
    approvalData.response = choice;

    // Create result file for terminal integration
    const resultFile = `/tmp/claude-code-approval-${approvalId}.json`;
    const result = {
      approvalId,
      choice,
      action: selectedChoice,
      actionName: selectedName,
      project: approvalData.project,
      toolName: approvalData.toolName,
      command: approvalData.command,
      userPrompt: approvalData.userPrompt,
      processedAt: approvalData.processedAt,
      approved: choice === 1,
      cancelled: choice === 2,
      alwaysApprove: choice === 3
    };

    try {
      await fs.writeFile(resultFile, JSON.stringify(result, null, 2));
      console.log(`📁 Result written to: ${resultFile}`);
    } catch (error) {
      console.error('❌ Failed to write result file:', error.message);
    }

    // Send confirmation
    await this.sendConfirmation(approvalId, choice, selectedName, approvalData);

    // Remove from pending
    this.pendingApprovals.delete(approvalId);
  }

  /**
   * Send confirmation message
   */
  async sendConfirmation(approvalId, choice, choiceName, approvalData) {
    const statusEmoji = choice === 1 ? '✅' : choice === 2 ? '❌' : '🔄';
    
    const message = {
      text: `${statusEmoji} Approval ${choice === 1 ? 'approved' : choice === 2 ? 'cancelled' : 'set to always approve'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji} **Approval ${choice === 1 ? 'Approved' : choice === 2 ? 'Cancelled' : 'Always Approve Set'}**\n\n*Your choice:* **${choice} - ${choiceName}**`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Project:* ${approvalData.project}\n*Tool:* ${approvalData.toolName}\n*Command:* \`${approvalData.command}\``
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: choice === 1 ? '🚀 *Status:* Executing command...' : 
                  choice === 2 ? '🛑 *Status:* Command cancelled' :
                  '⚡ *Status:* Tool will auto-approve in future'
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
   * Send error message
   */
  async sendErrorMessage(error) {
    const message = {
      text: `❌ Error: ${error}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ **Error**\n\n${error}`
          }
        }
      ]
    };

    return this.sendWebhookMessage(message);
  }

  /**
   * Send message via webhook
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
}

// Demo usage
if (require.main === module) {
  const integration = new ClaudeCodeApprovalIntegration();
  
  // Send test approval matching real Claude Code format
  const testApproval = {
    approvalId: `claude-code-${Date.now()}`,
    project: 'pachacuti-slack-integration',
    userPrompt: 'code review slack integration',
    toolName: 'Bash',
    toolDescription: 'Execute shell command to clean up temporary files',
    command: 'rm -rf /tmp/old-cache-files/*',
    parameters: {
      'working_directory': '/Users/Danallovertheplace/pachacuti/lib/slack-integration',
      'timeout': '30s'
    },
    workingDir: '/Users/Danallovertheplace/pachacuti/lib/slack-integration',
    riskLevel: 'medium'
  };

  console.log('🚀 Starting Claude Code approval integration test...');
  
  integration.sendApprovalRequest(testApproval)
    .then(() => {
      console.log('✅ Test approval request sent!');
      console.log('📱 Check Slack and reply with 1, 2, or 3');
      console.log('🔍 Starting response monitoring...');
      
      return integration.startMonitoring();
    })
    .catch(error => {
      console.error('❌ Failed to send approval:', error);
    });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    integration.stopMonitoring();
    process.exit(0);
  });
}

module.exports = ClaudeCodeApprovalIntegration;