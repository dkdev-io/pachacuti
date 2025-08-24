#!/usr/bin/env node

/**
 * Slack Approval Bot
 * Handles approval requests, reminders, and user interactions
 */

const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');
const EventEmitter = require('events');
const schedule = require('node-schedule');

class SlackApprovalBot extends EventEmitter {
  constructor(channelManager) {
    super();
    
    this.channelManager = channelManager;
    this.slack = channelManager.slack;
    
    // Track pending approvals
    this.pendingApprovals = new Map();
    
    // Track reminders
    this.scheduledReminders = new Map();
    
    // Reminder interval (15 minutes)
    this.reminderIntervalMs = 15 * 60 * 1000;
  }

  /**
   * Post an approval request to Slack
   */
  async postApprovalRequest(shellId, command, metadata = {}) {
    const channelInfo = this.channelManager.getChannelForShell(shellId);
    
    if (!channelInfo) {
      console.warn(`⚠️ No channel found for shell ${shellId}`);
      return null;
    }
    
    const approvalId = crypto.randomBytes(8).toString('hex');
    
    // Create approval record
    const approval = {
      id: approvalId,
      shellId,
      channelId: channelInfo.id,
      command,
      metadata,
      status: 'pending',
      createdAt: new Date(),
      reminderCount: 0
    };
    
    // Build message blocks
    const blocks = this.buildApprovalBlocks(approval);
    
    try {
      // Post to Slack
      const result = await this.slack.chat.postMessage({
        channel: channelInfo.id,
        text: `Command approval required: ${command}`,
        blocks
      });
      
      // Store approval info
      approval.messageTs = result.ts;
      this.pendingApprovals.set(approvalId, approval);
      channelInfo.pendingApprovals.set(approvalId, approval);
      
      // Schedule first reminder
      this.scheduleReminder(approvalId);
      
      console.log(`📮 Posted approval request ${approvalId} to channel ${channelInfo.name}`);
      
      this.emit('approvalPosted', approval);
      
      return approval;
      
    } catch (error) {
      console.error('Failed to post approval request:', error.message);
      
      // Emit fallback event for terminal handling
      this.emit('slackUnavailable', { shellId, command, metadata });
      
      return null;
    }
  }

