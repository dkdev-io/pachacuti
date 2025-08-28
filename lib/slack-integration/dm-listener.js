#!/usr/bin/env node

/**
 * DM Listener - Check for and respond to direct messages
 * This simulates what a full webhook handler would do
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function checkAndRespondToDMs() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);

  try {
    console.log('🔍 Checking for recent DM messages...');
    
    // Get bot info
    const auth = await client.auth.test();
    console.log(`✅ Connected as: ${auth.user}`);
    
    // List DM conversations
    const convs = await client.conversations.list({
      types: 'im',
      limit: 20
    });
    
    console.log(`📱 Found ${convs.channels.length} DM conversations`);
    
    // Check each DM for recent messages (last 1 hour)
    const oneHourAgo = Math.floor((Date.now() - 3600000) / 1000);
    
    for (const channel of convs.channels) {
      try {
        const history = await client.conversations.history({
          channel: channel.id,
          limit: 10,
          oldest: oneHourAgo.toString()
        });
        
        if (history.messages && history.messages.length > 0) {
          // Get user info
          const user = await client.users.info({ user: channel.user });
          const userName = user.user.real_name || user.user.name;
          
          console.log(`\n📨 Messages from ${userName}:`);
          
          // Process recent messages
          for (const message of history.messages) {
            // Skip bot's own messages
            if (message.user === auth.user_id) continue;
            
            const timestamp = new Date(parseFloat(message.ts) * 1000);
            console.log(`  [${timestamp.toLocaleTimeString()}] ${message.text}`);
            
            // Check if this is a recent message we should respond to
            const messageTime = parseFloat(message.ts) * 1000;
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            
            if (messageTime > fiveMinutesAgo && !message.text.startsWith('✅')) {
              console.log(`  📤 Responding to recent message...`);
              
              // Send response
              await client.chat.postMessage({
                channel: channel.id,
                text: '✅ Message received by Pachacuti system!',
                blocks: [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `✅ *Message Received*\n\nHi ${userName}! Your message was received by the Pachacuti approval system.`
                    }
                  },
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*Your message:*\n> ${message.text}`
                    }
                  },
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: '*System Status:*\n• ✅ DM receiving working\n• ✅ Message processing functional\n• ✅ Response capability confirmed'
                    }
                  },
                  {
                    type: 'context',
                    elements: [
                      {
                        type: 'mrkdwn',
                        text: `🤖 Auto-response from Pachacuti | Received at ${new Date().toLocaleTimeString()}`
                      }
                    ]
                  }
                ]
              });
              
              console.log(`  ✅ Response sent to ${userName}`);
            }
          }
        }
        
      } catch (e) {
        // Skip channels we can't access
        console.log(`  ⚠️ Cannot access channel: ${e.message}`);
      }
    }
    
    console.log('\n🏁 DM check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data?.error === 'missing_scope') {
      console.log('🔧 Missing required scopes:', error.data.needed);
    }
  }
}

// Run the check
checkAndRespondToDMs().catch(console.error);