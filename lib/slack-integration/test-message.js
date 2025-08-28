#!/usr/bin/env node

/**
 * Test Message Script
 * Sends a simple test message to verify Slack integration works
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function sendTestMessage() {
  // Check if we have real credentials
  const token = process.env.SLACK_BOT_TOKEN;
  
  if (!token || token.includes('placeholder')) {
    console.log('❌ Cannot send test message: No real Slack token configured');
    console.log('📋 To send messages, you need to:');
    console.log('1. Create a Slack app at https://api.slack.com/apps');
    console.log('2. Add chat:write permission');
    console.log('3. Install to your workspace');
    console.log('4. Replace SLACK_BOT_TOKEN in .env with real token');
    return;
  }

  const slack = new WebClient(token);

  try {
    // Test authentication
    const auth = await slack.auth.test();
    console.log(`✅ Connected as ${auth.user} in ${auth.team}`);

    // Send test message to user (you'll need to provide your user ID)
    const testMessage = {
      text: '🎉 Pachacuti Slack Integration Test',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 Pachacuti Test Message'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Test Status:* ✅ Integration Working!\n*Time:* ' + new Date().toLocaleString()
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Sent from Pachacuti approval system test'
            }
          ]
        }
      ]
    };

    // Try to send to general channel first
    try {
      await slack.chat.postMessage({
        channel: '#general',
        ...testMessage
      });
      console.log('✅ Test message sent to #general channel');
    } catch (error) {
      console.log('⚠️ Could not send to #general:', error.message);
      
      // Get user info to send DM
      const users = await slack.users.list();
      const botUser = users.members.find(user => user.id === auth.user_id);
      
      if (botUser) {
        console.log('📱 Attempting to send DM instead...');
        // Note: Bot needs to be added to channel or user needs to DM bot first
        console.log('💡 Have someone DM the bot first, then we can send messages');
      }
    }

  } catch (error) {
    console.error('❌ Test message failed:', error.message);
    
    if (error.data?.error === 'not_authed') {
      console.log('🔑 Authentication error - check your SLACK_BOT_TOKEN');
    } else if (error.data?.error === 'channel_not_found') {
      console.log('📢 Channel not found - bot may need to be added to channels');
    }
  }
}

sendTestMessage().catch(console.error);