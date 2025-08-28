#!/usr/bin/env node

/**
 * Send Direct Message Test
 * Attempts to send a DM to the user
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function sendDirectMessage() {
  const token = process.env.SLACK_BOT_TOKEN;
  const slack = new WebClient(token);

  try {
    // Test authentication
    const auth = await slack.auth.test();
    console.log(`✅ Connected as ${auth.user} in ${auth.team}`);

    // Get list of users to find you
    const users = await slack.users.list();
    console.log(`📋 Found ${users.members.length} users in workspace`);

    // Try to find the owner/admin user (usually the first real user)
    const realUsers = users.members.filter(user => 
      !user.is_bot && 
      !user.deleted && 
      user.name !== 'slackbot' &&
      (user.is_admin || user.is_owner || user.is_primary_owner)
    );

    console.log('🔍 Found potential users:', realUsers.map(u => u.name).join(', '));

    if (realUsers.length === 0) {
      console.log('⚠️ No admin users found, trying to DM first non-bot user');
      const firstUser = users.members.find(user => !user.is_bot && !user.deleted && user.name !== 'slackbot');
      if (firstUser) {
        realUsers.push(firstUser);
      }
    }

    for (const user of realUsers.slice(0, 1)) { // Try first user only
      try {
        console.log(`📱 Attempting to send DM to ${user.real_name || user.name} (${user.name})`);

        // Open DM conversation
        const conversation = await slack.conversations.open({
          users: user.id
        });

        // Send the message
        await slack.chat.postMessage({
          channel: conversation.channel.id,
          text: '🎉 Pachacuti Slack Integration Test - Success!',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🚀 Pachacuti Test Message',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Integration Status:* ✅ Working perfectly!\n*Connected as:* ${auth.user}\n*Workspace:* ${auth.team}\n*Time:* ${new Date().toLocaleString()}`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Test Results:*\n• ✅ Bot authentication successful\n• ✅ API connection established\n• ✅ Message delivery working\n• ✅ Rich formatting supported'
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '🤖 Sent from Pachacuti approval system | Code review test complete'
                }
              ]
            }
          ]
        });

        console.log(`✅ Successfully sent test message to ${user.real_name || user.name}!`);
        console.log('📱 Check your Slack DMs for the test message');
        break;

      } catch (dmError) {
        console.log(`⚠️ Could not DM ${user.name}:`, dmError.message);
        continue;
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('🔧 Error details:', error.data);
  }
}

sendDirectMessage().catch(console.error);