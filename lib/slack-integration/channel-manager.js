#!/usr/bin/env node

/**
 * Slack Channel Manager
 * Manages channel lifecycle for shell approval sessions
 */

const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class SlackChannelManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Load config
    this.config = {
      token: process.env.SLACK_BOT_TOKEN || config.token,
      signingSecret: process.env.SLACK_SIGNING_SECRET || config.signingSecret,
      channelPrefix: 'appr',
      maxNameLength: 80,
      archiveOnClose: true,
      ...config
    };
    
    // Initialize Slack client
    this.slack = new WebClient(this.config.token);
    
    // Track active channels
    this.activeChannels = new Map();
    this.shellToChannel = new Map();
    
    // Health status
    this.isHealthy = true;
    this.lastHealthCheck = null;
    
    // Rate limiting
    this.rateLimitDelay = 1000;
    this.lastApiCall = 0;
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    try {
      // Test API connection
      const auth = await this.slack.auth.test();
      this.botUserId = auth.user_id;
      this.teamId = auth.team_id;
      
      console.log(`✅ Slack connected as ${auth.user} in team ${auth.team}`);
      
      // Load persisted channel mappings
      await this.loadChannelMappings();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Slack:', error.message);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Generate channel name from components
   */
  generateChannelName(project, shellId, subshellId = null) {
    // Sanitize: lowercase, alphanumeric and hyphens only
    const sanitize = (str) => {
      if (!str) return '';
      return str.toString()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 20);
    };
    
    // Build channel name parts
    const parts = [
      this.config.channelPrefix,
      sanitize(project),
      shellId ? shellId.substring(0, 8) : crypto.randomBytes(4).toString('hex'),
      subshellId ? subshellId.substring(0, 8) : null
    ].filter(Boolean);
    
    // Join and enforce max length
    let channelName = parts.join('-');
    if (channelName.length > this.config.maxNameLength) {
      channelName = channelName.substring(0, this.config.maxNameLength);
    }
    
    return channelName;
  }

  /**
   * Create a new approval channel
   */
  async createChannel(project, shellId, subshellId = null) {
    if (!this.isHealthy) {
      console.warn('⚠️ Slack is offline, cannot create channel');
      return null;
    }
    
    const channelName = this.generateChannelName(project, shellId, subshellId);
    
    try {
      // Apply rate limiting
      await this.applyRateLimit();
      
      // Create the channel
      const result = await this.slack.conversations.create({
        name: channelName,
        is_private: false,
        team_id: this.teamId
      });
      
      const channel = result.channel;
      
      // Store channel mapping
      const channelInfo = {
        id: channel.id,
        name: channel.name,
        project,
        shellId,
        subshellId,
        createdAt: new Date().toISOString(),
        pendingApprovals: new Map()
      };
      
      this.activeChannels.set(channel.id, channelInfo);
      this.shellToChannel.set(shellId, channel.id);
      
      // Persist mappings
      await this.saveChannelMappings();
      
      // Post welcome message
      await this.postWelcomeMessage(channel.id, project, shellId, subshellId);
      
      console.log(`✅ Created channel #${channel.name} for shell ${shellId}`);
      
      this.emit('channelCreated', channelInfo);
      
      return channelInfo;
      
    } catch (error) {
      // Handle name collision
      if (error.data?.error === 'name_taken') {
        // Add timestamp to make unique
        const uniqueName = `${channelName}-${Date.now().toString(36).substring(-4)}`;
        return this.createChannelWithName(uniqueName, project, shellId, subshellId);
      }
      
      console.error(`❌ Failed to create channel: ${error.message}`);
      this.handleSlackError(error);
      return null;
    }
  }

  /**
   * Create channel with specific name (for retry logic)
   */
  async createChannelWithName(channelName, project, shellId, subshellId) {
    try {
      await this.applyRateLimit();
      
      const result = await this.slack.conversations.create({
        name: channelName,
        is_private: false,
        team_id: this.teamId
      });
      
      const channel = result.channel;
      
      const channelInfo = {
        id: channel.id,
        name: channel.name,
        project,
        shellId,
        subshellId,
        createdAt: new Date().toISOString(),
        pendingApprovals: new Map()
      };
      
      this.activeChannels.set(channel.id, channelInfo);
      this.shellToChannel.set(shellId, channel.id);
      
      await this.saveChannelMappings();
      await this.postWelcomeMessage(channel.id, project, shellId, subshellId);
      
      return channelInfo;
      
    } catch (error) {
      console.error(`❌ Failed to create channel with name ${channelName}:`, error.message);
      return null;
    }
  }

  /**
   * Archive a channel (since delete requires Enterprise Grid)
   */
  async archiveChannel(channelId) {
    if (!this.isHealthy) {
      console.warn('⚠️ Slack is offline, cannot archive channel');
      return false;
    }
    
    try {
      await this.applyRateLimit();
      
      // Post closing message
      await this.slack.chat.postMessage({
        channel: channelId,
        text: '📦 Shell session ended - Archiving channel',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '📦 *Shell Session Ended*\nThis approval channel is being archived.'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Archived at: ${new Date().toLocaleString()}`
              }
            ]
          }
        ]
      });
      
      // Archive the channel
      await this.slack.conversations.archive({
        channel: channelId
      });
      
      // Clean up mappings
      const channelInfo = this.activeChannels.get(channelId);
      if (channelInfo) {
        this.shellToChannel.delete(channelInfo.shellId);
        this.activeChannels.delete(channelId);
      }
      
      await this.saveChannelMappings();
      
      console.log(`✅ Archived channel ${channelId}`);
      
      this.emit('channelArchived', { channelId, channelInfo });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to archive channel: ${error.message}`);
      this.handleSlackError(error);
      return false;
    }
  }

  /**
   * Archive channel by shell ID
   */
  async archiveChannelByShell(shellId) {
    const channelId = this.shellToChannel.get(shellId);
    if (channelId) {
      return await this.archiveChannel(channelId);
    }
    return false;
  }

  /**
   * Post welcome message to new channel
   */
  async postWelcomeMessage(channelId, project, shellId, subshellId) {
    try {
      await this.applyRateLimit();
      
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 Approval Channel Created'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project}`
            },
            {
              type: 'mrkdwn',
              text: `*Shell ID:*\n${shellId.substring(0, 8)}`
            }
          ]
        }
      ];
      
      if (subshellId) {
        blocks[1].fields.push({
          type: 'mrkdwn',
          text: `*Subshell:*\n${subshellId.substring(0, 8)}`
        });
      }
      
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Created at: ${new Date().toLocaleString()}`
          }
        ]
      });
      
      await this.slack.chat.postMessage({
        channel: channelId,
        text: 'Approval channel created',
        blocks
      });
      
    } catch (error) {
      console.error('Failed to post welcome message:', error.message);
    }
  }

  /**
   * Get channel for a shell
   */
  getChannelForShell(shellId) {
    const channelId = this.shellToChannel.get(shellId);
    if (channelId) {
      return this.activeChannels.get(channelId);
    }
    return null;
  }

  /**
   * Check if Slack is healthy
   */
  async checkHealth() {
    try {
      await this.applyRateLimit();
      const result = await this.slack.api.test();
      this.isHealthy = result.ok;
      this.lastHealthCheck = new Date();
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    // Check health every 30 seconds
    setInterval(async () => {
      await this.checkHealth();
      if (!this.isHealthy) {
        console.warn('⚠️ Slack health check failed');
        this.emit('unhealthy');
      }
    }, 30000);
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    
    if (timeSinceLastCall < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastApiCall = Date.now();
  }

  /**
   * Handle Slack API errors
   */
  handleSlackError(error) {
    if (error.data?.error === 'rate_limited') {
      // Exponential backoff for rate limiting
      this.rateLimitDelay = Math.min(this.rateLimitDelay * 2, 10000);
      console.warn(`⚠️ Rate limited, increasing delay to ${this.rateLimitDelay}ms`);
    } else if (error.data?.error === 'not_authed' || error.data?.error === 'invalid_auth') {
      this.isHealthy = false;
      console.error('❌ Authentication error - check SLACK_BOT_TOKEN');
    }
  }

  /**
   * Load channel mappings from disk
   */
  async loadChannelMappings() {
    const mappingsPath = path.join(__dirname, 'data', 'channel-mappings.json');
    
    try {
      const data = await fs.readFile(mappingsPath, 'utf-8');
      const mappings = JSON.parse(data);
      
      // Restore mappings
      mappings.activeChannels.forEach(([key, value]) => {
        // Convert pendingApprovals back to Map
        value.pendingApprovals = new Map(value.pendingApprovals || []);
        this.activeChannels.set(key, value);
      });
      
      mappings.shellToChannel.forEach(([key, value]) => {
        this.shellToChannel.set(key, value);
      });
      
      console.log(`📂 Loaded ${this.activeChannels.size} active channel mappings`);
      
    } catch (error) {
      // File doesn't exist yet, that's okay
      if (error.code !== 'ENOENT') {
        console.error('Failed to load channel mappings:', error.message);
      }
    }
  }

  /**
   * Save channel mappings to disk
   */
  async saveChannelMappings() {
    const mappingsPath = path.join(__dirname, 'data', 'channel-mappings.json');
    
    try {
      await fs.mkdir(path.dirname(mappingsPath), { recursive: true });
      
      // Convert Maps to arrays for JSON serialization
      const mappings = {
        activeChannels: Array.from(this.activeChannels.entries()).map(([key, value]) => {
          // Convert pendingApprovals Map to array
          return [key, {
            ...value,
            pendingApprovals: Array.from(value.pendingApprovals.entries())
          }];
        }),
        shellToChannel: Array.from(this.shellToChannel.entries()),
        savedAt: new Date().toISOString()
      };
      
      await fs.writeFile(mappingsPath, JSON.stringify(mappings, null, 2));
      
    } catch (error) {
      console.error('Failed to save channel mappings:', error.message);
    }
  }

  /**
   * Clean up old archived channels (maintenance task)
   */
  async cleanupArchivedChannels(daysOld = 30) {
    try {
      // Get list of all channels
      const result = await this.slack.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: false,
        limit: 1000
      });
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let cleanedCount = 0;
      
      for (const channel of result.channels) {
        // Check if it's our approval channel and archived
        if (channel.is_archived && channel.name.startsWith(this.config.channelPrefix)) {
          // Note: We can't actually delete without Enterprise Grid
          // This is where you'd implement actual deletion if you had Enterprise
          console.log(`Found archived channel: #${channel.name}`);
          cleanedCount++;
        }
      }
      
      console.log(`📊 Found ${cleanedCount} archived approval channels (deletion requires Enterprise Grid)`);
      
      return cleanedCount;
      
    } catch (error) {
      console.error('Failed to cleanup channels:', error.message);
      return 0;
    }
  }
}

module.exports = SlackChannelManager;

// CLI testing
if (require.main === module) {
  const manager = new SlackChannelManager();
  
  async function test() {
    await manager.initialize();
    
    // Test channel creation
    const channel = await manager.createChannel(
      'pachacuti',
      crypto.randomBytes(4).toString('hex'),
      crypto.randomBytes(4).toString('hex')
    );
    
    if (channel) {
      console.log('Channel created:', channel);
      
      // Wait 5 seconds then archive
      setTimeout(async () => {
        await manager.archiveChannel(channel.id);
        process.exit(0);
      }, 5000);
    }
  }
  
  test().catch(console.error);
}