  /**
   * Build approval message blocks
   */
  buildApprovalBlocks(approval) {
    const { command, metadata, shellId, id } = approval;
    
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔐 Command Approval Required',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Shell:*\n\`${shellId.substring(0, 8)}\``
          },
          {
            type: 'mrkdwn',
            text: `*Project:*\n${metadata.project || 'Unknown'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Command:*\n\`\`\`${command}\`\`\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Working Directory: \`${metadata.workingDir || process.cwd()}\``
          },
          {
            type: 'mrkdwn',
            text: `Risk Level: ${this.getRiskEmoji(metadata.risk)} ${metadata.risk || 'medium'}`
          }
        ]
      },
      {
        type: 'actions',
        block_id: `approval_${id}`,
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve',
              emoji: true
            },
            style: 'primary',
            action_id: 'approve_command',
            value: id
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Deny',
              emoji: true
            },
            style: 'danger',
            action_id: 'deny_command',
            value: id
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📝 Add Note',
              emoji: true
            },
            action_id: 'add_note',
            value: id
          }
        ]
      }
    ];
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
   * Schedule a reminder for an approval
   */
  scheduleReminder(approvalId) {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval || approval.status !== 'pending') return;
    
    // Schedule reminder in 15 minutes
    const reminderTime = new Date(Date.now() + this.reminderIntervalMs);
    
    const job = schedule.scheduleJob(reminderTime, async () => {
      await this.sendReminder(approvalId);
    });
    
    this.scheduledReminders.set(approvalId, job);
    
    console.log(`⏰ Scheduled reminder for approval ${approvalId} at ${reminderTime.toLocaleTimeString()}`);
  }

  /**
   * Send a reminder for pending approval
   */
  async sendReminder(approvalId) {
    const approval = this.pendingApprovals.get(approvalId);
    
    if (!approval || approval.status !== 'pending') {
      // Approval was handled, cancel reminder
      this.cancelReminder(approvalId);
      return;
    }
    
    approval.reminderCount++;
    
    const reminderBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Reminder #${approval.reminderCount}: Approval Pending*\nThis command has been waiting for approval for ${approval.reminderCount * 15} minutes.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Command:*\n\`\`\`${approval.command}\`\`\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Original request: ${approval.createdAt.toLocaleTimeString()}`
          }
        ]
      },
      {
        type: 'actions',
        block_id: `reminder_${approvalId}`,
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve Now',
              emoji: true
            },
            style: 'primary',
            action_id: 'approve_command',
            value: approvalId
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Deny',
              emoji: true
            },
            style: 'danger',
            action_id: 'deny_command',
            value: approvalId
          }
        ]
      }
    ];
    
    try {
      await this.slack.chat.postMessage({
        channel: approval.channelId,
        text: `⏰ Reminder: Approval pending for ${approval.reminderCount * 15} minutes`,
        blocks: reminderBlocks,
        thread_ts: approval.messageTs // Post as thread reply
      });
      
      console.log(`📨 Sent reminder #${approval.reminderCount} for approval ${approvalId}`);
      
      // Schedule next reminder (never auto-deny)
      this.scheduleReminder(approvalId);
      
      this.emit('reminderSent', approval);
      
    } catch (error) {
      console.error('Failed to send reminder:', error.message);
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(approvalId) {
    const job = this.scheduledReminders.get(approvalId);
    if (job) {
      job.cancel();
      this.scheduledReminders.delete(approvalId);
      console.log(`🚫 Cancelled reminder for approval ${approvalId}`);
    }
  }

  /**
   * Handle approval response from Slack
   */
  async handleApprovalResponse(approvalId, approved, userId, responseUrl) {
    const approval = this.pendingApprovals.get(approvalId);
    
    if (!approval) {
      console.warn(`Approval ${approvalId} not found`);
      return { error: 'Approval not found' };
    }
    
    if (approval.status !== 'pending') {
      console.warn(`Approval ${approvalId} already processed`);
      return { error: 'Approval already processed' };
    }
    
    // Update approval status
    approval.status = approved ? 'approved' : 'denied';
    approval.respondedBy = userId;
    approval.respondedAt = new Date();
    
    // Cancel any pending reminders
    this.cancelReminder(approvalId);
    
    // Get user info
    let userName = userId;
    try {
      const userInfo = await this.slack.users.info({ user: userId });
      userName = userInfo.user.real_name || userInfo.user.name;
    } catch (error) {
      // Continue with user ID if we can't get name
    }
    
    // Update the original message
    const updatedBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: approved 
            ? `✅ *Command Approved*\nApproved by ${userName} at ${approval.respondedAt.toLocaleTimeString()}`
            : `❌ *Command Denied*\nDenied by ${userName} at ${approval.respondedAt.toLocaleTimeString()}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Command:*\n\`\`\`${approval.command}\`\`\``
        }
      }
    ];
    
    try {
      // Update the message
      await this.slack.chat.update({
        channel: approval.channelId,
        ts: approval.messageTs,
        text: approved ? 'Command approved' : 'Command denied',
        blocks: updatedBlocks
      });
      
      // Post execution result notification
      if (approved) {
        await this.slack.chat.postMessage({
          channel: approval.channelId,
          text: '🚀 Command is being executed...',
          thread_ts: approval.messageTs
        });
      }
      
    } catch (error) {
      console.error('Failed to update approval message:', error.message);
    }
    
    // Clean up
    this.pendingApprovals.delete(approvalId);
    
    // Emit event for shell to handle
    this.emit('approvalResponse', {
      approval,
      approved,
      respondedBy: userName
    });
    
    console.log(`${approved ? '✅' : '❌'} Approval ${approvalId} ${approved ? 'approved' : 'denied'} by ${userName}`);
    
    return { success: true, approved };
  }

  /**
   * Post command execution result
   */
  async postExecutionResult(approvalId, success, output, exitCode) {
    const approval = this.pendingApprovals.get(approvalId) || 
                     Array.from(this.pendingApprovals.values()).find(a => a.id === approvalId);
    
    if (!approval) return;
    
    const resultBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: success 
            ? `✅ *Command Executed Successfully*`
            : `❌ *Command Execution Failed*`
        }
      }
    ];
    
    if (output) {
      // Truncate long output
      const truncatedOutput = output.length > 2000 
        ? output.substring(0, 2000) + '\n... (truncated)'
        : output;
      
      resultBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Output:*\n\`\`\`${truncatedOutput}\`\`\``
        }
      });
    }
    
    if (exitCode !== undefined) {
      resultBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Exit code: ${exitCode}`
          }
        ]
      });
    }
    
    try {
      await this.slack.chat.postMessage({
        channel: approval.channelId,
        text: success ? 'Command executed successfully' : 'Command execution failed',
        blocks: resultBlocks,
        thread_ts: approval.messageTs
      });
    } catch (error) {
      console.error('Failed to post execution result:', error.message);
    }
  }

  /**
   * Get all pending approvals for a shell
   */
  getPendingApprovalsForShell(shellId) {
    return Array.from(this.pendingApprovals.values())
      .filter(approval => approval.shellId === shellId && approval.status === 'pending');
  }

  /**
   * Cancel all pending approvals for a shell
   */
  async cancelShellApprovals(shellId) {
    const approvals = this.getPendingApprovalsForShell(shellId);
    
    for (const approval of approvals) {
      approval.status = 'cancelled';
      this.cancelReminder(approval.id);
      
      // Update Slack message
      try {
        await this.slack.chat.update({
          channel: approval.channelId,
          ts: approval.messageTs,
          text: 'Approval cancelled - shell ended',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '🚫 *Approval Cancelled*\nShell session ended'
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Command:*\n\`\`\`${approval.command}\`\`\``
              }
            }
          ]
        });
      } catch (error) {
        // Ignore errors when cancelling
      }
      
      this.pendingApprovals.delete(approval.id);
    }
    
    console.log(`🚫 Cancelled ${approvals.length} pending approvals for shell ${shellId}`);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Cancel all reminders
    for (const [approvalId, job] of this.scheduledReminders) {
      job.cancel();
    }
    this.scheduledReminders.clear();
    this.pendingApprovals.clear();
  }
}

module.exports = SlackApprovalBot;